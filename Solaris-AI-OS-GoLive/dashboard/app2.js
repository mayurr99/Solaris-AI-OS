/* Solaris AI OS — Follow-ups, Site visits, Voice agents studio + test call */
(function () {
  const { S, D, Live, Camp, AI, Rules, Voice, util: U, sizing, scoreLead, tempOf, routeOwner, person, agentById, genderize } = SOL;
  const A = window.APP; const { h, I, opts, outcomePill, tempPill, langTag, leadName, nameOf, toast } = A;
  const render = () => A.render();
  const isToday = (t) => t >= U.startOfDay(Date.now()) && t < U.startOfDay(Date.now()) + U.DAY;
  const ownerOptions = (val) => opts(S.state.agents.map((a) => ({ v: a.id, t: a.name + ' (AI agent)' })).concat(S.state.team.filter((t) => t.active).map((t) => ({ v: t.id, t: t.name + ' · ' + t.role }))), val);
  const FU_ICON = { 'AI call': 'bot', WhatsApp: 'wa', 'Sales call': 'phone', 'Visit reminder': 'cal', Email: 'note' };

  /* ================= FOLLOW-UPS ================= */
  A.fu = { tab: 'overdue', type: 'All', owner: '' };
  A.views.followups = function () {
    const st = S.state, now = Date.now(), f = A.fu;
    const all = st.followups.filter((x) => S.lead(x.leadId) && A.mine(x.leadId));
    const buckets = {
      overdue: all.filter((x) => SOL.isOverdue(x, now)),
      today: all.filter((x) => x.status === 'pending' && !SOL.isOverdue(x, now) && isToday(Math.max(x.dueAt, now))),
      upcoming: all.filter((x) => x.status === 'pending' && !SOL.isOverdue(x, now) && !isToday(Math.max(x.dueAt, now))),
      done: all.filter((x) => x.status !== 'pending')
    };
    let rows = buckets[f.tab].filter((x) => (f.type === 'All' || x.type === f.type) && (!f.owner || x.owner === f.owner));
    rows.sort((a, b) => f.tab === 'done' ? b.dueAt - a.dueAt : a.dueAt - b.dueAt);
    const dueAi = buckets.overdue.concat(buckets.today).filter((x) => x.type === 'AI call' && x.dueAt <= now + 2 * U.HOUR);
    const cad = st.settings.cadence;
    return `<div class="phead"><div class="grow"><h1>Follow-ups</h1><p>AI agents run most follow-ups on their own; salespeople see only what needs a human. Nothing slips through a WhatsApp chat or a notebook.</p></div>
      ${dueAi.length ? `<button class="btn sun" data-act="runDueAi">${I('bot')}Run ${dueAi.length} due AI call${dueAi.length > 1 ? 's' : ''} now</button>` : ''}<button class="btn pri" data-act="addFollowup">${I('plus')}Add follow-up</button></div>
      <div class="grid g-main"><div class="card"><div class="tabs" style="padding:0 10px">${[['overdue', 'Overdue'], ['today', 'Due today'], ['upcoming', 'Upcoming'], ['done', 'Done & missed']].map(([k, t]) => `<button class="tab ${f.tab === k ? 'on' : ''}" data-act="fuTab" data-t="${k}">${t} <span class="mono xs">${buckets[k].length}</span></button>`).join('')}</div>
        <div class="row" style="padding:10px 14px">${['All', 'AI call', 'WhatsApp', 'Sales call', 'Visit reminder'].map((t) => `<button class="chip ${f.type === t ? 'on' : ''}" data-act="fuType" data-t="${t}">${t}</button>`).join('')}<span class="sp"></span><select class="i" style="width:auto" data-chg="fuOwner" aria-label="Owner"><option value="">Everyone</option>${ownerOptions(f.owner)}</select></div>
        <div class="tbl-wrap"><table class="t"><thead><tr><th>Due</th><th>Type</th><th>Lead</th><th>What</th><th>Owner</th><th></th></tr></thead><tbody>
        ${rows.slice(0, 200).map((x) => { const l = S.lead(x.leadId); const od = x.status === 'pending' && x.dueAt < now; return `<tr><td class="small"><span class="mono" style="color:${od ? 'var(--bad)' : 'inherit'}">${U.fmtDT(x.dueAt)}</span><div class="xs muted">${U.rel(x.dueAt)}</div></td><td><span class="row nw small">${I(FU_ICON[x.type] || 'clock')}${h(x.type)}</span></td><td><b data-act="openLead" data-id="${l.id}" style="cursor:pointer">${h(l.name)}</b> ${tempPill(l)}<div class="xs muted">${h(l.area || '')}</div></td><td class="small">${h(x.note || '')}${x.auto ? ' <span class="pill line">auto</span>' : ''}</td><td class="small">${h(nameOf(x.owner))}</td>
          <td><div class="row nw">${x.status === 'pending' ? `<button class="btn sm ${x.type === 'AI call' ? 'pri' : ''}" data-act="fuRun" data-id="${x.id}">${x.type === 'AI call' ? 'Call now' : x.type === 'WhatsApp' ? 'Send' : x.type === 'Visit reminder' ? 'Send reminder' : 'Open'}</button><button class="btn sm ghost" data-act="fuDone" data-id="${x.id}" title="Mark done">${I('check')}</button><button class="btn sm ghost" data-act="fuSnooze" data-id="${x.id}" title="Snooze 1 day">+1d</button>` : `<span class="pill ${x.status === 'done' ? 'good' : x.status === 'missed' ? 'bad' : 'mute'}">${h(x.status)}</span>`}</div></td></tr>`; }).join('') || '<tr><td colspan="6" class="empty">Nothing here.</td></tr>'}
        </tbody></table></div></div>
        <div class="stack" style="gap:16px"><div class="card"><div class="hd"><h2>Automatic follow-up rules</h2></div><div class="bd stack">${cad.map((c) => `<div class="row nw" style="align-items:flex-start;padding:6px 0;border-bottom:1px solid var(--line2)"><label class="switch" title="Turn rule on or off"><input type="checkbox" id="cad_${c.id}" data-chg="cadToggle" data-id="${c.id}" ${c.on ? 'checked' : ''}><span></span></label><div class="sp"><b class="small">${h(c.trigger)}</b><div class="small muted">${h(c.action)}</div></div></div>`).join('')}</div></div>
          <div class="card"><div class="hd"><h2>Why this matters</h2></div><div class="bd small stack"><div>Solar buyers compare 3–4 installers. The first one to call back and the one who follows up best usually wins.</div><div>Every rule above respects the DNC list and the calling window (${h(st.settings.callingStart)}–${h(st.settings.callingEnd)}).</div></div></div></div></div>`;
  };
  Object.assign(A.acts, {
    fuTab: (el) => { A.fu.tab = el.dataset.t; render(); },
    fuType: (el) => { A.fu.type = el.dataset.t; render(); },
    fuOwner: (el) => { A.fu.owner = el.value; render(); },
    cadToggle: (el) => { const c = S.state.settings.cadence.find((x) => x.id === el.dataset.id); c.on = el.checked; S.save(); toast((c.on ? 'Enabled: ' : 'Paused: ') + c.trigger); },
    fuDone: (el) => { const x = S.state.followups.find((f) => f.id === el.dataset.id); x.status = 'done'; x.doneAt = Date.now(); S.log(x.leadId, 'crm', 'Follow-up done: ' + x.type); S.change('fu'); },
    fuSnooze: (el) => { const x = S.state.followups.find((f) => f.id === el.dataset.id); x.dueAt = Math.max(x.dueAt, Date.now()) + U.DAY; S.log(x.leadId, 'crm', 'Follow-up snoozed to ' + U.fmtDT(x.dueAt)); S.change('fu'); },
    fuRun: (el) => {
      const x = S.state.followups.find((f) => f.id === el.dataset.id); const l = S.lead(x.leadId);
      if (x.type === 'AI call') { const lc = Live.start(l.id, { agentId: x.owner && x.owner.startsWith('ag_') ? x.owner : null, speak: S.state.settings.voiceOn }); if (lc) { x.status = 'done'; x.doneAt = Date.now(); A.go('live'); } else toast('Blocked — number is on the DNC list'); return; }
      if (x.type === 'WhatsApp') { S.log(l.id, 'wa', 'WhatsApp sent: ' + (x.note || 'follow-up')); x.status = 'done'; x.doneAt = Date.now(); S.change('fu'); toast('WhatsApp logged for ' + l.name); return; }
      if (x.type === 'Visit reminder') { const v = S.state.visits.filter((vv) => vv.leadId === l.id && vv.at > Date.now() - U.HOUR).sort((a, b) => a.at - b.at)[0]; if (v) { v.reminders = { wa24: true, aiConfirm: true, wa2: true }; v.status = 'Confirmed'; } S.log(l.id, 'wa', 'Visit reminder sent + AI confirmation call: customer confirmed'); x.status = 'done'; x.doneAt = Date.now(); S.change('fu'); toast('Reminder sent · visit confirmed'); return; }
      A.openLead(l.id, 'tasks');
    },
    runDueAi: () => { const now = Date.now(); const due = S.state.followups.filter((x) => x.status === 'pending' && x.type === 'AI call' && x.dueAt <= now + 2 * U.HOUR && S.lead(x.leadId)); const ids = Array.from(new Set(due.map((x) => x.leadId))); due.forEach((x) => { x.status = 'done'; x.doneAt = now; }); Camp.create('Due follow-ups · ' + U.fmtDT(now), 'auto', ids, { speed: 3 }); A.go('live'); toast('Calling ' + ids.length + ' leads, ' + S.state.settings.maxConcurrent + ' at a time'); },
    addFollowup: (el) => { A.fd = { leadId: el.dataset.id || '', type: 'AI call', date: new Date(Date.now() + U.DAY).toISOString().slice(0, 10), time: '11:00', owner: SOL.roleAgent('outbound'), note: '' }; A.showModal(fuModal); }
  });
  function fuModal() {
    const d = A.fd; const leads = S.state.leads.filter((l) => !l.dnc).sort((a, b) => a.name.localeCompare(b.name));
    return `<div class="mhd"><h2 class="sp">Add follow-up</h2><button class="btn ghost sm" data-act="closeModal" aria-label="Close">${I('x')}</button></div><div class="mbd"><div class="fgrid">
      <label class="f" style="grid-column:1/-1">Lead<select class="i" id="fd_lead" data-chg="fdSet" data-k="leadId">${opts(leads.map((l) => ({ v: l.id, t: l.name + ' · ' + (l.area || '') })), d.leadId, 'Choose lead')}</select></label>
      <label class="f">Type<select class="i" id="fd_type" data-chg="fdSet" data-k="type">${opts(['AI call', 'WhatsApp', 'Sales call', 'Visit reminder'], d.type)}</select></label>
      <label class="f">Who<select class="i" id="fd_owner" data-chg="fdSet" data-k="owner">${ownerOptions(d.owner)}</select></label>
      <label class="f">Date<input class="i" type="date" id="fd_date" data-chg="fdSet" data-k="date" value="${h(d.date)}"></label>
      <label class="f">Time<input class="i" type="time" id="fd_time" data-chg="fdSet" data-k="time" value="${h(d.time)}"></label>
      <label class="f" style="grid-column:1/-1">Note<input class="i" id="fd_note" data-chg="fdSet" data-k="note" value="${h(d.note)}" placeholder="e.g. Customer asked to call after salary date"></label></div></div>
      <div class="mft"><button class="btn" data-act="closeModal">Cancel</button><button class="btn pri" data-act="fdSave">Save</button></div>`;
  }
  A.acts.fdSet = (el) => { A.fd[el.dataset.k] = el.value; };
  A.acts.fdSave = () => {
    ['leadId', 'type', 'owner', 'date', 'time', 'note'].forEach((k) => { const el = document.getElementById('fd_' + (k === 'leadId' ? 'lead' : k)); if (el) A.fd[k] = el.value; });
    const d = A.fd; if (!d.leadId) return toast('Choose a lead');
    const at = new Date(d.date + 'T' + (d.time || '11:00')).getTime();
    S.state.followups.push({ id: U.uid('fu'), leadId: d.leadId, type: d.type, dueAt: at, owner: d.owner, status: 'pending', note: d.note, auto: false });
    S.log(d.leadId, 'crm', 'Follow-up scheduled: ' + d.type + ' · ' + U.fmtDT(at)); A.modal = null; S.change('fu'); toast('Follow-up saved');
  };

  /* ================= SITE VISITS ================= */
  A.vw = { offset: 0, who: '' };
  const weekStart = (off) => { const d = new Date(); d.setHours(0, 0, 0, 0); const dow = (d.getDay() + 6) % 7; return d.getTime() - dow * U.DAY + off * 7 * U.DAY; };
  A.views.visits = function () {
    const st = S.state, ws = weekStart(A.vw.offset), we = ws + 7 * U.DAY, now = Date.now();
    const va = A.viewAs(); const vs = st.visits.filter((v) => v.at >= ws && v.at < we && v.status !== 'Cancelled' && v.status !== 'Rescheduled' && (!A.vw.who || v.with === A.vw.who) && S.lead(v.leadId) && (va === 'owner' || A.mine(v.leadId) || v.with === va));
    const H0 = 9, H1 = 21, PX = 48;
    const wk = st.visits.filter((v) => v.at >= ws && v.at < we);
    const past = st.visits.filter((v) => v.at < now && v.at > now - 30 * U.DAY && ['Completed', 'No-show'].includes(v.status));
    const noshow = past.length ? Math.round(past.filter((v) => v.status === 'No-show').length / past.length * 100) : 0;
    const upcoming = st.visits.filter((v) => v.at >= now - U.HOUR && ['Scheduled', 'Confirmed'].includes(v.status) && S.lead(v.leadId)).sort((a, b) => a.at - b.at);
    let cal = `<div></div>`;
    for (let d = 0; d < 7; d++) { const t = ws + d * U.DAY; cal += `<div class="dh ${t === U.startOfDay(now) ? 'today' : ''}">${new Date(t).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' })}</div>`; }
    let hrs = ''; for (let hh = H0; hh < H1; hh++) hrs += `<div class="hh">${hh > 12 ? hh - 12 : hh}${hh >= 12 ? 'pm' : 'am'}</div>`;
    cal += `<div>${hrs}</div>`;
    for (let d = 0; d < 7; d++) {
      const t0 = ws + d * U.DAY;
      const dayV = vs.filter((v) => v.at >= t0 && v.at < t0 + U.DAY).sort((a, b) => a.at - b.at); const laneEnd = []; const lane = new Map();
      dayV.forEach((v) => { const end = v.at + Math.max(v.mins, 40) * U.MIN; let k = laneEnd.findIndex((e) => e <= v.at); if (k < 0) { k = laneEnd.length; laneEnd.push(end); } else laneEnd[k] = end; lane.set(v.id, k); });
      const overl = (a, b) => a.at < b.at + Math.max(b.mins, 40) * U.MIN && b.at < a.at + Math.max(a.mins, 40) * U.MIN;
      const evs = dayV.map((v) => { const dt = new Date(v.at); const top = (dt.getHours() + dt.getMinutes() / 60 - H0) * PX; const ht = Math.max(30, v.mins / 60 * PX - 2); const l = S.lead(v.leadId); const n = Math.max(...dayV.filter((o) => overl(o, v)).map((o) => lane.get(o.id))) + 1; const k = lane.get(v.id); return `<div class="ev ${v.kind.split(' ')[0]} ${v.status}" style="top:${top}px;height:${ht}px;left:calc(${k / n * 100}% + 2px);width:calc(${100 / n}% - 4px);right:auto" data-act="openVisit" data-id="${v.id}" title="${h(v.kind + ' · ' + l.name)}"><b>${U.fmtTime(v.at)}</b> ${h(l.name)}<div class="muted">${h(v.kind)} · ${h(nameOf(v.with).split(' ')[0])}</div></div>`; }).join('');
      let slots = ''; for (let hh = H0; hh < H1; hh++) slots += '<div class="slot"></div>';
      cal += `<div class="dc">${slots}${evs}${t0 === U.startOfDay(now) ? (() => { const n = new Date(); const top = (n.getHours() + n.getMinutes() / 60 - H0) * PX; return top > 0 && top < (H1 - H0) * PX ? `<div style="position:absolute;left:0;right:0;top:${top}px;border-top:2px solid var(--hot)"></div>` : ''; })() : ''}</div>`;
    }
    const people = st.team.filter((t) => ['Surveyor', 'Sales'].includes(t.role));
    return `<div class="phead"><div class="grow"><h1>Site visits &amp; meetings</h1><p>Surveys, society committee meetings and factory visits booked by the AI or the team. Reminders go out automatically so fewer customers forget.</p></div><button class="btn pri" data-act="bookVisit">${I('plus')}Book visit</button></div>
      <div class="grid g4"><div class="card kpi"><span class="eyebrow">This week</span><span class="v">${wk.filter((v) => v.status !== 'Cancelled').length}</span><span class="d">visits &amp; meetings</span></div><div class="card kpi"><span class="eyebrow">Completed</span><span class="v">${wk.filter((v) => v.status === 'Completed').length}</span><span class="d">this week</span></div><div class="card kpi"><span class="eyebrow">No-show rate</span><span class="v">${noshow}%</span><span class="d">last 30 days · AI rebooks no-shows</span></div><div class="card kpi"><span class="eyebrow">Upcoming confirmed</span><span class="v">${upcoming.filter((v) => v.status === 'Confirmed').length}/${upcoming.length}</span><span class="d">AI confirmation call T-3 h</span></div></div>
      <div class="card"><div class="hd"><button class="btn sm" data-act="wk" data-d="-1" aria-label="Previous week">‹</button><button class="btn sm" data-act="wk" data-d="0">This week</button><button class="btn sm" data-act="wk" data-d="1" aria-label="Next week">›</button><h2>${new Date(ws).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – ${new Date(we - 1).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</h2>
        <select class="i" style="width:auto" data-chg="vwWho" aria-label="Person">${opts(people.map((p) => ({ v: p.id, t: p.name + ' · ' + p.role })), A.vw.who, 'Everyone')}</select>
        <span class="row small muted"><span class="dot" style="background:var(--accent)"></span>survey <span class="dot" style="background:var(--nurture)"></span>society <span class="dot" style="background:var(--hot)"></span>factory</span></div>
        <div class="tbl-wrap" style="max-height:620px;overflow:auto"><div class="cal">${cal}</div></div></div>
      <div class="card"><div class="hd"><h2>Upcoming</h2></div><div class="tbl-wrap"><table class="t"><thead><tr><th>When</th><th>Lead</th><th>Type</th><th>With</th><th>Reminders</th><th>Status</th></tr></thead><tbody>${upcoming.slice(0, 20).map((v) => { const l = S.lead(v.leadId); const r = v.reminders || {}; return `<tr class="click" data-act="openVisit" data-id="${v.id}"><td class="mono small">${U.fmtDT(v.at)}</td><td><b>${h(l.name)}</b><div class="xs muted">${h(v.address || '')}</div></td><td>${h(v.kind)}</td><td class="small">${h(nameOf(v.with))}</td><td class="xs"><span class="pill ${r.wa24 ? 'good' : 'line'}">WA T-24h</span> <span class="pill ${r.aiConfirm ? 'good' : 'line'}">AI call T-3h</span> <span class="pill ${r.wa2 ? 'good' : 'line'}">WA T-2h</span></td><td><span class="pill ${v.status === 'Confirmed' ? 'good' : 'info'}">${h(v.status)}</span></td></tr>`; }).join('') || '<tr><td colspan="6" class="empty">No upcoming visits.</td></tr>'}</tbody></table></div></div>`;
  };
  Object.assign(A.acts, {
    wk: (el) => { const d = Number(el.dataset.d); A.vw.offset = d === 0 ? 0 : A.vw.offset + d; render(); },
    vwWho: (el) => { A.vw.who = el.value; render(); },
    bookVisit: (el) => {
      const l = el.dataset.id ? S.lead(el.dataset.id) : null; const t = new Date(Date.now() + U.DAY);
      A.vd = { leadId: l ? l.id : '', kind: l && l.type === 'Society' ? 'Society meeting' : l && ['Factory', 'Shop', 'Institution'].includes(l.type) ? 'Factory meeting' : 'Site survey', date: t.toISOString().slice(0, 10), time: '11:00', mins: 45, with: l ? (l.type === 'Home' ? SOL.surveyorFor(l.area) : l.owner) : 'u_ganesh', address: l ? (l.area || '') + ', Nashik' : '', notes: '', wa: true, force: false, rescheduleOf: el.dataset.re || null };
      A.showModal(visitModal);
    },
    vdSet: (el) => { A.vd[el.dataset.k] = el.type === 'checkbox' ? el.checked : el.value; if (el.dataset.k === 'leadId') { const l = S.lead(el.value); if (l) { A.vd.address = (l.area || '') + ', Nashik'; A.vd.with = l.type === 'Home' ? SOL.surveyorFor(l.area) : l.owner; } } A.vd.force = false; render(); },
    vdSave: () => {
      const d = A.vd; if (!d.leadId) return toast('Choose a lead');
      const at = new Date(d.date + 'T' + d.time).getTime(); const end = at + Number(d.mins) * U.MIN;
      const clash = S.state.visits.find((v) => v.with === d.with && ['Scheduled', 'Confirmed'].includes(v.status) && v.at < end && v.at + v.mins * U.MIN > at && v.id !== d.rescheduleOf);
      if (clash && !d.force) { d.force = true; d.clash = nameOf(d.with) + ' already has ' + clash.kind.toLowerCase() + ' with ' + leadName(clash.leadId) + ' at ' + U.fmtTime(clash.at) + '. Save again to double-book.'; render(); return; }
      if (d.rescheduleOf) { const o = S.state.visits.find((v) => v.id === d.rescheduleOf); if (o) o.status = 'Rescheduled'; }
      const v = { id: U.uid('vs'), leadId: d.leadId, kind: d.kind, at, mins: Number(d.mins), with: d.with, address: d.address, status: 'Scheduled', notes: d.notes, reminders: { wa24: false, aiConfirm: false, wa2: false } };
      S.state.visits.push(v);
      const l = S.lead(d.leadId); l.visitBooked = true; if (D.STAGES.indexOf(l.stage) < D.STAGES.indexOf('Site Survey')) l.stage = 'Site Survey'; l.score = scoreLead(l); l.temp = tempOf(l.score, l);
      S.log(l.id, 'visit', d.kind + (d.rescheduleOf ? ' rescheduled to ' : ' booked for ') + U.fmtDT(at) + ' with ' + nameOf(d.with));
      if (d.wa) { S.log(l.id, 'wa', 'WhatsApp sent: Site visit confirmation'); S.state.followups.push({ id: U.uid('fu'), leadId: l.id, type: 'Visit reminder', dueAt: at - 3 * U.HOUR, owner: SOL.roleAgent('reminder'), status: 'pending', note: 'AI confirmation call T-3h + WhatsApp T-2h', auto: true }); }
      A.modal = null; S.change('visit'); toast(d.kind + ' booked · ' + U.fmtDT(at));
    },
    openVisit: (el) => { A.vOpen = el.dataset.id; A.showModal(visitDetail); },
    vStatus: (el) => {
      const v = S.state.visits.find((x) => x.id === el.dataset.id); const s = el.dataset.s; const l = S.lead(v.leadId); v.status = s;
      const note = document.getElementById('vNotes'); if (note) v.notes = note.value;
      S.log(l.id, 'visit', v.kind + ' marked ' + s);
      if (s === 'Completed') { S.state.followups.push({ id: U.uid('fu'), leadId: l.id, type: 'Sales call', dueAt: Date.now() + 24 * U.HOUR, owner: l.owner, status: 'pending', note: 'Send quotation within 24 h of survey', auto: true }); if (D.STAGES.indexOf(l.stage) < D.STAGES.indexOf('Site Survey')) l.stage = 'Site Survey'; }
      if (s === 'No-show') S.state.followups.push({ id: U.uid('fu'), leadId: l.id, type: 'AI call', dueAt: Date.now() + 2 * U.HOUR, owner: SOL.roleAgent('inbound'), status: 'pending', note: 'Visit no-show — rebook survey', auto: true });
      if (s === 'Confirmed') v.reminders = Object.assign(v.reminders || {}, { aiConfirm: true });
      A.modal = null; S.change('visit'); toast(v.kind + ': ' + s);
    },
    vResched: (el) => { const v = S.state.visits.find((x) => x.id === el.dataset.id); A.modal = null; A.acts.bookVisit({ dataset: { id: v.leadId, re: v.id } }); A.vd.kind = v.kind; A.vd.with = v.with; A.vd.mins = v.mins; render(); }
  });
  function visitModal() {
    const d = A.vd; const leads = S.state.leads.filter((l) => !l.dnc).sort((a, b) => a.name.localeCompare(b.name));
    const times = []; for (let hh = 9; hh <= 19; hh++) for (const mm of ['00', '30']) times.push(String(hh).padStart(2, '0') + ':' + mm);
    const people = S.state.team.filter((t) => ['Surveyor', 'Sales'].includes(t.role) && t.active);
    return `<div class="mhd"><h2 class="sp">${d.rescheduleOf ? 'Reschedule visit' : 'Book site visit / meeting'}</h2><button class="btn ghost sm" data-act="closeModal" aria-label="Close">${I('x')}</button></div><div class="mbd"><div class="fgrid">
      <label class="f" style="grid-column:1/-1">Lead<select class="i" id="vd_lead" data-chg="vdSet" data-k="leadId">${opts(leads.map((l) => ({ v: l.id, t: l.name + ' · ' + (l.area || '') })), d.leadId, 'Choose lead')}</select></label>
      <label class="f">Type<select class="i" id="vd_kind" data-chg="vdSet" data-k="kind">${opts(['Site survey', 'Society meeting', 'Factory meeting', 'Office visit', 'Installation check'], d.kind)}</select></label>
      <label class="f">With<select class="i" id="vd_with" data-chg="vdSet" data-k="with">${opts(people.map((p) => ({ v: p.id, t: p.name + ' · ' + p.role })), d.with)}</select></label>
      <label class="f">Date<input class="i" type="date" id="vd_date" data-chg="vdSet" data-k="date" value="${h(d.date)}"></label>
      <label class="f">Time<select class="i" id="vd_time" data-chg="vdSet" data-k="time">${opts(times, d.time)}</select></label>
      <label class="f">Duration<select class="i" id="vd_mins" data-chg="vdSet" data-k="mins">${opts([{ v: 30, t: '30 min' }, { v: 45, t: '45 min' }, { v: 60, t: '1 hour' }, { v: 90, t: '1.5 hours' }], d.mins)}</select></label>
      <label class="f">Address<input class="i" id="vd_addr" data-chg="vdSet" data-k="address" value="${h(d.address)}"></label>
      <label class="f" style="grid-column:1/-1">Notes for surveyor<input class="i" id="vd_notes" data-chg="vdSet" data-k="notes" value="${h(d.notes)}" placeholder="e.g. Terrace access from building staircase; bring shadow analyser"></label></div>
      <label class="row small"><input type="checkbox" id="vd_wa" data-chg="vdSet" data-k="wa" ${d.wa ? 'checked' : ''}> Send WhatsApp confirmation and schedule reminders (T-24 h, AI call T-3 h, T-2 h)</label>
      ${d.force && d.clash ? `<div class="notice">${I('alert')} ${h(d.clash)}</div>` : ''}</div>
      <div class="mft"><button class="btn" data-act="closeModal">Cancel</button><button class="btn pri" data-act="vdSave">${d.force ? 'Double-book anyway' : 'Book'}</button></div>`;
  }
  function visitDetail() {
    const v = S.state.visits.find((x) => x.id === A.vOpen); if (!v) return ''; const l = S.lead(v.leadId); const r = v.reminders || {}; const z = sizing(l);
    return `<div class="mhd"><h2 class="sp">${h(v.kind)} · ${h(l.name)}</h2><button class="btn ghost sm" data-act="closeModal" aria-label="Close">${I('x')}</button></div><div class="mbd">
      <div class="row"><span class="pill ${v.status === 'Completed' || v.status === 'Confirmed' ? 'good' : v.status === 'No-show' ? 'bad' : 'info'}">${h(v.status)}</span><b>${U.fmtDT(v.at)}</b><span class="muted">· ${v.mins} min · ${h(nameOf(v.with))}</span></div>
      <div class="small">${I('map', '')} ${h(v.address || '')} · <span class="mono">${h(l.phone)}</span></div>
      <div class="notice info small">Lead brief for the surveyor: ${h(l.type || '')}, bill ${U.inr(l.bill)}, roof ${h(l.roofOwn || '?')} ~${U.num(l.roofArea || 0)} sq ft, suggested ${z.kw} kW. ${(l.objections || []).length ? 'Objections: ' + h(l.objections.join(', ')) + '.' : ''} ${l.history ? '12-month bills: ' + h(l.history) + '.' : ''}</div>
      <div class="row xs"><span class="pill ${r.wa24 ? 'good' : 'line'}">WhatsApp T-24 h ${r.wa24 ? '✓' : ''}</span><span class="pill ${r.aiConfirm ? 'good' : 'line'}">AI confirmation call T-3 h ${r.aiConfirm ? '✓' : ''}</span><span class="pill ${r.wa2 ? 'good' : 'line'}">WhatsApp T-2 h ${r.wa2 ? '✓' : ''}</span></div>
      <label class="f">Visit notes / outcome<textarea class="i" id="vNotes" placeholder="Roof measured 900 sq ft, south-facing, no shading. Customer wants 5 kW with EMI.">${h(v.notes || '')}</textarea></label></div>
      <div class="mft"><button class="btn ghost" data-act="openLead" data-id="${l.id}">Open lead</button><span class="sp"></span><button class="btn sm" data-act="vResched" data-id="${v.id}">Reschedule</button><button class="btn sm" data-act="vStatus" data-s="Cancelled" data-id="${v.id}">Cancel</button><button class="btn sm" data-act="vStatus" data-s="No-show" data-id="${v.id}">No-show</button><button class="btn sm" data-act="vStatus" data-s="Confirmed" data-id="${v.id}">Confirmed</button><button class="btn sm pri" data-act="vStatus" data-s="Completed" data-id="${v.id}">${I('check')}Completed</button></div>`;
  }
  const _openLead = A.acts.openLead; A.acts.openLead = (el) => { A.modal = null; _openLead(el); };

  /* ================= VOICE AGENTS ================= */
  A.ag = { edit: null, tab: 'profile' };
  const LN = { mr: 'मराठी', hi: 'हिंदी', en: 'English' };
  A.views.agents = function () {
    if (A.ag.edit && agentById(A.ag.edit) && A.ag.edit === agentById(A.ag.edit).id) return studio(agentById(A.ag.edit));
    const st = S.state, now = Date.now();
    const single = st.settings.agentMode === 'single'; const one = st.agents.find((a) => a.id === 'ag_one');
    const list = single ? st.agents.filter((a) => a.id !== 'ag_one') : st.agents.filter((a) => a.id !== 'ag_one');
    function agentCard(a, big) {
        const cs = st.calls.filter((c) => c.agentId === a.id && c.at > now - 7 * U.DAY); const ans = cs.filter(SOL.answered);
        const good = ans.filter((c) => ['Visit booked', 'Meeting booked', 'Transferred', 'Callback'].includes(c.outcome)).length;
        const avg = ans.length ? ans.reduce((s, c) => s + c.secs, 0) / ans.length : 0; const live = Live.calls.filter((c) => c.agentId === a.id).length;
        return `<div class="card agentcard" data-act="agEdit" data-id="${a.id}" tabindex="0"><div class="row nw"><span class="av ai" style="width:40px;height:40px;font-size:16px">${h(a.name[0])}</span><div class="sp"><h2>${h(a.name)}</h2><div class="small muted">${h(a.direction)} · ${a.voice.gender === 'm' ? 'male' : 'female'} voice</div></div>${live ? '<span class="pill HOT"><span class="dot live"></span>LIVE</span>' : `<span class="pill ${a.status === 'Active' ? 'good' : 'mute'}">${h(a.status)}</span>`}</div>
          <div class="small">${h(a.useCase)}</div><div class="langs">${a.languages.map((l) => `<span class="${l === a.primaryLang ? 'p' : ''}">${LN[l]}</span>`).join('')}${a.autoDetect ? '<span>auto-switch</span>' : ''}</div>
          <div class="grid g3" style="gap:8px;border-top:1px solid var(--line2);padding-top:10px"><div><div class="eyebrow">Calls 7d</div><b class="mono">${cs.length}</b></div><div><div class="eyebrow">Positive</div><b class="mono">${ans.length ? Math.round(good / ans.length * 100) : 0}%</b></div><div><div class="eyebrow">Avg call</div><b class="mono">${U.dur(avg)}</b></div></div>
          ${big && a.callTypes ? `<div class="row">${a.callTypes.map((c) => `<span class="pill ${c.on ? 'info' : 'line'}">${c.on ? '✓ ' : ''}${h(c.name.split(' (')[0].split(':')[0])}</span>`).join('')}</div>` : ''}
          <div class="row"><button class="btn sm ${big ? 'pri' : ''}" data-act="agEdit" data-id="${a.id}">Configure</button><button class="btn sm" data-act="agTest" data-id="${a.id}">${I('headset')}Test call</button><span class="sp"></span><label class="switch" title="Active" data-act="noop"><input type="checkbox" id="agon_${a.id}" data-chg="agToggle" data-id="${a.id}" ${a.status === 'Active' ? 'checked' : ''}><span></span></label></div></div>`;
    }
    return `<div class="phead"><div class="grow"><h1>Voice agents</h1><p>Choose one agent that runs every Solaris call, or a team of specialist agents. Either way, every call writes to the same CRM.</p></div><button class="btn pri" data-act="agNew">${I('plus')}New agent</button></div>
      <div class="grid g2"><button class="card agentcard" data-act="agMode" data-m="single" style="text-align:left;${single ? 'outline:2px solid var(--accent)' : ''}"><div class="row nw"><span class="pill ${single ? 'good' : 'line'}">${single ? '✓ In use' : 'Option A'}</span><h2 class="sp">One agent for all of Solaris</h2></div><div class="small">A single regional-language agent (${h(one ? one.name : 'Asha')}) answers enquiries, calls leads, handles societies and factories, customer support, visit confirmations and quotation follow-ups. It works out the call type from the conversation. Simplest to set up and to demo.</div></button>
        <button class="card agentcard" data-act="agMode" data-m="team" style="text-align:left;${!single ? 'outline:2px solid var(--accent)' : ''}"><div class="row nw"><span class="pill ${!single ? 'good' : 'line'}">${!single ? '✓ In use' : 'Option B'}</span><h2 class="sp">Team of specialist agents</h2></div><div class="small">Separate agents for inbound, outbound, commercial, support and reminders, each with its own voice and script. Useful once call volume grows or scripts get long.</div></button></div>
      ${single && one ? agentCard(one, true) : ''}
      ${single ? '<h2 style="margin-top:4px">Specialist agents <span class="small muted" style="font-weight:500">· not used while one-agent mode is on</span></h2>' : ''}
      <div class="grid g3" style="${single ? 'opacity:.6' : ''}">${list.map((a) => agentCard(a)).join('')}</div>
      ${single ? `<div class="card"><div class="hd"><h2>How calls reach ${h(one ? one.name : 'the agent')}</h2></div><div class="bd small">Every inbound call, missed call, new lead, Excel campaign, visit reminder and follow-up call goes to ${h(one ? one.name : 'the one agent')}. ${h(one ? one.name : 'It')} opens in Marathi, switches to Hindi or English if the caller does, identifies the call type, and hands hot leads to the salesperson who owns the area.</div></div>` : ''}
      <div class="card" style="${single ? 'display:none' : ''}"><div class="hd"><h2>How calls reach each agent</h2></div><div class="bd"><div class="tbl-wrap"><table class="t"><thead><tr><th>Situation</th><th>Agent</th><th>Language</th><th>If hot</th></tr></thead><tbody>
        <tr><td>Someone calls the Solaris number, or gives a missed call</td><td>Sakhi</td><td>Marathi first, switches to caller's language</td><td>Live transfer to area salesperson</td></tr>
        <tr><td>New Meta / Google / website / Excel lead</td><td>Arjun (within 2 min, in calling hours)</td><td>Lead's language, else Hindi</td><td>Live transfer or visit booking</td></tr>
        <tr><td>Housing society, shop or factory; or bill above ₹15,000</td><td>Meera</td><td>Marathi / Hindi / English</td><td>Commercial sales head (Rohit)</td></tr>
        <tr><td>Existing customer: subsidy, net meter, service</td><td>Seva</td><td>Marathi first</td><td>Ticket + callback, never guesses</td></tr>
        <tr><td>Visit booked for tomorrow</td><td>Smita (confirmation call T-3 h)</td><td>Lead's language</td><td>Reschedule on the call</td></tr></tbody></table></div></div></div>`;
  };
  Object.assign(A.acts, {
    agMode: (el) => { S.state.settings.agentMode = el.dataset.m === 'single' ? 'single' : 'team'; const one = agentById('ag_one'); if (el.dataset.m === 'single' && one) one.status = 'Active'; S.change('settings'); toast(el.dataset.m === 'single' ? 'One agent now handles every call' : 'Specialist agents now share the calls'); },
    ctF: (el) => { const a = agentById(A.ag.edit); const c = a.callTypes[Number(el.dataset.i)]; if (el.type === 'checkbox') c.on = el.checked; else c[el.dataset.k] = el.value; S.save(); if (el.type === 'checkbox') render(); },
    agEdit: (el) => { A.ag.edit = el.dataset.id; A.ag.tab = 'profile'; render(); document.getElementById('main').scrollTop = 0; },
    agTest: (el, e) => { e && e.stopPropagation(); A.ag.edit = el.dataset.id; A.ag.tab = 'test'; A.tc = null; render(); },
    agBack: () => { A.ag.edit = null; Voice.stop(); render(); },
    agTab: (el) => { A.ag.tab = el.dataset.t; render(); },
    agToggle: (el) => { const a = agentById(el.dataset.id); a.status = el.checked ? 'Active' : 'Paused'; S.change('agents'); toast(a.name + (el.checked ? ' is active' : ' is paused')); },
    agNew: () => { const base = JSON.parse(JSON.stringify(agentById('ag_sakhi'))); base.id = U.uid('ag'); base.name = 'New agent'; base.status = 'Paused'; base.useCase = 'Describe what this agent handles'; S.state.agents.push(base); A.ag.edit = base.id; A.ag.tab = 'profile'; S.change('agents'); },
    agDup: () => { const a = agentById(A.ag.edit); const c = JSON.parse(JSON.stringify(a)); c.id = U.uid('ag'); c.name = a.name + ' copy'; c.status = 'Paused'; S.state.agents.push(c); A.ag.edit = c.id; S.change('agents'); toast('Duplicated'); },
    agDel: () => { const a = agentById(A.ag.edit); if (S.state.agents.length <= 1) return; if (A.ag.confirmDel !== a.id) { A.ag.confirmDel = a.id; render(); return; } S.state.agents = S.state.agents.filter((x) => x.id !== a.id); A.ag.edit = null; A.ag.confirmDel = null; S.change('agents'); toast('Agent deleted'); },
    agF: (el) => {
      const a = agentById(el.dataset.id || A.ag.edit); const path = el.dataset.p.split('.'); let o = a; for (let i = 0; i < path.length - 1; i++) o = o[path[i]] = o[path[i]] || {};
      let v = el.type === 'checkbox' ? el.checked : el.value; if (el.dataset.num) v = Number(v); if (el.dataset.list) v = String(v).split(',').map((s) => s.trim()).filter(Boolean);
      o[path[path.length - 1]] = v; S.save(); if (el.dataset.rr) render();
    },
    agLang: (el) => { const a = agentById(A.ag.edit); const l = el.dataset.l; if (a.languages.includes(l)) { if (a.languages.length > 1) a.languages = a.languages.filter((x) => x !== l); } else a.languages.push(l); if (!a.languages.includes(a.primaryLang)) a.primaryLang = a.languages[0]; S.change('agents'); },
    agPreview: (el) => { const a = agentById(A.ag.edit); const l = el.dataset.l || a.primaryLang; const g = fillGreeting(a, l, null); Voice.stop(); Voice.speak(g, l, { gender: a.voice.gender, rate: a.voice.rate, pitch: a.voice.pitch }); toast('Voice: ' + Voice.describe(l, a.voice.gender)); },
    qMove: (el) => { const a = agentById(A.ag.edit); const i = Number(el.dataset.i), d = Number(el.dataset.d); const j = i + d; if (j < 0 || j >= a.questions.length) return; [a.questions[i], a.questions[j]] = [a.questions[j], a.questions[i]]; S.change('agents'); },
    qDel: (el) => { const a = agentById(A.ag.edit); a.questions.splice(Number(el.dataset.i), 1); S.change('agents'); },
    qAdd: () => { const a = agentById(A.ag.edit); a.questions.push({ id: U.uid('q'), field: 'custom' + (a.questions.length + 1), text: { mr: '', hi: '', en: 'New question' }, required: false }); S.change('agents'); },
    oAdd: () => { const a = agentById(A.ag.edit); a.objections.push({ trigger: 'New objection', keywords: [], mr: '', hi: '', en: '' }); S.change('agents'); },
    oDel: (el) => { const a = agentById(A.ag.edit); a.objections.splice(Number(el.dataset.i), 1); S.change('agents'); },
    faqAdd: () => { const a = agentById(A.ag.edit); a.faqs = a.faqs || JSON.parse(JSON.stringify(D.FAQS)); a.faqs.push({ q: 'New question', a: '' }); S.change('agents'); },
    faqDel: (el) => { const a = agentById(A.ag.edit); a.faqs = a.faqs || JSON.parse(JSON.stringify(D.FAQS)); a.faqs.splice(Number(el.dataset.i), 1); S.change('agents'); }
  });
  function fillGreeting(a, lang, lead) {
    const src = lead && a.greetingOut ? a.greetingOut : a.greeting; let g = (src && src[lang]) || (src && src.en) || '';
    if (lead) { const first = (lead.name || '').split(' ')[0]; g = g.replace(/\{name\}/g, lang === 'en' ? lead.name : (D.DV_FIRST[first] || lead.name)); }
    else g = g.replace(/\{name\}\s*जी/g, '').replace(/\{name\}/g, lang === 'en' ? 'there' : '').replace(/\s+([!,.।])/g, '$1').replace(/\s{2,}/g, ' ');
    return g;
  }
  A.fillGreeting = fillGreeting;
  function studio(a) {
    const tab = A.ag.tab; const id = a.id;
    const inp = (p, v, o) => `<input class="i" id="ag_${p.replace(/\./g, '_')}" data-chg="agF" data-p="${p}" value="${h(v == null ? '' : v)}" ${o || ''}>`;
    const ta = (p, v, o) => `<textarea class="i dv" id="ag_${p.replace(/\./g, '_')}" data-chg="agF" data-p="${p}" ${o || ''}>${h(v || '')}</textarea>`;
    let body = '';
    if (tab === 'profile') {
      body = `<div class="grid g2"><div class="card"><div class="hd"><h3>Identity</h3></div><div class="bd"><div class="fgrid">
          <label class="f">Agent name${inp('name', a.name, 'data-rr="1"')}</label>
          <label class="f">Direction<select class="i" data-chg="agF" data-p="direction" id="ag_dir">${opts(['Inbound', 'Outbound', 'Both'], a.direction)}</select></label>
          <label class="f" style="grid-column:1/-1">What this agent handles${inp('useCase', a.useCase)}</label>
          <label class="f">Phone number / DID${inp('number', a.number)}</label>
          <label class="f">Status<select class="i" data-chg="agF" data-p="status" id="ag_status" data-rr="1">${opts(['Active', 'Paused'], a.status)}</select></label>
          <label class="f" style="grid-column:1/-1">Tone &amp; personality${inp('tone', a.tone)}</label>${a.allInOne ? `<label class="f" style="grid-column:1/-1">Speaking style<select class="i" id="ag_style" data-chg="agF" data-p="style">${opts(['Spoken Marathi', 'Formal Marathi', 'Marathi mixed with common English words'], a.style)}</select></label>` : ''}</div></div></div>
        <div class="card"><div class="hd"><h3>Languages &amp; voice</h3></div><div class="bd stack">
          <div class="row">${['mr', 'hi', 'en'].map((l) => `<button class="chip ${a.languages.includes(l) ? 'on' : ''}" data-act="agLang" data-l="${l}">${LN[l]}</button>`).join('')}</div>
          <div class="fgrid"><label class="f">Opens the call in<select class="i" id="ag_pl" data-chg="agF" data-p="primaryLang" data-rr="1">${opts(a.languages.map((l) => ({ v: l, t: LN[l] })), a.primaryLang)}</select></label>
          <label class="f">Voice<select class="i" id="ag_vg" data-chg="agF" data-p="voice.gender" data-rr="1">${opts([{ v: 'f', t: 'Female' }, { v: 'm', t: 'Male' }], a.voice.gender)}</select></label>
          <label class="f">Speed ${a.voice.rate}<input type="range" id="ag_vr" min="0.8" max="1.2" step="0.05" value="${a.voice.rate}" data-chg="agF" data-p="voice.rate" data-num="1" data-rr="1"></label>
          <label class="f">Pitch ${a.voice.pitch}<input type="range" id="ag_vp" min="0.8" max="1.2" step="0.05" value="${a.voice.pitch}" data-chg="agF" data-p="voice.pitch" data-num="1" data-rr="1"></label></div>
          <label class="row small"><input type="checkbox" id="ag_ad" data-chg="agF" data-p="autoDetect" ${a.autoDetect ? 'checked' : ''}> Switch language automatically when the caller does</label>
          <div class="row">${a.languages.map((l) => `<button class="btn sm" data-act="agPreview" data-l="${l}">${I('vol')}Preview ${LN[l]}</button>`).join('')}</div>
          <p class="xs muted" style="margin:0">Preview uses this device's voice: ${h(Voice.describe(a.primaryLang, a.voice.gender))}. Production uses natural Indian-language neural voices on the phone line.</p></div></div></div>
        <div class="card"><div class="hd"><h3>Opening line (spoken first, includes AI + recording disclosure)</h3></div><div class="bd grid g3">${['mr', 'hi', 'en'].map((l) => `<label class="f">${LN[l]}${ta('greeting.' + l, (a.greeting || {})[l])}</label>`).join('')}</div></div>
        ${a.greetingOut ? `<div class="card"><div class="hd"><h3>Opening line when calling a lead</h3><span class="small muted">{name} becomes the lead's name</span></div><div class="bd grid g3">${['mr', 'hi', 'en'].map((l) => `<label class="f">${LN[l]}${ta('greetingOut.' + l, a.greetingOut[l])}</label>`).join('')}</div></div>` : ''}`;
    } else if (tab === 'types' && a.callTypes) {
      body = `<div class="notice info">${h(a.name)} decides which of these a call is from what the caller says and from why the call was placed (new lead, reminder, quotation follow-up). Turn off anything Solaris doesn't want the AI to handle; those callers are offered a callback from the team.</div>
        <div class="card"><div class="bd stack">${a.callTypes.map((c, i) => `<div class="qitem" style="grid-template-columns:44px 1fr"><label class="switch" data-act="noop"><input type="checkbox" id="ct_${i}" data-chg="ctF" data-i="${i}" ${c.on ? 'checked' : ''}><span></span></label><div class="stack"><input class="i" style="font-weight:600" id="ctn_${i}" data-chg="ctF" data-i="${i}" data-k="name" value="${h(c.name)}"><label class="f">How ${h(a.name)} handles it<textarea class="i" id="cth_${i}" data-chg="ctF" data-i="${i}" data-k="how">${h(c.how)}</textarea></label></div></div>`).join('')}</div></div>`;
    } else if (tab === 'script') {
      body = `<div class="card"><div class="hd"><h3>Qualification questions</h3><span class="small muted">asked in this order, skipped if the caller already answered · each answer fills a CRM field</span><button class="btn sm" data-act="qAdd">${I('plus')}Add question</button></div><div class="bd stack">${a.questions.map((q, i) => `<div class="qitem"><span class="mono muted">${i + 1}</span><div class="stack"><div class="row"><label class="f" style="flex-direction:row;align-items:center;gap:6px">CRM field <input class="i mono" style="width:140px" id="q_${i}_field" data-chg="agF" data-p="questions.${i}.field" value="${h(q.field)}"></label><label class="row small"><input type="checkbox" id="q_${i}_req" data-chg="agF" data-p="questions.${i}.required" ${q.required ? 'checked' : ''}> must ask</label></div>
          <div class="grid g3" style="gap:8px">${['mr', 'hi', 'en'].map((l) => `<label class="f">${LN[l]}<textarea class="i dv" style="min-height:52px" id="q_${i}_${l}" data-chg="agF" data-p="questions.${i}.text.${l}">${h(q.text[l] || '')}</textarea></label>`).join('')}</div></div>
          <div class="stack" style="gap:4px"><button class="btn sm ghost" data-act="qMove" data-i="${i}" data-d="-1" aria-label="Move up">↑</button><button class="btn sm ghost" data-act="qMove" data-i="${i}" data-d="1" aria-label="Move down">↓</button><button class="btn sm ghost danger" data-act="qDel" data-i="${i}" aria-label="Delete">${I('x')}</button></div></div>`).join('')}</div></div>`;
    } else if (tab === 'knowledge') {
      const faqs = a.faqs || D.FAQS;
      body = `<div class="card"><div class="hd"><h3>Objection handling</h3><span class="small muted">keywords in any language trigger the approved answer</span><button class="btn sm" data-act="oAdd">${I('plus')}Add</button></div><div class="bd stack">${a.objections.map((o, i) => `<div class="qitem"><span class="mono muted">${i + 1}</span><div class="stack"><div class="fgrid"><label class="f">Objection${`<input class="i" id="o_${i}_t" data-chg="agF" data-p="objections.${i}.trigger" value="${h(o.trigger)}">`}</label><label class="f" style="grid-column:span 2">Trigger words (comma-separated)<input class="i dv" id="o_${i}_k" data-chg="agF" data-p="objections.${i}.keywords" data-list="1" value="${h((o.keywords || []).join(', '))}"></label></div>
          <div class="grid g3" style="gap:8px">${['mr', 'hi', 'en'].map((l) => `<label class="f">${LN[l]}<textarea class="i dv" id="o_${i}_${l}" data-chg="agF" data-p="objections.${i}.${l}">${h(o[l] || '')}</textarea></label>`).join('')}</div></div><button class="btn sm ghost danger" data-act="oDel" data-i="${i}" aria-label="Delete">${I('x')}</button></div>`).join('')}</div></div>
        <div class="card"><div class="hd"><h3>Knowledge base / FAQs</h3><span class="small muted">the only facts the agent may state; anything else goes to a human</span><button class="btn sm" data-act="faqAdd">${I('plus')}Add</button></div><div class="bd stack">${faqs.map((f, i) => `<div class="qitem"><span class="mono muted">${i + 1}</span><div class="grid g2" style="gap:8px"><label class="f">Question<input class="i" id="f_${i}_q" data-chg="agF" data-p="faqs.${i}.q" value="${h(f.q)}"></label><label class="f">Approved answer<textarea class="i" id="f_${i}_a" data-chg="agF" data-p="faqs.${i}.a">${h(f.a)}</textarea></label></div><button class="btn sm ghost danger" data-act="faqDel" data-i="${i}" aria-label="Delete">${I('x')}</button></div>`).join('')}</div></div>`;
      if (!a.faqs) a.faqs = JSON.parse(JSON.stringify(D.FAQS));
    } else if (tab === 'rules') {
      body = `<div class="grid g2"><div class="card"><div class="hd"><h3>Hand-off to a human</h3></div><div class="bd"><div class="fgrid">
          <label class="f">Transfer when lead score reaches<input class="i" type="number" min="0" max="101" id="ag_ts" data-chg="agF" data-p="transfer.score" data-num="1" value="${a.transfer.score}"></label>
          <label class="f">How<select class="i" id="ag_tm" data-chg="agF" data-p="transfer.mode">${opts(['Live transfer', 'Create ticket + callback', 'Book visit only'], a.transfer.mode)}</select></label>
          <label class="f" style="grid-column:1/-1">Also transfer if caller says<input class="i dv" id="ag_tk" data-chg="agF" data-p="transfer.keywords" data-list="1" value="${h(a.transfer.keywords.join(', '))}"></label></div>
          <p class="small muted">Routing: the salesperson who owns the caller's area (Settings → Team). Factories, shops and institutions go to the commercial salesperson. If nobody answers in 20 s, the AI books a callback and WhatsApps the salesperson.</p></div></div>
        <div class="card"><div class="hd"><h3>Schedule, retries &amp; compliance</h3></div><div class="bd stack"><div class="fgrid">
          <label class="f">Outbound calls from<input class="i" type="time" id="ag_hs" data-chg="agF" data-p="hours.start" value="${h(a.hours.start)}"></label><label class="f">until<input class="i" type="time" id="ag_he" data-chg="agF" data-p="hours.end" value="${h(a.hours.end)}"></label>
          <label class="f">Max call length (min)<input class="i" type="number" id="ag_mm" data-chg="agF" data-p="maxMinutes" data-num="1" value="${a.maxMinutes}"></label><label class="f">Attempts if no answer<input class="i" type="number" id="ag_ra" data-chg="agF" data-p="retries.attempts" data-num="1" value="${a.retries.attempts}"></label><label class="f">Hours between attempts<input class="i" type="number" id="ag_rg" data-chg="agF" data-p="retries.gapHours" data-num="1" value="${a.retries.gapHours}"></label></div>
          ${[['aiDisclosure', 'Say it is an AI assistant at the start of every call'], ['recordingDisclosure', 'Announce call recording'], ['dncOnRequest', 'Add to DNC list when asked, stop all sequences'], ['consentOnly', 'Outbound only to leads who enquired or gave consent']].map(([k, t]) => `<label class="row small"><input type="checkbox" id="ag_c_${k}" data-chg="agF" data-p="compliance.${k}" ${a.compliance[k] ? 'checked' : ''}> ${t}</label>`).join('')}
          <p class="xs muted" style="margin:0">Inbound calls are answered 24×7. Outbound calls stay inside the window above. TRAI rules for automated calls apply; confirm the number series (140 / 160) with the telecom provider before go-live.</p></div></div></div>`;
    } else if (tab === 'test') body = testConsole(a);
    return `<div class="phead"><button class="btn ghost sm" data-act="agBack">‹ All agents</button><div class="grow"><div class="row nw"><span class="av ai" style="width:38px;height:38px;font-size:16px">${h(a.name[0])}</span><div style="min-width:0"><h1>${h(a.name)}</h1><div class="small muted">${h(a.useCase)}</div></div><span class="pill ${a.status === 'Active' ? 'good' : 'mute'}">${h(a.status)}</span></div></div>
      <button class="btn" data-act="agDup">Duplicate</button><button class="btn danger" data-act="agDel">${A.ag.confirmDel === a.id ? 'Click again to delete' : 'Delete'}</button><button class="btn pri" data-act="agTab" data-t="test">${I('headset')}Test call</button></div>
      <div class="tabs">${[['profile', 'Profile & voice']].concat(a.callTypes ? [['types', 'Call types']] : []).concat([['script', 'Script & questions'], ['knowledge', 'Objections & knowledge'], ['rules', 'Hand-off & schedule'], ['test', 'Test call']]).map(([k, t]) => `<button class="tab ${tab === k ? 'on' : ''}" data-act="agTab" data-t="${k}">${t}</button>`).join('')}</div>
      ${tab !== 'test' ? '<div class="small muted">Changes save automatically and apply to the next call.</div>' : ''}${body}`;
  }

  /* ---------- test call console ---------- */
  const QUICK = {
    mr: ['हो, बोला', 'बिल साधारण 4500 येतं', 'स्वतःचा बंगला आहे, गंगापूर रोडला', 'पण सोलर खूप महाग आहे', 'पावसाळ्यात चालेल का?', 'सबसिडी किती मिळेल?', 'शनिवारी सकाळी या', 'नंतर कॉल करा', 'माझी सबसिडी अजून आली नाही', 'सर्व्हेची वेळ बदलायची आहे', 'कोटेशन मिळालं, किंमत जास्त वाटते', 'मला नको, कॉल करू नका'],
    hi: ['हाँ, बोलिए', 'बिल लगभग 4500 आता है', 'अपना घर है, नासिक रोड पर', 'लेकिन सोलर बहुत महँगा है', 'बारिश में चलेगा क्या?', 'सब्सिडी कितनी मिलेगी?', 'शनिवार सुबह आ जाइए', 'बाद में कॉल कीजिए', 'मेरी सब्सिडी अभी तक नहीं आई', 'सर्वे का समय बदलना है', 'कोटेशन मिला, क़ीमत ज़्यादा लग रही है', 'मुझे नहीं चाहिए, कॉल मत कीजिए'],
    en: ['Yes, go ahead', 'My bill is about 4500', 'Own bungalow on College Road', 'Solar is too expensive', 'Will it work in monsoon?', 'How much subsidy will I get?', 'Come on Saturday morning', 'Call me later', 'My subsidy has not come yet', 'I need to reschedule the survey', 'Got the quotation, price feels high', 'Not interested, do not call']
  };
  function testConsole(a) {
    const tc = A.tc && A.tc.agentId === a.id ? A.tc : null;
    const lang = (tc && tc.lang) || A.tcLang || a.primaryLang;
    const leads = S.state.leads.filter((l) => !l.dnc).slice(0, 80); const pre = A.tcLead && S.lead(A.tcLead); if (pre && !leads.includes(pre)) leads.unshift(pre);
    const fields = tc ? tc.fields : {};
    const fr = (k, lab, v) => `<div class="crmrow"><span>${lab}</span><span>${v != null && v !== '' ? h(v) : '<span class="muted small">—</span>'}</span></div>`;
    const sz = fields.bill ? sizing({ bill: fields.bill, type: fields.type || 'Home' }) : null;
    return `<div class="notice info">${AI.sample ? `<b>Claude is the brain for this test.</b> Type what a customer would say (in Marathi, Hindi or English) and ${h(a.name)} answers using this agent's script, knowledge and rules. Replies are spoken aloud when voice is on.` : `<b>Script engine mode.</b> Claude isn't available in this view, so ${h(a.name)} follows the configured question flow and objection answers. Replies are spoken aloud when voice is on.`} On a real phone line the caller's speech is transcribed live; here you type or tap a reply.</div>
      <div class="card"><div class="split"><div>
        <div class="row" style="padding:10px 14px;border-bottom:1px solid var(--line2)">${a.languages.map((l) => `<button class="chip ${lang === l ? 'on' : ''}" data-act="tcLang" data-l="${l}" ${tc && tc.turns.length ? 'disabled' : ''}>${LN[l]}</button>`).join('')}
          <select class="i" id="tcLead" style="width:auto;max-width:220px" ${tc ? 'disabled' : ''} aria-label="Caller">${opts(leads.map((l) => ({ v: l.id, t: l.name })), tc ? tc.leadId || '' : A.tcLead || '', 'New caller (unknown)')}</select>
          <span class="sp"></span>${tc ? `<span class="pill ${tc.mode === 'claude' ? 'good' : 'mute'}">${tc.mode === 'claude' ? 'Claude' : 'Script engine'}</span><div class="wave ${tc.speaking ? 'on' : ''}">${'<i></i>'.repeat(8)}</div>` : ''}</div>
        <div class="tx" id="tctx" style="height:420px" data-follow="1">${tc ? A.txHtml(tc.turns, a, { lang }) + (tc.busy ? `<div class="msg ai"><div><div class="who">${h(a.name)} · AI</div><div class="b typing">${h(tc.partial || '')}</div></div></div>` : '') : `<div class="empty"><h2 style="margin-bottom:6px">Call ${h(a.name)} like a customer would</h2><p class="muted">Pick the language and, optionally, an existing lead. ${h(a.name)} opens with the greeting and the AI + recording disclosure.</p><button class="btn pri" data-act="tcStart">${I('phone')}Start test call</button></div>`}</div>
        ${tc ? `<div style="padding:10px 14px;border-top:1px solid var(--line2)" class="stack"><div class="row">${QUICK[lang].map((q) => `<button class="chip dv" data-act="tcQuick" data-t="${h(q)}" ${tc.busy || tc.ended ? 'disabled' : ''}>${h(q)}</button>`).join('')}</div>
          <div class="row nw"><input class="i dv" id="tcIn" placeholder="${lang === 'mr' ? 'ग्राहक म्हणून लिहा…' : lang === 'hi' ? 'ग्राहक की तरह लिखिए…' : 'Type as the customer…'}" data-enter="tcSend" ${tc.busy || tc.ended ? 'disabled' : ''}><button class="btn pri" data-act="tcSend" ${tc.busy || tc.ended ? 'disabled' : ''}>Say</button></div></div>` : ''}
      </div><div style="padding:12px 14px" class="stack"><div class="row"><h3 class="sp">CRM · filled from the conversation</h3>${tc && tc.extracting ? '<span class="pill info">Claude extracting…</span>' : ''}</div>
        ${fr('type', 'Property', fields.type)}${fr('area', 'Location', fields.area)}${fr('bill', 'Monthly bill', fields.bill ? U.inr(fields.bill) : '')}${fr('roofOwn', 'Roof', fields.roofOwn)}${fr('roofArea', 'Roof area', fields.roofArea ? U.num(fields.roofArea) + ' sq ft' : '')}${fr('size', 'Suggested size', sz ? sz.kw + ' kW · subsidy ' + U.inr(sz.subsidy) : '')}${fr('obj', 'Objections', (fields.objections || []).join(', '))}${fr('timeline', 'Timeline', fields.timeline)}${fr('finance', 'Finance', fields.finance)}${fr('visit', 'Next step', fields.dnc ? 'Do not call' : fields.wantsHuman ? 'Transfer to sales' : fields.visitRequested ? 'Site visit: ' + (fields.visitWhen || '') : fields.callbackWhen ? 'Callback: ' + fields.callbackWhen : '')}
        ${tc && tc.summary ? `<div class="notice small"><b>Summary:</b> ${h(tc.summary)}</div>` : ''}
        ${tc ? `<div class="row">${tc.ended ? `<button class="btn pri" data-act="openLead" data-id="${tc.savedLead}">Open saved lead</button><button class="btn" data-act="tcReset">New test call</button>` : `<button class="btn pri" data-act="tcEnd" ${tc.busy ? 'disabled' : ''}>${I('check')}End call &amp; save to CRM</button><button class="btn ghost" data-act="tcReset">Discard</button>`}</div>` : ''}
      </div></div></div>`;
  }
  Object.assign(A.acts, {
    tcLang: (el) => { A.tcLang = el.dataset.l; if (A.tc) A.tc.lang = el.dataset.l; render(); },
    tcReset: () => { Voice.stop(); if (A.tc && A.tc.ctl) A.tc.ctl.abort(); A.tc = null; render(); },
    tcStart: async () => {
      const a = agentById(A.ag.edit); const lang = A.tcLang || a.primaryLang; const sel = document.getElementById('tcLead'); const leadId = sel ? sel.value : '';
      A.tcLead = leadId; const lead = leadId ? S.lead(leadId) : null;
      A.tc = { agentId: a.id, lang, leadId, turns: [], fields: lead ? { type: lead.type, area: lead.area, bill: lead.bill } : {}, qi: 0, mode: AI.sample ? 'claude' : 'script', busy: false, started: Date.now() };
      const g = fillGreeting(a, lang, lead);
      A.tc.turns.push({ s: 'ai', t: g, at: Date.now() }); render();
      speakAi(a, g, lang);
    },
    tcQuick: (el) => sendTc(el.dataset.t),
    tcSend: () => { const inp = document.getElementById('tcIn'); if (inp && inp.value.trim()) { const v = inp.value.trim(); inp.value = ''; sendTc(v); } },
    tcEnd: () => endTc()
  });
  async function speakAi(a, text, lang) { if (!S.state.settings.voiceOn) return; A.tc.speaking = true; render(); await Voice.speak(text, lang, { gender: a.voice.gender, rate: a.voice.rate, pitch: a.voice.pitch }); if (A.tc) { A.tc.speaking = false; render(); } }
  async function sendTc(text) {
    const tc = A.tc; if (!tc || tc.busy || tc.ended) return; const a = agentById(tc.agentId); Voice.stop();
    tc.turns.push({ s: 'cust', t: text, at: Date.now() });
    const d = SOL.Rules.detect(text); const cur = a.questions[Math.max(0, tc.qi - 1)];
    if (d.type) tc.fields.type = d.type; if (d.area) tc.fields.area = d.area; if (d.objection) tc.fields.objections = Array.from(new Set([...(tc.fields.objections || []), d.objection]));
    if (d.number && d.number >= 300 && d.number < 1000000 && !tc.fields.bill && /बिल|bill|रुपये|₹|rupay|येतं|आता/.test(text)) tc.fields.bill = d.number;
    if (d.dnc) tc.fields.dnc = true; if (d.human) tc.fields.wantsHuman = true; if (d.when) { tc.fields.visitRequested = true; tc.fields.visitWhen = text; }
    if (/बाद में|नंतर|later/i.test(text)) tc.fields.callbackWhen = tc.fields.callbackWhen || 'Customer asked to call later';
    tc.busy = true; tc.partial = ''; render();
    let reply = '';
    if (tc.mode === 'claude') {
      try { tc.ctl = new AbortController(); reply = await AI.reply(a, tc.lang, tc.turns, tc.leadId ? S.lead(tc.leadId) : null, (t) => { tc.partial = t; render(); }, tc.ctl.signal); }
      catch (e) { if (e && e.code === 'cancelled') return; tc.mode = 'script'; toast(e && e.code === 'not_granted' ? 'Claude access declined — switched to script engine' : 'Claude unavailable — switched to script engine'); }
    }
    if (!reply) { tc.rs = tc.rs || { qi: 1, fields: tc.fields }; tc.rs.fields = tc.fields; reply = SOL.Rules.next(a, tc.lang, tc.rs, text); tc.qi = tc.rs.qi; }
    tc.busy = false; tc.partial = '';
    tc.turns.push({ s: 'ai', t: reply, at: Date.now() }); render();
    speakAi(a, reply, tc.lang);
  }
  async function endTc() {
    const tc = A.tc; const a = agentById(tc.agentId); Voice.stop();
    if (tc.turns.length < 2) { A.tc = null; render(); return; }
    let ex = null;
    if (AI.sample && tc.mode === 'claude') { tc.extracting = true; render(); try { ex = await AI.extract(tc.turns, a.name); } catch (e) { ex = null; } tc.extracting = false; }
    const F = Object.assign({}, tc.fields);
    if (ex) { ['area', 'type', 'bill', 'roofOwn', 'roofArea', 'timeline', 'finance', 'visitWhen', 'callbackWhen'].forEach((k) => { if (ex[k] != null && ex[k] !== '') F[k] = ex[k]; }); if (ex.objections && ex.objections.length) F.objections = ex.objections; if (ex.visitRequested) F.visitRequested = true; if (ex.dnc) F.dnc = true; if (ex.wantsHuman) F.wantsHuman = true; tc.summary = ex.summary + (ex.nextStep ? ' Next: ' + ex.nextStep : ''); }
    let l = tc.leadId ? S.lead(tc.leadId) : null; const now = Date.now();
    if (!l) { l = { id: U.uid('ld'), name: (ex && ex.name) || 'Test caller ' + new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }), contact: '', phone: '+91 9' + Math.floor(1000 + Math.random() * 8999) + ' ' + Math.floor(10000 + Math.random() * 89999), lang: tc.lang, source: 'Missed call', stage: 'New', temp: 'COLD', score: 0, objections: [], notes: [], consent: true, createdAt: tc.started, tags: ['Test call'] }; S.state.leads.unshift(l); }
    const areaOk = D.AREAS.find((x) => F.area && x.en.toLowerCase() === String(F.area).toLowerCase());
    Object.assign(l, { type: F.type || l.type || 'Home', area: areaOk ? areaOk.en : (F.area || l.area), bill: Number(F.bill) || l.bill || null, roofOwn: F.roofOwn || l.roofOwn, roofArea: Number(F.roofArea) || l.roofArea, timeline: F.timeline || l.timeline, finance: F.finance || l.finance, answered: true, lastContact: now });
    l.objections = Array.from(new Set([...(l.objections || []), ...(F.objections || [])]));
    if (!l.owner) l.owner = routeOwner(l);
    const z = sizing(l); l.sizeKw = z.kw; l.estValue = z.cost;
    let outcome = 'Qualified';
    if (F.ticket || (ex && ex.intent === 'Support')) { outcome = 'Support ticket'; S.state.tickets.unshift({ id: 'TK-' + (1040 + S.state.tickets.length), leadId: l.id, at: now, subject: 'Raised by ' + a.name + ' on call' + (F.consumerNo ? ' · consumer no. ' + F.consumerNo : ''), status: 'Open', owner: 'u_owner' }); S.state.followups.push({ id: U.uid('fu'), leadId: l.id, type: 'Sales call', dueAt: U.startOfDay(now + U.DAY) + 17 * U.HOUR, owner: 'u_owner', status: 'pending', note: 'Support ticket callback', auto: true }); }
    else if (F.dnc) { l.dnc = true; if (!S.state.dnc.includes(l.phone)) S.state.dnc.push(l.phone); outcome = 'DNC'; }
    else if (F.wantsHuman) { outcome = 'Transferred'; }
    else if (F.visitRequested) {
      outcome = 'Visit booked'; l.visitBooked = true; if (D.STAGES.indexOf(l.stage) < 3) l.stage = 'Site Survey';
      const d = new Date(now + U.DAY); d.setHours(11, 0, 0, 0); while (d.getDay() !== 6) d.setTime(d.getTime() + U.DAY);
      S.state.visits.push({ id: U.uid('vs'), leadId: l.id, kind: l.type === 'Society' ? 'Society meeting' : l.type === 'Factory' ? 'Factory meeting' : 'Site survey', at: d.getTime(), mins: 45, with: l.type === 'Home' ? SOL.surveyorFor(l.area) : l.owner, address: (l.area || '') + ', Nashik', status: 'Scheduled', notes: 'Booked in test call · customer said: ' + (F.visitWhen || ''), reminders: {} });
      S.log(l.id, 'visit', 'Site visit booked for ' + U.fmtDT(d.getTime()));
    } else if (F.callbackWhen) { outcome = 'Callback'; S.state.followups.push({ id: U.uid('fu'), leadId: l.id, type: 'AI call', dueAt: now + U.DAY, owner: a.id, status: 'pending', note: F.callbackWhen, auto: true }); }
    if (!F.dnc && outcome !== 'Visit booked' && !F.callbackWhen) S.state.followups.push({ id: U.uid('fu'), leadId: l.id, type: 'WhatsApp', dueAt: now + 5 * U.MIN, owner: a.id, status: 'pending', note: 'Brochure + savings estimate', auto: true });
    if (D.STAGES.indexOf(l.stage) < 1) l.stage = 'Contacted'; if (outcome === 'Qualified' && D.STAGES.indexOf(l.stage) < 2 && l.bill) l.stage = 'Qualified';
    l.score = scoreLead(l); l.temp = tempOf(l.score, l);
    S.state.calls.unshift({ id: U.uid('cl'), leadId: l.id, agentId: a.id, dir: 'Inbound', lang: tc.lang, at: tc.started, secs: Math.round((now - tc.started) / 1000), outcome, transcript: tc.turns.map((t) => ({ s: t.s, t: t.t, at: t.at })), summary: tc.summary || ('Test call with ' + a.name + '. ' + (l.bill ? 'Bill ' + U.inr(l.bill) + '. ' : '') + (l.objections.length ? 'Objections: ' + l.objections.join(', ') + '. ' : '') + 'Outcome: ' + outcome + '.'), score: l.score, recording: true, test: true });
    S.log(l.id, 'crm', 'CRM updated from test call with ' + a.name + ' · score ' + l.score);
    tc.ended = true; tc.savedLead = l.id; S.change('calls'); toast('Saved to CRM: ' + l.name + ' · ' + outcome);
  }
})();
