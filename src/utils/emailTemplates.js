
const getGenericEmailHtml = (title, content) => {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
        
        body {
            margin: 0;
            padding: 0;
            font-family: 'Inter', Arial, sans-serif;
            background-color: #f4f4f5;
            -webkit-font-smoothing: antialiased;
        }
        
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
            margin-top: 40px;
            margin-bottom: 40px;
        }
        
        .header {
            background-color: #0f172a; /* Dark background */
            padding: 40px 0;
            text-align: center;
        }
        
        .logo {
            font-size: 24px;
            font-weight: 700;
            color: #3b82f6; /* Blue accent */
            text-decoration: none;
            letter-spacing: -0.5px;
        }

        .hero-section {
            background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%);
            padding: 40px 30px;
            text-align: center;
            color: #ffffff;
        }
        
        .hero-title {
            font-size: 24px;
            font-weight: 700;
            margin: 0 0 10px 0;
            color: #ffffff;
        }

        .hero-subtitle {
            font-size: 16px;
            color: #94a3b8;
            margin: 0;
        }
        
        .content {
            padding: 40px 30px;
            color: #334155;
            line-height: 1.6;
            font-size: 16px;
        }
        
        .button-container {
            text-align: center;
            margin: 30px 0;
        }
        
        .button {
            display: inline-block;
            background-color: #3b82f6; /* Blue button */
            color: #ffffff;
            text-decoration: none;
            padding: 14px 32px;
            border-radius: 6px;
            font-weight: 600;
            transition: background-color 0.3s ease;
        }
        
        .button:hover {
            background-color: #2563eb;
        }
        
        .footer {
            background-color: #f8fafc;
            padding: 30px;
            text-align: center;
            font-size: 14px;
            color: #64748b;
            border-top: 1px solid #e2e8f0;
        }
        
        .footer-links {
            margin-bottom: 20px;
        }
        
        .footer-link {
            color: #64748b;
            text-decoration: none;
            margin: 0 10px;
        }
        
        .footer-link:hover {
            color: #3b82f6;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header with Logo -->
        <div class="header">
            <a href="#" class="logo">SARJAN</a>
        </div>

        <!-- Main Content Area -->
        <div class="content">
            ${content}
        </div>

        <!-- Footer -->
        <div class="footer">
            <div class="footer-links">
                <a href="#" class="footer-link">Privacy Policy</a>
                <a href="#" class="footer-link">Terms of Service</a>
                <a href="#" class="footer-link">Help Center</a>
            </div>
            <p>&copy; ${new Date().getFullYear()} Sarjan. All rights reserved.</p>
            <p>You received this email because you signed up for Sarjan.</p>
        </div>
    </div>
</body>
</html>
    `;
};

export const getWelcomeEmailHtml = (name) => {
    const content = `
        <h1 style="color: #0f172a; margin-top: 0;">Welcome to Sarjan!</h1>
        <p>Hi <strong>${name}</strong>,</p>
        <p>Detailed simplicity meets powerful functionality. We are thrilled to welcome you to the Sarjan community.</p>
        <p>Sarjan is designed to help you build better, faster, and more creatively. We can't wait to see what you'll create.</p>
        
        <div class="button-container">
            <a href="#" class="button">Get Started</a>
        </div>
        
        <p>If you have any questions, feel free to reply to this email or contact our support team.</p>
        <p>Best regards,<br>The Sarjan Team</p>
    `;
    return getGenericEmailHtml('Welcome to Sarjan', content);
};
