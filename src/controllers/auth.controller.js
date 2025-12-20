import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import asyncHandler from '../utils/asyncHandler.js';

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
            token: token // Sending token in response for flexibility
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
        }
    });
};

export { register, login, logout, verifyToken };
