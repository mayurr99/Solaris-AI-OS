// @ts-nocheck
// Meta WhatsApp webhook: customer replies + delivery/read ticks.
// Meta → App → WhatsApp → Configuration → Callback URL:
//   https://<project>.supabase.co/functions/v1/wa-webhook      Verify token: your WA_VERIFY_TOKEN
// Subscribe to the "messages" field.
import { sb, env, upsert, leadByPhone, uid, log } from '../_shared/db.ts';
import { normPhone, tempOf, scoreLead } from '../_shared/logic.ts';

async function validSignature(raw, header) {
  const secret = env('WA_APP_SECRET'); if (!secret) return true; // optional hardening
  if (!header) return false;
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(raw)));
  const hex = Array.from(sig).map((x) => x.toString(16).padStart(2, '0')).join('');
  return header === 'sha256=' + hex;
}
const STOP = /^\s*(stop|unsubscribe|बंद|नको|mat bhejo|मत भेजो)\s*$/i;

Deno.serve(async (req) => {
  const u = new URL(req.url);
  if (req.method === 'GET') {
    const ok = u.searchParams.get('hub.mode') === 'subscribe' && env('WA_VERIFY_TOKEN') && u.searchParams.get('hub.verify_token') === env('WA_VERIFY_TOKEN');
    return new Response(ok ? (u.searchParams.get('hub.challenge') || '') : 'forbidden', { status: ok ? 200 : 403 });
  }
  const raw = await req.text();
  if (!(await validSignature(raw, req.headers.get('x-hub-signature-256')))) return new Response('bad signature', { status: 401 });
  let body; try { body = JSON.parse(raw); } catch (_) { return new Response('ok'); }

  try {
    for (const entry of body.entry || []) for (const ch of entry.changes || []) {
      const v = ch.value || {};
      // delivery ticks
      for (const st of v.statuses || []) {
        const { data } = await sb.from('wa_messages').select('data').eq('data->>waId', st.id).maybeSingle();
        if (data && data.data) {
          const rank = { sending: 0, sent: 1, delivered: 2, read: 3, failed: 4 };
          const cur = data.data.status;
          if ((rank[st.status] ?? 0) >= (rank[cur] ?? 0)) await upsert('wa_messages', [Object.assign({}, data.data, { status: st.status, error: st.errors && st.errors[0] ? (st.errors[0].title || st.errors[0].message) : data.data.error })]);
        }
      }
      // customer messages
      const names = {}; (v.contacts || []).forEach((c) => { names[c.wa_id] = c.profile && c.profile.name; });
      for (const m of v.messages || []) {
        const phone = normPhone(m.from);
        let lead = await leadByPhone(phone);
        const text = m.text ? m.text.body : m.button ? m.button.text : m.interactive ? JSON.stringify(m.interactive).slice(0, 200) : '[' + m.type + ']';
        if (!lead && phone) {
          lead = { id: uid('ld'), name: names[m.from] || 'WhatsApp ' + phone.slice(-5), contact: '', phone, lang: 'mr', area: '', type: 'Home', bill: null, source: 'WhatsApp', stage: 'New', temp: 'COLD', score: 0, objections: [], notes: [], consent: true, createdAt: Date.now(), tags: ['WhatsApp'] };
          await log(lead.id, 'crm', 'New lead from a WhatsApp message');
        }
        if (!lead) continue;
        if (STOP.test(text || '')) { lead.waOptOut = true; await log(lead.id, 'sys', 'Customer replied STOP — no more WhatsApp broadcasts'); }
        else if (/^\s*(हो|हाँ|ho|yes|haan|ha)(?=$|[\s,.!])/i.test(text || '') && lead.stage === 'New') { lead.stage = 'Contacted'; }
        lead.lastWa = Date.now(); lead.score = scoreLead(lead); lead.temp = tempOf(lead.score, lead);
        await upsert('leads', [lead]);
        await upsert('wa_messages', [{ id: 'wa_' + m.id.replace(/[^A-Za-z0-9_-]/g, '_'), waId: m.id, leadId: lead.id, phone, dir: 'in', at: Number(m.timestamp) * 1000 || Date.now(), kind: m.type, text, status: 'received' }]);
        await log(lead.id, 'wa', 'WhatsApp from customer: ' + String(text).slice(0, 90));
      }
    }
  } catch (e) { console.error('wa-webhook', e); }
  return new Response('ok'); // always 200 so Meta doesn't disable the webhook
});
