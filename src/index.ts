import { Hono } from 'hono';
import { cors } from 'hono/cors';

const app = new Hono();
app.use('/api/*', cors());

app.get('/api/users/:email', async c => {
	const { email } = c.req.param();
	const { results } = await c.env.SVAPP_DB.prepare(
		`
    SELECT * FROM users WHERE email = ?
  `
	)
		.bind(email)
		.all();
	return c.json(results);
});

interface UserInfo {
	/**
	 * The display name of the user.
	 */
	readonly displayName: string | null;
	/**
	 * The email of the user.
	 */
	readonly email: string | null;
	/**
	 * The phone number normalized based on the E.164 standard (e.g. +16505550101) for the
	 * user.
	 *
	 * @remarks
	 * This is null if the user has no phone credential linked to the account.
	 */
	readonly phoneNumber: string | null;
	/**
	 * The profile photo URL of the user.
	 */
	readonly photoURL: string | null;
	/**
	 * The provider used to authenticate the user.
	 */
	readonly providerId: string;
	/**
	 * The user's unique ID, scoped to the project.
	 */
	readonly uid: string;
}

// セッション情報を保存するためのエンドポイント
app.post('/api/session', async c => {
	const user = await c.req.json<UserInfo>();
	const sessionId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
	await c.env.KV.set(sessionId, user);
	return c.json({ sessionId });
});

// セッション情報を取得するためのエンドポイント
app.get('/api/session/:sessionId', async c => {
	const { sessionId } = c.req.param();
	const user = await c.env.KV.get<UserInfo>(sessionId);
	return c.json(user);
});

// セッション情報を削除するためのエンドポイント
app.delete('/api/session/:sessionId', async c => {
	const { sessionId } = c.req.param();
	await c.env.KV.delete(sessionId);
	return c.json({ status: 'ok' });
});

app.onError((err, c) => {
	console.error(`${err}`);
	return c.text(err.toString());
});

app.notFound(c => c.text('Not found', 404));

export default app;