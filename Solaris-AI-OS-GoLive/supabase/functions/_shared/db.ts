// @ts-nocheck
// Database + HTTP helpers for the Solaris edge functions (Supabase / Deno).
import { createClient } from 'npm:@supabase/supabase-js@2';

export const env = (k, d) => Deno.env.get(k) ?? d;
function adminKey() {
  const legacy = env('SUPABASE_SERVICE_ROLE_KEY');
  if (legacy) return legacy;
  const raw = env('SUPABASE_SECRET_KEYS') || env('SUPABASE_SECRET_KEY') || '';
  try { const j = JSON.parse(raw); if (typeof j === 'string') return j; const v = j.default || Object.values(j)[0]; if (v) return v; } catch (_) { /* plain key */ }
  return raw;
}
export const sb = createClient(env('SUPABASE_URL'), adminKey(), { auth: { persistSession: false, autoRefreshToken: false } });

export const CORS = {
  'Access-Control-Allow-Origin': env('ALLOWED_ORIGIN', '*'),
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-token',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};
export const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

/** shared-secret check for calls coming from Sarvam or the scheduler */
export function tokenOk(req) {
  const want = env('WEBHOOK_TOKEN');
  if (!want) return false;
  const u = new URL(req.url);
  return u.searchParams.get('token') === want || req.headers.get('x-webhook-token') === want;
}
/** logged-in Solaris staff member (dashboard) */
export async function staffUser(req) {
  const h = req.headers.get('authorization') || '';
  const jwt = h.replace(/^Bearer\s+/i, '');
  if (!jwt) return null;
  const { data, error } = await sb.auth.getUser(jwt);
  if (error || !data || !data.user) return null;
  return data.user;
}

export async function getConfig(id, fallback) {
  const { data } = await sb.from('config').select('data').eq('id', id).maybeSingle();
  return data && data.data && data.data.value !== undefined ? data.data.value : fallback;
}
export async function setConfig(id, value) {
  const { error } = await sb.from('config').upsert({ id, data: { value } });
  if (error) throw error;
}
export async function settings() {
  const s = await getConfig('settings', {}) || {};
  const n = (k) => (env(k) != null && env(k) !== '' ? Number(env(k)) : undefined);
  const o = { dailyCap: n('DAILY_CALL_CAP'), maxAttempts: n('MAX_ATTEMPTS'), retryGapHours: n('RETRY_GAP_HOURS') };
  Object.keys(o).forEach((k) => o[k] === undefined && delete o[k]);
  return Object.assign({}, s, o);
}
export async function row(table, id) {
  const { data } = await sb.from(table).select('data').eq('id', id).maybeSingle();
  return data ? data.data : null;
}
export async function leadByPhone(phone) {
  if (!phone) return null;
  const { data } = await sb.from('leads').select('data').eq('phone', phone).maybeSingle();
  return data ? data.data : null;
}
export async function upsert(table, records) {
  const rows = (records || []).filter(Boolean).map((r) => ({ id: r.id, data: r }));
  if (!rows.length) return;
  const { error } = await sb.from(table).upsert(rows);
  if (error) throw new Error(table + ': ' + error.message);
}
export async function log(leadId, kind, text, id) {
  await upsert('activity', [{ id: id || 'ac_' + crypto.randomUUID().slice(0, 12), at: Date.now(), leadId, kind, text }]);
}
export const uid = (p) => p + '_' + crypto.randomUUID().replace(/-/g, '').slice(0, 12);
