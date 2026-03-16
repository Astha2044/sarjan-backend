import express from "express";
import User from "../models/User.js";
import { protect } from "../middlewares/auth.middleware.js";
import PDFDocument from 'pdfkit';
import sendEmail from "../utils/email.service.js";
import { getProUpgradeEmailHtml } from "../utils/emailTemplates.js";
import { Buffer } from 'buffer';

const router = express.Router();

// Helper to generate Invoice PDF
const generateInvoicePDF = (user, doc) => {
  // Header - Premium Look
  doc.fillColor('#0f172a').fontSize(25).text('SARJAN AI', 50, 50);
  doc.fontSize(10).fillColor('#64748b').text('Intelligent Design Systems', 50, 80);
  doc.moveDown();

  // Invoice Info
  doc.fillColor('#000').fontSize(20).text('INVOICE', { align: 'right' });
  doc.fontSize(10).text(`Invoice Date: ${new Date().toLocaleDateString()}`, { align: 'right' });
  doc.text(`Invoice #: INV-${Date.now().toString().slice(-6)}`, { align: 'right' });
  doc.moveDown(2);

  // Bill To
  doc.fontSize(12).fillColor('#0f172a').text('BILL TO:', 50, 150);
  doc.fontSize(10).fillColor('#000').text(user.name || 'Valued Customer', 50, 170);
  doc.text(user.email, 50, 185);
  doc.moveDown(2);

  // Table Header
  const tableTop = 250;
  doc.rect(50, tableTop, 500, 25).fill('#f8fafc');
  doc.fillColor('#475569').fontSize(10).text('DESCRIPTION', 60, tableTop + 7);
  doc.text('PLAN', 250, tableTop + 7);
  doc.text('AMOUNT', 480, tableTop + 7);

  // Table Content
  doc.fillColor('#000').text('Sarjan AI Pro Subscription', 60, tableTop + 40);
  doc.text('Monthly', 250, tableTop + 40);
  doc.text('Rs. 0.00', 480, tableTop + 40);

  // Horizontal Line
  doc.moveTo(50, tableTop + 60).lineTo(550, tableTop + 60).stroke('#e2e8f0');

  // Total
  doc.fontSize(12).text('TOTAL:', 400, tableTop + 80);
  doc.fontSize(15).fillColor('#a855f7').text('Rs. 0.00', 480, tableTop + 78);

  // Footer
  doc.fontSize(10).fillColor('#94a3b8').text(
    'Thank you for being a Pro member of Sarjan AI! Your support helps us build the future.',
    50, 700, { align: 'center', width: 500 }
  );
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