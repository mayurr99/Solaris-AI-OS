// @ts-nocheck
// New enquiry from Meta/Google lead ads, website form, IndiaMART, JustDial (via Zapier / Make / Pabbly / your website).
// Creates or updates the lead and makes Asha call it within minutes (inside calling hours).
// URL:  https://<project>.supabase.co/functions/v1/new-lead?token=<WEBHOOK_TOKEN>
import { sb, json, CORS, tokenOk, getConfig, settings, leadByPhone, upsert, uid, log } from '../_shared/db.ts';
import { normPhone, normArea, routeOwner, sizing, scoreLead, tempOf, nextInWindow } from '../_shared/logic.ts';
import { dispatchLead } from '../_shared/dispatch.ts';
import { sarvamReady } from '../_shared/sarvam.ts';

const first = (o, keys) => { for (const k of keys) { const v = o[k]; if (v != null && String(v).trim() !== '') return String(v).trim(); } return ''; };
const TYPES = { home: 'Home', house: 'Home', bungalow: 'Home', flat: 'Home', society: 'Society', apartment: 'Society', shop: 'Shop', commercial: 'Shop', factory: 'Factory', industry: 'Factory', industrial: 'Factory', school: 'Institution', hospital: 'Institution', farm: 'Farm', agriculture: 'Farm' };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (!tokenOk(req)) return json({ error: 'unauthorised' }, 401);
  let b = {};
  try { b = req.headers.get('content-type')?.includes('form') ? Object.fromEntries(await req.formData()) : await req.json(); } catch (_) { return json({ error: 'send JSON or form data' }, 400); }
  const flat = Object.assign({}, b, b.data || {}, b.fields || {});
  const phone = normPhone(first(flat, ['phone', 'phone_number', 'mobile', 'mobile_number', 'contact', 'whatsapp']));
  if (!phone) return json({ error: 'valid Indian mobile number required' }, 422);

  const now = Date.now();
  const [team, s, dnc] = await Promise.all([getConfig('team', []), settings(), getConfig('dnc', [])]);
  const source = first(flat, ['source', 'platform', 'utm_source']) || 'Website';
  const campaign = first(flat, ['campaign', 'campaign_name', 'ad_name', 'form_name']);
  const typeRaw = first(flat, ['property_type', 'type', 'segment']).toLowerCase();
  const bill = Number(first(flat, ['bill', 'monthly_bill', 'electricity_bill', 'light_bill']).replace(/[^\d.]/g, '')) || null;

  let lead = await leadByPhone(phone);
  const isNew = !lead;
  if (!lead) {
    lead = { id: uid('ld'), name: first(flat, ['name', 'full_name', 'customer_name']) || 'Enquiry ' + phone.slice(-5), contact: '', phone,
      lang: /hindi/i.test(first(flat, ['language', 'lang'])) ? 'hi' : /english/i.test(first(flat, ['language', 'lang'])) ? 'en' : 'mr',
      area: normArea(first(flat, ['area', 'city', 'locality', 'address'])), type: TYPES[Object.keys(TYPES).find((k) => typeRaw.includes(k))] || 'Home', bill,
      source, stage: 'New', temp: 'COLD', score: 0, objections: [], notes: [], consent: true, createdAt: now, tags: campaign ? [campaign] : [], agentId: 'ag_one' };
    const note = first(flat, ['notes', 'message', 'comments', 'requirement']);
    if (note) lead.notes = [{ t: note, at: now, by: source }];
    lead.owner = routeOwner(lead, team);
    if (lead.bill) { const z = sizing(lead, s); lead.sizeKw = z.kw; lead.estValue = z.cost; }
    lead.score = scoreLead(lead); lead.temp = tempOf(lead.score, lead);
  } else {
    lead = Object.assign({}, lead, { tags: Array.from(new Set([...(lead.tags || []), campaign || source])) });
    if (!lead.bill && bill) lead.bill = bill;
  }
  await upsert('leads', [lead]);
  await log(lead.id, 'crm', isNew ? `New enquiry from ${source}${campaign ? ' · ' + campaign : ''}` : `Enquired again via ${source}`);

  const blocked = lead.dnc || dnc.includes(phone) || lead.stage === 'Won';
  let queued = false, started = false, reason = '';
  const { data: pend } = await sb.from('followups').select('id').eq('lead_id', lead.id).eq('status', 'pending').eq('type', 'AI call').limit(1);
  if (!blocked && !(pend && pend.length) && (isNew || !lead.lastContact || now - lead.lastContact > 24 * 3600000)) {
    const due = nextInWindow(now, s.callingStart || '10:00', s.callingEnd || '19:00');
    const fu = { id: 'fu_new_' + lead.id + '_' + now, leadId: lead.id, type: 'AI call', dueAt: due, owner: 'ag_one', status: 'pending', note: 'New enquiry — speed-to-lead call', auto: true };
    queued = true;
    if (due <= now && !sarvamReady()) {
      try {
        const r = await dispatchLead(lead.id, { manual: false, note: 'New enquiry — speed-to-lead call' });
        if (r.ok) { started = true; fu.status = 'done'; fu.doneAt = now; } else reason = r.reason;
      } catch (e) { reason = String(e.message || e); console.error(e); }
    }
    await upsert('followups', [fu]);
  }
  return json({ ok: true, lead_id: lead.id, new: isNew, call_queued: queued, calling_now: started, note: reason || undefined });
});
