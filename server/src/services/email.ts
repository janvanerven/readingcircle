import nodemailer from 'nodemailer';

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    const host = process.env.SMTP_HOST;
    if (!host) {
      console.warn('SMTP not configured - emails will be logged to console');
      transporter = nodemailer.createTransport({ jsonTransport: true });
      return transporter;
    }

    transporter = nodemailer.createTransport({
      host,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

const APP_URL = process.env.APP_URL || 'http://localhost:5173';
const FROM = process.env.SMTP_FROM || 'noreply@readingcircle.local';

export async function sendInvitationEmail(email: string, token: string, inviterName: string): Promise<void> {
  const joinUrl = `${APP_URL}/join/${token}`;

  const html = `
    <div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <h1 style="color: #6B2737; text-align: center; font-size: 28px;">Reading Circle</h1>
      <div style="background: #FFF8F0; border-radius: 12px; padding: 30px; border: 1px solid #E8D5C4;">
        <p style="color: #4A3728; font-size: 16px; line-height: 1.6;">
          Hello! <strong>${inviterName}</strong> has invited you to join their Reading Circle.
        </p>
        <p style="color: #4A3728; font-size: 16px; line-height: 1.6;">
          Click the button below to create your account and start exploring books together.
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${joinUrl}" style="background: #6B2737; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: bold;">
            Join the Circle
          </a>
        </div>
        <p style="color: #8B7355; font-size: 13px; text-align: center;">
          This invitation expires in 24 hours. If the button doesn't work, copy and paste this URL:<br>
          <a href="${joinUrl}" style="color: #6B2737;">${joinUrl}</a>
        </p>
      </div>
    </div>
  `;

  const mailOptions = {
    from: FROM,
    to: email,
    subject: `${inviterName} invited you to Reading Circle`,
    html,
  };

  const transport = getTransporter();
  const result = await transport.sendMail(mailOptions);

  // Log to console if using JSON transport (no SMTP configured)
  if (!process.env.SMTP_HOST) {
    const parsed = JSON.parse(result.message);
    console.log('Email would be sent:', { to: parsed.to, subject: parsed.subject });
    console.log('Join URL:', joinUrl);
  }
}
