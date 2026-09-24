// @ts-nocheck
// Runs every few minutes (Supabase cron): places due AI calls — retries, callbacks, campaign queue.
import { json, CORS, tokenOk } from '../_shared/db.ts';
import { runDue } from '../_shared/dispatch.ts';
import { sarvamReady } from '../_shared/sarvam.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (!tokenOk(req)) return json({ error: 'unauthorised' }, 401);
  const missing = sarvamReady(); if (missing) return json({ error: missing }, 500);
  try { return json(await runDue(Number(Deno.env.get('BATCH_SIZE') || 5))); }
  catch (e) { console.error(e); return json({ error: String(e.message || e) }, 500); }
});
