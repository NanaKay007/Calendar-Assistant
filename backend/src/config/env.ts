import dotenv from 'dotenv';
import path from 'path';

const envFile = process.env.NODE_ENV === 'production' ? '.env' : '.env.dev.local';

dotenv.config({ path: path.resolve(process.cwd(), envFile) });

interface EnvConfig {
  port: number;
  nodeEnv: string;
  google: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    geminiApiKey: string;
  };
  session: {
    secret: string;
  };
  frontendUrl: string;
}

const getEnvVar = (key: string, defaultValue?: string): string => {
  const value = process.env[key] || defaultValue;
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

export const config: EnvConfig = {
  port: parseInt(getEnvVar('PORT', '3000'), 10),
  nodeEnv: getEnvVar('NODE_ENV', 'development'),
  google: {
    clientId: getEnvVar('GOOGLE_CLIENT_ID'),
    clientSecret: getEnvVar('GOOGLE_CLIENT_SECRET'),
    redirectUri: getEnvVar('GOOGLE_REDIRECT_URI'),
    geminiApiKey: getEnvVar('GOOGLE_GEMINI_API_KEY'),
  },
  session: {
    secret: getEnvVar('SESSION_SECRET'),
  },
  frontendUrl: getEnvVar('FRONTEND_URL', 'http://localhost:5173'),
};
