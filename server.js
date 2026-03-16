import dotenv from 'dotenv';
import connectDB from './src/config/db.js';
import app from './src/app.js';
dotenv.config();

connectDB();

import http from 'http';
import { initSocket } from './src/config/socket.js';

import { fileURLToPath } from 'url';

const PORT = process.env.PORT || 5000;

const httpServer = http.createServer(app);
initSocket(httpServer);

// Only listen if run directly (not imported)
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    httpServer.listen(PORT, () => {
        console.log(`Server running in ${process.env.NODE_ENV} mode on http://localhost:${PORT}`);
    });
}

export default app;
