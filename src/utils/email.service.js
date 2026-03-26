import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const sendEmail = async (options) => {

    // 1) Create a transporter
    const smtpHost = (process.env.SMTP_HOST || '').trim();
    const smtpPort = (process.env.SMTP_PORT || '').trim();
    const smtpUser = (process.env.SMTP_USER || '').trim();
    const smtpPass = (process.env.SMTP_PASSWORD || '').trim();

    console.log(`[sendEmail] Final SMTP Config - Host: "${smtpHost}", Port: "${smtpPort}", User: "${smtpUser}"`);

    const transportConfig = {
        host: smtpHost,
        port: parseInt(smtpPort),
        secure: smtpPort === '465', // true for 465, false for 587
        auth: {
            user: smtpUser,
            pass: smtpPass,
        },
        connectionTimeout: 20000, 
        greetingTimeout: 20000,   
        socketTimeout: 30000,     
    };

    const transporter = nodemailer.createTransport(transportConfig);

    // 2) Define the email options
    const mailOptions = {
        from: `Sarjan AI <${process.env.SMTP_USER}>`, // Use SMTP_USER for from address
        to: options.email,
        subject: options.subject,
        text: options.message,
        html: options.html,
        attachments: options.attachments || []
    };

    // 3) Actually send the email
    console.log(`[sendEmail] Attempting to send email to: ${options.email}`);
    try {
        // Verify connection before sending
        await transporter.verify();
        console.log(`[sendEmail] Connection verified successfully`);

        const info = await transporter.sendMail(mailOptions);
        console.log(`[sendEmail] SUCCESS! Message sent: ${info.messageId}`);
        return info;
    } catch (error) {
        console.error(`[sendEmail] ERROR DETAILS:`, {
            message: error.message,
            code: error.code,
            command: error.command,
            response: error.response,
            stack: error.stack
        });
        throw error;
    }
};

export default sendEmail;
