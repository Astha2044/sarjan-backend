import mongoose from 'mongoose';

const userSchema = mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Please add a name'],
        },
        email: {
            type: String,
            required: [true, 'Please add an email'],
            unique: true,
            lowercase: true,
            trim: true,
            index: true,
        },
        password: {
            type: String,
            required: [
                function () {
                    return !this.googleId;
                },
                'Please add a password',
            ],
            select: false,
        },
        plan: {
            type: String,
            enum: ['free', 'pro'],
            default: 'free',
        },
        messageCount: {
            type: Number,
            default: 0,
        },
        resetPasswordToken: String,
        resetPasswordExpire: Date,
        googleId: String,
        profilePicture: String,
    },
    {
        timestamps: true,
        toJSON: {
            transform: function (doc, ret) {
                delete ret.password;
                return ret;
            },
        },
    },
);

const User = mongoose.model('User', userSchema);

export default User;
