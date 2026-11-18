-- =========================================================
-- 人生博物馆 · Supabase 云数据库与权限配置脚本 (supabase-setup.sql)
-- 功能：
-- 1. 个人博物馆主表（museums）：每个注册用户独立存储完整数据（含秘密花园与独家回忆）
-- 2. 公开分享表（shared_museums）：用于朋友免登录访客参观，存放物理脱敏后的公开数据
-- 3. 严格的 Row Level Security (RLS) 行级安全策略，杜绝跨用户串号或隐私泄露
-- =========================================================

-- 1. 创建个人博物馆主表
create table if not exists public.museums (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  share_id text unique not null,
  is_public boolean default true,
  owner_data jsonb not null default '{}'::jsonb,
  public_data jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

-- 2. 创建公开分享表
create table if not exists public.shared_museums (
  share_id text primary key,
  user_id uuid not null,
  is_public boolean default true,
  public_data jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

-- 3. 开启行级安全策略（RLS）
alter table public.museums enable row level security;
alter table public.shared_museums enable row level security;

-- 4. 个人主表策略：仅登录用户可访问与修改自己的数据
drop policy if exists "Users can read own museum" on public.museums;
create policy "Users can read own museum" on public.museums
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own museum" on public.museums;
create policy "Users can insert own museum" on public.museums
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own museum" on public.museums;
create policy "Users can update own museum" on public.museums
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- 5. 公开分享表策略：开启公开时允许所有人（包括匿名访客 anon）只读查询；写入仅限馆主
drop policy if exists "Anyone can view public shared museums" on public.shared_museums;
create policy "Anyone can view public shared museums" on public.shared_museums
  for select to anon, authenticated
  using (is_public = true or (select auth.uid()) = user_id);

drop policy if exists "Users can manage own shared museum" on public.shared_museums;
create policy "Users can manage own shared museum" on public.shared_museums
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
