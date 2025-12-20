import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import asyncHandler from '../utils/asyncHandler.js';
import ideaPipeline from '../utils/agent-fuction.js';


// // @desc    Create a new chat
// // @route   POST /api/chat/new
// // @access  Private
// const createChat = asyncHandler(async (req, res) => {
//     const { title } = req.body;

//     const conversation = await Conversation.create({
//         userId: req.user._id,
//         title: title || 'New Chat'
//     });

//     res.status(201).json({
//         status: 'success',
//         data: {
//             conversation
//         }
//     });
// });

// @desc    Send a message (and get mock AI response)
// @route   POST /api/chat/message
// @access  Private
const sendMessage = asyncHandler(async (req, res) => {
    try {
        const { title, conversationId, prompt } = req.body;

        let conversation

        if (conversationId) {
            // 1. Verify conversation belongs to user
            conversation = await Conversation.findOne({
                _id: conversationId,
                userId: req.user._id
            });

            if (!conversation) {
                res.status(404);
                throw new Error('Conversation not found');
            }
        } else {
            conversation = await Conversation.create({
                userId: req.user._id,
                title: title || 'New Chat'
            });
        }

        // 2. Save User Message
        const userMessage = await Message.create({
            conversationId: conversation._id,
            role: 'user',
            content: prompt
        });

        // 3. Generate Mock AI Response
        // In a real app, this would call OpenAI/Anthropic API
        const data = await ideaPipeline(prompt); // Using the ideaPipeline for demonstration

        const aiResponseContent = data.finalOutput

        // // Simulate delay for realism
        // await new Promise(resolve => setTimeout(resolve, 500));

        // 4. Save AI Message
        const aiMessage = await Message.create({
            conversationId: conversation._id,
            role: 'assistant',
            content: aiResponseContent
        });

        // 5. Return both
        res.status(200).json({
            status: 'success',
            data: {
                userMessage,
                aiMessage
            }
        });
    } catch (error) {
        console.error("Error in sendMessage:", error);
        res.status(500).json({
            status: 'error',
            message: 'An error occurred while processing your request.'
        });
    }
});

// @desc    Get user chat history (list of conversations)
// @route   GET /api/chat/history
// @access  Private
const getHistory = asyncHandler(async (req, res) => {
    const conversations = await Conversation.find({ userId: req.user._id })
        .sort({ updatedAt: -1 });

    res.status(200).json({
        status: 'success',
        results: conversations.length,
        data: {
            conversations
        }
    });
});

// @desc    Get messages for a specific conversation
// @route   GET /api/chat/:id
// @access  Private
const getMessages = asyncHandler(async (req, res) => {
    const conversation = await Conversation.findOne({
        _id: req.params.id,
        userId: req.user._id
    });

    if (!conversation) {
        res.status(404);
        throw new Error('Conversation not found');
    }

    const messages = await Message.find({ conversationId: req.params.id })
        .sort({ createdAt: 1 });

    res.status(200).json({
        status: 'success',
        results: messages.length,
        data: {
            messages
        }
    });
});

export {
    // createChat,
    sendMessage,
    getHistory,
    getMessages
};
