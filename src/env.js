import 'dotenv/config';
import { array, object, pipe, string, url, safeParse } from 'valibot';

const envSchema = object({
  SCOPES: array(pipe(string(), url())),
  CALENDAR_ID: string(),
  SCHEDULE_API_URL: pipe(string(), url())
})

const parsedEnv = safeParse(envSchema, {
  SCOPES: ['https://www.googleapis.com/auth/calendar'],
  CALENDAR_ID: process.env.CALENDAR_ID ?? 'primary',
  SCHEDULE_API_URL: process.env.SCHEDULE_API_URL
});

if (parsedEnv.issues) {
  const messages = parsedEnv.issues.map(issue =>
    `- ${issue.path?.map(p => p.key).join('.')}: ${issue.message}`
  ).join('\n');

  throw new Error(`Environment validation failed:\n${messages}`);
}

const env = parsedEnv.output
export { env };