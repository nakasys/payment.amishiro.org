-- 麻布十番網代会 町会費請求管理
-- ブラウザへ service_role キーを置かないこと。
-- 初期管理者は Auth でユーザー作成後、次で許可する。
--   update public.profiles set role = 'admin' where email = 'your-email@example.com';

create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  role text not null default 'pending' check (role in ('pending', 'member', 'admin')),
  created_at timestamptz not null default now()
);

create table public.app_settings (
  id int primary key check (id = 1),
  organization_name text not null default '',
  chairman_name text not null default '',
  treasurer_name text not null default '',
  contact_name text not null default '',
  phone text not null default '',
  postal_code text not null default '',
  address text not null default '',
  bank_name text not null default '',
  bank_branch text not null default '',
  account_type text not null default '',
  account_number text not null default '',
  account_holder text not null default '',
  account_holder_kana text not null default '',
  review_notes text not null default '',
  fiscal_year int not null,
  fiscal_year_label text not null,
  period_start date not null,
  period_end date not null,
  subject text not null,
  default_due_date date,
  next_invoice_seq int not null default 1,
  updated_at timestamptz not null default now()
);

create table public.label_settings (
  id int primary key check (id = 1),
  columns int not null default 2,
  rows int not null default 5,
  margin_top_mm numeric not null default 21.5,
  margin_left_mm numeric not null default 18.6,
  label_width_mm numeric not null default 86.4,
  label_height_mm numeric not null default 50.8,
  pitch_x_mm numeric not null default 86.4,
  pitch_y_mm numeric not null default 50.8,
  font_size_pt numeric not null default 9,
  updated_at timestamptz not null default now()
);

create table public.recipients (
  id uuid primary key,
  name text not null default '',
  management_company text not null default '',
  building_name text not null default '',
  postal_code text not null default '',
  address text not null default '',
  addressee text not null default '',
  honorific text not null default '',
  department text not null default '',
  description text not null default '',
  notes text not null default '',
  source_sheet text not null default '',
  source_file_name text not null default '',
  source_raw jsonb not null default '{}'::jsonb,
  status text not null default 'active' check (status in ('active', 'suspended')),
  review_flags text[] not null default '{}',
  year_amounts jsonb not null default '[]'::jsonb,
  bank_override jsonb,
  contact_override jsonb,
  issuer_override jsonb,
  legacy_invoice_no text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.invoices (
  id uuid primary key,
  recipient_id uuid not null references public.recipients (id) on delete restrict,
  fiscal_year int not null,
  invoice_number text not null unique,
  issued_on date not null,
  status text not null default 'issued' check (status in ('issued', 'void')),
  amount_yen int not null,
  snapshot jsonb not null,
  created_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key,
  recipient_id uuid not null references public.recipients (id) on delete cascade,
  invoice_id uuid references public.invoices (id) on delete set null,
  fiscal_year int not null,
  paid_on date not null,
  amount_yen int not null check (amount_yen > 0),
  note text not null default '',
  created_at timestamptz not null default now()
);

create table public.import_logs (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  imported_at timestamptz not null default now(),
  added int not null default 0,
  updated int not null default 0,
  skipped int not null default 0
);

insert into public.app_settings (
  id, organization_name, chairman_name, treasurer_name, contact_name, phone,
  fiscal_year, fiscal_year_label, period_start, period_end, subject, review_notes
) values (
  1, '麻布十番網代会', '中村大輔', '佐々木良一', '会長 中村大輔', '080-9523-6118',
  2026, '令和8年度', '2026-04-01', '2027-03-31', '令和8年度 町会費',
  '口座名義と団体住所は、元データで確定してから入力してください。'
);

insert into public.label_settings (id) values (1);

alter table public.profiles enable row level security;
alter table public.app_settings enable row level security;
alter table public.label_settings enable row level security;
alter table public.recipients enable row level security;
alter table public.invoices enable row level security;
alter table public.payments enable row level security;
alter table public.import_logs enable row level security;

create or replace function public.is_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('member', 'admin')
  );
$$;

revoke all on function public.is_member() from public, anon;
grant execute on function public.is_member() to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'pending')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

revoke all on public.profiles, public.app_settings, public.label_settings,
  public.recipients, public.invoices, public.payments, public.import_logs
  from anon, public;

grant select on public.profiles to authenticated;
grant select, insert, update, delete on public.app_settings to authenticated;
grant select, insert, update, delete on public.label_settings to authenticated;
grant select, insert, update, delete on public.recipients to authenticated;
grant select, insert, update, delete on public.invoices to authenticated;
grant select, insert, update, delete on public.payments to authenticated;
grant select, insert on public.import_logs to authenticated;

create policy profiles_select_self on public.profiles
  for select to authenticated
  using (id = auth.uid());

create policy settings_member on public.app_settings
  for all to authenticated
  using (public.is_member())
  with check (public.is_member());

create policy labels_member on public.label_settings
  for all to authenticated
  using (public.is_member())
  with check (public.is_member());

create policy recipients_member on public.recipients
  for all to authenticated
  using (public.is_member())
  with check (public.is_member());

create policy invoices_member on public.invoices
  for all to authenticated
  using (public.is_member())
  with check (public.is_member());

create policy payments_member on public.payments
  for all to authenticated
  using (public.is_member())
  with check (public.is_member());

create policy imports_member on public.import_logs
  for select to authenticated
  using (public.is_member());

create policy imports_insert_member on public.import_logs
  for insert to authenticated
  with check (public.is_member());
