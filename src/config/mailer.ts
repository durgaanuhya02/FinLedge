import nodemailer from 'nodemailer';

const isTest = process.env.NODE_ENV === 'test';

async function createTransport() {
  if (process.env.SMTP_USER && process.env.SMTP_USER !== 'your-gmail@gmail.com') {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  // Dev fallback: Ethereal — emails captured at https://ethereal.email
  const testAccount = await nodemailer.createTestAccount();
  console.log('[Mailer] No SMTP configured — using Ethereal test account');
  console.log(`[Mailer] Preview emails at: https://ethereal.email (user: ${testAccount.user})`);
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: { user: testAccount.user, pass: testAccount.pass },
  });
}

let _transport: nodemailer.Transporter | null = null;
async function getTransport() {
  if (!_transport) _transport = await createTransport();
  return _transport;
}

const FROM = process.env.SMTP_FROM || 'FinLedger <noreply@finledger.com>';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

export async function sendVerificationEmail(to: string, name: string, token: string) {
  if (isTest) return; // skip in tests
  const transport = await getTransport();
  const link = `${APP_URL}/api/auth/verify-email?token=${token}`;
  const info = await transport.sendMail({
    from: FROM, to,
    subject: 'Verify your FinLedger email',
    html: `
      <h2>Welcome to FinLedger, ${name}!</h2>
      <p>Click below to verify your email. Expires in 24 hours.</p>
      <a href="${link}" style="background:#2563eb;color:#fff;padding:10px 20px;border-radius:4px;text-decoration:none;">Verify Email</a>
      <p>Or copy: ${link}</p>
    `,
  });
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Mailer] Verification preview: ${nodemailer.getTestMessageUrl(info)}`);
  }
}

export async function sendPasswordResetEmail(to: string, name: string, token: string) {
  if (isTest) return; // skip in tests
  const transport = await getTransport();
  const link = `${APP_URL}/api/auth/reset-password?token=${token}`;
  const info = await transport.sendMail({
    from: FROM, to,
    subject: 'Reset your FinLedger password',
    html: `
      <h2>Password Reset Request</h2>
      <p>Hi ${name}, click below to reset your password. Expires in 1 hour.</p>
      <a href="${link}" style="background:#dc2626;color:#fff;padding:10px 20px;border-radius:4px;text-decoration:none;">Reset Password</a>
      <p>Or copy: ${link}</p>
      <p>If you didn't request this, ignore this email.</p>
    `,
  });
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Mailer] Reset preview: ${nodemailer.getTestMessageUrl(info)}`);
  }
}
