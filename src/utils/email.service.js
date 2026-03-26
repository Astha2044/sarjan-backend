import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import https from 'https';

dotenv.config();

const sendEmail = async (options) => {
    const resendApiKey = process.env.RESEND_API_KEY || process.env.SMTP_PASSWORD;
    const fromEmail = process.env.SMTP_USER || 'noreply@sarjan.com';

    // If we have a Resend API Key, use the HTTP API (Bypasses Port Blocking)
    if (resendApiKey && (resendApiKey.startsWith('re_') || process.env.SMTP_HOST?.includes('resend'))) {
        console.log(`[sendEmail] Using Resend HTTP API (Port 443) to bypass SMTP blocks`);
        
        const data = JSON.stringify({
            from: `Sarjan AI <${fromEmail}>`,
            to: [options.email],
            subject: options.subject,
            html: options.html || options.message,
            text: options.message
        });

        const apiOptions = {
            hostname: 'api.resend.com',
            port: 443,
            path: '/emails',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${resendApiKey.trim()}`,
                'Content-Length': data.length
            }
        };

        return new Promise((resolve, reject) => {
            const req = https.request(apiOptions, (res) => {
                let responseBody = '';
                res.on('data', (chunk) => responseBody += chunk);
                res.on('end', () => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        console.log(`[sendEmail] SUCCESS via Resend API: ${responseBody}`);
                        resolve(JSON.parse(responseBody));
                    } else {
                        console.error(`[sendEmail] Resend API Error (${res.statusCode}):`, responseBody);
                        reject(new Error(`Resend API Error: ${responseBody}`));
                    }
                });
            });

            req.on('error', (error) => {
                console.error(`[sendEmail] HTTP Request Error:`, error);
                reject(error);
            });

            req.write(data);
            req.end();
        });
    }

    // FALLBACK to SMTP (for local or non-blocked environments)
    console.log(`[sendEmail] Falling back to SMTP...`);
    const transporter = nodemailer.createTransport({
        host: (process.env.SMTP_HOST || '').trim(),
        port: parseInt(process.env.SMTP_PORT || '465'),
        secure: process.env.SMTP_PORT === '465',
        auth: {
            user: (process.env.SMTP_USER || '').trim(),
            pass: (process.env.SMTP_PASSWORD || '').trim(),
        },
        connectionTimeout: 20000
    });

    try {
        const info = await transporter.sendMail({
            from: `Sarjan AI <${fromEmail}>`,
            to: options.email,
            subject: options.subject,
            text: options.message,
            html: options.html
        });
        console.log(`[sendEmail] SUCCESS via SMTP: ${info.messageId}`);
        return info;
    } catch (error) {
        console.error(`[sendEmail] SMTP Error:`, error.message);
        throw error;
    }
};

export default sendEmail;
