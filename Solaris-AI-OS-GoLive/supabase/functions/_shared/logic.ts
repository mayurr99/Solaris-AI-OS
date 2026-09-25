// @ts-nocheck
// Solaris AI OS — pure business logic shared by the edge functions.
// No network or database code here, so it can be unit-tested anywhere.

export const AREAS = [
  ['Gangapur Road', 'West'], ['College Road', 'West'], ['Makhmalabad', 'West'], ['Trimbakeshwar', 'West'],
  ['Indira Nagar', 'East'], ['CIDCO', 'East'], ['Pathardi Phata', 'East'], ['Dwarka', 'East'], ['Adgaon', 'East'],
  ['Satpur MIDC', 'Industrial'], ['Ambad MIDC', 'Industrial'], ['Sinnar', 'Industrial'], ['Malegaon', 'Industrial'],
  ['Nashik Road', 'North'], ['Deolali Camp', 'North'], ['Panchavati', 'North'], ['Niphad', 'North'], ['Ozar', 'North'], ['Dindori', 'North'], ['Igatpuri', 'North']
];
export const STAGES = ['New', 'Contacted', 'Qualified', 'Site Survey', 'Quotation Sent', 'Negotiation', 'Won', 'Lost'];
const MIN = 60000, HOUR = 3600000, DAY = 86400000;
const IST = 330 * MIN;

export const DEFAULTS = {
  tariffHome: 10, tariffCommercial: 12, priceHome: 60000, priceCommercial: 45000,
  callingStart: '10:00', callingEnd: '19:00', hardStart: '09:00', hardEnd: '21:00',
  maxAttempts: 3, retryGapHours: 4, dailyCap: 300, recallGuardHours: 2, nurtureDays: 30
};

/* ---------- phone ---------- */
export function normPhone(raw) {
  let d = String(raw == null ? '' : raw).replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
  if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  if (d.length !== 10 || !/^[6-9]/.test(d)) return null;
  return '+91 ' + d.slice(0, 5) + ' ' + d.slice(5);
}
export const e164 = (p) => (p ? '+' + String(p).replace(/\D/g, '') : null);

/* ---------- time (IST) ---------- */
export function istParts(ms) {
  const d = new Date(ms + IST);
  return { y: d.getUTCFullYear(), mo: d.getUTCMonth(), d: d.getUTCDate(), h: d.getUTCHours(), m: d.getUTCMinutes(), dow: d.getUTCDay() };
}
export function istMidnight(ms) { const p = istParts(ms); return Date.UTC(p.y, p.mo, p.d) - IST; }
const hm = (s) => { const [h, m] = String(s || '0:0').split(':').map(Number); return h * 60 + (m || 0); };
export function inWindow(ms, start, end) { const p = istParts(ms); const t = p.h * 60 + p.m; return t >= hm(start) && t < hm(end); }
/** next moment (>= ms) inside the calling window */
export function nextInWindow(ms, start, end) {
  if (inWindow(ms, start, end)) return ms;
  const p = istParts(ms); const t = p.h * 60 + p.m;
  const base = istMidnight(ms) + hm(start) * MIN;
  return t < hm(start) ? base : base + DAY;
}
/** parse "2026-09-27 11:00", "2026-09-27T11:00", ISO with zone, or epoch ms → epoch ms (IST assumed when no zone) */
export function parseWhen(v, now) {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return v > 1e12 ? v : v * 1000;
  const s = String(v).trim();
  if (/^\d{12,13}$/.test(s)) return Number(s);
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})(?::\d{2})?(Z|[+-]\d{2}:?\d{2})?$/);
  if (m) {
    if (m[6]) { const t = Date.parse(s.replace(' ', 'T')); return isNaN(t) ? null : t; }
    return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) - IST;
  }
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return Date.UTC(+m[1], +m[2] - 1, +m[3], 11, 0) - IST; // date only → 11 AM
  const t = Date.parse(s);
  if (!isNaN(t) && (!now || t > now - 2 * DAY)) return t;
  return relativeWhen(s, now || Date.now());
}
/** spoken Marathi / Hindi / English: "उद्या संध्याकाळी", "परवा सकाळी 11", "कल शाम 6 बजे", "Saturday morning" */
export function relativeWhen(s, now) {
  const t = s.toLowerCase();
  let dayOff = null;
  if (/आज|today/.test(t)) dayOff = 0;
  if (/उद्या|कल|tomorrow/.test(t)) dayOff = 1;
  if (/परवा|परसों|day after/.test(t)) dayOff = 2;
  const DOW = [[/रविवार|sunday/, 0], [/सोमवार|monday/, 1], [/मंगळवार|मंगलवार|tuesday/, 2], [/बुधवार|wednesday/, 3], [/गुरुवार|thursday/, 4], [/शुक्रवार|friday/, 5], [/शनिवार|saturday/, 6]];
  const todayDow = istParts(now).dow;
  for (const [re, d] of DOW) if (re.test(t)) { dayOff = (d - todayDow + 7) % 7 || 7; break; }
  if (dayOff == null) return null;
  let hour = 11;
  if (/संध्याकाळ|शाम|evening/.test(t)) hour = 18;
  else if (/दुपार|दोपहर|afternoon/.test(t)) hour = 15;
  else if (/सकाळ|सुबह|morning/.test(t)) hour = 11;
  const num = t.replace(/[०-९]/g, (c) => String('०१२३४५६७८९'.indexOf(c))).match(/(\d{1,2})(?:[:.](\d{2}))?/);
  let min = 0;
  if (num) { let h = Number(num[1]); min = Number(num[2] || 0); if (h >= 1 && h <= 12) { if (hour >= 15 && h < 12) h += 12; if (hour === 11 && h < 8) h += 12; hour = h; } else if (h >= 13 && h <= 21) hour = h; }
  return istMidnight(now) + dayOff * DAY + hour * HOUR + min * MIN;
}
export const fmtIST = (ms) => {
  const p = istParts(ms); const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][p.mo];
  const h12 = p.h % 12 || 12; return `${p.d} ${mon}, ${h12}:${String(p.m).padStart(2, '0')} ${p.h < 12 ? 'AM' : 'PM'}`;
};

/* ---------- solar maths / scoring (same as dashboard) ---------- */
export function sizing(lead, s) {
  s = Object.assign({}, DEFAULTS, s || {});
  const commercial = ['Factory', 'Shop', 'Institution'].includes(lead.type);
  const tariff = commercial ? s.tariffCommercial : s.tariffHome;
  const units = (Number(lead.bill) || 0) / tariff;
  let kw = Math.max(1, Math.round((units / 120) * 2) / 2);
  if (lead.type === 'Home' || lead.type === 'Farm' || !lead.type) kw = Math.min(kw, 10);
  // roof space caps the system: ~100 sq ft of shadow-free roof per kW
  const roofKw = Number(lead.roofArea) > 0 ? Math.max(1, Math.floor((Number(lead.roofArea) / 100) * 2) / 2) : 0;
  const roofLimited = roofKw > 0 && roofKw < kw;
  if (roofLimited) kw = roofKw;
  let subsidy = 0;
  if (!lead.type || lead.type === 'Home' || lead.type === 'Farm') subsidy = Math.min(78000, Math.min(kw, 2) * 30000 + (kw > 2 ? Math.min(kw - 2, 1) * 18000 : 0));
  if (lead.type === 'Society') subsidy = Math.min(kw, 500) * 18000;
  const cost = kw * (commercial ? s.priceCommercial : s.priceHome);
  return { kw, subsidy, cost, roofLimited, roofKw };
}
export function scoreLead(l) {
  if (l.dnc) return 0;
  let s = 0; const kw = l.sizeKw || (l.bill ? sizing(l).kw : 0);
  if (kw >= 10) s += 30; else if (kw >= 4) s += 26; else if (kw >= 3) s += 22; else if (kw >= 2) s += 15; else if (kw > 0) s += 8;
  if (l.roofOwn === 'Yes') s += 20; else if (l.roofOwn === 'Society roof') s += 12;
  s += ({ Immediately: 22, 'This month': 18, '1–3 months': 11, '3–6 months': 6, '6+ months': 2 }[l.timeline] || 0);
  if (l.finance) s += 5; if (l.history) s += 4; if (l.visitBooked) s += 15; if (l.answered) s += 6;
  if ((l.objections || []).includes('Rented property') || l.roofOwn === 'No (rented)') s -= 25;
  return Math.max(0, Math.min(100, Math.round(s)));
}
export const tempOf = (score, l) => (l && l.dnc) ? 'DNC' : score >= 75 ? 'HOT' : score >= 50 ? 'WARM' : score >= 25 ? 'NURTURE' : 'COLD';

export function normArea(v) {
  const t = String(v || '').toLowerCase().trim(); if (!t) return '';
  const a = AREAS.find(([en]) => t.includes(en.toLowerCase()) || en.toLowerCase().includes(t));
  return a ? a[0] : String(v).trim();
}
const zoneOf = (area) => (AREAS.find(([en]) => en === area) || [])[1] || 'North';
export function routeOwner(lead, team) {
  const sales = (team || []).filter((t) => t.role === 'Sales' && t.active !== false);
  if (!sales.length) return lead.owner || null;
  if (['Factory', 'Shop', 'Institution'].includes(lead.type)) { const c = sales.find((t) => (t.segments || []).includes(lead.type)); if (c) return c.id; }
  const byArea = sales.find((t) => (t.areas || []).includes(lead.area)); if (byArea) return byArea.id;
  // round-robin by phone digits so the same lead always lands on the same person
  const n = Number(String(lead.phone || '0').replace(/\D/g, '').slice(-3)) || 0;
  return sales[n % sales.length].id;
}
export function surveyorFor(area, team) {
  const z = zoneOf(area);
  const s = (team || []).find((t) => t.role === 'Surveyor' && t.active !== false && (t.areas || []).includes(z));
  return (s || (team || []).find((t) => t.role === 'Surveyor') || {}).id || null;
}

/* ---------- Sarvam output variables → CRM fields ---------- */
const pick = (v) => (v == null ? '' : String(v).trim());
const yes = (v) => /^(yes|true|1|हो|हाँ)$/i.test(pick(v));
const ENUM = {
  property: { home: 'Home', society: 'Society', shop: 'Shop', factory: 'Factory', institution: 'Institution', farm: 'Farm' },
  roof: { own: 'Yes', rented: 'No (rented)', 'society roof': 'Society roof' },
  timeline: { immediately: 'Immediately', 'this month': 'This month', '1-3 months': '1–3 months', '3-6 months': '3–6 months', '6+ months': '6+ months' }
};
// "600", "600 sq ft", "20x30", "20 by 30 feet", "1,200" → square feet (null if unusable)
export function roofSqft(v) {
  const t = pick(v).toLowerCase().replace(/[०-९]/g, (c) => String('०१२३४५६७८९'.indexOf(c))).replace(/,/g, '');
  if (!t) return null;
  const dims = t.match(/(\d+(?:\.\d+)?)\s*(?:x|\*|×|by|बाय)\s*(\d+(?:\.\d+)?)/);
  let n = dims ? Number(dims[1]) * Number(dims[2]) : Number((t.match(/\d+(?:\.\d+)?/) || [])[0]);
  if (/sq\s*m|square met|चौरस मीटर|मीटर/.test(t) && !/feet|foot|ft|फूट|फुट/.test(t)) n = n * 10.764;
  if (/guntha|गुंठ/.test(t)) n = n * 1089;
  return n >= 50 && n <= 500000 ? Math.round(n) : null;
}
export function visitAddress(lead) {
  const a = String(lead.address || '').trim(); const area = lead.area || '';
  if (!a) return (area ? area + ', ' : '') + 'Nashik';
  const low = a.toLowerCase();
  return a + (area && !low.includes(area.toLowerCase()) ? ', ' + area : '') + (low.includes('nashik') || low.includes('नाशिक') ? '' : ', Nashik');
}
export function mapVars(vars) {
  const v = vars || {}; const out = {};
  const prop = ENUM.property[pick(v.property || v.property_type).toLowerCase()]; if (prop) out.type = prop;
  const bill = Number(pick(v.bill_amount || v.monthly_bill).replace(/[^\d.]/g, '')); if (bill >= 100 && bill < 5e6) out.bill = Math.round(bill);
  const loc = normArea(v.locality || v.area); if (loc) out.area = loc;
  const roof = ENUM.roof[pick(v.roof_owner).toLowerCase()]; if (roof) out.roofOwn = roof;
  const ra = roofSqft(v.roof_area_sqft || v.roof_area || v.house_area); if (ra) out.roofArea = ra;
  const ad = pick(v.address || v.visit_address || v.full_address); if (ad.length >= 6 && !/^(unknown|none|na|n\/a|not given)$/i.test(ad)) out.address = ad;
  const tl = ENUM.timeline[pick(v.timeline).toLowerCase().replace(/\s+/g, ' ').replace('–', '-')]; if (tl) out.timeline = tl;
  const obj = pick(v.objections); if (obj) out.objections = obj.split(/[,;]/).map((x) => x.trim()).filter(Boolean).map((x) => ({ price: 'Price', monsoon: 'Monsoon / cloudy days', 'other quotes': 'Getting other quotes', rented: 'Rented property' }[x.toLowerCase()] || x));
  const nm = pick(v.customer_name); if (nm) out.name = nm;
  out.surveyBooked = yes(v.survey_booked);
  out.surveyTime = pick(v.survey_time);
  out.callbackTime = pick(v.callback_time);
  out.interest = pick(v.interest);
  out.dnc = yes(v.dnc);
  out.support = pick(v.support_issue);
  out.callType = pick(v.call_type);
  out.summary = pick(v.summary);
  return out;
}

/* ---------- transcript ---------- */
export function mapTranscript(t, startMs) {
  if (!Array.isArray(t)) return [];
  return t.map((x, i) => {
    const role = String(x.role || x.speaker || '').toLowerCase();
    const text = x.text || x.native_text || x.content || x.original_text || x.en_text || '';
    return { s: /agent|assistant|bot|ai/.test(role) ? 'ai' : /system|tool/.test(role) ? 'sys' : 'cust', t: String(text), at: (startMs || 0) + i * 4000 };
  }).filter((m) => m.t);
}

/* ---------- the main job: one Sarvam webhook → CRM changes ---------- */
/**
 * ctx = { payload, lead (existing CRM lead or null), existingCall (or null), openVisit (or null),
 *         team, settings, dnc (array), now, uid(prefix) }
 * returns { lead, call, visits:[], followups:[], tickets:[], activity:[], addDnc: phone|null, notes:[] }
 */
export function processWebhook(ctx) {
  const p = ctx.payload || {}; const now = ctx.now || Date.now(); const s = Object.assign({}, DEFAULTS, ctx.settings || {});
  const uid = ctx.uid || ((pre) => pre + '_' + Math.random().toString(36).slice(2, 10));
  const res = { lead: null, call: null, visits: [], followups: [], tickets: [], activity: [], addDnc: null, notes: [] };

  const vars = Object.assign({}, p.final_agent_variables || {}, p.output_agent_variables || {});
  const m = mapVars(vars);
  const rawPhone = p.user_phone_number || (ctx.existingCall && ctx.existingCall.phone) || (ctx.lead && ctx.lead.phone);
  const phone = normPhone(rawPhone);
  const status = String(p.status || (p.interaction_id ? 'connected' : 'unknown')).toLowerCase();
  const connected = status === 'connected' || (!p.status && !!p.interaction_id);
  const callKey = String(p.attempt_id || p.interaction_id || uid('x')).replace(/[^A-Za-z0-9_-]/g, '_');
  const callId = (ctx.existingCall && ctx.existingCall.id) || 'cl_' + callKey;
  const startMs = Date.parse(p.start_datetime || '') || (ctx.existingCall && ctx.existingCall.at) || now - (Number(p.duration) || 0) * 1000;

  // ---- lead: find or create ----
  let lead = ctx.lead ? JSON.parse(JSON.stringify(ctx.lead)) : null;
  const isNew = !lead;
  if (!lead) {
    lead = { id: uid('ld'), name: m.name || (phone ? 'Caller ' + phone.slice(-5) : 'Unknown caller'), contact: '', phone, lang: 'mr', area: '', type: '', bill: null,
      source: p.agent_phone_number && !p.attempt_id ? 'Inbound call' : 'AI call', stage: 'New', temp: 'COLD', score: 0, objections: [], notes: [], consent: true,
      createdAt: startMs, tags: ['Sarvam'] };
  }
  const aid = (id, n) => 'ac_' + callKey + '_' + n;

  // ---- not connected: retry logic ----
  if (!connected) {
    const outcome = status === 'busy' ? 'Busy' : status === 'no_answer' ? 'No answer' : 'Failed';
    lead.attempts = (lead.attempts || 0) + 1; lead.lastContact = now;
    const reason = pick(p.failure_reason);
    const ndnc = /ndnc|dnd|do not disturb/i.test(reason);
    res.call = Object.assign({}, ctx.existingCall || {}, { id: callId, leadId: lead.id, agentId: 'ag_one', dir: 'Outbound', lang: lead.lang || 'mr', at: startMs, secs: 0, outcome, status: outcome, transcript: [], summary: outcome + (reason ? ' — ' + reason : ''), score: lead.score || 0, attemptId: p.attempt_id || null, interactionId: null, phone });
    if (ndnc) {
      lead.ndnc = true; lead.notes = [{ t: 'Number is on TRAI NDNC — AI will not call. Salesperson may call manually only if customer enquired.', at: now, by: 'System' }].concat(lead.notes || []);
      res.activity.push({ id: aid(0, 'ndnc'), at: now, leadId: lead.id, kind: 'sys', text: 'Call blocked by telecom: number on TRAI NDNC list' });
      res.followups.push({ id: 'fu_' + callKey + '_manual', leadId: lead.id, type: 'Sales call', dueAt: nextInWindow(now + 30 * MIN, s.callingStart, s.callingEnd), owner: lead.owner, status: 'pending', note: 'NDNC number — call manually (customer had enquired)', auto: true });
    } else if (status === 'failed') {
      res.activity.push({ id: aid(0, 'fail'), at: now, leadId: lead.id, kind: 'sys', text: 'AI call failed' + (reason ? ': ' + reason : '') });
    } else if (lead.attempts < s.maxAttempts) {
      const due = nextInWindow(now + s.retryGapHours * HOUR, s.callingStart, s.callingEnd);
      res.followups.push({ id: 'fu_' + callKey + '_retry', leadId: lead.id, type: 'AI call', dueAt: due, owner: 'ag_one', status: 'pending', note: `Retry — attempt ${lead.attempts + 1} of ${s.maxAttempts}`, auto: true });
      res.activity.push({ id: aid(0, 'na'), at: now, leadId: lead.id, kind: 'call', text: `${outcome} — AI will retry ${fmtIST(due)}` });
    } else {
      res.followups.push({ id: 'fu_' + callKey + '_human', leadId: lead.id, type: 'Sales call', dueAt: nextInWindow(now + 30 * MIN, s.callingStart, s.callingEnd), owner: lead.owner, status: 'pending', note: `Not reachable after ${lead.attempts} AI calls — send WhatsApp and try once personally`, auto: true });
      res.activity.push({ id: aid(0, 'max'), at: now, leadId: lead.id, kind: 'call', text: `${outcome} — ${lead.attempts} attempts done, handed to salesperson` });
    }
    lead.score = scoreLead(lead); lead.temp = tempOf(lead.score, lead);
    res.lead = lead; return res;
  }

  // ---- connected: update lead fields (never erase existing values with blanks) ----
  ['type', 'bill', 'area', 'roofOwn', 'roofArea', 'address', 'timeline'].forEach((k) => { if (m[k] != null && m[k] !== '') lead[k] = m[k]; });
  if (m.name && (isNew || /^Caller |^Unknown/.test(lead.name))) lead.name = m.name;
  if (m.objections) lead.objections = Array.from(new Set([...(lead.objections || []), ...m.objections]));
  lead.answered = true; lead.lastContact = now; lead.attempts = 0;
  if (!lead.owner) lead.owner = routeOwner(lead, ctx.team);
  if (lead.bill) {
    const z = sizing(lead, s); lead.sizeKw = z.kw; lead.estValue = z.cost;
    if (z.roofLimited) res.activity.push({ id: aid(0, 'roof'), at: now, leadId: lead.id, kind: 'sys', text: `Roof ~${lead.roofArea} sq ft fits about ${z.kw} kW (bill needs more) — surveyor to check other roof / carport space` });
  }

  const transcript = mapTranscript(p.interaction_transcript, startMs);
  let outcome = lead.bill ? 'Qualified' : 'Contacted';
  const fwd = (st) => { if (STAGES.indexOf(st) > STAGES.indexOf(lead.stage || 'New') && !['Won', 'Lost'].includes(lead.stage)) lead.stage = st; };

  if (m.dnc) {
    outcome = 'DNC'; lead.dnc = true; res.addDnc = lead.phone;
    if (!['Won'].includes(lead.stage)) { lead.stage = 'Lost'; lead.lostReason = 'Asked not to be called'; }
    res.activity.push({ id: aid(0, 'dnc'), at: now, leadId: lead.id, kind: 'sys', text: 'Customer asked not to be called — added to DNC, all follow-ups stopped' });
  } else if (m.support || /existing/i.test(m.callType)) {
    outcome = 'Support ticket';
    res.tickets.push({ id: 'TK-' + callKey.slice(-6).toUpperCase(), leadId: lead.id, at: now, subject: m.support || 'Existing customer called — details in transcript', status: 'Open', owner: 'u_owner' });
    res.followups.push({ id: 'fu_' + callKey + '_support', leadId: lead.id, type: 'Sales call', dueAt: istMidnight(now + DAY) + 17 * HOUR, owner: 'u_owner', status: 'pending', note: 'Support callback promised by 5 PM: ' + (m.support || 'see transcript'), auto: true });
  } else if (m.surveyBooked) {
    const at = parseWhen(m.surveyTime, now);
    const society = lead.type === 'Society'; const commercial = ['Factory', 'Shop', 'Institution'].includes(lead.type);
    outcome = society || commercial ? 'Meeting booked' : 'Visit booked';
    lead.visitBooked = true; fwd('Site Survey');
    if (at && at > now - HOUR) {
      const v = ctx.openVisit ? Object.assign({}, ctx.openVisit) : { id: 'vs_' + callKey, leadId: lead.id, reminders: { wa24: false, aiConfirm: false, wa2: false } };
      Object.assign(v, { kind: society ? 'Society meeting' : commercial ? 'Factory meeting' : 'Site survey', at, mins: society || commercial ? 60 : 45,
        with: society || commercial ? lead.owner : (surveyorFor(lead.area, ctx.team) || lead.owner), address: visitAddress(lead), status: 'Scheduled', notes: 'Booked by AI on call' + (lead.address ? '' : ' · address not captured') });
      res.visits.push(v);
      res.followups.push({ id: 'fu_' + callKey + '_confirm', leadId: lead.id, type: 'Sales call', dueAt: Math.max(now + 10 * MIN, at - 3 * HOUR), owner: lead.owner, status: 'pending', note: 'Confirm tomorrow\'s visit with the customer (WhatsApp or call)', auto: true });
      res.activity.push({ id: aid(0, 'visit'), at: now, leadId: lead.id, kind: 'visit', text: v.kind + ' booked by AI for ' + fmtIST(at) + (lead.address ? ' · ' + lead.address : '') });
      if (!lead.address) res.followups.push({ id: 'fu_' + callKey + '_addr', leadId: lead.id, type: 'Sales call', dueAt: now + 15 * MIN, owner: lead.owner, status: 'pending', note: 'Visit booked but full address missing — get it on WhatsApp (house no., building, landmark)', auto: true });
    } else {
      res.followups.push({ id: 'fu_' + callKey + '_fixtime', leadId: lead.id, type: 'Sales call', dueAt: now + 15 * MIN, owner: lead.owner, status: 'pending', note: 'Customer agreed to a survey — fix exact time: "' + (m.surveyTime || 'not captured') + '"', auto: true });
    }
  } else if (m.callbackTime) {
    outcome = 'Callback'; fwd(lead.bill ? 'Qualified' : 'Contacted');
    const at = parseWhen(m.callbackTime, now);
    const due = nextInWindow(at && at > now ? at : now + DAY, s.callingStart, s.callingEnd);
    res.followups.push({ id: 'fu_' + callKey + '_cb', leadId: lead.id, type: 'AI call', dueAt: due, owner: 'ag_one', status: 'pending', note: 'Customer asked for a callback' + (at ? '' : ': "' + m.callbackTime + '"'), auto: true });
  } else if (/not interested/i.test(m.interest)) {
    outcome = 'Not interested';
    if (STAGES.indexOf(lead.stage || 'New') < STAGES.indexOf('Quotation Sent')) { lead.stage = 'Lost'; lead.lostReason = 'Not interested on AI call'; }
    res.followups.push({ id: 'fu_' + callKey + '_winback', leadId: lead.id, type: 'AI call', dueAt: nextInWindow(now + 90 * DAY, s.callingStart, s.callingEnd), owner: 'ag_one', status: 'pending', note: '90-day check-in', auto: true });
  } else if (/nurture/i.test(m.interest)) {
    outcome = 'Nurture'; fwd('Contacted');
    res.followups.push({ id: 'fu_' + callKey + '_nurture', leadId: lead.id, type: 'AI call', dueAt: nextInWindow(now + s.nurtureDays * DAY, s.callingStart, s.callingEnd), owner: 'ag_one', status: 'pending', note: s.nurtureDays + '-day nurture call', auto: true });
  } else {
    fwd(lead.bill ? 'Qualified' : 'Contacted');
    res.followups.push({ id: 'fu_' + callKey + '_next', leadId: lead.id, type: 'Sales call', dueAt: nextInWindow(now + 2 * HOUR, s.callingStart, s.callingEnd), owner: lead.owner, status: 'pending', note: 'Interested but no survey booked — personal call to close the survey', auto: true });
  }

  lead.score = scoreLead(lead);
  if (/^hot$/i.test(m.interest) && lead.score < 75) lead.score = 75;
  lead.temp = tempOf(lead.score, lead);

  const summary = m.summary || [
    lead.type ? lead.type : null, lead.area ? 'in ' + lead.area : null, lead.bill ? 'bill ₹' + lead.bill.toLocaleString('en-IN') : null,
    lead.roofOwn ? 'roof: ' + lead.roofOwn + (lead.roofArea ? ' ~' + lead.roofArea + ' sq ft' : '') : lead.roofArea ? 'roof ~' + lead.roofArea + ' sq ft' : null, (m.objections || []).length ? 'objections: ' + m.objections.join(', ') : null,
    outcome + (m.surveyTime && m.surveyBooked ? ' (' + m.surveyTime + ')' : m.callbackTime ? ' (' + m.callbackTime + ')' : '')
  ].filter(Boolean).join(' · ');

  res.call = Object.assign({}, ctx.existingCall || {}, {
    id: callId, leadId: lead.id, agentId: 'ag_one', dir: ctx.existingCall ? ctx.existingCall.dir : (p.attempt_id ? 'Outbound' : 'Inbound'), lang: lead.lang || 'mr',
    at: startMs, secs: Math.round(Number(p.duration) || 0), outcome, status: outcome, transcript, summary, score: lead.score, recording: !!p.interaction_id,
    interactionId: p.interaction_id || null, attemptId: p.attempt_id || null, phone, vars
  });
  res.activity.push({ id: aid(0, 'call'), at: now, leadId: lead.id, kind: 'crm', text: `AI call ${outcome} · score ${lead.score} (${lead.temp}) · ${Math.round(Number(p.duration) || 0)} s` });
  if (lead.temp === 'HOT' && !m.dnc) res.activity.push({ id: aid(0, 'hot'), at: now, leadId: lead.id, kind: 'hot', text: 'HOT lead — call personally within 30 minutes' });
  if (isNew) res.activity.push({ id: aid(0, 'new'), at: startMs, leadId: lead.id, kind: 'crm', text: 'New lead created from Sarvam call' });
  res.lead = lead;
  return res;
}

/* ---------- can we place an AI call to this lead right now? ---------- */
export function callCheck({ lead, dnc, now, settings, callsToday, lastCallAt, manual }) {
  const s = Object.assign({}, DEFAULTS, settings || {});
  if (!lead) return 'Lead not found';
  if (!normPhone(lead.phone)) return 'Invalid mobile number';
  if (lead.dnc || (dnc || []).includes(lead.phone)) return 'Number is on the do-not-call list';
  if (lead.ndnc && !manual) return 'Number is on TRAI NDNC — call manually';
  if (lead.consent === false) return 'No consent recorded for this lead';
  if (lead.stage === 'Won') return 'Already a customer — use the support flow';
  const win = manual ? [s.hardStart, s.hardEnd] : [s.callingStart, s.callingEnd];
  if (!inWindow(now, win[0], win[1])) return `Outside calling hours (${win[0]}–${win[1]} IST)`;
  if (callsToday >= s.dailyCap) return `Daily call limit reached (${s.dailyCap})`;
  if (!manual && lastCallAt && now - lastCallAt < s.recallGuardHours * HOUR) return 'Called in the last ' + s.recallGuardHours + ' hours';
  return null;
}
