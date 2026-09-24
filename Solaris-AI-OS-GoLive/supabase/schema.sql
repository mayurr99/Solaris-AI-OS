-- ==================================================================
-- Solaris AI OS — live database (Supabase / Postgres)
-- Run once: Supabase dashboard → SQL Editor → paste → Run.
-- Every table stores the dashboard's record as JSON in `data`;
-- triggers copy the few fields the server needs into real columns.
-- ==================================================================

create extension if not exists pgcrypto;

-- ---------- shared trigger: stamp updated_at ----------
create or replace function sol_touch() returns trigger language plpgsql as $$
begin
  new.updated_at := clock_timestamp();
  return new;
end $$;

-- ---------- helper: ms epoch → timestamptz ----------
create or replace function sol_ms(v text) returns timestamptz language sql immutable as $$
  select case when v ~ '^[0-9]+(\.[0-9]+)?$' then to_timestamp(v::double precision / 1000) else null end
$$;

-- ---------- LEADS ----------
create table if not exists leads (
  id          text primary key,
  data        jsonb not null,
  phone       text,
  stage       text,
  owner       text,
  dnc         boolean default false,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
create unique index if not exists leads_phone_uq on leads(phone) where phone is not null;
create index if not exists leads_updated_idx on leads(updated_at);

create or replace function sol_leads_extract() returns trigger language plpgsql as $$
begin
  new.phone := nullif(new.data->>'phone', '');
  new.stage := new.data->>'stage';
  new.owner := new.data->>'owner';
  new.dnc   := coalesce((new.data->>'dnc')::boolean, false);
  return new;
end $$;
drop trigger if exists t_leads_extract on leads;
create trigger t_leads_extract before insert or update on leads for each row execute function sol_leads_extract();
drop trigger if exists t_leads_touch on leads;
create trigger t_leads_touch before insert or update on leads for each row execute function sol_touch();

-- ---------- CALLS ----------
create table if not exists calls (
  id          text primary key,
  data        jsonb not null,
  lead_id     text,
  status      text,
  dir         text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
create index if not exists calls_lead_idx on calls(lead_id);
create index if not exists calls_updated_idx on calls(updated_at);
create index if not exists calls_created_idx on calls(created_at);

create or replace function sol_calls_extract() returns trigger language plpgsql as $$
begin
  new.lead_id := new.data->>'leadId';
  new.status  := coalesce(new.data->>'status', new.data->>'outcome');
  new.dir     := new.data->>'dir';
  return new;
end $$;
drop trigger if exists t_calls_extract on calls;
create trigger t_calls_extract before insert or update on calls for each row execute function sol_calls_extract();
drop trigger if exists t_calls_touch on calls;
create trigger t_calls_touch before insert or update on calls for each row execute function sol_touch();

-- ---------- FOLLOW-UPS ----------
create table if not exists followups (
  id          text primary key,
  data        jsonb not null,
  lead_id     text,
  type        text,
  status      text,
  due_at      timestamptz,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
create index if not exists fu_due_idx on followups(status, type, due_at);
create index if not exists fu_updated_idx on followups(updated_at);

create or replace function sol_fu_extract() returns trigger language plpgsql as $$
begin
  new.lead_id := new.data->>'leadId';
  new.type    := new.data->>'type';
  new.status  := new.data->>'status';
  new.due_at  := sol_ms(new.data->>'dueAt');
  return new;
end $$;
drop trigger if exists t_fu_extract on followups;
create trigger t_fu_extract before insert or update on followups for each row execute function sol_fu_extract();
drop trigger if exists t_fu_touch on followups;
create trigger t_fu_touch before insert or update on followups for each row execute function sol_touch();

-- ---------- VISITS, TICKETS, ACTIVITY, CONFIG ----------
create table if not exists visits (
  id text primary key, data jsonb not null, lead_id text,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create table if not exists tickets (
  id text primary key, data jsonb not null, lead_id text,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create table if not exists activity (
  id text primary key, data jsonb not null, lead_id text,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
-- config rows: 'settings', 'team', 'agents', 'dnc', 'campaigns'  → data = {"value": ...}
create table if not exists config (
  id text primary key, data jsonb not null,
  created_at timestamptz default now(), updated_at timestamptz default now()
);

create or replace function sol_leadref_extract() returns trigger language plpgsql as $$
begin
  new.lead_id := new.data->>'leadId';
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['visits','tickets','activity'] loop
    execute format('drop trigger if exists t_%1$s_extract on %1$s', t);
    execute format('create trigger t_%1$s_extract before insert or update on %1$s for each row execute function sol_leadref_extract()', t);
  end loop;
  foreach t in array array['visits','tickets','activity','config'] loop
    execute format('drop trigger if exists t_%1$s_touch on %1$s', t);
    execute format('create trigger t_%1$s_touch before insert or update on %1$s for each row execute function sol_touch()', t);
    execute format('create index if not exists %1$s_updated_idx on %1$s(updated_at)', t);
  end loop;
end $$;

-- ---------- SECURITY: only logged-in Solaris staff can read/write ----------
do $$
declare t text;
begin
  foreach t in array array['leads','calls','followups','visits','tickets','activity','config'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists staff_all on %I', t);
    execute format('create policy staff_all on %I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;
-- Edge functions use the service-role key and bypass these policies.
-- Anonymous visitors (anon key without login) can read NOTHING.

-- ---------- starting config ----------
insert into config (id, data) values
  ('dnc', '{"value": []}'::jsonb)
on conflict (id) do nothing;
