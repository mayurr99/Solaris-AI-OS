/* Solaris AI OS panel — WhatsApp studio, Setup and first-time onboarding */
(function () {
  'use strict';
  const P = window.SOLP; const { S, V, VIEWS, ACT, CHG, h, I, $, fn, save, saveCfg, upload, upLocal, lead, byId, toast, modal, closeLayer, render, topbar, first, normPhone, fmtDT, rel, uid } = P;

  /* ---------------- WhatsApp templates (defaults mirror the server) ---------------- */
  const TPL = {
    visit: { label: 'Visit confirmation', when: 'After Asha books a survey (or you book one)', name: 'solaris_visit_confirm', lang: 'mr', cat: 'Utility', vars: 'name, date & time, address', body: 'नमस्कार {{1}} जी, Solaris सोलरचा मोफत सर्व्हे {{2}} ला ठरला आहे. पत्ता: {{3}}. मागच्या 12 महिन्यांची लाईट बिलं तयार ठेवा. वेळ बदलायची असल्यास याच नंबरवर कळवा.' },
    callback: { label: 'Callback time', when: 'Customer asked Asha to call later', name: 'solaris_callback', lang: 'mr', cat: 'Utility', vars: 'name, date & time', body: 'नमस्कार {{1}} जी, तुम्ही सांगितल्याप्रमाणे Solaris सोलरकडून {{2}} ला परत फोन करतो. काही प्रश्न असल्यास इथेच लिहा.' },
    interested: { label: 'Brochure', when: 'Interested but no visit yet (needs a brochure PDF)', name: 'solaris_brochure', lang: 'mr', cat: 'Marketing', header: 'Document', vars: 'name', body: 'नमस्कार {{1}} जी, Solaris सोलरची माहिती आणि PM सूर्य घर सबसिडीची माहिती सोबत पाठवत आहोत. मोफत सर्व्हेसाठी "हो" असा रिप्लाय करा.' },
    complaint: { label: 'Complaint received', when: 'Existing customer reported a problem', name: 'solaris_complaint', lang: 'mr', cat: 'Utility', vars: 'name, ticket no.', body: 'नमस्कार {{1}} जी, तुमची तक्रार नोंदवली आहे (क्रमांक {{2}}). उद्या संध्याकाळी 5 पर्यंत आमची टीम संपर्क करेल.' },
    update: { label: 'Offers & updates (with AI caption)', when: 'Your broadcasts from this page', name: 'solaris_update', lang: 'mr', cat: 'Marketing', header: 'Image', vars: 'name, caption', body: 'नमस्कार {{1}} जी, {{2}}\n\n— Solaris सोलर, नाशिक. नको असल्यास STOP लिहा.' }
  };
  const waCfg = () => { const c = S.cfg.whatsapp || {}; return { autoSend: Object.assign({ visit: true, callback: true, interested: true, complaint: true }, c.autoSend || {}), brochureUrl: c.brochureUrl || '', templates: c.templates || {} }; };
  const tplName = (k) => (waCfg().templates[k] || {}).name || TPL[k].name;
  const okWa = (l) => l.phone && !l.dnc && !l.waOptOut && l.consent !== false;

  async function loadStatus(force) {
    if (V.status && !force) return V.status;
    try { V.status = await fn('wa-send', { check: true }); } catch (e) { V.status = { error: e.message }; }
    return V.status;
  }
  const stBadge = (ok, yes, no) => ok ? `<span class="pill good">${I('check', 12)} ${yes || 'Connected'}</span>` : `<span class="pill warn">${no || 'Not connected'}</span>`;

  /* ---------------- audiences ---------------- */
  const AUD = [
    ['hot', 'Hot & warm', (l) => ['HOT', 'WARM'].includes(l.temp) && !['Won', 'Lost'].includes(l.stage)],
    ['new', 'New this week', (l) => (l.createdAt || 0) > Date.now() - 7 * 864e5 && !['Won', 'Lost'].includes(l.stage)],
    ['visit', 'Visit booked', (l) => l.visitBooked || l.stage === 'Site Survey'],
    ['cust', 'Customers', (l) => l.stage === 'Won'],
    ['all', 'Everyone (opted in)', (l) => l.stage !== 'Lost'],
    ['sel', 'Selected', (l) => V.sel.has(l.id)]
  ];
  const audience = () => { const a = AUD.find((x) => x[0] === V.wa.audience) || AUD[0]; return S.leads.filter((l) => okWa(l) && a[2](l)); };

  /* ---------------- WhatsApp view ---------------- */
  VIEWS.whatsapp = function () {
    const tab = V.wa.tab || 'send';
    const tabs = `<div class="chips" style="margin-bottom:14px">${[['send', 'Send'], ['inbox', 'Inbox'], ['templates', 'Templates & auto-messages']].map(([id, t]) => `<button class="chip ${tab === id ? 'on' : ''}" data-act="waTab" data-v="${id}">${t}</button>`).join('')}</div>`;
    if (!V.status) loadStatus().then(() => { if (V.view === 'whatsapp') render(); });
    const st = V.status || {}; const ready = st.whatsapp && st.whatsapp.ready;
    const warn = V.status && !ready ? `<div class="note warn" style="margin-bottom:14px">WhatsApp isn’t connected yet — you can prepare content and captions now. <a href="#setup" data-act="go" data-v="setup">Connect it in Setup</a>.</div>` : '';
    return topbar('WhatsApp', 'Share offers and updates — Asha also sends confirmations automatically', '') + tabs + warn + (tab === 'inbox' ? inbox() : tab === 'templates' ? templates() : sendFlow());
  };

  function sendFlow() {
    const w = V.wa; const cont = S.content.filter((c) => !c.archived && c.kind !== 'doc');
    const people = audience(); const c = cont.find((x) => x.id === w.contentId);
    const caps = w.captions;
    return `<div class="stack">
      <div class="card"><div class="hd"><h2 class="sp">1 · What do you want to share?</h2><button class="btn sm pri" data-act="addContent">${I('plus', 15)} Add content</button></div><div class="bd">
        ${cont.length ? `<div class="cards">${cont.slice(0, 24).map((x) => `<div class="ccard ${w.contentId === x.id ? 'on' : ''}" data-act="pickContent" data-id="${h(x.id)}" tabindex="0"><div class="img" style="${x.image || (x.mediaUrl && x.mediaKind !== 'document') ? `background-image:url('${h(x.mediaUrl && x.mediaKind !== 'document' ? x.mediaUrl : x.image)}')` : ''}">${x.image || (x.mediaUrl && x.mediaKind !== 'document') ? '' : I(x.mediaKind === 'document' ? 'file' : 'link', 26)}</div><div class="ct">${h(x.title || 'Untitled')}<div class="xs muted" style="font-weight:400">${rel(x.createdAt)}${x.url ? ' · link' : ''}</div></div></div>`).join('')}</div>`
          : `<div class="empty">Paste a web link (an offer page, news about the subsidy, a YouTube video) or upload a photo / brochure. <br><button class="btn pri" style="margin-top:10px" data-act="addContent">${I('plus', 15)} Add your first content</button></div>`}
      </div></div>
      <div class="card"><div class="hd"><h2 class="sp">2 · Who should get it?</h2><span class="pill sea">${people.length} people</span></div><div class="bd stack">
        <div class="chips">${AUD.filter(([id]) => id !== 'sel' || V.sel.size).map(([id, t, f]) => `<button class="chip ${w.audience === id ? 'on' : ''}" data-act="waAud" data-v="${id}">${t}<b>${S.leads.filter((l) => okWa(l) && f(l)).length}</b></button>`).join('')}</div>
        <div class="xs muted">Do-not-call numbers, people who replied STOP and leads without consent are left out automatically.</div>
      </div></div>
      <div class="card"><div class="hd"><h2 class="sp">3 · Captions</h2><button class="btn sm" data-act="aiCaps" ${!c || w.busy ? 'disabled' : ''}>${I('spark', 15)} ${w.busy ? 'Writing…' : caps ? 'Rewrite with AI' : 'Suggest captions with AI'}</button></div><div class="bd">
        ${!c ? '<div class="muted small">Pick content first.</div>' : !caps ? `<div class="muted small">AI writes a short caption for each person — in their language, using their first name. You can edit any of them.</div>
          <label class="f" style="margin-top:10px">Or one caption for everyone (use {name} for the first name)<textarea class="i" id="capAll" placeholder="उदा. {name} जी, PM सूर्य घर योजनेत अठ्ठ्याहत्तर हजारपर्यंत सबसिडी — मोफत सर्व्हेसाठी हो लिहा.">${h(c.caption || '')}</textarea></label>`
          : `<div class="stack">${caps.mode === 'lang' ? `<div class="note">${people.length} people — one version per language, the first name is filled in for each person.</div>` : ''}${caps.rows.map((r) => `<div class="cap"><div><b>${h(r.label)}</b><div class="xs muted">${h(r.sub || '')}${r.ai ? ' · AI' : ''}</div></div><textarea class="i" data-cap="${h(r.id)}" rows="3">${h(r.caption)}</textarea></div>`).join('')}</div>`}
      </div></div>
      <div class="row"><span class="sp xs muted">Sent with your approved “${h(tplName('update'))}” template${c && !(c.mediaUrl || c.image) ? ' — needs a picture: add one to this content' : ''}.</span><button class="btn wa" data-act="waSend" ${!c || !people.length ? 'disabled' : ''}>${I('send', 16)} Send to ${people.length}</button></div>
    </div>`;
  }

  function inbox() {
    const last = new Map();
    S.wa_messages.forEach((m) => { if (!m.leadId) return; const cur = last.get(m.leadId); if (!cur || m.at > cur.at) last.set(m.leadId, m); });
    const rows = [...last.values()].sort((a, b) => b.at - a.at).slice(0, 100);
    return `<div class="card"><div class="list">${rows.map((m) => { const l = lead(m.leadId); const open = S.wa_messages.some((x) => x.leadId === m.leadId && x.dir === 'in' && x.at > Date.now() - 23.5 * 3600e3);
      return `<div class="item" data-act="openLead" data-id="${h(m.leadId)}"><span class="av">${h((l.name || '?').slice(0, 1))}</span><div class="sp"><div class="t">${h(l.name)} ${m.dir === 'in' ? '<span class="pill sea">replied</span>' : ''}</div><div class="s">${m.dir === 'in' ? '' : 'You: '}${h(m.text || '')}</div></div><div style="text-align:right"><div class="xs muted">${rel(m.at)}</div>${open ? `<button class="btn sm" data-act="waReply" data-id="${h(m.leadId)}">Reply</button>` : `<span class="xs muted">${h(m.status || '')}</span>`}</div></div>`; }).join('') || '<div class="empty">No WhatsApp messages yet.</div>'}</div></div>`;
  }

  function templates() {
    const c = waCfg(); const st = (V.status || {}).whatsapp || {};
    return `<div class="stack">
      <div class="card"><div class="bd stack"><div class="row"><b class="sp">Connection</b>${stBadge(st.ready, (st.provider === 'aisensy' ? 'AiSensy' : 'Meta Cloud API') + ' connected')}</div>
        <div class="small muted">WhatsApp only allows business-started messages through templates you get approved once. Create these five in ${st.provider === 'aisensy' ? 'AiSensy → Manage → Templates, then an “API campaign” with the same name for each' : 'Meta WhatsApp Manager → Message templates'} — copy the text below exactly. After approval, flip the switches on.</div></div></div>
      ${Object.entries(TPL).map(([k, t]) => { const cur = c.templates[k] || {}; return `<div class="card"><div class="bd stack">
        <div class="row"><div class="sp"><b>${t.label}</b><div class="xs muted">${t.when}</div></div>${k !== 'update' ? `<span class="small muted">Auto-send</span>${`<label class="switch"><input type="checkbox" ${c.autoSend[k] ? 'checked' : ''} data-chg="waAuto" data-k="${k}"><span></span></label>`}` : ''}</div>
        <div class="fgrid"><label class="f">Template name<input class="i mono" value="${h(cur.name || t.name)}" data-chg="waTplName" data-k="${k}"></label><label class="f">Language · Category<input class="i" value="${h((cur.lang || t.lang) === 'mr' ? 'Marathi' : cur.lang || t.lang)} · ${t.cat}${t.header ? ' · header: ' + t.header : ''}" disabled></label></div>
        <div class="bubble out" style="max-width:100%;white-space:pre-wrap" id="tb_${k}">${h(t.body)}</div>
        <div class="row"><span class="xs muted sp">Variables: ${t.vars}</span><button class="btn sm" data-act="copy" data-src="#tb_${k}">${I('copy', 14)} Copy text</button></div>
      </div></div>`; }).join('')}
      <div class="card"><div class="bd stack"><b>Brochure PDF</b><div class="small muted">Sent with the “Brochure” template — and when Asha tells a caller “details WhatsApp वर पाठवते”.</div>
        ${c.brochureUrl ? `<div class="row"><a class="btn sm" href="${h(c.brochureUrl)}" target="_blank" rel="noopener">${I('file', 14)} View current brochure</a></div>` : ''}
        <div class="drop" data-drop="brochureFile" tabindex="0" role="button">${I('up', 24)}<div><b>Upload brochure (PDF)</b></div></div><input type="file" id="brochureFile" accept="application/pdf" hidden data-chg="brochureFile"></div></div>
    </div>`;
  }

  async function saveWa(mut) { const c = JSON.parse(JSON.stringify(S.cfg.whatsapp || {})); mut(c); await saveCfg('whatsapp', c); }
  Object.assign(CHG, {
    waAuto: (el) => saveWa((c) => { c.autoSend = Object.assign({}, waCfg().autoSend, c.autoSend || {}); c.autoSend[el.dataset.k] = el.checked; }).then(() => toast('Saved')).catch((e) => toast(e.message)),
    waTplName: (el) => saveWa((c) => { c.templates = c.templates || {}; c.templates[el.dataset.k] = Object.assign({}, c.templates[el.dataset.k] || {}, { name: el.value.trim() }); }).then(() => toast('Saved')).catch((e) => toast(e.message)),
    brochureFile: async (el) => { const f = el.files[0]; if (!f) return; try { toast('Uploading…'); const url = await upload(f, 'brochure'); await saveWa((c) => { c.brochureUrl = url; }); toast('Brochure saved'); render(); } catch (e) { toast(e.message); } },
    contentFile: async (el) => { const f = el.files[0]; if (!f) return; const box = $('#ctFileName'); if (box) box.textContent = f.name + ' · ' + Math.round(f.size / 1024) + ' KB'; V.wa.file = f; }
  });

  Object.assign(ACT, {
    waTab: (el) => { V.wa.tab = el.dataset.v; render(); },
    waAud: (el) => { V.wa.audience = el.dataset.v; V.wa.captions = null; render(); },
    pickContent: (el) => { V.wa.contentId = el.dataset.id; V.wa.captions = null; render(); },
    addContent: () => { V.wa.file = null; modal('Add content', `
      <label class="f">Web link (offer page, news, YouTube…)<input class="i" id="ct_url" placeholder="https://"></label>
      <div class="xs muted" style="margin-top:-6px">We read the page title, summary and picture for you.</div>
      <label class="f">Title<input class="i" id="ct_title" placeholder="e.g. Diwali offer — free survey this week"></label>
      <label class="f">Key points (optional — helps the AI)<textarea class="i" id="ct_note" placeholder="What should people know? Only real facts."></textarea></label>
      <div class="drop" data-drop="contentFile" tabindex="0" role="button">${I('up', 22)}<div><b>Add a photo or PDF</b> (optional)</div><div class="small" id="ctFileName">JPG, PNG or PDF, under 5 MB</div></div><input type="file" id="contentFile" accept="image/jpeg,image/png,application/pdf" hidden data-chg="contentFile">`,
      `<button class="btn" data-act="closeLayer">Cancel</button><button class="btn pri" data-act="addContentGo">Save content</button>`); },
    addContentGo: async (el) => {
      const url = $('#ct_url').value.trim(); const title = $('#ct_title').value.trim(); const note = $('#ct_note').value.trim(); const f = V.wa.file;
      if (!url && !title && !f) return toast('Add a link, a title or a file');
      if (url && !/^https?:\/\//i.test(url)) return toast('The link should start with https://');
      if (f && f.size > 5 * 1024 * 1024) return toast('File is over 5 MB');
      el.disabled = true; el.textContent = 'Saving…';
      try {
        let media = null; if (f) media = { mediaUrl: await upload(f, 'content'), mediaKind: /pdf/i.test(f.type) ? 'document' : 'image', fileName: f.name };
        let c;
        if (url) { const j = await fn('wa-captions', Object.assign({ url, title, note, save: true }, media || {})); c = j.content; }
        else { c = Object.assign({ id: uid('ct'), title: title || (f && f.name) || 'Update', note, createdAt: Date.now(), by: S.sess.email }, media || {}); await save('content', c); }
        upLocal('content', c); V.wa.contentId = c.id; V.wa.captions = null; closeLayer(); V.view = 'whatsapp'; V.wa.tab = 'send'; render(); toast('Content saved');
      } catch (e) { toast(e.message); el.disabled = false; el.textContent = 'Save content'; }
    },
    aiCaps: async () => {
      const people = audience(); const c = byId('content', V.wa.contentId); if (!c) return;
      V.wa.busy = true; render();
      try {
        if (people.length <= 60) {
          const j = await fn('wa-captions', { content_id: c.id, lead_ids: people.map((l) => l.id) });
          V.wa.captions = { mode: 'each', rows: j.captions.map((x) => { const l = lead(x.id); return { id: x.id, label: l.name, sub: ({ mr: 'Marathi', hi: 'Hindi', en: 'English' }[l.lang || 'mr']) + (l.area ? ' · ' + l.area : ''), caption: x.caption, ai: x.ai }; }) };
          if (j.aiError) toast('AI was unavailable for some — simple captions used');
        } else {
          const j = await fn('wa-captions', { content_id: c.id });
          V.wa.captions = { mode: 'lang', rows: j.captions.map((x) => ({ id: x.id, label: { mr: 'Marathi', hi: 'Hindi', en: 'English' }[x.id], sub: people.filter((l) => (l.lang || 'mr') === x.id).length + ' people', caption: x.caption, ai: x.ai })) };
        }
      } catch (e) { toast(e.message); }
      V.wa.busy = false; render();
    },
    waSend: () => {
      const people = audience(); const c = byId('content', V.wa.contentId); if (!c) return;
      const caps = {}; const rows = document.querySelectorAll('[data-cap]'); const all = ($('#capAll') || {}).value || '';
      if (V.wa.captions && V.wa.captions.mode === 'each') rows.forEach((t) => { caps[t.dataset.cap] = t.value.trim(); });
      else if (V.wa.captions) { const by = {}; rows.forEach((t) => { by[t.dataset.cap] = t.value.trim(); }); people.forEach((l) => { caps[l.id] = by[l.lang || 'mr'] || by.mr || ''; }); }
      else if (all.trim()) people.forEach((l) => { caps[l.id] = all.trim(); });
      if (!Object.values(caps).some(Boolean)) return toast('Write a caption or let AI suggest them');
      const perMsg = ((V.status || {}).whatsapp || {}).provider === 'aisensy' ? 1.09 : 0.86;
      V.wa.pending = { ids: people.map((l) => l.id), caps, contentId: c.id };
      modal('Send WhatsApp?', `<div>Send <b>${h(c.title || 'this content')}</b> to <b>${people.length}</b> people.</div><div class="note">Approx. cost ₹${Math.ceil(people.length * perMsg * 1.18)} (WhatsApp marketing rate incl. GST). Replies from customers are free for 24 hours.</div><div class="small muted">First caption: “${h(Object.values(caps).find(Boolean).replace(/\{name\}/g, first(lead(people[0].id).name) || 'ग्राहक').slice(0, 160))}”</div>`, `<button class="btn" data-act="closeLayer">Cancel</button><button class="btn wa" data-act="waSendGo">${I('send', 15)} Send now</button>`);
    },
    waSendGo: async (el) => {
      const p = V.wa.pending; if (!p) return; el.disabled = true; let sent = 0, failed = 0, skipped = 0, err = '';
      for (let i = 0; i < p.ids.length; i += 40) {
        el.textContent = `Sending ${Math.min(i + 40, p.ids.length)}/${p.ids.length}…`;
        const ids = p.ids.slice(i, i + 40); const captions = {}; ids.forEach((id) => { captions[id] = p.caps[id]; });
        try { const j = await fn('wa-send', { lead_ids: ids, content_id: p.contentId, template_key: 'update', captions }); sent += j.sent; failed += j.failed; skipped += j.skipped; const f = j.results.find((r) => r.error); if (f) err = f.error; }
        catch (e) { failed += ids.length; err = e.message; break; }
      }
      closeLayer(); V.wa.captions = null; V.wa.pending = null;
      toast(`${sent} sent${failed ? ` · ${failed} failed` : ''}${skipped ? ` · ${skipped} skipped` : ''}${err ? ' — ' + err : ''}`); V.wa.tab = 'inbox'; render();
    },
    waReply: (el, ev) => { ev.stopPropagation(); const l = lead(el.dataset.id); modal('Reply to ' + l.name, `<textarea class="i" id="rp_t" placeholder="Type your reply…"></textarea><div class="xs muted">They messaged in the last 24 hours, so this reply is free.</div>`, `<button class="btn" data-act="closeLayer">Cancel</button><button class="btn wa" data-act="waReplyGo" data-id="${h(l.id)}">${I('send', 15)} Send</button>`); },
    waReplyGo: async (el) => { const t = $('#rp_t').value.trim(); if (!t) return; el.disabled = true; try { const j = await fn('wa-send', { lead_ids: [el.dataset.id], text: t, template_key: 'update', session_only: true }); toast(j.sent ? 'Sent' : 'Not sent: ' + ((j.results[0] || {}).error || '')); closeLayer(); } catch (e) { toast(e.message); el.disabled = false; } }
  });

  /* ---------------- knowledge / agent FAQ ---------------- */
  function agentFaq() {
    const p = S.cfg.profile || {}; const s = S.cfg.settings || {};
    return `COMPANY
- ${p.company || 'Solaris'}, rooftop solar, ${p.city || 'Nashik'}. Office: ${p.address || '[address]'}. Hours: ${p.hours || 'Mon–Sat 10:00–19:00'}.
- Sales: ${p.phone || '[phone]'} · WhatsApp: ${p.whatsapp || p.phone || '[number]'}${p.website ? ' · ' + p.website : ''}.
- We serve: ${(p.areas || 'Nashik city and district')}. Services: ${(p.services || ['Homes', 'Housing societies', 'Shops & factories']).join(', ')}.

PRICE & PRODUCTS (only these facts)
- Home on-grid from ₹${Number(p.pricePerKw || s.priceHome || 60000).toLocaleString('en-IN')} per kW before subsidy (final price after site survey).
- Panels: ${p.panels || '[brand/type]'}. Inverter: ${p.inverter || '[brand]'}.
- Warranty: panels ${p.warrantyPanels || '25'} years performance; inverter ${p.warrantyInverter || '[__]'} years; workmanship ${p.warrantyWork || '[__]'} years.
- Loan / EMI: ${p.emi || 'available through banks'}.${p.extra ? '\n- ' + p.extra : ''}

GOVERNMENT SCHEME (PM Surya Ghar)
- Homes: ₹30,000 for 1 kW, ₹60,000 for 2 kW, ₹78,000 maximum for 3 kW and above, paid to the bank after installation and inspection.
- Housing societies (common facilities): ₹18,000 per kW. Shops/factories: no central subsidy.
- Since Feb 2026 MSEDCL approves capacity from the last 12 months' consumption — keep 12 months of bills.

PROCESS
Free site survey → written quotation → portal registration & MSEDCL approval → installation (1–2 days) → net meter → inspection → subsidy to bank.

TECH
- 1 kW ≈ 4 units a day in Nashik. About 100 sq ft shadow-free roof per kW (surveyor measures).
- On-grid switches off in a power cut; hybrid with battery keeps running. Monsoon: lower output, not zero.
- Cleaning: plain water twice a month.
`;
  }

  /* ---------------- setup ---------------- */
  const PF = [['company', 'Company name'], ['owner', 'Owner / your name'], ['phone', 'Sales phone'], ['whatsapp', 'WhatsApp business number'], ['city', 'City'], ['address', 'Office address', 1], ['hours', 'Office hours'], ['website', 'Website'], ['pricePerKw', 'Home price per kW (₹, before subsidy)', 0, 1], ['panels', 'Panel brand / type'], ['inverter', 'Inverter brand'], ['warrantyPanels', 'Panel warranty (years)', 0, 1], ['warrantyInverter', 'Inverter warranty (years)', 0, 1], ['warrantyWork', 'Workmanship warranty (years)', 0, 1], ['emi', 'Loan / EMI partner'], ['areas', 'Areas you serve', 1], ['extra', 'Anything else Asha should know', 1]];
  function profileForm(p, only) {
    return `<div class="fgrid">${PF.filter((f) => !only || only.includes(f[0])).map(([k, t, wide, n]) => `<label class="f" ${wide ? 'style="grid-column:1/-1"' : ''}>${t}<input class="i" data-pf="${k}" value="${h(p[k] == null ? '' : p[k])}" ${n ? 'inputmode="numeric"' : ''}></label>`).join('')}</div>
      <div class="chips">${['Homes', 'Housing societies', 'Shops & factories', 'Farms / pumps'].map((sv) => `<label class="chip"><input type="checkbox" class="chk" data-svc="${sv}" ${(p.services || ['Homes', 'Housing societies', 'Shops & factories']).includes(sv) ? 'checked' : ''} style="width:16px;height:16px;vertical-align:-3px"> ${sv}</label>`).join('')}</div>`;
  }
  function readProfile(base) {
    const p = Object.assign({}, base || {}); document.querySelectorAll('[data-pf]').forEach((i) => { p[i.dataset.pf] = i.value.trim(); });
    const sv = [...document.querySelectorAll('[data-svc]')]; if (sv.length) p.services = sv.filter((x) => x.checked).map((x) => x.dataset.svc);
    return p;
  }
  function rulesForm(s) {
    const f = (k, t, v, type) => `<label class="f">${t}<input class="i" data-rule="${k}" type="${type || 'number'}" value="${h(s[k] != null ? s[k] : v)}"></label>`;
    return `<div class="fgrid">${f('callingStart', 'AI calls from', '10:00', 'time')}${f('callingEnd', 'AI calls until', '19:00', 'time')}${f('dailyCap', 'Max AI calls per day', 300)}${f('maxAttempts', 'Tries if no answer', 3)}${f('retryGapHours', 'Hours between tries', 4)}${f('recallGuardHours', 'Don’t re-call within (hours)', 2)}</div>`;
  }
  const readRules = (s) => { const o = Object.assign({}, s || {}); document.querySelectorAll('[data-rule]').forEach((i) => { o[i.dataset.rule] = i.type === 'time' ? i.value : Number(i.value); }); return o; };
  function teamForm() {
    const team = S.cfg.team || [];
    return `<div class="stack" id="teamRows">${team.map((t, i) => teamRow(t, i)).join('')}</div><div class="row"><button class="btn sm" data-act="teamAdd">${I('plus', 14)} Add person</button><span class="sp"></span><button class="btn sm pri" data-act="teamSave">Save team</button></div>
      <div class="xs muted">Sales people get the HOT leads of their areas; surveyors get the visits. Logins for staff are created in Supabase → Authentication → Add user.</div>`;
  }
  const teamRow = (t, i) => `<div class="row nw" data-tr="${i}"><input class="i" data-tk="name" placeholder="Name" value="${h(t.name || '')}"><select class="sel" data-tk="role" style="max-width:130px">${['Sales', 'Surveyor', 'Owner'].map((r) => `<option ${t.role === r ? 'selected' : ''}>${r}</option>`).join('')}</select><input class="i hide-m" data-tk="areas" placeholder="Areas (comma)" value="${h((t.areas || []).join(', '))}"><button class="btn sm ghost" data-act="teamDel" data-i="${i}" aria-label="Remove">${I('x', 14)}</button></div>`;

  VIEWS.setup = function () {
    const p = S.cfg.profile || {}; const st = V.status; if (!st) loadStatus().then(() => { if (V.view === 'setup') render(); });
    const s = st || {};
    return topbar('Setup', 'Your business, AI agent, WhatsApp and team', `<button class="btn" data-act="wizard">Run setup guide</button>`) + `<div class="stack">
      <div class="card"><div class="hd"><h2 class="sp">Connections</h2><button class="btn sm ghost" data-act="recheck">Check again</button></div><div class="bd stack">
        <div class="row"><span class="sp">${I('bot', 16)} AI voice agent (Sarvam)</span>${st ? stBadge(s.voice && s.voice.ready) : '<span class="muted small">checking…</span>'}</div>
        ${st && s.voice && !s.voice.ready ? `<div class="xs muted">${h(s.voice.note || '')}</div>` : ''}
        <div class="row"><span class="sp">${I('wa', 16)} WhatsApp (${h((s.whatsapp || {}).provider || 'Meta Cloud API or AiSensy')})</span>${st ? stBadge(s.whatsapp && s.whatsapp.ready) : ''}</div>
        <div class="row"><span class="sp">${I('spark', 16)} AI captions</span>${st ? stBadge(s.captions && s.captions.ready, 'Ready') : ''}</div>
        <details><summary class="small" style="cursor:pointer">How to connect (keys go into Supabase, never into this page)</summary><div class="small stack" style="margin-top:8px">
          <div><b>Supabase → Edge Functions → Secrets</b>. Voice: SARVAM_API_KEY, SARVAM_ORG_ID, SARVAM_WORKSPACE_ID, SARVAM_APP_ID, SARVAM_APP_VERSION, SARVAM_CONNECTION_ID, SARVAM_AGENT_NUMBER, WEBHOOK_TOKEN, PUBLIC_WEBHOOK_URL.</div>
          <div><b>WhatsApp — Meta Cloud API (cheapest):</b> WA_TOKEN (permanent system-user token), WA_PHONE_ID, WA_VERIFY_TOKEN (any random text). Webhook URL for Meta: <span class="mono">…/functions/v1/wa-webhook</span>, field “messages”.</div>
          <div><b>WhatsApp — AiSensy:</b> AISENSY_API_KEY, and create one API campaign per template (same names as below).</div>
          <div><b>Asha → send WhatsApp during a call:</b> add a Sarvam API tool pointing to <span class="mono">…/functions/v1/wa-send?token=WEBHOOK_TOKEN</span> with body {"phone": caller number, "kind": "interested"}.</div>
        </div></details>
      </div></div>
      <div class="card"><div class="hd"><h2 class="sp">Business profile</h2></div><div class="bd stack">${profileForm(p)}<div class="row"><span class="sp"></span><button class="btn pri" data-act="saveProfile">Save</button></div></div></div>
      <div class="card"><div class="hd"><h2 class="sp">Knowledge for Asha</h2></div><div class="bd stack">
        <div class="small muted">Built from your profile. Upload it in Sarvam → Knowledge Base so Asha answers price, warranty and office questions correctly.</div>
        <textarea class="i mono" id="faqText" rows="10" readonly>${h(agentFaq())}</textarea>
        <div class="row"><button class="btn sm" data-act="copy" data-src="#faqText">${I('copy', 14)} Copy</button><button class="btn sm" data-act="dlFaq">${I('file', 14)} Download .txt</button></div>
        <b style="margin-top:6px">Files (brochures, price lists, photos)</b>
        <div class="list">${S.content.filter((c) => c.kind === 'doc').map((c) => `<div class="item" style="cursor:default"><span class="av">${I('file', 16)}</span><div class="sp"><div class="t">${h(c.title)}</div><div class="s">${rel(c.createdAt)}</div></div><a class="btn sm" href="${h(c.mediaUrl)}" target="_blank" rel="noopener">Open</a></div>`).join('') || '<div class="muted small">No files yet.</div>'}</div>
        <div class="drop" data-drop="docFile" tabindex="0" role="button">${I('up', 22)}<div><b>Upload a file</b></div><div class="small">PDF or image, under 10 MB</div></div><input type="file" id="docFile" accept="application/pdf,image/*" hidden data-chg="docFile">
      </div></div>
      <div class="card"><div class="hd"><h2 class="sp">Calling rules</h2></div><div class="bd stack">${rulesForm(S.cfg.settings || {})}<div class="row"><span class="xs muted sp">Manual “AI call now” works 9 am – 9 pm. Do-not-call numbers are never called.</span><button class="btn pri" data-act="saveRules">Save</button></div></div></div>
      <div class="card"><div class="hd"><h2 class="sp">Team</h2></div><div class="bd stack">${teamForm()}</div></div>
      <div class="card"><div class="bd row"><span class="sp small muted">Need the detailed old dashboard (pipeline, reports, agent studio)?</span><a class="btn sm" href="classic.html">Open classic dashboard</a></div></div>
    </div>`;
  };

  Object.assign(CHG, {
    docFile: async (el) => { const f = el.files[0]; if (!f) return; if (f.size > 10 * 1024 * 1024) return toast('File is over 10 MB'); try { toast('Uploading…'); const url = await upload(f, 'docs'); const c = { id: uid('ct'), kind: 'doc', title: f.name, mediaUrl: url, mediaKind: /pdf/i.test(f.type) ? 'document' : 'image', fileName: f.name, createdAt: Date.now(), by: S.sess.email }; await save('content', c); upLocal('content', c); toast('File saved'); render(); } catch (e) { toast(e.message); } },
    wizLeads: async (el) => { const f = el.files[0]; if (!f) return; const box = $('#wizLeadsOut'); if (box) box.innerHTML = '<div class="note">Reading…</div>'; try { const r = await P.importFile(f); V.wizImp = r; render(); toast(r.added + ' leads added'); } catch (e) { if (box) box.innerHTML = `<div class="note warn">${h(e.message)}</div>`; } }
  });
  Object.assign(ACT, {
    recheck: async () => { V.status = null; await loadStatus(true); render(); },
    saveProfile: async () => { try { await saveCfg('profile', readProfile(S.cfg.profile)); toast('Profile saved'); render(); } catch (e) { toast(e.message); } },
    saveRules: async () => { try { await saveCfg('settings', readRules(S.cfg.settings)); toast('Calling rules saved'); } catch (e) { toast(e.message); } },
    dlFaq: () => { const b = new Blob([agentFaq()], { type: 'text/plain;charset=utf-8' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'Asha_Knowledge_Base.txt'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); },
    teamAdd: () => { const t = readTeam(); t.push({ id: uid('u'), name: '', role: 'Sales', areas: [], active: true }); S.cfg.team = t; render(); },
    teamDel: (el) => { const t = readTeam(); t.splice(Number(el.dataset.i), 1); S.cfg.team = t; render(); },
    teamSave: async () => { try { await saveCfg('team', readTeam().filter((t) => t.name)); toast('Team saved'); render(); } catch (e) { toast(e.message); } },
    wizard: () => { V.view = 'wizard'; V.wiz = 0; render(); }
  });
  function readTeam() {
    const old = S.cfg.team || [];
    return [...document.querySelectorAll('[data-tr]')].map((row) => { const i = Number(row.dataset.tr); const g = (k) => (row.querySelector(`[data-tk="${k}"]`) || {}).value || ''; return Object.assign({}, old[i] || { id: uid('u'), active: true }, { name: g('name').trim(), role: g('role'), areas: g('areas').split(',').map((x) => x.trim()).filter(Boolean) }); });
  }

  /* ---------------- first-time onboarding ---------------- */
  const WSTEPS = ['Business', 'Leads', 'Knowledge', 'Voice agent', 'WhatsApp'];
  VIEWS.wizard = function () {
    const i = V.wiz || 0; const p = S.cfg.profile || {}; if (i >= 3 && !V.status) loadStatus().then(() => { if (V.view === 'wizard') render(); });
    const s = V.status || {};
    let body = '';
    if (i === 0) body = `<div><h2>Tell us about your business</h2><div class="muted small">Asha uses this on calls; captions and WhatsApp use it too. You can change it later.</div></div>${profileForm(p, ['company', 'owner', 'phone', 'whatsapp', 'city', 'address', 'hours', 'pricePerKw', 'warrantyPanels', 'areas'])}`;
    if (i === 1) body = `<div><h2>Bring in your leads</h2><div class="muted small">Upload the Excel/CSV you already have — Meta ads export, Google sheet, old CRM. Only a mobile number column is required.</div></div>
      <div class="drop" data-drop="wizLeadsFile" tabindex="0" role="button">${I('up', 28)}<div style="margin-top:6px"><b>Drop Excel / CSV here</b> or tap to choose</div></div><input type="file" id="wizLeadsFile" accept=".xlsx,.xls,.csv" hidden data-chg="wizLeads">
      <div id="wizLeadsOut">${V.wizImp ? `<div class="note good">${I('check', 14)} ${V.wizImp.added} new leads added from ${h(V.wizImp.file)}${V.wizImp.dup ? ` · ${V.wizImp.dup} were already there` : ''}${V.wizImp.bad ? ` · ${V.wizImp.bad} rows had no valid mobile` : ''}.</div>` : `<div class="xs muted">${S.leads.length} leads in your CRM now. You can skip this and import later from Leads.</div>`}</div>`;
    if (i === 2) body = `<div><h2>Teach Asha about Solaris</h2><div class="muted small">Add your price per kW, warranty and brochure. Then copy this into Sarvam → Knowledge Base.</div></div>
      ${profileForm(p, ['pricePerKw', 'panels', 'inverter', 'warrantyPanels', 'warrantyInverter', 'warrantyWork', 'emi', 'extra'])}
      <div class="row"><button class="btn sm" data-act="wizFaq">${I('file', 14)} Download knowledge file</button><span class="xs muted">Built from the answers above</span></div>
      <div class="drop" data-drop="brochureFile" tabindex="0" role="button">${I('up', 22)}<div><b>Upload your brochure (PDF)</b> — sent on WhatsApp to interested callers</div>${waCfg().brochureUrl ? `<div class="small" style="color:var(--good)">✓ Brochure uploaded</div>` : ''}</div><input type="file" id="brochureFile" accept="application/pdf" hidden data-chg="brochureFile">`;
    if (i === 3) body = `<div><h2>Your AI voice agent</h2><div class="muted small">Asha calls new leads, answers the phone, books visits and fills this CRM by herself.</div></div>
      <div class="row"><span class="sp">${I('bot', 16)} Sarvam connection</span>${V.status ? stBadge(s.voice && s.voice.ready) : '<span class="small muted">checking…</span>'}</div>
      ${V.status && s.voice && !s.voice.ready ? `<div class="note warn small">${h(s.voice.note || '')} — add these in Supabase → Edge Functions → Secrets (see Setup → Connections).</div>` : ''}
      ${rulesForm(S.cfg.settings || {})}
      <div class="row"><input class="i" id="wizTest" placeholder="Your mobile for a test call" inputmode="tel" value="${h(p.phone || '')}" style="max-width:260px"><button class="btn" data-act="wizTestCall" ${V.status && s.voice && !s.voice.ready ? 'disabled' : ''}>${I('phone', 15)} Asha, call me</button></div>`;
    if (i === 4) body = `<div><h2>WhatsApp</h2><div class="muted small">Asha sends visit confirmations, callback times and your brochure automatically — and you can broadcast offers with AI captions.</div></div>
      <div class="row"><span class="sp">${I('wa', 16)} WhatsApp connection</span>${V.status ? stBadge(s.whatsapp && s.whatsapp.ready) : ''}</div>
      <div class="note small"><b>Cheapest:</b> Meta WhatsApp Cloud API direct — about ₹0.86 per marketing message and ₹0.12 per confirmation, no monthly fee. <b>Easier:</b> AiSensy — about ₹1.09 per marketing message plus a monthly plan. Customer replies are free for 24 hours on both.</div>
      <div class="small">Next: submit the 5 message templates (Setup → WhatsApp → Templates has the exact text to copy). Approval usually takes minutes to a day.</div>`;
    return `<div class="center"><div class="card wiz">
      <div class="steps">${WSTEPS.map((t, k) => `<span class="st ${k === i ? 'on' : k < i ? 'ok' : ''}"><i>${k < i ? '✓' : k + 1}</i>${t}</span>`).join('')}</div>
      <div class="wb">${body}</div>
      <div class="wf">${i > 0 ? '<button class="btn" data-act="wizBack">Back</button>' : '<span></span>'}<div class="row">${S.cfg.profile ? '<button class="btn ghost" data-act="wizExit">Skip for now</button>' : ''}<button class="btn pri" data-act="wizNext">${i === WSTEPS.length - 1 ? 'Finish — open my dashboard' : 'Continue'}</button></div></div>
    </div></div>`;
  };
  Object.assign(ACT, {
    wizBack: () => { V.wiz = Math.max(0, (V.wiz || 0) - 1); render(); },
    wizExit: () => { V.view = 'home'; render(); },
    wizFaq: async () => { try { await saveCfg('profile', readProfile(S.cfg.profile)); } catch (e) { /* offline ok */ } ACT.dlFaq(); },
    wizNext: async (el) => {
      const i = V.wiz || 0; el.disabled = true;
      try {
        if (i === 0) { const p = readProfile(S.cfg.profile); if (!p.company) { el.disabled = false; return toast('Enter your company name'); } p.createdAt = p.createdAt || Date.now(); await saveCfg('profile', p); }
        if (i === 2) await saveCfg('profile', readProfile(S.cfg.profile));
        if (i === 3) await saveCfg('settings', readRules(S.cfg.settings));
        if (i === WSTEPS.length - 1) { const p = Object.assign({}, S.cfg.profile, { setupDone: Date.now() }); await saveCfg('profile', p); V.view = 'home'; toast('All set — welcome to Solaris AI OS'); render(); return; }
        V.wiz = i + 1; render();
      } catch (e) { toast(e.message); el.disabled = false; }
    },
    wizTestCall: async (el) => {
      const phone = normPhone($('#wizTest').value); if (!phone) return toast('Enter a valid mobile number');
      el.disabled = true;
      try {
        let l = S.leads.find((x) => x.phone === phone);
        if (!l) { l = P.refresh({ id: uid('ld'), name: first((S.cfg.profile || {}).owner) || 'Test call', phone, stage: 'New', source: 'Test call', consent: true, lang: 'mr', type: 'Home', objections: [], notes: [], tags: ['Test'], createdAt: Date.now() }); await save('leads', l); upLocal('leads', l); }
        await fn('start-call', { lead_id: l.id }); toast('Asha is calling you now — pick up!');
      } catch (e) { toast('Test call failed: ' + e.message); }
      el.disabled = false;
    }
  });
})();
