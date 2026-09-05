import express from 'express';
import nodemailer from 'nodemailer';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

let transporter = null;
let isEtherealFallback = false;

// Create Nodemailer Transporter
async function initTransporter() {
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (smtpUser && smtpPass && smtpUser !== 'your-email@gmail.com') {
    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = parseInt(process.env.SMTP_PORT || '465', 10);
    const secure = process.env.SMTP_SECURE !== 'false';

    console.log(`[Backend] Configuring SMTP transporter for: ${smtpUser} (${host}:${port})`);
    transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user: smtpUser,
        pass: smtpPass
      }
    });
    isEtherealFallback = false;
  } else {
    console.log('[Backend] No production SMTP credentials found in .env. Creating Ethereal Test Account fallback...');
    try {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
      isEtherealFallback = true;
      console.log(`[Backend] Ethereal test account active: ${testAccount.user}`);
    } catch (err) {
      console.error('[Backend] Failed to create Ethereal test account:', err);
    }
  }
}

initTransporter();

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: isEtherealFallback ? 'Ethereal Test Fallback' : 'Production SMTP',
    timestamp: new Date().toISOString()
  });
});

// POST /api/send-otp Endpoint
app.post('/api/send-otp', async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ 
      success: false, 
      error: 'Missing required parameters: email and otp are required.' 
    });
  }

  if (!transporter) {
    await initTransporter();
  }

  if (!transporter) {
    return res.status(500).json({ 
      success: false, 
      error: 'Mail transporter failed to initialize.' 
    });
  }

  const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@securevault.app';

  const htmlContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px; background-color: #0b0f19; border-radius: 16px; color: #f3f4f6; border: 1px solid #1f2937;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h2 style="color: #60a5fa; margin: 0; font-size: 24px; font-weight: 700; tracking: -0.5px;">🔒 SecureVault Security</h2>
        <p style="color: #9ca3af; font-size: 14px; margin-top: 6px;">Zero-Knowledge Vault Verification</p>
      </div>

      <div style="background-color: #111827; border: 1px solid #374151; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
        <p style="color: #d1d5db; font-size: 14px; margin: 0 0 16px 0;">Your 6-Digit One-Time Password (OTP) code is:</p>
        <div style="font-family: monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #38bdf8; background-color: #030712; padding: 16px 24px; border-radius: 8px; border: 1px solid #1e293b; display: inline-block;">
          ${otp}
        </div>
        <p style="color: #6b7280; font-size: 12px; margin-top: 16px; margin-bottom: 0;">This code will expire shortly. Do not share this code with anyone.</p>
      </div>

      <div style="border-t: 1px solid #1f2937; pt: 16px; font-size: 12px; color: #6b7280; text-align: center;">
        <p style="margin: 0;">Sent to <strong style="color: #9ca3af;">${email}</strong></p>
        <p style="margin-top: 4px;">If you did not request this verification code, please ignore this email.</p>
      </div>
    </div>
  `;

  const textContent = `🔒 SecureVault 2FA Code\n\nYour verification code is: ${otp}\n\nDo not share this code with anyone.`;

  try {
    const info = await transporter.sendMail({
      from: `"SecureVault Security" <${fromEmail}>`,
      to: email,
      subject: `🔒 SecureVault Verification Code: ${otp}`,
      text: textContent,
      html: htmlContent
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    console.log(`[Backend Mail Sent] MessageId: ${info.messageId} | Target: ${email}`);
    if (previewUrl) {
      console.log(`[Ethereal Preview URL] ${previewUrl}`);
    }

    return res.json({
      success: true,
      message: `OTP email successfully dispatched to ${email}`,
      messageId: info.messageId,
      previewUrl: previewUrl || null,
      isEthereal: isEtherealFallback
    });
  } catch (error) {
    console.error(`[Backend Mail Error] Failed to send to ${email}:`, error);
    return res.status(500).json({
      success: false,
      error: error.message || 'SMTP Email transmission failed.'
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 SecureVault Express Backend running on http://localhost:${PORT}`);
});
