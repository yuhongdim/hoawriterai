function getKvConfig() {
  const rawUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!rawUrl || !token) return null;
  const url = rawUrl.replace(/\/$/, '');
  return { url, token };
}

export async function saveLog(entry) {
  try {
    const cfg = getKvConfig();
    if (cfg) {
      const key = 'hoawriterai:logs';
      const value = encodeURIComponent(JSON.stringify({ ...entry, ts: Date.now() }));
      await fetch(`${cfg.url}/LPUSH/${key}/${value}`, {
        headers: { Authorization: `Bearer ${cfg.token}` },
      });
      return { ok: true };
    }
  } catch (e) {
    // fall through to memory fallback
  }
  globalThis.__HOA_LOGS__ = globalThis.__HOA_LOGS__ || [];
  globalThis.__HOA_LOGS__.unshift({ ...entry, ts: Date.now() });
  return { ok: true };
}

export async function getLogs(limit = 100) {
  try {
    const cfg = getKvConfig();
    if (cfg) {
      const key = 'hoawriterai:logs';
      const resp = await fetch(`${cfg.url}/LRANGE/${key}/0/${Math.max(0, limit - 1)}`, {
        headers: { Authorization: `Bearer ${cfg.token}` },
      });
      const json = await resp.json();
      const arr = (json.result || []).map((s) => {
        try { return JSON.parse(s); } catch { return null; }
      }).filter(Boolean);
      return arr;
    }
  } catch (e) {
    // ignore
  }
  return (globalThis.__HOA_LOGS__ || []).slice(0, limit);
}

export async function clearLogs() {
  try {
    const cfg = getKvConfig();
    if (cfg) {
      const key = 'hoawriterai:logs';
      await fetch(`${cfg.url}/DEL/${key}`, { headers: { Authorization: `Bearer ${cfg.token}` } });
      return { ok: true };
    }
  } catch (e) {
    // ignore
  }
  globalThis.__HOA_LOGS__ = [];
  return { ok: true };
}