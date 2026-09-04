create table public.wechat_accounts (
  id uuid primary key default gen_random_uuid(),
  app_id text not null check (char_length(app_id) between 1 and 80),
  open_id text not null check (char_length(open_id) between 1 and 128),
  union_id text,
  profile_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(app_id, open_id)
);

create index wechat_accounts_profile_idx on public.wechat_accounts(profile_id);
create trigger wechat_accounts_touch before update on public.wechat_accounts for each row execute function public.touch_updated_at();

alter table public.wechat_accounts enable row level security;
-- 微信身份是服务端认证材料，不向客户端开放；管理操作使用 service-role 或受控 SQL。

comment on table public.wechat_accounts is '微信小程序 openid 到固定圈内 profile 的服务端映射，不允许客户端直接读取';

