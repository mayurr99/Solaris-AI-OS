// @ts-nocheck
// WhatsApp sending for Solaris — Meta Cloud API (cheapest) or AiSensy (easier onboarding).
// Secrets (Edge Functions → Secrets):
//   WA_PROVIDER      meta | aisensy          (optional; picked automatically from the keys below)
//   Meta:            WA_TOKEN, WA_PHONE_ID, WA_VERIFY_TOKEN, WA_APP_SECRET (optional, verifies webhooks)
//   AiSensy:         AISENSY_API_KEY
// Template names / wording live in config 'whatsapp' (editable from the panel), not in secrets.
import { env, sb, getConfig, upsert } from './db.ts';

export const GRAPH = 'https://graph.facebook.com/' + (Deno.env.get('WA_GRAPH_VERSION') || 'v21.0');

export function waProvider() {
  const p = String(env('WA_PROVIDER', '') || '').toLowerCase();
  if (p) return p;
  if (env('WA_TOKEN') && env('WA_PHONE_ID')) return 'meta';
  if (env('AISENSY_API_KEY')) return 'aisensy';
  return '';
}
export function waReady() {
  const p = waProvider();
  if (p === 'meta') return env('WA_TOKEN') && env('WA_PHONE_ID') ? null : 'Add WA_TOKEN and WA_PHONE_ID in Supabase secrets';
  if (p === 'aisensy') return env('AISENSY_API_KEY') ? null : 'Add AISENSY_API_KEY in Supabase secrets';
  return 'WhatsApp is not connected yet (Setup → WhatsApp)';
}

/* ---------- default templates (the owner submits these to Meta / AiSensy once) ---------- */
export const DEFAULT_WA = {
  autoSend: { visit: true, callback: true, interested: true, complaint: true },
  brochureUrl: '',
  templates: {
    visit:     { name: 'solaris_visit_confirm', lang: 'mr', params: ['name', 'when', 'address'],
                 body: 'नमस्कार {{1}} जी, Solaris सोलरचा मोफत सर्व्हे {{2}} ला ठरला आहे. पत्ता: {{3}}. मागच्या 12 महिन्यांची लाईट बिलं तयार ठेवा. वेळ बदलायची असल्यास याच नंबरवर कळवा.' },
    callback:  { name: 'solaris_callback', lang: 'mr', params: ['name', 'when'],
                 body: 'नमस्कार {{1}} जी, तुम्ही सांगितल्याप्रमाणे Solaris सोलरकडून {{2}} ला परत फोन करतो. काही प्रश्न असल्यास इथेच लिहा.' },
    interested:{ name: 'solaris_brochure', lang: 'mr', params: ['name'], header: 'document',
                 body: 'नमस्कार {{1}} जी, Solaris सोलरची माहिती आणि PM सूर्य घर सबसिडीची माहिती सोबत पाठवत आहोत. मोफत सर्व्हेसाठी "हो" असा रिप्लाय करा.' },
    complaint: { name: 'solaris_complaint', lang: 'mr', params: ['name', 'ticket'],
                 body: 'नमस्कार {{1}} जी, तुमची तक्रार नोंदवली आहे (क्रमांक {{2}}). उद्या संध्याकाळी 5 पर्यंत आमची टीम संपर्क करेल.' },
    update:    { name: 'solaris_update', lang: 'mr', params: ['name', 'caption'], header: 'image',
                 body: 'नमस्कार {{1}} जी, {{2}}\n\n— Solaris सोलर, नाशिक. नको असल्यास STOP लिहा.' }
  }
};
export async function waConfig() {
  const c = (await getConfig('whatsapp', {})) || {};
  const t = Object.assign({}, DEFAULT_WA.templates);
  Object.keys(c.templates || {}).forEach((k) => { t[k] = Object.assign({}, t[k] || {}, c.templates[k]); });
  return { autoSend: Object.assign({}, DEFAULT_WA.autoSend, c.autoSend || {}), brochureUrl: c.brochureUrl || '', templates: t };
}

/* ---------- pure helpers (unit-tested) ---------- */
// WhatsApp template parameters may not contain new lines, tabs or 4+ spaces
export const cleanParam = (v) => String(v == null ? '' : v).replace(/[\r\n\t]+/g, ' ').replace(/ {2,}/g, ' ').trim().slice(0, 900) || '-';
export const waDigits = (phone) => { const d = String(phone || '').replace(/\D/g, ''); return d.length === 10 ? '91' + d : d; };
export function renderBody(body, values) { return String(body || '').replace(/\{\{(\d+)\}\}/g, (_, i) => values[Number(i) - 1] ?? ''); }

export function metaTemplatePayload(to, tpl, values, media) {
  const components = [];
  if (tpl.header && media && media.url) {
    const k = tpl.header === 'document' ? 'document' : tpl.header === 'video' ? 'video' : 'image';
    const m = { link: media.url }; if (k === 'document') m.filename = media.filename || 'Solaris.pdf';
    components.push({ type: 'header', parameters: [{ type: k, [k]: m }] });
  }
  if (values.length) components.push({ type: 'body', parameters: values.map((v) => ({ type: 'text', text: cleanParam(v) })) });
  return { messaging_product: 'whatsapp', to: waDigits(to), type: 'template', template: { name: tpl.name, language: { code: tpl.lang || 'mr' }, components } };
}
export function metaSessionPayload(to, text, media) {
  if (media && media.url) {
    const k = /\.pdf($|\?)/i.test(media.url) || media.kind === 'document' ? 'document' : 'image';
    const m = { link: media.url }; if (text) m.caption = String(text).slice(0, 1024); if (k === 'document') m.filename = media.filename || 'Solaris.pdf';
    return { messaging_product: 'whatsapp', to: waDigits(to), type: k, [k]: m };
  }
  return { messaging_product: 'whatsapp', to: waDigits(to), type: 'text', text: { body: String(text || '').slice(0, 4096), preview_url: true } };
}
export function aisensyPayload(to, name, tpl, values, media) {
  const p = { apiKey: env('AISENSY_API_KEY'), campaignName: tpl.campaign || tpl.name, destination: waDigits(to), userName: String(name || 'Customer').slice(0, 60), templateParams: values.map(cleanParam), source: 'Solaris AI OS' };
  if (media && media.url) p.media = { url: media.url, filename: media.filename || 'Solaris' };
  return p;
}

/** value for each named template parameter */
export function paramValues(tpl, ctx) { return (tpl.params || []).map((k) => ctx[k] ?? ''); }

/* ---------- 24-hour window: customer wrote to us recently → free-form (free) message allowed ---------- */
export async function sessionOpen(leadId) {
  if (!leadId) return false;
  const since = new Date(Date.now() - 23.5 * 3600e3).toISOString();
  const { data } = await sb.from('wa_messages').select('data').eq('lead_id', leadId).gte('created_at', since).order('created_at', { ascending: false }).limit(20);
  return (data || []).some((r) => r.data && r.data.dir === 'in');
}

/* ---------- send ---------- */
async function post(url, body, headers) {
  const r = await fetch(url, { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, headers || {}), body: JSON.stringify(body) });
  const txt = await r.text(); let j = null; try { j = JSON.parse(txt); } catch (_) { /* text */ }
  if (!r.ok) throw new Error((j && (j.error && (j.error.error_user_msg || j.error.message) || j.message)) || txt.slice(0, 200) || ('HTTP ' + r.status));
  return j || {};
}
/**
 * Send one WhatsApp message and log it.
 * opts: { lead, kind, tpl, values, text, media, session, id, by }
 *  - session=true  → free-form text/media (only valid within 24 h of the customer's last message)
 *  - otherwise     → approved template tpl with values
 */
export async function waSendOne(opts) {
  const lead = opts.lead || {}; const provider = waProvider();
  const miss = waReady(); if (miss) throw new Error(miss);
  const id = opts.id || 'wa_' + crypto.randomUUID().replace(/-/g, '').slice(0, 14);
  const preview = opts.session ? (opts.text || '') : renderBody(opts.tpl && opts.tpl.body, (opts.values || []).map(cleanParam));
  const rec = { id, leadId: lead.id || null, phone: lead.phone || opts.phone, dir: 'out', at: Date.now(), kind: opts.kind || 'message', text: preview,
    template: opts.session ? null : (opts.tpl && opts.tpl.name), media: opts.media && opts.media.url || null, provider, by: opts.by || 'system', status: 'sending' };
  try {
    let res;
    if (provider === 'meta') {
      const body = opts.session ? metaSessionPayload(rec.phone, opts.text, opts.media) : metaTemplatePayload(rec.phone, opts.tpl, opts.values || [], opts.media);
      res = await post(`${GRAPH}/${env('WA_PHONE_ID')}/messages`, body, { Authorization: 'Bearer ' + env('WA_TOKEN') });
      rec.waId = res.messages && res.messages[0] && res.messages[0].id || null;
    } else {
      if (opts.session && !opts.tpl) throw new Error('AiSensy sends approved templates only — pick a template');
      res = await post('https://backend.aisensy.com/campaign/t1/api/v2', aisensyPayload(rec.phone, lead.name, opts.tpl, opts.values || [], opts.media));
      rec.waId = res.submitted_message_id || res.messageId || null;
    }
    rec.status = 'sent';
  } catch (e) { rec.status = 'failed'; rec.error = String(e.message || e).slice(0, 300); }
  await upsert('wa_messages', [rec]);
  if (lead.id) await upsert('activity', [{ id: 'ac_' + id, at: rec.at, leadId: lead.id, kind: 'wa', text: (rec.status === 'sent' ? 'WhatsApp sent: ' : 'WhatsApp failed: ') + (rec.error || String(preview).slice(0, 90)) }]);
  return rec;
}

/* ---------- automatic WhatsApp after an AI call ---------- */
const MR_DAYS = ['रविवार', 'सोमवार', 'मंगळवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार'];
const MR_MON = ['जानेवारी', 'फेब्रुवारी', 'मार्च', 'एप्रिल', 'मे', 'जून', 'जुलै', 'ऑगस्ट', 'सप्टेंबर', 'ऑक्टोबर', 'नोव्हेंबर', 'डिसेंबर'];
/** "शनिवार, 27 सप्टेंबर, सकाळी 11:00" (IST) */
export function fmtMr(ms) {
  const d = new Date(ms + 5.5 * 3600e3); const h = d.getUTCHours(), m = d.getUTCMinutes();
  const part = h < 12 ? 'सकाळी' : h < 16 ? 'दुपारी' : h < 20 ? 'संध्याकाळी' : 'रात्री';
  const h12 = h % 12 || 12;
  return `${MR_DAYS[d.getUTCDay()]}, ${d.getUTCDate()} ${MR_MON[d.getUTCMonth()]}, ${part} ${h12}:${String(m).padStart(2, '0')}`;
}
/** which automatic message (if any) fits this call result — pure, unit-tested */
export function autoPlan(res, cfg) {
  const lead = res.lead || {}; const call = res.call || {}; const out = call.outcome || '';
  if (!lead.phone || lead.dnc || lead.waOptOut || lead.consent === false) return null;
  const first = String(lead.name || '').split(/\s+/)[0] || '';
  const name = /^(enquiry|caller|unknown)$/i.test(first) ? '' : (lead.name || '');
  let kind = null; const ctx = { name: name || 'ग्राहक', company: 'Solaris' }; let media = null;
  if (/Visit booked|Meeting booked/.test(out) && res.visits && res.visits[0]) { kind = 'visit'; ctx.when = fmtMr(res.visits[0].at); ctx.address = res.visits[0].address || lead.area || 'Nashik'; }
  else if (out === 'Callback') { const f = (res.followups || []).find((x) => /_cb$/.test(x.id)); if (f) { kind = 'callback'; ctx.when = fmtMr(f.dueAt); } }
  else if (out === 'Support ticket' && res.tickets && res.tickets[0]) { kind = 'complaint'; ctx.ticket = res.tickets[0].id; }
  else if (/Qualified|Contacted|Nurture/.test(out)) { if (cfg.brochureUrl) { kind = 'interested'; media = { url: cfg.brochureUrl, filename: 'Solaris-Solar.pdf' }; } }
  if (!kind || !cfg.autoSend[kind] || !cfg.templates[kind] || !cfg.templates[kind].name) return null;
  return { kind, tpl: cfg.templates[kind], values: paramValues(cfg.templates[kind], ctx), media };
}
export async function autoAfterCall(res, callKey) {
  if (waReady()) return null;
  const cfg = await waConfig(); const plan = autoPlan(res, cfg); if (!plan) return null;
  const id = 'wa_auto_' + callKey + '_' + plan.kind;
  const { data: seen } = await sb.from('wa_messages').select('id').eq('id', id).maybeSingle();
  if (seen) return null; // Sarvam retried the webhook — already sent
  return waSendOne({ lead: res.lead, kind: plan.kind, tpl: plan.tpl, values: plan.values, media: plan.media, id, by: 'AI agent' });
}
