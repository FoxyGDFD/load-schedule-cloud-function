import 'dotenv/config';
import { array, object, pipe, string, url, safeParse } from 'valibot';

const envSchema = object({
  SCOPES: array(pipe(string(), url())),
  CALENDAR_ID: string(),
  CLIENT_ID: string(),
  CLIENT_SECRET: string(),
  REDIRECT_URI: string(),
  REFRESH_TOKEN: string(),
  SCHEDULE_API_URL: pipe(string(), url())
})

const parsedEnv = safeParse(envSchema, {
  SCOPES: ['https://www.googleapis.com/auth/calendar'],
  CALENDAR_ID: process.env.CALENDAR_ID ?? 'primary',
  CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI || 'https://developers.google.com/oauthplayground',
  REFRESH_TOKEN: process.env.GOOGLE_REFRESH_TOKEN,
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