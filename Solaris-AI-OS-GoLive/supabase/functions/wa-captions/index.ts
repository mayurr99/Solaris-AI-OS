// @ts-nocheck
// Panel → "Suggest captions": reads a web page / text, then writes one caption per client (by name + language).
// Body: { url?, title?, text?, note?, image?, content_id?, save?: true, lead_ids?: [...], tone? }
import { sb, json, CORS, staffUser, upsert, getConfig, uid } from '../_shared/db.ts';
import { fetchPage, captionPrompt, parseCaptions, fallbackCaption, firstName, llm } from '../_shared/captions.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  const user = await staffUser(req);
  if (!user) return json({ error: 'Please log in again' }, 401);
  let b; try { b = await req.json(); } catch (_) { return json({ error: 'body must be JSON' }, 400); }

  // 1) the content
  let content = null;
  if (b.content_id) { const { data } = await sb.from('content').select('data').eq('id', b.content_id).maybeSingle(); content = data && data.data; }
  if (!content) {
    content = { id: uid('ct'), title: b.title || '', summary: '', text: b.text || '', image: b.image || '', url: b.url || '', note: b.note || '', createdAt: Date.now(), by: user.email };
    if (b.url) {
      try { const p = await fetchPage(b.url); content = Object.assign(content, { title: content.title || p.title, summary: p.summary, text: content.text || p.text, image: content.image || p.image }); }
      catch (e) { return json({ ok: false, error: 'Could not read that page: ' + String(e.message || e) }, 422); }
    }
    if (b.mediaUrl) Object.assign(content, { mediaUrl: b.mediaUrl, mediaKind: b.mediaKind, fileName: b.fileName });
    if (b.save) await upsert('content', [content]);
  }

  // 2) the clients
  const ids = Array.from(new Set(b.lead_ids || [])).slice(0, 60);
  let clients = [];
  if (ids.length) {
    const { data } = await sb.from('leads').select('data').in('id', ids);
    clients = (data || []).map((r) => r.data).map((l) => ({ id: l.id, first: firstName(l.name) || 'मित्रा', lang: l.lang || 'mr', area: l.area, type: l.type, stage: l.stage }));
  } else {
    // no clients picked → three reusable versions with a {name} placeholder
    clients = [{ id: 'mr', first: '{name}', lang: 'mr' }, { id: 'hi', first: '{name}', lang: 'hi' }, { id: 'en', first: '{name}', lang: 'en' }];
  }

  // 3) AI captions, 15 clients per request
  const profile = (await getConfig('profile', {})) || {};
  const out = {}; let aiError = null;
  for (let i = 0; i < clients.length; i += 15) {
    const chunk = clients.slice(i, i + 15);
    try {
      const txt = await llm(captionPrompt(content, chunk, { company: profile.company, city: profile.city, tone: b.tone }));
      parseCaptions(txt).forEach((c) => { out[c.id] = c.caption; });
    } catch (e) { aiError = String(e.message || e); }
  }
  const captions = clients.map((c) => ({ id: c.id, caption: out[c.id] || fallbackCaption(content, c), ai: !!out[c.id] }));
  return json({ ok: true, content, captions, aiError });
});
