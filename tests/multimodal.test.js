import request from 'supertest';
import { jest } from '@jest/globals';
// import app from '../src/app.js';
import Conversation from '../src/models/Conversation.js';
import path from 'path';

// Mock Socket.IO config
jest.unstable_mockModule('../src/config/socket.js', () => ({
    initSocket: jest.fn(),
    getIO: jest.fn(() => ({
        to: jest.fn().mockReturnThis(),
        emit: jest.fn(),
    })),
}));

// Mock Background Processor (Spy on it instead of full mock to see args?)
// Actually we want to mock it to avoid real gemini calls but verify it was called with files
jest.unstable_mockModule('../src/utils/background.processor.js', () => ({
    processAIResponse: jest.fn(),
}));

const { default: app } = await import('../src/app.js');
const { processAIResponse } = await import('../src/utils/background.processor.js');

describe('Multimodal Chat Endpoints', () => {
    let token;
    let userId;

    beforeEach(async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({
                name: 'Multi User',
                email: `multi_${Date.now()}@example.com`,
                password: 'Password123!',
            });
        token = res.body.data.token;
        userId = res.body.data._id;
    });

    it('should upload a file and start processing', async () => {
        // Create a dummy file buffer
        const buffer = Buffer.from('fake image data');

        const res = await request(app)
            .post('/api/chat/message')
            .set('Authorization', `Bearer ${token}`)
            .field('title', 'Image Chat')
            .field('prompt', 'Describe this image')
            .attach('files', buffer, 'test_image.jpg');

        expect(res.statusCode).toBe(202);
        expect(res.body.data.userMessage.attachments).toBeDefined();
        expect(res.body.data.userMessage.attachments.length).toBe(1);
        expect(res.body.data.userMessage.attachments[0].type).toBe('image');

        // Check if processAIResponse was called with files
        expect(processAIResponse).toHaveBeenCalled();
        // Check the 5th argument (files)
        const calls = processAIResponse.mock.calls;
        const lastCall = calls[calls.length - 1];
        expect(lastCall[4]).toBeDefined();
        expect(lastCall[4].length).toBe(1);
    });

    it('should accept image generation prompt without file', async () => {
        const res = await request(app)
            .post('/api/chat/message')
            .set('Authorization', `Bearer ${token}`)
            .send({
                title: 'Gen Chat',
                prompt: 'Generate an image of a cat'
            });

        expect(res.statusCode).toBe(202);
        expect(processAIResponse).toHaveBeenCalled();
    });
});
