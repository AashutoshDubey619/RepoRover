const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/reporover_db');
        console.log(` MongoDB Connected: ${conn.connection.host}`);
    } catch (err) {
        console.error(` MongoDB Connection Failed: ${err.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;