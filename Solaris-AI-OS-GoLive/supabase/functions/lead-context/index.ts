// @ts-nocheck
// Sarvam "on-start" hook: tells Asha who is calling before she speaks.
// URL:  https://<project>.supabase.co/functions/v1/lead-context?token=<WEBHOOK_TOKEN>
import { json, CORS, tokenOk, leadByPhone } from '../_shared/db.ts';
import { normPhone } from '../_shared/logic.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (!tokenOk(req)) return json({ error: 'unauthorised' }, 401);
  const u = new URL(req.url);
  let b = {}; if (req.method === 'POST') { try { b = await req.json(); } catch (_) { b = {}; } }
  const flat = Object.assign({}, b, b.user_config || {}, b.metadata || {}, b.variables || {});
  const raw = u.searchParams.get('phone') || flat.user_phone_number || flat.phone || flat.caller_number || flat.from || flat.customer_phone;
  const lead = await leadByPhone(normPhone(raw));
  if (!lead) return json({ customer_name: '', area: '', monthly_bill: '', property_type: '', lead_source: '', roof_area: '', known_customer: 'No' });
  return json({
    customer_name: (lead.cf && lead.cf.nameMr) || lead.name || '',
    area: lead.area || '',
    monthly_bill: lead.bill ? String(lead.bill) : '',
    property_type: lead.type || '',
    lead_source: lead.source || '',
    roof_area: lead.roofArea ? String(lead.roofArea) : '',
    known_customer: lead.stage === 'Won' ? 'Yes' : 'No',
    last_outcome: lead.stage || ''
  });
});
