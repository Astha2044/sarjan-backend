import mongoose from 'mongoose';

const messageSchema = mongoose.Schema({
    conversationId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Conversation',
        index: true
    },
    role: {
        type: String,
        enum: ['user', 'assistant'],
        required: true
    },
    content: {
        type: String,
        required: true
    },
    attachments: [{
        url: String,
        type: String // 'image' or 'file'
    }]
}, {
    timestamps: true
});

const Message = mongoose.model('Message', messageSchema);

export default Message;
