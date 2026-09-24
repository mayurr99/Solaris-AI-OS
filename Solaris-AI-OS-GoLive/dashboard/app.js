/* Solaris AI OS — UI core + Overview, Live calls, Leads, Lead drawer, Pipeline */
(function () {
  const { S, D, Live, Camp, AI, Voice, util: U, sizing, scoreLead, tempOf, routeOwner, person, agentById } = SOL;
  const h = U.esc;
  const A = window.APP = { view: 'overview', views: {}, acts: {}, f: { temp: 'All', stage: '', owner: '', source: '', type: '', lang: '', q: '', sort: 'score' }, sel: new Set(), drawer: null, dtab: 'overview', modal: null, open: {} };

  /* ---------- icons ---------- */
  const P = {
    home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
    phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.9.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
    users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
    cols: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M15 3v18"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    cal: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    bot: '<rect x="3" y="8" width="18" height="12" rx="3"/><path d="M12 8V4"/><circle cx="12" cy="3" r="1"/><circle cx="8.5" cy="14" r="1.2"/><circle cx="15.5" cy="14" r="1.2"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
    mega: '<path d="M3 11l18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
    chart: '<path d="M3 3v18h18"/><path d="M7 14l4-4 4 4 5-6"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="M21 21l-4.3-4.3"/>',
    play: '<path d="M6 4l14 8-14 8z"/>', stop: '<rect x="6" y="6" width="12" height="12" rx="1"/>',
    wa: '<path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z"/>',
    check: '<path d="M20 6L9 17l-5-5"/>', x: '<path d="M18 6L6 18M6 6l12 12"/>', plus: '<path d="M12 5v14M5 12h14"/>',
    dl: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
    vol: '<path d="M11 5L6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/>', mute: '<path d="M11 5L6 9H2v6h4l5 4z"/><path d="M23 9l-6 6M17 9l6 6"/>',
    note: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>', alert: '<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',
    arrow: '<path d="M5 12h14M12 5l7 7-7 7"/>', zap: '<path d="M13 2L3 14h9l-1 8 10-12h-9z"/>', headset: '<path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1v-6h3zM3 19a2 2 0 0 0 2 2h1v-6H3z"/>',
    map: '<path d="M12 22s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12z"/><circle cx="12" cy="10" r="2.5"/>', ticket: '<path d="M3 9a3 3 0 0 0 0 6v4h18v-4a3 3 0 0 0 0-6V5H3z"/>'
  };
  const I = (n, cls) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="${cls || ''}" aria-hidden="true">${P[n] || ''}</svg>`;
  A.I = I;

  /* ---------- helpers ---------- */
  const initials = (n) => String(n || '?').split(/\s+/).map((x) => x[0]).slice(0, 2).join('').toUpperCase();
  const tempPill = (l) => l.stage === 'Won' ? '<span class="pill good">CUSTOMER</span>' : `<span class="pill ${h(l.temp || 'COLD')}">${h(l.temp || 'COLD')}</span>`;
  const outcomePill = (o) => { const m = { 'Visit booked': 'good', 'Meeting booked': 'good', Transferred: 'sun', Callback: 'info', Nurture: 'mute', 'No answer': 'mute', DNC: 'bad', 'Support ticket': 'info', 'Ended by manager': 'mute', Qualified: 'good' }; return `<span class="pill ${m[o] || 'line'}">${h(o)}</span>`; };
  const langTag = (l) => `<span class="pill line" title="${h(U.LANG[l])}">${h({ mr: 'मराठी', hi: 'हिंदी', en: 'EN' }[l] || l)}</span>`;
  const leadName = (id) => { const l = S.lead(id); return l ? l.name : 'Unknown'; };
  const nameOf = (id) => { if (!id) return '—'; if (id.startsWith('ag_')) return agentById(id).name + ' (AI)'; return person(id).name; };
  const opts = (arr, val, blank) => (blank != null ? `<option value="">${h(blank)}</option>` : '') + arr.map((o) => { const v = typeof o === 'object' ? o.v : o, t = typeof o === 'object' ? o.t : o; return `<option value="${h(v)}" ${String(v) === String(val) ? 'selected' : ''}>${h(t)}</option>`; }).join('');
  const salesOpts = (val, blank) => opts(S.state.team.filter((t) => t.active).map((t) => ({ v: t.id, t: t.name + ' · ' + t.role })), val, blank);
  const nextAction = (l) => {
    const now = Date.now();
    const v = S.state.visits.filter((x) => x.leadId === l.id && x.at > now - 3600e3 && !['Cancelled', 'Completed', 'No-show'].includes(x.status)).sort((a, b) => a.at - b.at)[0];
    const f = S.state.followups.filter((x) => x.leadId === l.id && x.status === 'pending').sort((a, b) => a.dueAt - b.dueAt)[0];
    if (v && (!f || v.at < f.dueAt)) return { t: v.kind + ' · ' + U.fmtDT(v.at), at: v.at, kind: 'visit' };
    if (f) return { t: f.type + ' · ' + U.rel(f.dueAt), at: f.dueAt, kind: 'fu', overdue: f.dueAt < now };
    return null;
  };
  A.nextAction = nextAction;
  const toast = (msg) => { const el = document.createElement('div'); el.className = 'toast'; el.setAttribute('role', 'status'); el.textContent = msg; document.body.appendChild(el); setTimeout(() => el.remove(), 2800); };
  Object.assign(A, { h, initials, tempPill, outcomePill, langTag, leadName, nameOf, opts, salesOpts, toast });

  const today0 = () => U.startOfDay(Date.now());
  const isToday = (t) => t >= today0() && t < today0() + U.DAY;

  /* ---------- nav, brand, language, role view ---------- */
  const MR = { Command: 'नियंत्रण', Overview: 'आढावा', 'Live calls': 'लाईव्ह कॉल', CRM: 'CRM', Leads: 'लीड्स', Pipeline: 'पाइपलाइन', 'Follow-ups': 'फॉलो-अप', 'Site visits': 'साइट भेटी', 'AI calling': 'AI कॉलिंग', 'Voice agents': 'व्हॉइस एजंट', 'Excel lead import': 'Excel लीड इम्पोर्ट', Campaigns: 'कॉलिंग मोहीम', Manage: 'व्यवस्थापन', Reports: 'अहवाल', Settings: 'सेटिंग्ज', 'Demo guide': 'डेमो मार्गदर्शक', 'Set up for Solaris': 'Solaris सेटअप', Personalize: 'डॅशबोर्ड रचना',
    'AI calls today': 'आजचे AI कॉल', 'Qualified today': 'आज पात्र लीड्स', 'Visits & meetings booked': 'बुक झालेल्या भेटी', 'Speed to lead (7 days)': 'प्रतिसाद वेळ (7 दिवस)', 'Open pipeline': 'चालू पाइपलाइन', 'Won (30 days)': 'मिळालेले काम (30 दिवस)', 'Overdue follow-ups': 'थकलेले फॉलो-अप', 'Lead → visit': 'लीड → भेट',
    'Live now': 'आत्ता चालू कॉल', 'Needs attention': 'लक्ष द्या', 'Calls, last 7 days': 'मागील 7 दिवसांचे कॉल', "Today's visits": 'आजच्या भेटी', 'Hot leads': 'हॉट लीड्स', 'Pipeline by stage': 'टप्प्यानुसार पाइपलाइन', 'Recent activity': 'अलीकडील घडामोडी',
    'Simulate inbound call': 'इनकमिंग कॉल दाखवा', 'Import Excel leads': 'Excel लीड्स जोडा', 'Watch live calls': 'लाईव्ह कॉल पहा', 'Viewing as': 'पाहणारे' };
  const T = (s) => (S.state.settings.uiLang === 'mr' && MR[s]) || s;
  A.T = T;
  A.sl = (k) => (S.state.settings.stageLabels || {})[k] || k;
  A.ph = (p) => S.state.settings.maskPhones ? U.maskPhone(p) : p;
  A.viewAs = () => S.state.settings.viewAs || 'owner';
  A.mine = (leadId) => { const v = A.viewAs(); if (v === 'owner') return true; const l = S.lead(leadId); return !!l && l.owner === v; };
  A.myLeads = () => S.state.leads.filter((l) => A.mine(l.id));
  const NAV = [
    ['sec', 'Command'], ['overview', 'Overview', 'home'], ['live', 'Live calls', 'headset'],
    ['sec', 'CRM'], ['leads', 'Leads', 'users'], ['pipeline', 'Pipeline', 'cols'], ['followups', 'Follow-ups', 'clock'], ['visits', 'Site visits', 'cal'],
    ['sec', 'AI calling'], ['agents', 'Voice agents', 'bot'], ['import', 'Excel lead import', 'upload'], ['campaigns', 'Campaigns', 'mega'],
    ['sec', 'Manage'], ['reports', 'Reports', 'chart'], ['setup', 'Set up for Solaris', 'zap'], ['personalize', 'Personalize', 'note'], ['settings', 'Settings', 'gear'], ['guide', 'Demo guide', 'book']
  ];
  function applyBrand() {
    const s = S.state.settings; const c = /^#[0-9a-f]{6}$/i.test(s.brandColor || '') ? s.brandColor : '#2447B8';
    document.documentElement.style.setProperty('--brand', c);
  }
  A.applyBrand = applyBrand;
  function renderSide() {
    const st = S.state, s = st.settings, now = Date.now();
    const cnt = {
      live: Live.calls.length,
      followups: st.followups.filter((f) => SOL.isOverdue(f, now) && A.mine(f.leadId)).length,
      visits: st.visits.filter((v) => isToday(v.at) && v.status !== 'Cancelled' && A.mine(v.leadId)).length,
      campaigns: st.campaigns.filter((c) => c.status === 'Running').length
    };
    const logo = s.logo ? `<img src="${h(s.logo)}" alt="" width="32" height="32" style="border-radius:8px;object-fit:cover;background:#fff">` : `<span style="width:32px;height:32px;border-radius:8px;background:var(--brand);display:grid;place-items:center;color:#fff;font-family:var(--f-disp);font-weight:800;font-size:15px;flex:none">${h(initials(s.company || 'S'))}</span>`;
    document.getElementById('side').innerHTML = `<div class="brand">${logo}<div><b>${h(s.company || 'Solaris')} AI OS</b><small>${h(s.tagline || '')}</small></div></div>` +
      NAV.map((n) => n[0] === 'sec' ? `<div class="navsec">${h(T(n[1]))}</div>` : `<button class="nav ${A.view === n[0] ? 'on' : ''}" data-act="go" data-v="${n[0]}" ${A.view === n[0] ? 'aria-current="page"' : ''}>${I(n[2])}<span class="lb">${h(T(n[1]))}</span>${cnt[n[0]] ? `<span class="cnt ${n[0] === 'live' ? 'live' : ''}">${cnt[n[0]]}</span>` : ''}</button>`).join('') +
      `<div class="side-foot">${s.realMode ? 'Solaris workspace · real leads' : 'Demo workspace · sample data'}<br>Data stays in this browser</div>`;
  }
  function renderTop() {
    const st = S.state;
    const ai = AI.sample ? '<span class="pill good" title="Test calls use Claude to generate replies">AI brain: Claude</span>' : AI.ready ? '<span class="pill mute" title="Claude is not available in this view; test calls use the built-in script engine">AI brain: script engine</span>' : '<span class="pill line">Connecting…</span>';
    const voice = st.settings.voiceOn;
    const va = A.viewAs();
    document.getElementById('top').innerHTML = `<div class="search">${I('search')}<input id="gsearch" type="search" placeholder="Search leads by name, phone, area…" value="${h(A.f.q)}" aria-label="Search leads"></div><span class="sp"></span>
      <label class="row nw small muted">${h(T('Viewing as'))}<select class="i" style="width:auto;padding:5px 8px" data-chg="viewAs" id="viewAsSel">${opts([{ v: 'owner', t: 'Owner (everything)' }].concat(st.team.filter((t) => t.role === 'Sales' && t.active).map((t) => ({ v: t.id, t: t.name }))), va)}</select></label>${ai}
      <button class="btn ghost sm" data-act="voice" title="Speak call audio aloud">${I(voice ? 'vol' : 'mute')}${voice ? 'Voice on' : 'Voice off'}</button>
      <button class="btn sun" data-act="simInbound">${I('phone')}${h(T('Simulate inbound call'))}</button>`;
  }
  A.acts.viewAs = (el) => { S.state.settings.viewAs = el.value; A.f.owner = ''; S.change('settings'); renderTop(); toast(el.value === 'owner' ? 'Showing everything' : 'Showing only ' + person(el.value).name + '\'s leads, follow-ups and visits'); };
  /* ---------- render loop with focus preservation ---------- */
  let raf = null;
  function render() {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const ae = document.activeElement; const aid = ae && ae.id; let selS, selE; try { selS = ae.selectionStart; selE = ae.selectionEnd; } catch (e) {}
      const dbd = document.querySelector('.drawer .dbd'); const dScroll = dbd ? dbd.scrollTop : 0;
      const txs = {}; document.querySelectorAll('.tx[id]').forEach((t) => { txs[t.id] = { top: t.scrollTop, atBottom: t.scrollHeight - t.scrollTop - t.clientHeight < 40 }; });
      renderSide();
      const fn = A.views[A.view] || A.views.overview;
      document.getElementById('main').innerHTML = `<div class="page">${fn()}</div>`;
      renderOverlay();
      const nd = document.querySelector('.drawer .dbd'); if (nd) nd.scrollTop = dScroll;
      document.querySelectorAll('.tx[id]').forEach((t) => { const p = txs[t.id]; if (!p || p.atBottom || t.dataset.follow === '1') t.scrollTop = t.scrollHeight; else t.scrollTop = p.top; });
      if (aid) { const el = document.getElementById(aid); if (el && el !== document.activeElement) { el.focus(); try { if (selS != null) el.setSelectionRange(selS, selE); } catch (e) {} } }
      A.after && A.after.forEach((f) => f()); A.after = [];
    });
  }
  A.render = render;
  function go(v, params) { A.view = v; A.params = params || {}; document.getElementById('main').scrollTop = 0; try { sessionStorage.setItem('sol-view', v); } catch (e) {} render(); }
  A.go = go;

  /* ---------- overlay: drawer + modal ---------- */
  function renderOverlay() {
    let html = '';
    if (A.drawer) { const l = S.lead(A.drawer); if (l) html += `<div class="scrim" data-act="closeDrawer"></div><aside class="drawer" role="dialog" aria-label="Lead details">${A.drawerHtml(l)}</aside>`; else A.drawer = null; }
    if (A.modal) html += `<div class="scrim m" data-act="closeModal"></div><div class="modal" role="dialog" aria-modal="true">${A.modal()}</div>`;
    document.getElementById('overlay').innerHTML = html;
  }
  A.openLead = (id, tab) => { A.drawer = id; A.dtab = tab || 'overview'; render(); };
  A.showModal = (fn) => { A.modal = fn; render(); setTimeout(() => { const f = document.querySelector('.modal input,.modal select,.modal textarea'); if (f) f.focus(); }, 60); };
  A.closeModal = () => { A.modal = null; render(); };

  /* ---------- events ---------- */
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]'); if (!el) return;
    const t = e.target; if (t !== el && (t.tagName === 'SELECT' || t.tagName === 'OPTION' || t.tagName === 'TEXTAREA' || (t.tagName === 'INPUT' && t.type !== 'checkbox'))) return;
    const fn = A.acts[el.dataset.act]; if (fn) { e.preventDefault(); fn(el, e); }
  });
  document.addEventListener('change', (e) => { const el = e.target.closest('[data-chg]'); if (el && A.acts[el.dataset.chg]) A.acts[el.dataset.chg](el, e); });
  document.addEventListener('input', (e) => {
    if (e.target.id === 'gsearch') { A.f.q = e.target.value; if (A.view !== 'leads') go('leads'); else render(); return; }
    const el = e.target.closest('[data-inp]'); if (el && A.acts[el.dataset.inp]) A.acts[el.dataset.inp](el, e);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { if (A.modal) A.closeModal(); else if (A.drawer) { A.drawer = null; Voice.stop(); render(); } }
    if (e.key === 'Enter' && e.target.dataset && e.target.dataset.enter && A.acts[e.target.dataset.enter]) { e.preventDefault(); A.acts[e.target.dataset.enter](e.target, e); }
  });
  Object.assign(A.acts, {
    go: (el) => { A.drawer = null; go(el.dataset.v); },
    closeDrawer: () => { A.drawer = null; Voice.stop(); A.playing = null; render(); },
    closeModal: () => A.closeModal(),
    openLead: (el) => A.openLead(el.dataset.id, el.dataset.tab),
    voice: () => { S.state.settings.voiceOn = !S.state.settings.voiceOn; if (!S.state.settings.voiceOn) Voice.stop(); S.save(); renderTop(); toast(S.state.settings.voiceOn ? 'Voice on — calls you start will be spoken aloud' : 'Voice off'); },
    simInbound: () => { const lc = A.simInbound(); if (lc) { A.drawer = null; go('live'); toast('Inbound call from ' + U.maskPhone(S.lead(lc.leadId).phone) + ' — answered by ' + agentById(lc.agentId).name); } },
    liveAct: (el) => { const w = el.dataset.w; if (w === 'whisper') { const inp = document.getElementById('wh_' + el.dataset.id); Live.action(el.dataset.id, 'whisper', inp && inp.value); } else Live.action(el.dataset.id, w); },
    callLead: (el) => { const lc = Live.start(el.dataset.id, { speak: S.state.settings.voiceOn, agentId: el.dataset.agent || null }); if (lc) { A.drawer = null; go('live'); } else toast('This number is on the do-not-call list'); },
    stopAll: () => { Live.stopAll(); S.state.campaigns.forEach((c) => { if (c.status === 'Running') c.status = 'Paused'; }); S.change('live'); toast('All live calls stopped'); }
  });

  /* ---------- simulate inbound ---------- */
  A.simInbound = function (opts) {
    opts = opts || {};
    const type = opts.type || (Math.random() < 0.7 ? 'Home' : Math.random() < 0.5 ? 'Society' : 'Factory');
    const fn = D.FIRST[Math.floor(Math.random() * D.FIRST.length)], ln = D.LAST[Math.floor(Math.random() * D.LAST.length)];
    const used = new Set(S.state.leads.map((l) => l.name)); const pool = type === 'Society' ? D.SOCIETIES : type === 'Factory' ? D.FIRMS.slice(0, 12) : null; const free = pool ? pool.filter((x) => !used.has(x)) : null; const name = pool ? (free.length ? free[Math.floor(Math.random() * free.length)] : pool[0] + ' ' + (used.size % 9 + 2)) : fn + ' ' + ln;
    let phone; do { phone = '+91 9' + Math.floor(1000 + Math.random() * 8999) + ' ' + Math.floor(10000 + Math.random() * 89999); } while (S.state.leads.some((l) => l.phone === phone));
    const industrial = D.AREAS.filter((a) => a.zone === 'Industrial');
    const area = (type === 'Factory' ? industrial : D.AREAS.filter((a) => a.zone !== 'Industrial'))[Math.floor(Math.random() * (type === 'Factory' ? 4 : 16))].en;
    const lead = { id: U.uid('ld'), name, contact: type === 'Home' ? '' : fn + ' ' + ln, phone, lang: opts.lang || (Math.random() < 0.65 ? 'mr' : 'hi'), area, type, bill: null, source: opts.source || (Math.random() < 0.5 ? 'Missed call' : 'Website'), stage: 'New', temp: 'COLD', score: 0, objections: [], notes: [], consent: true, createdAt: Date.now(), tags: ['Inbound'] };
    lead.owner = routeOwner(lead);
    lead.agentId = type === 'Home' ? SOL.roleAgent('inbound') : SOL.roleAgent('commercial');
    const scen = opts.scenario || (type === 'Society' ? 'society' : type === 'Factory' ? 'factory' : ['res_hot', 'res_hot', 'res_callback', 'rented'][Math.floor(Math.random() * 4)]);
    lead.scenario = scen;
    S.state.leads.unshift(lead);
    S.log(lead.id, 'crm', 'New lead created automatically from inbound call (' + lead.source + ')');
    return Live.start(lead.id, { dir: 'Inbound', speak: S.state.settings.voiceOn, scenario: scen });
  };

  /* ---------- charts ---------- */
  A.barChart = function (series, o) {
    o = o || {};
    const W = 560, H = o.h || 180, pl = 30, pb = 26, pt = 10, pr = 8;
    const max = Math.max(1, ...series.map((s) => s.vals.reduce((a, b) => a + b, 0)));
    const step = Math.ceil(max / 4 / 5) * 5 || 1, top = step * 4;
    const bw = (W - pl - pr) / series.length;
    const y = (v) => pt + (H - pt - pb) * (1 - v / top);
    let g = '';
    for (let i = 0; i <= 4; i++) { const v = step * i; g += `<line x1="${pl}" x2="${W - pr}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line2)"/><text x="${pl - 6}" y="${y(v) + 4}" text-anchor="end" font-size="10" fill="var(--muted)" font-family="IBM Plex Mono">${v}</text>`; }
    const cols = o.colors || ['var(--accent)', 'var(--line)'];
    series.forEach((s, i) => {
      let acc = 0; const x = pl + i * bw + bw * 0.2, w = bw * 0.6;
      s.vals.forEach((v, k) => { if (!v) return; const y1 = y(acc + v), y0 = y(acc); g += `<rect x="${x}" y="${y1}" width="${w}" height="${Math.max(0, y0 - y1)}" rx="2" fill="${cols[k]}"><title>${h(s.label)}: ${v}</title></rect>`; acc += v; });
      g += `<text x="${x + w / 2}" y="${H - 8}" text-anchor="middle" font-size="10.5" fill="var(--muted)">${h(s.label)}</text>`;
      if (o.totals !== false) g += `<text x="${x + w / 2}" y="${y(acc) - 4}" text-anchor="middle" font-size="10.5" fill="var(--ink2)" font-family="IBM Plex Mono">${acc}</text>`;
    });
    return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${h(o.label || 'chart')}">${g}</svg>`;
  };
  A.hbars = (rows, max) => { max = max || Math.max(1, ...rows.map((r) => r[1])); return rows.map((r) => `<div class="hbar"><span class="lbl" title="${h(r[0])}">${h(r[0])}</span><span class="track"><i style="width:${(r[1] / max) * 100}%;${r[2] ? 'background:' + r[2] : ''}"></i></span><span class="val">${r[3] != null ? r[3] : r[1]}</span></div>`).join(''); };

  /* ================= OVERVIEW (personalisable) ================= */
  A.KPI_CATALOG = {
    calls: 'AI calls today', qualified: 'Qualified today', booked: 'Visits & meetings booked', speed: 'Speed to lead (7 days)',
    pipeline: 'Open pipeline', won30: 'Won (30 days)', overdue: 'Overdue follow-ups', conv: 'Lead → visit'
  };
  A.WIDGET_CATALOG = { live: 'Live now', attention: 'Needs attention', hot: 'Hot leads', chart: 'Calls, last 7 days', visits: "Today's visits", agents: 'Voice agents', pipeline: 'Pipeline by stage', activity: 'Recent activity' };
  A.views.overview = function () {
    const st = S.state, s = st.settings, now = Date.now();
    const my = A.myLeads(); const myIds = new Set(my.map((l) => l.id));
    const calls = st.calls.filter((c) => myIds.has(c.leadId));
    const callsT = calls.filter((c) => isToday(c.at));
    const ans = callsT.filter(SOL.answered);
    const qual = new Set(ans.filter((c) => (S.lead(c.leadId) || {}).score >= 50).map((c) => c.leadId));
    const booked = callsT.filter((c) => ['Visit booked', 'Meeting booked', 'Transferred'].includes(c.outcome)).length;
    const trans = callsT.filter((c) => c.transferredTo || c.outcome === 'Transferred').length;
    const firstCall = {}; calls.forEach((c) => { if (!firstCall[c.leadId] || c.at < firstCall[c.leadId]) firstCall[c.leadId] = c.at; });
    const stl = my.filter((l) => firstCall[l.id] && l.createdAt > now - 7 * U.DAY).map((l) => (firstCall[l.id] - l.createdAt) / 60000);
    const avgStl = stl.length ? stl.reduce((a, b) => a + b, 0) / stl.length : 0;
    const overdue = st.followups.filter((f) => SOL.isOverdue(f, now) && myIds.has(f.leadId)).sort((a, b) => a.dueAt - b.dueAt);
    const openP = my.filter((l) => !['Won', 'Lost'].includes(l.stage));
    const won30 = my.filter((l) => l.stage === 'Won' && !l.existing && (l.lastContact || l.createdAt) > now - 30 * U.DAY);
    const l7 = my.filter((l) => l.createdAt > now - 7 * U.DAY);
    const afterHours = calls.filter((c) => { const hh = new Date(c.at).getHours(); return c.at > now - 7 * U.DAY && (hh >= 19 || hh < 10) && SOL.answered(c); }).length;
    const KPI = {
      calls: [callsT.length, `${ans.length} answered · ${callsT.length ? Math.round(ans.length / callsT.length * 100) : 0}% connect`],
      qualified: [qual.size, 'score 50+ after the call'],
      booked: [booked, `${trans} hot lead${trans === 1 ? '' : 's'} transferred live`],
      speed: [avgStl.toFixed(1) + '<small style="font-size:15px"> min</small>', `${afterHours} calls outside office hours`],
      pipeline: [U.inrShort(openP.reduce((a, l) => a + (l.estValue || 0), 0)), `${openP.length} open deals`],
      won30: [U.inrShort(won30.reduce((a, l) => a + (l.estValue || 0), 0)), `${won30.length} deals won`],
      overdue: [overdue.length, 'need a call or message today'],
      conv: [(l7.length ? Math.round(l7.filter((l) => l.visitBooked).length / l7.length * 100) : 0) + '%', `${l7.length} leads this week`]
    };
    const hr = new Date().getHours();
    const greetEn = hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening';
    const va = A.viewAs(); const who = va === 'owner' ? (s.company || 'Solaris') + ' team' : person(va).name;
    const greet = s.uiLang === 'mr' ? `नमस्कार, ${h(who)}` : `${greetEn}, ${h(who)}`;
    const W = {};
    W.live = () => { if (SOL.LiveSync && SOL.LiveSync.on()) { const dl = st.calls.filter((c) => c.outcome === 'Dialling' && now - c.at < 30 * U.MIN && myIds.has(c.leadId)); const recent = calls.filter((c) => SOL.answered(c) && now - c.at < 6 * U.HOUR).slice(0, 4); return `<div class="card"><div class="hd"><span class="dot ${dl.length ? 'live' : ''}"></span><h2>${h(T('Live now'))}</h2><span class="pill good">real calls</span><button class="btn sm" data-act="go" data-v="live">Open live view ${I('arrow')}</button></div><div class="bd stack">${dl.map((c) => `<div class="row nw"><div class="wave on">${'<i></i>'.repeat(7)}</div><b class="sp">${h(leadName(c.leadId))}</b><span class="small muted">dialling · ${U.rel(c.at)}</span></div>`).join('')}${recent.map((c) => `<div class="row nw" style="cursor:pointer" data-act="openLead" data-id="${c.leadId}" data-tab="calls">${outcomePill(c.outcome)}<b class="sp">${h(leadName(c.leadId))}</b><span class="small muted">${U.rel(c.at)}</span></div>`).join('') || (dl.length ? '' : '<span class="muted">No calls in the last few hours.</span>')}</div></div>`; } return W.liveDemo(); };
    W.liveDemo = () => `<div class="card"><div class="hd"><span class="dot ${Live.calls.length ? 'live' : ''}"></span><h2>${h(T('Live now'))}</h2><button class="btn sm" data-act="go" data-v="live">Open live view ${I('arrow')}</button></div>
      <div class="bd">${Live.calls.some((c) => A.mine(c.leadId)) ? `<div class="stack">${Live.calls.filter((c) => A.mine(c.leadId)).map((lc) => { const l = S.lead(lc.leadId); const last = lc.lines[lc.lines.length - 1]; return `<div class="row nw" style="gap:12px;cursor:pointer" data-act="go" data-v="live"><div class="wave on">${'<i></i>'.repeat(7)}</div><div style="min-width:0;flex:1"><b>${h(l.name)}</b> <span class="muted small">· ${h(agentById(lc.agentId).name)} · ${U.LANG[lc.lang]}</span><div class="dv small muted" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${last ? h(last.t) : 'Ringing…'}</div></div>${tempPill(l)}</div>`; }).join('')}</div>` : `<div class="row"><span class="muted">No calls in progress.</span><span class="sp"></span><button class="btn sun sm" data-act="simInbound">${I('phone')}Simulate an inbound enquiry</button></div>`}</div></div>`;
    W.attention = () => {
      const hotNoAction = my.filter((l) => l.temp === 'HOT' && !['Won', 'Lost'].includes(l.stage) && !nextAction(l));
      const noshow = st.visits.filter((v) => v.status === 'No-show' && v.at > now - 7 * U.DAY && myIds.has(v.leadId));
      const tickets = st.tickets.filter((t) => t.status === 'Open' && myIds.has(t.leadId));
      const row = (pill, id, name, txt, right) => `<div class="row nw" style="padding:8px 0;border-bottom:1px solid var(--line2)">${pill}<span class="sp" style="min-width:0"><b data-act="openLead" data-id="${id}" style="cursor:pointer">${h(name)}</b> <span class="muted small">· ${h(txt)}</span></span>${right || ''}</div>`;
      const att = [];
      overdue.slice(0, 4).forEach((f) => att.push(row('<span class="pill bad">Overdue</span>', f.leadId, leadName(f.leadId), f.type + ' · ' + (f.note || ''), `<span class="small muted">${U.rel(f.dueAt)}</span>`)));
      hotNoAction.slice(0, 3).forEach((l) => att.push(row('<span class="pill HOT">HOT</span>', l.id, l.name, 'no next step booked', `<button class="btn sm" data-act="openLead" data-id="${l.id}">Plan</button>`)));
      noshow.slice(0, 2).forEach((v) => att.push(row('<span class="pill bad">No-show</span>', v.leadId, leadName(v.leadId), v.kind + ' ' + U.fmtDate(v.at) + ' — AI rebooking call queued')));
      tickets.slice(0, 2).forEach((t) => att.push(row(`<span class="pill info">${h(t.id)}</span>`, t.leadId, leadName(t.leadId), t.subject)));
      return `<div class="card"><div class="hd"><h2>${h(T('Needs attention'))}</h2><span class="pill bad">${overdue.length} overdue</span><button class="btn sm ghost" data-act="go" data-v="followups">All follow-ups</button></div><div class="bd" style="padding-top:4px">${att.join('') || '<div class="empty">Nothing waiting. Every lead has a next step.</div>'}</div></div>`;
    };
    W.hot = () => { const hot = my.filter((l) => l.temp === 'HOT' && !['Won', 'Lost'].includes(l.stage)).sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 6); return `<div class="card"><div class="hd"><h2>${h(T('Hot leads'))}</h2><button class="btn sm ghost" data-act="hotLeads">All hot leads</button></div><div class="bd stack">${hot.map((l) => { const na = nextAction(l); return `<div class="row nw" style="cursor:pointer" data-act="openLead" data-id="${l.id}"><span class="score" style="width:28px">${l.score}</span><div class="sp" style="min-width:0"><b>${h(l.name)}</b> <span class="small muted">· ${h(l.area || '')} · ${l.sizeKw || '—'} kW</span><div class="xs muted">${na ? h(na.t) : 'No next step'}</div></div><span class="small">${h(person(l.owner).name.split(' ')[0])}</span></div>`; }).join('') || '<span class="muted">No hot leads right now.</span>'}</div></div>`; };
    W.chart = () => { const days = []; for (let i = 6; i >= 0; i--) { const d0 = today0() - i * U.DAY; const cs = calls.filter((c) => c.at >= d0 && c.at < d0 + U.DAY); days.push({ label: new Date(d0).toLocaleDateString('en-IN', { weekday: 'short' }), vals: [cs.filter(SOL.answered).length, cs.filter((c) => !SOL.answered(c)).length] }); } return `<div class="card"><div class="hd"><h2>${h(T('Calls, last 7 days'))}</h2><span class="row small muted"><span class="dot" style="background:var(--accent)"></span>answered <span class="dot" style="background:var(--line)"></span>no answer</span></div><div class="bd">${A.barChart(days, { label: 'Calls per day' })}</div></div>`; };
    W.visits = () => { const tv = st.visits.filter((v) => isToday(v.at) && v.status !== 'Cancelled' && (myIds.has(v.leadId) || v.with === va)).sort((a, b) => a.at - b.at); return `<div class="card"><div class="hd"><h2>${h(T("Today's visits"))}</h2><button class="btn sm ghost" data-act="go" data-v="visits">Calendar</button></div><div class="bd">${tv.length ? tv.map((v) => `<div class="row nw" style="padding:6px 0;border-bottom:1px solid var(--line2)"><span class="mono small" style="width:64px">${U.fmtTime(v.at)}</span><span class="sp" style="min-width:0"><b data-act="openLead" data-id="${v.leadId}" style="cursor:pointer">${h(leadName(v.leadId))}</b><div class="small muted">${h(v.kind)} · ${h(nameOf(v.with))}</div></span><span class="pill ${v.status === 'Completed' ? 'good' : v.status === 'No-show' ? 'bad' : 'info'}">${h(v.status)}</span></div>`).join('') : '<div class="muted">No visits today.</div>'}</div></div>`; };
    W.agents = () => `<div class="card"><div class="hd"><h2>${h(T('Voice agents'))}</h2><span class="pill line">${s.agentMode === 'single' ? 'One agent for everything' : 'Specialist agents'}</span><button class="btn sm ghost" data-act="go" data-v="agents">Configure</button></div><div class="bd stack">${st.agents.filter((a) => s.agentMode === 'single' ? a.id === 'ag_one' : a.id !== 'ag_one').map((a) => { const cs = callsT.filter((c) => c.agentId === a.id); const live = Live.calls.filter((c) => c.agentId === a.id).length; return `<div class="row nw"><span class="av ai">${h(a.name[0])}</span><div class="sp" style="min-width:0"><b>${h(a.name)}</b> <span class="small muted">· ${h(a.useCase)}</span></div><span class="small mono">${cs.length} today</span>${live ? '<span class="pill HOT">LIVE</span>' : `<span class="pill ${a.status === 'Active' ? 'good' : 'mute'}">${h(a.status)}</span>`}</div>`; }).join('')}</div></div>`;
    W.pipeline = () => { const rows = D.STAGES.map((k) => { const ls = my.filter((l) => l.stage === k); return [A.sl(k), ls.length, k === 'Won' ? 'var(--good)' : k === 'Lost' ? 'var(--cold)' : 'var(--accent)', ls.length + ' · ' + U.inrShort(ls.reduce((a, l) => a + (l.estValue || 0), 0))]; }); return `<div class="card"><div class="hd"><h2>${h(T('Pipeline by stage'))}</h2><button class="btn sm ghost" data-act="go" data-v="pipeline">Board</button></div><div class="bd stack">${A.hbars(rows)}</div></div>`; };
    W.activity = () => `<div class="card"><div class="hd"><h2>${h(T('Recent activity'))}</h2></div><div class="bd tl">${st.activity.filter((a) => myIds.has(a.leadId)).slice(0, 9).map((a) => `<div class="it"><span class="ic">${I({ call: 'phone', wa: 'wa', visit: 'cal', crm: 'zap', note: 'note', stage: 'arrow', sys: 'alert', import: 'upload' }[a.kind] || 'zap')}</span><div><span data-act="openLead" data-id="${a.leadId}" style="cursor:pointer"><b>${h(leadName(a.leadId))}</b></span> <span class="muted">${h(a.text)}</span><div class="xs muted">${U.rel(a.at)}</div></div></div>`).join('') || '<span class="muted">No activity yet.</span>'}</div></div>`;
    const home = s.home || { kpis: ['calls', 'qualified', 'booked', 'speed'], widgets: [] };
    const on = home.widgets.filter((w) => w.on && W[w.id]);
    const left = [], right = []; on.forEach((w, i) => (['visits', 'agents', 'activity', 'hot'].includes(w.id) ? right : left).push(W[w.id]()));
    const emptyNote = st.leads.length ? '' : `<div class="notice info">This workspace has no leads yet. <a href="#" data-act="go" data-v="import">Import Solaris' Excel lead list</a> or follow <a href="#" data-act="go" data-v="setup">Set up for Solaris</a>.</div>`;
    return `<div class="phead"><div class="grow"><div class="eyebrow">${new Date().toLocaleDateString(s.uiLang === 'mr' ? 'mr-IN' : 'en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div><h1>${greet}</h1><p>${va === 'owner' ? 'Every enquiry answered in Marathi, Hindi or English, qualified, logged and followed up.' : 'Your leads, follow-ups and visits.'} ${Live.calls.length ? `<b style="color:var(--hot)">${Live.calls.length} call${Live.calls.length > 1 ? 's' : ''} live now.</b>` : ''}</p></div>
      <button class="btn ghost sm" data-act="go" data-v="personalize">${I('note')}${h(T('Personalize'))}</button><button class="btn" data-act="go" data-v="import">${I('upload')}${h(T('Import Excel leads'))}</button><button class="btn pri" data-act="go" data-v="live">${I('headset')}${h(T('Watch live calls'))}</button></div>
    ${emptyNote}
    ${home.kpis.length ? `<div class="grid g4">${home.kpis.filter((k) => KPI[k]).map((k) => `<div class="card kpi"><span class="eyebrow">${h(T(A.KPI_CATALOG[k]))}</span><span class="v">${KPI[k][0]}</span><span class="d">${h(KPI[k][1])}</span></div>`).join('')}</div>` : ''}
    <div class="grid ${right.length && left.length ? 'g-main' : ''}">${left.length ? `<div class="stack" style="gap:16px">${left.join('')}</div>` : ''}${right.length ? `<div class="stack" style="gap:16px">${right.join('')}</div>` : ''}</div>`;
  };
  A.acts.hotLeads = () => { A.f.temp = 'HOT'; A.go('leads'); };
  /* ================= LIVE CALLS ================= */
  const FIELD_LABELS = [['name', 'Name'], ['area', 'Location'], ['type', 'Property'], ['bill', 'Monthly bill'], ['roofOwn', 'Roof'], ['roofArea', 'Roof area'], ['sizeKw', 'Suggested size'], ['objection', 'Objection'], ['finance', 'Finance'], ['timeline', 'Timeline'], ['history', '12-month bills'], ['visit', 'Next step'], ['owner', 'Assigned to'], ['score', 'Lead score']];
  function liveCrm(lc) {
    const l = S.lead(lc.leadId); const r = lc.revealed || new Set(); const flash = lc.changedAt && Date.now() - lc.changedAt < 2500 ? lc.changed || [] : [];
    const val = (k) => {
      switch (k) {
        case 'name': return h(l.name) + (l.contact ? ` <span class="muted small">(${h(l.contact)})</span>` : '');
        case 'area': return r.has('area') ? h(l.area) + ', Nashik' : '';
        case 'type': return r.has('type') ? h(l.type) : '';
        case 'bill': return r.has('bill') ? U.inr(l.bill) : '';
        case 'roofOwn': return r.has('roofOwn') ? h(l.roofOwn || '') : '';
        case 'roofArea': return r.has('roofArea') ? U.num(l.roofArea) + ' sq ft' : '';
        case 'sizeKw': { if (!r.has('sizeKw')) return ''; const z = sizing(l); return `${z.kw} kW · subsidy ${U.inr(z.subsidy)} · saves ~${U.inr(z.yearSave)}/yr`; }
        case 'objection': return (l.objections || []).length && r.has('objection') ? h(l.objections.join(', ')) + ' → handled' : '';
        case 'finance': return r.has('finance') ? h(l.finance) : '';
        case 'timeline': return r.has('timeline') ? h(l.timeline) : '';
        case 'history': return r.has('history') ? h(l.history) : '';
        case 'visit': return r.has('dnc') ? '<span class="pill DNC">Added to DNC</span>' : r.has('transfer') || lc.transferred ? '<span class="pill sun">Transferred to sales</span>' : r.has('visit') ? h(lc.vp.kind) + ' · ' + U.fmtDT(lc.visitAt) : r.has('callback') ? 'Callback booked' : r.has('ticket') ? 'Support ticket raised' : r.has('nurture') ? 'Nurture · call in 90 days' : '';
        case 'owner': return h(person(l.owner).name);
        case 'score': return `<span class="row nw" style="gap:8px"><span class="bar" style="flex:1"><i style="width:${l.score || 0}%;background:var(--${(l.temp || 'COLD') === 'HOT' ? 'hot' : (l.temp === 'WARM' ? 'warm' : 'nurture')})"></i></span><b class="mono">${l.score || 0}</b>${tempPill(l)}</span>`;
      }
      return '';
    };
    const sim = new Set(l.simFilled || []);
    return FIELD_LABELS.map(([k, lab]) => { let v = val(k); if (v && sim.has(k)) v += ' <span class="pill line" title="Not in the lead file — invented for this simulated call">simulated</span>'; const fl = flash.includes(k) || (k === 'objection' && flash.includes('objections')) || (k === 'visit' && flash.includes('visitBooked')); return `<div class="crmrow ${fl ? 'flash' : ''}"><span>${lab}</span><span>${v || '<span class="muted small">listening…</span>'}</span></div>`; }).join('');
  }
  A.txHtml = function (lines, agent, opts) {
    opts = opts || {};
    return lines.map((m, i) => { const who = m.s === 'ai' ? (agent ? agent.name + ' · AI' : 'AI') : m.s === 'cust' ? 'Customer' : m.s === 'sales' ? 'Sales / manager' : ''; return `<div class="msg ${m.s} ${opts.playing === i ? 'play' : ''}"><div><div class="who">${who}</div><div class="b ${m.typing ? 'typing' : ''}" lang="${opts.lang === 'en' ? 'en' : opts.lang || 'mr'}">${h(m.t)}</div></div></div>`; }).join('');
  };
  A.views.live = function () {
    const st = S.state;
    const recent = st.calls.slice().sort((a, b) => b.at - a.at).slice(0, 12);
    const leadsToCall = st.leads.filter((l) => !l.dnc && !['Won', 'Lost'].includes(l.stage)).slice(0, 60);
    return `<div class="phead"><div class="grow"><h1>Live calls</h1><p>Watch the AI talk, read the transcript as it happens and see the CRM fill itself. Transfer, whisper or take over at any moment.</p></div>
      <select class="i" id="liveLead" style="width:auto;max-width:240px" aria-label="Lead to call">${opts(leadsToCall.map((l) => ({ v: l.id, t: l.name + ' · ' + (l.area || '') })), '', 'Choose a lead to call…')}</select>
      <button class="btn" data-act="callPicked">${I('phone')}AI call this lead</button>
      <button class="btn sun" data-act="simInbound">${I('headset')}Simulate inbound call</button>
      ${Live.calls.length ? `<button class="btn danger" data-act="stopAll">${I('stop')}Stop all</button>` : ''}</div>
      ${Live.calls.length ? Live.calls.map((lc) => {
        const l = S.lead(lc.leadId), ag = agentById(lc.agentId); const secs = Math.round((Date.now() - lc.started) / 1000);
        return `<div class="card livecard"><div class="hd"><span class="dot live"></span><h2>${lc.dir} · ${h(U.maskPhone(l.phone))} <span class="muted small" style="font-weight:500">${h(l.name)}</span></h2>${langTag(lc.lang)}<span class="pill line">${h(ag.name)} · AI</span><span class="mono small">${U.dur(secs * (lc.speed > 1 ? lc.speed : 1))}</span>${lc.speak ? '<span class="pill info">audio</span>' : ''}${lc.campaignId ? '<span class="pill mute">campaign</span>' : ''}</div>
          <div class="split"><div><div class="tx" id="tx_${lc.id}" style="height:360px">${lc.state === 'ringing' || lc.noAnswer ? '<div class="empty">Ringing… (no answer yet)</div>' : A.txHtml(lc.lines, ag, { lang: lc.lang })}</div>
            <div class="row" style="padding:10px 14px;border-top:1px solid var(--line2)"><button class="btn sun sm" data-act="liveAct" data-w="transfer" data-id="${lc.id}">Transfer to sales ↗</button><button class="btn sm" data-act="liveAct" data-w="takeover" data-id="${lc.id}">Take over</button><input class="i" id="wh_${lc.id}" placeholder="Whisper to AI, e.g. offer Sunday slot" style="flex:1;min-width:140px;width:auto" data-enter="whisperEnter" data-id="${lc.id}"><button class="btn sm" data-act="liveAct" data-w="whisper" data-id="${lc.id}">Whisper</button><button class="btn sm danger" data-act="liveAct" data-w="end" data-id="${lc.id}">End</button></div></div>
            <div style="padding:10px 14px"><div class="row" style="margin-bottom:6px"><h3 class="sp">CRM · auto-updating</h3><span class="pill good">${I('check')} saving</span></div>${liveCrm(lc)}</div></div></div>`;
      }).join('') : `<div class="card"><div class="bd"><div class="empty"><h2 style="margin-bottom:6px">No live calls</h2><p class="muted">Start one: simulate an inbound enquiry, call a lead, or run a campaign on imported Excel leads.</p><div class="row" style="justify-content:center;margin-top:10px"><button class="btn sun" data-act="simInbound">${I('headset')}Simulate inbound call</button><button class="btn" data-act="go" data-v="import">${I('upload')}Import Excel leads</button></div></div></div></div>`}
      <div class="card"><div class="hd"><h2>Recently completed</h2><span class="small muted">Every call is recorded, transcribed and summarised</span></div><div class="tbl-wrap"><table class="t"><thead><tr><th>Time</th><th>Lead</th><th>Agent</th><th>Lang</th><th>Duration</th><th>Outcome</th><th>Score</th><th></th></tr></thead><tbody>
      ${recent.map((c) => { const l = S.lead(c.leadId) || {}; return `<tr class="click" data-act="openLead" data-id="${c.leadId}" data-tab="calls"><td class="mono small">${U.fmtDT(c.at)}</td><td><b>${h(l.name)}</b><div class="xs muted">${h(l.area || '')}</div></td><td>${h(agentById(c.agentId).name)}</td><td>${langTag(c.lang)}</td><td class="mono">${U.dur(c.secs)}</td><td>${outcomePill(c.outcome)}</td><td class="score">${c.score || '—'}</td><td>${c.transcript.length ? '<span class="small muted">▶ recording</span>' : ''}</td></tr>`; }).join('')}</tbody></table></div></div>`;
  };
  A.acts.callPicked = () => { const v = document.getElementById('liveLead').value; if (!v) return toast('Choose a lead first'); const lc = Live.start(v, { speak: S.state.settings.voiceOn }); if (!lc) toast('This number is on the do-not-call list'); };
  A.acts.whisperEnter = (el) => { Live.action(el.dataset.id, 'whisper', el.value); };
  setInterval(() => { if (Live.calls.length && (A.view === 'live' || A.view === 'overview')) render(); }, 1000);

  /* ================= LEADS ================= */
  function filteredLeads() {
    const f = A.f, q = f.q.trim().toLowerCase();
    let ls = S.state.leads.filter((l) => {
      if (!A.mine(l.id)) return false;
      if (f.temp !== 'All') { if (f.temp === 'CUSTOMER') { if (l.stage !== 'Won') return false; } else if (l.temp !== f.temp || l.stage === 'Won') return false; }
      if (f.stage && l.stage !== f.stage) return false; if (f.owner && l.owner !== f.owner) return false; if (f.source && l.source !== f.source) return false; if (f.type && l.type !== f.type) return false; if (f.lang && l.lang !== f.lang) return false;
      if (q && !(l.name + ' ' + l.phone.replace(/\s/g, '') + ' ' + l.phone + ' ' + (l.area || '') + ' ' + (l.contact || '')).toLowerCase().includes(q)) return false;
      return true;
    });
    const s = f.sort;
    ls.sort((a, b) => s === 'score' ? (b.score || 0) - (a.score || 0) : s === 'new' ? b.createdAt - a.createdAt : s === 'bill' ? (b.bill || 0) - (a.bill || 0) : (b.lastContact || 0) - (a.lastContact || 0));
    return ls;
  }
  A.filteredLeads = filteredLeads;
  A.views.leads = function () {
    const st = S.state, ls = filteredLeads(), f = A.f;
    const counts = {}; st.leads.forEach((l) => { const k = l.stage === 'Won' ? 'CUSTOMER' : l.temp; counts[k] = (counts[k] || 0) + 1; });
    const pipeVal = ls.filter((l) => !['Won', 'Lost'].includes(l.stage)).reduce((s, l) => s + (l.estValue || 0), 0);
    return `<div class="phead"><div class="grow"><h1>Leads</h1><p>${st.leads.length} leads · ${U.inrShort(pipeVal)} open pipeline in this view. Every call updates these rows automatically.</p></div>
      <button class="btn" data-act="exportLeads">${I('dl')}Export Excel</button><button class="btn" data-act="go" data-v="import">${I('upload')}Import Excel</button><button class="btn pri" data-act="addLead">${I('plus')}Add lead</button></div>
      <div class="row">${['All', 'HOT', 'WARM', 'NURTURE', 'COLD', 'DNC', 'CUSTOMER'].map((t) => `<button class="chip ${f.temp === t ? 'on' : ''}" data-act="fTemp" data-t="${t}">${t === 'All' ? 'All' : t}${t !== 'All' ? ` <span class="mono xs">${counts[t] || 0}</span>` : ''}</button>`).join('')}</div>
      <div class="card"><div class="hd" style="gap:8px">
        <select class="i" style="width:auto" data-chg="fSel" data-k="stage" aria-label="Stage">${opts(D.STAGES.map((k) => ({ v: k, t: A.sl(k) })), f.stage, 'All stages')}</select>
        <select class="i" style="width:auto" data-chg="fSel" data-k="owner" aria-label="Owner">${opts(st.team.filter((t) => t.role === 'Sales').map((t) => ({ v: t.id, t: t.name })), f.owner, 'All salespeople')}</select>
        <select class="i" style="width:auto" data-chg="fSel" data-k="source" aria-label="Source">${opts(D.SOURCES, f.source, 'All sources')}</select>
        <select class="i" style="width:auto" data-chg="fSel" data-k="type" aria-label="Type">${opts(D.TYPES, f.type, 'All types')}</select>
        <select class="i" style="width:auto" data-chg="fSel" data-k="lang" aria-label="Language">${opts([{ v: 'mr', t: 'Marathi' }, { v: 'hi', t: 'Hindi' }, { v: 'en', t: 'English' }], f.lang, 'All languages')}</select>
        <span class="sp"></span><select class="i" style="width:auto" data-chg="fSel" data-k="sort" aria-label="Sort">${opts([{ v: 'score', t: 'Sort: lead score' }, { v: 'new', t: 'Sort: newest' }, { v: 'recent', t: 'Sort: last contact' }, { v: 'bill', t: 'Sort: bill' }], f.sort)}</select>
      </div>
      ${A.sel.size ? `<div class="row" style="padding:8px 14px;background:var(--accent-soft)"><b>${A.sel.size} selected</b><button class="btn sm pri" data-act="bulkCampaign">${I('mega')}Start AI calling campaign</button><select class="i" style="width:auto" data-chg="bulkAssign" aria-label="Assign selected"><option value="">Assign to…</option>${salesOpts('')}</select><button class="btn sm ghost" data-act="clearSel">Clear</button></div>` : ''}
      <div class="tbl-wrap"><table class="t"><thead><tr><th><input type="checkbox" data-act="selAll" aria-label="Select all" ${A.sel.size && A.sel.size === ls.length ? 'checked' : ''}></th><th>Lead</th><th>Area</th><th>Bill / size</th><th>Score</th><th>Stage</th><th>Owner</th><th>Source</th><th>Last contact</th><th>Next action</th></tr></thead><tbody>
      ${ls.slice(0, 250).map((l) => { const na = nextAction(l); return `<tr class="click" data-act="openLead" data-id="${l.id}"><td data-act="selOne" data-id="${l.id}"><input type="checkbox" ${A.sel.has(l.id) ? 'checked' : ''} aria-label="Select ${h(l.name)}" tabindex="-1"></td><td><b>${h(l.name)}</b><div class="xs muted mono">${h(U.maskPhone(l.phone))} · ${h(l.type || '')} ${l.lang ? '· ' + ({ mr: 'मराठी', hi: 'हिंदी', en: 'EN' })[l.lang] : ''}</div></td><td>${h(l.area || '—')}</td><td class="mono small">${l.bill ? U.inr(l.bill) : '—'}<div class="xs muted">${l.sizeKw ? l.sizeKw + ' kW' : ''}</div></td><td><span class="row nw" style="gap:6px"><span class="score">${l.score || 0}</span>${tempPill(l)}</span></td><td>${h(A.sl(l.stage))}</td><td class="small">${h(person(l.owner).name)}</td><td class="small">${h(l.source)}</td><td class="small muted">${l.lastContact ? U.rel(l.lastContact) : 'never'}</td><td class="small">${na ? `<span style="color:${na.overdue ? 'var(--bad)' : 'inherit'}">${h(na.t)}</span>` : '<span class="muted">—</span>'}</td></tr>`; }).join('') || '<tr><td colspan="10" class="empty">No leads match these filters.</td></tr>'}
      </tbody></table></div></div>`;
  };
  Object.assign(A.acts, {
    fTemp: (el) => { A.f.temp = el.dataset.t; render(); },
    fSel: (el) => { A.f[el.dataset.k] = el.value; render(); },
    selOne: (el, e) => { e.stopPropagation(); const id = el.dataset.id; A.sel.has(id) ? A.sel.delete(id) : A.sel.add(id); render(); },
    selAll: (el, e) => { e.stopPropagation(); const ls = filteredLeads(); if (A.sel.size === ls.length) A.sel.clear(); else ls.forEach((l) => A.sel.add(l.id)); render(); },
    clearSel: () => { A.sel.clear(); render(); },
    bulkAssign: (el) => { if (!el.value) return; A.sel.forEach((id) => { const l = S.lead(id); l.owner = el.value; S.log(id, 'crm', 'Assigned to ' + person(el.value).name); }); toast(A.sel.size + ' leads assigned to ' + person(el.value).name); A.sel.clear(); S.change('leads'); },
    bulkCampaign: () => { A.campaignDraft = { leadIds: Array.from(A.sel) }; A.sel.clear(); go('campaigns'); },
    addLead: () => A.showModal(addLeadModal)
  });
  function addLeadModal() {
    return `<div class="mhd"><h2 class="sp">Add lead</h2><button class="btn ghost sm" data-act="closeModal" aria-label="Close">${I('x')}</button></div><div class="mbd"><div class="fgrid">
      <label class="f">Name<input class="i" id="al_name" placeholder="e.g. Rahul Patil"></label><label class="f">Mobile<input class="i" id="al_phone" placeholder="98XXXXXXXX" inputmode="tel"></label>
      <label class="f">Area<select class="i" id="al_area">${opts(D.AREAS.map((a) => a.en), '', 'Select area')}</select></label><label class="f">Type<select class="i" id="al_type">${opts(D.TYPES, 'Home')}</select></label>
      <label class="f">Monthly bill (₹)<input class="i" id="al_bill" inputmode="numeric" placeholder="4500"></label><label class="f">Source<select class="i" id="al_src">${opts(D.SOURCES, 'Walk-in')}</select></label>
      <label class="f">Language<select class="i" id="al_lang">${opts([{ v: 'mr', t: 'Marathi' }, { v: 'hi', t: 'Hindi' }, { v: 'en', t: 'English' }], 'mr')}</select></label>
      <label class="f">Consent to call<select class="i" id="al_consent">${opts([{ v: '1', t: 'Yes — customer enquired' }, { v: '0', t: 'No' }], '1')}</select></label></div>
      <p class="small muted" style="margin:0">Owner is assigned automatically by area and segment (see Settings → Routing).</p></div>
      <div class="mft"><button class="btn" data-act="closeModal">Cancel</button><button class="btn" data-act="saveLead">Save lead</button><button class="btn pri" data-act="saveLead" data-call="1">${I('phone')}Save &amp; AI call now</button></div>`;
  }
  A.acts.saveLead = (el) => {
    const v = (id) => document.getElementById(id).value.trim();
    const phone = U.normPhone(v('al_phone'));
    if (!phone) return toast('Enter a valid 10-digit Indian mobile number');
    if (S.state.leads.some((l) => l.phone === phone)) return toast('This number is already in the CRM');
    const l = { id: U.uid('ld'), name: v('al_name') || 'New lead', contact: '', phone, area: v('al_area'), type: v('al_type'), bill: Number(v('al_bill')) || null, source: v('al_src'), lang: v('al_lang'), consent: v('al_consent') === '1', stage: 'New', temp: 'COLD', score: 0, objections: [], notes: [], createdAt: Date.now(), tags: [] };
    l.owner = routeOwner(l); l.agentId = l.type === 'Home' ? SOL.roleAgent('outbound') : SOL.roleAgent('commercial'); l.score = scoreLead(l); l.temp = tempOf(l.score, l);
    S.state.leads.unshift(l); S.log(l.id, 'crm', 'Lead added manually · routed to ' + person(l.owner).name);
    A.modal = null;
    if (el.dataset.call) { Live.start(l.id, { speak: S.state.settings.voiceOn }); go('live'); } else { S.change('leads'); A.openLead(l.id); }
  };

  /* ================= LEAD DRAWER ================= */
  A.drawerHtml = function (l) {
    const st = S.state, sz = sizing(l); const calls = st.calls.filter((c) => c.leadId === l.id).sort((a, b) => b.at - a.at);
    const live = Live.calls.find((c) => c.leadId === l.id);
    const tab = A.dtab;
    let body = '';
    if (tab === 'overview') {
      const last = calls.find((c) => c.summary && c.transcript.length);
      const fld = (k, lab, input) => `<label class="f">${lab}${input}</label>`;
      const sel = (k, arr) => `<select class="i" data-chg="leadField" data-k="${k}" data-id="${l.id}">${opts(arr, l[k] || '', '—')}</select>`;
      const inp = (k, type) => `<input class="i" id="lf_${k}" data-chg="leadField" data-k="${k}" data-id="${l.id}" value="${h(l[k] == null ? '' : l[k])}" ${type ? 'inputmode="numeric"' : ''}>`;
      body = `${live ? `<div class="notice">${I('headset')} On a live call right now with ${h(agentById(live.agentId).name)}. <a href="#" data-act="go" data-v="live">Watch it live</a></div>` : ''}
        ${last ? `<div class="card"><div class="hd"><h3>AI call summary</h3>${outcomePill(last.outcome)}<span class="small muted">${U.rel(last.at)} · ${h(agentById(last.agentId).name)}</span></div><div class="bd">${h(last.summary)}</div></div>` : ''}
        <div class="card"><div class="hd"><h3>Solar estimate</h3><span class="small muted">indicative · confirmed at site survey</span></div><div class="bd"><div class="grid g3" style="gap:10px">
          <div><div class="eyebrow">System</div><b class="mono" style="font-size:18px">${sz.kw} kW</b><div class="xs muted">roof needed ~${U.num(sz.roofNeed)} sq ft</div></div>
          <div><div class="eyebrow">Subsidy</div><b class="mono" style="font-size:18px">${U.inr(sz.subsidy)}</b><div class="xs muted">${l.type === 'Society' ? '₹18,000/kW (RWA)' : ['Home', 'Farm'].includes(l.type) ? 'PM Surya Ghar' : 'not eligible (commercial)'}</div></div>
          <div><div class="eyebrow">Saving / year</div><b class="mono" style="font-size:18px">${U.inr(sz.yearSave)}</b><div class="xs muted">payback ~${sz.payback ? sz.payback.toFixed(1) : '—'} yrs · cost ~${U.inrShort(sz.cost)}</div></div></div>
          ${['Home', 'Farm'].includes(l.type) ? '<p class="xs muted" style="margin:10px 0 0">MSEDCL caps subsidised capacity using the last 12 months of consumption (since Feb 2026). Collect bills before quoting.</p>' : ''}</div></div>
        ${l.stage === 'Won' ? `<div class="card"><div class="hd"><h3>After-sale tracker</h3><span class="small muted">customers call about this most</span></div><div class="bd"><div class="steps" style="margin-bottom:8px">${D.POST_SALE.map((s, i) => `<i class="${i < (l.postSale || 0) ? 'd' : ''}"></i>`).join('')}</div><div class="row">${D.POST_SALE.map((s, i) => `<button class="chip ${i < (l.postSale || 0) ? 'on' : ''}" data-act="postSale" data-id="${l.id}" data-i="${i + 1}">${i < (l.postSale || 0) ? '✓ ' : ''}${s}</button>`).join('')}</div></div></div>` : ''}
        <div class="card"><div class="hd"><h3>CRM fields</h3><span class="small muted">edit anything · AI fills these on every call</span></div><div class="bd"><div class="fgrid">
          ${fld('name', 'Name', inp('name'))}${fld('phone', 'Mobile', `<input class="i mono" value="${h(A.ph(l.phone))}" disabled>`)}${l.contact || ['Society', 'Factory', 'Shop', 'Institution'].includes(l.type) ? fld('contact', 'Contact person', inp('contact')) : ''}
          ${fld('area', 'Area', sel('area', D.AREAS.map((a) => a.en)))}${fld('type', 'Property type', sel('type', D.TYPES))}${fld('bill', 'Monthly bill (₹)', inp('bill', 1))}
          ${fld('roofOwn', 'Roof', sel('roofOwn', ['Yes', 'No (rented)', 'Society roof']))}${fld('roofArea', 'Roof area (sq ft)', inp('roofArea', 1))}${fld('timeline', 'Timeline', sel('timeline', ['Immediately', 'This month', '1–3 months', '3–6 months', '6+ months']))}
          ${fld('finance', 'Finance', sel('finance', ['Loan / EMI', 'Subsidy', 'Cash']))}${fld('history', '12-month bills', sel('history', ['Received', 'Available', 'Asked to keep 12-month bills', 'Not yet']))}${fld('lang', 'Language', sel('lang', [{ v: 'mr', t: 'Marathi' }, { v: 'hi', t: 'Hindi' }, { v: 'en', t: 'English' }]))}
          ${fld('stage', 'Stage', sel('stage', D.STAGES.map((k) => ({ v: k, t: A.sl(k) }))))}${fld('owner', 'Owner', `<select class="i" data-chg="leadField" data-k="owner" data-id="${l.id}">${salesOpts(l.owner)}</select>`)}${fld('source', 'Source', sel('source', D.SOURCES))}
          ${(S.state.settings.customFields || []).map((cf) => fld(cf.key, h(cf.label), `<input class="i" id="cf_${h(cf.key)}" data-chg="leadCf" data-k="${h(cf.key)}" data-id="${l.id}" value="${h((l.cf || {})[cf.key] || '')}">`)).join('')}
        </div>${l.extra && Object.keys(l.extra).length ? `<div class="divider" style="margin:12px 0"></div><div class="eyebrow" style="margin-bottom:6px">From Solaris' Excel file</div><div class="fgrid">${Object.entries(l.extra).map(([k, v]) => `<div class="small"><div class="muted xs">${h(k)}</div>${h(v)}</div>`).join('')}</div>` : ''}${(l.objections || []).length ? `<div class="row" style="margin-top:10px"><span class="small muted">Objections raised:</span>${l.objections.map((o) => `<span class="pill line">${h(o)}</span>`).join('')}</div>` : ''}${l.lostReason ? `<p class="small">Lost reason: <b>${h(l.lostReason)}</b></p>` : ''}</div></div>
        <div class="card"><div class="hd"><h3>Notes</h3></div><div class="bd stack"><div class="row nw"><input class="i" id="noteIn" placeholder="Add a note for the team…" data-enter="addNote" data-id="${l.id}"><button class="btn" data-act="addNote" data-id="${l.id}">Add</button></div>${(l.notes || []).map((n) => `<div class="small"><b>${h(n.by)}</b> <span class="muted">${U.rel(n.at)}</span><div>${h(n.t)}</div></div>`).join('') || '<span class="small muted">No notes yet.</span>'}</div></div>`;
    } else if (tab === 'calls') {
      body = calls.length ? calls.map((c) => { const ag = agentById(c.agentId); const open = A.open[c.id] || calls[0] === c; const playing = A.playing && A.playing.callId === c.id; return `<div class="card"><div class="hd"><h3>${U.fmtDT(c.at)}</h3>${outcomePill(c.outcome)}${langTag(c.lang)}<span class="small muted">${h(ag.name)} · ${c.dir} · ${U.dur(c.secs)}</span></div>
        <div class="bd stack">${c.summary ? `<div class="small"><b>AI summary:</b> ${h(c.summary)}</div>` : ''}${c.aiNotes ? `<div class="small notice info"><b>Claude re-analysis:</b> ${h(c.aiNotes)}</div>` : ''}
        ${c.transcript.length ? `<div class="row"><button class="btn sm ${playing ? '' : 'pri'}" data-act="${playing ? 'stopPlay' : 'playCall'}" data-id="${c.id}">${I(playing ? 'stop' : 'play')}${playing ? 'Stop' : 'Play recording'}</button><div class="wave ${playing ? 'on' : ''}">${'<i></i>'.repeat(18)}</div><span class="xs muted sp">${c.interactionId && SOL.LiveSync && SOL.LiveSync.on() ? 'Real call recording from Sarvam.' : 'Demo playback re-voices the transcript on this device.'}</span>${AI.sample ? `<button class="btn sm ghost" data-act="reanalyse" data-id="${c.id}">${I('zap')}Re-analyse with Claude</button>` : ''}<button class="btn sm ghost" data-act="toggleTx" data-id="${c.id}">${open ? 'Hide' : 'Show'} transcript</button></div>
        ${open ? `<div class="tx" style="max-height:420px;background:var(--panel2);border-radius:8px" id="dtx_${c.id}">${A.txHtml(c.transcript, ag, { lang: c.lang, playing: playing ? A.playing.i : -1 })}</div>` : ''}` : '<span class="small muted">No conversation — call not answered.</span>'}</div></div>`; }).join('') : '<div class="empty">No calls yet.</div>';
    } else if (tab === 'timeline') {
      const ev = [];
      calls.forEach((c) => ev.push({ at: c.at, i: 'phone', t: `${c.dir} AI call · ${c.outcome} · ${U.dur(c.secs)}` }));
      st.visits.filter((v) => v.leadId === l.id).forEach((v) => ev.push({ at: v.at, i: 'cal', t: `${v.kind} · ${v.status} · ${nameOf(v.with)}` }));
      st.activity.filter((a) => a.leadId === l.id).forEach((a) => ev.push({ at: a.at, i: { wa: 'wa', crm: 'zap', note: 'note', stage: 'arrow', visit: 'cal', call: 'phone', import: 'upload' }[a.kind] || 'zap', t: a.text }));
      ev.push({ at: l.createdAt, i: 'plus', t: 'Lead created · ' + l.source });
      ev.sort((a, b) => b.at - a.at);
      body = `<div class="card"><div class="bd tl">${ev.map((e) => `<div class="it"><span class="ic">${I(e.i)}</span><div>${h(e.t)}<div class="xs muted">${U.fmtDT(e.at)}${e.at > Date.now() ? ' · upcoming' : ''}</div></div></div>`).join('')}</div></div>`;
    } else if (tab === 'tasks') {
      const fus = st.followups.filter((f) => f.leadId === l.id).sort((a, b) => a.dueAt - b.dueAt);
      const vis = st.visits.filter((v) => v.leadId === l.id).sort((a, b) => b.at - a.at);
      body = `<div class="card"><div class="hd"><h3>Site visits &amp; meetings</h3><button class="btn sm" data-act="bookVisit" data-id="${l.id}">${I('plus')}Book</button></div><div class="bd stack">${vis.map((v) => `<div class="row nw"><span class="sp"><b>${h(v.kind)}</b> · ${U.fmtDT(v.at)}<div class="xs muted">${h(nameOf(v.with))} · ${h(v.address || '')}</div></span><span class="pill ${v.status === 'Completed' ? 'good' : v.status === 'No-show' || v.status === 'Cancelled' ? 'bad' : 'info'}">${h(v.status)}</span><button class="btn sm ghost" data-act="openVisit" data-id="${v.id}">Open</button></div>`).join('') || '<span class="small muted">None booked.</span>'}</div></div>
        <div class="card"><div class="hd"><h3>Follow-ups</h3><button class="btn sm" data-act="addFollowup" data-id="${l.id}">${I('plus')}Add</button></div><div class="bd stack">${fus.map((f) => `<div class="row nw"><span class="sp"><b>${h(f.type)}</b> · ${U.fmtDT(f.dueAt)} <span class="xs muted">(${U.rel(f.dueAt)})</span><div class="xs muted">${h(f.note || '')} · ${h(nameOf(f.owner))}${f.auto ? ' · automatic' : ''}</div></span><span class="pill ${f.status === 'done' ? 'good' : f.status === 'missed' ? 'bad' : f.status === 'cancelled' ? 'mute' : f.dueAt < Date.now() ? 'bad' : 'info'}">${f.status === 'pending' && f.dueAt < Date.now() ? 'overdue' : h(f.status)}</span>${f.status === 'pending' ? `<button class="btn sm ghost" data-act="fuDone" data-id="${f.id}">Done</button>` : ''}</div>`).join('') || '<span class="small muted">No follow-ups.</span>'}</div></div>`;
    }
    return `<div class="dhd"><div class="av" style="width:42px;height:42px;font-size:14px">${h(initials(l.name))}</div><div class="sp" style="min-width:0"><div class="row nw" style="gap:8px"><h2 style="font-size:19px">${h(l.name)}</h2>${tempPill(l)}<span class="score">${l.score || 0}/100</span></div>
      <div class="small muted mono">${h([A.ph(l.phone), l.type, l.area, U.LANG[l.lang]].filter(Boolean).join(' · '))}</div>
      <div class="row" style="margin-top:10px"><button class="btn sm pri" data-act="callLead" data-id="${l.id}" ${l.dnc ? 'disabled' : ''}>${I('phone')}AI call now</button><button class="btn sm" data-act="rehearse" data-id="${l.id}" title="Role-play this exact customer with the AI agent">${I('headset')}Rehearse with AI</button><button class="btn sm" data-act="bookVisit" data-id="${l.id}">${I('cal')}Book visit</button><button class="btn sm" data-act="addFollowup" data-id="${l.id}">${I('clock')}Follow-up</button><button class="btn sm" data-act="sendWa" data-id="${l.id}" ${l.dnc ? 'disabled' : ''}>${I('wa')}WhatsApp</button>${l.dnc ? '<span class="pill DNC">Do not call</span>' : `<button class="btn sm ghost danger" data-act="markDnc" data-id="${l.id}">Mark DNC</button>`}</div></div>
      <button class="btn ghost sm" data-act="closeDrawer" aria-label="Close">${I('x')}</button></div>
      <div class="tabs" style="padding:0 18px;background:var(--panel)">${[['overview', 'Overview'], ['calls', 'Calls & recordings (' + calls.length + ')'], ['timeline', 'Timeline'], ['tasks', 'Visits & follow-ups']].map(([k, t]) => `<button class="tab ${tab === k ? 'on' : ''}" data-act="dtab" data-t="${k}">${t}</button>`).join('')}</div>
      <div class="dbd">${body}</div>`;
  };
  Object.assign(A.acts, {
    dtab: (el) => { A.dtab = el.dataset.t; render(); },
    leadCf: (el) => { const l = S.lead(el.dataset.id); l.cf = l.cf || {}; l.cf[el.dataset.k] = el.value; S.save(); },
    rehearse: (el) => { const l = S.lead(el.dataset.id); A.drawer = null; A.ag.edit = S.state.settings.agentMode === 'single' ? 'ag_one' : (l.agentId || SOL.roleAgent('outbound')); A.ag.tab = 'test'; A.tc = null; A.tcLead = l.id; A.tcLang = l.lang || 'mr'; A.go('agents'); },
    toggleTx: (el) => { A.open[el.dataset.id] = !A.open[el.dataset.id]; render(); },
    leadField: (el) => {
      const l = S.lead(el.dataset.id); const k = el.dataset.k; let v = el.value;
      if (['bill', 'roofArea'].includes(k)) v = Number(v) || null;
      const old = l[k]; l[k] = v;
      if (k === 'stage') { S.log(l.id, 'stage', 'Stage: ' + old + ' → ' + v); if (v === 'Won' && l.postSale == null) l.postSale = 0; }
      if (k === 'owner') S.log(l.id, 'crm', 'Reassigned to ' + person(v).name);
      if (['bill', 'type'].includes(k)) { const z = sizing(l); l.sizeKw = z.kw; l.estValue = z.cost; }
      l.score = scoreLead(l); if (l.temp !== 'DNC') l.temp = tempOf(l.score, l);
      S.change('lead');
    },
    postSale: (el) => { const l = S.lead(el.dataset.id); const i = Number(el.dataset.i); l.postSale = l.postSale === i ? i - 1 : i; S.log(l.id, 'stage', 'After-sale: ' + D.POST_SALE[l.postSale - 1 >= 0 ? l.postSale - 1 : 0] + (l.postSale ? ' ✓' : ' reset')); S.change('lead'); },
    addNote: (el) => { const inp = document.getElementById('noteIn'); if (!inp || !inp.value.trim()) return; const l = S.lead(el.dataset.id); (l.notes = l.notes || []).unshift({ t: inp.value.trim(), at: Date.now(), by: 'Owner' }); S.log(l.id, 'note', 'Note added'); inp.value = ''; S.change('lead'); },
    markDnc: (el) => { const l = S.lead(el.dataset.id); l.dnc = true; l.temp = 'DNC'; l.score = 0; if (!S.state.dnc.includes(l.phone)) S.state.dnc.push(l.phone); S.state.followups.forEach((f) => { if (f.leadId === l.id && f.status === 'pending') f.status = 'cancelled'; }); S.log(l.id, 'sys', 'Marked do-not-call · all sequences stopped'); S.change('lead'); toast('Added to DNC list. No further calls or messages.'); },
    playCall: (el) => A.playCall(el.dataset.id),
    stopPlay: () => { A.playing = null; Voice.stop(); render(); },
    reanalyse: async (el) => {
      const c = S.state.calls.find((x) => x.id === el.dataset.id); el.disabled = true; el.textContent = 'Claude is reading the call…';
      try { const r = await AI.extract(c.transcript, agentById(c.agentId).name); c.aiNotes = (r.summary || '') + (r.nextStep ? ' Next step: ' + r.nextStep : '') + (r.sentiment ? ' Sentiment: ' + r.sentiment + '.' : ''); S.change('calls'); }
      catch (e) { toast(e && e.code === 'not_granted' ? 'Claude access was declined for this page' : 'Could not reach Claude right now'); render(); }
    }
  });
  A.playCall = async function (callId) {
    const c = S.state.calls.find((x) => x.id === callId); if (!c) return;
    Voice.stop(); const token = {}; A.playing = { callId, i: 0, token }; A.open[callId] = true; render();
    const ag = agentById(c.agentId);
    if (!Voice.available()) { toast('This browser cannot play synthesized audio'); }
    for (let i = 0; i < c.transcript.length; i++) {
      if (!A.playing || A.playing.token !== token) return;
      A.playing.i = i; render();
      const m = c.transcript[i];
      if (m.s === 'sys') { await new Promise((r) => setTimeout(r, 900)); continue; }
      await Voice.speak(m.t, c.lang, { gender: m.s === 'ai' ? ag.voice.gender : m.s === 'sales' ? 'm' : (c.lang === 'hi' ? 'm' : 'f'), rate: m.s === 'ai' ? ag.voice.rate * 1.05 : 1.05, pitch: m.s === 'ai' ? ag.voice.pitch : 0.85 });
    }
    if (A.playing && A.playing.token === token) { A.playing = null; render(); }
  };

  /* WhatsApp modal */
  A.acts.sendWa = (el) => { const id = el.dataset.id; A.waLead = id; A.showModal(waModal); };
  function fillWa(body, l) { const z = sizing(l); const v = S.state.visits.filter((x) => x.leadId === l.id && x.at > Date.now()).sort((a, b) => a.at - b.at)[0]; return body.replace(/\{(\w+)\}/g, (m, k) => ({ name: (D.DV_FIRST[(l.name || '').split(' ')[0]] || l.name), bill: U.num(l.bill || 0), kw: z.kw, yearSave: U.num(z.yearSave), date: v ? U.fmtDate(v.at) : '—', time: v ? U.fmtTime(v.at) : '—', surveyor: v ? nameOf(v.with) : '—', sales: person(l.owner).name })[k] || m); }
  function waModal() {
    const l = S.lead(A.waLead); const tpls = S.state.settings.waTemplates; const cur = A.waTpl || tpls[0].id; const t = tpls.find((x) => x.id === cur) || tpls[0];
    return `<div class="mhd"><h2 class="sp">WhatsApp · ${h(l.name)}</h2><button class="btn ghost sm" data-act="closeModal" aria-label="Close">${I('x')}</button></div><div class="mbd">
      <label class="f">Approved template<select class="i" data-chg="waTpl">${opts(tpls.map((x) => ({ v: x.id, t: x.name })), cur)}</select></label>
      <div class="notice dv" style="font-size:14px;line-height:1.6;background:var(--good-soft);border-color:transparent">${h(fillWa(t.body, l))}</div>
      <p class="xs muted" style="margin:0">In production this sends through the WhatsApp Business API to opted-in numbers only. In this demo it is logged on the lead's timeline.</p></div>
      <div class="mft"><button class="btn" data-act="closeModal">Cancel</button><button class="btn pri" data-act="waSend">${I('wa')}Send</button></div>`;
  }
  A.acts.waTpl = (el) => { A.waTpl = el.value; render(); };
  A.acts.waSend = () => { const l = S.lead(A.waLead); const t = S.state.settings.waTemplates.find((x) => x.id === (A.waTpl || S.state.settings.waTemplates[0].id)); S.log(l.id, 'wa', 'WhatsApp sent: ' + t.name); A.modal = null; S.change('lead'); toast('WhatsApp logged for ' + l.name); };

  /* ================= PIPELINE ================= */
  A.views.pipeline = function () {
    const st = S.state; const f = A.pf || (A.pf = { owner: '', type: '' });
    const ls = st.leads.filter((l) => A.mine(l.id) && (!f.owner || l.owner === f.owner) && (!f.type || l.type === f.type) && !l.dnc);
    const open = ls.filter((l) => !['Won', 'Lost'].includes(l.stage));
    const won = ls.filter((l) => l.stage === 'Won');
    return `<div class="phead"><div class="grow"><h1>Pipeline</h1><p>${open.length} open deals worth ${U.inrShort(open.reduce((s, l) => s + (l.estValue || 0), 0))} · ${won.length} won (${U.inrShort(won.reduce((s, l) => s + (l.estValue || 0), 0))}). Drag cards between stages.</p></div>
      <select class="i" style="width:auto" data-chg="pfSel" data-k="owner" aria-label="Owner">${opts(st.team.filter((t) => t.role === 'Sales').map((t) => ({ v: t.id, t: t.name })), f.owner, 'All salespeople')}</select>
      <select class="i" style="width:auto" data-chg="pfSel" data-k="type" aria-label="Type">${opts(D.TYPES, f.type, 'All types')}</select></div>
      <div class="kan">${D.STAGES.map((stg) => { const cs = ls.filter((l) => l.stage === stg).sort((a, b) => (b.score || 0) - (a.score || 0)); return `<div class="col" data-stage="${h(stg)}"><div class="ch"><h3 class="sp">${h(A.sl(stg))}</h3><span class="mono xs muted">${cs.length} · ${U.inrShort(cs.reduce((s, l) => s + (l.estValue || 0), 0))}</span></div><div class="cb">${cs.slice(0, 40).map((l) => { const na = nextAction(l); return `<div class="kc" draggable="true" data-lead="${l.id}" data-act="openLead" data-id="${l.id}"><div class="row nw"><b class="sp" style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${h(l.name)}</b>${tempPill(l)}</div><div class="xs muted">${h(l.area || '')} · ${l.sizeKw || '—'} kW · ${U.inrShort(l.estValue)}</div>${stg === 'Won' ? `<div class="steps" title="After-sale progress">${D.POST_SALE.map((s, i) => `<i class="${i < (l.postSale || 0) ? 'd' : ''}"></i>`).join('')}</div><div class="xs muted">${l.postSale ? D.POST_SALE[l.postSale - 1] + ' ✓' : 'Portal registration pending'}</div>` : na ? `<div class="xs" style="color:${na.overdue ? 'var(--bad)' : 'var(--ink2)'}">${h(na.t)}</div>` : ''}${stg === 'Lost' && l.lostReason ? `<div class="xs muted">${h(l.lostReason)}</div>` : ''}<div class="row nw xs muted"><span class="av" style="width:20px;height:20px;font-size:9px">${h(initials(person(l.owner).name))}</span>${h(person(l.owner).name.split(' ')[0])}<span class="sp"></span><select class="i xs" style="width:auto;padding:2px 4px;font-size:11px" data-chg="stageSel" data-id="${l.id}" aria-label="Move stage">${opts(D.STAGES.map((k) => ({ v: k, t: A.sl(k) })), l.stage)}</select></div></div>`; }).join('') || '<div class="xs muted" style="padding:8px">Empty</div>'}</div></div>`; }).join('')}</div>`;
  };
  A.acts.pfSel = (el) => { A.pf[el.dataset.k] = el.value; render(); };
  function moveStage(id, stg) {
    const l = S.lead(id); if (!l || l.stage === stg) return;
    if (stg === 'Lost') { A.lostLead = id; A.showModal(lostModal); return; }
    const old = l.stage; l.stage = stg; if (stg === 'Won' && l.postSale == null) l.postSale = 0;
    S.log(id, 'stage', 'Stage: ' + old + ' → ' + stg);
    if (stg === 'Quotation Sent') S.state.followups.push({ id: U.uid('fu'), leadId: id, type: 'WhatsApp', dueAt: Date.now() + 2 * U.DAY, owner: SOL.roleAgent('outbound'), status: 'pending', note: 'Quotation follow-up template', auto: true });
    S.change('stage'); toast(l.name + ' → ' + A.sl(stg));
  }
  A.moveStage = moveStage;
  A.acts.stageSel = (el) => moveStage(el.dataset.id, el.value);
  function lostModal() { const l = S.lead(A.lostLead); return `<div class="mhd"><h2 class="sp">Mark ${h(l.name)} as lost</h2></div><div class="mbd"><label class="f">Reason<select class="i" id="lostR">${opts(['Chose cheaper vendor', 'Postponed — budget', 'Roof shading / space', 'Society rejected in AGM', 'Not reachable', 'Other'], '')}</select></label><label class="f"><span class="row"><input type="checkbox" id="lostNur" checked> Keep in 90-day nurture (AI call later)</span></label></div><div class="mft"><button class="btn" data-act="closeModal">Cancel</button><button class="btn pri" data-act="lostSave">Mark lost</button></div>`; }
  A.acts.lostSave = () => { const l = S.lead(A.lostLead); l.stage = 'Lost'; l.lostReason = document.getElementById('lostR').value; S.log(l.id, 'stage', 'Marked lost: ' + l.lostReason); if (document.getElementById('lostNur').checked) S.state.followups.push({ id: U.uid('fu'), leadId: l.id, type: 'AI call', dueAt: Date.now() + 90 * U.DAY, owner: SOL.roleAgent('outbound'), status: 'pending', note: 'Win-back call', auto: true }); A.modal = null; S.change('stage'); };
  let dragId = null;
  document.addEventListener('dragstart', (e) => { const c = e.target.closest && e.target.closest('.kc'); if (c) { dragId = c.dataset.lead; e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', dragId); } catch (x) {} } });
  document.addEventListener('dragover', (e) => { const col = e.target.closest && e.target.closest('.col'); if (col && dragId) { e.preventDefault(); document.querySelectorAll('.col.over').forEach((c) => c !== col && c.classList.remove('over')); col.classList.add('over'); } });
  document.addEventListener('drop', (e) => { const col = e.target.closest && e.target.closest('.col'); if (col && dragId) { e.preventDefault(); const id = dragId; dragId = null; col.classList.remove('over'); moveStage(id, col.dataset.stage); } });
  document.addEventListener('dragend', () => { dragId = null; document.querySelectorAll('.col.over').forEach((c) => c.classList.remove('over')); });

  /* ---------- boot ---------- */
  A.boot = function () {
    S.load(); Voice.init();
    try { const v = sessionStorage.getItem('sol-view'); if (v && A.views[v]) A.view = v; } catch (e) {}
    if (!A.views[A.view]) A.view = 'overview';
    const hash = (location.hash || '').replace('#', ''); if (hash && A.views[hash]) A.view = hash;
    applyBrand(); renderTop(); render();
    S.on((what) => { if (what === 'ai' || what === 'settings' || what === 'all' || what === 'team') { applyBrand(); renderTop(); } if (what === 'live' && !['overview', 'live', 'campaigns'].includes(A.view) && !A.drawer) { renderSide(); return; } render(); });
    AI.init();
    setInterval(() => { if (!Live.calls.length && ['overview', 'followups', 'visits'].includes(A.view) && !A.modal && !document.activeElement.matches('input,select,textarea')) render(); }, 60000);
  };
  A.renderTop = renderTop;
})();
