import express from "express";
import User from "../models/User.js";
import { protect } from "../middlewares/auth.middleware.js";
import PDFDocument from 'pdfkit';
import sendEmail from "../utils/email.service.js";
import { getProUpgradeEmailHtml } from "../utils/emailTemplates.js";
import { Buffer } from 'buffer';

const router = express.Router();

// ─────────────────────────────────────────────────────────
// CONSTANTS — all pixel values match tested Python layout
// ─────────────────────────────────────────────────────────
const TEAL = '#00d1b2';
const TEAL_D = '#00a896';
const TEAL_L = '#e6faf8';
const TEAL_B = '#c8f0eb';
const DARK = '#1a1a1a';
const GRAY = '#666666';
const MID = '#999999';
const LGRAY = '#eeeeee';
const WHITE = '#ffffff';
const BG = '#f8f8f8';

const PAGE_W = 595.28;  // A4
const PAGE_H = 841.89;
const MARGIN = 50;
const CW = PAGE_W - 2 * MARGIN; // 495.28

// ─────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────

// PDFKit Y=0 is top. Draw text at exact (x, y) — NO flow/wrap
const tx = (doc, text, x, y, opts = {}) => {
  doc.text(text, x, y, {
    lineBreak: false,
    ...opts,
  });
};

// Right-align text ending at x=rx
const txR = (doc, text, rx, y) => {
  const w = doc.widthOfString(text);
  tx(doc, text, rx - w, y);
};

// Center text within a box starting at x, width w
const txC = (doc, text, x, w, y) => {
  const tw = doc.widthOfString(text);
  tx(doc, text, x + (w - tw) / 2, y);
};

// Horizontal rule
const hr = (doc, y, color = LGRAY, lw = 0.5) => {
  doc.moveTo(MARGIN, y).lineTo(PAGE_W - MARGIN, y)
    .lineWidth(lw).strokeColor(color).stroke();
};

// ─────────────────────────────────────────────────────────
// GENERATE INVOICE PDF
// Every Y is an absolute offset from page top (Y=0 at top).
// Nothing uses doc.y — zero drift possible.
// ─────────────────────────────────────────────────────────
const generateInvoicePDF = (user, doc) => {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const monthYr = now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const invNo = `INV-${Date.now().toString().slice(-6)}`;
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    .toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  const period = `${firstDay} - ${lastDay}`;

  // ── 1. TOP TEAL BAR ──────────────────────────────────
  doc.rect(0, 0, PAGE_W, 6).fill(TEAL);

  // ── 2. LOGO (left) ───────────────────────────────────
  doc.font('Helvetica-Bold').fontSize(22).fillColor(DARK);
  tx(doc, 'SARJAN', MARGIN, 22);
  const sarjanW = doc.widthOfString('SARJAN');
  doc.fillColor(TEAL);
  tx(doc, ' Ai', MARGIN + sarjanW, 22);

  doc.font('Helvetica').fontSize(8).fillColor(GRAY);
  tx(doc, 'Intelligent Design Systems', MARGIN, 46);

  // ── 3. INVOICE TITLE (right) ─────────────────────────
  doc.font('Helvetica-Bold').fontSize(26).fillColor(DARK);
  txR(doc, 'INVOICE', PAGE_W - MARGIN, 22);

  // ── 4. META ROWS — each on its own fixed Y ───────────
  // Label at LX, value at VX — no align:'right', no continued
  const LX = PAGE_W - MARGIN - 200;
  const VX = PAGE_W - MARGIN - 108;
  const M_START = 58;
  const M_GAP = 14;

  const metaRows = [
    { lbl: 'Invoice No:', val: invNo, col: DARK },
    { lbl: 'Date:', val: dateStr, col: GRAY },
    { lbl: 'Period:', val: monthYr, col: GRAY },
    { lbl: 'Status:', val: 'PAID', col: TEAL },
  ];

  metaRows.forEach(({ lbl, val, col }, i) => {
    const my = M_START + i * M_GAP;
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(DARK);
    tx(doc, lbl, LX, my);
    doc.font('Helvetica').fontSize(8.5).fillColor(col);
    tx(doc, val, VX, my);
  });

  // ── 5. TEAL DIVIDER ──────────────────────────────────
  const DIV_Y = 112;
  hr(doc, DIV_Y, TEAL, 2);

  // ── 6. FREE TRIAL BANNER ─────────────────────────────
  const BAN_Y = DIV_Y + 12;
  const BAN_H = 44;

  doc.roundedRect(MARGIN, BAN_Y, CW, BAN_H, 6).fill(TEAL);

  doc.font('Helvetica-Bold').fontSize(10.5).fillColor(WHITE);
  tx(doc, 'Pro Plan - Free Trial Active', MARGIN + 14, BAN_Y + 9);

  doc.font('Helvetica').fontSize(8.5).fillColor('#d0f8f2');
  tx(doc, 'You are currently on a free trial. No charges applied for this period.',
    MARGIN + 14, BAN_Y + 26);

  // Pill (right side of banner)
  const PILL_W = 78;
  const PILL_X = PAGE_W - MARGIN - PILL_W - 10;
  const PILL_Y = BAN_Y + 13;
  doc.roundedRect(PILL_X, PILL_Y, PILL_W, 18, 9).fill(WHITE);
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor(TEAL_D);
  txC(doc, 'FREE TRIAL', PILL_X, PILL_W, PILL_Y + 5);

  // ── 7. BILL TO / ISSUED BY ───────────────────────────
  const BILL_Y = BAN_Y + BAN_H + 14;
  const BOX_H = 90;
  const BOX_W = (CW - 14) / 2;

  // Box 1
  doc.roundedRect(MARGIN, BILL_Y, BOX_W, BOX_H, 5)
    .fillAndStroke(BG, LGRAY);

  doc.font('Helvetica-Bold').fontSize(7.5).fillColor(TEAL_D);
  tx(doc, 'BILL TO', MARGIN + 12, BILL_Y + 10);

  doc.moveTo(MARGIN + 12, BILL_Y + 22)
    .lineTo(MARGIN + BOX_W - 12, BILL_Y + 22)
    .lineWidth(0.5).strokeColor(TEAL_L).stroke();

  doc.font('Helvetica-Bold').fontSize(11).fillColor(DARK);
  tx(doc, user.name || 'Valued Customer', MARGIN + 12, BILL_Y + 28);

  doc.font('Helvetica').fontSize(8.5).fillColor(GRAY);
  tx(doc, user.email, MARGIN + 12, BILL_Y + 44);
  tx(doc, 'Plan: Pro', MARGIN + 12, BILL_Y + 57);
  tx(doc, `Member since: ${monthYr}`, MARGIN + 12, BILL_Y + 70);

  // Box 2
  const B2X = MARGIN + BOX_W + 14;
  doc.roundedRect(B2X, BILL_Y, BOX_W, BOX_H, 5)
    .fillAndStroke(BG, LGRAY);

  doc.font('Helvetica-Bold').fontSize(7.5).fillColor(TEAL_D);
  tx(doc, 'ISSUED BY', B2X + 12, BILL_Y + 10);

  doc.moveTo(B2X + 12, BILL_Y + 22)
    .lineTo(B2X + BOX_W - 12, BILL_Y + 22)
    .lineWidth(0.5).strokeColor(TEAL_L).stroke();

  doc.font('Helvetica-Bold').fontSize(11).fillColor(DARK);
  tx(doc, 'Sarjan AI', B2X + 12, BILL_Y + 28);

  doc.font('Helvetica').fontSize(8.5).fillColor(GRAY);
  tx(doc, 'www.sarjanai.com', B2X + 12, BILL_Y + 44, { link: 'https://www.sarjanai.com' });
  tx(doc, 'support@sarjanai.com', B2X + 12, BILL_Y + 57, { link: 'mailto:support@sarjanai.com' });
  tx(doc, 'India', B2X + 12, BILL_Y + 70);

  // ── 8. TABLE ─────────────────────────────────────────
  const TBL_Y = BILL_Y + BOX_H + 18;
  const TBL_H = 20;

  // Column definitions
  const C = {
    desc: { x: MARGIN + 10, w: 258 },
    qty: { x: MARGIN + 268, w: 50 },
    price: { x: MARGIN + 318, w: 80 },
    total: { x: PAGE_W - MARGIN - 97, w: 97 },
  };

  // Header bar
  doc.rect(MARGIN, TBL_Y, CW, TBL_H).fill(DARK);

  doc.font('Helvetica-Bold').fontSize(8).fillColor(WHITE);
  tx(doc, 'DESCRIPTION', C.desc.x, TBL_Y + 6);
  txC(doc, 'QTY', C.qty.x, C.qty.w, TBL_Y + 6);
  txC(doc, 'PRICE', C.price.x, C.price.w, TBL_Y + 6);
  txR(doc, 'TOTAL', C.total.x + C.total.w, TBL_Y + 6);

  // ── ROW 1 ───────────────────────────────────────────
  const R1_Y = TBL_Y + TBL_H + 8;

  doc.font('Helvetica-Bold').fontSize(10).fillColor(DARK);
  tx(doc, 'Sarjan AI - Pro Plan Subscription', C.desc.x, R1_Y + 10);

  doc.font('Helvetica').fontSize(8.5).fillColor(GRAY);
  tx(doc, `Billing period: ${period}`, C.desc.x, R1_Y + 24);
  tx(doc, 'Includes: Unlimited messages, Image generation,', C.desc.x, R1_Y + 36);
  tx(doc, 'Priority responses, Real-time analytics, Full API access', C.desc.x, R1_Y + 48);

  // FREE TRIAL PERIOD badge
  const BADGE_Y = R1_Y + 60;
  doc.roundedRect(C.desc.x, BADGE_Y, 94, 14, 7).fillAndStroke(TEAL_L, TEAL_B);
  doc.font('Helvetica-Bold').fontSize(7).fillColor(TEAL_D);
  txC(doc, 'FREE TRIAL PERIOD', C.desc.x, 94, BADGE_Y + 3);

  // Right cols — centered at row middle
  const R1_MID = R1_Y + 32;
  doc.font('Helvetica').fontSize(9).fillColor(GRAY);
  txC(doc, '1', C.qty.x, C.qty.w, R1_MID);
  txC(doc, 'Rs. 0.00', C.price.x, C.price.w, R1_MID);
  doc.font('Helvetica-Bold').fillColor(DARK);
  txR(doc, 'Rs. 0.00', C.total.x + C.total.w, R1_MID);

  const R1_BOT = BADGE_Y + 22;
  hr(doc, R1_BOT, LGRAY, 0.5);

  // ── ROW 2 ───────────────────────────────────────────
  const R2_Y = R1_BOT + 8;

  doc.font('Helvetica-Bold').fontSize(10).fillColor(DARK);
  tx(doc, '14-Day Free Trial Discount', C.desc.x, R2_Y + 10);

  doc.font('Helvetica').fontSize(8.5).fillColor(GRAY);
  tx(doc, 'Promotional offer - no charge applied this month', C.desc.x, R2_Y + 24);

  const R2_MID = R2_Y + 17;
  doc.font('Helvetica').fontSize(9).fillColor(GRAY);
  txC(doc, '1', C.qty.x, C.qty.w, R2_MID);
  doc.fillColor(TEAL_D);
  txC(doc, '- Rs. 0.00', C.price.x, C.price.w, R2_MID);
  doc.font('Helvetica-Bold').fillColor(TEAL_D);
  txR(doc, '- Rs. 0.00', C.total.x + C.total.w, R2_MID);

  const R2_BOT = R2_Y + 36;
  hr(doc, R2_BOT, LGRAY, 0.5);

  // ── 9. TOTALS ────────────────────────────────────────
  const TOT_Y = R2_BOT + 12;
  const TOT_LX = PAGE_W - MARGIN - 210;
  const TOT_RX = PAGE_W - MARGIN - 5;  // right-edge for values
  const TOT_H = 15;

  const totRows = [
    { lbl: 'Subtotal', val: 'Rs. 0.00', col: GRAY, bold: false },
    { lbl: 'GST (0%)', val: 'Rs. 0.00', col: GRAY, bold: false },
    { lbl: 'Free Trial Discount', val: '- Rs. 0.00', col: TEAL_D, bold: false },
  ];

  totRows.forEach(({ lbl, val, col, bold }, i) => {
    const ty = TOT_Y + i * TOT_H + 10;
    doc.font('Helvetica').fontSize(9).fillColor(GRAY);
    tx(doc, lbl, TOT_LX, ty);
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9).fillColor(col);
    txR(doc, val, TOT_RX, ty);
  });

  // Total Due box
  const TB_Y = TOT_Y + TOT_H * 3 + 6;
  const TB_H = 28;
  doc.roundedRect(TOT_LX - 10, TB_Y, 220, TB_H, 5).fillAndStroke(TEAL_L, TEAL_B);

  doc.font('Helvetica-Bold').fontSize(11).fillColor(DARK);
  tx(doc, 'TOTAL DUE', TOT_LX, TB_Y + 8);
  doc.font('Helvetica-Bold').fontSize(12).fillColor(TEAL);
  txR(doc, 'Rs. 0.00', TOT_RX, TB_Y + 7);

  // ── 10. PAID STAMP ───────────────────────────────────
  doc.save();
  doc.translate(MARGIN + 75, TOT_Y + 30).rotate(-18);
  doc.roundedRect(-44, -16, 88, 32, 4)
    .lineWidth(2.5).strokeColor(TEAL).stroke();
  doc.font('Helvetica-Bold').fontSize(20).fillColor(TEAL);
  const paidW = doc.widthOfString('PAID');
  tx(doc, 'PAID', -paidW / 2, -11);
  doc.restore();

  // ── 11. FEATURES BOX ─────────────────────────────────
  const FEAT_Y = TB_Y + TB_H + 20;
  const FEAT_H = 66;
  doc.roundedRect(MARGIN, FEAT_Y, CW, FEAT_H, 6).fillAndStroke('#f8fffe', TEAL_B);

  doc.font('Helvetica-Bold').fontSize(7.5).fillColor(TEAL_D);
  tx(doc, "WHAT'S INCLUDED IN YOUR PRO PLAN", MARGIN + 14, FEAT_Y + 10);

  const feats = [
    'Unlimited messages', 'Image generation', 'Priority responses',
    'Real-time analytics', 'Full API access', 'Custom templates',
  ];
  const F_COL_W = (CW - 28) / 3;
  feats.forEach((f, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const fx = MARGIN + 14 + col * F_COL_W;
    const fy = FEAT_Y + 26 + row * 16;
    doc.font('Helvetica').fontSize(8.5).fillColor(DARK);
    tx(doc, `\u2713  ${f}`, fx, fy);
  });

  // ── 12. FOOTER ───────────────────────────────────────
  const FOOT_Y = FEAT_Y + FEAT_H + 14;
  hr(doc, FOOT_Y, LGRAY, 0.5);

  // Website — centered
  doc.font('Helvetica').fontSize(9).fillColor(TEAL_D);
  const siteText = 'www.sarjanai.com';
  const siteW = doc.widthOfString(siteText);
  tx(doc, siteText, (PAGE_W - siteW) / 2, FOOT_Y + 10, { link: 'https://www.sarjanai.com' });

  // Footer links — measured and placed precisely, NO continued:true
  doc.font('Helvetica').fontSize(8);
  const footLinks = [
    { text: 'Terms & Conditions', color: MID, link: 'https://www.sarjanai.com/terms' },
    { text: '  |  ', color: '#cccccc' },
    { text: 'Privacy Policy', color: MID, link: 'https://www.sarjanai.com/privacy' },
    { text: '  |  ', color: '#cccccc' },
    { text: 'Support', color: MID, link: 'https://www.sarjanai.com/support' },
  ];
  const totalLW = footLinks.reduce((sum, { text }) =>
    sum + doc.widthOfString(text), 0);
  let lx = (PAGE_W - totalLW) / 2;
  const LINK_Y = FOOT_Y + 24;

  footLinks.forEach(({ text, color, link }) => {
    doc.font('Helvetica').fontSize(8).fillColor(color);
    tx(doc, text, lx, LINK_Y, link ? { link } : {});
    lx += doc.widthOfString(text);
  });

  // Tagline
  doc.font('Helvetica').fontSize(7.5).fillColor('#cccccc');
  const tagText = 'SARJAN AI  \u00b7  Intelligent Design Systems  \u00b7  India';
  const tagW = doc.widthOfString(tagText);
  tx(doc, tagText, (PAGE_W - tagW) / 2, FOOT_Y + 38);

  // Bottom teal bar
  doc.rect(0, PAGE_H - 6, PAGE_W, 6).fill(TEAL);
};

// ─────────────────────────────────────────────────────────
// ROUTE: Change plan
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

    const user = await User.findByIdAndUpdate(req.user.id, { plan }, { new: true });

    if (plan === "pro") {
      try {
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', async () => {
          const pdfData = Buffer.concat(buffers);
          await sendEmail({
            email: user.email,
            subject: 'Welcome to Sarjan AI Pro - Your Invoice',
            html: getProUpgradeEmailHtml(user.name),
            attachments: [{
              filename: `SarjanAI_Invoice_${user._id}.pdf`,
              content: pdfData,
              contentType: 'application/pdf',
            }],
          });
          console.log(`Invoice emailed to ${user.email}`);
        });
        generateInvoicePDF(user, doc);
        doc.end();
      } catch (emailErr) {
        console.error("Failed to send invoice email:", emailErr.message);
      }
    }

    res.json({
      success: true,
      plan: user.plan,
      message: `Plan changed to ${plan.charAt(0).toUpperCase() + plan.slice(1)} successfully!${plan === "pro" ? " Invoice sent to your email." : ""
        }`,
    });
  } catch (err) {
    console.error("Plan change error:", err);
    res.status(500).json({ error: "Plan change failed" });
  }
});

// ─────────────────────────────────────────────────────────
// ROUTE: Get current plan
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
// ROUTE: Download invoice (Pro only)
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