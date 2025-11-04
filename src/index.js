import axios from 'axios';
import { google } from 'googleapis';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';
import { env } from './env.js';

dayjs.extend(utc);
dayjs.extend(timezone);

async function authorize() {
  const oAuth2Client = new google.auth.OAuth2(env.CLIENT_ID, env.CLIENT_SECRET, env.REDIRECT_URI);
  oAuth2Client.setCredentials({ refresh_token: env.REFRESH_TOKEN, scope: env.SCOPES });
  return oAuth2Client;
}

async function fetchSchedule(start, end) {
  const url = `${env.SCHEDULE_API_URL}?dateStart=${start}&dateEnd=${end}`;
  const response = await axios.get(url);
  return [].concat(...Object.values(response.data.schedule || {}));
}

function generateLessonId(lesson) {
  return `${lesson.lessonDate}_${lesson.lessonStartTime}_${lesson.lessonEndTime}_${lesson.disciplineName}_${lesson.classroomName}`;
}

function lessonToEvent(lesson) {
  const lessonDate = lesson.lessonDate.split('T')[0];
  const start = dayjs(`${lessonDate}T${lesson.lessonStartTime}`).tz('Europe/Moscow', true).format();
  const end = dayjs(`${lessonDate}T${lesson.lessonEndTime}`).tz('Europe/Moscow', true).format();
  const teachers = lesson.teachers.map(t => `${t.firstName} ${t.patronymic} ${t.lastName}`).join(', ');
  const lessonId = generateLessonId(lesson);

  return {
    summary: lesson.disciplineName || 'Пара',
    location: lesson.classroomName || '',
    description: `Преподаватель: ${teachers}\nСсылка: ${lesson.link || ''}`,
    start: { dateTime: start, timeZone: 'Europe/Moscow' },
    end: { dateTime: end, timeZone: 'Europe/Moscow' },
    colorId: '1',
    extendedProperties: { private: { lessonId } }
  };
}

async function getCalendarEvents(service, timeMin, timeMax) {
  const res = await service.events.list({
    calendarId: env.CALENDAR_ID,
    timeMin,
    timeMax,
    singleEvents: true,
    orderBy: 'startTime',
  });
  return res.data.items || [];
}

async function syncLessons(service, lessons, period) {
  if (!lessons.length) return;

  const existing = await getCalendarEvents(
    service,
    dayjs(period.start).startOf('day').toISOString(),
    dayjs(period.end).endOf('day').toISOString(),
  );

  const existingMap = new Map(
    existing
      .map(ev => {
        const id = ev.extendedProperties?.private?.lessonId;
        return id ? [id, ev] : null;
      })
      .filter(Boolean)
  );

  for (const lesson of lessons) {
    const lessonId = generateLessonId(lesson);
    const eventData = lessonToEvent(lesson);

    if (existingMap.has(lessonId)) {
      const existingEvent = existingMap.get(lessonId);
      if (
        existingEvent.summary !== eventData.summary ||
        existingEvent.location !== eventData.location ||
        existingEvent.start.dateTime !== eventData.start.dateTime ||
        existingEvent.end.dateTime !== eventData.end.dateTime
      ) {
        await service.events.update({
          calendarId: env.CALENDAR_ID,
          eventId: existingEvent.id,
          resource: eventData,
        });
        console.log('🌀 Updated:', eventData.summary);
      } else {
        console.log('↩️ Already relevant:', eventData.summary);
      }
    } else {
      await service.events.insert({ calendarId: env.CALENDAR_ID, resource: eventData });
      console.log('✅ Created:', eventData.summary);
    }
  }
}

export async function handler(event, context) {
  const start = dayjs().startOf('week').add(1, 'week').format('YYYY-MM-DD');
  const end = dayjs().endOf('week').add(1, 'week').format('YYYY-MM-DD');

  const auth = await authorize();
  const service = google.calendar({ version: 'v3', auth });
  const lessons = await fetchSchedule(start, end);

  if (lessons.length === 0) {
    console.log('Нет расписания');
    return { statusCode: 200, body: 'No lessons' };
  }

  await syncLessons(service, lessons, { start, end });

  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Sync completed', count: lessons.length })
  };
}

handler()