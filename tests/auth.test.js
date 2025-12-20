import request from 'supertest';
// import app from '../src/app.js';
import User from '../src/models/User.js';

// Dynamic import of app
const { default: app } = await import('../src/app.js');

describe('Authentication Endpoints', () => {
    describe('POST /api/auth/register', () => {
        it('should register a new user successfully', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'Test User',
                    email: 'test@example.com',
                    password: 'Password123!',
                });

            expect(res.statusCode).toBe(201);
            expect(res.body.status).toBe('success');
            expect(res.body.data.email).toBe('test@example.com');
            expect(res.body.data.token).toBeDefined();

            // Verify in DB
            const user = await User.findOne({ email: 'test@example.com' });
            expect(user).toBeTruthy();
            expect(user.password).not.toBe('Password123!'); // Hashed
        });

        it('should fail with weak password', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'Test User',
                    email: 'weak@example.com',
                    password: '123',
                });

            expect(res.statusCode).toBe(400);
            expect(res.body.status).toBe('error');
        });

        it('should fail if email already exists', async () => {
            await User.create({
                name: 'Existing User',
                email: 'exists@example.com',
                password: 'Password123!'
            });

            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'New User',
                    email: 'exists@example.com',
                    password: 'Password123!',
                });

            expect(res.statusCode).toBe(400);
            expect(res.body.message).toMatch(/already exists/i);
        });
    });

    describe('POST /api/auth/login', () => {
        beforeEach(async () => {
            await request(app).post('/api/auth/register').send({
                name: 'Login User',
                email: 'login@example.com',
                password: 'Password123!',
            });
        });

        it('should login successfully with correct credentials', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'login@example.com',
                    password: 'Password123!',
                });

            expect(res.statusCode).toBe(200);
            expect(res.body.status).toBe('success');
            expect(res.body.data.token).toBeDefined();
        });

        it('should fail with incorrect password', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'login@example.com',
                    password: 'WrongPassword!',
                });

            expect(res.statusCode).toBe(401);
        });
    });
});
