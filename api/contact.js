// Vercel serverless function: receives the brief form and emails hello@buzzbaazaar.com.
// Required environment variables (set in Vercel > Project > Settings > Environment Variables):
//   RESEND_API_KEY  - API key from resend.com (free tier is enough)
//   CONTACT_FROM    - a verified sender, e.g. "BuzzBaazaar Website <forms@buzzbaazaar.com>"
// Optional: CONTACT_TO (defaults to hello@buzzbaazaar.com)

const hits = new Map(); // best-effort rate limit per instance

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ ok: false }); return; }
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0] || 'unknown';
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 10 * 60 * 1000);
  if (recent.length >= 5) { res.status(429).json({ ok: false }); return; }
  recent.push(now); hits.set(ip, recent);

  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = {}; } }
  b = b || {};
  if (b.website_url) { res.status(200).json({ ok: true }); return; } // honeypot

  const need = ['name', 'email', 'company', 'promote', 'goal', 'market', 'budget', 'timeline'];
  for (const k of need) { if (!b[k] || String(b[k]).trim() === '') { res.status(400).json({ ok: false, error: 'missing ' + k }); return; } }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(b.email))) { res.status(400).json({ ok: false, error: 'email' }); return; }
  if (!b.consent) { res.status(400).json({ ok: false, error: 'consent' }); return; }

  const key = process.env.RESEND_API_KEY;
  const from = process.env.CONTACT_FROM;
  const to = process.env.CONTACT_TO || 'hello@buzzbaazaar.com';
  if (!key || !from) { res.status(503).json({ ok: false, error: 'mail not configured' }); return; }

  const rows = [['Name', b.name], ['Work email', b.email], ['Company', b.company], ['Website', b.website], ['Role', b.role],
    ['Promoting', b.promote], ['Goal', b.goal], ['Target market', b.market], ['Budget (USD)', b.budget], ['Timeline', b.timeline], ['Notes', b.notes], ['Audience', b.audience]];
  const html = '<table cellpadding="6" style="border-collapse:collapse;font-family:Arial,sans-serif">' +
    rows.map(([k, v]) => `<tr><td><b>${esc(k)}</b></td><td>${esc(v)}</td></tr>`).join('') + '</table>';
  const text = rows.map(([k, v]) => `${k}: ${v || ''}`).join('\n');

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [to], reply_to: String(b.email), subject: 'New brief: ' + String(b.company).slice(0, 80), html, text })
    });
    if (!r.ok) { res.status(502).json({ ok: false }); return; }
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(502).json({ ok: false });
  }
};
