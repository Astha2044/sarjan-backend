import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from the root
dotenv.config({ path: path.join(__dirname, '.env') });

console.log('--- SMTP Diagnostic Tool ---');
console.log(`User: ${process.env.SMTP_USER}`);
console.log(`Host: ${process.env.SMTP_HOST}`);
console.log(`Port: ${process.env.SMTP_PORT}`);
console.log('---------------------------');

async function testEmail() {
    const transportConfig = {
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT),
        secure: process.env.SMTP_PORT == 465,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD,
        },
        connectionTimeout: 10000,
    };

    if (process.env.SMTP_HOST && process.env.SMTP_HOST.includes('gmail')) {
        console.log('Detected Gmail, using service: gmail');
        transportConfig.service = 'gmail';
        delete transportConfig.host;
        delete transportConfig.port;
        delete transportConfig.secure;
    }

    const transporter = nodemailer.createTransport(transportConfig);

    try {
        console.log('Step 1: Verifying SMTP connection...');
        await transporter.verify();
        console.log('SUCCESS: SMTP connection verified!');

        console.log('Step 2: Sending test email...');
        const info = await transporter.sendMail({
            from: `Sarjan AI Diagnostic <${process.env.SMTP_USER}>`,
            to: process.env.SMTP_USER,
            subject: 'Sarjan AI - SMTP Diagnostic Test',
            text: 'This is a test email sent by the diagnostic tool. If you received this, your SMTP configuration is correct!',
            html: '<b>This is a test email sent by the diagnostic tool.</b><p>If you received this, your SMTP configuration is correct!</p>'
        });
        console.log(`SUCCESS: Email sent! Message ID: ${info.messageId}`);
        console.log('Done.');
    } catch (error) {
        console.error('FAILED: SMTP Diagnostic Error');
        console.error({
            message: error.message,
            code: error.code,
            command: error.command,
            response: error.response,
            stack: error.stack
        });
    }
}

testEmail();
