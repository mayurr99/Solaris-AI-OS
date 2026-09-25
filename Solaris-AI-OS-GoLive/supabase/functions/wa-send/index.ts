// @ts-nocheck
// Send WhatsApp to one or many leads.
//  • Panel (logged-in staff): { lead_ids, template_key?, content_id?, captions?: {leadId: text}, text? }
//  • Sarvam agent tool (?token=WEBHOOK_TOKEN): { phone, kind: "interested" | "visit" | "callback" }
import { sb, json, CORS, staffUser, tokenOk, leadByPhone, getConfig } from '../_shared/db.ts';
import { normPhone } from '../_shared/logic.ts';
import { waReady, waConfig, waSendOne, sessionOpen, paramValues, fmtMr } from '../_shared/whatsapp.ts';
import { firstName } from '../_shared/captions.ts';
import { sarvamReady } from '../_shared/sarvam.ts';
import { env } from '../_shared/db.ts';
import { waProvider } from '../_shared/whatsapp.ts';

async function leadsByIds(ids) {
  const out = [];
  for (let i = 0; i < ids.length; i += 100) {
    const { data } = await sb.from('leads').select('data').in('id', ids.slice(i, i + 100));
    (data || []).forEach((r) => out.push(r.data));
  }
  return out;
}
async function nextVisit(leadId) {
  const { data } = await sb.from('visits').select('data').eq('lead_id', leadId);
  return (data || []).map((r) => r.data).filter((v) => ['Scheduled', 'Confirmed'].includes(v.status) && v.at > Date.now()).sort((a, b) => a.at - b.at)[0] || null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  const viaAgent = tokenOk(req);
  const user = viaAgent ? null : await staffUser(req);
  if (!viaAgent && !user) return json({ error: 'Please log in again' }, 401);
  let b; try { b = await req.json(); } catch (_) { return json({ error: 'body must be JSON' }, 400); }
  // Setup screen: what is connected? (no secrets are returned)
  if (b.check && user) return json({ ok: true, whatsapp: { provider: waProvider() || null, ready: !waReady(), note: waReady() }, voice: { ready: !sarvamReady(), note: sarvamReady() }, captions: { ready: !!(env('SARVAM_LLM_KEY') || env('SARVAM_API_KEY')) }, webhookToken: !!env('WEBHOOK_TOKEN'), waWebhook: !!env('WA_VERIFY_TOKEN') });
  const miss = waReady(); if (miss) return json({ ok: false, error: miss }, 400);

  const cfg = await waConfig();
  const company = ((await getConfig('profile', {})) || {}).company || 'Solaris';
  let leads = [];
  if (viaAgent) {
    const l = await leadByPhone(normPhone(b.phone || b.user_phone_number)); if (l) leads = [l];
    if (!['interested', 'visit', 'callback'].includes(b.kind || 'interested')) return json({ error: 'kind not allowed' }, 400);
  } else {
    const ids = Array.from(new Set([].concat(b.lead_ids || [], b.lead_id ? [b.lead_id] : []))).slice(0, 300);
    leads = await leadsByIds(ids);
  }
  if (!leads.length) return json({ ok: false, error: 'No matching lead' }, 404);

  let content = null;
  if (b.content_id) { const { data } = await sb.from('content').select('data').eq('id', b.content_id).maybeSingle(); content = data && data.data; }
  const key = viaAgent ? (b.kind || 'interested') : (b.template_key || (content ? 'update' : 'interested'));
  const tpl = cfg.templates[key];
  if (!tpl || !tpl.name) return json({ ok: false, error: 'Template "' + key + '" is not set up (Setup → WhatsApp)' }, 400);
  const media = content && (content.mediaUrl || content.image) ? { url: content.mediaUrl || content.image, filename: content.fileName, kind: content.mediaKind }
    : key === 'interested' && cfg.brochureUrl ? { url: cfg.brochureUrl, filename: 'Solaris-Solar.pdf', kind: 'document' } : null;
  if (tpl.header && !media && !b.session_only) return json({ ok: false, error: 'This template needs an image/PDF — add one to the content first' }, 400);

  const results = []; let sent = 0, failed = 0, skipped = 0;
  for (const lead of leads) {
    if (lead.dnc || lead.waOptOut || lead.consent === false) { skipped++; results.push({ id: lead.id, status: 'skipped', reason: lead.waOptOut ? 'Replied STOP' : lead.dnc ? 'Do-not-call' : 'No consent' }); continue; }
    const caption = (b.captions && b.captions[lead.id]) || b.text || (content && content.caption) || '';
    const name = firstName(lead.name) || 'ग्राहक';
    const v = key === 'visit' || key === 'callback' ? await nextVisit(lead.id) : null;
    const ctx = { name, caption: String(caption).replace(/\{name\}/g, name), company, address: (v && v.address) || lead.address || lead.area || 'Nashik', when: v ? fmtMr(v.at) : '', ticket: b.ticket || '' };
    try {
      const open = caption && await sessionOpen(lead.id);
      if (b.session_only && !open) { skipped++; results.push({ id: lead.id, status: 'skipped', reason: 'Chat window closed (24 h) — send a template instead' }); continue; }
      const rec = open
        ? await waSendOne({ lead, kind: key, session: true, text: ctx.caption, media, by: user ? user.email : 'AI agent' })
        : await waSendOne({ lead, kind: key, tpl, values: paramValues(tpl, ctx), media, by: user ? user.email : 'AI agent' });
      if (rec.status === 'sent') sent++; else failed++;
      results.push({ id: lead.id, status: rec.status, error: rec.error, free: !!open });
    } catch (e) { failed++; results.push({ id: lead.id, status: 'failed', error: String(e.message || e) }); }
  }
  return json({ ok: true, sent, failed, skipped, results });
});
