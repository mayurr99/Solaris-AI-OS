// @ts-nocheck
// Dashboard → "AI call now" (one lead) or "Start calling" (a list of leads, queued).
import { json, CORS, staffUser, upsert, log } from '../_shared/db.ts';
import { dispatchLead, runDue } from '../_shared/dispatch.ts';
import { sarvamReady } from '../_shared/sarvam.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  const user = await staffUser(req);
  if (!user) return json({ error: 'Please log in to the dashboard again' }, 401);
  const missing = sarvamReady(); if (missing) return json({ error: missing }, 500);
  let body; try { body = await req.json(); } catch (_) { return json({ error: 'body must be JSON' }, 400); }

  try {
    if (body.lead_id) {
      const r = await dispatchLead(body.lead_id, { manual: true, note: 'by ' + (user.email || 'staff') });
      return r.ok ? json(r) : json({ ok: false, error: r.reason }, 409);
    }
    if (Array.isArray(body.lead_ids) && body.lead_ids.length) {
      const now = Date.now(); const name = String(body.campaign || 'Campaign').slice(0, 80);
      const ids = Array.from(new Set(body.lead_ids)).slice(0, 2000);
      await upsert('followups', ids.map((id, i) => ({ id: 'fu_q_' + id + '_' + now, leadId: id, type: 'AI call', dueAt: now + i, owner: 'ag_one', status: 'pending', note: 'Campaign: ' + name, auto: true })));
      await log(ids[0], 'sys', `Campaign "${name}" queued ${ids.length} leads by ${user.email || 'staff'}`);
      const first = await runDue(Number(Deno.env.get('BATCH_SIZE') || 5));
      return json({ ok: true, queued: ids.length, started_now: first.started, note: 'The rest are called automatically every few minutes inside calling hours.' });
    }
    return json({ error: 'send lead_id or lead_ids' }, 400);
  } catch (e) {
    console.error(e);
    return json({ ok: false, error: String(e.message || e) }, 502);
  }
});
