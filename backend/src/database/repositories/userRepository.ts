import { Db } from 'mongodb';

export interface UserRow {
  id: string;
  email: string;
  display_name: string;
  access_token: string | null;
  refresh_token: string | null;
  token_expiry: string | null;
  created_at: string;
}

export class UserRepository {
  constructor(private db: Db) {}

  private get collection() {
    return this.db.collection('users');
  }

  private toUserRow(doc: any): UserRow | undefined {
    if (!doc) return undefined;
    return {
      id: doc.id,
      email: doc.email,
      display_name: doc.display_name,
      access_token: doc.access_token ?? null,
      refresh_token: doc.refresh_token ?? null,
      token_expiry: doc.token_expiry ?? null,
      created_at: doc.created_at,
    };
  }

  async findById(id: string): Promise<UserRow | undefined> {
    const doc = await this.collection.findOne({ id });
    return this.toUserRow(doc);
  }

  async findByEmail(email: string): Promise<UserRow | undefined> {
    const doc = await this.collection.findOne({ email });
    return this.toUserRow(doc);
  }

  async upsert(user: { id: string; email: string; display_name: string; access_token?: string; refresh_token?: string; token_expiry?: string }): Promise<UserRow> {
    await this.collection.updateOne(
      { id: user.id },
      {
        $set: {
          email: user.email,
          display_name: user.display_name,
          ...(user.access_token !== undefined && { access_token: user.access_token }),
          ...(user.refresh_token !== undefined && { refresh_token: user.refresh_token }),
          ...(user.token_expiry !== undefined && { token_expiry: user.token_expiry }),
        },
        $setOnInsert: {
          id: user.id,
          created_at: new Date().toISOString(),
        },
      },
      { upsert: true }
    );
    return (await this.findById(user.id))!;
  }

  async updateTokens(id: string, tokens: { access_token: string; refresh_token?: string; token_expiry?: string }): Promise<UserRow | undefined> {
    await this.collection.updateOne(
      { id },
      {
        $set: {
          access_token: tokens.access_token,
          ...(tokens.refresh_token !== undefined && { refresh_token: tokens.refresh_token }),
          ...(tokens.token_expiry !== undefined && { token_expiry: tokens.token_expiry }),
        },
      }
    );
    return this.findById(id);
  }
}
