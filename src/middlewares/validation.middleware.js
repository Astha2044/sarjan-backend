import { body, validationResult } from 'express-validator';

const validateRequest = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorData = {};
        errors.array().forEach(err => {
            // Only capture the first error for each field
            if (!errorData[err.path]) {
                errorData[err.path] = err.msg;
            }
        });

        return res.status(400).json({
            status: 'error',
            statusCode: 400,
            message: errors.array()[0].msg,
            data: errorData
        });
    }
    next();
};

const registerValidation = [
    body('name')
        .trim()
        .escape()
        .notEmpty()
        .withMessage('Name is required'),

    body('email')
        .trim()
        .normalizeEmail()
        .isEmail()
        .withMessage('Please include a valid email'),

    body('password')
        .trim()
        .isLength({ min: 10 })
        .withMessage('Password must be at least 10 characters long')
        .matches(/[A-Z]/)
        .withMessage('Password must contain at least one uppercase letter')
        .matches(/[a-z]/)
        .withMessage('Password must contain at least one lowercase letter')
        .matches(/[0-9]/)
        .withMessage('Password must contain at least one number')
        .matches(/[^A-Za-z0-9]/)
        .withMessage('Password must contain at least one special character'),

    validateRequest
];

const loginValidation = [
    body('email')
        .trim()
        .normalizeEmail()
        .isEmail()
        .withMessage('Please include a valid email'),

    body('password')
        .notEmpty()
        .withMessage('Password is required'),

    validateRequest
];


const chatValidation = [
    body('conversationId')
        .optional()
        .isMongoId()
        .withMessage('Invalid conversation ID'),

    body('prompt')
        .trim()
        .optional(),
    // .notEmpty() // Allow empty if file is attached (handled in controller)

    validateRequest
];

export { registerValidation, loginValidation, chatValidation };
