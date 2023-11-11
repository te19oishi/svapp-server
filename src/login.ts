// Cloudflare Worker (Hono)
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import bcrypt from 'bcryptjs';

const app = new Hono();
app.use('/api/*', cors());

app.post('/api/login', async (c) => {
  try {
    const { email, password } = await c.req.json();

    // ユーザー認証のロジック（例: データベースへの問い合わせ）
    // ※ここでは仮の認証処理を示します

    const { user } = await c.env.SVAPP_DB.prepare(
      `
      select * from users where email = ?
    `
    ).bind(email).get();

    const userIsValid = (email === 'user@example.com' && password === 'password123');

    if (userIsValid) {
      // 認証成功時のレスポンス
      return c.json({ message: 'ログイン成功' });
    } else {
      // 認証失敗時のレスポンス
      return c.json({ error: 'ログイン失敗' }, 401);
    }
  } catch (error) {
    return c.json({ error: 'エラー発生' }, 500);
  }
})

app.fire()
