import dotenv from 'dotenv';

dotenv.config();

interface EnvConfig {
  port: number;
  nodeEnv: string;
  google: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
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
  },
  session: {
    secret: getEnvVar('SESSION_SECRET'),
  },
  frontendUrl: getEnvVar('FRONTEND_URL', 'http://localhost:5173'),
};
