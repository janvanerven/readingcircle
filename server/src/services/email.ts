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

const emailStrings: Record<string, Record<string, string>> = {
  en: {
    appTitle: 'Reading Circle',
    // Invitation
    inviteSubject: '{{name}} invited you to Reading Circle',
    inviteGreeting: 'Hello! <strong>{{name}}</strong> has invited you to join their Reading Circle.',
    inviteAction: 'Click the button below to create your account and start exploring books together.',
    inviteButton: 'Join the Circle',
    inviteExpiry: "This invitation expires in 24 hours. If the button doesn't work, copy and paste this URL:",
    // Password reset
    resetSubject: 'Reset your Reading Circle password',
    resetBody: 'We received a request to reset your password. Click the button below to choose a new password.',
    resetButton: 'Reset Password',
    resetExpiry: "This link expires in 1 hour. If you didn't request this, you can safely ignore this email.<br>If the button doesn't work, copy and paste this URL:",
    // Voting
    votingSubject: 'Voting is open: {{label}}',
    votingOpen: 'Voting is now open for <strong>{{label}}</strong>!',
    votingCandidates: 'The candidates are:',
    votingCta: 'Head over to the meet page to cast your votes.',
    votingButton: 'Vote Now',
    // Book selected
    bookSelectedSubject: '{{title}} has been selected!',
    bookSelectedBody: 'The winner has been chosen! Our next read is:',
    bookSelectedDate: 'The meet is scheduled for <strong>{{date}}</strong>.',
    bookSelectedHappy: 'Happy reading!',
    bookSelectedButton: 'View Meet',
    // Common
    urlFallback: "If the button doesn't work, copy and paste this URL:",
    by: 'by',
  },
  nl: {
    appTitle: 'Leeskring',
    // Invitation
    inviteSubject: '{{name}} heeft je uitgenodigd voor de Leeskring',
    inviteGreeting: 'Hallo! <strong>{{name}}</strong> heeft je uitgenodigd om lid te worden van de Leeskring.',
    inviteAction: 'Klik op de knop hieronder om je account aan te maken en samen boeken te ontdekken.',
    inviteButton: 'Word lid',
    inviteExpiry: 'Deze uitnodiging verloopt na 24 uur. Als de knop niet werkt, kopieer en plak deze URL:',
    // Password reset
    resetSubject: 'Reset je Leeskring-wachtwoord',
    resetBody: 'We hebben een verzoek ontvangen om je wachtwoord te resetten. Klik op de knop hieronder om een nieuw wachtwoord te kiezen.',
    resetButton: 'Wachtwoord resetten',
    resetExpiry: 'Deze link verloopt na 1 uur. Als je dit niet hebt aangevraagd, kun je deze e-mail veilig negeren.<br>Als de knop niet werkt, kopieer en plak deze URL:',
    // Voting
    votingSubject: 'Stemmen geopend: {{label}}',
    votingOpen: 'Het stemmen is geopend voor <strong>{{label}}</strong>!',
    votingCandidates: 'De kandidaten zijn:',
    votingCta: 'Ga naar de bijeenkomstpagina om je stem uit te brengen.',
    votingButton: 'Stem nu',
    // Book selected
    bookSelectedSubject: '{{title}} is geselecteerd!',
    bookSelectedBody: 'De winnaar is gekozen! Ons volgende boek is:',
    bookSelectedDate: 'De bijeenkomst is gepland op <strong>{{date}}</strong>.',
    bookSelectedHappy: 'Veel leesplezier!',
    bookSelectedButton: 'Bekijk bijeenkomst',
    // Common
    urlFallback: 'Als de knop niet werkt, kopieer en plak deze URL:',
    by: 'door',
  },
};

function t(locale: string, key: string, vars?: Record<string, string>): string {
  const strings = emailStrings[locale] || emailStrings.en!;
  let text = strings[key] || emailStrings.en![key] || key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), v);
    }
  }
  return text;
}

export async function sendInvitationEmail(email: string, token: string, inviterName: string, locale = 'en'): Promise<void> {
  const joinUrl = `${APP_URL}/join/${token}`;
  const safeInviterName = escapeHtml(inviterName);

  const html = `
    <div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <h1 style="color: #6B2737; text-align: center; font-size: 28px;">${t(locale, 'appTitle')}</h1>
      <div style="background: #FFF8F0; border-radius: 12px; padding: 30px; border: 1px solid #E8D5C4;">
        <p style="color: #4A3728; font-size: 16px; line-height: 1.6;">
          ${t(locale, 'inviteGreeting', { name: safeInviterName })}
        </p>
        <p style="color: #4A3728; font-size: 16px; line-height: 1.6;">
          ${t(locale, 'inviteAction')}
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${joinUrl}" style="background: #6B2737; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: bold;">
            ${t(locale, 'inviteButton')}
          </a>
        </div>
        <p style="color: #8B7355; font-size: 13px; text-align: center;">
          ${t(locale, 'inviteExpiry')}<br>
          <a href="${joinUrl}" style="color: #6B2737;">${joinUrl}</a>
        </p>
      </div>
    </div>
  `;

  const mailOptions = {
    from: FROM,
    to: email,
    subject: t(locale, 'inviteSubject', { name: safeInviterName }),
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

export async function sendPasswordResetEmail(email: string, token: string, locale = 'en'): Promise<void> {
  const resetUrl = `${APP_URL}/reset-password/${token}`;

  const html = `
    <div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <h1 style="color: #6B2737; text-align: center; font-size: 28px;">${t(locale, 'appTitle')}</h1>
      <div style="background: #FFF8F0; border-radius: 12px; padding: 30px; border: 1px solid #E8D5C4;">
        <p style="color: #4A3728; font-size: 16px; line-height: 1.6;">
          ${t(locale, 'resetBody')}
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background: #6B2737; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: bold;">
            ${t(locale, 'resetButton')}
          </a>
        </div>
        <p style="color: #8B7355; font-size: 13px; text-align: center;">
          ${t(locale, 'resetExpiry')}<br>
          <a href="${resetUrl}" style="color: #6B2737;">${resetUrl}</a>
        </p>
      </div>
    </div>
  `;

  const mailOptions = {
    from: FROM,
    to: email,
    subject: t(locale, 'resetSubject'),
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
  locale = 'en',
): Promise<void> {
  const meetUrl = `${APP_URL}/meets/${meetId}`;
  const safeMeetLabel = escapeHtml(meetLabel);
  const byWord = t(locale, 'by');

  const candidateList = candidates
    .map(c => `<li style="color: #4A3728; font-size: 15px; line-height: 1.8;"><strong>${escapeHtml(c.title)}</strong> ${byWord} ${escapeHtml(c.author)}</li>`)
    .join('');

  const html = `
    <div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <h1 style="color: #6B2737; text-align: center; font-size: 28px;">${t(locale, 'appTitle')}</h1>
      <div style="background: #FFF8F0; border-radius: 12px; padding: 30px; border: 1px solid #E8D5C4;">
        <p style="color: #4A3728; font-size: 16px; line-height: 1.6;">
          ${t(locale, 'votingOpen', { label: safeMeetLabel })}
        </p>
        <p style="color: #4A3728; font-size: 16px; line-height: 1.6;">
          ${t(locale, 'votingCandidates')}
        </p>
        <ul style="padding-left: 20px; margin: 16px 0;">
          ${candidateList}
        </ul>
        <p style="color: #4A3728; font-size: 16px; line-height: 1.6;">
          ${t(locale, 'votingCta')}
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${meetUrl}" style="background: #6B2737; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: bold;">
            ${t(locale, 'votingButton')}
          </a>
        </div>
        <p style="color: #8B7355; font-size: 13px; text-align: center;">
          ${t(locale, 'urlFallback')}<br>
          <a href="${meetUrl}" style="color: #6B2737;">${meetUrl}</a>
        </p>
      </div>
    </div>
  `;

  const transport = getTransporter();
  const result = await transport.sendMail({
    from: FROM,
    to: email,
    subject: t(locale, 'votingSubject', { label: safeMeetLabel }),
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
  locale = 'en',
): Promise<void> {
  const meetUrl = `${APP_URL}/meets/${meetId}`;
  const safeTitle = escapeHtml(bookTitle);
  const safeAuthor = escapeHtml(bookAuthor);
  const byWord = t(locale, 'by');

  const dateInfo = meetDate
    ? `<p style="color: #4A3728; font-size: 16px; line-height: 1.6;">${t(locale, 'bookSelectedDate', { date: escapeHtml(meetDate) })}</p>`
    : '';

  const html = `
    <div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <h1 style="color: #6B2737; text-align: center; font-size: 28px;">${t(locale, 'appTitle')}</h1>
      <div style="background: #FFF8F0; border-radius: 12px; padding: 30px; border: 1px solid #E8D5C4;">
        <p style="color: #4A3728; font-size: 16px; line-height: 1.6;">
          ${t(locale, 'bookSelectedBody')}
        </p>
        <div style="text-align: center; margin: 20px 0; padding: 20px; background: white; border-radius: 8px; border: 1px solid #E8D5C4;">
          <p style="color: #6B2737; font-size: 22px; font-weight: bold; margin: 0;">${safeTitle}</p>
          <p style="color: #8B7355; font-size: 16px; margin: 8px 0 0;">${byWord} ${safeAuthor}</p>
        </div>
        ${dateInfo}
        <p style="color: #4A3728; font-size: 16px; line-height: 1.6;">
          ${t(locale, 'bookSelectedHappy')}
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${meetUrl}" style="background: #6B2737; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: bold;">
            ${t(locale, 'bookSelectedButton')}
          </a>
        </div>
        <p style="color: #8B7355; font-size: 13px; text-align: center;">
          ${t(locale, 'urlFallback')}<br>
          <a href="${meetUrl}" style="color: #6B2737;">${meetUrl}</a>
        </p>
      </div>
    </div>
  `;

  const transport = getTransporter();
  const result = await transport.sendMail({
    from: FROM,
    to: email,
    subject: t(locale, 'bookSelectedSubject', { title: safeTitle }),
    html,
  });

  if (!process.env.SMTP_HOST && process.env.NODE_ENV !== 'production') {
    const parsed = JSON.parse(result.message);
    console.log('Email would be sent:', { to: parsed.to, subject: parsed.subject });
  }
}
