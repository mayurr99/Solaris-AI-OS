/* Solaris AI OS — Excel import, Campaigns, Reports, Settings, Demo guide */
(function () {
  const { S, D, Live, Camp, AI, Voice, Excel, util: U, sizing, scoreLead, tempOf, routeOwner, person, agentById } = SOL;
  const A = window.APP; const { h, I, opts, outcomePill, tempPill, langTag, leadName, nameOf, toast } = A;
  const render = () => A.render();
  let dl = null; (async () => { try { if (window.claude && window.claude.use) dl = await window.claude.use('downloads'); } catch (e) { dl = null; } })();
  async function saveFile(filename, data) {
    if (!dl) {
      // hosted outside Claude: a normal browser download works
      try { const blob = data instanceof Blob ? data : new Blob([data]); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000); return true; }
      catch (e) { toast('File download is not available in this view'); return false; }
    }
    try { await dl.save({ filename, data }); return true; } catch (e) { if (e && e.code !== 'declined') toast('Could not save the file (' + (e.code || 'error') + ')'); return false; }
  }
  const XL = () => window.XLSX;
  function wbBlob(sheets) { const wb = XL().utils.book_new(); sheets.forEach(([name, rows]) => XL().utils.book_append_sheet(wb, XL().utils.json_to_sheet(rows), name.slice(0, 31))); const out = XL().write(wb, { bookType: 'xlsx', type: 'array' }); return new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }); }
  A.exportLeadsRows = (ls) => ls.map((l) => ({ Name: l.name, Contact: l.contact || '', Mobile: l.phone, Area: l.area || '', Type: l.type || '', 'Monthly bill (₹)': l.bill || '', 'Size (kW)': l.sizeKw || '', 'Est. value (₹)': l.estValue || '', Score: l.score || 0, Temperature: l.stage === 'Won' ? 'CUSTOMER' : l.temp, Stage: l.stage, Owner: person(l.owner).name, Source: l.source, Language: U.LANG[l.lang] || '', Roof: l.roofOwn || '', 'Roof sq ft': l.roofArea || '', Timeline: l.timeline || '', Finance: l.finance || '', Objections: (l.objections || []).join('; '), 'Next action': (A.nextAction(l) || {}).t || '', 'Created': new Date(l.createdAt).toLocaleString('en-IN'), 'Last contact': l.lastContact ? new Date(l.lastContact).toLocaleString('en-IN') : '', DNC: l.dnc ? 'Yes' : '' }));
  A.acts.exportLeads = async () => { if (!XL()) return toast('Excel library did not load'); const ls = A.filteredLeads(); const ok = await saveFile('Solaris_Leads_' + new Date().toISOString().slice(0, 10) + '.xlsx', wbBlob([['Leads', A.exportLeadsRows(ls)]])); if (ok) toast('Exported ' + ls.length + ' leads'); };

  /* ================= EXCEL IMPORT ================= */
  const SAMPLE = [
    ['Name', 'Mobile', 'Area', 'Property Type', 'Monthly Bill', 'Source', 'Language', 'Consent', 'Remarks'],
    ['Ganesh Wagh', '9822014567', 'Gangapur Road', 'Home', '4800', 'Meta Ads', 'Marathi', 'Yes', 'Asked about EMI'],
    ['Seema Kale', '+91 97643 21876', 'Indira Nagar', 'Home', '3100', 'Google Ads', 'Marathi', 'Yes', ''],
    ['Rajesh Agarwal', '09890012345', 'Satpur MIDC', 'Factory', '185000', 'IndiaMART', 'Hindi', 'Yes', 'Plastic moulding unit'],
    ['Tulsi Vihar CHS', '9421098765', 'Nashik Road', 'Society', '42000', 'Referral', 'Marathi', 'Yes', 'Secretary: Mr Joshi'],
    ['Pravin Nikam', '98220 55512', 'CIDCO', 'Home', '2600', 'Solar expo 2026', 'Marathi', '', 'Met at stall'],
    ['Anita Sharma', '8805512345', 'College Road', 'Home', '6200', 'Website', 'Hindi', 'Yes', ''],
    ['Mahesh Borse', '12345', 'Panchavati', 'Home', '2900', 'JustDial', 'Marathi', 'Yes', 'Wrong number format'],
    ['Ganesh Wagh', '9822014567', 'Gangapur Road', 'Home', '4800', 'Meta Ads', 'Marathi', 'Yes', 'Duplicate row'],
    ['Om Sai Hospital', '9765098765', 'Dwarka', 'Hospital', '76000', 'Referral', 'English', 'Yes', 'Admin head'],
    ['Kishor Ahire', '7020011223', 'Sinnar', 'Farm', '5200', 'Walk-in', 'Marathi', 'No', 'Only wants brochure'],
    ['Vaishali Deshpande', '9960012233', 'Pathardi Phata', 'Home', '3800', 'Meta Ads', 'Marathi', 'Yes', ''],
    ['Shivam Plastics', '9373012345', 'Ambad MIDC', 'Factory', '240000', 'Google Ads', 'Hindi', 'Yes', 'Two shifts'],
    ['Sunil Jain', '9011223344', 'Deolali Camp', 'Shop', '14000', 'Meta Ads', 'Hindi', 'Yes', 'Hardware shop'],
    ['Rohini Pawar', '9850012987', 'Makhmalabad', 'Home', '2200', 'Website', 'Marathi', 'Yes', ''],
    ['Test DNC', '9822011111', 'Nashik Road', 'Home', '3000', 'Meta Ads', 'Marathi', 'Yes', 'Number on DNC list'],
    ['Deepak Salunkhe', '9423456780', 'Ozar', 'Home', '4100', 'Meta Ads', 'Marathi', 'Yes', '']
  ];
  A.imp = null; A.impHistory = null;
  function parseSheet(rows, fileName) {
    const clean = rows.filter((r) => r && r.some((c) => String(c == null ? '' : c).trim() !== ''));
    if (!clean.length) return toast('The sheet is empty');
    const headers = clean[0].map((x) => String(x == null ? '' : x).trim());
    const map = Excel.mapHeaders(headers);
    A.imp = { fileName, headers, rows: clean.slice(1), map, agent: 'auto', callNow: !S.state.settings.realMode, keepExtra: true, batch: (fileName || 'Import').replace(/\.[^.]+$/, '') + ' · ' + U.fmtDate(Date.now()) };
    validateImp(); render();
  }
  function validateImp() { A.imp.recs = Excel.validate(A.imp.rows, A.imp.map); }
  function readFile(file) {
    if (!XL()) return toast('Excel library did not load — check your connection');
    const r = new FileReader();
    r.onload = (e) => { try { const wb = XL().read(new Uint8Array(e.target.result), { type: 'array' }); A.impWb = wb; const ws = wb.Sheets[wb.SheetNames[0]]; parseSheet(XL().utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' }), file.name); A.imp.sheets = wb.SheetNames; A.imp.sheet = wb.SheetNames[0]; render(); } catch (err) { toast('Could not read this file. Save it as .xlsx or .csv and try again.'); } };
    r.readAsArrayBuffer(file);
  }
  A.views.import = function () {
    const im = A.imp; const hist = S.state.imports || [];
    if (!im) return `<div class="phead"><div class="grow"><h1>Excel lead import</h1><p>Upload leads from ads, expos, IndiaMART, JustDial or old registers. The system cleans numbers, removes duplicates, checks the DNC list and consent, then the AI calls them and updates the CRM.</p></div><button class="btn" data-act="dlTemplate">${I('dl')}Download template</button></div>
      <div class="grid g-main"><label class="drop" id="drop" for="impFile"><input type="file" id="impFile" accept=".xlsx,.xls,.csv" hidden data-chg="impFile">${I('upload', '')}<h2 style="margin:8px 0 4px">Drop an Excel or CSV file here</h2><p class="muted" style="margin:0">or click to choose · .xlsx, .xls, .csv · any column order</p></label>
        <div class="card"><div class="hd"><h3>No file handy?</h3></div><div class="bd stack small"><p style="margin:0">Load a sample Nashik lead list with 16 rows, including a bad number, a duplicate, a DNC number and missing consent, to see validation at work.</p><button class="btn pri" data-act="impSample">Load sample lead list</button><div class="divider"></div><b>Columns we recognise</b><div class="muted">Name · Mobile · Area · Property type · Monthly bill · Source · Language · Consent · Remarks. Headers in Marathi/Hindi (नाव, मोबाईल, बिल) also work.</div></div></div></div>
      ${hist.length ? `<div class="card"><div class="hd"><h2>Previous imports</h2></div><div class="tbl-wrap"><table class="t"><thead><tr><th>When</th><th>Batch</th><th>Rows</th><th>Imported</th><th>Updated</th><th>Rejected</th></tr></thead><tbody>${hist.map((x) => `<tr><td class="small mono">${U.fmtDT(x.at)}</td><td>${h(x.batch)}</td><td class="mono">${x.rows}</td><td class="mono">${x.created}</td><td class="mono">${x.updated}</td><td class="mono">${x.rejected}</td></tr>`).join('')}</tbody></table></div></div>` : ''}`;
    const recs = im.recs; const c = { ok: 0, warn: 0, error: 0 }; recs.forEach((r) => c[r.level]++);
    const fields = [['name', 'Name'], ['phone', 'Mobile *'], ['area', 'Area'], ['type', 'Property type'], ['bill', 'Monthly bill'], ['source', 'Source'], ['lang', 'Language'], ['consent', 'Consent'], ['notes', 'Remarks']];
    const callable = recs.filter((r) => r.level !== 'error' && r.consent !== false && r.consent !== null).length;
    return `<div class="phead"><div class="grow"><h1>Import · ${h(im.fileName)}</h1><p>${recs.length} rows found. Check the column mapping and fix or skip rows marked red.</p></div><button class="btn ghost" data-act="impCancel">Cancel</button></div>
      <div class="card"><div class="hd"><h3>1 · Match your columns</h3>${im.sheets && im.sheets.length > 1 ? `<select class="i" style="width:auto" data-chg="impSheet" aria-label="Sheet">${opts(im.sheets, im.sheet)}</select>` : ''}</div><div class="bd"><div class="fgrid">${fields.map(([k, t]) => `<label class="f">${t}<select class="i" data-chg="impMap" data-k="${k}" id="im_${k}">${opts(im.headers.map((hd, i) => ({ v: i, t: hd || 'Column ' + (i + 1) })), im.map[k] != null ? im.map[k] : '', '— not in file —')}</select></label>`).join('')}</div></div></div>
      <div class="card"><div class="hd"><h3>2 · Check rows</h3><span class="pill good">${c.ok} ready</span><span class="pill sun">${c.warn} warnings</span><span class="pill bad">${c.error} will be skipped</span></div>
        <div class="tbl-wrap" style="max-height:420px;overflow:auto"><table class="t"><thead><tr><th>Row</th><th>Name</th><th>Mobile (cleaned)</th><th>Area</th><th>Type</th><th>Bill</th><th>Source</th><th>Consent</th><th>Check</th></tr></thead><tbody>
        ${recs.map((r) => `<tr><td class="mono small">${r.row}</td><td>${h(r.name || '—')}</td><td class="mono small">${r.phone ? h(r.phone) : `<span style="color:var(--bad)">${h(r.rawPhone)}</span>`}</td><td class="small">${h(r.area || '—')}</td><td class="small">${h(r.type)}</td><td class="mono small">${r.bill ? U.inr(r.bill) : '—'}</td><td class="small">${h(r.source)}</td><td class="small">${r.consent === true ? 'Yes' : r.consent === 'implied' ? 'Enquiry' : r.consent === false ? 'No' : '?'}</td><td><span class="pill ${r.level === 'ok' ? 'good' : r.level === 'warn' ? 'sun' : 'bad'}">${r.level === 'ok' ? 'OK' : r.level === 'warn' ? 'Check' : 'Skip'}</span> <span class="xs muted">${h(r.issues.join(' · '))}</span></td></tr>`).join('')}</tbody></table></div></div>
      <div class="card"><div class="hd"><h3>3 · Import &amp; call</h3></div><div class="bd stack"><div class="fgrid"><label class="f">Batch name<input class="i" id="im_batch" data-chg="impOpt" data-k="batch" value="${h(im.batch)}"></label><label class="f">Calling agent<select class="i" id="im_agent" data-chg="impOpt" data-k="agent">${opts([{ v: 'auto', t: 'Automatic (by lead type)' }].concat(S.state.agents.map((a) => ({ v: a.id, t: a.name + ' · ' + a.useCase }))), im.agent)}</select></label></div>
        ${(() => { const used = new Set(Object.values(im.map).filter((v) => v != null)); const ex = im.headers.filter((hd, i) => hd && !used.has(i)); return ex.length ? `<label class="row small"><input type="checkbox" id="im_keep" data-chg="impOpt" data-k="keepExtra" ${im.keepExtra ? 'checked' : ''}> Keep the other ${ex.length} column${ex.length > 1 ? 's' : ''} on each lead (${h(ex.slice(0, 5).join(', '))}${ex.length > 5 ? '…' : ''})</label>` : ''; })()}
        <label class="row small"><input type="checkbox" id="im_call" data-chg="impOpt" data-k="callNow" ${im.callNow ? 'checked' : ''}> Start AI calling right after import (${callable} leads with consent or an enquiry source)</label>
        <p class="xs muted" style="margin:0">Leads already in the CRM are updated, not duplicated. Rows without consent are imported for WhatsApp/brochure only and are never called. Owners are assigned by area automatically.</p>
        <div class="row"><button class="btn pri" data-act="impGo" ${c.ok + c.warn ? '' : 'disabled'}>${I('upload')}Import ${c.ok + c.warn} leads${im.callNow ? ' & start calling' : ''}</button></div></div></div>`;
  };
  Object.assign(A.acts, {
    impFile: (el) => { const f = el.files && el.files[0]; if (f) readFile(f); },
    impSample: () => parseSheet(SAMPLE, 'Sample_Nashik_Leads.xlsx'),
    impCancel: () => { A.imp = null; render(); },
    impSheet: (el) => { const ws = A.impWb.Sheets[el.value]; const name = A.imp.fileName; const sheets = A.imp.sheets; parseSheet(XL().utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' }), name); A.imp.sheets = sheets; A.imp.sheet = el.value; render(); },
    impMap: (el) => { A.imp.map[el.dataset.k] = el.value === '' ? null : Number(el.value); validateImp(); render(); },
    impOpt: (el) => { A.imp[el.dataset.k] = el.type === 'checkbox' ? el.checked : el.value; if (el.type === 'checkbox') render(); },
    dlTemplate: async () => { if (!XL()) return toast('Excel library did not load'); const ok = await saveFile('Solaris_Lead_Import_Template.xlsx', wbBlob([['Leads', SAMPLE.slice(1, 4).map((r) => Object.fromEntries(SAMPLE[0].map((k, i) => [k, r[i]])))]])); if (ok) toast('Template saved'); },
    impGo: () => {
      const im = A.imp; const st = S.state; let created = 0, updated = 0, rejected = 0; const toCall = [];
      im.recs.forEach((r) => {
        if (r.level === 'error') { rejected++; return; }
        let l = r.existingId ? S.lead(r.existingId) : null;
        const raw = im.rows[r.row - 2] || []; const used = new Set(Object.values(im.map).filter((v) => v != null)); const cf = {}, extra = {};
        if (im.keepExtra) im.headers.forEach((hd, i) => { if (used.has(i) || !hd) return; const v = String(raw[i] == null ? '' : raw[i]).trim(); if (!v) return; const m = (st.settings.customFields || []).find((c) => c.label.toLowerCase() === hd.toLowerCase() || hd.toLowerCase().includes(c.label.toLowerCase().split(' (')[0])); if (m) cf[m.key] = v; else extra[hd] = v; });
        const src = D.SOURCES.includes(r.source) ? r.source : 'Excel import';
        if (l) { Object.assign(l, { area: l.area || r.area, bill: l.bill || r.bill, type: l.type || r.type }); l.cf = Object.assign({}, cf, l.cf || {}); l.extra = Object.assign({}, extra, l.extra || {}); (l.tags = l.tags || []).push(im.batch); updated++; S.log(l.id, 'import', 'Updated from Excel: ' + im.batch); }
        else {
          l = { id: U.uid('ld'), name: r.name || 'Unknown', contact: '', phone: r.phone, area: D.AREAS.some((a) => a.en === r.area) ? r.area : r.area, type: r.type, bill: r.bill, source: src, lang: r.lang, consent: r.consent === true || r.consent === 'implied' ? true : r.consent === false ? false : null, stage: 'New', temp: 'COLD', score: 0, objections: [], notes: r.notes ? [{ t: r.notes, at: Date.now(), by: 'Excel' }] : [], createdAt: Date.now(), tags: [im.batch], batch: im.batch, origSource: r.source, cf, extra };
          l.owner = routeOwner(l); l.agentId = im.agent !== 'auto' ? im.agent : (['Society', 'Factory', 'Shop', 'Institution'].includes(l.type) ? SOL.roleAgent('commercial') : SOL.roleAgent('outbound'));
          if (l.bill) { const z = sizing(l); l.sizeKw = z.kw; l.estValue = z.cost; }
          l.score = scoreLead(l); l.temp = tempOf(l.score, l);
          st.leads.unshift(l); created++; S.log(l.id, 'import', 'Imported from Excel: ' + im.batch + ' · routed to ' + person(l.owner).name);
        }
        if (l.consent === true && !l.dnc) toCall.push(l.id);
        else if (!l.dnc) st.followups.push({ id: U.uid('fu'), leadId: l.id, type: 'Sales call', dueAt: Date.now() + U.DAY, owner: l.owner, status: 'pending', note: 'Confirm consent before AI calling', auto: true });
      });
      (st.imports = st.imports || []).unshift({ at: Date.now(), batch: im.batch, rows: im.recs.length, created, updated, rejected });
      const call = im.callNow && toCall.length; const agent = im.agent;
      A.imp = null; S.change('import');
      toast(created + ' imported · ' + updated + ' updated · ' + rejected + ' skipped');
      if (call) { Camp.create(im.batch, agent, toCall, { speed: 3 }); A.go('campaigns'); } else A.go('leads');
    }
  });
  document.addEventListener('dragover', (e) => { const d = e.target.closest && e.target.closest('#drop'); if (d) { e.preventDefault(); d.classList.add('over'); } });
  document.addEventListener('dragleave', (e) => { const d = e.target.closest && e.target.closest('#drop'); if (d) d.classList.remove('over'); });
  document.addEventListener('drop', (e) => { const d = e.target.closest && e.target.closest('#drop'); if (d) { e.preventDefault(); d.classList.remove('over'); const f = e.dataTransfer.files && e.dataTransfer.files[0]; if (f) readFile(f); } });

  /* ================= CAMPAIGNS ================= */
  A.cb = { name: '', agent: 'auto', aud: 'new', speed: 3 };
  A.views.campaigns = function () {
    const st = S.state; const draft = A.campaignDraft;
    const aud = {
      new: { t: 'New leads never called', f: (l) => l.stage === 'New' && !st.calls.some((c) => c.leadId === l.id) },
      noans: { t: 'No answer in last 7 days', f: (l) => l.stage === 'New' && st.calls.some((c) => c.leadId === l.id && c.outcome === 'No answer') },
      warm: { t: 'WARM & NURTURE leads, no visit yet', f: (l) => ['WARM', 'NURTURE'].includes(l.temp) && !l.visitBooked && !['Won', 'Lost'].includes(l.stage) },
      quote: { t: 'Quotation sent, waiting > 2 days', f: (l) => l.stage === 'Quotation Sent' && (l.lastContact || 0) < Date.now() - 2 * U.DAY },
      lost: { t: 'Lost leads (win-back)', f: (l) => l.stage === 'Lost' }
    };
    const audIds = draft ? draft.leadIds : st.leads.filter((l) => !l.dnc && l.consent !== false && aud[A.cb.aud].f(l)).map((l) => l.id);
    const running = st.campaigns.filter((c) => c.status === 'Running');
    return `<div class="phead"><div class="grow"><h1>Campaigns</h1><p>Outbound AI calling to leads who enquired or consented. Calls run ${st.settings.maxConcurrent} at a time; every result lands in the CRM with follow-ups created automatically.</p></div>${running.length ? `<button class="btn" data-act="go" data-v="live">${I('headset')}Watch ${Live.calls.length} live</button>` : ''}</div>
      <div class="card"><div class="hd"><h2>${draft ? 'Call the ' + draft.leadIds.length + ' selected leads' : 'New campaign'}</h2>${draft ? '<button class="btn sm ghost" data-act="cbClear">Choose audience instead</button>' : ''}</div><div class="bd stack"><div class="fgrid">
        <label class="f">Name<input class="i" id="cb_name" data-chg="cbSet" data-k="name" value="${h(A.cb.name)}" placeholder="e.g. Meta leads · Sept week 4"></label>
        ${draft ? '' : `<label class="f">Audience<select class="i" id="cb_aud" data-chg="cbSet" data-k="aud" data-rr="1">${opts(Object.keys(aud).map((k) => ({ v: k, t: aud[k].t })), A.cb.aud)}</select></label>`}
        <label class="f">Agent<select class="i" id="cb_agent" data-chg="cbSet" data-k="agent">${opts([{ v: 'auto', t: 'Automatic (by lead type)' }].concat(st.agents.filter((a) => a.direction !== 'Inbound').map((a) => ({ v: a.id, t: a.name }))), A.cb.agent)}</select></label>
        <label class="f">Demo speed<select class="i" id="cb_speed" data-chg="cbSet" data-k="speed">${opts([{ v: 1, t: 'Real time' }, { v: 3, t: '3× faster' }, { v: 6, t: '6× faster' }], A.cb.speed)}</select></label></div>
        <div class="row"><span class="pill info">${audIds.length} leads</span><span class="small muted">DNC numbers and leads without consent are skipped automatically.</span><span class="sp"></span><button class="btn pri" data-act="cbStart" ${audIds.length ? '' : 'disabled'}>${I('mega')}Start calling</button></div></div></div>
      ${st.campaigns.map((c) => {
        const done = c.done.length, tot = c.leadIds.length; const res = {}; Object.values(c.results).forEach((r) => { res[r] = (res[r] || 0) + 1; });
        const live = Live.calls.filter((l) => l.campaignId === c.id);
        return `<div class="card"><div class="hd"><h3>${h(c.name)}</h3><span class="pill ${c.status === 'Running' ? 'HOT' : c.status === 'Completed' ? 'good' : 'mute'}">${c.status === 'Running' ? '<span class="dot live"></span>' : ''}${h(c.status)}</span><span class="small muted">${c.agentId === 'auto' ? 'Automatic agent' : h(agentById(c.agentId).name)} · started ${U.rel(c.createdAt)}</span>
          ${c.status === 'Running' ? `<button class="btn sm" data-act="cpPause" data-id="${c.id}">Pause</button>` : c.status === 'Paused' ? `<button class="btn sm pri" data-act="cpResume" data-id="${c.id}">Resume</button>` : ''}</div>
          <div class="bd stack"><div class="row nw"><div class="bar" style="flex:1;height:10px"><i style="width:${tot ? done / tot * 100 : 0}%"></i></div><span class="mono small">${done}/${tot}</span></div>
          <div class="row">${Object.keys(res).map((k) => `${outcomePill(k)}<span class="mono small" style="margin-right:8px">${res[k]}</span>`).join('') || '<span class="small muted">Dialling…</span>'}</div>
          ${live.length ? `<div class="small">${live.map((l) => `<span class="pill line"><span class="dot live"></span> ${h(leadName(l.leadId))}</span>`).join(' ')}</div>` : ''}</div></div>`;
      }).join('') || ''}`;
  };
  Object.assign(A.acts, {
    cbSet: (el) => { A.cb[el.dataset.k] = el.dataset.k === 'speed' ? Number(el.value) : el.value; if (el.dataset.rr) render(); },
    cbClear: () => { A.campaignDraft = null; render(); },
    cbStart: () => {
      const st = S.state; let ids;
      ids = A.campaignDraft ? A.campaignDraft.leadIds : null;
      if (!ids) { const f = { new: (l) => l.stage === 'New' && !st.calls.some((c) => c.leadId === l.id), noans: (l) => l.stage === 'New' && st.calls.some((c) => c.leadId === l.id && c.outcome === 'No answer'), warm: (l) => ['WARM', 'NURTURE'].includes(l.temp) && !l.visitBooked && !['Won', 'Lost'].includes(l.stage), quote: (l) => l.stage === 'Quotation Sent' && (l.lastContact || 0) < Date.now() - 2 * U.DAY, lost: (l) => l.stage === 'Lost' }[A.cb.aud]; ids = st.leads.filter((l) => !l.dnc && l.consent !== false && f(l)).map((l) => l.id); }
      const name = A.cb.name || (A.campaignDraft ? 'Selected leads' : { new: 'New leads', noans: 'No-answer retry', warm: 'Warm nurture', quote: 'Quotation follow-up', lost: 'Win-back' }[A.cb.aud]) + ' · ' + U.fmtDT(Date.now());
      Camp.create(name, A.cb.agent, ids, { speed: A.cb.speed }); A.campaignDraft = null; A.cb.name = ''; toast('Campaign started · ' + ids.length + ' leads');
    },
    cpPause: (el) => { const c = S.state.campaigns.find((x) => x.id === el.dataset.id); c.status = 'Paused'; S.change('campaigns'); },
    cpResume: (el) => { const c = S.state.campaigns.find((x) => x.id === el.dataset.id); c.status = 'Running'; Camp.pump(); }
  });

  /* ================= REPORTS ================= */
  A.rp = { days: 7 };
  A.views.reports = function () {
    const st = S.state, now = Date.now(), days = A.rp.days, from = days === 1 ? U.startOfDay(now) : now - days * U.DAY;
    const calls = st.calls.filter((c) => c.at >= from); const ans = calls.filter(SOL.answered);
    const leads = st.leads.filter((l) => l.createdAt >= from);
    const contacted = leads.filter((l) => l.answered || st.calls.some((c) => c.leadId === l.id && SOL.answered(c)));
    const qualified = leads.filter((l) => (l.score || 0) >= 50 || ['Site Survey', 'Quotation Sent', 'Negotiation', 'Won'].includes(l.stage));
    const visited = leads.filter((l) => l.visitBooked || st.visits.some((v) => v.leadId === l.id));
    const quoted = leads.filter((l) => ['Quotation Sent', 'Negotiation', 'Won'].includes(l.stage));
    const won = leads.filter((l) => l.stage === 'Won' && !l.existing);
    const mins = ans.reduce((s, c) => s + c.secs, 0) / 60; const cost = mins * st.settings.costPerMin;
    const nD = days === 1 ? 1 : days; const series = [];
    for (let i = Math.min(nD, 14) - 1; i >= 0; i--) { const d0 = U.startOfDay(now) - i * U.DAY; const cs = st.calls.filter((c) => c.at >= d0 && c.at < d0 + U.DAY); series.push({ label: new Date(d0).toLocaleDateString('en-IN', days > 7 ? { day: 'numeric' } : { weekday: 'short' }), vals: [cs.filter(SOL.answered).length, cs.filter((c) => !SOL.answered(c)).length] }); }
    const hours = Array.from({ length: 24 }, () => 0); calls.forEach((c) => hours[new Date(c.at).getHours()]++);
    const hs = st.settings; const hS = Number(hs.callingStart.slice(0, 2)), hE = Number(hs.callingEnd.slice(0, 2));
    const hourSeries = hours.map((v, i) => ({ label: i % 3 === 0 ? String(i) : '', vals: (i < hS || i >= hE) ? [0, v] : [v, 0] }));
    const src = {}; st.leads.filter((l) => l.createdAt >= from).forEach((l) => { const s = src[l.source] = src[l.source] || { n: 0, c: 0, q: 0, v: 0, w: 0 }; s.n++; if (contacted.includes(l)) s.c++; if (qualified.includes(l)) s.q++; if (visited.includes(l)) s.v++; if (l.stage === 'Won') s.w++; });
    const obj = {}; leads.forEach((l) => (l.objections || []).forEach((o) => { obj[o] = (obj[o] || 0) + 1; }));
    const lang = { mr: 0, hi: 0, en: 0 }; ans.forEach((c) => { lang[c.lang] = (lang[c.lang] || 0) + 1; });
    const funnel = [['Leads', leads.length], ['Contacted', contacted.length], ['Qualified', qualified.length], ['Visit / meeting', visited.length], ['Quotation', quoted.length], ['Won', won.length]];
    const sales = st.team.filter((t) => t.role === 'Sales').map((t) => { const ls = st.leads.filter((l) => l.owner === t.id); return { t, n: ls.length, hot: ls.filter((l) => l.temp === 'HOT' && !['Won', 'Lost'].includes(l.stage)).length, v: st.visits.filter((v) => ls.some((l) => l.id === v.leadId) && v.status === 'Completed').length, w: ls.filter((l) => l.stage === 'Won').length, val: ls.filter((l) => l.stage === 'Won').reduce((s, l) => s + (l.estValue || 0), 0), od: st.followups.filter((f) => f.owner === t.id && f.status === 'pending' && f.dueAt < now).length }; });
    return `<div class="phead"><div class="grow"><h1>Reports</h1><p>Where leads come from, what the AI achieved, which objections come up, and how each salesperson converts.</p></div>${[[1, 'Today'], [7, '7 days'], [30, '30 days']].map(([d, t]) => `<button class="chip ${days === d ? 'on' : ''}" data-act="rpDays" data-d="${d}">${t}</button>`).join('')}<button class="btn" data-act="exportAll">${I('dl')}Export Excel</button></div>
      <div class="grid g4"><div class="card kpi"><span class="eyebrow">New leads</span><span class="v">${leads.length}</span><span class="d">${Object.keys(src).length} sources</span></div><div class="card kpi"><span class="eyebrow">AI calls</span><span class="v">${calls.length}</span><span class="d">${calls.length ? Math.round(ans.length / calls.length * 100) : 0}% connected · ${Math.round(mins)} talk-min</span></div><div class="card kpi"><span class="eyebrow">Qualified → visit</span><span class="v">${qualified.length ? Math.round(visited.length / qualified.length * 100) : 0}%</span><span class="d">${visited.length} visits / meetings booked</span></div><div class="card kpi"><span class="eyebrow">Est. AI calling cost</span><span class="v">${U.inr(cost)}</span><span class="d">at ₹${st.settings.costPerMin}/min (estimate) · ${visited.length ? U.inr(cost / visited.length) : '—'} per visit</span></div></div>
      <div class="grid g2"><div class="card"><div class="hd"><h2>Funnel</h2><span class="small muted">leads created in period</span></div><div class="bd stack">${A.hbars(funnel.map((f, i) => [f[0], f[1], ['var(--accent)', 'var(--accent)', 'var(--nurture)', 'var(--sun)', 'var(--warm)', 'var(--good)'][i], f[1] + (i && funnel[0][1] ? ' · ' + Math.round(f[1] / funnel[0][1] * 100) + '%' : '')]), funnel[0][1])}</div></div>
        <div class="card"><div class="hd"><h2>Calls per day</h2></div><div class="bd">${A.barChart(series, { label: 'Calls per day' })}</div></div></div>
      <div class="grid g2"><div class="card"><div class="hd"><h2>When calls happen</h2><span class="row small muted"><span class="dot" style="background:var(--accent)"></span>office hours <span class="dot" style="background:var(--sun)"></span>outside ${h(hs.callingStart)}–${h(hs.callingEnd)}</span></div><div class="bd">${A.barChart(hourSeries, { label: 'Calls by hour', colors: ['var(--accent)', 'var(--sun)'], totals: false, h: 160 })}<p class="small muted" style="margin:6px 0 0">Evening and Sunday enquiries are answered by the AI instead of going to voicemail.</p></div></div>
        <div class="card"><div class="hd"><h2>Top objections</h2></div><div class="bd stack">${A.hbars(Object.entries(obj).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, v, 'var(--warm)'])) || '<span class="muted">No objections recorded.</span>'}<div class="divider"></div><div class="row small"><b>Languages spoken:</b> मराठी ${lang.mr} · हिंदी ${lang.hi} · English ${lang.en || 0}</div></div></div></div>
      <div class="card"><div class="hd"><h2>Lead sources</h2><span class="small muted">use this to decide ad spend</span></div><div class="tbl-wrap"><table class="t"><thead><tr><th>Source</th><th>Leads</th><th>Contacted</th><th>Qualified</th><th>Visits</th><th>Won</th></tr></thead><tbody>${Object.entries(src).sort((a, b) => b[1].n - a[1].n).map(([k, s]) => `<tr><td><b>${h(k)}</b></td><td class="mono">${s.n}</td><td class="mono">${s.c} <span class="muted xs">${Math.round(s.c / s.n * 100)}%</span></td><td class="mono">${s.q} <span class="muted xs">${Math.round(s.q / s.n * 100)}%</span></td><td class="mono">${s.v}</td><td class="mono">${s.w}</td></tr>`).join('')}</tbody></table></div></div>
      <div class="grid g2"><div class="card"><div class="hd"><h2>AI agents</h2></div><div class="tbl-wrap"><table class="t"><thead><tr><th>Agent</th><th>Calls</th><th>Connected</th><th>Avg length</th><th>Visits / transfers</th></tr></thead><tbody>${st.agents.map((a) => { const cs = calls.filter((c) => c.agentId === a.id); const an = cs.filter(SOL.answered); return `<tr><td><b>${h(a.name)}</b></td><td class="mono">${cs.length}</td><td class="mono">${an.length}</td><td class="mono">${U.dur(an.length ? an.reduce((s, c) => s + c.secs, 0) / an.length : 0)}</td><td class="mono">${cs.filter((c) => ['Visit booked', 'Meeting booked', 'Transferred'].includes(c.outcome)).length}</td></tr>`; }).join('')}</tbody></table></div></div>
        <div class="card"><div class="hd"><h2>Sales team</h2><span class="small muted">all time</span></div><div class="tbl-wrap"><table class="t"><thead><tr><th>Salesperson</th><th>Leads</th><th>Hot open</th><th>Surveys done</th><th>Won</th><th>Won value</th><th>Overdue</th></tr></thead><tbody>${sales.map((s) => `<tr><td><b>${h(s.t.name)}</b><div class="xs muted">${h((s.t.areas || []).slice(0, 3).join(', '))}</div></td><td class="mono">${s.n}</td><td class="mono">${s.hot}</td><td class="mono">${s.v}</td><td class="mono">${s.w}</td><td class="mono">${U.inrShort(s.val)}</td><td class="mono" style="color:${s.od ? 'var(--bad)' : 'inherit'}">${s.od}</td></tr>`).join('')}</tbody></table></div></div></div>`;
  };
  A.acts.rpDays = (el) => { A.rp.days = Number(el.dataset.d); render(); };
  A.acts.exportAll = async () => {
    if (!XL()) return toast('Excel library did not load'); const st = S.state;
    const calls = st.calls.map((c) => ({ When: new Date(c.at).toLocaleString('en-IN'), Lead: leadName(c.leadId), Mobile: (S.lead(c.leadId) || {}).phone, Agent: agentById(c.agentId).name, Direction: c.dir, Language: U.LANG[c.lang], 'Duration (s)': c.secs, Outcome: c.outcome, Score: c.score, Summary: c.summary, Transcript: c.transcript.map((t) => (t.s === 'ai' ? 'AI' : t.s === 'cust' ? 'Customer' : t.s) + ': ' + t.t).join('\n').slice(0, 32000) }));
    const fus = st.followups.map((f) => ({ Due: new Date(f.dueAt).toLocaleString('en-IN'), Type: f.type, Lead: leadName(f.leadId), Owner: nameOf(f.owner), Status: f.status, Note: f.note || '', Automatic: f.auto ? 'Yes' : '' }));
    const vis = st.visits.map((v) => ({ When: new Date(v.at).toLocaleString('en-IN'), Type: v.kind, Lead: leadName(v.leadId), With: nameOf(v.with), Address: v.address, Status: v.status, Notes: v.notes || '' }));
    const ok = await saveFile('Solaris_AI_OS_Report_' + new Date().toISOString().slice(0, 10) + '.xlsx', wbBlob([['Leads', A.exportLeadsRows(st.leads)], ['Calls & transcripts', calls], ['Follow-ups', fus], ['Site visits', vis]]));
    if (ok) toast('Report exported');
  };

  /* ================= SETTINGS ================= */
  A.views.settings = function () {
    const st = S.state, s = st.settings;
    const inp = (k, o) => `<input class="i" id="st_${k}" data-chg="stF" data-k="${k}" value="${h(s[k])}" ${o || ''}>`;
    return `<div class="phead"><div class="grow"><h1>Settings</h1><p>Business details, pricing assumptions used in estimates, team and routing, WhatsApp templates, DNC list and demo controls.</p></div></div>
      <div class="grid g2"><div class="card"><div class="hd"><h2>Business</h2></div><div class="bd"><div class="fgrid"><label class="f">Company${inp('company')}</label><label class="f">City${inp('city')}</label><label class="f">Business number${inp('businessNumber')}</label><label class="f">Outbound calls from${inp('callingStart', 'type="time"')}</label><label class="f">Outbound calls until${inp('callingEnd', 'type="time"')}</label></div></div></div>
        <div class="card"><div class="hd"><h2>Estimate assumptions</h2><span class="small muted">indicative · Solaris to confirm</span></div><div class="bd stack"><div class="fgrid"><label class="f">Home tariff ₹/unit${inp('tariffHome', 'type="number" step="0.5" data-num="1"')}</label><label class="f">Commercial tariff ₹/unit${inp('tariffCommercial', 'type="number" step="0.5" data-num="1"')}</label><label class="f">Home price ₹/kW (DCR)${inp('priceHome', 'type="number" step="1000" data-num="1"')}</label><label class="f">Commercial price ₹/kW${inp('priceCommercial', 'type="number" step="1000" data-num="1"')}</label><label class="f">AI calling cost ₹/min (est.)${inp('costPerMin', 'type="number" step="0.5" data-num="1"')}</label></div><p class="xs muted" style="margin:0">Sizing uses ~120 units per kW per month for Nashik. Subsidy follows PM Surya Ghar: ₹30,000/kW up to 2 kW, ₹18,000 for the 3rd kW, max ₹78,000; societies ₹18,000/kW for common facilities.</p></div></div></div>
      <div class="card"><div class="hd"><h2>Team &amp; lead routing</h2><span class="small muted">leads are assigned by area; factories/shops go to the commercial salesperson</span><button class="btn sm" data-act="tmAdd">${I('plus')}Add person</button></div><div class="tbl-wrap"><table class="t"><thead><tr><th>Name</th><th>Role</th><th>Mobile</th><th>Areas / zones (comma-separated)</th><th>Segments</th><th>Active</th></tr></thead><tbody>${st.team.map((t, i) => `<tr><td><input class="i" id="tm_${i}_n" data-chg="tmF" data-i="${i}" data-k="name" value="${h(t.name)}"></td><td><select class="i" id="tm_${i}_r" data-chg="tmF" data-i="${i}" data-k="role">${opts(['Owner', 'Sales', 'Surveyor', 'Manager'], t.role)}</select></td><td><input class="i mono" id="tm_${i}_p" data-chg="tmF" data-i="${i}" data-k="phone" value="${h(t.phone)}"></td><td><input class="i" id="tm_${i}_a" data-chg="tmF" data-i="${i}" data-k="areas" data-list="1" value="${h((t.areas || []).join(', '))}"></td><td><input class="i" id="tm_${i}_s" data-chg="tmF" data-i="${i}" data-k="segments" data-list="1" value="${h((t.segments || []).join(', '))}"></td><td><label class="switch"><input type="checkbox" id="tm_${i}_x" data-chg="tmF" data-i="${i}" data-k="active" ${t.active ? 'checked' : ''}><span></span></label></td></tr>`).join('')}</tbody></table></div><div class="bd xs muted">Sample team names. Replace with Solaris staff before the demo. Areas: ${h(D.AREAS.map((a) => a.en).join(', '))}. Surveyor zones: West, East, North, Industrial.</div></div>
      <div class="grid g2"><div class="card"><div class="hd"><h2>WhatsApp templates</h2><span class="small muted">must be approved by Meta before go-live</span></div><div class="bd stack">${s.waTemplates.map((t, i) => `<label class="f">${h(t.name)}<textarea class="i dv" id="wa_${i}" data-chg="waF" data-i="${i}">${h(t.body)}</textarea></label>`).join('')}<p class="xs muted" style="margin:0">Variables: {name} {bill} {kw} {yearSave} {date} {time} {surveyor} {sales}</p></div></div>
        <div class="stack" style="gap:16px"><div class="card"><div class="hd"><h2>Do-not-call list</h2><span class="pill bad">${st.dnc.length}</span></div><div class="bd stack"><div class="row nw"><input class="i" id="dncIn" placeholder="Add mobile number" data-enter="dncAdd"><button class="btn" data-act="dncAdd">Add</button></div><div class="stack" style="max-height:180px;overflow:auto">${st.dnc.map((p) => `<div class="row nw small"><span class="mono sp">${h(p)}</span><button class="btn sm ghost" data-act="dncDel" data-p="${h(p)}">Remove</button></div>`).join('')}</div></div></div>
          <div class="card"><div class="hd"><h2>Demo controls</h2></div><div class="bd stack"><div class="fgrid"><label class="f">Live call speed<select class="i" id="st_simSpeed" data-chg="stF" data-k="simSpeed" data-num="1">${opts([{ v: 1, t: 'Real time' }, { v: 1.5, t: '1.5×' }, { v: 2, t: '2×' }], s.simSpeed)}</select></label><label class="f">Parallel campaign calls<select class="i" id="st_mc" data-chg="stF" data-k="maxConcurrent" data-num="1">${opts([1, 2, 3, 4], s.maxConcurrent)}</select></label></div>
            <div class="row"><button class="btn" data-act="backup">${I('dl')}Save backup (.json)</button><label class="btn" for="restoreIn">${I('upload')}Restore backup</label><input type="file" id="restoreIn" accept=".json" hidden data-chg="restore"></div>
            <div class="row"><button class="btn danger" data-act="resetDemo">${A.confirmReset ? 'Click again to erase and reload sample data' : 'Reset demo data'}</button></div>
            <p class="xs muted" style="margin:0">Demo data is saved in this browser only. Use the same browser and device for all demo days, or save a backup and restore it elsewhere.</p></div></div></div></div>
      <div class="card"><div class="hd"><h2>Connections for go-live</h2><span class="small muted">set up during the 3-week build</span></div><div class="tbl-wrap"><table class="t"><thead><tr><th>Piece</th><th>In this demo</th><th>At go-live</th></tr></thead><tbody>
        <tr><td><b>Phone line</b></td><td><span class="pill mute">Simulator</span></td><td>Indian business number (DID) with inbound, outbound, live transfer and recording via a cloud telephony provider; TRAI-compliant series</td></tr>
        <tr><td><b>Speech recognition</b></td><td><span class="pill mute">You type as the caller</span></td><td>Streaming Marathi/Hindi/English speech-to-text for the live transcript</td></tr>
        <tr><td><b>AI brain</b></td><td><span class="pill ${AI.sample ? 'good' : 'mute'}">${AI.sample ? 'Claude (test calls)' : 'Script engine'}</span></td><td>LLM with Solaris' script, knowledge base and guardrails</td></tr>
        <tr><td><b>Voice</b></td><td><span class="pill mute">Browser voice</span></td><td>Natural Indian-language neural voices (male/female per agent)</td></tr>
        <tr><td><b>Recordings</b></td><td><span class="pill mute">Transcript re-voiced</span></td><td>Actual call audio stored per call, playable from the lead</td></tr>
        <tr><td><b>WhatsApp</b></td><td><span class="pill mute">Logged only</span></td><td>WhatsApp Business API with Meta-approved templates, opted-in numbers only</td></tr>
        <tr><td><b>CRM data</b></td><td><span class="pill mute">This browser</span></td><td>Hosted database with owner + sales logins, daily backup, Excel export anytime</td></tr></tbody></table></div></div>`;
  };
  Object.assign(A.acts, {
    stF: (el) => { S.state.settings[el.dataset.k] = el.dataset.num ? Number(el.value) : el.value; S.change('settings'); },
    tmF: (el) => { const t = S.state.team[Number(el.dataset.i)]; t[el.dataset.k] = el.type === 'checkbox' ? el.checked : el.dataset.list ? el.value.split(',').map((x) => x.trim()).filter(Boolean) : el.value; S.change('team'); },
    tmAdd: () => { S.state.team.push({ id: U.uid('u'), name: 'New person', role: 'Sales', phone: '+91 ', areas: [], segments: ['Home'], active: true }); S.change('team'); },
    waF: (el) => { S.state.settings.waTemplates[Number(el.dataset.i)].body = el.value; S.save(); },
    dncAdd: () => { const inp = document.getElementById('dncIn'); const p = U.normPhone(inp.value); if (!p) return toast('Enter a valid mobile number'); if (!S.state.dnc.includes(p)) S.state.dnc.push(p); S.state.leads.forEach((l) => { if (l.phone === p) { l.dnc = true; l.temp = 'DNC'; } }); inp.value = ''; S.change('dnc'); toast(p + ' will never be called'); },
    dncDel: (el) => { S.state.dnc = S.state.dnc.filter((x) => x !== el.dataset.p); S.change('dnc'); },
    resetDemo: () => { if (!A.confirmReset) { A.confirmReset = true; render(); setTimeout(() => { A.confirmReset = false; render(); }, 5000); return; } A.confirmReset = false; Live.stopAll(); S.reset(); A.drawer = null; A.go('overview'); toast('Demo data reset'); },
    backup: async () => { const ok = await saveFile('Solaris_AI_OS_backup_' + new Date().toISOString().slice(0, 10) + '.json', JSON.stringify(S.state)); if (ok) toast('Backup saved'); },
    restore: (el) => { const f = el.files && el.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { try { const st = JSON.parse(r.result); if (!st || st.v !== 1 || !Array.isArray(st.leads)) throw 0; Live.stopAll(); S.state = st; S.change('all'); toast('Backup restored · ' + st.leads.length + ' leads'); } catch (e) { toast('That file is not a Solaris AI OS backup'); } }; r.readAsText(f); }
  });

  /* ================= DEMO GUIDE ================= */
  A.views.guide = function () {
    const P = [
      ['Ad leads go cold', 'Meta and Google leads are called back hours later, after 2–3 other installers have already spoken to them.', 'AI calls every new lead within 2 minutes in calling hours; inbound enquiries are answered 24×7.'],
      ['Missed calls after hours', 'Enquiries at 8 pm, on Sundays or while the team is on a roof go to voicemail and are never returned.', 'Sakhi answers every inbound call and missed-call callback, day or night, in Marathi, Hindi or English.'],
      ['Sales time spent on non-buyers', 'Tenants, very small bills and "just asking" callers take the same time as serious buyers.', 'Qualification questions and lead score (0–100) separate HOT from NURTURE before a salesperson is involved.'],
      ['Same questions all day', 'Subsidy amount, monsoon output, EMI, process time, warranty.', 'Approved FAQ and objection answers, spoken consistently every time; unknown questions go to a human.'],
      ['Wrong system size and rejections', 'Since Feb 2026 the MSEDCL portal limits subsidised capacity by the last 12 months of consumption.', 'The agent asks for 12-month bills / consumer number on every call and flags it on the lead before the survey.'],
      ['Price objections after ALMM List-II', 'From June 2026 subsidised projects need domestic-cell modules, which raises prices.', 'EMI and payback answers, subsidy maths per lead, free survey offered as the next step.'],
      ['Follow-ups lost in WhatsApp and diaries', 'Callbacks promised on the phone are forgotten; nobody knows who follows up whom.', 'Every "call me Friday" becomes a dated follow-up. Automatic cadence: WhatsApp, AI calls on Day 1/3, salesperson Day 7, 30/90-day nurture.'],
      ['Survey no-shows and unprepared visits', 'Surveyors travel and the customer is not home or has no bills ready.', 'WhatsApp T-24 h, AI confirmation call T-3 h, WhatsApp T-2 h; lead brief for the surveyor; no-shows rebooked by AI.'],
      ['Societies and factories need a different pitch', 'Society deals need committee approval; factories want a senior person immediately.', 'Meera handles RWA subsidy (₹18,000/kW) and committee meetings; hot factory leads are live-transferred to the commercial salesperson.'],
      ['Owner\'s phone rings with subsidy status calls', 'Customers after installation keep asking about net meter and subsidy credit.', 'Seva answers from the after-sale tracker, raises a ticket when unsure and never guesses.'],
      ['No visibility for the owner', 'Which ads work, which objections come up, which salesperson converts.', 'Live dashboard, source report, objection report, sales leaderboard, Excel export.'],
      ['Messy Excel lead lists', 'Expo, IndiaMART and JustDial lists with duplicates, bad numbers and no consent.', 'Import cleans numbers, removes duplicates, checks DNC and consent, routes by area, then calls.'],
      ['Compliance risk', 'Automated calls without disclosure or consent can lead to complaints and penalties.', 'AI and recording disclosure on every call, consent-only outbound, calling window, automatic DNC.']
    ];
    const DAYS = [
      ['Kick-off and first impression', 'Overview → Simulate inbound call (Marathi) → watch the CRM fill itself → open the lead, play the recording. Then a Hindi factory call that is live-transferred.', 'Collect from Solaris: price ranges per kW, EMI partner, top 15 customer questions, sales team names and areas, one real lead list (with consent).'],
      ['Make it speak like Solaris', 'Voice agents → edit Sakhi and Arjun with Solaris\' own pricing, FAQs and objection answers. Solaris staff do test calls acting as customers in Marathi and Hindi.', 'Agree the opening line, the qualification questions and when to hand over to a human.'],
      ['Excel leads to booked visits', 'Excel lead import with Solaris\' list → validation → campaign → watch calls go live → leads scored, visits and callbacks created automatically.', 'Solaris checks that the questions and scores match how their salespeople judge a lead.'],
      ['Follow-ups and site visits', 'Follow-ups tab (overdue, today, automatic rules) and the visit calendar: book, reschedule, reminders, no-show rebooking, surveyor brief.', 'Sales team uses the CRM for the day: update stages, add notes, complete surveys.'],
      ['Manager control', 'Live calls: transfer to sales, whisper to the AI, take over. Meera for a housing society committee meeting and a MIDC factory.', 'Owner tries a whisper and a take-over; decide transfer rules per area.'],
      ['Owner\'s view', 'Reports: funnel, sources, hour-of-day, objections, sales leaderboard; Excel export. After-sale tracker and Seva for subsidy status calls.', 'Owner lists the numbers they want every morning.'],
      ['Review and go-live plan', 'Walk through what changed during the week. Show the go-live connections list in Settings and the 3-week timeline from the quotation.', 'Decide: business number and KYC, WhatsApp Business API, final scripts, logins. Sign the quotation.']
    ];
    return `<div class="phead"><div class="grow"><div class="eyebrow">Move.AI × Solaris, Nashik</div><h1>Demo guide</h1><p>A 7-day demo plan, the problems this solves for a Nashik solar installer, and exactly what is live versus simulated in this demo.</p></div></div>
      <div class="card"><div class="hd"><h2>7-day demo plan</h2><span class="small muted">about 30–45 minutes per day with the Solaris team</span></div><div class="bd guide">${DAYS.map((d, i) => `<div class="day"><div class="n">${i + 1}</div><div class="stack" style="gap:4px"><h3>Day ${i + 1} · ${h(d[0])}</h3><div class="small"><b>Show:</b> ${h(d[1])}</div><div class="small muted"><b>With Solaris:</b> ${h(d[2])}</div></div></div>`).join('')}</div></div>
      <div class="card"><div class="hd"><h2>Solaris' problems and how the system answers them</h2></div><div class="tbl-wrap"><table class="t"><thead><tr><th>Problem</th><th>What happens today</th><th>In Solaris AI OS</th></tr></thead><tbody>${P.map((p) => `<tr><td><b>${h(p[0])}</b></td><td class="small">${h(p[1])}</td><td class="small">${h(p[2])}</td></tr>`).join('')}</tbody></table></div></div>
      <div class="grid g2"><div class="card"><div class="hd"><h2>Live in this demo</h2></div><div class="bd guide small"><ul><li>CRM: leads, scoring, stages, owners, notes, timeline, after-sale tracker</li><li>Excel import with cleaning, duplicate, DNC and consent checks</li><li>Follow-up scheduling and automatic rules, site-visit calendar with reminders</li><li>Multiple voice agents with editable scripts, questions, objections, FAQs, hand-off rules</li><li>Test calls: ${AI.sample ? 'Claude generates the agent\'s replies from its configuration and extracts CRM fields at the end' : 'the script engine follows the configured flow (Claude replies when opened inside Claude)'}</li><li>Voice: replies and recordings are spoken with this device's Marathi/Hindi voice</li><li>Reports and Excel export</li></ul></div></div>
        <div class="card"><div class="hd"><h2>Simulated in this demo</h2></div><div class="bd guide small"><ul><li>No real phone calls: live and campaign calls play scripted Marathi/Hindi conversations</li><li>Recordings are the transcript re-voiced by the browser, not real audio</li><li>WhatsApp messages are logged on the timeline, not sent</li><li>Data is stored in this browser; use Settings → backup to move it</li><li>Sample team names, leads and numbers are fictional</li></ul><p class="small muted">Say this up front. It builds trust, and everything simulated is covered in the 3-week build.</p></div></div></div>
      <div class="card"><div class="hd"><h2>Facts used by the agents (as of Sept 2026)</h2><span class="small muted">confirm with Solaris before go-live</span></div><div class="bd guide small"><ul>${Object.values(D.KNOWLEDGE).map((k) => `<li>${h(k)}</li>`).join('')}</ul></div></div>`;
  };

  /* ================= PERSONALIZE ================= */
  const SWATCH = ['#2447B8', '#0F766E', '#B45309', '#7C3AED', '#BE123C', '#15803D', '#1F2937'];
  A.views.personalize = function () {
    const st = S.state, s = st.settings, home = s.home;
    const kp = Object.keys(A.KPI_CATALOG); const wd = home.widgets;
    return `<div class="phead"><div class="grow"><h1>Personalize the dashboard</h1><p>Make it look and read like Solaris' own system: name, logo and colour, Marathi menus, which numbers and panels the home screen shows, stage names and extra lead fields. Changes apply instantly.</p></div><button class="btn" data-act="go" data-v="overview">${I('home')}See home screen</button></div>
      <div class="grid g2"><div class="card"><div class="hd"><h2>Brand</h2></div><div class="bd stack"><div class="fgrid">
          <label class="f">Company name<input class="i" id="pz_company" data-chg="stF" data-k="company" value="${h(s.company)}"></label>
          <label class="f">Line under the name<input class="i" id="pz_tag" data-chg="stF" data-k="tagline" value="${h(s.tagline || '')}" placeholder="e.g. Rooftop solar · Nashik"></label></div>
          <div class="f" style="font-size:12px;color:var(--muted);font-weight:500">Brand colour<div class="row" style="margin-top:4px">${SWATCH.map((c) => `<button class="chip" data-act="pzColor" data-c="${c}" aria-label="Colour ${c}" style="width:30px;height:30px;padding:0;background:${c};border:${s.brandColor === c ? '3px solid var(--ink)' : '1px solid var(--line)'}"></button>`).join('')}<input type="color" id="pz_color" value="${h(s.brandColor)}" data-chg="stF" data-k="brandColor" aria-label="Custom colour" style="width:40px;height:30px;border:0;background:none"></div></div>
          <div class="row"><label class="btn" for="pzLogo">${I('upload')}Upload logo</label><input type="file" id="pzLogo" accept="image/*" hidden data-chg="pzLogo">${s.logo ? `<img src="${h(s.logo)}" alt="Logo" width="40" height="40" style="border-radius:8px;object-fit:cover"><button class="btn sm ghost" data-act="pzLogoDel">Remove</button>` : '<span class="small muted">Square PNG/JPG works best. Without a logo, initials are shown.</span>'}</div></div></div>
        <div class="card"><div class="hd"><h2>Language &amp; privacy</h2></div><div class="bd stack">
          <div class="row"><span class="small muted" style="width:120px">Menu language</span>${[['en', 'English'], ['mr', 'मराठी']].map(([k, t]) => `<button class="chip ${s.uiLang === k ? 'on' : ''}" data-act="pzLang" data-l="${k}">${t}</button>`).join('')}</div>
          <p class="xs muted" style="margin:0">Marathi changes the menu and home-screen headings. Calls, scripts and WhatsApp templates have their own language settings.</p>
          <div class="divider"></div>
          <label class="row nw small"><label class="switch" data-act="noop"><input type="checkbox" id="pz_mask" data-chg="stF" data-k="maskPhones" data-bool="1" ${s.maskPhones ? 'checked' : ''}><span></span></label><span><b>Hide customer phone numbers on screen</b><br><span class="muted">Turn on before screen-sharing a demo with real leads. Shows +91 98XXX XX210.</span></span></label>
          <div class="divider"></div>
          <div class="small"><b>Role views.</b> Use “Viewing as” in the top bar to show the dashboard exactly as a salesperson sees it: only their leads, follow-ups and visits. At go-live each person gets their own login.</div></div></div></div>
      <div class="grid g2"><div class="card"><div class="hd"><h2>Home screen numbers</h2><span class="small muted">tick the tiles to show, in this order</span></div><div class="bd stack">${kp.map((k) => { const i = home.kpis.indexOf(k); return `<div class="row nw"><label class="row nw sp small"><input type="checkbox" id="pzk_${k}" data-chg="pzKpi" data-k="${k}" ${i >= 0 ? 'checked' : ''}> ${h(A.KPI_CATALOG[k])}</label>${i >= 0 ? `<span class="mono xs muted">#${i + 1}</span><button class="btn sm ghost" data-act="pzKpiMove" data-k="${k}" data-d="-1" aria-label="Move up">↑</button><button class="btn sm ghost" data-act="pzKpiMove" data-k="${k}" data-d="1" aria-label="Move down">↓</button>` : ''}</div>`; }).join('')}</div></div>
        <div class="card"><div class="hd"><h2>Home screen panels</h2><span class="small muted">show, hide and reorder</span></div><div class="bd stack">${wd.map((w, i) => `<div class="row nw"><label class="switch" data-act="noop"><input type="checkbox" id="pzw_${w.id}" data-chg="pzW" data-i="${i}" ${w.on ? 'checked' : ''}><span></span></label><span class="sp small"><b>${h(A.WIDGET_CATALOG[w.id] || w.id)}</b></span><button class="btn sm ghost" data-act="pzWMove" data-i="${i}" data-d="-1" aria-label="Move up">↑</button><button class="btn sm ghost" data-act="pzWMove" data-i="${i}" data-d="1" aria-label="Move down">↓</button></div>`).join('')}</div></div></div>
      <div class="grid g2"><div class="card"><div class="hd"><h2>Pipeline stage names</h2><span class="small muted">use Solaris' own words</span></div><div class="bd"><div class="fgrid">${D.STAGES.map((k) => `<label class="f">${h(k)}<input class="i" id="pzs_${k.replace(/\s/g, '_')}" data-chg="pzStage" data-k="${h(k)}" value="${h((s.stageLabels || {})[k] || '')}" placeholder="${h(k)}"></label>`).join('')}</div><p class="xs muted">For example: “Site Survey” → “सर्व्हे”, “Quotation Sent” → “Quotation दिले”.</p></div></div>
        <div class="card"><div class="hd"><h2>Extra lead fields</h2><button class="btn sm" data-act="pzCfAdd">${I('plus')}Add field</button></div><div class="bd stack">${(s.customFields || []).map((c, i) => `<div class="row nw"><input class="i" id="pzcf_${i}" data-chg="pzCf" data-i="${i}" value="${h(c.label)}"><button class="btn sm ghost danger" data-act="pzCfDel" data-i="${i}" aria-label="Remove">${I('x')}</button></div>`).join('') || '<span class="small muted">None.</span>'}<p class="xs muted" style="margin:0">These appear on every lead and are filled automatically when an Excel column has the same name (e.g. “MSEDCL consumer no.”, “Sanctioned load (kW)”, “Roof type”, “Reference by”).</p></div></div></div>`;
  };
  Object.assign(A.acts, {
    pzColor: (el) => { S.state.settings.brandColor = el.dataset.c; S.change('settings'); },
    pzLang: (el) => { S.state.settings.uiLang = el.dataset.l; S.change('settings'); },
    pzLogo: (el) => { const f = el.files && el.files[0]; if (!f) return; const img = new Image(); const r = new FileReader(); r.onload = () => { img.onload = () => { const c = document.createElement('canvas'); c.width = c.height = 96; const x = c.getContext('2d'); const m = Math.min(img.width, img.height); x.drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, 96, 96); S.state.settings.logo = c.toDataURL('image/png'); S.change('settings'); toast('Logo updated'); }; img.onerror = () => toast('That image could not be read'); img.src = r.result; }; r.readAsDataURL(f); },
    pzLogoDel: () => { S.state.settings.logo = ''; S.change('settings'); },
    pzKpi: (el) => { const k = el.dataset.k; const a = S.state.settings.home.kpis; if (el.checked) { if (!a.includes(k)) a.push(k); } else S.state.settings.home.kpis = a.filter((x) => x !== k); S.change('settings'); },
    pzKpiMove: (el) => { const a = S.state.settings.home.kpis; const i = a.indexOf(el.dataset.k), j = i + Number(el.dataset.d); if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; S.change('settings'); },
    pzW: (el) => { S.state.settings.home.widgets[Number(el.dataset.i)].on = el.checked; S.change('settings'); },
    pzWMove: (el) => { const a = S.state.settings.home.widgets; const i = Number(el.dataset.i), j = i + Number(el.dataset.d); if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; S.change('settings'); },
    pzStage: (el) => { const s = S.state.settings; s.stageLabels = s.stageLabels || {}; if (el.value.trim()) s.stageLabels[el.dataset.k] = el.value.trim(); else delete s.stageLabels[el.dataset.k]; S.change('settings'); },
    pzCfAdd: () => { const s = S.state.settings; (s.customFields = s.customFields || []).push({ key: 'cf' + Date.now().toString(36), label: 'New field' }); S.change('settings'); },
    pzCf: (el) => { S.state.settings.customFields[Number(el.dataset.i)].label = el.value; S.change('settings'); },
    pzCfDel: (el) => { S.state.settings.customFields.splice(Number(el.dataset.i), 1); S.change('settings'); }
  });

  /* ================= SET UP FOR SOLARIS (real-lead demo) ================= */
  const SAMPLE_NAMES = new Set(D.TEAM.map((t) => t.name));
  A.views.setup = function () {
    const st = S.state, s = st.settings;
    const realLeads = st.leads.filter((l) => l.batch || l.source === 'Excel import' || (l.tags || []).length);
    const teamReal = st.team.filter((t) => t.role !== 'Owner').every((t) => !SAMPLE_NAMES.has(t.name));
    const tested = st.calls.some((c) => c.test);
    const one = st.agents.find((a) => a.id === 'ag_one');
    const checks = [
      ['Workspace cleared of sample data', !!s.realMode, 'Step 1'],
      ['Business details and pricing confirmed', !!s.pricingReviewed, 'Step 2'],
      ['Solaris team and areas added', teamReal, 'Step 3'],
      ['Agent set up in Marathi', s.agentMode === 'single' ? !!s.agentReviewed : true, 'Step 4'],
      ['Real leads imported', s.realMode && st.leads.length > 0, 'Step 5'],
      ['At least one test call done', tested, 'Step 6'],
      ['Backup saved', !!s.lastBackup, 'Step 7']
    ];
    const done = checks.filter((c) => c[1]).length;
    const pickDemo = () => {
      const L = st.leads.filter((l) => !l.dnc && !['Won', 'Lost'].includes(l.stage));
      const home = L.filter((l) => (l.type || 'Home') === 'Home').sort((a, b) => (b.bill || 0) - (a.bill || 0))[0];
      const big = L.filter((l) => ['Society', 'Factory', 'Shop', 'Institution'].includes(l.type)).sort((a, b) => (b.bill || 0) - (a.bill || 0))[0];
      const gap = L.find((l) => !l.bill || !l.area);
      return [[home, 'Home owner with the highest bill', 'Shows sizing, subsidy and EMI objection handling in Marathi.'], [big, 'Society / commercial lead', 'Shows committee-meeting or factory flow and live transfer.'], [gap, 'Lead with missing details', 'Shows the AI collecting what the Excel file didn\'t have.']].filter((x) => x[0]);
    };
    const step = (n, title, body, ok) => `<div class="card"><div class="hd"><span class="pill ${ok ? 'good' : 'line'}">${ok ? '✓' : n}</span><h2>${h(title)}</h2></div><div class="bd stack">${body}</div></div>`;
    return `<div class="phead"><div class="grow"><div class="eyebrow">Real-lead demo</div><h1>Set up for Solaris</h1><p>Turn this demo into Solaris' own workspace in about 20 minutes: their business details, team, pricing and agent, then their real leads. Everything stays in this browser.</p></div></div>
      <div class="card"><div class="hd"><h2>Demo readiness</h2><span class="pill ${done === checks.length ? 'good' : 'info'}">${done}/${checks.length}</span></div><div class="bd"><div class="bar" style="height:8px;margin-bottom:12px"><i style="width:${done / checks.length * 100}%;background:var(--good)"></i></div><div class="grid g2" style="gap:6px">${checks.map((c) => `<div class="row nw small"><span class="pill ${c[1] ? 'good' : 'line'}">${c[1] ? '✓' : '·'}</span><span class="sp">${h(c[0])}</span><span class="xs muted">${c[2]}</span></div>`).join('')}</div></div></div>
      ${step(1, 'Start a clean Solaris workspace', s.realMode ? `<div class="small">This workspace holds Solaris data (${st.leads.length} leads). Sample data was removed.</div><div class="row"><button class="btn sm" data-act="backup">${I('dl')}Save backup</button><button class="btn sm ghost danger" data-act="loadSample">${A.confirmSample ? 'Click again: erase and load sample data' : 'Go back to sample data'}</button></div>` : `<div class="small">Removes the sample leads, calls, visits and follow-ups so only Solaris' real leads appear. Agents, scripts and your personalisation are kept.</div><div class="row"><button class="btn sm" data-act="backup">${I('dl')}Save sample backup first</button><button class="btn pri" data-act="startReal">${A.confirmReal ? 'Click again to clear sample data' : 'Clear sample data'}</button></div>`, !!s.realMode)}
      ${step(2, 'Business details & pricing', `<div class="fgrid"><label class="f">Company<input class="i" id="su_company" data-chg="stF" data-k="company" value="${h(s.company)}"></label><label class="f">Business number<input class="i" id="su_num" data-chg="stF" data-k="businessNumber" value="${h(s.businessNumber)}"></label><label class="f">Calls from<input class="i" type="time" id="su_cs" data-chg="stF" data-k="callingStart" value="${h(s.callingStart)}"></label><label class="f">Calls until<input class="i" type="time" id="su_ce" data-chg="stF" data-k="callingEnd" value="${h(s.callingEnd)}"></label><label class="f">Home price ₹/kW<input class="i" type="number" id="su_ph" data-chg="stF" data-k="priceHome" data-num="1" value="${s.priceHome}"></label><label class="f">Commercial price ₹/kW<input class="i" type="number" id="su_pc" data-chg="stF" data-k="priceCommercial" data-num="1" value="${s.priceCommercial}"></label><label class="f">Home tariff ₹/unit<input class="i" type="number" step="0.5" id="su_th" data-chg="stF" data-k="tariffHome" data-num="1" value="${s.tariffHome}"></label><label class="f">Commercial tariff ₹/unit<input class="i" type="number" step="0.5" id="su_tc" data-chg="stF" data-k="tariffCommercial" data-num="1" value="${s.tariffCommercial}"></label></div><div class="row"><button class="btn sm ${s.pricingReviewed ? '' : 'pri'}" data-act="suFlag" data-k="pricingReviewed">${s.pricingReviewed ? '✓ Confirmed' : 'Confirm these are Solaris\' figures'}</button><span class="xs muted">Used for kW size, subsidy and saving estimates on every lead and call.</span></div>`, !!s.pricingReviewed)}
      ${step(3, 'Solaris team & areas', `<div class="small">Paste one person per line: <span class="mono">Name, Role, Mobile, Areas</span>. Role is Sales or Surveyor. Separate areas with “/”. Leads are assigned by area automatically.</div><textarea class="i mono" id="suTeam" style="min-height:110px" placeholder="Amit Patil, Sales, 9822000001, Gangapur Road/College Road&#10;Sneha Joshi, Sales, 9822000002, CIDCO/Indira Nagar&#10;Ravi More, Sales, 9822000003, Satpur MIDC/Ambad MIDC&#10;Kiran Shinde, Surveyor, 9822000004, West/East"></textarea><div class="row"><button class="btn sm pri" data-act="suTeam">Replace team</button><span class="small muted">Now: ${st.team.filter((t) => t.role !== 'Owner').map((t) => h(t.name)).join(', ')}</span><button class="btn sm ghost" data-act="go" data-v="settings">Edit in Settings</button></div><div class="xs muted">Areas the system knows: ${h(D.AREAS.map((a) => a.en).join(', '))}. Surveyor zones: West, East, North, Industrial. The first salesperson with a Factory/Shop segment gets commercial leads (edit in Settings).</div>`, teamReal)}
      ${step(4, 'One Marathi agent for everything', `<div class="small">${s.agentMode === 'single' ? `<b>${h(one ? one.name : 'Asha')}</b> handles every call: enquiries, lead calling, societies/factories, customer support, visit confirmation and quotation follow-up, in spoken Marathi with Hindi/English when the caller switches.` : 'Specialist agents are in use.'}</div><div class="row">${s.agentMode !== 'single' ? '<button class="btn sm pri" data-act="agMode" data-m="single">Use one agent</button>' : ''}<button class="btn sm" data-act="agEdit" data-id="ag_one">Edit name, voice, script &amp; call types</button><button class="btn sm ${s.agentReviewed ? '' : 'pri'}" data-act="suFlag" data-k="agentReviewed">${s.agentReviewed ? '✓ Reviewed' : 'Mark script reviewed with Solaris'}</button></div><div class="xs muted">Put Solaris' own answers into Objections &amp; knowledge: EMI partner bank, panel/inverter brands, warranty years, AMC price, typical install time.</div>`, s.agentMode === 'single' ? !!s.agentReviewed : true)}
      ${step(5, 'Import Solaris\' real leads', `<div class="small">Any Excel/CSV works: Meta lead export, IndiaMART/JustDial download, expo list or their own register. Columns are matched automatically; extra columns are kept on the lead. Numbers are cleaned and de-duplicated; DNC and no-consent rows are never called.</div><div class="row"><button class="btn pri" data-act="go" data-v="import">${I('upload')}Import Excel</button><span class="small muted">${st.leads.length} leads in workspace</span></div><div class="notice small">For the first demo, untick “Start AI calling right after import”. Then pick a few leads below and run them one by one while Solaris watches.</div>`, s.realMode && st.leads.length > 0)}
      ${step(6, 'Demo on their own leads', (s.realMode && st.leads.length ? pickDemo().map(([l, t, why]) => `<div class="row nw" style="padding:8px 0;border-bottom:1px solid var(--line2)"><div class="sp" style="min-width:0"><div class="eyebrow">${h(t)}</div><b data-act="openLead" data-id="${l.id}" style="cursor:pointer">${h(l.name)}</b> <span class="small muted">· ${h(l.area || 'area unknown')} · ${l.bill ? U.inr(l.bill) : 'bill unknown'}</span><div class="xs muted">${h(why)}</div></div><button class="btn sm" data-act="callLead" data-id="${l.id}">${I('phone')}Simulated call</button><button class="btn sm pri" data-act="rehearse" data-id="${l.id}">${I('headset')}Live role-play</button></div>`).join('') : '<div class="small muted">Import leads first; three good demo leads will be suggested here.</div>') + `<div class="small"><b>Simulated call</b> plays a scripted Marathi/Hindi conversation using that lead's real name, area and bill, and fills the CRM live (anything missing is invented and tagged “simulated”). <b>Live role-play</b>: a Solaris salesperson plays their own customer and the agent answers in real time, then the CRM is updated from what was actually said.</div>`, tested)}
      ${step(7, 'Keep the data safe between demo days', `<div class="small">Data lives in this browser only. Use the same laptop and browser all week, and save a backup at the end of each day. Turn on “Hide customer phone numbers” in Personalize before screen-sharing.</div><div class="row"><button class="btn sm pri" data-act="backup">${I('dl')}Save backup now</button><button class="btn sm" data-act="go" data-v="personalize">Personalize</button>${s.lastBackup ? `<span class="small muted">Last backup ${U.rel(s.lastBackup)}</span>` : ''}</div>`, !!s.lastBackup)}`;
  };
  Object.assign(A.acts, {
    suFlag: (el) => { S.state.settings[el.dataset.k] = !S.state.settings[el.dataset.k]; S.change('settings'); },
    startReal: () => { if (!A.confirmReal) { A.confirmReal = true; render(); setTimeout(() => { A.confirmReal = false; render(); }, 6000); return; } A.confirmReal = false; Live.stopAll(); const st = S.state; ['leads', 'calls', 'followups', 'visits', 'activity', 'campaigns', 'tickets', 'imports'].forEach((k) => { st[k] = []; }); st.dnc = []; st.settings.realMode = true; S.change('all'); toast('Sample data cleared. Ready for Solaris\' leads.'); },
    loadSample: () => { if (!A.confirmSample) { A.confirmSample = true; render(); setTimeout(() => { A.confirmSample = false; render(); }, 6000); return; } A.confirmSample = false; const keep = S.state.settings; Live.stopAll(); S.reset(); ['company', 'tagline', 'brandColor', 'logo', 'uiLang', 'home', 'stageLabels', 'customFields', 'maskPhones'].forEach((k) => { S.state.settings[k] = keep[k]; }); S.change('all'); toast('Sample data loaded'); },
    suTeam: () => {
      const txt = (document.getElementById('suTeam') || {}).value || ''; const rows = txt.split('\n').map((r) => r.split(',').map((x) => x.trim())).filter((r) => r[0]);
      if (!rows.length) return toast('Paste at least one line: Name, Role, Mobile, Areas');
      const owner = S.state.team.find((t) => t.role === 'Owner');
      const team = rows.map((r) => { const role = /survey/i.test(r[1] || '') ? 'Surveyor' : /manag/i.test(r[1] || '') ? 'Manager' : 'Sales'; const areas = (r[3] || '').split('/').map((a) => SOL.Excel.normArea(a)).filter(Boolean); return { id: U.uid('u'), name: r[0], role, phone: U.normPhone(r[2]) || r[2] || '', areas, segments: role === 'Sales' ? (areas.some((a) => /MIDC|Sinnar|Malegaon/.test(a)) ? ['Factory', 'Shop', 'Institution'] : ['Home', 'Society']) : [], active: true }; });
      S.state.team = (owner ? [owner] : []).concat(team);
      S.state.leads.forEach((l) => { l.owner = routeOwner(l); });
      S.state.settings.viewAs = 'owner'; S.change('team'); toast(team.length + ' people added · leads re-assigned by area');
    }
  });
  const _backup = A.acts.backup; A.acts.backup = async () => { await _backup(); S.state.settings.lastBackup = Date.now(); S.change('settings'); };
  const _stF = A.acts.stF; A.acts.stF = (el) => { if (el.dataset.bool) { S.state.settings[el.dataset.k] = el.checked; S.change('settings'); return; } _stF(el); };

  A.boot();
})();
