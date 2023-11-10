import jwt from 'jsonwebtoken';

export async function get(request) {
    const token = request.headers.authorization ? .split(' ')[1];
    if (!token) {
        return { status: 401, body: 'Unauthorized' };
    }

    try {
        const payload = jwt.decode(token);
        const userId = payload.sub; // JWTのsubフィールドからユーザーIDを取得
        const email = payload.email; // JWTのemailフィールドからEmailを取得
        return { status: 200, body: { userId, email } };
    } catch (error) {
        return { status: 401, body: 'Invalid token' };
    }
}