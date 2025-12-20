import swaggerJsdoc from 'swagger-jsdoc';

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Sarjan Backend API',
            version: '1.0.0',
            description: 'Production-ready RESTful API backend built with Node.js, Express, and MongoDB',
            contact: {
                name: "API Support",
                email: "support@sarjan.ai"
            },
            license: {
                name: "MIT",
                url: "https://opensource.org/licenses/MIT"
            }
        },
        servers: [
            {
                url: 'http://localhost:7122',
                description: 'Development server',
            },
            {
                url: 'https://api.sarjan.ai',
                description: 'Production server',
            }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                }
            },
            schemas: {
                User: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string', example: '60d0fe4f5311236168a109ca' },
                        name: { type: 'string', example: 'John Doe' },
                        email: { type: 'string', format: 'email', example: 'john@example.com' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                    }
                },
                Conversation: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string', example: '64f1d2e8a9b3c4d5e6f7g8h9' },
                        userId: { type: 'string', example: '60d0fe4f5311236168a109ca' },
                        title: { type: 'string', example: 'New Chat' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                    }
                },
                Message: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string', example: '65f1d2e8a9b3c4d5e6f7g8h1' },
                        conversationId: { type: 'string', example: '64f1d2e8a9b3c4d5e6f7g8h9' },
                        role: { type: 'string', enum: ['user', 'assistant'], example: 'user' },
                        content: { type: 'string', example: 'Hello AI' },
                        createdAt: { type: 'string', format: 'date-time' },
                    }
                },
                AuthResponse: {
                    type: 'object',
                    properties: {
                        status: { type: 'string', example: 'success' },
                        message: { type: 'string', example: 'Logged in successfully' },
                        data: {
                            type: 'object',
                            properties: {
                                user: { $ref: '#/components/schemas/User' },
                                token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' }
                            }
                        }
                    }
                },
                ChatResponse: {
                    type: 'object',
                    properties: {
                        status: { type: 'string', example: 'success' },
                        data: {
                            type: 'object',
                            properties: {
                                userMessage: { $ref: '#/components/schemas/Message' },
                                aiMessage: { $ref: '#/components/schemas/Message' }
                            }
                        }
                    }
                },
                Error: {
                    type: 'object',
                    properties: {
                        status: { type: 'string', example: 'error' },
                        message: { type: 'string', example: 'Invalid credentials' }
                    }
                }
            }
        },
        security: [{
            bearerAuth: []
        }],
    },
    apis: ['./src/routes/*.js'],
};

const specs = swaggerJsdoc(options);

export default specs;
