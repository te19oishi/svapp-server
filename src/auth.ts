import { Hono } from 'hono'
import { cors } from 'hono/cors';
import jwt from 'jsonwebtoken'

const app = new Hono();
app.use('/api/*', cors());

// JWTペイロードのためのインターフェース
interface JwtPayload {
  sub: string;
  email: string;
}

app.get('/api/auth', async (c) => {
  const token = c.req.header('authorization')?.split(' ')[1];
  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const payload = jwt.decode(token) as JwtPayload | null;
    if (payload) {
      const { sub: userId, email } = payload;
      return c.json({ userId, email });
    } else {
      return c.json({ error: 'Invalid token' }, 401);
    }
  } catch (error) {
    return c.json({ error: 'Invalid token' }, 401);
  }
})

import { jwtVerify } from 'jose'

// Google OAuthのリダイレクトURIエンドポイント
app.get('/auth/google/callback', async (c) => {
  const code = c.req.query('code')

  if (!code) {
    return c.json({ error: 'No code provided' }, 400)
  }

  // 認証コードをアクセストークンに交換
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      code: code,
      client_id: 'GOOGLE_CLIENT_ID',
      client_secret: 'GOOGLE_CLIENT_SECRET',
      redirect_uri: 'https://svapp-server.hinaharu-0014.workers.dev/auth/google/callback',
      grant_type: 'authorization_code',
    }),
  })

  const tokenData = await tokenResponse.json()
  const idToken = tokenData.id_token

  // IDトークン（JWT）のデコードと検証
  try {
    const { payload } = await jwtVerify(idToken, new TextEncoder().encode('YOUR_JWT_SECRET'))
    return c.json({ user: payload })
  } catch (err) {
    return c.json({ error: 'Invalid token' }, 401)
  }
})

export default app;
