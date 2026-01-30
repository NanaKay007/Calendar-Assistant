import Database from 'better-sqlite3';

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
  constructor(private db: Database.Database) {}

  findById(id: string): UserRow | undefined {
    return this.db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
  }

  findByEmail(email: string): UserRow | undefined {
    return this.db.prepare('SELECT * FROM users WHERE email = ?').get(email) as UserRow | undefined;
  }

  upsert(user: { id: string; email: string; display_name: string; access_token?: string; refresh_token?: string; token_expiry?: string }): UserRow {
    const stmt = this.db.prepare(`
      INSERT INTO users (id, email, display_name, access_token, refresh_token, token_expiry)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        email = excluded.email,
        display_name = excluded.display_name,
        access_token = COALESCE(excluded.access_token, users.access_token),
        refresh_token = COALESCE(excluded.refresh_token, users.refresh_token),
        token_expiry = COALESCE(excluded.token_expiry, users.token_expiry)
    `);
    stmt.run(user.id, user.email, user.display_name, user.access_token ?? null, user.refresh_token ?? null, user.token_expiry ?? null);
    return this.findById(user.id)!;
  }

  updateTokens(id: string, tokens: { access_token: string; refresh_token?: string; token_expiry?: string }): UserRow | undefined {
    this.db.prepare(`
      UPDATE users SET access_token = ?, refresh_token = COALESCE(?, refresh_token), token_expiry = COALESCE(?, token_expiry)
      WHERE id = ?
    `).run(tokens.access_token, tokens.refresh_token ?? null, tokens.token_expiry ?? null, id);
    return this.findById(id);
  }
}
