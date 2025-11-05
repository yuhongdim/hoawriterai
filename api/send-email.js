import { Resend } from 'resend';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { to, subject, html, text, replyTo, bcc, from } = req.body || {};
    if (!to || !subject || (!html && !text)) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: 'RESEND_API_KEY is not configured' });
      return;
    }

    const resend = new Resend(apiKey);
    const payload = {
      from: from || 'HOAWriterAI <onboarding@resend.dev>',
      to,
      subject,
      html: html || `<pre style="white-space:pre-wrap">${(text || '').replace(/</g, '&lt;')}</pre>`,
      text,
    };
    if (replyTo) { payload.reply_to = replyTo; payload.replyTo = replyTo; }
    if (bcc) { payload.bcc = Array.isArray(bcc) ? bcc : [bcc]; }
    const { data, error } = await resend.emails.send(payload);

    if (error) {
      res.status(500).json({ error: error.message || 'Email send failed' });
      return;
    }

    res.status(200).json({ ok: true, id: data?.id || null });
  } catch (e) {
    res.status(500).json({ error: e?.message || 'Unexpected error' });
  }
}