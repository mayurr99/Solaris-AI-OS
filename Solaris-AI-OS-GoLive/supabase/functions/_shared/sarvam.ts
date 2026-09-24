// @ts-nocheck
// Calls to the Sarvam Agents API.
import { env } from './db.ts';

const BASE = env('SARVAM_BASE_URL', 'https://apps.sarvam.ai');
const headers = () => ({ 'Content-Type': 'application/json', 'api-subscription-key': env('SARVAM_API_KEY'), 'X-API-Key': env('SARVAM_API_KEY') });

export function sarvamReady() {
  const need = ['SARVAM_API_KEY', 'SARVAM_ORG_ID', 'SARVAM_WORKSPACE_ID', 'SARVAM_APP_ID', 'SARVAM_CONNECTION_ID', 'SARVAM_AGENT_NUMBER'];
  const missing = need.filter((k) => !env(k));
  return missing.length ? 'Missing secrets: ' + missing.join(', ') : null;
}

/** place one outbound AI call; returns { attempt_id } or throws with Sarvam's message */
export async function placeCall(phoneE164, meta) {
  const url = `${BASE}/api/outbounds/v1/orgs/${env('SARVAM_ORG_ID')}/workspaces/${env('SARVAM_WORKSPACE_ID')}/outbounds`;
  const hook = env('PUBLIC_WEBHOOK_URL'); // https://<project>.supabase.co/functions/v1/sarvam-webhook?token=...
  const body = {
    app_config: {
      app_id: env('SARVAM_APP_ID'),
      app_version: Number(env('SARVAM_APP_VERSION', '1')),
      connection_config: { connection_id: env('SARVAM_CONNECTION_ID'), agent_phone_number: env('SARVAM_AGENT_NUMBER') }
    },
    user_config: { user_phone_number: phoneE164 },
    ...(hook ? { webhook_config: { url: hook, metadata: meta || null } } : {})
  };
  const r = await fetch(url, { method: 'POST', headers: headers(), body: JSON.stringify(body) });
  const text = await r.text();
  let j = null; try { j = JSON.parse(text); } catch (_) { /* not json */ }
  if (!r.ok) throw new Error(`Sarvam ${r.status}: ${(j && (j.detail?.[0]?.msg || j.detail || j.message)) || text.slice(0, 200)}`);
  return j || {};
}

export async function fetchRecording(interactionId) {
  const url = `${BASE}/api/analytics/v1/${env('SARVAM_ORG_ID')}/${env('SARVAM_WORKSPACE_ID')}/${env('SARVAM_APP_ID')}/recordings/${encodeURIComponent(interactionId)}`;
  return await fetch(url, { headers: headers() });
}
