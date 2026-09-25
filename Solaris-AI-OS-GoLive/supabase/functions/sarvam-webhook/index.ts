// @ts-nocheck
// Receives every finished Sarvam call and updates the CRM.
// URL to give Sarvam:  https://<project>.supabase.co/functions/v1/sarvam-webhook?token=<WEBHOOK_TOKEN>
import { sb, json, CORS, tokenOk, getConfig, setConfig, settings, row, leadByPhone, upsert, uid } from '../_shared/db.ts';
import { processWebhook, normPhone } from '../_shared/logic.ts';
import { autoAfterCall } from '../_shared/whatsapp.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (!tokenOk(req)) return json({ error: 'unauthorised' }, 401);
  let payload;
  try { payload = await req.json(); } catch (_) { return json({ error: 'body must be JSON' }, 400); }

  try {
    const key = String(payload.attempt_id || payload.interaction_id || '').replace(/[^A-Za-z0-9_-]/g, '_');
    const existingCall = key ? await row('calls', 'cl_' + key) : null;
    const metaLead = payload.webhook_config && payload.webhook_config.metadata && payload.webhook_config.metadata.lead_id;
    let lead = null;
    if (existingCall) lead = await row('leads', existingCall.leadId);
    if (!lead && metaLead) lead = await row('leads', metaLead);
    if (!lead) lead = await leadByPhone(normPhone(payload.user_phone_number));

    let openVisit = null;
    if (lead) {
      const { data: vs } = await sb.from('visits').select('data').eq('lead_id', lead.id);
      openVisit = (vs || []).map((v) => v.data).find((v) => ['Scheduled', 'Confirmed'].includes(v.status) && v.at > Date.now()) || null;
    }
    const [team, s, dnc] = await Promise.all([getConfig('team', []), settings(), getConfig('dnc', [])]);

    const res = processWebhook({ payload, lead, existingCall, openVisit, team, settings: s, dnc, now: Date.now(), uid });

    await upsert('leads', [res.lead]);
    await upsert('calls', [res.call]);
    await upsert('visits', res.visits);
    await upsert('followups', res.followups);
    await upsert('tickets', res.tickets);
    await upsert('activity', res.activity);

    if (res.addDnc) {
      if (!dnc.includes(res.addDnc)) await setConfig('dnc', dnc.concat([res.addDnc]));
      const { data: open } = await sb.from('followups').select('data').eq('lead_id', res.lead.id).eq('status', 'pending');
      await upsert('followups', (open || []).map((f) => Object.assign({}, f.data, { status: 'cancelled', note: (f.data.note || '') + ' · stopped: DNC' })));
    }
    // WhatsApp follow-up (visit confirmation, callback time, brochure, complaint number) — never blocks the CRM update
    let wa = null;
    try { wa = await autoAfterCall(res, key || res.call.id); } catch (e) { console.error('auto whatsapp', e); }
    return json({ ok: true, lead_id: res.lead.id, outcome: res.call && res.call.outcome, whatsapp: wa ? wa.status : null });
  } catch (e) {
    console.error('webhook error', e);
    // 500 makes Sarvam retry the delivery later; every write above is idempotent, so a retry is safe
    return json({ error: String(e.message || e) }, 500);
  }
});
