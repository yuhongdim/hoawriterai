import { saveLog, getLogs, clearLogs } from './_storage.js';

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const limit = Math.min(500, parseInt(req.query?.limit) || 100);
      const logs = await getLogs(limit);
      res.status(200).json({ ok: true, logs });
      return;
    }
    if (req.method === 'POST') {
      const entry = req.body || {};
      await saveLog({ type: 'manual', ...entry });
      res.status(200).json({ ok: true });
      return;
    }
    if (req.method === 'DELETE') {
      await clearLogs();
      res.status(200).json({ ok: true });
      return;
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    res.status(500).json({ error: e?.message || 'Unexpected error' });
  }
}