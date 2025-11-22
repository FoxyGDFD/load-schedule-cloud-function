import { google } from 'googleapis';
import dayjs from 'dayjs';
import fs from 'fs';
import { env } from './env.js';

export class CalendarService {

  calendar = google.calendar({
    version: 'v3', auth: new google.auth.GoogleAuth({
      credentials: JSON.parse(fs.readFileSync('./service-account.json', 'utf8')),
      scopes: env.SCOPES,
    })
  })

  async getCalendarEvents(timeMin, timeMax) {
    const res = await this.calendar.events.list({
      calendarId: env.CALENDAR_ID,
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: 'startTime',
    });
    return res.data.items || [];
  }

  async syncLessonsWithCalendar(lessons, period) {
    if (!lessons.length) return;

    const existing = await this.getCalendarEvents(
      dayjs(period.start).startOf('day').toISOString(),
      dayjs(period.end).endOf('day').toISOString()
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
      const lessonId = this._generateLessonEventId(lesson);
      const eventData = this.lessonToEvent(lesson);

      if (existingMap.has(lessonId)) {
        const existingEvent = existingMap.get(lessonId);
        if (
          existingEvent.summary !== eventData.summary ||
          existingEvent.location !== eventData.location ||
          existingEvent.start.dateTime !== eventData.start.dateTime ||
          existingEvent.end.dateTime !== eventData.end.dateTime
        ) {
          await this.calendar.events.update({
            calendarId: env.CALENDAR_ID,
            eventId: existingEvent.id,
            requestBody: eventData,
          });
          console.log('🌀 Updated:', eventData.summary);
        } else {
          console.log('↩️ Already relevant:', eventData.summary);
        }
      } else {
        await this.calendar.events.insert({
          calendarId: env.CALENDAR_ID,
          requestBody: eventData,
        });
        console.log('✅ Created:', eventData.summary);
      }
    }
  }

  lessonToEvent(lesson) {
    const lessonDate = lesson.lessonDate.split('T')[0];
    const start = dayjs(`${lessonDate}T${lesson.lessonStartTime}`).tz('Europe/Moscow', true).format();
    const end = dayjs(`${lessonDate}T${lesson.lessonEndTime}`).tz('Europe/Moscow', true).format();
    const teachers = lesson.teachers.map(t => `${t.firstName} ${t.patronymic} ${t.lastName}`).join(', ');
    const lessonId = this._generateLessonEventId(lesson);

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

  _generateLessonEventId(lesson) {
    return `${lesson.lessonDate}_${lesson.lessonStartTime}_${lesson.lessonEndTime}_${lesson.disciplineName}_${lesson.classroomName}`;
  }
}