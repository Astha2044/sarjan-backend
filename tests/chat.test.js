import request from 'supertest';
import { jest } from '@jest/globals';
// import app from '../src/app.js'; // Removed static import
import Conversation from '../src/models/Conversation.js';

// Mock Socket.IO config correctly for ESM
jest.unstable_mockModule('../src/config/socket.js', () => ({
    initSocket: jest.fn(),
    getIO: jest.fn(() => ({
        to: jest.fn().mockReturnThis(),
        emit: jest.fn(),
    })),
}));

// Dynamic import of app
const { default: app } = await import('../src/app.js');

describe('Chat Endpoints', () => {
    let token;
    let userId;

    beforeEach(async () => {
        // Register and login to get token
        const res = await request(app)
            .post('/api/auth/register')
            .send({
                name: 'Chat User',
                email: 'chat@example.com',
                password: 'Password123!',
            });

        // ... rest is same
        token = res.body.data.token;
        userId = res.body.data._id;
    });

    describe('POST /api/chat/message', () => {
        it('should accept message and start background processing (202) for new chat', async () => {
            const res = await request(app)
                .post('/api/chat/message')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    prompt: 'Hello AI',
                    title: 'Auto Created Chat'
                });

            expect(res.statusCode).toBe(202);
            expect(res.body.status).toBe('accepted');
            expect(res.body.data.userMessage.content).toBe('Hello AI');
            expect(res.body.data.conversationId).toBeDefined();

            // Verify conversation was created automatically
            const conversation = await Conversation.findById(res.body.data.conversationId);
            expect(conversation).toBeTruthy();
            expect(conversation.title).toBe('Auto Created Chat');
        });

        it('should accept message for existing chat', async () => {
            // Create initial chat via message
            const initRes = await request(app)
                .post('/api/chat/message')
                .set('Authorization', `Bearer ${token}`)
                .send({ prompt: 'Init', title: 'Existing Chat' });

            const conversationId = initRes.body.data.conversationId;

            // Send follow-up
            const res = await request(app)
                .post('/api/chat/message')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    conversationId,
                    prompt: 'Follow up'
                });

            expect(res.statusCode).toBe(202);
            expect(res.body.data.conversationId).toBe(conversationId);
        });

        it('should validate prompt presence', async () => {
            const res = await request(app)
                .post('/api/chat/message')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    // Missing prompt
                });

            expect(res.statusCode).toBe(400);
        });
    });

    describe('GET /api/chat/history', () => {
        it('should return user conversation history', async () => {
            // Create a chat first
            await request(app)
                .post('/api/chat/message')
                .set('Authorization', `Bearer ${token}`)
                .send({ title: 'History Chat', prompt: 'First msg' });

            const res = await request(app)
                .get('/api/chat/history')
                .set('Authorization', `Bearer ${token}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.data.conversations.length).toBeGreaterThan(0);
            expect(res.body.data.conversations[0].title).toBe('History Chat');
        });
    });
});
