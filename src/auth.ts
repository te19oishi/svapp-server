import { Hono } from 'hono'
import jwt from 'jsonwebtoken'

const app = new Hono()

// JWTペイロードのためのインターフェース
interface JwtPayload {
  sub: string;
  email: string;
}

app.get('/user', async (c) => {
  const token = c.req.header('authorization')?.split(' ')[1]
  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  try {
    const payload = jwt.decode(token) as JwtPayload | null
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
