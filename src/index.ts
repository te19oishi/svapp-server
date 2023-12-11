import { Hono } from 'hono';
import { cors } from 'hono/cors';

const app = new Hono();
app.use('/api/*', cors());

// ユーザー情報を取得するためのエンドポイント
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
	const sessionId = crypto.randomUUID();

	try {
		await c.env.KV.put(sessionId, JSON.stringify(user));
		return c.json({ sessionId: sessionId });
	}
	catch (e) {
		return c.json({ sessionId: null });
	}
});

// セッション情報を取得するためのエンドポイント
app.get('/api/session/:sessionId', async c => {
	const { sessionId } = c.req.param();
	try {
		const userString = await c.env.KV.get<UserInfo>(sessionId);

		if (!userString) {
			return c.json({ error: 'User not found' }, 404);
		}

		// JSON文字列をオブジェクトに変換
		const user = JSON.parse(userString);
		return c.json(user);
	}
	catch (e) {
		console.log(e);
		return c.json({ error: 'Internal Server Error' }, 500);
	}
});

// セッション情報を削除するためのエンドポイント
app.delete('/api/session/:sessionId', async c => {
	const sessionId = c.req.json();
	await c.env.KV.delete(sessionId);
	return c.json({ status: 'ok' });
});



// 出勤/退勤打刻のエンドポイント
app.get('/api/punch/:sessionId', async c => {
	const { sessionId } = c.req.param();
	if (!sessionId) {
		return c.json({ error: 'SessionId not found' }, 404);
	}
	const sessionData = await fetch('https://svapp-server.hinaharu-0014.workers.dev/api/session/' + sessionId);
	if (!sessionData.ok) {
		return c.json({ error: sessionData }, 404);
	}
	const userEmail = (await sessionData.json<UserInfo>()).email;
	const userId = await c.env.SVAPP_DB.prepare(
		`
		SELECT id FROM users WHERE email = ?
	`
	).bind(userEmail).all();

	const punchedRecord = await c.env.SVAPP_DB.prepare(
		`
		SELECT * FROM AttendanceRecords WHERE user_id = ? AND time_out IS NULL
	`
	).bind(userId).all();

	const now = new Date().toISOString();
	if (punchedRecord.length > 0) {
		c.env.SVAPP_DB.prepare(
			`
			UPDATE AttendanceRecords SET time_out = ? WHERE user_id = ? AND time_out IS NULL
		`
		).bind(now).bind(userId).run();
		return c.json({ "time_out": now });
		
	} else {
		c.env.SVAPP_DB.prepare(
			`
			INSERT INTO AttendanceRecords (user_id, time_in) VALUES (?, ?)
		`
		).bind(userId).bind(now).run();
		return c.json({ "time_in": now });
	}
});


app.onError((err, c) => {
	console.error(`${err}`);
	return c.text(err.toString());
});

app.notFound(c => c.text('Not found', 404));

export default app;