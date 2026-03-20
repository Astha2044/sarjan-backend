import express from 'express';
import rateLimit from 'express-rate-limit';
import { register, login, logout, verifyToken, forgotPassword, resetPassword } from '../controllers/auth.controller.js';
import jwt from 'jsonwebtoken';
import { registerValidation, loginValidation } from '../middlewares/validation.middleware.js';
import { protect } from '../middlewares/auth.middleware.js';
import User from '../models/User.js';
import { verifyGoogleToken } from '../config/google-auth.config.js';

const router = express.Router();


// Rate Limiter
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    message: { status: 'error', message: 'Too many login attempts, please try again after 15 minutes' },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication endpoints
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Validation error or user exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/register', registerValidation, register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/login', loginLimiter, loginValidation, login);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Logged out successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Logged out successfully
 */
router.post('/logout', logout);



/**
 * @swagger
 * /api/auth/verify:
 *   get:
 *     summary: Verify current user token
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Token is valid
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         description: Not authorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/verify', protect, verifyToken);

import passport from '../config/passport.js';

router.post('/forgot-password', forgotPassword);
router.put('/reset-password/:resettoken', resetPassword);

/* ================= GOOGLE LOGIN (SERVICE BASED) ================= */
router.post('/google/verify', async (req, res) => {
    try {
        const { idToken } = req.body;

        if (!idToken) {
            return res.status(400).json({
                status: 'error',
                message: 'ID Token is required'
            });
        }

        // Verify token from Google
        const payload = await verifyGoogleToken(idToken);

        if (!payload) {
            return res.status(401).json({
                status: 'error',
                message: 'Invalid Google token'
            });
        }

        const { sub: googleId, email, name, picture } = payload;

        // Check if user exists
        let user = await User.findOne({
            $or: [{ googleId }, { email }]
        });

        if (user) {
            // If user exists but no googleId → attach it
            if (!user.googleId) {
                user.googleId = googleId;
            }

            // Update profile picture
            user.profilePicture = picture || user.profilePicture;

            await user.save();
        } else {
            // Create new user
            user = await User.create({
                name,
                email,
                googleId,
                profilePicture: picture || '',
                password: Math.random().toString(36).slice(-10), // dummy
                isGoogleUser: true
            });
        }

        // Generate JWT
        const token = jwt.sign(
            { id: user._id },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: '7d' } // safer than 100 years 😄
        );

        // Set cookie
        const isProd = process.env.NODE_ENV === 'production';

        res.cookie('token', token, {
            httpOnly: true,
            secure: isProd,
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        // Response
        res.status(200).json({
            status: 'success',
            message: 'Google login successful',
            data: {
                _id: user._id,
                name: user.name,
                email: user.email,
                token,
                plan: user.plan,
                messageCount: user.messageCount,
                profilePicture: user.profilePicture
            }
        });

    } catch (error) {
        console.error('Google Login Error:', error);

        res.status(500).json({
            status: 'error',
            message: 'Internal server error during Google login'
        });
    }
});


export default router;
