-- ==================================================================
-- Solaris AI OS — Panel v2 additions (WhatsApp, content library, file uploads)
-- Run once in Supabase → SQL Editor. Safe to run again.
-- ==================================================================

-- ---------- WhatsApp messages (sent + received) ----------
create table if not exists wa_messages (
  id text primary key, data jsonb not null, lead_id text, status text,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create index if not exists wa_lead_idx on wa_messages(lead_id);
create index if not exists wa_updated_idx on wa_messages(updated_at);

create or replace function sol_wa_extract() returns trigger language plpgsql as $$
begin
  new.lead_id := new.data->>'leadId';
  new.status  := new.data->>'status';
  return new;
end $$;
drop trigger if exists t_wa_extract on wa_messages;
create trigger t_wa_extract before insert or update on wa_messages for each row execute function sol_wa_extract();
drop trigger if exists t_wa_touch on wa_messages;
create trigger t_wa_touch before insert or update on wa_messages for each row execute function sol_touch();

-- ---------- Content library (web pages, offers, images, brochures) ----------
create table if not exists content (
  id text primary key, data jsonb not null,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create index if not exists content_updated_idx on content(updated_at);
drop trigger if exists t_content_touch on content;
create trigger t_content_touch before insert or update on content for each row execute function sol_touch();

-- ---------- Security: logged-in staff only ----------
do $$
declare t text;
begin
  foreach t in array array['wa_messages','content'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists staff_all on %I', t);
    execute format('create policy staff_all on %I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- ---------- File uploads: images/brochures for WhatsApp + knowledge files ----------
-- Public READ is required so WhatsApp can fetch the image/PDF link; only staff can upload.
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do update set public = true;

drop policy if exists "staff upload media" on storage.objects;
create policy "staff upload media" on storage.objects for insert to authenticated with check (bucket_id = 'media');
drop policy if exists "staff update media" on storage.objects;
create policy "staff update media" on storage.objects for update to authenticated using (bucket_id = 'media');
drop policy if exists "staff delete media" on storage.objects;
create policy "staff delete media" on storage.objects for delete to authenticated using (bucket_id = 'media');
drop policy if exists "staff read media" on storage.objects;
create policy "staff read media" on storage.objects for select to authenticated using (bucket_id = 'media');

select 'Panel v2 ready' as status;
