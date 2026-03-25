import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const sendEmail = async (options) => {

    // 1) Create a transporter
    // Using 'service: gmail' is the most reliable way for Gmail accounts on Render
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD,
        }
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
    await transporter.sendMail(mailOptions);
};

export default sendEmail;
