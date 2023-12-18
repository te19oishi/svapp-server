import { Hono } from 'hono';
import { cors } from 'hono/cors';

const app = new Hono();
app.use('/api/*', cors());

// ユーザー情報を取得するためのエンドポイント
app.get('/api/users/:email', async c => {
	const { email } = c.req.param();
	const { results } = await c.env.SVAPP_DB.prepare(
		`
    SELECT * FROM users WHERE email = ? LIMIT 1
  `
	)
		.bind(email)
		.all();

	const user = results[0];
	return c.json(user);
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
	let user: UserInfo;
	try {
		const userString = await c.env.KV.get<UserInfo>(sessionId);

		if (!userString) {
			return c.json({ error: 'User not found' }, 404);
		}

		// JSON文字列をオブジェクトに変換
		user = JSON.parse(userString);

	}
	catch (e) {
		console.error(e);
		return c.json({ error: 'Internal Server Error' }, 500);
	}

	const userEmail = user.email;
	if (!userEmail) {
		return c.json({ error: 'UserEmail not found' }, 404);
	}

	const userIdsResult = await c.env.SVAPP_DB.prepare(
		`
  SELECT id FROM users WHERE email = ? LIMIT 1
  `
	).bind(userEmail).all();

	// userIdsResult.results配列が空かどうかをチェック
	if (userIdsResult.results.length === 0) {
		return c.json({ error: 'UserId not found' }, 404);
	}

	const userId = userIdsResult.results[0].id;

	const punchedRecord = await c.env.SVAPP_DB.prepare(
		`
		SELECT * FROM AttendanceRecords WHERE user_id = ? AND time_out IS NULL LIMIT 1
	`
	).bind(userId).all();

	const date = new Date().toISOString().split('T')[0];
	const time = getJSTTimeString();

	if (punchedRecord.results.length !== 0) {
		await c.env.SVAPP_DB.prepare(
			`
			UPDATE AttendanceRecords SET time_out = ? WHERE user_id = ? AND time_out IS NULL
			`
		).bind(time, userId).run();
		return c.json({ "time_out": time, "date": date, "user_id": userId });

	} else {
		await c.env.SVAPP_DB.prepare(
			`
      INSERT INTO AttendanceRecords (user_id, date, time_in) VALUES (?, ?, ?)
      `
		).bind(userId, date, time).run();

		return c.json({ "time_in": time, "date": date, "user_id": userId });
	}
});


app.get('/api/records/:sessionId/:page', async c => {
	const sessionId = c.req.param('sessionId');
	let userInfo: UserInfo;
	try {
		const userString = await c.env.KV.get<UserInfo>(sessionId);

		if (!userString) {
			return c.json({ error: 'User not found' }, 404);
		}

		// JSON文字列をオブジェクトに変換
		userInfo = JSON.parse(userString);

	}
	catch (e) {
		console.error(e);
		return c.json({ error: 'Internal Server Error' }, 500);
	}

	const userEmail = userInfo.email;
	if (!userEmail) {
		return c.json({ error: 'UserEmail not found' }, 404);
	}

	const user = await c.env.SVAPP_DB.prepare(
		`
	SELECT * FROM users WHERE email = ?
	`
	).bind(userEmail).first();
	if (!user) {
		return c.json({ error: 'User not found' }, 404);
	}

	const userId = user.id;
  const page = parseInt(c.req.param('page'), 10) || 1;
  const limit = 31;
  const offset = (page - 1) * limit;
	
	const records = await c.env.SVAPP_DB.prepare(
		`
		SELECT * FROM AttendanceRecords WHERE user_id = ? ORDER BY date DESC LIMIT ? OFFSET ?
	`
	).bind(userId, limit, offset).all();

	const salary = getSalaryByRole(user.role);

	return c.json({ records, salary });

});



app.onError((err, c) => {
	console.error(`${err}`);
	return c.text(err.toString());
});

app.notFound(c => c.text('Not found', 404));

export default app;



function getJSTTimeString() {
  const now = new Date();
  now.setHours(now.getHours() + 9); // UTCからJSTに変換
  const timeString = now.toISOString().split('T')[1].split('.')[0];
  return timeString; // "HH:MM:SS" 形式
}

function getSalaryByRole(role: string) {
	switch (role) {
		case "owner":
			return 3000;
		case "manager":
			return 2000;
		case "staff":
			return 1500;
		case "parttime":
			return 1200;
		default:
			return 1000;
	}
}


