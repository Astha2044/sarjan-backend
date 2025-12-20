import Message from '../models/Message.js';
import ideaPipeline from './agent-fuction.js';

import fs from 'fs';
import path from 'path';

export const processAIResponse = async (conversationId, prompt, userId, io, files = []) => {
    const roomId = `chat_${conversationId}`;
    activeJobs.set(conversationId, true); // Mark job as active

    const checkStop = () => {
        if (activeJobs.get(conversationId) === false) {
            return true;
        }
        return false;
    };

    try {
        // Prepare image parts for Gemini
        const imageParts = files.map(file => {
            const filePath = path.resolve(file.path);
            const fileData = fs.readFileSync(filePath);
            return {
                inlineData: {
                    data: fileData.toString('base64'),
                    mimeType: file.mimetype
                }
            };
        });

        // Call the AI pipeline
        const data = await ideaPipeline(prompt, io, roomId, imageParts);
        const aiResponseContent = data.finalOutput;

        // Save AI Message
        const aiMessage = await Message.create({
            conversationId,
            role: 'assistant',
            content: aiResponseContent
        });

        io.to(roomId).emit('response_ready', {
            status: 'success',
            data: {
                aiMessage
            }
        });

    } catch (error) {
        if (error.message === 'STOPPED') {
            console.log(`Generation stopped for conversation ${conversationId}`);
            io.to(roomId).emit('generation_stopped', {
                status: 'info',
                message: 'Generation stopped by user'
            });
        } else {
            console.error('Error in background process:', error);
            io.to(roomId).emit('processing_error', {
                status: 'error',
                message: 'Failed to process AI response'
            });

            // Optionally save an error message to key the user know in history
            await Message.create({
                conversationId,
                role: 'assistant',
                content: 'Sorry, I encountered an error answering that.'
            });
        }
    } finally {
        activeJobs.delete(conversationId);
    }
};
