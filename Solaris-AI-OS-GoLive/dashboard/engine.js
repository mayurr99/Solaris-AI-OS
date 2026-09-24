/* Solaris AI OS — engine: store, seed, scoring, routing, call simulation, voice, AI, Excel. */
(function () {
  const D = window.SOL_DATA;
  const KEY = 'solaris-ai-os-v1';
  const MIN = 60000, HOUR = 3600000, DAY = 86400000;

  /* ---------------- utils ---------------- */
  const uid = (p) => p + '_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const inr = (n) => (n == null || isNaN(n)) ? '—' : '₹' + Math.round(n).toLocaleString('en-IN');
  const num = (n) => Math.round(n).toLocaleString('en-IN');
  const inrShort = (n) => { if (n == null) return '—'; if (n >= 1e7) return '₹' + (n / 1e7).toFixed(2) + ' Cr'; if (n >= 1e5) return '₹' + (n / 1e5).toFixed(1) + ' L'; return inr(n); };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const startOfDay = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
  const fmtTime = (t) => new Date(t).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  const fmtDate = (t) => new Date(t).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  const fmtDay = (t) => new Date(t).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  const fmtDT = (t) => fmtDay(t) + ', ' + fmtTime(t);
  const rel = (t) => {
    const d = t - Date.now(), a = Math.abs(d);
    if (a < MIN) return 'now';
    const u = a < HOUR ? Math.round(a / MIN) + ' min' : a < DAY ? Math.round(a / HOUR) + ' h' : Math.round(a / DAY) + ' d';
    return d < 0 ? u + ' ago' : 'in ' + u;
  };
  const dur = (s) => { s = Math.round(s || 0); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  const normPhone = (raw) => {
    let d = String(raw == null ? '' : raw).replace(/\D/g, '');
    if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
    if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
    if (d.length !== 10 || !/^[6-9]/.test(d)) return null;
    return '+91 ' + d.slice(0, 5) + ' ' + d.slice(5);
  };
  const maskPhone = (p) => p ? p.replace(/(\+91 \d{2})\d{3} (\d{2})\d{3}/, '$1XXX XX$2') : '';
  const areaDv = (en) => (D.AREAS.find((a) => a.en === en) || {}).dv || en;
  const zoneOf = (en) => (D.AREAS.find((a) => a.en === en) || {}).zone || 'North';
  const DV_TEAM = { 'Amit Deshmukh': 'अमित देशमुख', 'Priya Kulkarni': 'प्रिया कुलकर्णी', 'Rohit Jadhav': 'रोहित जाधव', 'Sagar Pawar': 'सागर पवार', 'Ganesh More': 'गणेश मोरे', 'Vishal Shinde': 'विशाल शिंदे' };
  const DV_AGENT = { Asha: 'आशा', Sakhi: 'सखी', Arjun: 'अर्जुन', Meera: 'मीरा', Seva: 'सेवा', Smita: 'स्मिता' };
  const DAY_MR = ['रविवारी', 'सोमवारी', 'मंगळवारी', 'बुधवारी', 'गुरुवारी', 'शुक्रवारी', 'शनिवारी'];
  const DAY_HI = ['रविवार', 'सोमवार', 'मंगलवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार'];
  const LANG = { mr: 'Marathi', hi: 'Hindi', en: 'English' };

  /* seeded rng */
  let _s = 20260924;
  const rnd = () => { _s = (_s * 1664525 + 1013904223) % 4294967296; return _s / 4294967296; };
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const between = (a, b) => a + rnd() * (b - a);
  const wpick = (pairs) => { let t = pairs.reduce((s, p) => s + p[1], 0), r = rnd() * t; for (const p of pairs) { r -= p[1]; if (r <= 0) return p[0]; } return pairs[0][0]; };

  /* ---------------- solar maths ---------------- */
  function sizing(lead, settings) {
    const s = settings || (S.state && S.state.settings) || defaultSettings();
    const commercial = ['Factory', 'Shop', 'Institution'].includes(lead.type);
    const tariff = commercial ? s.tariffCommercial : s.tariffHome;
    const bill = Number(lead.bill) || 0;
    const units = bill / tariff;
    let kw = Math.max(1, Math.round((units / 120) * 2) / 2);
    if (lead.type === 'Home' || lead.type === 'Farm') kw = Math.min(kw, 10);
    // roof space caps the system: ~100 sq ft of shadow-free roof per kW
    const roofKw = Number(lead.roofArea) > 0 ? Math.max(1, Math.floor((Number(lead.roofArea) / 100) * 2) / 2) : 0;
    const roofLimited = roofKw > 0 && roofKw < kw;
    if (roofLimited) kw = roofKw;
    let subsidy = 0;
    if (lead.type === 'Home' || lead.type === 'Farm') subsidy = Math.min(kw, 2) * 30000 + (kw > 2 ? Math.min(kw - 2, 1) * 18000 : 0);
    if (lead.type === 'Society') subsidy = Math.min(kw, 500) * 18000;
    const perKw = commercial ? s.priceCommercial : s.priceHome;
    const cost = kw * perKw;
    const yearSave = Math.round(Math.min(units, kw * 120) * tariff * 12 * 0.9 / 1000) * 1000;
    const payback = yearSave ? (cost - subsidy) / yearSave : null;
    return { kw, subsidy: Math.min(subsidy, lead.type === 'Society' ? 9e9 : 78000), cost, yearSave, payback, roofNeed: Math.round(kw * 90), units: Math.round(units), roofLimited, roofKw };
  }

  function scoreLead(l) {
    if (l.temp === 'DNC' || l.dnc) return 0;
    let s = 0;
    const kw = l.sizeKw || (l.bill ? sizing(l).kw : 0);
    if (kw >= 10) s += 30; else if (kw >= 4) s += 26; else if (kw >= 3) s += 22; else if (kw >= 2) s += 15; else if (kw > 0) s += 8;
    if (l.roofOwn === 'Yes') s += 20; else if (l.roofOwn === 'Society roof') s += 12;
    s += ({ Immediately: 22, 'This month': 18, '1–3 months': 11, '3–6 months': 6, '6+ months': 2 }[l.timeline] || 0);
    if (l.finance) s += 5;
    if (l.history) s += 4;
    if (l.visitBooked) s += 15;
    if (l.answered) s += 6;
    if ((l.objections || []).includes('Rented property')) s -= 25;
    return clamp(Math.round(s), 0, 100);
  }
  const tempOf = (score, l) => (l && (l.dnc || l.temp === 'DNC')) ? 'DNC' : score >= 75 ? 'HOT' : score >= 50 ? 'WARM' : score >= 25 ? 'NURTURE' : 'COLD';

  function routeOwner(l, team) {
    team = team || S.state.team;
    const sales = team.filter((t) => t.role === 'Sales' && t.active);
    if (['Factory', 'Shop', 'Institution'].includes(l.type)) { const c = sales.find((t) => (t.segments || []).includes(l.type)); if (c) return c.id; }
    const byArea = sales.find((t) => (t.areas || []).includes(l.area));
    if (byArea) return byArea.id;
    return sales.length ? sales[Math.floor(Math.random() * sales.length)].id : null;
  }
  const surveyorFor = (area, team) => { team = team || S.state.team; const z = zoneOf(area); const s = team.find((t) => t.role === 'Surveyor' && t.active && (t.areas || []).includes(z)); return (s || team.find((t) => t.role === 'Surveyor') || {}).id; };
  const person = (id) => (S.state.team.find((t) => t.id === id) || { name: 'Unassigned' });
  const agentById = (id) => S.state.agents.find((a) => a.id === id) || S.state.agents[0];

  /* ---------------- scripts ---------------- */
  function genderize(text, g) { return text.replace(/\{([^{}|]+)\|([^{}|]+)\}/g, (m, f, mm) => (g === 'm' ? mm : f)); }
  function fillVars(text, v) { return text.replace(/\{(\w+)\}/g, (m, k) => (v[k] != null ? v[k] : m)); }
  function scriptVars(lead, agent, opts) {
    opts = opts || {};
    const sz = sizing(lead);
    const first = (lead.name || '').split(' ')[0];
    const isOrg = ['Society', 'Factory', 'Shop', 'Institution'].includes(lead.type);
    const nm = isOrg ? lead.name : (D.DV_FIRST[first] || first);
    const owner = person(lead.owner);
    const vd = opts.visitAt ? new Date(opts.visitAt).getDay() : 6;
    return {
      name: nm, agentDv: DV_AGENT[agent.name] || agent.name, bill: num(lead.bill || 0), areaDv: areaDv(lead.area), roof: num(lead.roofArea || sz.roofNeed + 200),
      kw: String(sz.kw), subsidy: num(sz.subsidy), yearSave: num(sz.yearSave), sales: DV_TEAM[owner.name] || owner.name,
      visitDayDv: DAY_MR[vd], visitDayHi: DAY_HI[vd],
      visitTimeMr: (() => { const hh = opts.visitAt ? new Date(opts.visitAt).getHours() : 11; const h12 = hh > 12 ? hh - 12 : hh; return (hh < 12 ? 'सकाळी ' : hh < 16 ? 'दुपारी ' : 'संध्याकाळी ') + h12 + ' वाजता'; })(),
      visitTimeHi: (() => { const hh = opts.visitAt ? new Date(opts.visitAt).getHours() : 11; const h12 = hh > 12 ? hh - 12 : hh; return (hh < 12 ? 'सुबह ' : hh < 16 ? 'दोपहर ' : 'शाम ') + h12 + ' बजे'; })()
    };
  }
  function renderLine(text, lead, agent, opts) { return fillVars(genderize(text, agent.voice.gender), scriptVars(lead, agent, opts)); }
  function pickScenario(lead) {
    if (lead.existing) return 'subsidy';
    if (lead.type === 'Society') return 'society';
    if (['Factory', 'Shop', 'Institution'].includes(lead.type)) return 'factory';
    return wpick([['res_hot', 40], ['res_callback', 30], ['rented', 14], ['dnc', 6]]);
  }
  function agentFor(lead, scen) {
    if (scen === 'subsidy') return roleAgent('support');
    if (lead.type !== 'Home' && lead.type !== 'Farm') return roleAgent('commercial');
    if (['Missed call', 'Website', 'Walk-in', 'Referral'].includes(lead.source)) return roleAgent('inbound');
    return roleAgent('outbound');
  }
  function nextDow(from, dow, hour, minGapDays) {
    const d = new Date(from + (minGapDays || 1) * DAY); d.setHours(hour, 0, 0, 0);
    while (d.getDay() !== dow) d.setTime(d.getTime() + DAY);
    return d.getTime();
  }
  function visitPlan(scen, callAt) {
    if (scen === 'society') return { at: nextDow(callAt, Math.random() < 0.6 ? 0 : 6, Math.random() < 0.5 ? 18 : 19, 1), kind: 'Society meeting', mins: 60 };
    if (scen === 'factory') return { at: nextDow(callAt, 1 + Math.floor(Math.random() * 5), [10, 11, 12, 15][Math.floor(Math.random() * 4)], 1), kind: 'Factory meeting', mins: 60 };
    const d = new Date(callAt + (1 + Math.floor(Math.random() * 3)) * DAY); if (d.getDay() === 0) d.setTime(d.getTime() + DAY);
    d.setHours([10, 11, 11, 12, 16, 17][Math.floor(Math.random() * 6)], Math.random() < 0.3 ? 30 : 0, 0, 0); return { at: d.getTime(), kind: 'Site survey', mins: 45 };
  }
  function summaryFor(scen, lead, sz, visitAt) {
    const b = inr(lead.bill), a = lead.area; const when = visitAt ? fmtDT(visitAt) : 'the agreed slot';
    return ({
      res_hot: `Home owner in ${a}, bill ${b}/month, own roof ~${num(lead.roofArea)} sq ft. Suggested ${sz.kw} kW; eligible for ${inr(sz.subsidy)} PM Surya Ghar subsidy. Price objection handled with EMI. Free site survey booked for ${when}; asked to keep 12-month bills ready (MSEDCL capacity rule).`,
      res_callback: `Flat owner in ${a}, bill ${b}. Worried about monsoon generation — explained net metering. Roof belongs to society; wants to discuss with family. Callback booked for day after tomorrow, 6 PM.`,
      society: `Secretary of a 48-flat society in ${a}. Common-meter bill ${b}. Needs committee approval; ${sz.kw} kW with ₹18,000/kW RWA subsidy pitched. Committee meeting booked for ${when}; 12-month bills and roof photos requested.`,
      factory: `LT industrial unit in ${a}, bill ${b}, two shifts, metal-sheet roof ~${num(lead.roofArea)} sq ft. High daytime load, ~${sz.kw} kW. Wanted pricing immediately → live-transferred to sales; site meeting ${when}.`,
      subsidy: `Existing customer: subsidy not received 3 months after install. Net meter fitted and commissioning report uploaded. Bank-account linkage unverified → ticket raised for subsidy team, callback by tomorrow 5 PM.`,
      dnc: `Filled ad form by mistake, not interested, asked not to be called. Added to DNC list; all sequences stopped.`,
      rented: `Tenant in ${a}, bill ${b}. Not eligible now (rented). Plans to buy own house next year → nurture; reminder call in 3 months.`
    })[scen] || '';
  }

  /* apply one line's field hints onto a lead */
  function applyHints(lead, hints, scen, ctx) {
    if (!hints) return [];
    const changed = [];
    const set = (k, v) => { if (lead[k] !== v) { lead[k] = v; changed.push(k); } };
    const sz = sizing(lead);
    if (hints.bill) set('billConfirmed', true);
    if (hints.type) changed.push('type');
    if (hints.area) changed.push('area');
    if (hints.roofOwn) set('roofOwn', scen === 'rented' ? 'No (rented)' : scen === 'res_callback' ? 'Society roof' : 'Yes');
    if (hints.roofArea) changed.push('roofArea');
    if (hints.sizeKw) set('sizeKw', sz.kw);
    if (hints.objection) { lead.objections = Array.from(new Set([...(lead.objections || []), hints.objection])); changed.push('objections'); }
    if (hints.finance) set('finance', hints.finance);
    if (hints.timeline) set('timeline', hints.timeline);
    if (hints.history) set('history', hints.history);
    if (hints.visit) { set('visitBooked', true); }
    if (hints.dnc) { set('dnc', true); }
    if (hints.transfer) changed.push('transfer');
    lead.answered = true;
    lead.score = scoreLead(lead); lead.temp = tempOf(lead.score, lead);
    return changed;
  }

  /* ---------------- default settings ---------------- */
  function defaultSettings() {
    return {
      company: 'Solaris', city: 'Nashik', businessNumber: '+91 253 400 1100 (demo)', callingStart: '10:00', callingEnd: '19:00', respectHours: false,
      tariffHome: 10, tariffCommercial: 12, priceHome: 60000, priceCommercial: 45000, costPerMin: 7,
      simSpeed: 1, voiceOn: true, maxConcurrent: 2, agentMode: 'single', maskPhones: false, uiLang: 'en', viewAs: 'owner', brandColor: '#2447B8', logo: '', tagline: 'Nashik · by Move.AI', stageLabels: {}, customFields: [{ key: 'nameMr', label: 'Name in Marathi (for the AI voice)' }, { key: 'consumerNo', label: 'MSEDCL consumer no.' }, { key: 'sanctionedLoad', label: 'Sanctioned load (kW)' }],
      home: { kpis: ['calls', 'qualified', 'booked', 'speed'], widgets: [{ id: 'live', on: true }, { id: 'attention', on: true }, { id: 'hot', on: true }, { id: 'chart', on: true }, { id: 'visits', on: true }, { id: 'agents', on: true }, { id: 'pipeline', on: false }, { id: 'activity', on: true }] },
      waTemplates: JSON.parse(JSON.stringify(D.WA_TEMPLATES)), cadence: JSON.parse(JSON.stringify(D.CADENCE))
    };
  }

  /* ---------------- seed ---------------- */
  function buildCall(lead, scen, lang, agent, at, visitAt) {
    const sc = D.SCRIPTS[scen];
    const lines = sc[lang] || sc.mr;
    let t = at; const transcript = [];
    const probe = JSON.parse(JSON.stringify(lead));
    lines.forEach(([s, txt, hints]) => {
      transcript.push({ s, t: renderLine(txt, lead, agent, { visitAt }), at: t });
      applyHints(probe, hints, scen);
      t += (3 + txt.length / 9) * 1000;
    });
    return { transcript, end: t, probe };
  }

  function seed() {
    _s = 20260924;
    const now = Date.now();
    const st = {
      v: 1, seededAt: now, settings: defaultSettings(), team: JSON.parse(JSON.stringify(D.TEAM)), agents: JSON.parse(JSON.stringify(D.AGENTS)),
      leads: [], calls: [], followups: [], visits: [], activity: [], campaigns: [], dnc: ['+91 98220 11111'], tickets: [], imports: []
    };
    S.state = st;
    const usedPhones = new Set();
    const mkPhone = () => { let p; do { p = '+91 ' + pick(['98', '97', '96', '90', '88', '77', '70', '93']) + String(Math.floor(between(100, 999))) + ' ' + String(Math.floor(between(10000, 99999))); } while (usedPhones.has(p)); usedPhones.add(p); return p; };

    const usedNames = new Set();
    const uniq = (list, person) => { if (!list) { let n = person, k = 0; while (usedNames.has(n) && k++ < 20) n = pick(D.FIRST) + ' ' + pick(D.LAST); usedNames.add(n); return n; } const free = list.filter((x) => !usedNames.has(x)); const n = free.length ? pick(free) : pick(list) + ' ' + (usedNames.size % 9 + 2); usedNames.add(n); return n; };
    const N = 58;
    for (let i = 0; i < N; i++) {
      const type = wpick([['Home', 72], ['Society', 10], ['Factory', 18]]);
      const industrial = D.AREAS.filter((a) => a.zone === 'Industrial').map((a) => a.en);
      const area = (type === 'Factory') ? pick(industrial) : pick(D.AREAS.filter((a) => a.zone !== 'Industrial' || rnd() < 0.2).map((a) => a.en));
      const bill = Math.round(({ Home: between(1400, 7000), Society: between(18000, 65000), Shop: between(5000, 22000), Factory: between(60000, 320000), Institution: between(20000, 90000), Farm: between(2500, 9000) })[type] / 100) * 100;
      const fn = pick(D.FIRST), ln = pick(D.LAST);
      const name = uniq(type === 'Society' ? D.SOCIETIES : type === 'Factory' ? D.FIRMS.slice(0, 12) : null, fn + ' ' + ln);
      const dayAgo = Math.floor(Math.pow(rnd(), 1.4) * 7);
      const created = startOfDay(now - dayAgo * DAY) + between(8, 21.8) * HOUR;
      if (created > now - 20 * MIN) continue;
      const source = wpick([['Meta Ads', 34], ['Google Ads', 16], ['Website', 14], ['Missed call', 12], ['Referral', 8], ['JustDial', 6], ['IndiaMART', type === 'Factory' ? 10 : 1], ['Walk-in', 3]]);
      const lang = (['Agarwal', 'Sharma', 'Gupta', 'Jain'].includes(ln) || type === 'Factory' && rnd() < 0.5) ? 'hi' : (rnd() < 0.72 ? 'mr' : 'hi');
      const lead = {
        id: uid('ld'), name, contact: ['Society', 'Factory', 'Shop', 'Institution'].includes(type) ? fn + ' ' + ln : '', phone: mkPhone(), lang, area, type, bill, source,
        roofArea: type === 'Factory' ? Math.round(between(3000, 12000) / 100) * 100 : Math.round(between(350, 1200) / 10) * 10,
        stage: 'New', temp: 'COLD', score: 0, objections: [], notes: [], consent: true, createdAt: created, tags: [], existing: false
      };
      lead.owner = routeOwner(lead, st.team);
      const scen = rnd() < 0.13 ? 'noanswer' : pickScenario(lead);
      lead.scenario = scen;
      st.leads.push(lead);
      const agentId = agentFor(lead, scen === 'noanswer' ? 'x' : scen);
      lead.agentId = agentId;
      const agent = agentById(agentId);
      const speed = source === 'Missed call' ? between(0.5, 2) : between(0.8, 4);
      const callAt = created + speed * MIN;
      if (scen === 'noanswer') {
        st.calls.push({ id: uid('cl'), leadId: lead.id, agentId, dir: 'Outbound', lang, at: callAt, secs: 0, outcome: 'No answer', transcript: [], summary: 'No answer. Retry scheduled (attempt 1 of 3).', score: 0 });
        lead.stage = 'New'; lead.lastContact = callAt; lead.attempts = 1;
        st.followups.push({ id: uid('fu'), leadId: lead.id, type: 'AI call', dueAt: callAt + 4 * HOUR, owner: agentId, status: callAt + 4 * HOUR < now ? 'missed' : 'pending', note: 'Retry — attempt 2 of 3', auto: true });
        lead.score = scoreLead(lead); lead.temp = tempOf(lead.score, lead);
        continue;
      }
      const vp = visitPlan(scen, callAt);
      const built = buildCall(lead, scen, lang, agent, callAt, vp.at);
      Object.assign(lead, built.probe, { id: lead.id });
      lead.lastContact = built.end;
      const sz = sizing(lead);
      lead.sizeKw = sz.kw; lead.estValue = sz.cost;
      const sc = D.SCRIPTS[scen];
      const call = { id: uid('cl'), leadId: lead.id, agentId, dir: source === 'Missed call' || scen === 'subsidy' ? 'Inbound' : 'Outbound', lang, at: callAt, secs: Math.round((built.end - callAt) / 1000), outcome: sc.outcome, transcript: built.transcript, summary: summaryFor(scen, lead, sz, vp.at), score: lead.score, recording: true };
      st.calls.push(call);
      if (scen === 'subsidy') { lead.existing = true; lead.stage = 'Won'; lead.postSale = 3; lead.temp = 'WARM'; st.tickets.push({ id: 'TK-' + (1040 + st.tickets.length), leadId: lead.id, at: built.end, subject: 'Subsidy not received — verify bank linkage on national portal', status: 'Open', owner: 'u_owner' }); st.followups.push({ id: uid('fu'), leadId: lead.id, type: 'Sales call', dueAt: startOfDay(built.end + DAY) + 17 * HOUR, owner: 'u_owner', status: 'pending', note: 'Subsidy team: verify bank account on PM Surya Ghar portal', auto: true }); }
      if (sc.stageTo) lead.stage = sc.stageTo;
      if (scen === 'dnc') { lead.dnc = true; lead.temp = 'DNC'; lead.score = 0; st.dnc.push(lead.phone); }
      if (scen === 'rented') { lead.temp = 'NURTURE'; st.followups.push({ id: uid('fu'), leadId: lead.id, type: 'WhatsApp', dueAt: built.end + 30 * DAY, owner: agentId, status: 'pending', note: '30-day nurture message', auto: true }); st.followups.push({ id: uid('fu'), leadId: lead.id, type: 'AI call', dueAt: built.end + 90 * DAY, owner: agentId, status: 'pending', note: 'Check if they bought own house', auto: true }); }
      if (scen === 'res_callback') { const cb = startOfDay(built.end + 2 * DAY) + 18 * HOUR; st.followups.push({ id: uid('fu'), leadId: lead.id, type: 'AI call', dueAt: cb, owner: agentId, status: cb < now ? (rnd() < 0.6 ? 'done' : 'missed') : 'pending', note: 'Customer asked: call day after tomorrow evening', auto: true }); }
      if (sc.outcome === 'Visit booked' || sc.outcome === 'Meeting booked' || scen === 'factory') {
        const surveyor = scen === 'res_hot' ? surveyorFor(lead.area, st.team) : lead.owner;
        const past = vp.at < now - 2 * HOUR;
        const status = past ? (rnd() < 0.85 ? 'Completed' : 'No-show') : (vp.at - now < 30 * HOUR ? 'Confirmed' : 'Scheduled');
        st.visits.push({ id: uid('vs'), leadId: lead.id, kind: vp.kind, at: vp.at, mins: vp.mins, with: surveyor, address: lead.area + ', Nashik', status, notes: '', reminders: { wa24: past || vp.at - now < 24 * HOUR, aiConfirm: past || vp.at - now < 3 * HOUR, wa2: past } });
        if (past && status === 'Completed') {
          lead.stage = wpick([['Quotation Sent', 45], ['Negotiation', 30], ['Won', 15], ['Lost', 10]]);
          if (lead.stage === 'Won') lead.postSale = Math.floor(between(0, 3));
          if (lead.stage === 'Quotation Sent') st.followups.push({ id: uid('fu'), leadId: lead.id, type: 'Sales call', dueAt: vp.at + 26 * HOUR, owner: lead.owner, status: vp.at + 26 * HOUR < now ? 'missed' : 'pending', note: 'Discuss quotation after survey', auto: true });
          if (lead.stage === 'Lost') lead.lostReason = pick(['Chose cheaper vendor', 'Postponed — budget', 'Roof shading']);
        } else if (past) {
          lead.stage = 'Qualified';
          st.followups.push({ id: uid('fu'), leadId: lead.id, type: 'AI call', dueAt: vp.at + 3 * HOUR, owner: agentId, status: 'pending', note: 'Visit no-show — rebook survey', auto: true });
        } else {
          st.followups.push({ id: uid('fu'), leadId: lead.id, type: 'Visit reminder', dueAt: vp.at - 3 * HOUR, owner: roleAgent('reminder'), status: 'pending', note: 'AI confirmation call T-3h + WhatsApp T-2h', auto: true });
        }
      }
      if (scen === 'factory') {
        lead.transferredTo = lead.owner;
        call.transferredTo = lead.owner;
      }
      st.activity.push({ id: uid('ac'), at: built.end + 20000, leadId: lead.id, kind: 'wa', text: 'WhatsApp sent: ' + (scen === 'dnc' ? 'none (DNC)' : sc.outcome === 'Visit booked' ? 'Site visit confirmation' : 'Brochure + savings estimate') });
    }
    /* older pipeline leads (8–40 days) */
    for (let i = 0; i < 16; i++) {
      const type = wpick([['Home', 72], ['Society', 12], ['Factory', 16]]);
      const fn = pick(D.FIRST), ln = pick(D.LAST);
      const area = pick(D.AREAS).en;
      const created = now - between(8, 40) * DAY;
      const bill = Math.round(({ Home: between(2500, 7500), Society: between(20000, 50000), Factory: between(80000, 250000) })[type] / 100) * 100;
      const lead = { id: uid('ld'), name: uniq(type === 'Home' ? null : type === 'Society' ? D.SOCIETIES : D.FIRMS.slice(0, 12), fn + ' ' + ln), contact: type === 'Home' ? '' : fn + ' ' + ln, phone: mkPhone(), lang: rnd() < 0.7 ? 'mr' : 'hi', area, type, bill, source: pick(['Meta Ads', 'Google Ads', 'Referral', 'Website']), roofOwn: 'Yes', roofArea: type === 'Factory' ? 6000 : 800, timeline: pick(['This month', '1–3 months']), finance: rnd() < 0.5 ? 'Loan / EMI' : 'Subsidy', history: 'Received', answered: true, visitBooked: true, objections: [pick(['Price', 'Getting other quotes', 'Monsoon / cloudy days'])], notes: [], consent: true, createdAt: created, tags: [] };
      lead.owner = routeOwner(lead, st.team); lead.agentId = type === 'Home' ? roleAgent('outbound') : roleAgent('commercial');
      const sz = sizing(lead); lead.sizeKw = sz.kw; lead.estValue = sz.cost;
      lead.stage = wpick([['Quotation Sent', 25], ['Negotiation', 25], ['Won', 35], ['Lost', 15]]);
      if (lead.stage === 'Won') lead.postSale = Math.floor(between(0, 5));
      if (lead.stage === 'Lost') lead.lostReason = pick(['Chose cheaper vendor', 'Postponed — budget', 'Roof shading', 'Society rejected in AGM']);
      lead.score = scoreLead(lead); lead.temp = lead.stage === 'Lost' ? 'COLD' : tempOf(lead.score, lead);
      lead.lastContact = now - between(1, 6) * DAY;
      st.leads.push(lead);
      st.visits.push({ id: uid('vs'), leadId: lead.id, kind: type === 'Home' ? 'Site survey' : type === 'Society' ? 'Society meeting' : 'Factory meeting', at: created + 3 * DAY, mins: 45, with: type === 'Home' ? surveyorFor(area, st.team) : lead.owner, address: area + ', Nashik', status: 'Completed', notes: 'Roof measured, shadow-free', reminders: { wa24: true, aiConfirm: true, wa2: true } });
      if (lead.stage === 'Negotiation' || lead.stage === 'Quotation Sent') st.followups.push({ id: uid('fu'), leadId: lead.id, type: 'Sales call', dueAt: now + between(-1.5, 3) * DAY, owner: lead.owner, status: 'pending', note: lead.stage === 'Negotiation' ? 'Customer asked for better price on inverter brand' : 'Quotation follow-up', auto: false });
    }
    st.followups.forEach((f) => { if (f.status === 'pending' && f.dueAt < now - 2 * HOUR && f.type !== 'Visit reminder') f.status = 'pending'; });
    st.activity.sort((a, b) => b.at - a.at);
    return st;
  }

  const ROLE = { inbound: 'ag_sakhi', outbound: 'ag_arjun', commercial: 'ag_meera', support: 'ag_seva', reminder: 'ag_smita' };
  function roleAgent(r) { const st = S.state; if (st && st.settings && st.settings.agentMode === 'single' && st.agents.some((a) => a.id === 'ag_one')) return 'ag_one'; return ROLE[r] || 'ag_arjun'; }
  function migrate(st) {
    const def = defaultSettings();
    Object.keys(def).forEach((k) => { if (st.settings[k] === undefined) st.settings[k] = def[k]; });
    if (!st.agents.some((a) => a.id === 'ag_one')) st.agents.unshift(JSON.parse(JSON.stringify(D.AGENTS.find((a) => a.id === 'ag_one'))));
    if (!st.imports) st.imports = [];
  }

  /* ---------------- store ---------------- */
  const listeners = new Set();
  let saveT = null;
  const S = {
    state: null,
    load() {
      let st = null;
      try { const raw = localStorage.getItem(KEY); if (raw) st = JSON.parse(raw); } catch (e) { st = null; }
      if (!st || st.v !== 1) st = seed();
      S.state = st;
      if (!st.tickets) st.tickets = [];
      migrate(st);
      return st;
    },
    save() {
      clearTimeout(saveT);
      saveT = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(S.state)); S.saved = Date.now(); } catch (e) { S.saveError = true; } }, 250);
    },
    change(what) { S.save(); listeners.forEach((fn) => { try { fn(what); } catch (e) { console.error(e); } }); },
    on(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    reset() { try { localStorage.removeItem(KEY); } catch (e) {} S.state = seed(); S.change('all'); },
    lead(id) { return S.state.leads.find((l) => l.id === id); },
    log(leadId, kind, text) { S.state.activity.unshift({ id: uid('ac'), at: Date.now(), leadId, kind, text }); if (S.state.activity.length > 600) S.state.activity.length = 600; },
    upsertLead(l) {
      const i = S.state.leads.findIndex((x) => x.id === l.id);
      if (i >= 0) S.state.leads[i] = l; else S.state.leads.unshift(l);
    }
  };

  /* ---------------- voice ---------------- */
  const Voice = {
    voices: [],
    init() {
      if (!('speechSynthesis' in window)) return;
      const load = () => { Voice.voices = speechSynthesis.getVoices(); };
      load(); try { speechSynthesis.onvoiceschanged = load; } catch (e) {}
    },
    available() { return 'speechSynthesis' in window; },
    pick(lang, gender) {
      const v = Voice.voices;
      const code = { mr: 'mr', hi: 'hi', en: 'en-IN' }[lang] || 'hi';
      let c = v.filter((x) => x.lang && x.lang.toLowerCase().startsWith(code.toLowerCase()));
      if (!c.length && lang === 'mr') c = v.filter((x) => x.lang && x.lang.toLowerCase().startsWith('hi'));
      if (!c.length && lang === 'en') c = v.filter((x) => /en[-_]IN/i.test(x.lang)).concat(v.filter((x) => /^en/i.test(x.lang)));
      if (!c.length) return null;
      const femaleHint = /female|lekha|kalpana|veena|swara|aditi|sangeeta|google/i;
      const maleHint = /male|rishi|hemant|madhur|prabhat/i;
      const g = c.find((x) => (gender === 'm' ? maleHint : femaleHint).test(x.name));
      return g || c[0];
    },
    describe(lang, gender) { const v = Voice.pick(lang, gender); return v ? v.name + ' (' + v.lang + ')' : 'No ' + LANG[lang] + ' voice on this device'; },
    speak(text, lang, opts) {
      opts = opts || {};
      return new Promise((res) => {
        if (!Voice.available()) return res();
        const u = new SpeechSynthesisUtterance(text.replace(/[—–]/g, ', '));
        const v = Voice.pick(lang, opts.gender);
        if (v) { u.voice = v; u.lang = v.lang; } else u.lang = lang === 'en' ? 'en-IN' : lang === 'mr' ? 'mr-IN' : 'hi-IN';
        u.rate = opts.rate || 1; u.pitch = opts.pitch || 1;
        let done = false; const fin = () => { if (!done) { done = true; res(); } };
        u.onend = fin; u.onerror = fin;
        setTimeout(fin, 2500 + text.length * 140);
        try { speechSynthesis.speak(u); } catch (e) { fin(); }
      });
    },
    stop() { try { speechSynthesis.cancel(); } catch (e) {} }
  };

  /* ---------------- live call simulation ---------------- */
  const Live = {
    calls: [],
    start(leadId, opts) {
      opts = opts || {};
      const lead = S.lead(leadId); if (!lead) return null;
      if (lead.dnc || S.state.dnc.includes(lead.phone)) { S.log(lead.id, 'sys', 'Call blocked — number is on the DNC list'); S.change('activity'); return null; }
      const scen = opts.scenario || (lead.scenario && D.SCRIPTS[lead.scenario] ? lead.scenario : pickScenario(lead));
      const agent = agentById(opts.agentId || lead.agentId || agentFor(lead, scen));
      const lang = opts.lang || lead.lang || agent.primaryLang;
      const vp = visitPlan(scen, Date.now());
      const noAnswer = opts.noAnswer;
      const filled = [];
      if (!lead.bill) filled.push('bill'); if (!lead.area) filled.push('area'); if (!lead.roofArea) filled.push('roofArea');
      if (filled.length) lead.simFilled = Array.from(new Set([...(lead.simFilled || []), ...filled]));
      if (!lead.bill) lead.bill = ({ Home: 3500, Society: 32000, Factory: 140000, Shop: 12000, Institution: 45000, Farm: 5000 })[lead.type || 'Home'] + Math.round(Math.random() * 20) * 100;
      if (!lead.area) lead.area = D.AREAS[Math.floor(Math.random() * 16)].en;
      if (!lead.type) lead.type = 'Home';
      if (!lead.roofArea) lead.roofArea = lead.type === 'Factory' ? 6000 : 600 + Math.round(Math.random() * 40) * 10;
      if (!lead.owner) lead.owner = routeOwner(lead);
      const lc = { revealed: new Set(), id: uid('live'), leadId, agentId: agent.id, scen, lang, dir: opts.dir || (agent.direction === 'Inbound' ? 'Inbound' : 'Outbound'), started: Date.now(), lines: [], i: 0, visitAt: vp.at, vp, state: noAnswer ? 'ringing' : 'connected', takeover: false, speak: !!opts.speak, speed: opts.speed || S.state.settings.simSpeed || 1, changed: [], campaignId: opts.campaignId, noAnswer };
      lc.script = noAnswer ? [] : (D.SCRIPTS[scen][lang] || D.SCRIPTS[scen].mr);
      Live.calls.push(lc);
      S.log(lead.id, 'call', (lc.dir === 'Inbound' ? 'Inbound call answered by ' : 'AI call started by ') + agent.name + ' (' + LANG[lang] + ')');
      S.change('live');
      Live.tick(lc);
      return lc;
    },
    tick(lc) {
      if (lc.stopped) return;
      if (lc.noAnswer) { lc.timer = setTimeout(() => Live.finish(lc, 'No answer'), 3500 / lc.speed); return; }
      if (lc.i >= lc.script.length) { lc.timer = setTimeout(() => Live.finish(lc), 1200 / lc.speed); return; }
      const lead = S.lead(lc.leadId), agent = agentById(lc.agentId);
      const [s0, txt, hints] = lc.script[lc.i];
      let s = s0;
      if (lc.takeover && s === 'ai') s = 'sales';
      const text = renderLine(txt, lead, agent, { visitAt: lc.visitAt });
      const line = { s, t: text, at: Date.now(), typing: true };
      lc.lines.push(line); lc.i++;
      const ch = applyHints(lead, hints, lc.scen);
      Object.keys(hints || {}).forEach((k) => lc.revealed.add(k));
      if (ch.length) { lc.changed = ch; lc.changedAt = Date.now(); }
      if (hints && hints.sizeKw) { const sz = sizing(lead); lead.estValue = sz.cost; }
      if (hints && hints.transfer) { lc.transferred = true; }
      S.change('live');
      const wait = (1400 + text.length * 38) / lc.speed;
      const next = () => { line.typing = false; S.change('live'); lc.timer = setTimeout(() => Live.tick(lc), 500 / lc.speed); };
      if (lc.speak && S.state.settings.voiceOn && s !== 'sys') {
        const g = s === 'ai' ? agent.voice.gender : s === 'sales' ? 'm' : (lc.lang === 'hi' ? 'm' : 'f');
        const minWait = new Promise((r) => setTimeout(r, wait * 0.55));
        Promise.all([minWait, Voice.speak(text, lc.lang, { gender: g, rate: s === 'ai' ? agent.voice.rate * 1.05 : 1.05, pitch: s === 'ai' ? agent.voice.pitch : s === 'cust' ? 0.85 : 0.9 })]).then(next);
      } else lc.timer = setTimeout(next, wait);
    },
    action(id, what, extra) {
      const lc = Live.calls.find((c) => c.id === id); if (!lc) return;
      const lead = S.lead(lc.leadId);
      const owner = person(lead.owner);
      if (what === 'transfer') { lc.transferred = true; lc.lines.push({ s: 'sys', t: 'Manager transferred call to ' + owner.name + ' — AI summary pushed to their phone', at: Date.now() }); lc.takeover = true; }
      if (what === 'whisper') { lc.lines.push({ s: 'sys', t: 'Whisper to AI (customer cannot hear): “' + (extra || 'Offer the free site survey and mention EMI') + '”', at: Date.now() }); }
      if (what === 'takeover') { lc.takeover = true; lc.lines.push({ s: 'sys', t: 'Manager took over the call — AI is now listening and taking notes', at: Date.now() }); }
      if (what === 'end') { clearTimeout(lc.timer); Voice.stop(); Live.finish(lc, 'Ended by manager'); return; }
      S.change('live');
    },
    stopAll() { Live.calls.slice().forEach((c) => { clearTimeout(c.timer); c.stopped = true; }); Live.calls = []; Voice.stop(); S.change('live'); },
    finish(lc, forced) {
      if (lc.done) return; lc.done = true; clearTimeout(lc.timer);
      Live.calls = Live.calls.filter((c) => c !== lc);
      const lead = S.lead(lc.leadId); const agent = agentById(lc.agentId); const st = S.state; const now = Date.now();
      const sc = D.SCRIPTS[lc.scen];
      if (lc.noAnswer || forced === 'No answer') {
        lead.attempts = (lead.attempts || 0) + 1; lead.lastContact = now;
        st.calls.unshift({ id: uid('cl'), leadId: lead.id, agentId: agent.id, dir: 'Outbound', lang: lc.lang, at: lc.started, secs: 0, outcome: 'No answer', transcript: [], summary: 'No answer. ' + (lead.attempts < agent.retries.attempts ? 'Retry scheduled in ' + agent.retries.gapHours + ' h (attempt ' + (lead.attempts + 1) + ' of ' + agent.retries.attempts + ').' : 'Max attempts reached → WhatsApp sent.'), score: lead.score || 0 });
        if (lead.attempts < agent.retries.attempts) st.followups.push({ id: uid('fu'), leadId: lead.id, type: 'AI call', dueAt: now + agent.retries.gapHours * HOUR, owner: agent.id, status: 'pending', note: 'Retry — attempt ' + (lead.attempts + 1), auto: true });
        else S.log(lead.id, 'wa', 'WhatsApp sent: “We tried calling you about solar…”');
        S.log(lead.id, 'call', 'No answer — ' + agent.name);
        Live.onFinish && Live.onFinish(lc, null);
        S.change('calls'); return;
      }
      const sz = sizing(lead);
      lead.sizeKw = lead.sizeKw || sz.kw; lead.estValue = sz.cost; lead.lastContact = now;
      if (!lead.owner) lead.owner = routeOwner(lead);
      const outcome = forced === 'Ended by manager' ? 'Ended by manager' : lc.transferred && lc.scen !== 'factory' ? 'Transferred' : sc.outcome;
      const call = { id: uid('cl'), leadId: lead.id, agentId: agent.id, dir: lc.dir, lang: lc.lang, at: lc.started, secs: Math.max(20, Math.round((now - lc.started) / 1000 * (lc.speed > 1 ? lc.speed : 1))), outcome, transcript: lc.lines.map((l) => ({ s: l.s, t: l.t, at: l.at })), summary: summaryFor(lc.scen, lead, sz, lc.visitAt), score: lead.score, recording: true, transferredTo: lc.transferred ? lead.owner : null, live: true };
      st.calls.unshift(call);
      if (sc.stageTo && D.STAGES.indexOf(sc.stageTo) > D.STAGES.indexOf(lead.stage || 'New')) lead.stage = sc.stageTo;
      if (lc.scen === 'dnc') { lead.dnc = true; lead.temp = 'DNC'; lead.score = 0; if (!st.dnc.includes(lead.phone)) st.dnc.push(lead.phone); st.followups.forEach((f) => { if (f.leadId === lead.id && f.status === 'pending') f.status = 'cancelled'; }); }
      if (lc.scen === 'subsidy') st.tickets.unshift({ id: 'TK-' + (1040 + st.tickets.length), leadId: lead.id, at: now, subject: 'Subsidy not received — verify bank linkage on national portal', status: 'Open', owner: 'u_owner' });
      if (lc.scen === 'res_callback') st.followups.push({ id: uid('fu'), leadId: lead.id, type: 'AI call', dueAt: startOfDay(now + 2 * DAY) + 18 * HOUR, owner: agent.id, status: 'pending', note: 'Customer asked: call day after tomorrow evening', auto: true });
      if (lc.scen === 'rented') st.followups.push({ id: uid('fu'), leadId: lead.id, type: 'AI call', dueAt: now + 90 * DAY, owner: agent.id, status: 'pending', note: 'Nurture: check if they bought own house', auto: true });
      if (lead.visitBooked && ['res_hot', 'society', 'factory'].includes(lc.scen) && !st.visits.some((v) => v.leadId === lead.id && v.status !== 'Completed' && v.status !== 'Cancelled')) {
        const withId = lc.scen === 'res_hot' ? surveyorFor(lead.area) : lead.owner;
        st.visits.push({ id: uid('vs'), leadId: lead.id, kind: lc.vp.kind, at: lc.vp.at, mins: lc.vp.mins, with: withId, address: lead.area + ', Nashik', status: 'Scheduled', notes: 'Booked by AI on call', reminders: { wa24: false, aiConfirm: false, wa2: false } });
        st.followups.push({ id: uid('fu'), leadId: lead.id, type: 'Visit reminder', dueAt: lc.vp.at - 3 * HOUR, owner: roleAgent('reminder'), status: 'pending', note: 'AI confirmation call T-3h + WhatsApp T-2h', auto: true });
        S.log(lead.id, 'visit', lc.vp.kind + ' booked for ' + fmtDT(lc.vp.at) + ' with ' + person(withId).name);
      }
      if (lc.scen !== 'dnc') S.log(lead.id, 'wa', 'WhatsApp sent: ' + (lead.visitBooked ? 'Visit confirmation + brochure' : 'Brochure + savings estimate'));
      S.log(lead.id, 'crm', 'CRM auto-updated: score ' + lead.score + ' (' + lead.temp + '), stage ' + lead.stage + ', owner ' + person(lead.owner).name);
      Live.onFinish && Live.onFinish(lc, call);
      S.change('calls');
    }
  };

  /* ---------------- campaigns ---------------- */
  const Camp = {
    timer: null,
    create(name, agentId, leadIds, opts) {
      const c = { id: uid('cp'), name, agentId, leadIds: leadIds.slice(), queue: leadIds.slice(), done: [], status: 'Running', createdAt: Date.now(), results: {}, speed: (opts && opts.speed) || 3, answerRate: (opts && opts.answerRate) || 0.72 };
      S.state.campaigns.unshift(c); S.change('campaigns'); Camp.pump(); return c;
    },
    pump() {
      clearTimeout(Camp.timer);
      const st = S.state;
      const running = st.campaigns.filter((c) => c.status === 'Running');
      running.forEach((c) => {
        const active = Live.calls.filter((l) => l.campaignId === c.id).length;
        let slots = Math.max(0, (st.settings.maxConcurrent || 2) - active);
        while (slots > 0 && c.queue.length) {
          const id = c.queue.shift(); const lead = S.lead(id);
          if (!lead) continue;
          if (lead.dnc || st.dnc.includes(lead.phone)) { c.done.push(id); c.results[id] = 'Skipped (DNC)'; continue; }
          if (lead.consent === false) { c.done.push(id); c.results[id] = 'Skipped (no consent)'; continue; }
          const noAnswer = Math.random() > c.answerRate;
          const lc = Live.start(id, { agentId: c.agentId === 'auto' ? null : c.agentId, campaignId: c.id, speed: c.speed, noAnswer, dir: 'Outbound' });
          if (lc) { slots--; } else { c.done.push(id); c.results[id] = 'Blocked'; }
        }
        if (!c.queue.length && !Live.calls.some((l) => l.campaignId === c.id)) c.status = 'Completed';
      });
      S.change('campaigns');
      if (running.some((c) => c.status === 'Running')) Camp.timer = setTimeout(Camp.pump, 1500);
    }
  };
  Live.onFinish = (lc, call) => {
    if (lc.campaignId) { const c = S.state.campaigns.find((x) => x.id === lc.campaignId); if (c) { c.done.push(lc.leadId); c.results[lc.leadId] = call ? call.outcome : 'No answer'; } setTimeout(Camp.pump, 300); }
  };

  /* ---------------- AI (Claude via sample) + script fallback ---------------- */
  const AI = {
    sample: null, ready: false,
    async init() {
      try { if (window.claude && window.claude.use) { AI.sample = await window.claude.use('sample'); } } catch (e) { AI.sample = null; }
      AI.ready = true; S.change('ai');
    },
    facts() { const K = D.KNOWLEDGE; return Object.keys(K).map((k) => '- ' + K[k]).join('\n'); },
    agentBrief(agent, lang, lead) {
      const qs = agent.questions.map((q, i) => (i + 1) + '. ' + (q.text[lang] || q.text.en) + ' [CRM field: ' + q.field + ']').join('\n');
      const obj = agent.objections.map((o) => '- ' + o.trigger + ': ' + (o[lang] || o.en)).join('\n');
      const faqs = (agent.faqs || D.FAQS).map((f) => '- Q: ' + f.q + ' A: ' + f.a).join('\n');
      return `You are ${agent.name}, the AI voice assistant of Solaris, a rooftop solar installer in Nashik, Maharashtra. You are on a PHONE CALL. Use case: ${agent.useCase}.
Speak ${LANG[lang]} only${lang !== 'en' ? ' in Devanagari script (English words like EMI, kW, WhatsApp are fine)' : ''}; if the caller clearly switches to ${agent.languages.filter((l) => l !== lang).map((l) => LANG[l]).join(' or ')}, switch with them. Grammatical gender: ${agent.voice.gender === 'm' ? 'male' : 'female'}.
Tone: ${agent.tone}. Reply in 1–3 short spoken sentences, no lists, no markdown, no emojis. Ask ONE question at a time.
You already said the greeting including AI and call-recording disclosure. Qualify the lead by asking these in a natural order, skipping what is already known:
${qs}
Objection handling:
${obj}
Facts you may use (never invent prices; say the engineer will confirm exact figures at the free site survey):
${this.facts()}
FAQ:
${faqs}
${agent.callTypes ? 'You handle ALL of these call types. First work out which one this call is (from the caller\'s words or the call purpose), then follow its flow:\n' + agent.callTypes.filter((c) => c.on).map((c) => '- ' + c.name + ': ' + c.how).join('\n') + '\nIf a call type is not listed, politely offer a callback from the team.\n' : ''}Rules: never guess an answer you do not know — offer to have a human call back. If the caller asks for a human or is a hot commercial lead, say you are connecting them to sales. If they say do not call, apologise, confirm they are added to the do-not-call list and close. Try to book a free site survey with an exact day and time. Keep calling hours ${S.state.settings.callingStart}–${S.state.settings.callingEnd} for callbacks.
${lead ? 'Known about caller: name ' + lead.name + ', area ' + (lead.area || 'unknown') + ', type ' + (lead.type || 'unknown') + (lead.bill ? ', bill ₹' + lead.bill : '') + '.' : 'Caller is new; name unknown.'}`;
    },
    async reply(agent, lang, turns, lead, onText, signal) {
      if (!AI.sample) throw { code: 'unavailable' };
      const msgs = [{ role: 'user', content: AI.agentBrief(agent, lang, lead) + '\n\nConversation so far:\n' + turns.map((t) => (t.s === 'ai' ? agent.name : 'Caller') + ': ' + t.t).join('\n') + '\n\nWrite ONLY ' + agent.name + '\'s next spoken reply.' }];
      const r = await AI.sample(msgs, { modelTier: 'quick', cache: false, onText: onText ? ({ text }) => onText(text) : undefined, signal });
      return (r.text || '').replace(/^\s*\w+:\s*/, '').trim();
    },
    async extract(turns, agentName) {
      if (!AI.sample) throw { code: 'unavailable' };
      const prompt = `Extract CRM fields from this solar sales phone call transcript (Nashik, Maharashtra; Marathi/Hindi/English). Return JSON only with keys:
{"name":string|null,"area":string|null (a Nashik locality in English if mentioned),"type":"Home"|"Society"|"Shop"|"Factory"|"Institution"|"Farm"|null,"bill":number|null (monthly ₹),"roofOwn":"Yes"|"No (rented)"|"Society roof"|null,"roofArea":number|null (sq ft),"timeline":"Immediately"|"This month"|"1–3 months"|"3–6 months"|"6+ months"|null,"finance":"Loan / EMI"|"Subsidy"|"Cash"|null,"objections":string[] (from: Price, Monsoon / cloudy days, Getting other quotes, Call later, Committee approval, Rented property, Roof space, Subsidy delay worry, Maintenance),"visitRequested":boolean,"visitWhen":string|null,"callbackWhen":string|null,"dnc":boolean,"wantsHuman":boolean,"sentiment":"Positive"|"Neutral"|"Negative","summary":string (2 sentences, English),"nextStep":string (English)}
Transcript:
${turns.map((t) => (t.s === 'ai' ? agentName : t.s === 'cust' ? 'Caller' : t.s) + ': ' + t.t).join('\n')}`;
      return await AI.sample.json(prompt, { modelTier: 'quick' });
    }
  };

  /* rule-based fallback conversation engine */
  const Rules = {
    detect(text) {
      const t = text.toLowerCase();
      const out = {};
      const n = t.replace(/,/g, '').match(/(?<!\d)(\d{3,7})(?!\d)/);
      if (n) out.number = Number(n[1]);
      D.DEFAULT_OBJECTIONS.forEach((o) => { if (o.keywords.some((k) => t.includes(k.toLowerCase()))) out.objection = o.trigger; });
      if (/नको|नहीं चाहिए|not interested|कॉल करू नका|कॉल मत|don't call|do not call/.test(t)) out.dnc = true;
      if (/हो\b|हाँ|हां|yes|ठीक|चालेल|ok/.test(t)) out.yes = true;
      if (/सोसायटी|society|सोसाइटी/.test(t)) out.type = 'Society';
      else if (/कारखाना|फ़ैक्ट्री|फैक्ट्री|factory|plant|प्लांट|midc/.test(t)) out.type = 'Factory';
      else if (/दुकान|shop/.test(t)) out.type = 'Shop';
      else if (/घर|बंगला|flat|फ्लॅट|फ़्लैट|home|house|मकान/.test(t)) out.type = 'Home';
      D.AREAS.forEach((a) => { if (t.includes(a.en.toLowerCase()) || t.includes(a.dv)) out.area = a.en; });
      if (/शनिवार|रविवार|सोमवार|मंगळवार|मंगलवार|बुधवार|गुरुवार|शुक्रवार|उद्या|कल|tomorrow|saturday|sunday|monday/.test(t)) out.when = text;
      if (/माणूस|इंसान|human|manager|sales/.test(t)) out.human = true;
      if (/सबसिडी (अजून )?(आली|मिळाली) नाही|सब्सिडी (अभी तक )?नहीं (आई|मिली)|subsidy (not|nahi)|नेट मीटर|net meter|तक्रार|शिकायत|complaint|बंद पडल|बंद है|काम करत नाही|काम नहीं कर|inverter|इन्व्हर्टर|इन्वर्टर|सर्व्हिस|सर्विस|service/i.test(text)) out.support = true;
      if (/वेळ बदल|तारीख बदल|समय बदल|reschedule|postpone|उद्या येऊ नका|कल मत आइए/i.test(text)) out.reschedule = true;
      if (/कोटेशन|quotation|quote मिळ|कोटेशन मिला/i.test(text)) out.quote = true;
      return out;
    },
    next(agent, lang, state, userText) {
      const d = Rules.detect(userText);
      const L = (o) => genderize(o[lang] || o.en, agent.voice.gender);
      Object.assign(state.fields, d.type ? { type: d.type } : {}, d.area ? { area: d.area } : {});
      if (d.dnc) { state.fields.dnc = true; state.over = true; return L({ mr: 'समजलं, त्रासाबद्दल क्षमस्व. तुमचा नंबर "कॉल करू नका" यादीत टाकला आहे. शुभ दिवस!', hi: 'समझ {गई|गया}, परेशानी के लिए माफ़ी। आपका नंबर "कॉल न करें" सूची में डाल दिया है। आपका दिन शुभ हो!', en: 'Understood, sorry for the trouble. Your number is now on our do-not-call list. Have a good day!' }); }
      if (d.human) { state.fields.wantsHuman = true; state.over = true; return L({ mr: 'नक्कीच, मी तुम्हाला आत्ता आमच्या सेल्स टीमशी {जोडते|जोडतो}. एक मिनिट थांबा.', hi: 'ज़रूर, मैं आपको अभी हमारी सेल्स टीम से {जोड़ रही|जोड़ रहा} हूँ। एक मिनट रुकिए।', en: 'Of course, connecting you to our sales team now. Please hold.' }); }
      const types = agent.callTypes ? agent.callTypes.filter((c) => c.on).map((c) => c.id) : null;
      const can = (id) => !types || types.includes(id);
      if (state.support === 1) { state.support = 2; state.fields.ticket = true; state.fields.consumerNo = (userText.match(/\d{6,12}/) || [])[0] || null; state.over = true; return L({ mr: 'धन्यवाद. याची मी खात्रीने माहिती देऊ शकत नाही, म्हणून आमच्या टीमसाठी तिकीट तयार {करते|करतो}. उद्या संध्याकाळी 5 पर्यंत ते तुम्हाला कॉल करतील. तिकीट क्रमांक WhatsApp वर पाठवला आहे.', hi: 'धन्यवाद। यह मैं पक्के तौर पर नहीं बता {सकती|सकता}, इसलिए हमारी टीम के लिए टिकट बना {रही|रहा} हूँ। कल शाम 5 बजे तक वे आपको कॉल करेंगे। टिकट नंबर WhatsApp पर भेज दिया है।', en: 'Thank you. I cannot confirm that myself, so I have raised a ticket for our team. They will call you by 5 PM tomorrow. The ticket number is on WhatsApp.' }); }
      if (d.support && can('support') && !state.support) { state.support = 1; state.fields.intent = 'Support'; return L({ mr: 'त्रास झाल्याबद्दल क्षमस्व. तुमचा MSEDCL ग्राहक क्रमांक किंवा नोंदणीकृत मोबाईल नंबर सांगाल का?', hi: 'परेशानी के लिए माफ़ी। क्या आप अपना MSEDCL कंज़्यूमर नंबर या रजिस्टर्ड मोबाइल नंबर बताएँगे?', en: 'Sorry for the trouble. Could you tell me your MSEDCL consumer number or registered mobile number?' }); }
      if (d.reschedule && can('visit')) { state.fields.intent = 'Reschedule visit'; state.fields.reschedule = true; if (!d.when) return L({ mr: 'काही हरकत नाही. सर्व्हेसाठी कोणता दिवस आणि वेळ सोयीची आहे?', hi: 'कोई बात नहीं। सर्वे के लिए कौन सा दिन और समय ठीक रहेगा?', en: 'No problem. Which day and time would suit you for the survey?' }); }
      if (d.quote && can('quote') && !state.quoteAsked) { state.quoteAsked = true; state.fields.intent = 'Quotation follow-up'; state.fields.wantsHuman = false; return L({ mr: 'कोटेशनबद्दल काही शंका असेल तर सांगा. किंमतीबद्दल बोलण्यासाठी आमच्या सेल्स प्रतिनिधींचा कॉल आजच लावून देऊ का?', hi: 'कोटेशन के बारे में कोई सवाल हो तो बताइए। क़ीमत पर बात के लिए हमारे सेल्स प्रतिनिधि का कॉल आज ही लगवा दूँ?', en: 'Tell me if you have any questions on the quotation. Shall I set up a call with our salesperson today to discuss the price?' }); }
      let pre = '';
      if (d.objection) { const o = agent.objections.find((x) => x.trigger === d.objection); if (o) pre = L(o) + ' '; state.fields.objections = Array.from(new Set([...(state.fields.objections || []), d.objection])); }
      const cur = agent.questions[state.qi - 1];
      if (cur && d.number && cur.field === 'bill') state.fields.bill = d.number;
      if (cur && d.number && cur.field === 'roofArea') state.fields.roofArea = d.number;
      if (cur && cur.field === 'roofOwn') state.fields.roofOwn = /भाड्या|किराए|rent/.test(userText) ? 'No (rented)' : d.yes ? 'Yes' : state.fields.roofOwn;
      if (cur && cur.field === 'timeline') state.fields.timeline = /लगेच|तुरंत|immediately|अभी|आत्ता/.test(userText) ? 'Immediately' : /महिन्यात|महीने|month/.test(userText) ? 'This month' : '1–3 months';
      if (cur && cur.field === 'finance') state.fields.finance = /emi|कर्ज|लोन|loan/i.test(userText) ? 'Loan / EMI' : 'Subsidy';
      if (cur && cur.field === 'history') state.fields.history = d.yes ? 'Available' : 'Not yet';
      if ((cur && cur.field === 'visitSlot' && (d.when || d.yes)) || d.when) { state.fields.visitRequested = true; state.fields.visitWhen = userText; state.over = true; return pre + L({ mr: 'धन्यवाद! सर्व्हे बुक केला आहे. WhatsApp वर कन्फर्मेशन {पाठवते|पाठवतो}. मागील 12 महिन्यांचं लाईट बिल तयार ठेवा. शुभ दिवस!', hi: 'धन्यवाद! सर्वे बुक हो गया है। WhatsApp पर कन्फ़र्मेशन भेज {रही|रहा} हूँ। पिछले 12 महीने के बिल तैयार रखिए। आपका दिन शुभ हो!', en: 'Thank you! Your survey is booked and a WhatsApp confirmation is on its way. Please keep the last 12 months of bills ready.' }); }
      if (cur && cur.field === 'bill' && state.fields.bill) {
        const sz = sizing({ bill: state.fields.bill, type: state.fields.type || 'Home' });
        pre += L({ mr: `तुमच्या बिलावरून साधारण ${sz.kw} किलोवॅट सिस्टीम योग्य राहील, वर्षाला साधारण ₹${num(sz.yearSave)} बचत. `, hi: `आपके बिल के हिसाब से लगभग ${sz.kw} किलोवॉट सिस्टम सही रहेगा, साल में लगभग ₹${num(sz.yearSave)} की बचत। `, en: `Based on your bill, about ${sz.kw} kW would suit you, saving roughly ₹${num(sz.yearSave)} a year. ` });
      }
      while (state.qi < agent.questions.length) {
        const q = agent.questions[state.qi++];
        if (state.fields[q.field] != null && q.field !== 'visitSlot') continue;
        return pre + (q.text[lang] || q.text.en);
      }
      state.over = true;
      return pre + L({ mr: 'धन्यवाद! आमचे प्रतिनिधी लवकरच संपर्क करतील.', hi: 'धन्यवाद! हमारे प्रतिनिधि जल्द संपर्क करेंगे।', en: 'Thank you! Our team will contact you shortly.' });
    }
  };

  /* ---------------- Excel ---------------- */
  const HEADER_MAP = {
    name: ['name', 'customer name', 'customer', 'full name', 'lead name', 'नाव', 'नाम'],
    phone: ['phone', 'mobile', 'mobile no', 'mobile number', 'phone number', 'contact', 'contact no', 'number', 'मोबाईल', 'मोबाइल'],
    area: ['area', 'location', 'locality', 'city area', 'address', 'भाग', 'इलाका'],
    type: ['type', 'property type', 'segment', 'category', 'customer type'],
    bill: ['bill', 'monthly bill', 'electricity bill', 'light bill', 'avg bill', 'बिल'],
    source: ['source', 'lead source', 'campaign', 'utm source'],
    lang: ['language', 'lang', 'preferred language', 'भाषा'],
    consent: ['consent', 'opt in', 'optin', 'opt-in', 'whatsapp consent', 'call consent'],
    notes: ['notes', 'remark', 'remarks', 'comment', 'comments']
  };
  const Excel = {
    mapHeaders(headers) {
      const m = {};
      headers.forEach((h, i) => {
        const k = String(h || '').trim().toLowerCase();
        for (const f in HEADER_MAP) if (m[f] == null && HEADER_MAP[f].some((s) => k === s || k.includes(s))) { m[f] = i; break; }
      });
      return m;
    },
    normType(v) {
      const t = String(v || '').toLowerCase();
      if (/soc|chs|apart|rwa/.test(t)) return 'Society';
      if (/fact|indus|plant|midc|manuf/.test(t)) return 'Factory';
      if (/shop|store|retail|commer|office/.test(t)) return 'Shop';
      if (/school|hosp|college|temple|trust|inst/.test(t)) return 'Institution';
      if (/farm|agri|pump/.test(t)) return 'Farm';
      return t ? 'Home' : 'Home';
    },
    normArea(v) { const t = String(v || '').toLowerCase(); const a = D.AREAS.find((x) => t.includes(x.en.toLowerCase()) || t.includes(x.dv)); return a ? a.en : (v ? String(v).trim() : ''); },
    normLang(v) { const t = String(v || '').toLowerCase(); if (/mar|मरा/.test(t)) return 'mr'; if (/hin|हिं/.test(t)) return 'hi'; if (/eng/.test(t)) return 'en'; return 'mr'; },
    normConsent(v, source) {
      const t = String(v == null ? '' : v).trim().toLowerCase();
      if (/^(y|yes|true|1|हो|हाँ)$/.test(t)) return true;
      if (/^(n|no|false|0|नाही|नहीं)$/.test(t)) return false;
      return ['meta ads', 'google ads', 'website', 'missed call', 'referral', 'walk-in', 'justdial', 'indiamart'].includes(String(source || '').toLowerCase()) ? 'implied' : null;
    },
    validate(rows, map) {
      const existing = new Map(S.state.leads.map((l) => [l.phone, l]));
      const seen = new Set();
      return rows.map((r, i) => {
        const get = (f) => (map[f] != null ? r[map[f]] : '');
        const phone = normPhone(get('phone'));
        const source = String(get('source') || 'Excel import').trim() || 'Excel import';
        const rec = { row: i + 2, name: String(get('name') || '').trim(), rawPhone: get('phone'), phone, area: Excel.normArea(get('area')), type: Excel.normType(get('type')), bill: Number(String(get('bill') || '').replace(/[^\d.]/g, '')) || null, source, lang: Excel.normLang(get('lang')), consent: Excel.normConsent(get('consent'), source), notes: String(get('notes') || '').trim(), issues: [], level: 'ok' };
        if (!phone) { rec.issues.push('Invalid mobile number'); rec.level = 'error'; }
        else if (seen.has(phone)) { rec.issues.push('Duplicate in this file'); rec.level = 'error'; }
        else if (existing.has(phone)) { rec.issues.push('Already in CRM — will update, not duplicate'); rec.level = 'warn'; rec.existingId = existing.get(phone).id; }
        if (phone && S.state.dnc.includes(phone)) { rec.issues.push('On DNC list — will not be called'); rec.level = 'error'; }
        if (!rec.name) { rec.issues.push('Name missing'); if (rec.level === 'ok') rec.level = 'warn'; }
        if (rec.consent === false) { rec.issues.push('No consent — import only, no calls'); if (rec.level === 'ok') rec.level = 'warn'; }
        if (rec.consent === null) { rec.issues.push('Consent unknown — confirm before calling'); if (rec.level === 'ok') rec.level = 'warn'; }
        if (!rec.area) { rec.issues.push('Area missing — AI will ask'); }
        if (phone) seen.add(phone);
        return rec;
      });
    }
  };

  const NOT_ANSWERED = ['No answer', 'Busy', 'Failed', 'Dialling', 'No result'];
  const answered = (c) => !NOT_ANSWERED.includes(c.outcome);
  const isOverdue = (f, now) => f.status === 'pending' && f.dueAt < (now || Date.now()) - (f.type === 'AI call' ? 2 * HOUR : 0);
  window.SOL = { answered, isOverdue, roleAgent, migrate, S, D, Live, Camp, AI, Rules, Voice, Excel, util: { uid, esc, inr, inrShort, num, clamp, startOfDay, fmtTime, fmtDate, fmtDay, fmtDT, rel, dur, normPhone, maskPhone, areaDv, zoneOf, LANG, MIN, HOUR, DAY }, sizing, scoreLead, tempOf, routeOwner, surveyorFor, person, agentById, genderize, renderLine, summaryFor, applyHints, seed, defaultSettings };
})();
