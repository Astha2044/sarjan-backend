import Message from '../models/Message.js';
import ideaPipeline from './agent-fuction.js';

const activeJobs = new Map();

export const stopGeneration = (conversationId) => {
    if (activeJobs.has(conversationId)) {
        activeJobs.set(conversationId, false); // Set status to false to indicate stop
        console.log(`Job for conversation ${conversationId} marked for stopping.`);
        return true;
    }
    return false;
};

export const processAIResponse = async (conversationId, prompt, userId, io) => {
    const roomId = `chat_${conversationId}`;
    activeJobs.set(conversationId, true); // Mark job as active

    const checkStop = () => {
        if (activeJobs.get(conversationId) === false) {
            return true;
        }
        return false;
    };

    try {
        // Call the AI pipeline with checkStop callback
        const data = await ideaPipeline(prompt, io, roomId, checkStop);
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
