import { Resend } from 'resend';
import { PDFDocument, StandardFonts } from 'pdf-lib';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { to, subject, html, text, replyTo, bcc, from, attachPdf, pdfTitle } = req.body || {};
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
    if (attachPdf && (text || html)) {
      const doc = await PDFDocument.create();
      const page = doc.addPage([612, 792]);
      const font = await doc.embedFont(StandardFonts.Helvetica);
      const fontSize = 11;
      const margin = 50;
      const maxWidth = 612 - margin * 2;
      const lineHeight = 14;
      const content = (text || html.replace(/<br\s*\/>/g, '\n').replace(/<[^>]+>/g, '')) || '';
      const title = (pdfTitle || 'HOA Violation Notice');
      page.drawText(title, { x: margin, y: 792 - margin, size: 14, font });
      const words = content.split(/\s+/);
      let y = 792 - margin - 24;
      let line = '';
      for (const w of words) {
        const test = (line ? line + ' ' : '') + w;
        const width = font.widthOfTextAtSize(test, fontSize);
        if (width > maxWidth) {
          page.drawText(line, { x: margin, y, size: fontSize, font });
          y -= lineHeight;
          line = w;
          if (y < margin) {
            const p = doc.addPage([612, 792]);
            page = p;
            y = 792 - margin;
          }
        } else {
          line = test;
        }
      }
      if (line) page.drawText(line, { x: margin, y, size: fontSize, font });
      const pdfBytes = await doc.save();
      payload.attachments = [
        { filename: (title.replace(/\s+/g, '_').slice(0,60) || 'notice') + '.pdf', file: Buffer.from(pdfBytes) },
      ];
    }
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