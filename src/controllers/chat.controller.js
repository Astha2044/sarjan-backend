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
    try {


        const { title, conversationId, prompt } = req.body;
        let conversation;

        // console.log('DEBUG: req.files:', req.files);
        console.log('DEBUG: req.body:', req.body);

        // Handle Attachments
        const attachments = req.files ? req.files.map(file => ({
            url: file.path, // In real app, this would be an S3 URL
            type: file.mimetype.startsWith('image/') ? 'image' : 'file'
        })) : [];

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
            content: prompt || (attachments.length ? 'Sent an attachment' : ''),
            attachments
        });

        // 3. Trigger Background Processing
        const io = getIO();
        processAIResponse(conversation._id, prompt, req.user._id, io, req.files);

        // 4. Return Immediate Response
        res.status(202).json({
            status: 'accepted',
            message: 'AI processing started',
            data: {
                conversationId: conversation._id,
                userMessage
            }
        });
    } catch (error) {

        console.error('Error in sendMessage controller:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to send message'
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

// @desc    Delete a conversation and its messages
// @route   DELETE /api/chat/:id
// @access  Private
const deleteChat = asyncHandler(async (req, res) => {
    const conversation = await Conversation.findOne({
        _id: req.params.id,
        userId: req.user._id
    });

    if (!conversation) {
        res.status(404);
        throw new Error('Conversation not found');
    }

    // Delete messages associated with the conversation
    await Message.deleteMany({ conversationId: req.params.id });

    // Delete the conversation itself
    await conversation.deleteOne();

    res.status(200).json({
        status: 'success',
        message: 'Conversation deleted successfully'
    });
});

// @desc    Edit a user message, truncate history, and regenerate AI response
// @route   PUT /api/chat/message/:id
// @access  Private
const editMessage = asyncHandler(async (req, res) => {
    const messageId = req.params.id;
    const { prompt, conversationId } = req.body;

    if (!prompt || !conversationId) {
        res.status(400);
        throw new Error('Prompt and conversationId are required');
    }

    const conversation = await Conversation.findOne({
        _id: conversationId,
        userId: req.user._id
    });

    if (!conversation) {
        res.status(404);
        throw new Error('Conversation not found');
    }

    const targetMessage = await Message.findOne({
        _id: messageId,
        conversationId: conversation._id,
        role: 'user'
    });

    if (!targetMessage) {
        res.status(404);
        throw new Error('Message not found or not a user message');
    }

    targetMessage.content = prompt;
    await targetMessage.save();

    await Message.deleteMany({
        conversationId: conversation._id,
        createdAt: { $gt: targetMessage.createdAt }
    });

    const io = getIO();
    processAIResponse(conversation._id, prompt, req.user._id, io, []);

    res.status(202).json({
        status: 'accepted',
        message: 'Message edited and AI processing restarted',
        data: {
            conversationId: conversation._id,
            userMessage: targetMessage
        }
    });
});

export {
    // createChat,
    sendMessage,
    getHistory,
    getMessages,
    deleteChat,
    editMessage
};
