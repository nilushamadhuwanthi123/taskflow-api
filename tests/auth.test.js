const request = require('supertest');
const app = require('../src/app');

describe('Auth API', () => {
  const validUser = {
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    password: 'supersecret',
  };

  describe('POST /api/auth/register', () => {
    it('registers a new user and returns an access token and a refresh token', async () => {
      const res = await request(app).post('/api/auth/register').send(validUser);

      expect(res.status).toBe(201);
      expect(res.body.token).toEqual(expect.any(String));
      expect(res.body.refreshToken).toEqual(expect.any(String));
      expect(res.body.user.email).toBe(validUser.email);
      expect(res.body.user.password).toBeUndefined();
      expect(res.body.user.refreshTokenHash).toBeUndefined();
    });

    it('rejects registration with an invalid email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ ...validUser, email: 'not-an-email' });

      expect(res.status).toBe(422);
      expect(res.body.error.message).toBe('Validation failed');
    });

    it('rejects a duplicate email registration', async () => {
      await request(app).post('/api/auth/register').send(validUser);

      const res = await request(app).post('/api/auth/register').send(validUser);

      expect(res.status).toBe(409);
      expect(res.body.error.message).toMatch(/already registered/i);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await request(app).post('/api/auth/register').send(validUser);
    });

    it('logs in with correct credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: validUser.email, password: validUser.password });

      expect(res.status).toBe(200);
      expect(res.body.token).toEqual(expect.any(String));
      expect(res.body.user.email).toBe(validUser.email);
    });

    it('rejects login with the wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: validUser.email, password: 'wrong-password' });

      expect(res.status).toBe(401);
      expect(res.body.error.message).toMatch(/invalid email or password/i);
    });

    it('rejects login for a non-existent email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nobody@example.com', password: 'whatever1' });

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('exchanges a valid refresh token for a new token pair', async () => {
      const registerRes = await request(app).post('/api/auth/register').send(validUser);
      const { refreshToken } = registerRes.body;

      const res = await request(app).post('/api/auth/refresh').send({ refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.token).toEqual(expect.any(String));
      expect(res.body.refreshToken).toEqual(expect.any(String));
      expect(res.body.refreshToken).not.toBe(refreshToken);
    });

    it('rotates the refresh token so the old one can no longer be used', async () => {
      const registerRes = await request(app).post('/api/auth/register').send(validUser);
      const { refreshToken: firstRefreshToken } = registerRes.body;

      await request(app).post('/api/auth/refresh').send({ refreshToken: firstRefreshToken });

      const reuseRes = await request(app).post('/api/auth/refresh').send({ refreshToken: firstRefreshToken });

      expect(reuseRes.status).toBe(401);
    });

    it('rejects a missing refresh token', async () => {
      const res = await request(app).post('/api/auth/refresh').send({});
      expect(res.status).toBe(422);
    });

    it('rejects a malformed/invalid refresh token', async () => {
      const res = await request(app).post('/api/auth/refresh').send({ refreshToken: 'not-a-real-token' });
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('revokes the refresh token so it can no longer be exchanged', async () => {
      const registerRes = await request(app).post('/api/auth/register').send(validUser);
      const { token, refreshToken } = registerRes.body;

      const logoutRes = await request(app).post('/api/auth/logout').set('Authorization', `Bearer ${token}`);
      expect(logoutRes.status).toBe(200);

      const refreshRes = await request(app).post('/api/auth/refresh').send({ refreshToken });
      expect(refreshRes.status).toBe(401);
    });

    it('requires authentication', async () => {
      const res = await request(app).post('/api/auth/logout');
      expect(res.status).toBe(401);
    });
  });
});
