-- English League · ortak veri (Faz 5a)
-- Supabase panelinde: SQL Editor → New query → bu dosyanın tamamını yapıştır → Run.
-- Her öğretmen yalnız kendi kayıtlarını görür (satır güvenliği).

create table if not exists public.records (
  teacher_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null,
  kind text not null check (kind in ('event', 'attempt', 'class', 'setting', 'tomb')),
  class_id text,
  key text,
  payload jsonb not null,
  ts bigint not null,
  updated_at timestamptz not null default now(),
  primary key (teacher_id, id)
);

create index if not exists records_teacher_updated on public.records (teacher_id, updated_at);

-- Güncellenen kayıt (şube kadrosu, ayar) yeniden çekilebilsin diye updated_at yenilenir
create or replace function public.records_touch() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists records_touch on public.records;
create trigger records_touch before update on public.records for each row execute function public.records_touch();

alter table public.records enable row level security;
drop policy if exists "kendi kayitlarini okur" on public.records;
drop policy if exists "kendi kaydini ekler" on public.records;
drop policy if exists "kendi kaydini gunceller" on public.records;
create policy "kendi kayitlarini okur" on public.records for select using (teacher_id = auth.uid());
create policy "kendi kaydini ekler" on public.records for insert with check (teacher_id = auth.uid());
create policy "kendi kaydini gunceller" on public.records for update using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());

-- Anlık bildirim (bir tahtada verilen puan diğerlerinde hemen görünsün)
do $$ begin
  alter publication supabase_realtime add table public.records;
exception when duplicate_object then null; end $$;
