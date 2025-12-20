import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import { notFound, errorHandler } from './middlewares/errorMiddleware.js';
import userRoutes from './routes/userRoutes.js';
import authRoutes from './routes/auth.routes.js';
import chatRoutes from './routes/chat.routes.js';
import swaggerSpecs from './config/swagger.js';

const app = express();

// Middleware
app.use(express.json()); // Body parser
app.use(cookieParser()); // Cookie parser
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
})); // Enable CORS with credentials
app.use(helmet()); // Security headers
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev')); // Logger
}
app.set("trust proxy", 1);

// Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

// Routes
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Sarjan AI</title>
            <style>
                body {
                    margin: 0;
                    padding: 0;
                    font-family: 'Inter', system-ui, -apple-system, sans-serif;
                    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
                    color: #fff;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                }
                .container {
                    text-align: center;
                    padding: 4rem;
                    background: rgba(255, 255, 255, 0.03);
                    border-radius: 24px;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    backdrop-filter: blur(12px);
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                    max-width: 600px;
                    width: 90%;
                }
                h1 {
                    font-size: 3rem;
                    font-weight: 800;
                    margin: 0 0 1rem 0;
                    background: linear-gradient(to right, #60a5fa, #c084fc);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    letter-spacing: -0.025em;
                }
                .tagline {
                    font-size: 1.25rem;
                    color: #94a3b8;
                    margin-bottom: 2rem;
                    line-height: 1.6;
                }
                .status {
                    display: inline-flex;
                    align-items: center;
                    padding: 0.5rem 1rem;
                    background: rgba(16, 185, 129, 0.1);
                    border: 1px solid rgba(16, 185, 129, 0.2);
                    border-radius: 9999px;
                    color: #34d399;
                    font-size: 0.875rem;
                    font-weight: 500;
                }
                .dot {
                    width: 8px;
                    height: 8px;
                    background-color: #34d399;
                    border-radius: 50%;
                    margin-right: 0.5rem;
                    box-shadow: 0 0 12px #34d399;
                }
                .btn {
                    display: inline-block;
                    margin-top: 1rem;
                    padding: 0.75rem 1.5rem;
                    background: linear-gradient(to right, #60a5fa, #c084fc);
                    color: white;
                    text-decoration: none;
                    border-radius: 9999px;
                    font-weight: 600;
                    transition: opacity 0.2s;
                }
                .btn:hover {
                    opacity: 0.9;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Sarjan AI</h1>
                <p class="tagline">Welcome to Sarjan AI Professional Design.<br>Building the future of intelligent systems.</p>
                <div class="status">
                    <span class="dot"></span>
                    System Operational
                </div>
                <br>
                <a href="/api-docs" class="btn">View API Docs</a>
            </div>
        </body>
        </html>
    `);
});

app.use('/api/chat', chatRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// Error Handling Middleware
app.use(notFound);
app.use(errorHandler);



export default app;
