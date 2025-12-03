const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId, // User ki ID
        ref: 'User',
        required: true,
    },
    repoUrl: {
        type: String,
        required: true,
    },
    messages: [ // Array of messages
        {
            role: { type: String, enum: ['user', 'bot'], required: true },
            text: { type: String, required: true },
            timestamp: { type: Date, default: Date.now },
        },
    ],
    lastAccessed: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ChatHistory', chatSchema);