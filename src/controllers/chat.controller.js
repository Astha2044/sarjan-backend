import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import asyncHandler from '../utils/asyncHandler.js';

// @desc    Create a new chat
// @route   POST /api/chat/new
// @access  Private
const createChat = asyncHandler(async (req, res) => {
    const { title } = req.body;

    const conversation = await Conversation.create({
        userId: req.user._id,
        title: title || 'New Chat'
    });

    res.status(201).json({
        status: 'success',
        data: {
            conversation
        }
    });
});

// @desc    Send a message (and get mock AI response)
// @route   POST /api/chat/message
// @access  Private
const sendMessage = asyncHandler(async (req, res) => {
    const { conversationId, prompt } = req.body;

    // 1. Verify conversation belongs to user
    const conversation = await Conversation.findOne({
        _id: conversationId,
        userId: req.user._id
    });

    if (!conversation) {
        res.status(404);
        throw new Error('Conversation not found');
    }

    // 2. Save User Message
    const userMessage = await Message.create({
        conversationId,
        role: 'user',
        content: prompt
    });

    // 3. Generate Mock AI Response
    // In a real app, this would call OpenAI/Anthropic API
    const aiResponseContent = `This is a mock AI response to: "${prompt}". I am a simulated assistant.`;

    // Simulate delay for realism
    await new Promise(resolve => setTimeout(resolve, 500));

    // 4. Save AI Message
    const aiMessage = await Message.create({
        conversationId,
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
    createChat,
    sendMessage,
    getHistory,
    getMessages
};
