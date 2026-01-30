import { MongoClient, Db } from 'mongodb';

let client: MongoClient | null = null;
let db: Db | null = null;

export async function getDatabase(): Promise<Db> {
  if (db) return db;

  // Lazy import to avoid eagerly validating all env vars (e.g., in test suites
  // that only use createTestDatabase and don't need the full app config).
  const { config } = await import('../config/env');

  const newClient = new MongoClient(config.mongodb.uri);
  try {
    await newClient.connect();
    const newDb = newClient.db(config.mongodb.dbName);
    await initializeIndexes(newDb);
    client = newClient;
    db = newDb;
    return db;
  } catch (error) {
    await newClient.close().catch(() => {});
    throw error;
  }
}

export async function createTestDatabase(mongoClient: MongoClient): Promise<Db> {
  const testDb = mongoClient.db('calendar-assistant-test');
  await initializeIndexes(testDb);
  return testDb;
}

export async function closeDatabase(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}

async function initializeIndexes(database: Db): Promise<void> {
  await database.collection('users').createIndex({ email: 1 }, { unique: true });
  await database.collection('conversations').createIndex({ user_id: 1 });
  await database.collection('messages').createIndex({ conversation_id: 1 });
  await database.collection('pending_actions').createIndex({ conversation_id: 1, status: 1 });
}
