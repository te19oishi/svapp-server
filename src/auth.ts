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

export default app;
