import express from "express";
import User from "../models/User.js";
import { protect } from "../middlewares/auth.middleware.js";
import PDFDocument from 'pdfkit';
import sendEmail from "../utils/email.service.js";
import { getProUpgradeEmailHtml } from "../utils/emailTemplates.js";
import { Buffer } from 'buffer';

const router = express.Router();

// ─────────────────────────────────────────────────────────
// COLORS & CONSTANTS
// ─────────────────────────────────────────────────────────
const TEAL       = '#00d1b2';
const TEAL_LIGHT = '#e6faf8';
const TEAL_DARK  = '#00a896';
const DARK       = '#1a1a1a';
const GRAY       = '#555555';
const LIGHT_GRAY = '#f0f0f0';
const WHITE      = '#ffffff';

// ─────────────────────────────────────────────────────────
// HELPER: Draw a filled rounded rectangle (PDFKit has no built-in)
// ─────────────────────────────────────────────────────────
const roundedRect = (doc, x, y, w, h, r, fillColor, strokeColor = null) => {
  doc.save()
    .roundedRect(x, y, w, h, r)
    .fillAndStroke(fillColor, strokeColor || fillColor)
    .restore();
};

// ─────────────────────────────────────────────────────────
// MAIN: Generate Invoice PDF
// ─────────────────────────────────────────────────────────
const generateInvoicePDF = (user, doc) => {
  const now        = new Date();
  const dateStr    = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const monthName  = now.toLocaleDateString('en-GB', { month: 'long' });
  const year       = now.getFullYear();
  const monthYear  = `${monthName} ${year}`;
  const invoiceNo  = `INV-${Date.now().toString().slice(-6)}`;

  // Billing period: first → last day of current month
  const firstDay   = new Date(now.getFullYear(), now.getMonth(), 1)
    .toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  const lastDay    = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  const period     = `${firstDay} – ${lastDay}`;

  const PAGE_W     = doc.page.width;
  const MARGIN     = 50;
  const CONTENT_W  = PAGE_W - MARGIN * 2;

  // ── 1. HEADER TEAL BAR ──────────────────────────────────
  doc.rect(0, 0, PAGE_W, 8).fill(TEAL);

  // ── 2. LOGO (left) + INVOICE LABEL (right) ──────────────
  const headerY = 28;

  // Logo: "SARJAN" black + " Ai" teal
  doc.fontSize(22).font('Helvetica-Bold').fillColor(DARK)
    .text('SARJAN', MARGIN, headerY, { continued: true });
  doc.fillColor(TEAL).text(' Ai');

  // Tagline below logo
  doc.fontSize(8).font('Helvetica').fillColor(GRAY)
    .text('Intelligent Design Systems', MARGIN, headerY + 28);

  // "INVOICE" right side
  doc.fontSize(26).font('Helvetica-Bold').fillColor(DARK)
    .text('INVOICE', MARGIN, headerY, { align: 'right', width: CONTENT_W });

  // Invoice meta: number, date, period, status
  const metaLines = [
    { label: 'Invoice No:', value: invoiceNo },
    { label: 'Date:',       value: dateStr   },
    { label: 'Period:',     value: monthYear },
    { label: 'Status:',     value: 'PAID'    },
  ];
  let metaY = headerY + 34;
  metaLines.forEach(({ label, value }) => {
    doc.fontSize(9).font('Helvetica-Bold').fillColor(DARK)
      .text(label, MARGIN, metaY, { continued: true, width: CONTENT_W, align: 'right' });
    const color = label === 'Status:' ? TEAL : GRAY;
    doc.font('Helvetica').fillColor(color).text(` ${value}`);
    metaY += 14;
  });

  // ── 3. DIVIDER ───────────────────────────────────────────
  const divY = headerY + 95;
  doc.moveTo(MARGIN, divY).lineTo(PAGE_W - MARGIN, divY)
    .lineWidth(2).strokeColor(TEAL).stroke();

  // ── 4. FREE TRIAL BANNER ─────────────────────────────────
  const bannerY = divY + 14;
  roundedRect(doc, MARGIN, bannerY, CONTENT_W, 44, 6, TEAL);

  // Banner text left
  doc.fontSize(11).font('Helvetica-Bold').fillColor(WHITE)
    .text('🎉  Pro Plan — Free Trial Active', MARGIN + 14, bannerY + 8);
  doc.fontSize(8.5).font('Helvetica').fillColor('#d0f8f2')
    .text('You are currently on a free trial. No charges applied for this period.',
      MARGIN + 14, bannerY + 23);

  // "FREE TRIAL" pill right side
  roundedRect(doc, PAGE_W - MARGIN - 84, bannerY + 12, 74, 20, 10, WHITE);
  doc.fontSize(8).font('Helvetica-Bold').fillColor(TEAL_DARK)
    .text('FREE TRIAL', PAGE_W - MARGIN - 84, bannerY + 17,
      { width: 74, align: 'center' });

  // ── 5. BILL TO / FROM ─────────────────────────────────────
  const billY   = bannerY + 64;
  const colW    = CONTENT_W / 2 - 10;

  // --- BILL TO box ---
  roundedRect(doc, MARGIN, billY, colW, 86, 6, '#f8f8f8', LIGHT_GRAY);

  doc.fontSize(7.5).font('Helvetica-Bold').fillColor(TEAL_DARK)
    .text('BILL TO', MARGIN + 14, billY + 10);
  doc.moveTo(MARGIN + 14, billY + 20).lineTo(MARGIN + colW - 14, billY + 20)
    .lineWidth(0.5).strokeColor(TEAL_LIGHT).stroke();

  doc.fontSize(11).font('Helvetica-Bold').fillColor(DARK)
    .text(user.name || 'Valued Customer', MARGIN + 14, billY + 26);
  doc.fontSize(9).font('Helvetica').fillColor(GRAY)
    .text(user.email,            MARGIN + 14, billY + 42)
    .text(`Plan: Pro`,           MARGIN + 14, billY + 54)
    .text(`Member since: ${monthYear}`, MARGIN + 14, billY + 66);

  // --- ISSUED BY box ---
  const col2X = MARGIN + colW + 20;
  roundedRect(doc, col2X, billY, colW, 86, 6, '#f8f8f8', LIGHT_GRAY);

  doc.fontSize(7.5).font('Helvetica-Bold').fillColor(TEAL_DARK)
    .text('ISSUED BY', col2X + 14, billY + 10);
  doc.moveTo(col2X + 14, billY + 20).lineTo(col2X + colW - 14, billY + 20)
    .lineWidth(0.5).strokeColor(TEAL_LIGHT).stroke();

  doc.fontSize(11).font('Helvetica-Bold').fillColor(DARK)
    .text('Sarjan AI', col2X + 14, billY + 26);
  doc.fontSize(9).font('Helvetica').fillColor(GRAY)
    .text('www.sarjanai.com',       col2X + 14, billY + 42)
    .text('support@sarjanai.com',   col2X + 14, billY + 54)
    .text('India',                  col2X + 14, billY + 66);

  // ── 6. TABLE ─────────────────────────────────────────────
  const tableY   = billY + 104;
  const colWidths = [270, 50, 80, 80]; // Desc, Qty, Price, Total
  const colX      = [MARGIN, MARGIN + 270, MARGIN + 320, MARGIN + 400];
  const rowH      = 20;

  // Table header
  doc.rect(MARGIN, tableY, CONTENT_W, rowH).fill(DARK);
  const headers = ['DESCRIPTION', 'QTY', 'PRICE', 'TOTAL'];
  headers.forEach((h, i) => {
    const align = i === 0 ? 'left' : 'center';
    doc.fontSize(8).font('Helvetica-Bold').fillColor(WHITE)
      .text(h, colX[i] + (i === 0 ? 10 : 0), tableY + 6,
        { width: colWidths[i], align });
  });

  // Row 1: Pro Subscription
  const r1Y = tableY + rowH + 4;
  doc.fontSize(10).font('Helvetica-Bold').fillColor(DARK)
    .text('Sarjan AI — Pro Plan Subscription', MARGIN + 10, r1Y);
  doc.fontSize(8.5).font('Helvetica').fillColor(GRAY)
    .text(`Billing period: ${period}`, MARGIN + 10, r1Y + 14)
    .text('Includes: Unlimited messages, Image generation,', MARGIN + 10, r1Y + 25)
    .text('Priority responses, Real-time analytics, Full API access', MARGIN + 10, r1Y + 36);

  // FREE TRIAL PERIOD pill
  roundedRect(doc, MARGIN + 10, r1Y + 50, 90, 14, 7, TEAL_LIGHT, '#b2ede8');
  doc.fontSize(7.5).font('Helvetica-Bold').fillColor(TEAL_DARK)
    .text('FREE TRIAL PERIOD', MARGIN + 10, r1Y + 53, { width: 90, align: 'center' });

  // Row 1 right columns
  doc.fontSize(9).font('Helvetica').fillColor(GRAY)
    .text('1',       colX[1], r1Y + 25, { width: colWidths[1], align: 'center' })
    .text('Rs. 0.00', colX[2], r1Y + 25, { width: colWidths[2], align: 'center' });
  doc.fontSize(9).font('Helvetica-Bold').fillColor(DARK)
    .text('Rs. 0.00', colX[3], r1Y + 25, { width: colWidths[3], align: 'center' });

  const r1H = 72;
  doc.moveTo(MARGIN, r1Y + r1H).lineTo(PAGE_W - MARGIN, r1Y + r1H)
    .lineWidth(0.5).strokeColor(LIGHT_GRAY).stroke();

  // Row 2: Free Trial Discount
  const r2Y = r1Y + r1H + 6;
  doc.fontSize(9.5).font('Helvetica-Bold').fillColor(DARK)
    .text('14-Day Free Trial Discount', MARGIN + 10, r2Y);
  doc.fontSize(8.5).font('Helvetica').fillColor(GRAY)
    .text('Promotional offer — no charge applied this month', MARGIN + 10, r2Y + 13);

  doc.fontSize(9).font('Helvetica').fillColor(GRAY)
    .text('1', colX[1], r2Y + 6, { width: colWidths[1], align: 'center' });
  doc.fillColor(TEAL_DARK)
    .text('- Rs. 0.00', colX[2], r2Y + 6, { width: colWidths[2], align: 'center' });
  doc.font('Helvetica-Bold').fillColor(TEAL_DARK)
    .text('- Rs. 0.00', colX[3], r2Y + 6, { width: colWidths[3], align: 'center' });

  const r2H = 32;
  doc.moveTo(MARGIN, r2Y + r2H).lineTo(PAGE_W - MARGIN, r2Y + r2H)
    .lineWidth(0.5).strokeColor(LIGHT_GRAY).stroke();

  // ── 7. TOTALS ─────────────────────────────────────────────
  const totY    = r2Y + r2H + 14;
  const totX    = PAGE_W - MARGIN - 200;
  const totW    = 200;

  const totRows = [
    { label: 'Subtotal',             value: 'Rs. 0.00', color: GRAY   },
    { label: 'GST (0%)',             value: 'Rs. 0.00', color: GRAY   },
    { label: 'Free Trial Discount',  value: '- Rs. 0.00', color: TEAL_DARK },
  ];
  let ty = totY;
  totRows.forEach(({ label, value, color }) => {
    doc.fontSize(9).font('Helvetica').fillColor(GRAY).text(label, totX, ty, { width: 110 });
    doc.fontSize(9).font('Helvetica').fillColor(color).text(value, totX + 110, ty, { width: 90, align: 'right' });
    ty += 16;
  });

  // Total due highlighted box
  roundedRect(doc, totX - 10, ty + 4, totW + 10, 28, 6, TEAL_LIGHT, '#b2ede8');
  doc.fontSize(11).font('Helvetica-Bold').fillColor(DARK)
    .text('TOTAL DUE', totX, ty + 11, { width: 110 });
  doc.fontSize(12).font('Helvetica-Bold').fillColor(TEAL)
    .text('Rs. 0.00', totX + 110, ty + 10, { width: 90, align: 'right' });

  // ── 8. PAID STAMP ─────────────────────────────────────────
  const stampY = totY;
  doc.save()
    .translate(MARGIN + 60, stampY + 20)
    .rotate(-18);
  doc.roundedRect(-44, -18, 88, 36, 4)
    .lineWidth(2.5).strokeColor(TEAL).stroke();
  doc.fontSize(18).font('Helvetica-Bold').fillColor(TEAL).text('PAID', -32, -10);
  doc.restore();

  // ── 9. FEATURES BOX ────────────────────────────────────────
  const featY = ty + 52;
  roundedRect(doc, MARGIN, featY, CONTENT_W, 66, 6, '#f8fffe', '#c8f0eb');

  doc.fontSize(7.5).font('Helvetica-Bold').fillColor(TEAL_DARK)
    .text("WHAT'S INCLUDED IN YOUR PRO PLAN", MARGIN + 14, featY + 10);

  const features = [
    'Unlimited messages',   'Image generation',
    'Priority responses',   'Real-time analytics',
    'Full API access',      'Custom templates',
  ];
  const fColW = CONTENT_W / 3;
  features.forEach((f, i) => {
    const fx = MARGIN + 14 + (i % 3) * fColW;
    const fy = featY + 24 + Math.floor(i / 3) * 16;
    doc.fontSize(8.5).font('Helvetica').fillColor(DARK)
      .text(`✓  ${f}`, fx, fy, { width: fColW - 10 });
  });

  // ── 10. FOOTER ─────────────────────────────────────────────
  const footY = featY + 86;
  doc.moveTo(MARGIN, footY).lineTo(PAGE_W - MARGIN, footY)
    .lineWidth(0.5).strokeColor(LIGHT_GRAY).stroke();

  doc.fontSize(9).font('Helvetica').fillColor(TEAL_DARK)
    .text('www.sarjanai.com', 0, footY + 10, { align: 'center', link: 'https://sarjanai.com' });

  doc.fontSize(8).fillColor('#aaa')
    .text('Terms & Conditions', 0, footY + 23,
      { align: 'center', continued: true, link: 'https://sarjanai.com/terms', width: PAGE_W })
    .text('  |  ', { continued: true, link: null })
    .text('Privacy Policy', { link: 'https://sarjanai.com/privacy', continued: true })
    .text('  |  ', { continued: true, link: null })
    .text('Support', { link: 'https://sarjanai.com/contact' });

  doc.fontSize(7.5).fillColor('#ccc')
    .text('SARJAN AI · Intelligent Design Systems · India', 0, footY + 38, { align: 'center' });

  // Bottom teal bar
  const pageH = doc.page.height;
  doc.rect(0, pageH - 6, PAGE_W, 6).fill(TEAL);
};

// ─────────────────────────────────────────────────────────
// ROUTE: Change plan (free or pro)
// ─────────────────────────────────────────────────────────
router.post("/change", protect, async (req, res) => {
  try {
    const { plan } = req.body;

    if (!["free", "pro"].includes(plan)) {
      return res.status(400).json({ error: "Invalid plan selected" });
    }

    const currentUser = await User.findById(req.user.id);
    if (currentUser.plan === "pro" && plan === "free") {
      return res.status(403).json({ error: "Downgrading to free is not allowed for Pro users." });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { plan },
      { new: true }
    );

    // Send invoice email on Pro upgrade
    if (plan === "pro") {
      try {
        const doc      = new PDFDocument({ margin: 50, size: 'A4' });
        const buffers  = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', async () => {
          const pdfData = Buffer.concat(buffers);
          await sendEmail({
            email: user.email,
            subject: '🎉 Welcome to Sarjan AI Pro — Your Invoice',
            html: getProUpgradeEmailHtml(user.name),
            attachments: [
              {
                filename: `SarjanAI_Invoice_${user._id}.pdf`,
                content: pdfData,
                contentType: 'application/pdf',
              },
            ],
          });
          console.log(`✅ Invoice emailed to ${user.email}`);
        });
        generateInvoicePDF(user, doc);
        doc.end();
      } catch (emailErr) {
        console.error("❌ Failed to send invoice email:", emailErr.message);
      }
    }

    res.json({
      success: true,
      plan: user.plan,
      message: `Plan changed to ${plan.charAt(0).toUpperCase() + plan.slice(1)} successfully!${
        plan === "pro" ? " Invoice sent to your email." : ""
      }`,
    });
  } catch (err) {
    console.error("Plan change error:", err);
    res.status(500).json({ error: "Plan change failed" });
  }
});

// ─────────────────────────────────────────────────────────
// ROUTE: Get current plan status
// ─────────────────────────────────────────────────────────
router.get("/status", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({ plan: user.plan, messageCount: user.messageCount });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// ─────────────────────────────────────────────────────────
// ROUTE: Download Invoice (Pro only)
// ─────────────────────────────────────────────────────────
router.get("/invoice", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (user.plan !== "pro") {
      return res.status(403).json({ error: "Invoices are only available for Pro users." });
    }

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition',
      `attachment; filename=SarjanAI_Invoice_${user._id}.pdf`);
    doc.pipe(res);
    generateInvoicePDF(user, doc);
    doc.end();
  } catch (err) {
    console.error("Invoice generation failed:", err);
    res.status(500).json({ error: "Failed to generate invoice" });
  }
});

export default router;