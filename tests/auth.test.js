const request = require('supertest');
const app = require('../src/app');

describe('Auth API', () => {
  const validUser = {
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    password: 'supersecret',
  };

  describe('POST /api/auth/register', () => {
    it('registers a new user and returns a token', async () => {
      const res = await request(app).post('/api/auth/register').send(validUser);

      expect(res.status).toBe(201);
      expect(res.body.token).toEqual(expect.any(String));
      expect(res.body.user.email).toBe(validUser.email);
      expect(res.body.user.password).toBeUndefined();
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
});
