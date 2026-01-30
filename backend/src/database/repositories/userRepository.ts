import { Db, WithId, Document } from 'mongodb';
import { encrypt, decrypt } from '../encryption';

interface UserDocument extends Document {
  id: string;
  email: string;
  display_name: string;
  access_token: string | null;
  refresh_token: string | null;
  token_expiry: string | null;
  created_at: string;
}

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
  constructor(private db: Db, private encryptionKey: string) {}

  private get collection() {
    return this.db.collection<UserDocument>('users');
  }

  private encryptToken(token: string | undefined): string | undefined {
    if (token === undefined) return undefined;
    return encrypt(token, this.encryptionKey);
  }

  private decryptToken(encrypted: string | null): string | null {
    if (!encrypted) return null;
    return decrypt(encrypted, this.encryptionKey);
  }

  private toUserRow(doc: WithId<UserDocument> | UserDocument | null): UserRow | undefined {
    if (!doc) return undefined;
    return {
      id: doc.id,
      email: doc.email,
      display_name: doc.display_name,
      access_token: this.decryptToken(doc.access_token ?? null),
      refresh_token: this.decryptToken(doc.refresh_token ?? null),
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
    const encAccessToken = this.encryptToken(user.access_token);
    const encRefreshToken = this.encryptToken(user.refresh_token);

    const doc = await this.collection.findOneAndUpdate(
      { id: user.id },
      {
        $set: {
          email: user.email,
          display_name: user.display_name,
          ...(encAccessToken !== undefined && { access_token: encAccessToken }),
          ...(encRefreshToken !== undefined && { refresh_token: encRefreshToken }),
          ...(user.token_expiry !== undefined && { token_expiry: user.token_expiry }),
        },
        $setOnInsert: {
          id: user.id,
          created_at: new Date().toISOString(),
        },
      },
      { upsert: true, returnDocument: 'after' }
    );
    return this.toUserRow(doc)!;
  }

  async updateTokens(id: string, tokens: { access_token: string; refresh_token?: string; token_expiry?: string }): Promise<UserRow | undefined> {
    const doc = await this.collection.findOneAndUpdate(
      { id },
      {
        $set: {
          access_token: encrypt(tokens.access_token, this.encryptionKey),
          ...(tokens.refresh_token !== undefined && { refresh_token: encrypt(tokens.refresh_token, this.encryptionKey) }),
          ...(tokens.token_expiry !== undefined && { token_expiry: tokens.token_expiry }),
        },
      },
      { returnDocument: 'after' }
    );
    return this.toUserRow(doc);
  }
}
