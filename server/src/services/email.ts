import nodemailer from 'nodemailer';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

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
  const safeInviterName = escapeHtml(inviterName);

  const html = `
    <div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <h1 style="color: #6B2737; text-align: center; font-size: 28px;">Reading Circle</h1>
      <div style="background: #FFF8F0; border-radius: 12px; padding: 30px; border: 1px solid #E8D5C4;">
        <p style="color: #4A3728; font-size: 16px; line-height: 1.6;">
          Hello! <strong>${safeInviterName}</strong> has invited you to join their Reading Circle.
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
    subject: `${safeInviterName} invited you to Reading Circle`,
    html,
  };

  const transport = getTransporter();
  const result = await transport.sendMail(mailOptions);

  // Log to console if using JSON transport (no SMTP configured) — only in development
  if (!process.env.SMTP_HOST && process.env.NODE_ENV !== 'production') {
    const parsed = JSON.parse(result.message);
    console.log('Email would be sent:', { to: parsed.to, subject: parsed.subject });
    console.log('Join URL:', joinUrl);
  }
}

export async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  const resetUrl = `${APP_URL}/reset-password/${token}`;

  const html = `
    <div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <h1 style="color: #6B2737; text-align: center; font-size: 28px;">Reading Circle</h1>
      <div style="background: #FFF8F0; border-radius: 12px; padding: 30px; border: 1px solid #E8D5C4;">
        <p style="color: #4A3728; font-size: 16px; line-height: 1.6;">
          We received a request to reset your password. Click the button below to choose a new password.
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background: #6B2737; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: bold;">
            Reset Password
          </a>
        </div>
        <p style="color: #8B7355; font-size: 13px; text-align: center;">
          This link expires in 1 hour. If you didn't request this, you can safely ignore this email.<br>
          If the button doesn't work, copy and paste this URL:<br>
          <a href="${resetUrl}" style="color: #6B2737;">${resetUrl}</a>
        </p>
      </div>
    </div>
  `;

  const mailOptions = {
    from: FROM,
    to: email,
    subject: 'Reset your Reading Circle password',
    html,
  };

  const transport = getTransporter();
  const result = await transport.sendMail(mailOptions);

  if (!process.env.SMTP_HOST && process.env.NODE_ENV !== 'production') {
    const parsed = JSON.parse(result.message);
    console.log('Email would be sent:', { to: parsed.to, subject: parsed.subject });
    console.log('Reset URL:', resetUrl);
  }
}

export async function sendVotingOpenedEmail(
  email: string,
  meetLabel: string,
  meetId: string,
  candidates: { title: string; author: string }[],
): Promise<void> {
  const meetUrl = `${APP_URL}/meets/${meetId}`;
  const safeMeetLabel = escapeHtml(meetLabel);

  const candidateList = candidates
    .map(c => `<li style="color: #4A3728; font-size: 15px; line-height: 1.8;"><strong>${escapeHtml(c.title)}</strong> by ${escapeHtml(c.author)}</li>`)
    .join('');

  const html = `
    <div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <h1 style="color: #6B2737; text-align: center; font-size: 28px;">Reading Circle</h1>
      <div style="background: #FFF8F0; border-radius: 12px; padding: 30px; border: 1px solid #E8D5C4;">
        <p style="color: #4A3728; font-size: 16px; line-height: 1.6;">
          Voting is now open for <strong>${safeMeetLabel}</strong>!
        </p>
        <p style="color: #4A3728; font-size: 16px; line-height: 1.6;">
          The candidates are:
        </p>
        <ul style="padding-left: 20px; margin: 16px 0;">
          ${candidateList}
        </ul>
        <p style="color: #4A3728; font-size: 16px; line-height: 1.6;">
          Head over to the meet page to cast your votes.
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${meetUrl}" style="background: #6B2737; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: bold;">
            Vote Now
          </a>
        </div>
        <p style="color: #8B7355; font-size: 13px; text-align: center;">
          If the button doesn't work, copy and paste this URL:<br>
          <a href="${meetUrl}" style="color: #6B2737;">${meetUrl}</a>
        </p>
      </div>
    </div>
  `;

  const transport = getTransporter();
  const result = await transport.sendMail({
    from: FROM,
    to: email,
    subject: `Voting is open: ${safeMeetLabel}`,
    html,
  });

  if (!process.env.SMTP_HOST && process.env.NODE_ENV !== 'production') {
    const parsed = JSON.parse(result.message);
    console.log('Email would be sent:', { to: parsed.to, subject: parsed.subject });
  }
}

export async function sendBookSelectedEmail(
  email: string,
  bookTitle: string,
  bookAuthor: string,
  meetDate: string | null,
  meetId: string,
): Promise<void> {
  const meetUrl = `${APP_URL}/meets/${meetId}`;
  const safeTitle = escapeHtml(bookTitle);
  const safeAuthor = escapeHtml(bookAuthor);

  const dateInfo = meetDate
    ? `<p style="color: #4A3728; font-size: 16px; line-height: 1.6;">The meet is scheduled for <strong>${escapeHtml(meetDate)}</strong>.</p>`
    : '';

  const html = `
    <div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <h1 style="color: #6B2737; text-align: center; font-size: 28px;">Reading Circle</h1>
      <div style="background: #FFF8F0; border-radius: 12px; padding: 30px; border: 1px solid #E8D5C4;">
        <p style="color: #4A3728; font-size: 16px; line-height: 1.6;">
          The winner has been chosen! Our next read is:
        </p>
        <div style="text-align: center; margin: 20px 0; padding: 20px; background: white; border-radius: 8px; border: 1px solid #E8D5C4;">
          <p style="color: #6B2737; font-size: 22px; font-weight: bold; margin: 0;">${safeTitle}</p>
          <p style="color: #8B7355; font-size: 16px; margin: 8px 0 0;">by ${safeAuthor}</p>
        </div>
        ${dateInfo}
        <p style="color: #4A3728; font-size: 16px; line-height: 1.6;">
          Happy reading!
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${meetUrl}" style="background: #6B2737; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: bold;">
            View Meet
          </a>
        </div>
        <p style="color: #8B7355; font-size: 13px; text-align: center;">
          If the button doesn't work, copy and paste this URL:<br>
          <a href="${meetUrl}" style="color: #6B2737;">${meetUrl}</a>
        </p>
      </div>
    </div>
  `;

  const transport = getTransporter();
  const result = await transport.sendMail({
    from: FROM,
    to: email,
    subject: `${safeTitle} has been selected!`,
    html,
  });

  if (!process.env.SMTP_HOST && process.env.NODE_ENV !== 'production') {
    const parsed = JSON.parse(result.message);
    console.log('Email would be sent:', { to: parsed.to, subject: parsed.subject });
  }
}
