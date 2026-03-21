import { Server } from 'socket.io';

import { stopGeneration } from '../utils/background.processor.js';

let io;

export const initSocket = (httpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: process.env.CLIENT_URL || '*',
            methods: ['GET', 'POST']
        }
    });

    io.on("connection", (socket) => {
        console.log("User connected:", socket.id);

        // ✅ ADD THIS BLOCK
        socket.on("join", (roomId) => {
            socket.join(roomId);
            // console.log(Socket ${ socket.id } joined room: ${ roomId });
        });
        // ----------------

        socket.on('stop_generation', ({ conversationId }) => {
            console.log(`Stop request received for conversation ${conversationId}`);
            stopGeneration(conversationId);
        });

        socket.on("disconnect", () => {
            console.log("User disconnected");
        });
    });

    return io;
};

export const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized!');
    }
    return io;
};
