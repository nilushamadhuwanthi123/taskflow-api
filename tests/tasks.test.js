const request = require('supertest');
const app = require('../src/app');

async function registerAndLogin(overrides = {}) {
  const user = {
    name: 'Test User',
    email: 'user@example.com',
    password: 'password123',
    ...overrides,
  };

  const res = await request(app).post('/api/auth/register').send(user);
  return { token: res.body.token, user: res.body.user };
}

describe('Task API', () => {
  describe('Auth protection', () => {
    it('rejects a request with no token with 401', async () => {
      const res = await request(app).get('/api/tasks');
      expect(res.status).toBe(401);
      expect(res.body.error.message).toMatch(/no token/i);
    });

    it('rejects a request with a malformed/bad token with 401', async () => {
      const res = await request(app).get('/api/tasks').set('Authorization', 'Bearer not-a-real-token');
      expect(res.status).toBe(401);
      expect(res.body.error.message).toMatch(/invalid or expired token/i);
    });
  });

  describe('CRUD flow', () => {
    let token;

    beforeEach(async () => {
      ({ token } = await registerAndLogin());
    });

    it('supports create -> list -> get -> update -> delete', async () => {
      // Create
      const createRes = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Write CI pipeline', priority: 'high' });

      expect(createRes.status).toBe(201);
      expect(createRes.body.task.title).toBe('Write CI pipeline');
      expect(createRes.body.task.status).toBe('todo');
      const taskId = createRes.body.task._id;

      // List
      const listRes = await request(app).get('/api/tasks').set('Authorization', `Bearer ${token}`);
      expect(listRes.status).toBe(200);
      expect(listRes.body.count).toBe(1);
      expect(listRes.body.tasks[0]._id).toBe(taskId);

      // Get one
      const getRes = await request(app)
        .get(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${token}`);
      expect(getRes.status).toBe(200);
      expect(getRes.body.task._id).toBe(taskId);

      // Update
      const updateRes = await request(app)
        .put(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'in-progress' });
      expect(updateRes.status).toBe(200);
      expect(updateRes.body.task.status).toBe('in-progress');

      // Delete
      const deleteRes = await request(app)
        .delete(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${token}`);
      expect(deleteRes.status).toBe(200);

      // Confirm gone
      const getAfterDelete = await request(app)
        .get(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${token}`);
      expect(getAfterDelete.status).toBe(404);
    });

    it('rejects creating a task without a title', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({ description: 'no title here' });
      expect(res.status).toBe(422);
    });

    it('filters tasks by status and priority query params', async () => {
      await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Low priority todo', priority: 'low', status: 'todo' });
      await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'High priority done', priority: 'high', status: 'done' });

      const statusRes = await request(app)
        .get('/api/tasks?status=done')
        .set('Authorization', `Bearer ${token}`);
      expect(statusRes.status).toBe(200);
      expect(statusRes.body.count).toBe(1);
      expect(statusRes.body.tasks[0].title).toBe('High priority done');

      const priorityRes = await request(app)
        .get('/api/tasks?priority=low')
        .set('Authorization', `Bearer ${token}`);
      expect(priorityRes.status).toBe(200);
      expect(priorityRes.body.count).toBe(1);
      expect(priorityRes.body.tasks[0].title).toBe('Low priority todo');
    });
  });

  describe('Ownership enforcement', () => {
    it('prevents user B from viewing, updating, or deleting user A task', async () => {
      const { token: tokenA } = await registerAndLogin({ email: 'userA@example.com' });
      const { token: tokenB } = await registerAndLogin({ email: 'userB@example.com' });

      const createRes = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ title: "User A's private task" });
      const taskId = createRes.body.task._id;

      // User B cannot see it in their list
      const listResB = await request(app).get('/api/tasks').set('Authorization', `Bearer ${tokenB}`);
      expect(listResB.body.count).toBe(0);

      // User B cannot get it directly
      const getResB = await request(app)
        .get(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${tokenB}`);
      expect(getResB.status).toBe(404);

      // User B cannot update it
      const updateResB = await request(app)
        .put(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ title: 'Hijacked' });
      expect(updateResB.status).toBe(404);

      // User B cannot delete it
      const deleteResB = await request(app)
        .delete(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${tokenB}`);
      expect(deleteResB.status).toBe(404);

      // It still exists for user A, unmodified
      const getResA = await request(app)
        .get(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${tokenA}`);
      expect(getResA.status).toBe(200);
      expect(getResA.body.task.title).toBe("User A's private task");
    });
  });
});
