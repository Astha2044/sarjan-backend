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
        url: { type: String },
        // ✅ CORRECT WAY: define 'type' as an object with a 'type' property
        type: {
            type: String,
            default: 'image'
        }
    }]
}, {
    timestamps: true
});

const Message = mongoose.model('Message', messageSchema);

export default Message;