// @ts-nocheck
// Shared "place an AI call for this lead" with every safety check.
import { sb, upsert, getConfig, settings as loadSettings, row, log } from './db.ts';
import { callCheck, e164, istMidnight } from './logic.ts';
import { placeCall } from './sarvam.ts';

export async function callsTodayCount(now) {
  const since = new Date(istMidnight(now)).toISOString();
  const { count } = await sb.from('calls').select('id', { count: 'exact', head: true }).eq('dir', 'Outbound').gte('created_at', since);
  return count || 0;
}
export async function lastCallAt(leadId) {
  const { data } = await sb.from('calls').select('created_at').eq('lead_id', leadId).order('created_at', { ascending: false }).limit(1);
  return data && data[0] ? Date.parse(data[0].created_at) : null;
}

/** returns { ok:true, attempt_id } or { ok:false, reason, permanent } */
export async function dispatchLead(leadId, { manual = false, note = '', ctx = null } = {}) {
  const now = Date.now();
  const lead = await row('leads', leadId);
  const c = ctx || { dnc: await getConfig('dnc', []), settings: await loadSettings(), callsToday: await callsTodayCount(now) };
  const reason = callCheck({ lead, dnc: c.dnc, now, settings: c.settings, callsToday: c.callsToday, lastCallAt: lead ? await lastCallAt(leadId) : null, manual });
  if (reason) {
    const permanent = /do-not-call|NDNC|consent|customer|Invalid|not found/i.test(reason);
    return { ok: false, reason, permanent };
  }
  const r = await placeCall(e164(lead.phone), { lead_id: lead.id });
  const attempt = r.attempt_id || r.id || crypto.randomUUID();
  const callId = 'cl_' + String(attempt).replace(/[^A-Za-z0-9_-]/g, '_');
  await upsert('calls', [{ id: callId, leadId: lead.id, agentId: 'ag_one', dir: 'Outbound', lang: lead.lang || 'mr', at: now, secs: 0, outcome: 'Dialling', status: 'Dialling', transcript: [], summary: note || 'AI call placed', score: lead.score || 0, attemptId: attempt, phone: lead.phone }]);
  await upsert('leads', [Object.assign({}, lead, { lastContact: now })]);
  await log(lead.id, 'call', (manual ? 'AI call started from dashboard' : 'AI call started automatically') + (note ? ' · ' + note : ''));
  if (c.callsToday != null) c.callsToday++;
  return { ok: true, attempt_id: attempt, call_id: callId };
}

/** work through due AI-call follow-ups (retries, callbacks, campaign queue) */
export async function runDue(limit) {
  const now = Date.now();
  const s = await loadSettings();
  const ctx = { dnc: await getConfig('dnc', []), settings: s, callsToday: await callsTodayCount(now) };
  const { data } = await sb.from('followups').select('data').eq('status', 'pending').eq('type', 'AI call')
    .lte('due_at', new Date(now).toISOString()).order('due_at', { ascending: true }).limit(limit);
  const out = { started: 0, skipped: 0, cancelled: 0, errors: [] };
  const seenLeads = new Set();
  for (const { data: fu } of data || []) {
    if (seenLeads.has(fu.leadId)) { continue; } seenLeads.add(fu.leadId);
    try {
      const r = await dispatchLead(fu.leadId, { manual: false, note: fu.note, ctx });
      if (r.ok) { out.started++; await upsert('followups', [Object.assign({}, fu, { status: 'done', doneAt: now, note: (fu.note || '') + ' · called' })]); }
      else if (r.permanent) { out.cancelled++; await upsert('followups', [Object.assign({}, fu, { status: 'cancelled', note: (fu.note || '') + ' · ' + r.reason })]); }
      else { out.skipped++; if (/limit|hours/i.test(r.reason)) break; }
    } catch (e) { out.errors.push(String(e.message || e)); }
  }
  // calls stuck in "Dialling" for 30+ minutes → Sarvam never reported back
  const { data: stuck } = await sb.from('calls').select('data').eq('status', 'Dialling').lt('created_at', new Date(now - 30 * 60000).toISOString()).limit(50);
  for (const { data: c } of stuck || []) {
    await upsert('calls', [Object.assign({}, c, { status: 'No result', outcome: 'No result', summary: 'No report from Sarvam within 30 min — check the call in Sarvam Monitor' })]);
  }
  return out;
}
