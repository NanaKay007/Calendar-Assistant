import { MongoClient, Db } from 'mongodb';

let client: MongoClient | null = null;
let db: Db | null = null;

export async function getDatabase(): Promise<Db> {
  if (db) return db;

  // Lazy import to avoid eagerly validating all env vars (e.g., in test suites
  // that only use createTestDatabase and don't need the full app config).
  const { config } = await import('../config/env');

  client = new MongoClient(config.mongodb.uri);
  await client.connect();
  db = client.db(config.mongodb.dbName);

  await initializeIndexes(db);
  return db;
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
