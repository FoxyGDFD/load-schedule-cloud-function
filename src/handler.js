import axios from 'axios';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';
import { env } from './env.js';
import { CalendarService } from './calendar.service.js';

dayjs.extend(utc);
dayjs.extend(timezone);


async function fetchSchedule(start, end) {
  const url = `${env.SCHEDULE_API_URL}?dateStart=${start}&dateEnd=${end}`;
  const response = await axios.get(url);
  return [].concat(...Object.values(response.data.schedule || {}));
}

export async function handler(event, context) {
  const start = dayjs().startOf('week').add(1, 'week').format('YYYY-MM-DD');
  const end = dayjs().endOf('week').add(1, 'week').format('YYYY-MM-DD');

  const calendarService = new CalendarService()

  const lessons = await fetchSchedule(start, end);

  if (lessons.length === 0) {
    console.log('Нет расписания');
    return { statusCode: 200, body: 'No lessons' };
  }

  await calendarService.syncLessonsWithCalendar(lessons, { start, end });

  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Sync completed', count: lessons.length })
  };
}