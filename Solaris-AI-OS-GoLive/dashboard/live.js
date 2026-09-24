/* Solaris AI OS — LIVE MODE: sync with the Supabase backend, real Sarvam calls, recordings, HOT-lead alerts.
   Works when the dashboard is hosted on its own website (Netlify/Vercel). Inside Claude it stays in demo mode. */
(function () {
  const { S, D, Live, Camp, util: U } = SOL;
  const A = window.APP;
  const KEY = 'solaris-live-conn';
  const TABLES = ['leads', 'calls', 'visits', 'followups', 'tickets', 'activity'];
  const CONFIG = ['settings', 'team', 'agents', 'dnc', 'campaigns'];
  const LOCAL_ONLY = ['viewAs', 'voiceOn', 'simSpeed'];
  const L = { conn: null, status: 'off', err: '', lastPull: {}, hashes: {}, lastOk: 0, busy: false, timer: null, pushT: null, seenHot: new Set(), started: 0, audio: null, needsUpload: false };
  const h = (s) => U.esc(s);
  const toast = (m) => A.toast(m);
  const hash = (o) => { try { return JSON.stringify(o); } catch (e) { return String(Math.random()); } };

  try { L.conn = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { L.conn = null; }
  const saveConn = () => { try { localStorage.setItem(KEY, JSON.stringify(L.conn)); } catch (e) {} };
  const on = () => !!(L.conn && L.conn.access && L.status !== 'off');
  const base = () => (L.conn.url || '').replace(/\/+$/, '');

  /* ---------------- HTTP ---------------- */
  async function refresh() {
    if (!L.conn || !L.conn.refresh) throw new Error('Please log in again');
    const r = await fetch(base() + '/auth/v1/token?grant_type=refresh_token', { method: 'POST', headers: { apikey: L.conn.anon, 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: L.conn.refresh }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.access_token) { L.conn.access = null; saveConn(); L.status = 'off'; throw new Error('Login expired — log in again in Settings'); }
    Object.assign(L.conn, { access: j.access_token, refresh: j.refresh_token || L.conn.refresh, exp: Date.now() + (j.expires_in || 3600) * 1000 }); saveConn();
  }
  async function api(path, opts, retried) {
    if (L.conn.exp && L.conn.exp - Date.now() < 60000) await refresh();
    opts = opts || {};
    const r = await fetch(base() + path, Object.assign({}, opts, { headers: Object.assign({ apikey: L.conn.anon, Authorization: 'Bearer ' + L.conn.access, 'Content-Type': 'application/json' }, opts.headers || {}) }));
    if (r.status === 401 && !retried) { await refresh(); return api(path, opts, true); }
    return r;
  }
  async function login(url, anon, email, password) {
    url = url.trim().replace(/\/+$/, ''); anon = anon.trim();
    let r;
    try { r = await fetch(url + '/auth/v1/token?grant_type=password', { method: 'POST', headers: { apikey: anon, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.trim(), password }) }); }
    catch (e) { throw new Error(location.hostname.endsWith('claude.ai') || location.hostname.includes('claudeusercontent') ? 'Live mode cannot connect from inside Claude. Open the hosted dashboard (Netlify) instead.' : 'Cannot reach ' + url + ' — check the Project URL and your internet.'); }
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.access_token) throw new Error(j.error_description || j.msg || j.error || 'Login failed — check email and password');
    L.conn = { url, anon, email: email.trim(), access: j.access_token, refresh: j.refresh_token, exp: Date.now() + (j.expires_in || 3600) * 1000 };
    saveConn();
  }

  /* ---------------- pull ---------------- */
  function mergeRows(t, rows) {
    const arr = S.state[t] = S.state[t] || []; const idx = new Map(arr.map((x, i) => [x.id, i])); let changed = false;
    const hs = L.hashes[t] = L.hashes[t] || {};
    for (const row of rows) {
      const d = row.data; if (!d || !d.id) continue;
      const i = idx.get(d.id); const local = i != null ? arr[i] : null;
      const localDirty = local && hs[d.id] && hash(local) !== hs[d.id];
      hs[d.id] = hash(d);
      if (localDirty) continue; // our unsaved edit wins; it is pushed next
      if (i != null) { if (hash(local) !== hs[d.id]) { arr[i] = d; changed = true; } }
      else { arr.push(d); idx.set(d.id, arr.length - 1); changed = true; if (t === 'activity' && d.kind === 'hot' && L.started && d.at > L.started - 60000) hotAlert(d); }
      if (row.updated_at > (L.lastPull[t] || '')) L.lastPull[t] = row.updated_at;
    }
    if (t === 'activity' && changed) { arr.sort((a, b) => b.at - a.at); if (arr.length > 1500) arr.length = 1500; }
    if ((t === 'calls' || t === 'leads') && changed) arr.sort((a, b) => (b.at || b.createdAt || 0) - (a.at || a.createdAt || 0));
    return changed;
  }
  async function pullTable(t) {
    let any = false;
    for (let page = 0; page < 20; page++) {
      const since = L.lastPull[t] || '1970-01-01T00:00:00Z';
      const r = await api(`/rest/v1/${t}?select=id,data,updated_at&updated_at=gt.${encodeURIComponent(since)}&order=updated_at.asc&limit=1000`);
      if (!r.ok) throw new Error(t + ': ' + r.status + ' ' + (await r.text()).slice(0, 120));
      const rows = await r.json();
      if (!rows.length) break;
      rows.forEach((row) => { if (row.updated_at > (L.lastPull[t] || '')) L.lastPull[t] = row.updated_at; });
      if (mergeRows(t, rows)) any = true;
      if (rows.length < 1000) break;
    }
    return any;
  }
  async function pullConfig() {
    const since = L.lastPull.config || '1970-01-01T00:00:00Z';
    const r = await api(`/rest/v1/config?select=id,data,updated_at&updated_at=gt.${encodeURIComponent(since)}`);
    if (!r.ok) throw new Error('config: ' + r.status);
    const rows = await r.json(); let any = false; const hs = L.hashes.config = L.hashes.config || {};
    for (const row of rows) {
      if (row.updated_at > (L.lastPull.config || '')) L.lastPull.config = row.updated_at;
      const v = row.data && row.data.value; if (v === undefined) continue;
      if (hs[row.id] && hash(localConfig(row.id)) !== hs[row.id]) { hs[row.id] = hash(v); continue; }
      hs[row.id] = hash(v);
      if (row.id === 'settings') { const keep = {}; LOCAL_ONLY.forEach((k) => { keep[k] = S.state.settings[k]; }); S.state.settings = Object.assign({}, S.state.settings, v, keep); }
      if (row.id === 'team' && Array.isArray(v) && v.length) S.state.team = v;
      if (row.id === 'agents' && Array.isArray(v) && v.length) S.state.agents = v;
      if (row.id === 'dnc' && Array.isArray(v)) S.state.dnc = v;
      if (row.id === 'campaigns' && Array.isArray(v)) S.state.campaigns = v;
      hs[row.id] = hash(localConfig(row.id)); any = true;
    }
    return any;
  }
  function localConfig(id) {
    if (id === 'settings') { const s = Object.assign({}, S.state.settings); LOCAL_ONLY.forEach((k) => delete s[k]); return s; }
    if (id === 'campaigns') return (S.state.campaigns || []).filter((c) => c.live);
    return S.state[id];
  }
  async function pull() {
    if (!on() || L.busy) return;
    L.busy = true;
    try {
      let any = await pullConfig();
      for (const t of TABLES) if (await pullTable(t)) any = true;
      if (any) { updateCampaigns(); L.suppress = true; S.change('sync'); L.suppress = false; }
      L.lastOk = Date.now(); L.err = ''; L.status = 'live';
    } catch (e) { L.err = String(e.message || e); L.status = /log in/i.test(L.err) ? 'off' : 'error'; }
    finally { L.busy = false; paintPill(); }
  }

  /* ---------------- push ---------------- */
  function dirty(t) {
    const hs = L.hashes[t] = L.hashes[t] || {};
    return (S.state[t] || []).filter((r) => r && r.id && hash(r) !== hs[r.id]);
  }
  async function pushRows(t, rows) {
    for (let i = 0; i < rows.length; i += 200) {
      const chunk = rows.slice(i, i + 200);
      const r = await api(`/rest/v1/${t}`, { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(chunk.map((d) => ({ id: d.id, data: d }))) });
      if (r.ok) { chunk.forEach((d) => { L.hashes[t][d.id] = hash(d); }); continue; }
      const msg = (await r.text()).slice(0, 200);
      // retry one by one so one bad row (e.g. duplicate phone) does not block the rest
      for (const d of chunk) {
        const r1 = await api(`/rest/v1/${t}`, { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify([{ id: d.id, data: d }]) });
        L.hashes[t][d.id] = hash(d);
        if (!r1.ok) toast(/phone/.test(msg) ? 'Not saved: ' + (d.name || d.id) + ' — this mobile number already exists in the CRM' : 'Could not save ' + t + ' ' + (d.name || d.id));
      }
    }
  }
  async function push() {
    if (!on() || L.pushing) return;
    L.pushing = true;
    try {
      const cfg = CONFIG.filter((id) => hash(localConfig(id)) !== (L.hashes.config || {})[id]).map((id) => ({ id, data: { value: localConfig(id) } }));
      if (cfg.length) {
        const r = await api('/rest/v1/config', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(cfg) });
        if (r.ok) cfg.forEach((c) => { L.hashes.config[c.id] = hash(c.data.value); });
      }
      for (const t of TABLES) { const rows = dirty(t); if (rows.length) await pushRows(t, rows); }
      L.lastOk = Date.now();
    } catch (e) { L.err = String(e.message || e); L.status = 'error'; }
    finally { L.pushing = false; paintPill(); }
  }
  const schedulePush = () => { clearTimeout(L.pushT); L.pushT = setTimeout(push, 700); };
  S.on((what) => { if (L.suppress || what === 'live' || what === 'sync') return; if (on()) schedulePush(); });

  /* ---------------- connect / disconnect ---------------- */
  function clearLocal() { TABLES.forEach((t) => { S.state[t] = []; }); S.state.campaigns = []; S.state.imports = S.state.imports || []; }
  async function connect(url, anon, email, password) {
    await login(url, anon, email, password);
    L.status = 'live'; L.hashes = {}; L.lastPull = {};
    const r = await api('/rest/v1/leads?select=id&limit=1');
    const serverHas = r.ok && (await r.json()).length > 0;
    Live.stopAll && Live.stopAll();
    const hadReal = S.state.settings.realMode && S.state.leads.length > 0;
    if (serverHas || !hadReal) clearLocal();
    L.needsUpload = !serverHas && hadReal;
    S.state.settings.realMode = true;
    L.started = Date.now();
    await pull();
    if (!serverHas && hadReal) { TABLES.forEach((t) => { (S.state[t] || []).forEach((d) => { (L.hashes[t] = L.hashes[t] || {})[d.id] = hash(d); }); }); }
    loop();
  }
  async function uploadLocal() {
    TABLES.forEach((t) => { L.hashes[t] = {}; }); L.hashes.config = {};
    L.needsUpload = false; await push(); toast('Workspace uploaded to the live database');
  }
  function disconnect() {
    clearInterval(L.timer); L.conn = null; saveConn(); L.status = 'off'; L.hashes = {}; L.lastPull = {};
    paintPill(); toast('Disconnected. The dashboard is back in demo mode.'); A.render();
  }
  function loop() {
    clearInterval(L.timer);
    L.timer = setInterval(() => { if (document.hidden && Date.now() - L.lastOk < 15000) return; pull(); }, 4000);
  }

  /* ---------------- real calls ---------------- */
  async function fn(name, body) {
    const r = await api('/functions/v1/' + name, { method: 'POST', body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.ok === false) throw new Error(j.error || ('Server error ' + r.status));
    return j;
  }
  async function callNow(leadId) {
    const l = S.lead(leadId);
    try { await fn('start-call', { lead_id: leadId }); toast('Calling ' + (l ? l.name : '') + ' now — Asha is dialling'); setTimeout(pull, 1500); }
    catch (e) { toast('Call not placed: ' + e.message); }
  }
  async function queue(ids, name) {
    try { const j = await fn('start-call', { lead_ids: ids, campaign: name }); toast(`${j.queued} leads queued · ${j.started_now} calling now. The rest are called automatically inside calling hours.`); setTimeout(pull, 1500); }
    catch (e) { toast('Campaign not started: ' + e.message); }
  }
  function updateCampaigns() {
    (S.state.campaigns || []).filter((c) => c.live).forEach((c) => {
      c.done = []; c.results = {};
      c.leadIds.forEach((id) => {
        const last = (S.state.calls || []).filter((x) => x.leadId === id && x.at >= c.createdAt - 1000).sort((a, b) => b.at - a.at)[0];
        const fu = (S.state.followups || []).find((f) => f.leadId === id && /Campaign:/.test(f.note || '') && f.status === 'cancelled');
        if (last && last.outcome !== 'Dialling') { c.done.push(id); c.results[id] = last.outcome; }
        else if (fu) { c.done.push(id); c.results[id] = 'Skipped'; }
      });
      if (c.done.length >= c.leadIds.length) c.status = 'Completed';
    });
  }

  /* ---------------- alerts ---------------- */
  function beep() { try { const ctx = new (window.AudioContext || window.webkitAudioContext)(); const o = ctx.createOscillator(); const g = ctx.createGain(); o.frequency.value = 880; g.gain.value = 0.08; o.connect(g); g.connect(ctx.destination); o.start(); setTimeout(() => { o.frequency.value = 1320; }, 150); setTimeout(() => { o.stop(); ctx.close(); }, 320); } catch (e) {} }
  function hotAlert(a) {
    if (L.seenHot.has(a.id)) return; L.seenHot.add(a.id);
    const l = S.lead(a.leadId); const who = l ? l.name + (l.area ? ' · ' + l.area : '') : 'a lead';
    toast('HOT lead: ' + who + ' — call within 30 minutes'); beep();
    try { if ('Notification' in window && Notification.permission === 'granted') new Notification('HOT lead — Solaris', { body: who }); } catch (e) {}
  }

  /* ---------------- UI patches ---------------- */
  function paintPill() {
    const top = document.getElementById('top'); if (!top) return;
    let el = document.getElementById('livePill');
    if (!el) { el = document.createElement('button'); el.id = 'livePill'; el.className = 'pill'; el.style.cursor = 'pointer'; el.dataset.act = 'go'; el.dataset.v = 'settings'; top.insertBefore(el, top.children[1] || null); }
    const ago = L.lastOk ? Math.round((Date.now() - L.lastOk) / 1000) : null;
    if (L.status === 'live') { el.className = 'pill good'; el.innerHTML = '<span class="dot live" style="background:var(--good)"></span> LIVE · synced ' + (ago != null ? ago + 's ago' : ''); el.title = 'Connected to the Solaris live database'; }
    else if (L.status === 'error') { el.className = 'pill bad'; el.textContent = 'LIVE · connection problem'; el.title = L.err; }
    else { el.className = 'pill line'; el.textContent = 'Demo mode'; el.title = 'Not connected to real calls. Connect in Settings.'; }
  }
  setInterval(paintPill, 5000);
  const _renderTop = A.renderTop; A.renderTop = function () { _renderTop(); paintPill(); if (on()) { const b = document.querySelector('#top [data-act="simInbound"]'); if (b) b.hidden = true; } };

  // calls: real in live mode
  const _start = Live.start;
  Live.start = function (leadId, opts) { if (!on()) return _start.call(Live, leadId, opts); callNow(leadId); return { id: 'remote', leadId, agentId: 'ag_one' }; };
  const _create = Camp.create;
  Camp.create = function (name, agentId, leadIds, opts) {
    if (!on()) return _create.call(Camp, name, agentId, leadIds, opts);
    const c = { id: U.uid('cp'), name, agentId, leadIds: leadIds.slice(), queue: [], done: [], status: 'Running', createdAt: Date.now(), results: {}, live: true };
    S.state.campaigns.unshift(c); S.change('campaigns'); queue(leadIds, name); return c;
  };
  const _sim = A.simInbound; A.simInbound = function (o) { if (on()) { toast('The call simulator is off in live mode — real calls come from Sarvam.'); return null; } return _sim(o); };

  // live calls view: show real dialling calls
  const _live = A.views.live;
  A.views.live = function () {
    const base = _live();
    if (!on()) return base;
    const now = Date.now();
    const dialling = (S.state.calls || []).filter((c) => c.outcome === 'Dialling' && now - c.at < 30 * 60000);
    const done = (S.state.calls || []).filter((c) => c.outcome !== 'Dialling' && now - c.at < 60 * 60000).length;
    const cards = `<div class="notice info"><b>Live mode.</b> Calls are real Sarvam calls. The transcript, recording and CRM update arrive the moment each call ends (${done} in the last hour).</div>
      <div class="card"><div class="hd"><span class="dot ${dialling.length ? 'live' : ''}"></span><h2>Calling now</h2><span class="small muted">${dialling.length} in progress</span></div><div class="bd stack">${dialling.map((c) => { const l = S.lead(c.leadId) || {}; return `<div class="row nw"><div class="wave on">${'<i></i>'.repeat(7)}</div><b class="sp" data-act="openLead" data-id="${h(c.leadId)}" style="cursor:pointer">${h(l.name || '')}</b><span class="small muted">${h(l.area || '')}</span><span class="mono small">${U.rel(c.at)}</span></div>`; }).join('') || '<span class="muted">No calls in progress.</span>'}</div></div>`;
    const cleaned = base.replace(/<button class="btn sun" data-act="simInbound">[\s\S]*?<\/button>/g, '').replace(/<div class="card"><div class="bd"><div class="empty"><h2 style="margin-bottom:6px">No live calls<\/h2>[\s\S]*?<\/div><\/div><\/div>/, '');
    const i = cleaned.indexOf('<div class="card"><div class="hd"><h2>Recently completed');
    return i > 0 ? cleaned.slice(0, i) + cards + cleaned.slice(i) : cards + cleaned;
  };

  // recordings: real audio in live mode
  const _play = A.playCall;
  A.playCall = async function (callId) {
    const c = (S.state.calls || []).find((x) => x.id === callId);
    if (!on() || !c || !c.interactionId) return _play(callId);
    try {
      if (L.audio) { L.audio.pause(); L.audio = null; }
      toast('Loading recording…');
      const r = await api('/functions/v1/recording?interaction_id=' + encodeURIComponent(c.interactionId), { method: 'GET' });
      let src;
      if ((r.headers.get('content-type') || '').includes('audio')) src = URL.createObjectURL(await r.blob());
      else { const j = await r.json().catch(() => ({})); if (!r.ok || !j.url) throw new Error(j.error || 'No recording yet'); src = j.url; }
      L.audio = new Audio(src); A.playing = { callId, i: -1, token: {} }; A.render();
      L.audio.onended = () => { A.playing = null; A.render(); };
      await L.audio.play();
    } catch (e) { toast('Recording: ' + e.message); A.playing = null; A.render(); }
  };
  const _stop = A.acts.stopPlay; A.acts.stopPlay = function () { if (L.audio) { L.audio.pause(); L.audio = null; } _stop(); };

  // settings: live connection card
  const _settings = A.views.settings;
  A.views.settings = function () { return liveCard() + _settings(); };
  function liveCard() {
    const s = S.state.settings; const c = L.conn || {};
    const connected = on();
    return `<div class="card" id="liveCard"><div class="hd"><h2>Live connection (real Sarvam calls)</h2>${connected ? '<span class="pill good">Connected</span>' : '<span class="pill line">Demo mode</span>'}</div><div class="bd stack">
      ${connected ? `<div class="small">Logged in as <b>${h(c.email || '')}</b> · ${h(c.url || '')}. ${L.status === 'error' ? '<span style="color:var(--bad)">Problem: ' + h(L.err) + '</span>' : 'Synced ' + (L.lastOk ? U.rel(L.lastOk) : '—') + '.'}</div>
        ${L.needsUpload ? `<div class="notice">The live database is empty but this browser has ${S.state.leads.length} Solaris leads. <button class="btn sm pri" data-act="liveUpload">Upload them to the live database</button></div>` : ''}
        <div class="fgrid"><label class="f">AI calls allowed per day<input class="i" type="number" id="lv_cap" data-chg="stF" data-k="dailyCap" data-num="1" value="${h(s.dailyCap || 300)}"></label>
          <label class="f">Attempts if no answer<input class="i" type="number" id="lv_att" data-chg="stF" data-k="maxAttempts" data-num="1" value="${h(s.maxAttempts || 3)}"></label>
          <label class="f">Hours between attempts<input class="i" type="number" id="lv_gap" data-chg="stF" data-k="retryGapHours" data-num="1" value="${h(s.retryGapHours || 4)}"></label>
          <label class="f">Don't re-call within (hours)<input class="i" type="number" id="lv_guard" data-chg="stF" data-k="recallGuardHours" data-num="1" value="${h(s.recallGuardHours || 2)}"></label></div>
        <p class="xs muted" style="margin:0">The server enforces these, plus the calling window (${h(s.callingStart)}–${h(s.callingEnd)} for automatic calls, 09:00–21:00 for "AI call now"), the DNC list and consent.</p>
        <div class="row"><button class="btn sm" data-act="liveNotify">Allow HOT-lead pop-ups</button><button class="btn sm" data-act="livePull">Sync now</button><button class="btn sm ghost danger" data-act="liveOff">Disconnect</button></div>`
      : `<div class="small">Connect to Solaris' live database to see real calls from the Sarvam agent. Setup takes about an hour once; see README → Step 3. ${/claude/.test(location.hostname) ? '<b>This copy runs inside Claude and cannot connect. Use the hosted dashboard link.</b>' : ''}</div>
        <div class="fgrid"><label class="f">Supabase Project URL<input class="i" id="lv_url" value="${h(c.url || '')}" placeholder="https://xxxx.supabase.co"></label>
          <label class="f">Anon public key<input class="i mono" id="lv_anon" value="${h(c.anon || '')}" placeholder="eyJhbGciOi…"></label>
          <label class="f">Staff email<input class="i" id="lv_email" value="${h(c.email || '')}" placeholder="owner@solaris.in" autocomplete="username"></label>
          <label class="f">Password<input class="i" type="password" id="lv_pw" autocomplete="current-password" data-enter="liveConnect"></label></div>
        <div class="row"><button class="btn pri" data-act="liveConnect">Connect &amp; log in</button>${L.err ? `<span class="small" style="color:var(--bad)">${h(L.err)}</span>` : ''}</div>`}
      </div></div>`;
  }
  Object.assign(A.acts, {
    liveConnect: async (el) => {
      const v = (id) => (document.getElementById(id) || {}).value || '';
      if (!/^https?:\/\//.test(v('lv_url')) || !v('lv_anon') || !v('lv_email') || !v('lv_pw')) return toast('Fill the Project URL, anon key, email and password');
      if (el) el.disabled = true; toast('Connecting…');
      try { await connect(v('lv_url'), v('lv_anon'), v('lv_email'), v('lv_pw')); toast('Connected — live data loaded'); A.renderTop(); A.go('overview'); }
      catch (e) { L.err = String(e.message || e); L.status = 'off'; toast(L.err); A.render(); }
    },
    liveOff: () => disconnect(),
    livePull: () => { pull(); toast('Syncing…'); },
    liveUpload: () => uploadLocal(),
    liveNotify: async () => { try { const p = await Notification.requestPermission(); toast(p === 'granted' ? 'HOT-lead pop-ups on' : 'Pop-ups blocked by the browser'); } catch (e) { toast('This browser cannot show pop-ups here'); } }
  });

  SOL.LiveSync = { on, pull, push, callNow, queue, state: L };

  /* ---------------- start ---------------- */
  if (L.conn && L.conn.access) {
    L.status = 'live'; L.started = Date.now();
    TABLES.forEach((t) => { L.hashes[t] = {}; });
    // resume: server is the source of truth after a reload
    clearLocal(); L.lastPull = {}; L.hashes = {};
    pull().then(loop);
  }
  A.renderTop(); A.render();
})();
