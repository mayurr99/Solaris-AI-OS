// @ts-nocheck
// Dashboard → play a call recording. Keeps the Sarvam API key on the server.
import { json, CORS, staffUser } from '../_shared/db.ts';
import { fetchRecording } from '../_shared/sarvam.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (!(await staffUser(req))) return json({ error: 'Please log in again' }, 401);
  const id = new URL(req.url).searchParams.get('interaction_id');
  if (!id) return json({ error: 'interaction_id required' }, 400);
  const r = await fetchRecording(id);
  const type = r.headers.get('content-type') || '';
  if (!r.ok) return json({ error: 'Sarvam ' + r.status + ': ' + (await r.text()).slice(0, 200) }, 502);
  if (/audio|octet-stream/.test(type)) return new Response(r.body, { headers: { ...CORS, 'Content-Type': type.includes('audio') ? type : 'audio/mpeg' } });
  const j = await r.json().catch(() => ({}));
  const url = j.url || j.recording_url || j.signed_url || (j.data && (j.data.url || j.data.recording_url)) || null;
  return url ? json({ url }) : json({ error: 'No recording link in Sarvam response', raw: j }, 404);
});
