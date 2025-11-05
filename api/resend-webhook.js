import { saveLog } from './_storage.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  try {
    const event = req.body || {};
    await saveLog({ type: 'resend_event', event });
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e?.message || 'Unexpected error' });
  }
}