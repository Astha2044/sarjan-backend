import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import asyncHandler from '../utils/asyncHandler.js';



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
import { processAIResponse } from '../utils/background.processor.js';
import { getIO } from '../config/socket.js';

// @desc    Send a message (async AI processing)
// @route   POST /api/chat/message
// @access  Private
const sendMessage = asyncHandler(async (req, res) => {
    const { title, conversationId, prompt } = req.body;
    let conversation;

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

    // 3. Trigger Background Processing
    const io = getIO();
    processAIResponse(conversation._id, prompt, req.user._id, io);

    // 4. Return Immediate Response
    res.status(202).json({
        status: 'accepted',
        message: 'AI processing started',
        data: {
            conversationId: conversation._id,
            userMessage
        }
    });
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
