import dotenv from 'dotenv';
import connectDB from './config/db.js';
import app from './src/app.js';

dotenv.config();

connectDB();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on http://localhost:${PORT}`);
});

