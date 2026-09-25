// @ts-nocheck
// Sarvam "on-start" hook: tells Asha who is on the line before she speaks.
// URL:  https://<project>.supabase.co/functions/v1/lead-context?token=<WEBHOOK_TOKEN>
import { json, CORS, tokenOk, leadByPhone, sb } from '../_shared/db.ts';
import { normPhone, istParts } from '../_shared/logic.ts';

const pad = (n) => String(n).padStart(2, '0');
const istStamp = (ms) => { const p = istParts(ms); return `${p.y}-${pad(p.mo + 1)}-${pad(p.d)} ${pad(p.h)}:${pad(p.m)}`; };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (!tokenOk(req)) return json({ error: 'unauthorised' }, 401);
  const u = new URL(req.url);
  let b = {}; if (req.method === 'POST') { try { b = await req.json(); } catch (_) { b = {}; } }
  const flat = Object.assign({}, b, b.user_config || {}, b.metadata || {}, b.variables || {});
  const raw = u.searchParams.get('phone') || flat.user_phone_number || flat.phone || flat.caller_number || flat.from || flat.customer_phone;
  const hint = String(flat.direction || flat.call_direction || flat.call_type || u.searchParams.get('direction') || '').toLowerCase();
  const lead = await leadByPhone(normPhone(raw));
  const out = { customer_name: '', area: '', address: '', monthly_bill: '', property_type: '', lead_source: '', roof_area: '', known_customer: 'No', visit_time: '', last_outcome: '' };
  if (/outbound|outgoing/.test(hint)) out.call_direction = 'Outbound';
  else if (/inbound|incoming/.test(hint)) out.call_direction = 'Inbound';
  if (!lead) return json(out);

  const now = Date.now();
  // Solaris dialled this lead in the last 10 minutes → this is our outbound call
  if (!out.call_direction) {
    const { data: dial } = await sb.from('calls').select('id').eq('lead_id', lead.id).eq('status', 'Dialling').gte('created_at', new Date(now - 10 * 60000).toISOString()).limit(1);
    if (dial && dial.length) out.call_direction = 'Outbound';
  }
  const { data: vs } = await sb.from('visits').select('data').eq('lead_id', lead.id);
  const next = (vs || []).map((r) => r.data).filter((v) => ['Scheduled', 'Confirmed'].includes(v.status) && v.at > now).sort((a, c) => a.at - c.at)[0];

  Object.assign(out, {
    customer_name: (lead.cf && lead.cf.nameMr) || lead.name || '',
    area: lead.area || '',
    address: lead.address || (next && next.address) || '',
    monthly_bill: lead.bill ? String(lead.bill) : '',
    property_type: lead.type || '',
    lead_source: lead.source || '',
    roof_area: lead.roofArea ? String(lead.roofArea) : '',
    known_customer: lead.stage === 'Won' ? 'Yes' : 'No',
    visit_time: next ? istStamp(next.at) : '',
    last_outcome: lead.stage || ''
  });
  return json(out);
});
