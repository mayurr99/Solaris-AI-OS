# Solaris AI OS — Go-live kit (Sarvam + live dashboard)

Connects Solaris' **Sarvam voice agent (Asha)** to the **Solaris AI OS dashboard**. Every real call then updates the CRM on its own: lead, transcript, recording, score, site visit, follow-up and do-not-call list.

```
New enquiry (Meta / Google / website / IndiaMART / Excel)
        │  new-lead  (Asha calls within minutes, inside calling hours)
        ▼
Customer ⇄ Sarvam agent "Asha" ── on-start: lead-context (knows the caller's name, area, bill)
        │  webhook after every call
        ▼
Supabase (database + 6 small functions) ◀── run-due every 3 min: retries, callbacks, campaigns
        ▲
        │  live sync every 4 s · "AI call now" · recordings · HOT-lead alerts
Solaris AI OS dashboard (hosted on Netlify, staff log in)
```

Time needed: about 90 minutes, once. Cost: Supabase + Netlify free tiers are enough to start (check their current limits; free Supabase projects can pause when unused, so move to a paid plan before relying on it daily). Sarvam call minutes are billed by Sarvam.

---

## What's in this kit

| Path | What it is |
| --- | --- |
| `supabase/schema.sql` | Creates the database tables, security rules and triggers |
| `supabase/cron.sql` | Runs the calling robot every 3 minutes |
| `supabase/secrets.env.example` | List of secret keys to fill in |
| `supabase/functions/sarvam-webhook` | Receives every finished Sarvam call → updates the CRM |
| `supabase/functions/start-call` | "AI call now" and campaigns from the dashboard |
| `supabase/functions/run-due` | Places due calls: no-answer retries, callbacks, campaign queue |
| `supabase/functions/new-lead` | Takes new enquiries from ads/forms and calls them fast |
| `supabase/functions/lead-context` | Tells Asha who is calling before she speaks |
| `supabase/functions/recording` | Plays real call recordings in the dashboard |
| `dashboard/` | The dashboard website — drag this folder onto Netlify |

---

## Step 1 — Create the database (15 min)

1. Go to supabase.com → **New project**. Name: `solaris-ai-os`. Region: **Mumbai (ap-south-1)**. Save the database password.
2. **SQL Editor** → New query → paste all of `supabase/schema.sql` → **Run**.
3. **Authentication → Sign In / Providers**: turn **off** "Allow new users to sign up". (Only people you add can log in.)
4. **Authentication → Users → Add user** for the owner and each salesperson (email + password, tick "Auto confirm").
5. **Project Settings → API**: copy the **Project URL** and the **anon public** key. You need them in Step 6.

## Step 2 — Put the functions online (20 min)

On a laptop with Node.js installed, open a terminal in this folder:

```bash
npm install -g supabase            # or: brew install supabase/tap/supabase
supabase login
supabase init                      # answer "N" to the questions
supabase link --project-ref <PROJECT_REF>     # PROJECT_REF = the xxxx in https://xxxx.supabase.co

cp supabase/secrets.env.example supabase/secrets.env   # fill it in (see Step 3)
supabase secrets set --env-file supabase/secrets.env

supabase functions deploy sarvam-webhook --no-verify-jwt
supabase functions deploy lead-context  --no-verify-jwt
supabase functions deploy run-due       --no-verify-jwt
supabase functions deploy new-lead      --no-verify-jwt
supabase functions deploy start-call    --no-verify-jwt
supabase functions deploy recording     --no-verify-jwt
```

> All six functions run with **legacy JWT verification OFF** (Supabase's recommended setting with the new publishable/secret keys). They do their own auth: webhook/cron/lead functions need `?token=WEBHOOK_TOKEN`; `start-call` and `recording` need a logged-in dashboard user. The service key is read automatically from `SUPABASE_SERVICE_ROLE_KEY` or the new `SUPABASE_SECRET_KEYS`.

Then **Database → Extensions**: enable `pg_cron` and `pg_net`. Open `supabase/cron.sql`, replace `<PROJECT_REF>` and `<WEBHOOK_TOKEN>`, run it in the SQL Editor.

## Step 3 — Sarvam details for `secrets.env` (15 min)

| Secret | Where to find it in Sarvam (indus.sarvam.ai) |
| --- | --- |
| `SARVAM_API_KEY` | API keys page |
| `SARVAM_ORG_ID`, `SARVAM_WORKSPACE_ID` | Workspace settings (they also appear in the page address) |
| `SARVAM_APP_ID`, `SARVAM_APP_VERSION` | Your outbound Asha agent → its ID and the **committed** version number |
| `SARVAM_CONNECTION_ID`, `SARVAM_AGENT_NUMBER` | Deploy → Phone Numbers → your connection and number (+91…) |
| `WEBHOOK_TOKEN` | Invent a long random secret (32+ letters/digits) |
| `PUBLIC_WEBHOOK_URL` | `https://<PROJECT_REF>.supabase.co/functions/v1/sarvam-webhook?token=<WEBHOOK_TOKEN>` |

If you change a secret later, run `supabase secrets set …` again. No redeploy needed.

## Step 4 — Connect Sarvam to the backend (15 min)

In the Sarvam agent (both inbound and outbound copies):

1. **Output variables** must use these exact names (they're in the Sarvam agent file):
   `call_type, property, bill_amount, locality, roof_owner, timeline, objections, survey_booked, survey_time, callback_time, interest, dnc, support_issue`
   Recommended extra: `summary` (String): *"Two-sentence summary of the call in English."*
   For `survey_time` and `callback_time` ask for the format `YYYY-MM-DD HH:MM`. (Spoken phrases like "उद्या संध्याकाळी" are also understood.)
2. **Input variables**: `customer_name, area, monthly_bill, property_type, lead_source`.
3. **On-start hook** → URL `https://<PROJECT_REF>.supabase.co/functions/v1/lead-context?token=<WEBHOOK_TOKEN>` (POST). Map the response fields `customer_name, area, monthly_bill, property_type, lead_source` to the input variables of the same name.
4. **Webhook** (Campaigns and the Inbound deployment): `https://<PROJECT_REF>.supabase.co/functions/v1/sarvam-webhook?token=<WEBHOOK_TOKEN>`.
   Calls started from the dashboard send it automatically (`PUBLIC_WEBHOOK_URL`).
   If the Inbound screen has no webhook field, set the same URL as the **on-end hook**.
5. **Commit** the agent version and update `SARVAM_APP_VERSION` if it changed.

## Step 5 — Put the dashboard online (5 min)

1. Go to **app.netlify.com/drop** and drag the whole `dashboard` folder onto the page.
2. Netlify gives a link like `https://solaris-ai-os.netlify.app`. Rename it under Site settings if you like.
3. Set `ALLOWED_ORIGIN` to that link: `supabase secrets set ALLOWED_ORIGIN=https://solaris-ai-os.netlify.app`.

## Step 6 — Log in and set up (10 min)

1. Open the Netlify link → **Settings → Live connection**: paste the Project URL and anon key, then log in with the owner email and password. The top bar shows **LIVE**.
2. **Set up for Solaris**: team and areas (routing), prices, agent review. **Personalize**: logo, colour, मराठी menus.
3. **Settings → Live connection**: daily call limit, attempts, gap between attempts. The server enforces these.
4. **Excel lead import**: import Solaris' lead list. Leave "start calling" unticked the first time.
5. Salespeople log in on their phones with their own email; they choose themselves under "Viewing as".

## Step 7 — Test with your own phones before real customers (15 min)

| # | Do this | You should see |
| --- | --- | --- |
| 1 | Call the Sarvam number from your mobile, book a survey | Within seconds: new lead, transcript, visit on the calendar, HOT alert |
| 2 | Add yourself as a lead → **AI call now** | "Calling now" appears; after the call, the lead updates |
| 3 | Don't answer an AI call | "No answer" + automatic retry after 4 h |
| 4 | Say "उद्या संध्याकाळी फोन करा" | Callback follow-up for tomorrow evening, called automatically |
| 5 | Say "पुन्हा फोन करू नका" | Lead marked DNC; every follow-up cancelled; can't be called again |
| 6 | Campaign on 5 team numbers | 5 calls placed a few at a time; results fill in |
| 7 | Send a test enquiry to `new-lead` (below) | Lead appears and Asha calls within a minute |

```bash
curl -X POST 'https://<PROJECT_REF>.supabase.co/functions/v1/new-lead?token=<WEBHOOK_TOKEN>' \
  -H 'Content-Type: application/json' \
  -d '{"name":"Test","phone":"98XXXXXXXX","area":"Gangapur Road","monthly_bill":"4500","source":"Meta Ads"}'
```

---

## Speed to lead: connect ad forms (biggest conversion lever)

Solar buyers enquire with 3–4 installers. The first to call usually gets the site visit. Send every new enquiry to `new-lead`; Asha calls within a minute during calling hours, or at 10:00 next morning.

- **Meta / Facebook Lead Ads, Google Lead Forms**: Zapier, Make or Pabbly → "Webhook / POST" → the `new-lead` URL. Map: `name`, `phone`, `area`/`city`, `monthly_bill`, `source` (e.g. "Meta Ads"), `campaign`.
- **Website form**: have the web developer POST the same fields to the URL.
- **IndiaMART / JustDial**: their lead emails or API → Make/Zapier → same URL.

Accepted field names include `name/full_name`, `phone/phone_number/mobile`, `area/city/locality`, `monthly_bill/bill`, `property_type`, `source`, `campaign`, `notes/message`. JSON or form data both work. Repeat enquiries from the same number are merged, not duplicated.

---

## Daily routine that converts leads

**Salesperson (on phone, "Viewing as" = themselves)**
1. 10:00: open **Overview → Hot leads**. Call every HOT lead personally within 30 minutes of the alert.
2. Before leaving for a survey, open the lead: read the AI summary, bill, roof, objections.
3. After each survey: mark the visit **Completed** with notes → send the quotation within 24 h (the system creates the follow-up).
4. Clear **Follow-ups → Overdue** before 18:00.

**Owner (10 minutes a day)**
1. Overview: calls today, visits booked, overdue follow-ups per salesperson.
2. Listen to 3–5 calls (Leads → Calls & recordings). Note any wrong answer, then fix the Sarvam prompt or knowledge base the same day.
3. Weekly: Reports → sources (which ads bring surveys, not just leads), objections, sales leaderboard.

---

## What happens when… (situations the system already handles)

| Situation | What the system does |
| --- | --- |
| Enquiry arrives at 22:30 | Saved at once; Asha calls at 10:00 next morning (calling window) |
| Customer doesn't pick up | Retries after 4 h, up to 3 attempts (setting), then hands to the salesperson with a note |
| Number busy / call fails | Logged; failure reason saved; retry follows the same rules |
| Number is on TRAI NDNC | Telecom blocks it; lead flagged; AI never auto-calls again; salesperson gets a manual-call task |
| Customer says "don't call" | DNC list, stage Lost, every pending follow-up cancelled, server refuses future calls |
| Customer says "call me tomorrow evening" | Callback follow-up at 18:00 next day; Asha calls automatically |
| Survey booked but time unclear | Salesperson gets a task "fix exact time" within 15 minutes |
| Survey booked | Visit on calendar with surveyor by zone + reminder task 3 h before |
| Existing customer calls about subsidy | Support ticket + owner callback task by 5 PM next day; AI never guesses status |
| Same person enquires twice | One lead (matched by mobile), tagged with both sources; no double call within 24 h |
| Someone presses "AI call now" twice | Blocked if called in the last 2 h (automatic calls); manual calls allowed 09:00–21:00 only |
| Campaign on 500 leads | Queued; called 5 at a time every 3 min inside calling hours; stops at the daily limit |
| Lead has no consent | Imported, but never auto-called; salesperson task "confirm consent" |
| Sarvam never reports a call | After 30 min the call is marked "No result" so nothing is stuck |
| Webhook delivered twice | Safe: every record has a fixed ID, so nothing duplicates |
| Two staff edit the same lead | Last save wins; the other screen updates within seconds |
| Internet drops on the office laptop | Calls continue (they run in the cloud); dashboard catches up when back online |
| A salesperson leaves | Remove their login in Supabase; reassign leads with Leads → select → Assign |
| New salesperson | Add login in Supabase + add them in Setup (areas); new leads route to them |
| Asha gives a wrong answer | Fix the Sarvam prompt/knowledge base; transcripts show exactly what was said |
| Owner wants a copy of all data | Reports → Export Excel (leads, calls with transcripts, follow-ups, visits) |

## Security

- Sarvam API key and database admin key live only in Supabase secrets, never in the browser.
- Only staff you add can log in; sign-ups are off; anonymous visitors can read nothing.
- Webhook URLs need the secret `WEBHOOK_TOKEN`; change it if it ever leaks (then update Sarvam and cron).
- Turn on **Personalize → Hide customer phone numbers** before screen-sharing.

## Troubleshooting

| Problem | Fix |
| --- | --- |
| Top bar says "Demo mode" | Settings → Live connection → log in. Inside Claude it cannot connect; use the Netlify link |
| "Call not placed: Missing secrets" | Fill every Sarvam value in `secrets.env`, run `supabase secrets set` again |
| "Call not placed: Sarvam 401/403" | Wrong API key or org/workspace ID |
| "Sarvam 422" | Wrong app ID/version or connection ID/number format (+91…) |
| Calls happen but the CRM doesn't update | Webhook URL or token wrong in Sarvam; check Supabase → Edge Functions → sarvam-webhook → Logs |
| Asha doesn't say the customer's name | On-start hook URL/mapping (Step 4.3); add a Marathi name in the lead's custom field `nameMr` for better pronunciation |
| Recording won't play | The call may still be processing at Sarvam; try after a few minutes |
| Automatic retries not happening | `cron.sql` not run, or `pg_cron`/`pg_net` not enabled |
| "Outside calling hours" | Working as designed; change hours in Settings (keep 09:00–21:00 max) |

Check Supabase **Edge Functions → Logs** first for any error; every function logs the reason.
