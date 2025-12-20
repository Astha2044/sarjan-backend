import express from 'express';
import { sendMessage, getHistory, getMessages } from '../controllers/chat.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { chatValidation } from '../middlewares/validation.middleware.js';

const router = express.Router();

// /**
//  * @swagger
//  * tags:
//  *   name: Chat
//  *   description: AI Chat management
//  */

// /**
//  * @swagger
//  * /api/chat/new:
//  *   post:
//  *     summary: Create a new conversation
//  *     tags: [Chat]
//  *     security:
//  *       - bearerAuth: []
//  *     requestBody:
//  *       required: false
//  *       content:
//  *         application/json:
//  *           schema:
//  *             type: object
//  *             properties:
//  *               title:
//  *                 type: string
//  *     responses:
//  *       201:
//  *         description: Conversation created
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *               properties:
//  *                 status: { type: string, example: success }
//  *                 data:
//  *                   type: object
//  *                   properties:
//  *                     conversation: { $ref: '#/components/schemas/Conversation' }
//  */
// router.post('/new', protect, createChat);

/**
 * @swagger
 * /api/chat/message:
 *   post:
 *     summary: Send a message and get an AI response
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - conversationId
 *               - prompt
 *               - prompt
 *             properties:
 *               conversationId:
 *                 type: string
 *               title:
 *                 type: string
 *               prompt:
 *                 type: string
 *     responses:
 *       200:
 *         description: Message sent and response received
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ChatResponse'
 */
router.post('/message', protect, chatValidation, sendMessage);

/**
 * @swagger
 * /api/chat/history:
 *   get:
 *     summary: Get all conversations for the user
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of conversations
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string }
 *                 results: { type: integer }
 *                 data:
 *                   type: object
 *                   properties:
 *                     conversations: 
 *                       type: array
 *                       items: { $ref: '#/components/schemas/Conversation' }
 */
router.get('/history', protect, getHistory);

/**
 * @swagger
 * /api/chat/{id}:
 *   get:
 *     summary: Get messages for a specific conversation
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of messages
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string }
 *                 results: { type: integer }
 *                 data:
 *                   type: object
 *                   properties:
 *                     messages:
 *                       type: array
 *                       items: { $ref: '#/components/schemas/Message' }
 */
router.get('/:id', protect, getMessages);

export default router;
