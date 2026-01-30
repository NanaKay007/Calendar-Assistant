import { MongoClient, Db } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createTestDatabase } from '../database/db';
import { MessageRepository } from '../database/repositories/messageRepository';
import { ConversationRepository } from '../database/repositories/conversationRepository';
import { MongoChatMessageHistory } from '../agent/mongoChatHistory';
import { HumanMessage, AIMessage } from '@langchain/core/messages';

describe('MongoChatMessageHistory Integration', () => {
  let mongoServer: MongoMemoryServer;
  let client: MongoClient;
  let db: Db;
  let messageRepo: MessageRepository;
  let conversationRepo: ConversationRepository;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    client = new MongoClient(mongoServer.getUri());
    await client.connect();
  });

  afterAll(async () => {
    await client.close();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    const collections = await client.db('calendar-assistant-test').listCollections().toArray();
    for (const col of collections) {
      await client.db('calendar-assistant-test').dropCollection(col.name);
    }
    db = await createTestDatabase(client);
    messageRepo = new MessageRepository(db);
    conversationRepo = new ConversationRepository(db);
  });

  it('should return empty messages for new conversation', async () => {
    const conv = await conversationRepo.create('user-1', 'Test');
    const history = new MongoChatMessageHistory(conv.id, messageRepo);
    const messages = await history.getMessages();
    expect(messages).toHaveLength(0);
  });

  it('should persist and retrieve messages via addMessage', async () => {
    const conv = await conversationRepo.create('user-1', 'Test');
    const history = new MongoChatMessageHistory(conv.id, messageRepo);

    await history.addMessage(new HumanMessage('Hello'));
    await history.addMessage(new AIMessage('Hi there!'));

    const messages = await history.getMessages();
    expect(messages).toHaveLength(2);
    expect(messages[0]).toBeInstanceOf(HumanMessage);
    expect(messages[0].content).toBe('Hello');
    expect(messages[1]).toBeInstanceOf(AIMessage);
    expect(messages[1].content).toBe('Hi there!');
  });

  it('should persist messages via bulk addMessages', async () => {
    const conv = await conversationRepo.create('user-1', 'Test');
    const history = new MongoChatMessageHistory(conv.id, messageRepo);

    await history.addMessages([
      new HumanMessage('First'),
      new AIMessage('Second'),
      new HumanMessage('Third'),
    ]);

    const messages = await history.getMessages();
    expect(messages).toHaveLength(3);
    expect(messages[0].content).toBe('First');
    expect(messages[1].content).toBe('Second');
    expect(messages[2].content).toBe('Third');
  });

  it('should filter out tool messages from getMessages', async () => {
    const conv = await conversationRepo.create('user-1', 'Test');
    const history = new MongoChatMessageHistory(conv.id, messageRepo);

    // Insert messages directly including a tool message
    await messageRepo.create({ conversation_id: conv.id, role: 'user', content: 'Do something' });
    await messageRepo.create({ conversation_id: conv.id, role: 'tool', content: '{"result": "done"}' });
    await messageRepo.create({ conversation_id: conv.id, role: 'assistant', content: 'Done!' });

    const messages = await history.getMessages();
    expect(messages).toHaveLength(2);
    expect(messages[0]).toBeInstanceOf(HumanMessage);
    expect(messages[1]).toBeInstanceOf(AIMessage);
  });

  it('should isolate messages between conversations', async () => {
    const conv1 = await conversationRepo.create('user-1', 'Conv 1');
    const conv2 = await conversationRepo.create('user-1', 'Conv 2');
    const history1 = new MongoChatMessageHistory(conv1.id, messageRepo);
    const history2 = new MongoChatMessageHistory(conv2.id, messageRepo);

    await history1.addMessage(new HumanMessage('Message for conv 1'));
    await history2.addMessage(new HumanMessage('Message for conv 2'));

    const msgs1 = await history1.getMessages();
    const msgs2 = await history2.getMessages();
    expect(msgs1).toHaveLength(1);
    expect(msgs1[0].content).toBe('Message for conv 1');
    expect(msgs2).toHaveLength(1);
    expect(msgs2[0].content).toBe('Message for conv 2');
  });

  it('should handle addMessages with empty array', async () => {
    const conv = await conversationRepo.create('user-1', 'Test');
    const history = new MongoChatMessageHistory(conv.id, messageRepo);
    await history.addMessages([]);
    const messages = await history.getMessages();
    expect(messages).toHaveLength(0);
  });
});

describe('MessageRepository bulkCreate Integration', () => {
  let mongoServer: MongoMemoryServer;
  let client: MongoClient;
  let db: Db;
  let messageRepo: MessageRepository;
  let conversationRepo: ConversationRepository;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    client = new MongoClient(mongoServer.getUri());
    await client.connect();
  });

  afterAll(async () => {
    await client.close();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    const collections = await client.db('calendar-assistant-test').listCollections().toArray();
    for (const col of collections) {
      await client.db('calendar-assistant-test').dropCollection(col.name);
    }
    db = await createTestDatabase(client);
    messageRepo = new MessageRepository(db);
    conversationRepo = new ConversationRepository(db);
  });

  it('should bulk insert multiple messages in a single operation', async () => {
    const conv = await conversationRepo.create('user-1', 'Test');
    const messages = [
      { conversation_id: conv.id, role: 'user' as const, content: 'Hello' },
      { conversation_id: conv.id, role: 'assistant' as const, content: 'Hi!' },
      { conversation_id: conv.id, role: 'user' as const, content: 'How are you?' },
    ];

    const result = await messageRepo.bulkCreate(messages);
    expect(result).toHaveLength(3);
    expect(result[0].content).toBe('Hello');
    expect(result[1].content).toBe('Hi!');
    expect(result[2].content).toBe('How are you?');

    const stored = await messageRepo.findByConversationId(conv.id);
    expect(stored).toHaveLength(3);
  });

  it('should return empty array for empty input', async () => {
    const result = await messageRepo.bulkCreate([]);
    expect(result).toHaveLength(0);
  });
});
