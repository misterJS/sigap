-- Supabase schema for storing KTP OCR submissions
-- Run in Supabase SQL editor or via `supabase db push`

create extension if not exists "uuid-ossp";

create table if not exists public.ktp_submissions (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  nik text not null default '',
  nama text not null default '',
  tempat_tanggal_lahir text not null default '',
  alamat text not null default '',
  jenis_kelamin text not null default '',
  pekerjaan text not null default '',
  berlaku_hingga text not null default '',

  source_file_name text,
  operator_notes text,
  raw_ocr_text text,
  ocr_language text,
  created_by uuid references auth.users (id),
  created_by_email text,
  created_by_name text,

  constraint nik_length check (char_length(nik) <= 32)
);

create index if not exists idx_ktp_submissions_created_at on public.ktp_submissions (created_at desc);
create index if not exists idx_ktp_submissions_nik on public.ktp_submissions (nik);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_set_updated_at
before update on public.ktp_submissions
for each row execute function public.set_updated_at();

alter table public.ktp_submissions enable row level security;

create policy "Allow authenticated read ktp submissions"
  on public.ktp_submissions
  for select
  using (auth.role() = 'authenticated');

create policy "Allow authenticated insert ktp submissions"
  on public.ktp_submissions
  for insert
  with check (
    auth.role() = 'authenticated'
    and (created_by is null or created_by = auth.uid())
  );

create policy "Allow authenticated update own ktp submissions"
  on public.ktp_submissions
  for update
  using (auth.role() = 'authenticated' and created_by = auth.uid())
  with check (created_by = auth.uid());

