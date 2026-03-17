import express from "express";
import User from "../models/User.js";
import { protect } from "../middlewares/auth.middleware.js";
import PDFDocument from 'pdfkit';
import sendEmail from "../utils/email.service.js";
import { getProUpgradeEmailHtml } from "../utils/emailTemplates.js";
import { Buffer } from 'buffer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Helper to generate Invoice PDF
const generateInvoicePDF = (user, doc) => {
  const logoPath = path.join(__dirname, '..', 'assets', 'logo.png');
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const monthYear = now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const invoiceNo = `INV-${Date.now().toString().slice(-6)}`;

  // Header Section - Clean & Minimalist (Text-based Logo)
  const headerY = 40;
  const logoText1 = 'SARJAN ';
  const logoText2 = ' Ai'; // Reduced space for normal appearance
  
  doc.fontSize(22).font('Helvetica-Bold');
  const totalLogoWidth = doc.widthOfString(logoText1) + doc.widthOfString(logoText2);
  const logoX = (doc.page.width - totalLogoWidth) / 2;

  // Render "SARJAN" in Black
  doc.fillColor('#1a1a1a')
     .text(logoText1, logoX, headerY, { continued: true });
  
  // Render "Ai" in Teal
  doc.fillColor('#00d1b2')
     .text(logoText2);

  // Subtitle / Info - Perfectly centered across the page
  doc.fontSize(9)
     .font('Helvetica')
     .fillColor('#666')
     .text('Intelligent Design Systems', 0, doc.y + 5, { align: 'center', width: doc.page.width });

  doc.moveDown(2.5);

  // Bill To and Invoice on Same Line
  const startY = doc.y;
  doc.fillColor('#1a1a1a').font('Helvetica-Bold').fontSize(11);
  doc.text('BILL TO', 50, startY);
  doc.text('INVOICE', 0, startY, { align: 'right' });

  doc.font('Helvetica').fontSize(10).fillColor('#333');
  doc.text(user.name || 'Valued Customer', 50, startY + 14);
  doc.text(user.email, 50, startY + 26);

  doc.text(`Invoice No: ${invoiceNo}`, 0, startY + 14, { align: 'right' });
  doc.text(`Date: ${dateStr}`, 0, startY + 26, { align: 'right' });

  doc.moveDown(2);

  // Table Structure
  const tableTop = doc.y + 10;
  doc.rect(50, tableTop, 500, 18).fill('#333');

  doc.fillColor('#fff').font('Helvetica-Bold').fontSize(9);
  doc.text('DESCRIPTION', 60, tableTop + 4);
  doc.text('QTY', 350, tableTop + 4);
  doc.text('PRICE', 420, tableTop + 4);
  doc.text('TOTAL', 500, tableTop + 4);

  // Table Content
  doc.fillColor('#333').font('Helvetica').fontSize(9);
  const itemY = tableTop + 25;
  doc.text(`Sarjan AI Pro Subscription - ${monthYear}`, 60, itemY);
  doc.text('1', 350, itemY);
  doc.text('Rs. 0.00', 420, itemY);
  doc.text('Rs. 0.00', 500, itemY);

  doc.moveTo(50, itemY + 18).lineTo(550, itemY + 18).stroke('#eee');

  // Totals Section
  const totalY = itemY + 35;
  doc.font('Helvetica-Bold').text('SUBTOTAL', 380, totalY);
  doc.font('Helvetica').text('Rs. 0.00', 500, totalY);

  doc.font('Helvetica-Bold').text('GST (0%)', 380, totalY + 13);
  doc.font('Helvetica').text('Rs. 0.00', 500, totalY + 13);

  doc.rect(370, totalY + 28, 180, 22).fill('#f9f9f9');
  doc.fillColor('#1a1a1a').font('Helvetica-Bold').fontSize(11).text('TOTAL', 380, totalY + 34);
  doc.text('Rs. 0.00', 500, totalY + 34);

  // Footer - Centered Layout
  const footerY = 700;
  doc.moveTo(50, footerY).lineTo(550, footerY).stroke('#eee');

  // Website Link - Centered
  doc.fontSize(9).fillColor('#4f46e5').font('Helvetica').text(
    'www.sarjanai.com',
    0, footerY + 12, { align: 'center', link: 'https://sarjanai.com' }
  );

  // Legal Links - Centered below
  doc.fontSize(8.5).fillColor('#777').text(
    'Terms & Conditions',
    0, footerY + 26, { align: 'center', continued: true, link: 'https://sarjanai.com/terms' }
  ).text('  |  ', { continued: true, link: null })
   .text('Privacy Policy', { link: 'https://sarjanai.com/privacy' });
};

// Change plan (free or pro)
router.post("/change", protect, async (req, res) => {
  try {
    const { plan } = req.body;

    // Validate plan
    if (!["free", "pro"].includes(plan)) {
      return res.status(400).json({ error: "Invalid plan selected" });
    }

    const currentUser = await User.findById(req.user.id);
    if (currentUser.plan === "pro" && plan === "free") {
      return res.status(403).json({ error: "Downgrading to free is not allowed for Pro users." });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { plan: plan },
      { new: true }
    );

    // If upgraded to Pro, send automated email with invoice
    if (plan === "pro") {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', async () => {
          const pdfData = Buffer.concat(buffers);

          await sendEmail({
            email: user.email,
            subject: 'Your Sarjan AI Pro Invoice',
            html: getProUpgradeEmailHtml(user.name),
            attachments: [
              {
                filename: `SarjanAI_Invoice_${user._id}.pdf`,
                content: pdfData,
                contentType: 'application/pdf'
              }
            ]
          });
          console.log(` Invoice emailed to ${user.email}`);
        });

        generateInvoicePDF(user, doc);
        doc.end();
      } catch (emailErr) {
        console.error(" Failed to send invoice email:", emailErr.message);
        // Don't fail the request if email fails
      }
    }

    res.json({
      success: true,
      plan: user.plan,
      message: `Plan changed to ${plan.charAt(0).toUpperCase() + plan.slice(1)} successfully! ${plan === "pro" ? "Invoice sent to your email." : ""}`
    });
  } catch (err) {
    console.error("Plan change error:", err);
    res.status(500).json({ error: "Plan change failed" });
  }
});

// Get current plan
router.get("/status", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({
      plan: user.plan,
      messageCount: user.messageCount
    });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Download Invoice (Pro only)
router.get("/invoice", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (user.plan !== "pro") {
      return res.status(403).json({ error: "Invoices are only available for Pro users." });
    }

    // Create a PDF document
    const doc = new PDFDocument({ margin: 50 });

    // Set response headers to download the file
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=SarjanAI_Invoice_${user._id}.pdf`);

    // Stream PDF to response
    doc.pipe(res);

    generateInvoicePDF(user, doc);

    // End the PDF stream
    doc.end();

  } catch (err) {
    console.error("Invoice generation failed:", err);
    res.status(500).json({ error: "Failed to generate invoice" });
  }
});

export default router;