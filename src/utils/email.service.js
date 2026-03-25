import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const sendEmail = async (options) => {

    // 1) Create a transporter
    // Using 'service: gmail' is the most reliable way for Gmail accounts on Render
    const transporter = nodemailer.createTransport({

        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: false, // IMPORTANT
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD,
        },
        connectionTimeout: 10000, // increase timeout

    });

    // 2) Define the email options
    const mailOptions = {
        from: 'Sarjan AI <noreply@sarjan.com>',
        to: options.email,
        subject: options.subject,
        text: options.message,
        html: options.html,
        attachments: options.attachments || []
    };

    // 3) Actually send the email
    console.log(`[sendEmail] Attempting to send email to: ${options.email}`);
    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`[sendEmail] SUCCESS! Message sent: ${info.messageId}`);
    } catch (error) {
        console.error(`[sendEmail] Error in nodemailer:`, error);
        throw error;
    }
};

export default sendEmail;
