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
  llm: {
    provider: 'gemini' | 'claude';
  };
  anthropic: {
    apiKey: string;
    model: string;
  };
  session: {
    secret: string;
  };
  mongodb: {
    uri: string;
    dbName: string;
  };
  tokenEncryptionKey: string;
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
  mongodb: {
    uri: getEnvVar('MONGODB_URI'),
    dbName: getEnvVar('MONGODB_DB_NAME'),
  },
  tokenEncryptionKey: (() => {
    const key = getEnvVar('TOKEN_ENCRYPTION_KEY');
    if (Buffer.from(key, 'hex').length !== 32) {
      throw new Error('TOKEN_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)');
    }
    return key;
  })(),
  llm: {
    provider: (process.env.LLM_PROVIDER || 'gemini') as 'gemini' | 'claude',
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
  },
  frontendUrl: getEnvVar('FRONTEND_URL', 'http://localhost:5173'),
};
