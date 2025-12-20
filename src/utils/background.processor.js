import Message from '../models/Message.js';
import ideaPipeline from './agent-fuction.js';

export const processAIResponse = async (conversationId, prompt, userId, io) => {
    const roomId = `chat_${conversationId}`;

    try {
        // Call the AI pipeline
        const data = await ideaPipeline(prompt, io, roomId);
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
};
