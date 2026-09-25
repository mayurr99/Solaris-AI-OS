// @ts-nocheck
// Content from the web + AI captions personalised per client (Sarvam LLM, Marathi/Hindi/English).
// Secrets: SARVAM_API_KEY (same key) · optional SARVAM_LLM_MODEL (default sarvam-105b), SARVAM_LLM_URL
import { env } from './db.ts';

const decode = (s) => String(s || '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
function meta(html, key) {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]*>`, 'i'); const tag = (html.match(re) || [])[0] || '';
  return decode((tag.match(/content=["']([^"']*)["']/i) || [])[1] || '');
}
/** turn a web page into { title, summary, image, text } */
export function pageToContent(html, url) {
  html = String(html || '');
  const title = meta(html, 'og:title') || decode((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '').trim();
  const summary = meta(html, 'og:description') || meta(html, 'description');
  let image = meta(html, 'og:image') || meta(html, 'twitter:image');
  if (image && url) { try { image = new URL(image, url).href; } catch (_) { /* keep */ } }
  const body = html.replace(/<head[\s\S]*?<\/head>|<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<noscript[\s\S]*?<\/noscript>|<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<(nav|footer|header)[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ');
  const text = decode(body).replace(/\s+/g, ' ').trim().slice(0, 3000);
  return { title: title.slice(0, 200), summary: summary.slice(0, 400), image: image || '', text };
}
export async function fetchPage(url) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 9000);
  try {
    const r = await fetch(url, { signal: ctl.signal, headers: { 'User-Agent': 'Mozilla/5.0 (SolarisAIOS content fetcher)', Accept: 'text/html' } });
    if (!r.ok) throw new Error('Page returned ' + r.status);
    const html = (await r.text()).slice(0, 600000);
    return pageToContent(html, url);
  } finally { clearTimeout(t); }
}

const LANG = { mr: 'Marathi (Devanagari)', hi: 'Hindi (Devanagari)', en: 'simple Indian English' };
export function captionPrompt(content, clients, opts) {
  const o = opts || {};
  const facts = [content.title && 'Title: ' + content.title, content.summary && 'Summary: ' + content.summary, content.text && 'Details: ' + String(content.text).slice(0, 1800), content.note && 'Owner note: ' + content.note].filter(Boolean).join('\n');
  const list = clients.map((c) => `- id=${c.id} | name=${c.first} | language=${LANG[c.lang] || LANG.mr} | area=${c.area || ''} | type=${c.type || ''} | stage=${c.stage || ''}`).join('\n');
  return [
    { role: 'system', content: `You write short WhatsApp captions for ${o.company || 'Solaris'}, a rooftop solar company in ${o.city || 'Nashik'}, Maharashtra.
Rules:
- One caption per client, in that client's language. Use the client's first name once, naturally (e.g. "गणेश जी,").
- 1–3 short sentences, max 300 characters. Warm, local, human; no hard selling.
- Use only facts from the content. Never invent prices, discounts, dates or guarantees.
- At most one emoji. No hashtags. No links (the link/image is attached separately).
- If it suits the stage (New/Contacted/Qualified) end with a soft call to action like booking a free site survey; for customers (Won) be thankful and helpful instead.
- Tone: ${o.tone || 'friendly'}.
Return ONLY a JSON array: [{"id":"<id>","caption":"<text>"}] — no other text.` },
    { role: 'user', content: `CONTENT\n${facts || '(no details)'}\n\nCLIENTS\n${list}` }
  ];
}
/** pull the JSON array out of an LLM reply (handles <think> blocks and code fences) */
export function parseCaptions(txt) {
  let s = String(txt || '').replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/```(?:json)?/gi, '');
  const a = s.indexOf('['), b = s.lastIndexOf(']');
  if (a < 0 || b <= a) return [];
  try { const arr = JSON.parse(s.slice(a, b + 1)); return Array.isArray(arr) ? arr.filter((x) => x && x.id && x.caption).map((x) => ({ id: String(x.id), caption: String(x.caption).trim().slice(0, 700) })) : []; }
  catch (_) { return []; }
}
export function fallbackCaption(content, c) {
  const t = content.title || 'Solaris सोलर';
  if (c.lang === 'hi') return `${c.first} जी, ${t} — पूरी जानकारी साथ भेज रहे हैं। मुफ़्त साइट सर्वे के लिए "हाँ" लिखें।`;
  if (c.lang === 'en') return `Hi ${c.first}, sharing "${t}" with you. Reply "Yes" for a free site survey.`;
  return `${c.first} जी, ${t} — माहिती सोबत पाठवत आहोत. मोफत सर्व्हेसाठी "हो" असा रिप्लाय करा.`;
}
export const firstName = (n) => { const s = String(n || '').trim().split(/\s+/)[0] || ''; return /^(enquiry|caller|unknown)$/i.test(s) ? '' : s; };

export async function llm(messages) {
  const url = env('SARVAM_LLM_URL', 'https://api.sarvam.ai/v1/chat/completions');
  const key = env('SARVAM_LLM_KEY') || env('SARVAM_API_KEY');
  if (!key) throw new Error('Add SARVAM_API_KEY in Supabase secrets to get AI captions');
  const models = [env('SARVAM_LLM_MODEL', 'sarvam-105b'), 'sarvam-m'];
  let last = null;
  for (const model of models) {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'api-subscription-key': key, Authorization: 'Bearer ' + key },
      body: JSON.stringify({ model, messages, temperature: 0.6, max_tokens: 2500, reasoning_effort: 'low' }) });
    const j = await r.json().catch(() => ({}));
    if (r.ok) return (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '';
    last = (j.error && (j.error.message || j.error)) || j.message || ('LLM HTTP ' + r.status);
    if (r.status !== 400 && r.status !== 404 && r.status !== 422) break; // only retry for a model-name problem
  }
  throw new Error(String(last));
}
