-- Runs the calling robot every 3 minutes: retries, callbacks, campaign queue, new enquiries.
-- 1) Supabase → Database → Extensions: enable  pg_cron  and  pg_net
-- 2) Replace <PROJECT_REF> and <WEBHOOK_TOKEN> below, then run this in the SQL Editor.
select cron.schedule(
  'solaris-run-due',
  '*/3 * * * *',
  $$ select net.http_post(
       url := 'https://<PROJECT_REF>.supabase.co/functions/v1/run-due?token=<WEBHOOK_TOKEN>',
       headers := '{"Content-Type":"application/json"}'::jsonb,
       body := '{}'::jsonb) $$
);
-- To stop it:   select cron.unschedule('solaris-run-due');
