insert into public.tags(name) values ('米饭'),('面食'),('鸡肉'),('牛肉'),('麻辣'),('热汤'),('甜品'),('实惠') on conflict do nothing;

-- Auth 用户需要先在 Supabase Dashboard 创建，再执行：
-- update public.profiles set status = 'active', role = 'admin', nickname = '鼠鼠' where id = '<你的用户 UUID>';
