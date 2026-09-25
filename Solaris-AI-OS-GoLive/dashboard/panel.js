/* Solaris AI OS — simple live panel (v2)
   Talks straight to Supabase (REST + Auth + Storage + Edge Functions). No build step. */
(function () {
  'use strict';
  const CFG = window.SOLARIS_CONFIG || {};
  const BASE = String(CFG.supabaseUrl || '').replace(/\/+$/, '');
  const KEY = CFG.supabaseKey || '';
  const SESS = 'solaris-panel-session';
  const TABLES = ['leads', 'calls', 'visits', 'followups', 'activity', 'wa_messages', 'content'];

  /* ================= utils ================= */
  const $ = (s, el) => (el || document).querySelector(s);
  const h = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = (p) => p + '_' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-5);
  const DAY = 864e5;
  const inr = (n) => n ? '₹' + Math.round(n).toLocaleString('en-IN') : '—';
  const num = (n) => Number(n || 0).toLocaleString('en-IN');
  const istDay = (ms) => { const d = new Date(ms + 198e5); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - 198e5; };
  const today0 = () => istDay(Date.now());
  const fmtT = (ms) => new Date(ms).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' });
  const fmtD = (ms) => new Date(ms).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });
  const fmtDT = (ms) => fmtD(ms) + ', ' + fmtT(ms);
  function rel(ms) {
    if (!ms) return '—'; const d = Date.now() - ms; const a = Math.abs(d);
    const s = a < 60e3 ? 'just now' : a < 3600e3 ? Math.round(a / 60e3) + ' min' : a < DAY ? Math.round(a / 3600e3) + ' h' : Math.round(a / DAY) + ' d';
    return s === 'just now' ? s : d >= 0 ? s + ' ago' : 'in ' + s;
  }
  function normPhone(raw) {
    let d = String(raw == null ? '' : raw).replace(/\D/g, '');
    if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
    if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
    if (d.length !== 10 || !/^[6-9]/.test(d)) return null;
    return '+91 ' + d.slice(0, 5) + ' ' + d.slice(5);
  }
  const first = (n) => { const s = String(n || '').trim().split(/\s+/)[0] || ''; return /^(enquiry|caller|unknown|whatsapp)$/i.test(s) ? '' : s; };
  const initials = (n) => (String(n || '?').trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2) || '?').toUpperCase();
  const mapsUrl = (a) => 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(a || '');
  const telUrl = (p) => 'tel:' + String(p || '').replace(/\s/g, '');
  const waUrl = (p) => 'https://wa.me/' + String(p || '').replace(/\D/g, '');

  // same maths as the server (logic.ts) so numbers match everywhere
  function sizing(l, s) {
    s = Object.assign({ tariffHome: 10, tariffCommercial: 12, priceHome: 60000, priceCommercial: 45000 }, s || {});
    const com = ['Factory', 'Shop', 'Institution'].includes(l.type);
    const units = (Number(l.bill) || 0) / (com ? s.tariffCommercial : s.tariffHome);
    let kw = Math.max(1, Math.round((units / 120) * 2) / 2);
    if (!l.type || l.type === 'Home' || l.type === 'Farm') kw = Math.min(kw, 10);
    let sub = 0;
    if (!l.type || l.type === 'Home' || l.type === 'Farm') sub = Math.min(78000, Math.min(kw, 2) * 30000 + (kw > 2 ? Math.min(kw - 2, 1) * 18000 : 0));
    if (l.type === 'Society') sub = Math.min(kw, 500) * 18000;
    return { kw, subsidy: sub, cost: kw * (com ? s.priceCommercial : s.priceHome) };
  }
  function score(l) {
    if (l.dnc) return 0; let s = 0; const kw = l.sizeKw || (l.bill ? sizing(l).kw : 0);
    s += kw >= 10 ? 30 : kw >= 4 ? 26 : kw >= 3 ? 22 : kw >= 2 ? 15 : kw > 0 ? 8 : 0;
    if (l.roofOwn === 'Yes') s += 20; else if (l.roofOwn === 'Society roof') s += 12;
    s += ({ Immediately: 22, 'This month': 18, '1–3 months': 11, '3–6 months': 6, '6+ months': 2 }[l.timeline] || 0);
    if (l.finance) s += 5; if (l.history) s += 4; if (l.visitBooked) s += 15; if (l.answered) s += 6;
    if ((l.objections || []).includes('Rented property') || l.roofOwn === 'No (rented)') s -= 25;
    return Math.max(0, Math.min(100, Math.round(s)));
  }
  const tempOf = (sc, l) => (l && l.dnc) ? 'DNC' : sc >= 75 ? 'HOT' : sc >= 50 ? 'WARM' : sc >= 25 ? 'NURTURE' : 'COLD';
  function refresh(l) { if (l.bill) { const z = sizing(l, S.cfg.settings); l.sizeKw = z.kw; l.estValue = z.cost; } l.score = score(l); l.temp = tempOf(l.score, l); return l; }

  const AREAS = ['Gangapur Road', 'College Road', 'Makhmalabad', 'Trimbakeshwar', 'Indira Nagar', 'CIDCO', 'Pathardi Phata', 'Dwarka', 'Adgaon', 'Satpur MIDC', 'Ambad MIDC', 'Sinnar', 'Malegaon', 'Nashik Road', 'Deolali Camp', 'Panchavati', 'Niphad', 'Ozar', 'Dindori', 'Igatpuri'];
  const TYPES = ['Home', 'Society', 'Shop', 'Factory', 'Institution', 'Farm'];
  const STAGES = ['New', 'Contacted', 'Qualified', 'Site Survey', 'Quotation Sent', 'Negotiation', 'Won', 'Lost'];
  const normArea = (v) => { const t = String(v || '').toLowerCase().trim(); if (!t) return ''; return AREAS.find((a) => t.includes(a.toLowerCase()) || a.toLowerCase().includes(t)) || String(v).trim(); };

  /* ================= icons ================= */
  const P = {
    home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
    users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
    phone: 'M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z',
    cal: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
    wa: 'M3 21l1.7-5A8.5 8.5 0 1 1 8 19.4zM9 9.5c0 3 2.5 5.5 5.5 5.5l1.3-1.3-2-1-1 .8c-1-.4-1.9-1.3-2.3-2.3l.8-1-1-2z',
    gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
    plus: 'M12 5v14M5 12h14', x: 'M18 6 6 18M6 6l12 12', check: 'M20 6 9 17l-5-5',
    up: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12',
    search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3',
    play: 'M6 4l14 8-14 8z', stop: 'M6 6h12v12H6z',
    map: 'M12 22s-8-6.5-8-12a8 8 0 1 1 16 0c0 5.5-8 12-8 12zM12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
    spark: 'M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9zM19 16l.9 2.1L22 19l-2.1.9L19 22l-.9-2.1L16 19l2.1-.9z',
    send: 'M22 2 11 13M22 2l-7 20-4-9-9-4z', bot: 'M12 8V4M8 4h8M5 8h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2zM9 13h.01M15 13h.01',
    fire: 'M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.4-.5-2-1-3-1-2.2-.2-4.2 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.2.4-2.3 1-3.3.2 1.3 1 2.3 2.5 2.8z',
    link: 'M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.8 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7',
    file: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6',
    out: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
    moon: 'M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z', copy: 'M9 9h11v11H9zM5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1'
  };
  const I = (n, s) => `<svg width="${s || 18}" height="${s || 18}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${P[n] || ''}"/></svg>`;
  const LOGO = '<svg width="22" height="22" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="26" r="11" fill="#F9C74F"/><path d="M8 46c8-6 16-6 24 0s16 6 24 0" stroke="#fff" stroke-width="6" fill="none" stroke-linecap="round"/></svg>';

  /* ================= state ================= */
  const S = { sess: null, leads: [], calls: [], visits: [], followups: [], activity: [], wa_messages: [], content: [], cfg: { settings: {}, profile: null, whatsapp: {}, team: [] },
    loaded: false, last: {}, cfgLast: '', live: false, err: '' };
  const V = { view: 'home', leadId: null, q: '', leadFilter: 'all', callFilter: 'all', sel: new Set(), wa: { step: 1, contentId: null, audience: 'hot', captions: null, busy: false, pick: null }, wiz: 0, audio: null, playing: null, status: null };
  try { S.sess = JSON.parse(localStorage.getItem(SESS) || 'null'); } catch (e) { S.sess = null; }
  const saveSess = () => { try { localStorage.setItem(SESS, JSON.stringify(S.sess)); } catch (e) { /* private mode */ } };
  const byId = (t, id) => S[t].find((x) => x.id === id);
  const lead = (id) => byId('leads', id) || { id, name: 'Unknown', phone: '' };

  /* ================= API ================= */
  async function authFetch(path, body) {
    const r = await fetch(BASE + path, { method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error_description || j.msg || j.message || j.error || 'Login failed');
    return j;
  }
  async function login(email, password) {
    const j = await authFetch('/auth/v1/token?grant_type=password', { email: email.trim(), password });
    S.sess = { access: j.access_token, refresh: j.refresh_token, exp: Date.now() + (j.expires_in || 3600) * 1000, email: j.user && j.user.email || email.trim() };
    saveSess();
  }
  async function refreshTok() {
    if (!S.sess || !S.sess.refresh) throw new Error('Please log in again');
    try {
      const j = await authFetch('/auth/v1/token?grant_type=refresh_token', { refresh_token: S.sess.refresh });
      Object.assign(S.sess, { access: j.access_token, refresh: j.refresh_token || S.sess.refresh, exp: Date.now() + (j.expires_in || 3600) * 1000 }); saveSess();
    } catch (e) { logout('Your login expired — please log in again'); throw e; }
  }
  async function api(path, opts, retried) {
    if (S.sess.exp && S.sess.exp - Date.now() < 60e3) await refreshTok();
    opts = opts || {};
    const r = await fetch(BASE + path, Object.assign({}, opts, { headers: Object.assign({ apikey: KEY, Authorization: 'Bearer ' + S.sess.access, 'Content-Type': 'application/json' }, opts.headers || {}) }));
    if (r.status === 401 && !retried) { await refreshTok(); return api(path, opts, true); }
    return r;
  }
  async function fn(name, body) {
    const r = await api('/functions/v1/' + name, { method: 'POST', body: JSON.stringify(body || {}) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.ok === false) throw new Error(j.error || ('Server error ' + r.status));
    return j;
  }
  async function save(table, rows) {
    rows = [].concat(rows).filter(Boolean);
    for (let i = 0; i < rows.length; i += 300) {
      const chunk = rows.slice(i, i + 300);
      const r = await api('/rest/v1/' + table, { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(chunk.map((d) => ({ id: d.id, data: d }))) });
      if (!r.ok) { const t = await r.text(); throw new Error(/leads_phone_uq|duplicate/i.test(t) ? 'This mobile number is already in the CRM' : 'Could not save (' + r.status + ')'); }
    }
  }
  function upLocal(table, d) { const a = S[table]; const i = a.findIndex((x) => x.id === d.id); if (i >= 0) a[i] = d; else a.unshift(d); }
  async function saveLead(l, note) { refresh(l); upLocal('leads', l); await save('leads', l); if (note) await logAct(l.id, 'crm', note); }
  async function logAct(leadId, kind, text) { const a = { id: uid('ac'), at: Date.now(), leadId, kind, text: text + ' · ' + (S.sess.email || '') }; upLocal('activity', a); await save('activity', a).catch(() => {}); }
  async function saveCfg(id, value) {
    S.cfg[id] = value;
    const r = await api('/rest/v1/config', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify([{ id, data: { value } }]) });
    if (!r.ok) throw new Error('Could not save settings');
  }
  async function upload(file, folder) {
    const safe = String(file.name || 'file').toLowerCase().replace(/[^a-z0-9.\-]+/g, '-').slice(-60);
    const path = (folder || 'uploads') + '/' + Date.now().toString(36) + '-' + safe;
    const r = await api('/storage/v1/object/media/' + path, { method: 'POST', headers: { 'Content-Type': file.type || 'application/octet-stream', 'x-upsert': 'true' }, body: file });
    if (!r.ok) { const t = await r.text(); throw new Error(/bucket/i.test(t) ? 'File storage is not set up yet (run panel_v2.sql)' : 'Upload failed (' + r.status + ')'); }
    return BASE + '/storage/v1/object/public/media/' + path;
  }

  /* ================= sync ================= */
  async function pullTable(t) {
    let changed = false;
    for (let page = 0; page < 30; page++) {
      const since = S.last[t] || '1970-01-01T00:00:00Z';
      const r = await api(`/rest/v1/${t}?select=id,data,updated_at&updated_at=gt.${encodeURIComponent(since)}&order=updated_at.asc&limit=1000`);
      if (!r.ok) { if (r.status === 404 || r.status === 400) return false; throw new Error(t + ' ' + r.status); }
      const rows = await r.json(); if (!rows.length) break;
      const arr = S[t]; const idx = new Map(arr.map((x, i) => [x.id, i]));
      for (const row of rows) {
        if (row.updated_at > (S.last[t] || '')) S.last[t] = row.updated_at;
        const d = row.data; if (!d || !d.id) continue;
        const i = idx.get(d.id);
        if (i != null) arr[i] = d; else { arr.push(d); idx.set(d.id, arr.length - 1); if (S.loaded && t === 'activity' && d.kind === 'hot') hotAlert(d); }
        changed = true;
      }
      if (rows.length < 1000) break;
    }
    if (changed) { const k = { leads: 'createdAt', calls: 'at', activity: 'at', wa_messages: 'at', content: 'createdAt', visits: 'at', followups: 'dueAt' }[t]; S[t].sort((a, b) => (b[k] || 0) - (a[k] || 0)); }
    return changed;
  }
  async function pullCfg() {
    const r = await api('/rest/v1/config?select=id,data,updated_at&updated_at=gt.' + encodeURIComponent(S.cfgLast || '1970-01-01T00:00:00Z'));
    if (!r.ok) return false; const rows = await r.json();
    rows.forEach((row) => { if (row.updated_at > S.cfgLast) S.cfgLast = row.updated_at; if (row.data && row.data.value !== undefined) S.cfg[row.id] = row.data.value; });
    return rows.length > 0;
  }
  let polling = false;
  async function pull() {
    if (!S.sess || polling) return; polling = true;
    try {
      let any = await pullCfg();
      for (const t of TABLES) if (await pullTable(t)) any = true;
      S.live = true; S.err = '';
      if (any || !S.loaded) { S.loaded = true; render(); } else paintLive();
    } catch (e) { S.live = false; S.err = String(e.message || e); paintLive(); }
    finally { polling = false; }
  }
  let timer = null;
  function startSync() { clearInterval(timer); pull(); timer = setInterval(() => { if (!document.hidden) pull(); }, 5000); }
  function hotAlert(a) {
    const l = lead(a.leadId); toast('🔥 HOT lead: ' + l.name + ' — call within 30 min');
    try { if ('Notification' in window && Notification.permission === 'granted') new Notification('HOT lead — ' + l.name, { body: l.area || '' }); } catch (e) { /* ignore */ }
  }
  function logout(msg) { clearInterval(timer); S.sess = null; saveSess(); Object.assign(S, { leads: [], calls: [], visits: [], followups: [], activity: [], wa_messages: [], content: [], last: {}, cfgLast: '', loaded: false }); S.cfg = { settings: {}, profile: null, whatsapp: {}, team: [] }; renderLogin(msg); }

  /* ================= UI helpers ================= */
  let toastT = null;
  function toast(m) { let t = $('#toast'); if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); } t.textContent = m; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 3800); }
  function modal(title, body, foot) { setTimeout(afterRender, 0); $('#layer').innerHTML = `<div class="scrim m" data-act="closeLayer"></div><div class="modal" role="dialog" aria-modal="true" aria-label="${h(title)}"><div class="mh"><h2 class="sp">${h(title)}</h2><button class="btn ghost sm" data-act="closeLayer" aria-label="Close">${I('x')}</button></div><div class="mb">${body}</div>${foot ? `<div class="mf">${foot}</div>` : ''}</div>`; }
  function closeLayer() { $('#layer').innerHTML = ''; V.leadId = null; if (location.hash.startsWith('#lead/')) history.replaceState(null, '', '#' + V.view); }
  const stagePill = (l) => { const s = l.stage || 'New'; const c = s === 'Won' ? 'good' : s === 'Lost' ? 'bad' : s === 'Site Survey' ? 'sea' : s === 'New' ? 'sky' : ''; return `<span class="pill ${c}">${h(s === 'Won' ? 'Customer' : s)}</span>`; };
  const tempPill = (l) => l.dnc ? '<span class="pill bad">Do not call</span>' : l.temp === 'HOT' ? `<span class="pill hot">${I('fire', 12)} Hot</span>` : l.temp === 'WARM' ? '<span class="pill warn">Warm</span>' : '';
  const avatar = (l) => `<span class="av ${l.stage === 'Won' ? 'cust' : l.temp === 'HOT' ? 'hot' : ''}">${h(initials(l.name))}</span>`;
  const outcomeTone = (o) => /booked/i.test(o) ? 'good' : /Callback|Qualified/.test(o) ? 'sea' : /No answer|Busy|Failed/.test(o) ? 'warn' : /DNC|Not interested/.test(o) ? 'bad' : /Dialling/.test(o) ? 'sky' : '';
  function paintLive() { const el = $('#live'); if (!el) return; el.className = 'live' + (S.live ? '' : ' off'); el.innerHTML = `<i></i>${S.live ? 'Live' : 'Offline — retrying'}`; el.title = S.err || 'Synced with the Solaris database'; }
  function sw(id, on, act) { return `<label class="switch"><input type="checkbox" id="${id}" ${on ? 'checked' : ''} data-chg="${act}"><span></span></label>`; }

  /* ================= derived ================= */
  function counts() {
    const t0 = today0(); const wk = t0 - 6 * DAY;
    const newToday = S.leads.filter((l) => (l.createdAt || 0) >= t0).length;
    const callsToday = S.calls.filter((c) => c.at >= t0 && c.dir !== 'Manual').length;
    const booked = S.visits.filter((v) => (v.createdAt || v.at) >= wk && v.status !== 'Cancelled').length;
    const hotWaiting = S.leads.filter((l) => l.temp === 'HOT' && l.stage !== 'Won' && l.stage !== 'Lost' && !(l.humanCalledAt > (l.lastContact || 0) - 1)).length;
    const dueHuman = S.followups.filter((f) => f.status === 'pending' && f.type !== 'AI call' && f.dueAt <= Date.now() + 2 * 3600e3).length;
    return { newToday, callsToday, booked, hotWaiting, dueHuman };
  }
  function doNow() {
    const now = Date.now(); const items = [];
    S.leads.filter((l) => l.temp === 'HOT' && !['Won', 'Lost'].includes(l.stage) && !(l.humanCalledAt > (l.lastContact || 0) - 1)).slice(0, 6)
      .forEach((l) => items.push({ l, tag: '<span class="pill hot">Hot</span>', t: 'Call personally — ' + (l.area || 'interested') + (l.bill ? ' · bill ' + inr(l.bill) : ''), at: l.lastContact || l.createdAt }));
    S.followups.filter((f) => f.status === 'pending' && f.type !== 'AI call' && f.dueAt <= now + 2 * 3600e3).sort((a, b) => a.dueAt - b.dueAt).slice(0, 8)
      .forEach((f) => items.push({ l: lead(f.leadId), tag: `<span class="pill ${f.dueAt < now ? 'bad' : 'warn'}">${f.dueAt < now ? 'Overdue' : 'Due ' + fmtT(f.dueAt)}</span>`, t: f.note || f.type, fu: f.id, at: f.dueAt }));
    const t0 = today0();
    S.visits.filter((v) => v.at >= t0 && v.at < t0 + DAY && ['Scheduled', 'Confirmed'].includes(v.status)).forEach((v) => items.push({ l: lead(v.leadId), tag: `<span class="pill sea">Visit ${fmtT(v.at)}</span>`, t: v.address || '', at: v.at }));
    return items;
  }

  /* ================= shell ================= */
  const NAV = [['home', 'Home', 'मुख्य', 'home'], ['leads', 'Leads', 'ग्राहक', 'users'], ['calls', 'AI calls', 'कॉल्स', 'phone'], ['visits', 'Visits', 'भेटी', 'cal'], ['whatsapp', 'WhatsApp', 'व्हॉट्सॲप', 'wa'], ['setup', 'Setup', 'सेटअप', 'gear']];
  function shell(content) {
    const c = counts(); const prof = S.cfg.profile || {};
    return `<div class="app">
      <aside class="side" aria-label="Main">
        <div class="brand"><span class="logo">${LOGO}</span><div><b>${h(prof.company || 'Solaris')}</b><span>AI OS · ${h(prof.city || 'Nashik')}</span></div></div>
        ${NAV.map(([id, en, mr, ic]) => `<button class="nav ${V.view === id ? 'on' : ''}" data-act="go" data-v="${id}">${I(ic, 20)}<span>${en}<small>${mr}</small></span>${id === 'home' && c.hotWaiting ? `<span class="count">${c.hotWaiting}</span>` : ''}</button>`).join('')}
        <div class="foot">${h(S.sess.email || '')}<br><button class="btn ghost sm" data-act="theme" style="padding-left:0">${I('moon', 15)} Theme</button> <button class="btn ghost sm" data-act="logout">${I('out', 15)} Log out</button></div>
      </aside>
      <main class="main" id="main">${content}</main>
      <nav class="bottom" aria-label="Main">${NAV.map(([id, en, , ic]) => `<button class="${V.view === id ? 'on' : ''}" data-act="go" data-v="${id}">${I(ic, 22)}${en}</button>`).join('')}</nav>
    </div>`;
  }
  const topbar = (title, sub, right) => `<div class="top"><div class="sp"><h1>${title}</h1>${sub ? `<div class="muted small">${sub}</div>` : ''}</div><span class="live" id="live"><i></i>Live</span>${right || ''}</div>`;

  function render() {
    if (!S.sess) return renderLogin();
    if (!S.loaded) { $('#root').innerHTML = `<div class="center"><div class="card authcard"><div class="row">${LOGO.replace('#fff', 'var(--brand)')}<b>Loading your workspace…</b></div><div class="skel"></div><div class="skel" style="width:70%"></div></div></div>`; return; }
    if (!S.cfg.profile && V.view !== 'setup') { V.view = 'wizard'; }
    if (V.view === 'wizard') { $('#root').innerHTML = VIEWS.wizard(); afterRender(); return; }
    const y = window.scrollY;
    $('#root').innerHTML = shell((VIEWS[V.view] || VIEWS.home)());
    window.scrollTo(0, y); paintLive(); afterRender();
    if (V.leadId) openLead(V.leadId, true);
  }
  function afterRender() { document.querySelectorAll('.drop[data-drop]').forEach(bindDrop); }

  /* ================= login ================= */
  function renderLogin(msg) {
    $('#layer').innerHTML = '';
    $('#root').innerHTML = `<div class="center"><form class="card authcard" id="loginForm">
      <div class="row nw"><span class="brand" style="padding:0"><span class="logo">${LOGO}</span></span><div><div class="xs muted" style="letter-spacing:.08em;text-transform:uppercase">Solaris AI OS</div><h1 style="font-size:24px">Welcome back</h1></div></div>
      <div class="muted small">Leads, AI calls, site visits and WhatsApp — live. <span lang="mr">लॉगिन करा.</span></div>
      <label class="f">Email<input class="i" id="lg_e" type="email" autocomplete="username" required></label>
      <label class="f">Password<input class="i" id="lg_p" type="password" autocomplete="current-password" required></label>
      <div class="small" id="lg_m" style="color:var(--bad);min-height:1.2em">${h(msg || '')}</div>
      <button class="btn pri" type="submit" id="lg_b">Log in</button>
      <button class="btn ghost sm" type="button" data-act="forgot">Forgot password?</button>
      <a class="btn sm" href="?demo" style="text-align:center">See the demo (sample data)</a>
      ${!BASE ? '<div class="note warn">config.js is missing the Supabase URL and key.</div>' : ''}
    </form></div>`;
    $('#loginForm').onsubmit = async (e) => {
      e.preventDefault(); const b = $('#lg_b'); b.disabled = true; b.textContent = 'Logging in…';
      try { await login($('#lg_e').value, $('#lg_p').value); V.view = (location.hash.slice(1).split('/')[0]) || 'home'; render(); startSync(); }
      catch (err) { $('#lg_m').textContent = /fetch/i.test(err.message) ? 'Cannot reach the server — check your internet.' : err.message; b.disabled = false; b.textContent = 'Log in'; }
    };
    setTimeout(() => { const e = $('#lg_e'); if (e) e.focus(); }, 30);
  }

  /* ================= views ================= */
  const VIEWS = {};

  VIEWS.home = function () {
    const c = counts(); const prof = S.cfg.profile || {}; const items = doNow();
    const t0 = today0(); const days = [];
    for (let i = 6; i >= 0; i--) { const d0 = t0 - i * DAY; const cs = S.calls.filter((x) => x.at >= d0 && x.at < d0 + DAY); days.push({ d0, n: cs.length, ok: cs.filter((x) => /booked/i.test(x.outcome || '')).length }); }
    const max = Math.max(1, ...days.map((d) => d.n));
    const hr = new Date(Date.now() + 198e5).getUTCHours();
    const hello = hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening';
    return topbar(`${hello}${prof.owner ? ', ' + h(first(prof.owner)) : ''}`, 'Here is what needs you today · <span lang="mr">आजचं काम</span>', `<button class="btn pri" data-act="addLead">${I('plus')} Add lead</button>`) + `
      <div class="grid g4">
        <div class="card stat sea"><div class="lbl">${I('users', 15)} New leads today</div><div class="num">${c.newToday}</div><div class="sub">${num(S.leads.length)} in total</div></div>
        <div class="card stat"><div class="lbl">${I('bot', 15)} AI calls today</div><div class="num">${c.callsToday}</div><div class="sub">Asha handles these</div></div>
        <div class="card stat"><div class="lbl">${I('cal', 15)} Visits booked · 7 days</div><div class="num">${c.booked}</div><div class="sub">${S.visits.filter((v) => v.at >= t0 && v.at < t0 + DAY).length} today</div></div>
        <div class="card stat hot"><div class="lbl">${I('fire', 15)} Hot leads waiting</div><div class="num">${c.hotWaiting}</div><div class="sub">Call within 30 min</div></div>
      </div>
      <div class="grid home2" style="margin-top:14px">
        <div class="card"><div class="hd"><h2 class="sp">Do now</h2><span class="muted small">${items.length} item${items.length === 1 ? '' : 's'}</span></div>
          <div class="list" style="margin-top:8px">${items.map((x) => `<div class="item" data-act="openLead" data-id="${h(x.l.id)}">${avatar(x.l)}<div class="sp"><div class="t">${h(x.l.name)}</div><div class="s">${h(x.t)}</div></div>${x.tag}${x.fu ? `<button class="btn sm" data-act="fuDone" data-id="${h(x.fu)}" title="Mark done">${I('check', 15)}</button>` : `<a class="btn sm" href="${telUrl(x.l.phone)}" data-stop="1" title="Call">${I('phone', 15)}</a>`}</div>`).join('') || '<div class="empty">All clear. Asha is working through the leads.</div>'}</div>
        </div>
        <div class="stack">
          <div class="card"><div class="hd"><h2 class="sp">AI calls · last 7 days</h2></div><div class="bd">
            <div class="bars" role="img" aria-label="AI calls per day for the last 7 days">${days.map((d) => `<div class="b" tabindex="0"><span class="tip">${fmtD(d.d0)}: ${d.n} calls · ${d.ok} booked</span><div class="col" style="height:${Math.round((d.n / max) * 100)}%"></div><span class="lb">${new Date(d.d0 + 198e5).toLocaleDateString('en-IN', { weekday: 'short', timeZone: 'UTC' })}</span></div>`).join('')}</div>
            <div class="xs muted" style="margin-top:6px">${days.reduce((a, d) => a + d.n, 0)} calls · ${days.reduce((a, d) => a + d.ok, 0)} visits booked by AI this week</div>
          </div></div>
          <div class="card"><div class="hd"><h2 class="sp">Latest calls</h2><button class="btn ghost sm" data-act="go" data-v="calls">See all</button></div>
            <div class="list" style="margin-top:6px">${S.calls.slice(0, 5).map(callRow).join('') || '<div class="empty">No calls yet.</div>'}</div></div>
        </div>
      </div>`;
  };

  function callRow(c) {
    const l = lead(c.leadId);
    return `<div class="item" data-act="openLead" data-id="${h(c.leadId)}"><span class="av">${I(c.dir === 'Inbound' ? 'phone' : 'bot', 17)}</span><div class="sp"><div class="t">${h(l.name)}</div><div class="s">${h(c.summary || c.dir || '')}</div></div><div style="text-align:right"><span class="pill ${outcomeTone(c.outcome || '')}">${h(c.outcome || '—')}</span><div class="xs muted">${rel(c.at)}</div></div></div>`;
  }

  /* ---------- leads ---------- */
  const LF = [['all', 'All'], ['hot', 'Hot'], ['new', 'New'], ['due', 'Follow-up due'], ['visit', 'Visit booked'], ['cust', 'Customers'], ['lost', 'Lost / DNC']];
  function leadMatch(l, f) {
    const pend = (id) => S.followups.some((x) => x.leadId === id && x.status === 'pending' && x.dueAt <= Date.now() + DAY);
    return f === 'all' ? l.stage !== 'Lost' && !l.dnc : f === 'hot' ? l.temp === 'HOT' && l.stage !== 'Won' && l.stage !== 'Lost' : f === 'new' ? (l.stage || 'New') === 'New' && !l.dnc
      : f === 'due' ? pend(l.id) : f === 'visit' ? l.stage === 'Site Survey' || l.visitBooked : f === 'cust' ? l.stage === 'Won' : l.stage === 'Lost' || l.dnc;
  }
  VIEWS.leads = function () {
    const q = V.q.toLowerCase().trim();
    const list = S.leads.filter((l) => leadMatch(l, V.leadFilter)).filter((l) => !q || [l.name, l.phone, l.area, l.address, l.source].join(' ').toLowerCase().includes(q));
    const shown = list.slice(0, 300); const nSel = V.sel.size;
    return topbar('Leads', `${num(S.leads.length)} people · <span lang="mr">सर्व ग्राहक</span>`, `<button class="btn" data-act="go" data-v="import">${I('up')} Import Excel</button><button class="btn pri" data-act="addLead">${I('plus')} Add</button>`) + `
      <div class="card"><div class="bd stack">
        <div class="row"><div class="sp" style="position:relative;min-width:200px"><input class="i" id="q" placeholder="Search name, mobile, area…" value="${h(V.q)}" data-inp="search" style="padding-left:38px"><span style="position:absolute;left:12px;top:11px;color:var(--muted)">${I('search')}</span></div></div>
        <div class="chips">${LF.map(([id, t]) => `<button class="chip ${V.leadFilter === id ? 'on' : ''}" data-act="lf" data-v="${id}">${t}<b>${S.leads.filter((l) => leadMatch(l, id)).length}</b></button>`).join('')}</div>
        ${nSel ? `<div class="note row"><b class="sp">${nSel} selected</b><button class="btn sm pri" data-act="bulkCall">${I('bot', 15)} AI call them</button><button class="btn sm wa" data-act="bulkWa">${I('wa', 15)} WhatsApp</button><button class="btn sm ghost" data-act="selNone">Clear</button></div>` : ''}
      </div>
      <div class="list">${shown.map((l) => `<div class="item" data-act="openLead" data-id="${h(l.id)}"><input type="checkbox" class="chk" data-act="sel" data-id="${h(l.id)}" ${V.sel.has(l.id) ? 'checked' : ''} aria-label="Select ${h(l.name)}">${avatar(l)}<div class="sp"><div class="t">${h(l.name)}</div><div class="s">${h([l.area, l.type, l.bill ? 'bill ' + inr(l.bill) : ''].filter(Boolean).join(' · ') || l.phone)}</div></div><div class="row nw hide-m">${tempPill(l)}${stagePill(l)}</div><div class="xs muted hide-m" style="width:78px;text-align:right">${rel(l.lastContact || l.createdAt)}</div></div>`).join('') || '<div class="empty">No leads here yet.</div>'}
      ${list.length > 300 ? `<div class="empty small">Showing 300 of ${list.length} — search to narrow down.</div>` : ''}</div></div>`;
  };

  /* ---------- lead drawer ---------- */
  function openLead(id, keep) {
    V.leadId = id; const l = byId('leads', id); if (!l) return;
    if (!keep && !location.hash.startsWith('#lead/')) history.replaceState(null, '', '#lead/' + id);
    const calls = S.calls.filter((c) => c.leadId === id);
    const wa = S.wa_messages.filter((m) => m.leadId === id).slice(0, 12);
    const vis = S.visits.filter((v) => v.leadId === id).sort((a, b) => b.at - a.at);
    const fus = S.followups.filter((f) => f.leadId === id && f.status === 'pending').sort((a, b) => a.dueAt - b.dueAt);
    const acts = S.activity.filter((a) => a.leadId === id).slice(0, 14);
    const z = l.bill ? sizing(l, S.cfg.settings) : null;
    const sel = (k, opts) => `<select class="sel" data-chg="lf_set" data-k="${k}">${['', ...opts].map((o) => `<option ${String(l[k] || '') === o ? 'selected' : ''} value="${h(o)}">${h(o || '—')}</option>`).join('')}</select>`;
    const inp = (k, t) => `<input class="i" data-chg="lf_set" data-k="${k}" value="${h(l[k] == null ? '' : l[k])}" ${t ? 'inputmode="numeric"' : ''}>`;
    $('#layer').innerHTML = `<div class="scrim" data-act="closeLayer"></div><aside class="drawer" role="dialog" aria-modal="true" aria-label="${h(l.name)}">
      <div class="dh"><div class="row nw">${avatar(l)}<div class="sp"><h2>${h(l.name)}</h2><div class="small muted">${h(l.phone || '')}${l.area ? ' · ' + h(l.area) : ''}</div></div><button class="btn ghost sm" data-act="closeLayer" aria-label="Close">${I('x')}</button></div>
        <div class="row" style="margin-top:10px"><button class="btn pri sm" data-act="aiCall" data-id="${h(l.id)}" ${l.dnc ? 'disabled' : ''}>${I('bot', 15)} AI call now</button><a class="btn sm" href="${telUrl(l.phone)}" data-act="humanCall" data-id="${h(l.id)}">${I('phone', 15)} Call</a><button class="btn wa sm" data-act="waOne" data-id="${h(l.id)}">${I('wa', 15)} WhatsApp</button><button class="btn sm" data-act="bookVisit" data-id="${h(l.id)}">${I('cal', 15)} Visit</button></div></div>
      <div class="db">
        <div class="row">${tempPill(l)}${stagePill(l)}${z ? `<span class="pill sea">~${z.kw} kW · subsidy ${inr(z.subsidy)}</span>` : ''}${l.source ? `<span class="pill">${h(l.source)}</span>` : ''}</div>
        ${fus.length ? `<div class="card"><div class="bd stack"><b>Next steps</b>${fus.map((f) => `<div class="row nw"><span class="pill ${f.dueAt < Date.now() ? 'bad' : 'sea'}">${h(f.type)} · ${fmtDT(f.dueAt)}</span><span class="sp small">${h(f.note || '')}</span><button class="btn sm" data-act="fuDone" data-id="${h(f.id)}">${I('check', 14)}</button></div>`).join('')}</div></div>` : ''}
        ${vis.length ? `<div class="card"><div class="bd stack"><b>Visits</b>${vis.map((v) => `<div class="row nw"><span class="pill ${v.status === 'Completed' ? 'good' : v.status === 'Cancelled' ? 'bad' : 'sea'}">${h(v.status)}</span><div class="sp small"><b>${fmtDT(v.at)}</b><div class="muted">${h(v.address || '')}</div></div>${v.address ? `<a class="btn sm" target="_blank" rel="noopener" href="${mapsUrl(v.address)}">${I('map', 14)}</a>` : ''}</div>`).join('')}</div></div>` : ''}
        <div class="card"><div class="bd"><div class="fgrid">
          <label class="f">Name${inp('name')}</label><label class="f">Area${sel('area', AREAS)}</label>
          <label class="f" style="grid-column:1/-1">Visit address (house no., building, landmark)${inp('address')}</label>
          <label class="f">Monthly bill (₹)${inp('bill', 1)}</label><label class="f">Property${sel('type', TYPES)}</label>
          <label class="f">Stage${sel('stage', STAGES)}</label><label class="f">Language${sel('lang', ['mr', 'hi', 'en'])}</label>
        </div>
        <label class="f" style="margin-top:12px">Add a note<textarea class="i" id="noteIn" placeholder="e.g. Wants hybrid with battery; call after 6 pm"></textarea></label>
        <div class="row" style="margin-top:8px"><button class="btn sm" data-act="addNote" data-id="${h(l.id)}">Save note</button><span class="sp"></span><button class="btn ghost sm" data-act="dnc" data-id="${h(l.id)}">${l.dnc ? 'Allow calls again' : 'Do not call'}</button></div>
        </div></div>
        ${calls.length ? `<div class="card"><div class="bd stack"><b>AI calls</b>${calls.map((c) => `<details ${calls[0] === c ? 'open' : ''}><summary class="row nw" style="cursor:pointer"><span class="pill ${outcomeTone(c.outcome || '')}">${h(c.outcome || '')}</span><span class="sp small">${fmtDT(c.at)} · ${Math.round((c.secs || 0) / 60 * 10) / 10} min</span>${c.interactionId ? `<button class="btn sm" data-act="play" data-id="${h(c.id)}">${I(V.playing === c.id ? 'stop' : 'play', 14)} ${V.playing === c.id ? 'Stop' : 'Recording'}</button>` : ''}</summary>
          <div class="small" style="margin:8px 0">${h(c.summary || '')}</div>
          <div class="tx">${(c.transcript || []).map((t) => `<div class="bubble ${t.s === 'ai' ? 'ai' : 'cust'}">${h(t.t)}</div>`).join('') || '<span class="muted small">Transcript arrives when the call ends.</span>'}</div></details>`).join('')}</div></div>` : ''}
        ${wa.length ? `<div class="card"><div class="bd stack"><b>WhatsApp</b><div class="tx">${wa.slice().reverse().map((m) => `<div class="bubble ${m.dir === 'in' ? 'in' : 'out'}">${h(m.text || '')}${m.media ? ' 📎' : ''}<div class="xs muted">${fmtDT(m.at)}${m.dir === 'out' ? ' · ' + h(m.status || '') : ''}</div></div>`).join('')}</div></div></div>` : ''}
        <div class="card"><div class="bd"><b>History</b><div class="tl" style="margin-top:6px">${(l.notes || []).slice(0, 5).map((n) => `<div class="ev"><span class="ic">${I('file', 14)}</span><div class="small"><b>Note</b> · ${h(n.t)}<div class="xs muted">${rel(n.at)} · ${h(n.by || '')}</div></div></div>`).join('')}${acts.map((a) => `<div class="ev"><span class="ic">${I(a.kind === 'wa' ? 'wa' : a.kind === 'visit' ? 'cal' : a.kind === 'call' ? 'phone' : a.kind === 'hot' ? 'fire' : 'check', 14)}</span><div class="small">${h(a.text)}<div class="xs muted">${rel(a.at)}</div></div></div>`).join('') || '<div class="muted small">Nothing yet.</div>'}</div></div></div>
      </div></aside>`;
  }

  /* ---------- calls ---------- */
  VIEWS.calls = function () {
    const F = [['all', 'All'], ['booked', 'Visit booked'], ['cb', 'Callback'], ['na', 'No answer'], ['in', 'Inbound']];
    const m = (c, f) => f === 'all' || (f === 'booked' ? /booked/i.test(c.outcome || '') : f === 'cb' ? c.outcome === 'Callback' : f === 'na' ? /No answer|Busy|Failed/.test(c.outcome || '') : c.dir === 'Inbound');
    const list = S.calls.filter((c) => m(c, V.callFilter));
    return topbar('AI calls', 'Every call Asha makes or answers — with recording and transcript', `<button class="btn pri" data-act="go" data-v="campaign">${I('bot')} Start calling</button>`) + `
      <div class="card"><div class="bd"><div class="chips">${F.map(([id, t]) => `<button class="chip ${V.callFilter === id ? 'on' : ''}" data-act="cf" data-v="${id}">${t}<b>${S.calls.filter((c) => m(c, id)).length}</b></button>`).join('')}</div></div>
      <div class="list">${list.slice(0, 200).map(callRow).join('') || '<div class="empty">No calls yet. Tap “Start calling” to let Asha call your new leads.</div>'}</div></div>`;
  };
  VIEWS.campaign = function () {
    const groups = campaignGroups();
    return topbar('Start calling', 'Asha calls these leads inside calling hours (10 am – 7 pm), 3 tries each', `<button class="btn" data-act="go" data-v="calls">Back</button>`) + `
      <div class="card"><div class="bd stack">
        ${groups.map((g) => `<label class="row nw" style="padding:8px 0;border-top:1px solid var(--line2)"><input type="radio" name="cg" value="${g.id}" class="chk" ${g.id === 'new' ? 'checked' : ''}><span class="sp"><b>${g.t}</b><div class="small muted">${g.d}</div></span><span class="pill sea">${g.ids.length}</span></label>`).join('')}
        <div class="note">Do-not-call numbers, customers and anyone called in the last 2 hours are skipped automatically.</div>
        <div class="row"><span class="sp"></span><button class="btn pri" data-act="runCampaign">${I('bot')} Start</button></div>
      </div></div>`;
  };
  function campaignGroups() {
    const ok = (l) => !l.dnc && l.consent !== false && !['Won', 'Lost'].includes(l.stage);
    const called = new Set(S.calls.map((c) => c.leadId));
    return [
      { id: 'new', t: 'New leads never called', d: 'Fresh enquiries and imported leads', ids: S.leads.filter((l) => ok(l) && !called.has(l.id)).map((l) => l.id) },
      { id: 'warm', t: 'Warm leads without a visit', d: 'Interested, but no survey booked yet', ids: S.leads.filter((l) => ok(l) && ['WARM', 'HOT'].includes(l.temp) && !l.visitBooked).map((l) => l.id) },
      { id: 'noans', t: 'Didn’t pick up last time', d: 'Last AI call was no answer / busy', ids: S.leads.filter((l) => ok(l) && (() => { const c = S.calls.find((x) => x.leadId === l.id); return c && /No answer|Busy/.test(c.outcome || ''); })()).map((l) => l.id) },
      { id: 'sel', t: 'Leads I selected', d: 'From the Leads page', ids: [...V.sel] }
    ];
  }

  /* ---------- visits ---------- */
  VIEWS.visits = function () {
    const t0 = today0(); const up = S.visits.filter((v) => v.at >= t0 - DAY && !['Cancelled'].includes(v.status)).sort((a, b) => a.at - b.at);
    const byDay = {}; up.forEach((v) => { const k = istDay(v.at); (byDay[k] = byDay[k] || []).push(v); });
    const team = S.cfg.team || []; const who = (id) => (team.find((t) => t.id === id) || {}).name || '';
    return topbar('Site visits', 'Surveys and meetings — with address and map', '') + (Object.keys(byDay).map((k) => `
      <div class="card" style="margin-bottom:12px"><div class="hd"><h2 class="sp">${Number(k) === t0 ? 'Today' : Number(k) === t0 + DAY ? 'Tomorrow' : fmtD(Number(k) + 3600e3)}</h2><span class="muted small">${byDay[k].length}</span></div>
        <div class="list" style="margin-top:6px">${byDay[k].map((v) => { const l = lead(v.leadId); return `<div class="item" data-act="openLead" data-id="${h(v.leadId)}"><span class="av">${fmtT(v.at).replace(/\s?(am|pm)/i, '')}</span><div class="sp"><div class="t">${h(l.name)} <span class="pill ${v.status === 'Completed' ? 'good' : v.status === 'Confirmed' ? 'sea' : ''}">${h(v.status)}</span></div><div class="s">${h(v.kind || 'Site survey')} · ${fmtT(v.at)}${who(v.with) ? ' · ' + h(who(v.with)) : ''} · ${h(v.address || 'address missing')}</div></div>
          <a class="btn sm" target="_blank" rel="noopener" href="${mapsUrl(v.address || l.area)}" data-stop="1" title="Map">${I('map', 15)}</a><a class="btn sm" href="${telUrl(l.phone)}" data-stop="1" title="Call">${I('phone', 15)}</a>${v.status !== 'Completed' ? `<button class="btn sm" data-act="visitDone" data-id="${h(v.id)}" title="Mark done">${I('check', 15)}</button>` : ''}</div>`; }).join('')}</div></div>`).join('') || '<div class="card"><div class="empty">No visits booked yet. Asha books them on calls — or open a lead and tap “Visit”.</div></div>');
  };

  /* ---------- import ---------- */
  const HEAD = { name: ['name', 'customer name', 'customer', 'full name', 'lead name', 'नाव', 'नाम'], phone: ['phone', 'mobile', 'mobile no', 'mobile number', 'phone number', 'contact', 'contact no', 'number', 'whatsapp', 'मोबाईल', 'मोबाइल'],
    area: ['area', 'location', 'locality', 'city area', 'भाग'], address: ['address', 'full address', 'पत्ता'], type: ['type', 'property type', 'segment', 'category'], bill: ['bill', 'monthly bill', 'electricity bill', 'light bill', 'avg bill', 'बिल'],
    source: ['source', 'lead source', 'campaign', 'utm source'], lang: ['language', 'lang', 'भाषा'], notes: ['notes', 'remark', 'remarks', 'comment', 'comments'] };
  let IMP = null;
  VIEWS.import = function () {
    return topbar('Import leads', 'Excel or CSV from Meta ads, Google, your old CRM — any columns', `<button class="btn" data-act="go" data-v="leads">Back</button>`) + `<div class="card"><div class="bd stack">${importBody()}</div></div>`;
  };
  function importBody() {
    if (!IMP) return `<div class="drop" data-drop="leadsFile" tabindex="0" role="button">${I('up', 28)}<div style="margin-top:6px"><b>Drop your Excel / CSV here</b> or tap to choose</div><div class="small">Needs at least a mobile number column. Name, area, bill, address are picked up automatically.</div></div><input type="file" id="leadsFile" accept=".xlsx,.xls,.csv" hidden data-chg="leadsFile">`;
    const ok = IMP.rows.filter((r) => r.ok); const dup = IMP.rows.filter((r) => r.dup).length; const bad = IMP.rows.filter((r) => !r.phone).length;
    return `<div class="row"><b class="sp">${h(IMP.file)}</b><button class="btn sm ghost" data-act="impReset">Choose another file</button></div>
      <div class="grid g3"><div class="card stat"><div class="lbl">Ready to import</div><div class="num">${ok.length}</div></div><div class="card stat"><div class="lbl">Already in CRM (will update)</div><div class="num">${dup}</div></div><div class="card stat"><div class="lbl">Skipped (no valid mobile)</div><div class="num">${bad}</div></div></div>
      <div class="small muted">Columns found: ${Object.entries(IMP.map).filter(([, v]) => v).map(([k, v]) => `<b>${h(k)}</b> ← “${h(v)}”`).join(', ')}</div>
      <div class="scrollx"><table class="tbl"><thead><tr><th>Name</th><th>Mobile</th><th>Area</th><th>Bill</th><th></th></tr></thead><tbody>${IMP.rows.slice(0, 8).map((r) => `<tr><td>${h(r.name)}</td><td>${h(r.phone || r.raw)}</td><td>${h(r.area)}</td><td>${h(r.bill || '')}</td><td>${r.ok ? '<span class="pill good">new</span>' : r.dup ? '<span class="pill sea">update</span>' : '<span class="pill bad">skip</span>'}</td></tr>`).join('')}</tbody></table></div>
      <label class="row nw"><input type="checkbox" class="chk" id="impConsent" checked><span class="small">These people asked about solar (ads, website, walk-in) and agreed to be contacted.</span></label>
      <label class="row nw"><input type="checkbox" class="chk" id="impCall"><span class="small">Let Asha start calling the new leads now (inside calling hours)</span></label>
      <div class="row"><span class="sp"></span><button class="btn pri" data-act="impGo">${I('check')} Import ${ok.length + dup} leads</button></div>`;
  }
  function readSheet(file) {
    return new Promise((res, rej) => {
      if (!window.XLSX) return rej(new Error('Excel reader did not load — check your internet'));
      const fr = new FileReader(); fr.onerror = () => rej(new Error('Could not read the file'));
      fr.onload = () => { try { const wb = XLSX.read(fr.result, { type: 'array' }); res(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' })); } catch (e) { rej(e); } };
      fr.readAsArrayBuffer(file);
    });
  }
  async function parseLeads(file) {
    const rows = await readSheet(file); if (!rows.length) throw new Error('The sheet is empty');
    const cols = Object.keys(rows[0]); const map = {};
    Object.entries(HEAD).forEach(([k, al]) => { map[k] = cols.find((c) => al.includes(String(c).toLowerCase().trim())) || cols.find((c) => al.some((a) => String(c).toLowerCase().includes(a))) || null; });
    if (!map.phone) map.phone = cols.find((c) => rows.slice(0, 20).filter((r) => normPhone(r[c])).length >= 3) || null;
    const have = new Map(S.leads.map((l) => [l.phone, l])); const seen = new Set();
    const out = rows.map((r) => {
      const g = (k) => (map[k] ? String(r[map[k]] == null ? '' : r[map[k]]).trim() : '');
      const phone = normPhone(g('phone')); const dupFile = phone && seen.has(phone); if (phone) seen.add(phone);
      const ex = phone ? have.get(phone) : null;
      const t = g('type').toLowerCase();
      return { raw: g('phone'), phone: dupFile ? null : phone, name: g('name'), area: normArea(g('area')) || normArea(g('address')), address: g('address'), bill: Number(g('bill').replace(/[^\d.]/g, '')) || null,
        type: TYPES.find((x) => t.includes(x.toLowerCase())) || (/flat|apartment/.test(t) ? 'Society' : /industry|industrial/.test(t) ? 'Factory' : 'Home'), source: g('source') || 'Excel import', lang: /hindi/i.test(g('lang')) ? 'hi' : /english/i.test(g('lang')) ? 'en' : 'mr', notes: g('notes'),
        ok: !!phone && !ex && !dupFile, dup: !!ex && !dupFile, exId: ex && ex.id };
    });
    IMP = { file: file.name, map, rows: out };
  }
  async function importGo() {
    const consent = $('#impConsent').checked; const callNow = $('#impCall').checked; const now = Date.now();
    const recs = IMP.rows.filter((r) => r.ok || r.dup).map((r) => {
      if (r.dup) { const l = Object.assign({}, lead(r.exId)); ['name', 'area', 'address', 'bill'].forEach((k) => { if (r[k] && !l[k]) l[k] = r[k]; }); return refresh(l); }
      return refresh({ id: uid('ld'), name: r.name || 'Enquiry ' + r.phone.slice(-5), phone: r.phone, area: r.area, address: r.address, bill: r.bill, type: r.type, source: r.source, lang: r.lang, stage: 'New', consent, objections: [], notes: r.notes ? [{ t: r.notes, at: now, by: 'Import' }] : [], tags: ['Import'], createdAt: now, agentId: 'ag_one' });
    });
    toast('Importing ' + recs.length + ' leads…');
    await save('leads', recs); recs.forEach((l) => upLocal('leads', l));
    const newIds = recs.filter((l) => l.createdAt === now).map((l) => l.id);
    if (callNow && newIds.length) { try { const j = await fn('start-call', { lead_ids: newIds, campaign: 'Import ' + IMP.file }); toast(`${recs.length} imported · ${j.queued} queued for AI calls`); } catch (e) { toast('Imported. AI calling not started: ' + e.message); } }
    else toast(recs.length + ' leads imported');
    IMP = null; V.view = 'leads'; V.leadFilter = 'new'; render();
  }

  async function importFile(file, opts) {
    await parseLeads(file); const r = IMP; const now = Date.now();
    const recs = r.rows.filter((x) => x.ok).map((x) => refresh({ id: uid('ld'), name: x.name || 'Enquiry ' + x.phone.slice(-5), phone: x.phone, area: x.area, address: x.address, bill: x.bill, type: x.type, source: x.source, lang: x.lang, stage: 'New', consent: true, objections: [], notes: x.notes ? [{ t: x.notes, at: now, by: 'Import' }] : [], tags: ['Import'], createdAt: now, agentId: 'ag_one' }));
    if (recs.length) { await save('leads', recs); recs.forEach((l) => upLocal('leads', l)); }
    IMP = null; return { added: recs.length, dup: r.rows.filter((x) => x.dup).length, bad: r.rows.filter((x) => !x.phone).length, file: file.name };
  }

  /* ================= actions ================= */
  const ACT = {
    go: (el) => { V.view = el.dataset.v; closeLayer(); history.replaceState(null, '', '#' + V.view); render(); window.scrollTo(0, 0); },
    closeLayer, logout: () => logout(),
    theme: () => { const r = document.documentElement; const cur = r.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); r.dataset.theme = cur === 'dark' ? 'light' : 'dark'; try { localStorage.setItem('solaris-theme', r.dataset.theme); } catch (e) { /* */ } },
    forgot: async () => { const e = ($('#lg_e') || {}).value; if (!e) return toast('Type your email first'); try { await fetch(BASE + '/auth/v1/recover', { method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: e }) }); toast('Password reset link sent to ' + e); } catch (x) { toast('Could not send the reset email'); } },
    openLead: (el) => openLead(el.dataset.id),
    lf: (el) => { V.leadFilter = el.dataset.v; render(); }, cf: (el) => { V.callFilter = el.dataset.v; render(); },
    sel: (el, ev) => { ev.stopPropagation(); const id = el.dataset.id; if (el.checked) V.sel.add(id); else V.sel.delete(id); render(); },
    selNone: () => { V.sel.clear(); render(); },
    bulkCall: () => { V.view = 'campaign'; render(); setTimeout(() => { const r = document.querySelector('input[name=cg][value=sel]'); if (r) r.checked = true; }, 0); },
    bulkWa: () => { V.wa.audience = 'sel'; V.view = 'whatsapp'; render(); },
    aiCall: async (el) => { el.disabled = true; try { await fn('start-call', { lead_id: el.dataset.id }); toast('Asha is calling ' + lead(el.dataset.id).name + ' now'); } catch (e) { toast('Call not placed: ' + e.message); el.disabled = false; } },
    humanCall: (el) => { const l = byId('leads', el.dataset.id); if (l) { l.humanCalledAt = Date.now(); saveLead(l, 'Called personally').catch(() => {}); } },
    runCampaign: async () => {
      const g = campaignGroups().find((x) => x.id === (document.querySelector('input[name=cg]:checked') || {}).value);
      if (!g || !g.ids.length) return toast('Nobody in this group');
      try { const j = await fn('start-call', { lead_ids: g.ids, campaign: g.t }); toast(`${j.queued} leads queued · ${j.started_now} calling now`); V.view = 'calls'; render(); } catch (e) { toast('Not started: ' + e.message); }
    },
    fuDone: async (el, ev) => { ev.stopPropagation(); const f = byId('followups', el.dataset.id); if (!f) return; f.status = 'done'; f.doneAt = Date.now(); upLocal('followups', f); render(); await save('followups', f).catch((e) => toast(e.message)); },
    visitDone: async (el, ev) => { ev.stopPropagation(); const v = byId('visits', el.dataset.id); v.status = 'Completed'; upLocal('visits', v); const l = byId('leads', v.leadId); if (l && STAGES.indexOf(l.stage) < 4) { l.stage = 'Site Survey'; await saveLead(l, 'Site visit completed'); } render(); await save('visits', v).catch((e) => toast(e.message)); },
    addNote: async (el) => { const t = $('#noteIn').value.trim(); if (!t) return; const l = byId('leads', el.dataset.id); l.notes = [{ t, at: Date.now(), by: S.sess.email }].concat(l.notes || []); await saveLead(l).catch((e) => toast(e.message)); openLead(l.id, true); toast('Note saved'); },
    dnc: async (el) => { const l = byId('leads', el.dataset.id); l.dnc = !l.dnc; const dnc = (S.cfg.dnc || []).filter((p) => p !== l.phone).concat(l.dnc ? [l.phone] : []); await saveLead(l, l.dnc ? 'Marked do-not-call' : 'Calls allowed again'); await saveCfg('dnc', dnc).catch(() => {}); openLead(l.id, true); render(); },
    play: async (el, ev) => {
      ev.preventDefault(); ev.stopPropagation(); const c = byId('calls', el.dataset.id);
      if (V.audio) { V.audio.pause(); V.audio = null; } if (V.playing === c.id) { V.playing = null; return openLead(V.leadId, true); }
      try {
        toast('Loading recording…'); const r = await api('/functions/v1/recording?interaction_id=' + encodeURIComponent(c.interactionId), { method: 'GET' });
        let src; if ((r.headers.get('content-type') || '').includes('audio')) src = URL.createObjectURL(await r.blob()); else { const j = await r.json().catch(() => ({})); if (!r.ok || !j.url) throw new Error(j.error || 'No recording yet'); src = j.url; }
        V.audio = new Audio(src); V.playing = c.id; V.audio.onended = () => { V.playing = null; if (V.leadId) openLead(V.leadId, true); }; await V.audio.play(); openLead(V.leadId, true);
      } catch (e) { toast('Recording: ' + e.message); }
    },
    addLead: () => modal('Add a lead', `<div class="fgrid"><label class="f">Name<input class="i" id="al_n"></label><label class="f">Mobile *<input class="i" id="al_p" inputmode="tel" placeholder="98220 14567"></label><label class="f">Area<select class="sel" id="al_a"><option value="">—</option>${AREAS.map((a) => `<option>${a}</option>`).join('')}</select></label><label class="f">Monthly bill (₹)<input class="i" id="al_b" inputmode="numeric"></label><label class="f">Property<select class="sel" id="al_t">${TYPES.map((t) => `<option>${t}</option>`).join('')}</select></label><label class="f">Language<select class="sel" id="al_l"><option value="mr">Marathi</option><option value="hi">Hindi</option><option value="en">English</option></select></label></div><label class="row nw"><input type="checkbox" class="chk" id="al_c" checked><span class="small">Let Asha call now (inside calling hours)</span></label>`, `<button class="btn" data-act="closeLayer">Cancel</button><button class="btn pri" data-act="addLeadGo">Add lead</button>`),
    addLeadGo: async () => {
      const phone = normPhone($('#al_p').value); if (!phone) return toast('Enter a valid 10-digit mobile number');
      if (S.leads.some((l) => l.phone === phone)) return toast('This number is already in the CRM');
      const l = refresh({ id: uid('ld'), name: $('#al_n').value.trim() || 'Enquiry ' + phone.slice(-5), phone, area: $('#al_a').value, bill: Number($('#al_b').value) || null, type: $('#al_t').value, lang: $('#al_l').value, stage: 'New', source: 'Added by staff', consent: true, objections: [], notes: [], createdAt: Date.now(), agentId: 'ag_one' });
      try { await saveLead(l, 'Lead added'); closeLayer(); toast('Lead added'); if ($('#al_c') && $('#al_c').checked) fn('start-call', { lead_id: l.id }).then(() => toast('Asha is calling ' + l.name)).catch((e) => toast('Saved. Call not placed: ' + e.message)); render(); } catch (e) { toast(e.message); }
    },
    bookVisit: (el) => { const l = lead(el.dataset.id); const d = new Date(Date.now() + DAY + 198e5); const ds = d.toISOString().slice(0, 10);
      modal('Book a site visit', `<div class="fgrid"><label class="f">Date<input class="i" type="date" id="bv_d" value="${ds}"></label><label class="f">Time<input class="i" type="time" id="bv_t" value="11:00"></label></div><label class="f">Address<input class="i" id="bv_a" value="${h(l.address || ((l.area || '') + (l.area ? ', ' : '') + 'Nashik'))}"></label><label class="row nw"><input type="checkbox" class="chk" id="bv_w" checked><span class="small">Send WhatsApp confirmation</span></label>`, `<button class="btn" data-act="closeLayer">Cancel</button><button class="btn pri" data-act="bookVisitGo" data-id="${h(l.id)}">Book</button>`); },
    bookVisitGo: async (el) => {
      const l = byId('leads', el.dataset.id); const [y, m, d] = $('#bv_d').value.split('-').map(Number); const [hh, mm] = $('#bv_t').value.split(':').map(Number);
      const at = Date.UTC(y, m - 1, d, hh, mm) - 198e5; const addr = $('#bv_a').value.trim(); const wa = $('#bv_w').checked;
      const v = { id: uid('vs'), leadId: l.id, kind: l.type === 'Society' ? 'Society meeting' : ['Factory', 'Shop', 'Institution'].includes(l.type) ? 'Factory meeting' : 'Site survey', at, mins: 45, address: addr, status: 'Scheduled', notes: 'Booked by ' + S.sess.email, createdAt: Date.now(), reminders: {} };
      l.address = l.address || addr; l.visitBooked = true; if (STAGES.indexOf(l.stage || 'New') < 3) l.stage = 'Site Survey';
      try { upLocal('visits', v); await save('visits', v); await saveLead(l, 'Visit booked for ' + fmtDT(at)); closeLayer(); toast('Visit booked'); render();
        if (wa) fn('wa-send', { lead_ids: [l.id], template_key: 'visit' }).then((j) => toast(j.sent ? 'WhatsApp confirmation sent' : 'WhatsApp not sent: ' + ((j.results[0] || {}).error || (j.results[0] || {}).reason || ''))).catch((e) => toast('WhatsApp: ' + e.message));
      } catch (e) { toast(e.message); }
    },
    waOne: (el) => { V.sel = new Set([el.dataset.id]); V.wa.audience = 'sel'; V.wa.step = 1; closeLayer(); V.view = 'whatsapp'; render(); },
    impReset: () => { IMP = null; render(); }, impGo: () => importGo().catch((e) => toast(e.message)),
    copy: (el) => { const t = el.dataset.text || ($(el.dataset.src) || {}).value || ($(el.dataset.src) || {}).textContent || ''; (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => toast('Copied')).catch(() => toast('Select and copy the text')); }
  };
  const CHG = {
    lf_set: async (el) => { const l = byId('leads', V.leadId); if (!l) return; const k = el.dataset.k; let v = el.value; if (k === 'bill') v = Number(v.replace(/[^\d.]/g, '')) || null; l[k] = v; try { await saveLead(l, k === 'stage' ? 'Stage → ' + v : null); toast('Saved'); } catch (e) { toast(e.message); } },
    leadsFile: async (el) => { const f = el.files && el.files[0]; if (!f) return; try { await parseLeads(f); render(); } catch (e) { toast(e.message); } }
  };
  const INP = { search: (el) => { V.q = el.value; clearTimeout(INP._t); INP._t = setTimeout(() => { const pos = el.selectionStart; render(); const q = $('#q'); if (q) { q.focus(); q.setSelectionRange(pos, pos); } }, 180); } };

  function bindDrop(d) {
    const input = document.getElementById(d.dataset.drop); if (!input) return;
    d.onclick = () => input.click(); d.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); } };
    d.ondragover = (e) => { e.preventDefault(); d.classList.add('over'); }; d.ondragleave = () => d.classList.remove('over');
    d.ondrop = (e) => { e.preventDefault(); d.classList.remove('over'); if (e.dataTransfer.files[0]) { const dt = new DataTransfer(); dt.items.add(e.dataTransfer.files[0]); input.files = dt.files; input.dispatchEvent(new Event('change', { bubbles: true })); } };
  }

  document.addEventListener('click', (ev) => {
    const el = ev.target.closest('[data-act]');
    const stop = ev.target.closest('[data-stop]'); if (stop && !stop.dataset.act) return; // plain links inside a row (call / map)
    if (!el) return;
    if (el.tagName === 'INPUT' && el.type === 'checkbox' && el.dataset.act !== 'sel') return;
    const f = ACT[el.dataset.act]; if (!f) return;
    if (el.tagName !== 'A') { if (el.tagName !== 'INPUT') ev.preventDefault(); }
    f(el, ev);
  });
  document.addEventListener('change', (ev) => { const el = ev.target.closest('[data-chg]'); if (el && CHG[el.dataset.chg]) CHG[el.dataset.chg](el, ev); });
  document.addEventListener('input', (ev) => { const el = ev.target.closest('[data-inp]'); if (el && INP[el.dataset.inp]) INP[el.dataset.inp](el, ev); });
  document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && $('#layer').innerHTML) closeLayer(); });
  window.addEventListener('hashchange', () => { const [v, id] = location.hash.slice(1).split('/'); if (v === 'lead' && id) { if (V.leadId !== id) openLead(id, true); } else if (v && VIEWS[v] && v !== V.view) { V.view = v; render(); } });

  // expose for the WhatsApp + setup module
  window.SOLP = { S, V, VIEWS, ACT, CHG, INP, h, I, $, fn, api, save, saveCfg, upload, upLocal, lead, byId, importFile, bindDrop, toast, modal, closeLayer, render, topbar, first, normPhone, fmtDT, fmtT, rel, uid, inr, AREAS, TYPES, sizing, refresh, saveLead, logAct, startSync, today0, DAY };

  /* ================= boot ================= */
  try { const t = localStorage.getItem('solaris-theme'); if (t) document.documentElement.dataset.theme = t; } catch (e) { /* */ }
  document.addEventListener('DOMContentLoaded', () => {
    const [v, id] = location.hash.slice(1).split('/');
    if (v === 'lead' && id) { V.leadId = id; V.view = 'leads'; } else if (v) V.view = v;
    if (S.sess && S.sess.access) { render(); startSync(); } else renderLogin();
  });
})();
