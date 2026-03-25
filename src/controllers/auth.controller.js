import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import asyncHandler from '../utils/asyncHandler.js';
import sendEmail from '../utils/email.service.js';
import { getWelcomeEmailHtml } from '../utils/emailTemplates.js';


// Generate Token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '36500d', // ~100 years (Never expire)
    });
};

const sendTokenResponse = (user, statusCode, res) => {
    const token = generateToken(user._id);

    // Set Cookie
    const isProd = process.env.NODE_ENV === 'production';

    res.cookie('token', token, {
        httpOnly: true,
        secure: isProd,
        sameSite: 'strict',
        maxAge: 36500 * 24 * 60 * 60 * 1000, // 100 years
    });

    res.status(statusCode).json({
        status: 'success',
        statusCode,
        message: statusCode === 201 ? 'Registered successfully' : 'Logged in successfully',
        data: {
            _id: user._id,
            name: user.name,
            email: user.email,
            token: token, // Sending token in response for flexibility
            plan: user.plan,
            messageCount: user.messageCount
        }
    });
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const register = asyncHandler(async (req, res) => {
    const { name, email, password } = req.body;

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
        res.status(400);
        throw new Error('User already exists');
    }

    // Hash password (12 rounds)
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = await User.create({
        name,
        email,
        password: hashedPassword,
    });

    if (user) {
        // Send Welcome Email
        try {
            await sendEmail({
                email: user.email,
                subject: 'Welcome to Sarjan!',
                message: `Hi ${user.name},\n\nWelcome to Sarjan! We are excited to have you on board.\n\nBest,\nThe Sarjan Team`,
                html: getWelcomeEmailHtml(user.name)
            });
        } catch (error) {
            console.error('Error sending welcome email:', error);
            // We don't want to fail registration just because email failed
        }

        sendTokenResponse(user, 201, res);
    } else {
        res.status(400);
        throw new Error('Invalid user data');
    }
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    // Check for user
    const user = await User.findOne({ email }).select('+password');

    if (user && (await bcrypt.compare(password, user.password))) {
        sendTokenResponse(user, 200, res);
    } else {
        res.status(401);
        throw new Error('Invalid email or password');
    }
});

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Public
const logout = (req, res) => {
    res.cookie('token', '', {
        httpOnly: true,
        expires: new Date(0),
    });
    res.status(200).json({ status: 'success', statusCode: 200, message: 'Logged out successfully' });
};

// @desc    Verify user token
// @route   GET /api/auth/verify
// @access  Private
const verifyToken = (req, res) => {
    res.status(200).json({
        status: 'success',
        statusCode: 200,
        message: 'Token is valid',
        data: {
            _id: req.user._id,
            name: req.user.name,
            email: req.user.email,
            plan: req.user.plan,
            messageCount: req.user.messageCount
        }
    });
};

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;
    console.log(`[ForgotPassword] Request at ${new Date().toISOString()}`);
    console.log(`[ForgotPassword] Body:`, req.body);
    console.log(`[ForgotPassword] Headers:`, req.headers);
    console.log(`[ForgotPassword] email: ${email}`);

    const user = await User.findOne({ email });

    if (!user) {
        console.warn(`ForgotPassword User not found for email: ${email}`);
        res.status(404);
        throw new Error('There is no user with that email');
    }

    // Get reset token
    const resetToken = crypto.randomBytes(20).toString('hex');

    // Hash token and set to resetPasswordToken field
    user.resetPasswordToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

    // Set expire (10 minutes)
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

    await user.save({ validateBeforeSave: false });

    // Create reset url
    const frontendUrl = process.env.FRONTEND_URL;
    const resetUrl = `${frontendUrl}/auth/reset-password/${resetToken}`;

    console.log(`[ForgotPassword] FRONTEND_URL: ${frontendUrl}`);
    console.log(`[ForgotPassword] Generated Reset URL: ${resetUrl}`);
    console.log(`[ForgotPassword] Request Origin: ${req.get('origin')}`);
    console.log(`[ForgotPassword] Request Referer: ${req.get('referer')}`);

    const message = `You are receiving this email because you (or someone else) has requested the reset of a password. Please go to this link to reset your password: \n\n ${resetUrl}`;

    try {
        await sendEmail({
            email: user.email,
            subject: 'Password reset token',
            message,
            html: `
                <h1>You have requested a password reset</h1>
                <p>Please go to this link to reset your password:</p>
                <a href="${resetUrl}" clicktracking=off>${resetUrl}</a>
            `
        });

        res.status(200).json({
            status: 'success',
            message: 'Email sent',
        });
    } catch (err) {
        console.error('[ForgotPassword] EMAIL ERROR:', err);
        console.error('[ForgotPassword] SMTP CONFIG:', {
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            user: process.env.SMTP_USER
        });

        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;

        await user.save({ validateBeforeSave: false });

        res.status(500);
        throw new Error(`Email could not be sent: ${err.message}`);
    }
});

// @desc    Reset password
// @route   PUT /api/auth/reset-password/:resettoken
// @access  Public
const resetPassword = asyncHandler(async (req, res) => {
    // Get hashed token
    const resetPasswordToken = crypto
        .createHash('sha256')
        .update(req.params.resettoken)
        .digest('hex');

    const user = await User.findOne({
        resetPasswordToken,
        resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
        res.status(400);
        throw new Error('Invalid token');
    }

    // Set new password
    const salt = await bcrypt.genSalt(12);
    user.password = await bcrypt.hash(req.body.password, salt);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    sendTokenResponse(user, 200, res);
});

export { register, login, logout, verifyToken, forgotPassword, resetPassword };
