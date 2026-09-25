/* Solaris AI OS — client showcase demo.
   Open the panel with ?demo  →  no login, sample Nashik data kept in this browser tab only.
   Nothing is read from or written to the real Supabase database. */
(function () {
  'use strict';
  if (!/[?&]demo(=|&|$)/.test(location.search)) return;
  const CFG = window.SOLARIS_CONFIG || {};
  const BASE = String(CFG.supabaseUrl || 'https://demo.invalid').replace(/\/+$/, '');
  window.SOLARIS_DEMO = true;

  /* keep the demo session in memory so a real login on this browser is never touched */
  const SESS = 'solaris-panel-session';
  const mem = { [SESS]: JSON.stringify({ access: 'demo', refresh: 'demo', exp: Date.now() + 3650 * 864e5, email: 'demo@solaris-ai-os' }) };
  const gi = Storage.prototype.getItem, si = Storage.prototype.setItem;
  Storage.prototype.getItem = function (k) { return this === window.localStorage && k === SESS ? (mem[k] ?? null) : gi.call(this, k); };
  Storage.prototype.setItem = function (k, v) { if (this === window.localStorage && k === SESS) { mem[k] = v; if (JSON.parse(v || 'null') === null) location.href = location.pathname; return; } return si.call(this, k, v); };

  /* ---------------- sample data ---------------- */
  const now = Date.now(), H = 3600e3, D = 864e5, M = 60e3;
  let seq = 0; const ts = () => new Date(Date.now() + (seq++)).toISOString();
  const db = { config: [], leads: [], calls: [], visits: [], followups: [], activity: [], wa_messages: [], content: [], tickets: [] };
  const put = (t, d) => { const row = { id: d.id, data: d, updated_at: ts() }; const i = db[t].findIndex((x) => x.id === d.id); if (i >= 0) db[t][i] = row; else db[t].push(row); return d; };
  const cfg = (id, value) => put('config', { id, value });
  const at = (dayOffset, hour, min) => { const d = new Date(now + dayOffset * D); d.setHours(hour, min || 0, 0, 0); return d.getTime(); };

  cfg('profile', { company: 'Solaris Solar', owner: 'Mayur', city: 'Nashik', phone: '+91 90000 00000', whatsapp: '+91 90000 00000', address: 'College Road, Nashik', hours: 'Mon–Sat 10:00–19:00', pricePerKw: 60000, panels: 'Mono PERC 540 W', inverter: 'On-grid string inverter', warrantyPanels: 25, warrantyInverter: 8, warrantyWork: 5, emi: 'Bank loans for PM Surya Ghar', areas: 'Nashik city and district', services: ['Homes', 'Housing societies', 'Shops & factories'], setupDone: now - 20 * D, createdAt: now - 30 * D });
  cfg('settings', { callingStart: '10:00', callingEnd: '19:00', dailyCap: 300, maxAttempts: 3, retryGapHours: 4, recallGuardHours: 2 });
  cfg('team', [{ id: 'u1', name: 'Mayur', role: 'Owner', areas: [], active: true }, { id: 'u2', name: 'Rohit', role: 'Sales', areas: ['Gangapur Road', 'College Road', 'Indira Nagar'], active: true }, { id: 'u3', name: 'Sachin', role: 'Surveyor', areas: [], active: true }]);
  cfg('whatsapp', { autoSend: { visit: true, callback: true, interested: true, complaint: true }, brochureUrl: 'demo://brochure.pdf' });

  const L = [
    ['गणेश पाटील', 'Gangapur Road', 4800, 'HOT', 'Site Survey', 'mr', 'Home', 'Meta Ads', '12, Sai Kripa Bungalow, near Rathchakra Chowk, Gangapur Road'],
    ['सीमा जोशी', 'Indira Nagar', 3100, 'WARM', 'Qualified', 'mr', 'Home', 'Website', ''],
    ['Rahul Deshmukh', 'CIDCO', 2600, 'WARM', 'Contacted', 'hi', 'Home', 'Meta Ads', ''],
    ['तुलसी विहार सोसायटी', 'Nashik Road', 42000, 'HOT', 'Site Survey', 'mr', 'Society', 'Referral', 'Tulsi Vihar CHS, Jail Road, Nashik Road'],
    ['Anil Shinde', 'Satpur MIDC', 150000, 'WARM', 'Qualified', 'en', 'Factory', 'Google', ''],
    ['प्रिया कुलकर्णी', 'College Road', 5200, 'HOT', 'Qualified', 'mr', 'Home', 'Meta Ads', ''],
    ['Vijay More', 'Panchavati', 3900, 'COLD', 'Won', 'mr', 'Home', 'Walk-in', 'Plot 7, Hirawadi, Panchavati'],
    ['सुनील वाघ', 'Dwarka', 2200, 'COLD', 'New', 'mr', 'Home', 'Meta Ads', ''],
    ['Neha Bhosale', 'Pathardi Phata', 3600, 'WARM', 'Contacted', 'mr', 'Home', 'Website', ''],
    ['Kishor Jadhav', 'Makhmalabad', 2800, 'COLD', 'New', 'mr', 'Home', 'Meta Ads', ''],
    ['श्री साई ट्रेडर्स', 'Ambad', 18000, 'WARM', 'Contacted', 'mr', 'Shop', 'JustDial', ''],
    ['Amit Gaikwad', 'Deolali Camp', 4100, 'HOT', 'Site Survey', 'hi', 'Home', 'Meta Ads', 'Flat 3, Laxmi Heights, Deolali Camp'],
    ['मीनाक्षी देशपांडे', 'Tidke Colony', 6500, 'WARM', 'Qualified', 'mr', 'Home', 'Referral', ''],
    ['Sanjay Pawar', 'Adgaon', 1900, 'COLD', 'Lost', 'mr', 'Home', 'Meta Ads', ''],
    ['Ravi Thakur', 'Upnagar', 3300, 'COLD', 'New', 'hi', 'Home', 'Website', ''],
    ['सोनाली खैरनार', 'Mhasrul', 2900, 'WARM', 'Contacted', 'mr', 'Home', 'Meta Ads', ''],
    ['Green Valley Residency', 'Gangapur Road', 36000, 'WARM', 'Qualified', 'en', 'Society', 'Referral', ''],
    ['Prakash Nikam', 'Sinnar', 5400, 'COLD', 'Won', 'mr', 'Home', 'Walk-in', 'Near bus stand, Sinnar'],
    ['योगेश शिंदे', 'Cidco Uttam Nagar', 2500, 'COLD', 'New', 'mr', 'Home', 'Meta Ads', ''],
    ['Pooja Rane', 'Anandwalli', 4600, 'WARM', 'Contacted', 'en', 'Home', 'Instagram', '']
  ];
  const leads = L.map(([name, area, bill, temp, stage, lang, type, source, address], i) => put('leads', {
    id: 'dl' + i, name, phone: '+91 90000 1' + String(1000 + i * 37).padStart(4, '0'), area, bill, temp, stage, lang, type, source, address,
    score: temp === 'HOT' ? 82 - i : temp === 'WARM' ? 60 - i % 5 : 30 - i % 7, consent: true, objections: i % 4 === 1 ? ['Price'] : [], notes: [], tags: [],
    createdAt: now - (i * 0.4 + 0.1) * D, lastContact: now - (i % 7) * 5 * H, visitBooked: stage === 'Site Survey', city: 'Nashik'
  }));

  const OUT = ['Visit booked', 'Callback', 'Contacted', 'Qualified', 'No answer', 'Not interested', 'Busy'];
  const T_MR = [{ s: 'ai', t: 'नमस्कार! मी आशा बोलतेय, Solaris सोलर, नाशिककडून. तुम्ही सोलरबद्दल चौकशी केली होती, दोन मिनिटं बोलू शकतो का?' }, { s: 'cust', t: 'हो, बोला.' }, { s: 'ai', t: 'तुमचं लाईट बिल महिन्याला साधारण किती येतं?' }, { s: 'cust', t: 'साधारण पाच हजार येतं.' }, { s: 'ai', t: 'मग 3 किलोवॅट सिस्टम योग्य राहील. PM सूर्य घर योजनेत ₹78,000 सबसिडी मिळते. आमचे इंजिनिअर मोफत सर्व्हेसाठी येऊ शकतात — शनिवारी सकाळी 11 चालेल का?' }, { s: 'cust', t: 'हो चालेल.' }, { s: 'ai', t: 'छान! घराचा पूर्ण पत्ता सांगाल का?' }, { s: 'cust', t: '12, साई कृपा बंगला, रथचक्र चौकाजवळ, गंगापूर रोड.' }, { s: 'ai', t: 'धन्यवाद! व्हॉट्सॲपवर कन्फर्मेशन पाठवते. मागच्या 12 महिन्यांची बिलं तयार ठेवा.' }];
  let c = 0;
  for (let d = 6; d >= 0; d--) {
    const n = [9, 14, 11, 17, 13, 19, 8][d];
    for (let k = 0; k < n; k++) {
      const li = (c * 7 + k) % leads.length; const l = leads[li];
      const when = at(-d, 10 + (k % 9), (k * 13) % 60); if (when > now) continue;
      const outcome = li === 0 && d === 0 ? 'Visit booked' : OUT[(c + k) % OUT.length];
      const talk = !/No answer|Busy/.test(outcome);
      put('calls', { id: 'dc' + (c++), leadId: l.id, dir: k % 5 === 0 ? 'Inbound' : 'Outbound', at: when, secs: talk ? 60 + (k * 17) % 180 : 0, outcome,
        summary: talk ? `${l.type} · ${l.area} · bill ₹${l.bill.toLocaleString('en-IN')} · ${outcome}` : '', transcript: talk ? (l.lang === 'mr' ? T_MR : T_MR.slice(0, 4)) : [] });
    }
  }
  put('visits', { id: 'dv1', leadId: 'dl0', kind: 'Site survey', at: at(0, Math.min(18, new Date().getHours() + 2), 0), address: leads[0].address + ', Nashik', status: 'Scheduled', createdAt: now - 3 * H, assignee: 'Sachin' });
  put('visits', { id: 'dv2', leadId: 'dl3', kind: 'Society meeting', at: at(1, 11), address: leads[3].address, status: 'Confirmed', createdAt: now - D, assignee: 'Rohit' });
  put('visits', { id: 'dv3', leadId: 'dl11', kind: 'Site survey', at: at(2, 16, 30), address: leads[11].address, status: 'Scheduled', createdAt: now - 5 * H, assignee: 'Sachin' });
  put('visits', { id: 'dv4', leadId: 'dl6', kind: 'Site survey', at: at(-4, 12), address: leads[6].address, status: 'Done', createdAt: now - 6 * D });
  put('followups', { id: 'df1', leadId: 'dl1', type: 'Sales call', dueAt: now - H, status: 'pending', note: 'Interested, wants EMI details — call personally' });
  put('followups', { id: 'df2', leadId: 'dl4', type: 'Sales call', dueAt: now + H, status: 'pending', note: 'Factory 50 kW — send commercial quote' });
  put('followups', { id: 'df3', leadId: 'dl2', type: 'AI call', dueAt: now + 3 * H, status: 'pending', note: 'Callback asked by customer' });
  put('activity', { id: 'da1', leadId: 'dl0', at: now - 3 * H, kind: 'visit', text: 'Site survey booked by Asha (AI)' });
  put('activity', { id: 'da2', leadId: 'dl5', at: now - 2 * H, kind: 'hot', text: 'HOT lead — bill ₹5,200, wants survey this week' });
  put('wa_messages', { id: 'dw1', leadId: 'dl0', phone: leads[0].phone, dir: 'out', at: now - 3 * H + 2 * M, kind: 'visit', text: 'नमस्कार गणेश जी, Solaris सोलरचा मोफत सर्व्हे आज ठरला आहे. पत्ता: ' + leads[0].address + '. मागच्या 12 महिन्यांची लाईट बिलं तयार ठेवा.', status: 'read', by: 'AI agent' });
  put('wa_messages', { id: 'dw2', leadId: 'dl0', phone: leads[0].phone, dir: 'in', at: now - 2 * H, text: 'हो, चालेल. धन्यवाद 🙏', status: 'received' });
  put('wa_messages', { id: 'dw3', leadId: 'dl5', phone: leads[5].phone, dir: 'in', at: now - 50 * M, text: 'सबसिडी किती मिळेल?', status: 'received' });
  put('content', { id: 'dct1', title: 'PM Surya Ghar — up to ₹78,000 subsidy', summary: 'Government subsidy for home rooftop solar: ₹30,000 for 1 kW, ₹60,000 for 2 kW, ₹78,000 for 3 kW and above.', createdAt: now - 2 * D, by: 'demo' });
  put('content', { id: 'dct2', kind: 'doc', title: 'Solaris-Brochure.pdf', mediaUrl: 'demo://brochure.pdf', mediaKind: 'document', createdAt: now - 10 * D, by: 'demo' });

  /* ---------------- fake backend ---------------- */
  const reply = (obj, status) => new Response(obj === undefined ? null : JSON.stringify(obj), { status: status || 200, headers: { 'Content-Type': 'application/json' } });
  const first = (n) => String(n || '').split(/\s+/)[0];
  const byId = (t, id) => { const r = db[t].find((x) => x.id === id); return r && r.data; };
  const caption = (l, content) => {
    const n = first(l.name) || '{name}'; const t = (content && content.title) || 'Solaris सोलर';
    if (l.lang === 'hi') return `${n} जी, ${t} — ${l.area ? l.area + ' में ' : ''}कई घरों ने बिजली बिल लगभग शून्य किया है। मुफ़्त साइट सर्वे के लिए "हाँ" लिखें ☀️`;
    if (l.lang === 'en') return `Hi ${n}, ${t}. ${l.type === 'Society' ? 'Your society can cut common-area bills sharply' : 'Homes near ' + (l.area || 'you') + ' are already saving'} — reply "Yes" for a free site survey ☀️`;
    return `${n} जी, ${t}! ${l.area ? l.area + ' भागात ' : ''}अनेक घरांचं लाईट बिल जवळपास शून्य झालं आहे. मोफत सर्व्हेसाठी "हो" असा रिप्लाय करा ☀️`;
  };
  function simulateCall(leadId) {
    const l = byId('leads', leadId); if (!l) return;
    const id = 'dc' + (c++); const t0 = Date.now();
    put('calls', { id, leadId, dir: 'Outbound', at: t0, secs: 0, outcome: 'Dialling', summary: '' });
    setTimeout(() => {
      const booked = l.stage !== 'Won';
      put('calls', { id, leadId, dir: 'Outbound', at: t0, secs: 142, outcome: booked ? 'Visit booked' : 'Contacted', summary: `${l.type} · ${l.area} · bill ₹${(l.bill || 0).toLocaleString('en-IN')} · ${booked ? 'Visit booked' : 'Contacted'}`, transcript: T_MR });
      if (booked) {
        const vat = at(1, 11);
        Object.assign(l, { stage: 'Site Survey', temp: 'HOT', visitBooked: true, lastContact: Date.now(), address: l.address || ('Near ' + l.area + ' main road') }); put('leads', l);
        put('visits', { id: 'dv' + id, leadId, kind: 'Site survey', at: vat, address: l.address + ', Nashik', status: 'Scheduled', createdAt: Date.now(), assignee: 'Sachin' });
        put('activity', { id: 'da' + id, leadId, at: Date.now(), kind: 'visit', text: 'Site survey booked by Asha (AI)' });
        put('wa_messages', { id: 'dw' + id, leadId, phone: l.phone, dir: 'out', at: Date.now() + 1000, kind: 'visit', text: `नमस्कार ${first(l.name)} जी, Solaris सोलरचा मोफत सर्व्हे उद्या सकाळी 11:00 ला ठरला आहे. पत्ता: ${l.address}.`, status: 'delivered', by: 'AI agent' });
      }
    }, 9000);
  }
  function send(b) {
    const ids = [].concat(b.lead_ids || [], b.lead_id ? [b.lead_id] : []); const results = [];
    const content = b.content_id && byId('content', b.content_id);
    ids.forEach((id) => {
      const l = byId('leads', id); if (!l) return;
      const text = String((b.captions && b.captions[id]) || b.text || (b.template_key === 'visit' ? `नमस्कार ${first(l.name)} जी, तुमचा मोफत सर्व्हे ठरला आहे.` : caption(l, content))).replace(/\{name\}/g, first(l.name));
      const mid = 'dw' + Math.random().toString(36).slice(2, 9);
      put('wa_messages', { id: mid, leadId: id, phone: l.phone, dir: 'out', at: Date.now(), kind: b.template_key || 'update', text, status: 'sent', by: 'demo' });
      setTimeout(() => { const m = byId('wa_messages', mid); if (m) put('wa_messages', Object.assign({}, m, { status: 'read' })); }, 4000);
      results.push({ id, status: 'sent' });
    });
    return { ok: true, sent: results.length, failed: 0, skipped: 0, results };
  }
  async function handle(url, opts) {
    const u = new URL(url); const p = u.pathname; const method = (opts.method || 'GET').toUpperCase();
    let body = null; if (opts.body && typeof opts.body === 'string') { try { body = JSON.parse(opts.body); } catch (e) { body = null; } }
    await new Promise((r) => setTimeout(r, 120));
    if (p.startsWith('/auth/v1/')) return reply({ access_token: 'demo', refresh_token: 'demo', expires_in: 360000, user: { email: 'demo@solaris-ai-os' } });
    const m = p.match(/^\/rest\/v1\/(\w+)/);
    if (m) {
      const t = m[1]; if (!db[t]) return reply({ message: 'no table' }, 404);
      if (method === 'GET') { const g = (u.searchParams.get('updated_at') || 'gt.1970').slice(3); return reply(db[t].filter((r) => r.updated_at > g).sort((a, b) => (a.updated_at < b.updated_at ? -1 : 1))); }
      [].concat(body || []).forEach((r) => put(t, t === 'config' ? { id: r.id, value: r.data.value } : r.data));
      return new Response(null, { status: 201 });
    }
    if (p.startsWith('/storage/')) return reply({ Key: 'media/demo' });
    if (p.startsWith('/functions/v1/')) {
      const f = p.split('/')[3]; body = body || {};
      if (f === 'wa-send' && body.check) return reply({ ok: true, whatsapp: { provider: 'meta', ready: true }, voice: { ready: true }, captions: { ready: true }, webhookToken: true, waWebhook: true });
      if (f === 'wa-send') return reply(send(body));
      if (f === 'wa-captions') {
        let content = body.content_id && byId('content', body.content_id);
        if (!content) { content = { id: 'dct' + Date.now(), title: body.title || (body.url ? 'Rooftop solar offer this month' : 'Solaris update'), summary: body.note || '', url: body.url || '', mediaUrl: body.mediaUrl, mediaKind: body.mediaKind, fileName: body.fileName, createdAt: Date.now(), by: 'demo' }; if (body.save) put('content', content); }
        const ls = (body.lead_ids || []).map((id) => byId('leads', id)).filter(Boolean);
        const caps = ls.length ? ls.map((l) => ({ id: l.id, caption: caption(l, content), ai: true })) : ['mr', 'hi', 'en'].map((lang) => ({ id: lang, caption: caption({ name: '{name}', lang }, content), ai: true }));
        return reply({ ok: true, content, captions: caps });
      }
      if (f === 'start-call') { const ids = [].concat(body.lead_ids || [], body.lead_id ? [body.lead_id] : []); ids.slice(0, 3).forEach((id, i) => setTimeout(() => simulateCall(id), i * 4000)); return reply({ ok: true, queued: ids.length, started_now: Math.min(3, ids.length) }); }
      if (f === 'recording') return reply({ error: 'Recordings play here once Sarvam is connected' }, 404);
      return reply({ ok: true });
    }
    return reply({}, 404);
  }
  const realFetch = window.fetch.bind(window);
  window.fetch = function (input, opts) {
    const url = typeof input === 'string' ? input : input.url;
    if (url.startsWith(BASE)) return handle(url, opts || {});
    return realFetch(input, opts);
  };

  /* a new enquiry arrives while the client is watching */
  setTimeout(() => {
    const l = put('leads', { id: 'dlnew', name: 'Swati Kale', phone: '+91 90000 19999', area: 'Gangapur Road', bill: 5600, temp: 'HOT', stage: 'New', lang: 'mr', type: 'Home', source: 'Meta Ads', score: 88, consent: true, objections: [], notes: [], tags: [], createdAt: Date.now(), lastContact: Date.now() });
    put('activity', { id: 'dahot', leadId: l.id, at: Date.now(), kind: 'hot', text: 'New HOT enquiry from Meta Ads — bill ₹5,600' });
    setTimeout(() => simulateCall(l.id), 3000);
  }, 35000);

  /* banner */
  document.addEventListener('DOMContentLoaded', () => {
    const b = document.createElement('div');
    b.className = 'demobar';
    b.innerHTML = '<b>Demo</b> — sample data only, nothing is saved. <a href="' + location.pathname + '">Exit demo</a>';
    document.body.insertBefore(b, document.body.firstChild);
  });
})();
