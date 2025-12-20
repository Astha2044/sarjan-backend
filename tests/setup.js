import mongoose from 'mongoose';
import { jest } from '@jest/globals';
import dotenv from 'dotenv';
import { MongoMemoryServer } from 'mongodb-memory-server';

dotenv.config();

let mongod;

// Connect to In-Memory Test Database
beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    await mongoose.connect(uri);
});

// Clear Data Between Tests
afterEach(async () => {
    if (mongoose.connection.readyState !== 0) {
        const collections = mongoose.connection.collections;
        for (const key in collections) {
            await collections[key].deleteMany();
        }
    }
});

// Disconnect After All Tests
afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    if (mongod) await mongod.stop();
});

// Mock console.log and console.error to keep test output clean
// global.console = {
//     ...console,
//     // log: jest.fn(),
//     // error: jest.fn(),
//     warn: jest.fn(),
// };

// Mocking background processor to avoid calling real AI pipeline
jest.mock('../src/utils/background.processor.js', () => ({
    processAIResponse: jest.fn(),
}));

jest.mock('../src/utils/gemini-client.js', () => jest.fn());

// Mock Socket.IO config
jest.mock('../src/config/socket.js', () => ({
    initSocket: jest.fn(),
    getIO: jest.fn(() => ({
        to: jest.fn().mockReturnThis(),
        emit: jest.fn(),
    })),
}));
