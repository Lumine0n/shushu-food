-- 最近 7 天完成的吃饭决定
select count(*) as completed_decisions
from public.decisions
where selected_food_id is not null and created_at >= now() - interval '7 days';

-- 推荐选择率
select round(100.0 * count(*) filter (where selected_food_id is not null) / nullif(count(*), 0), 1) as selection_rate_percent
from public.decisions
where created_at >= now() - interval '7 days';

-- 已选择决定的反馈率
select round(100.0 * count(*) filter (where not feedback_pending) / nullif(count(*), 0), 1) as feedback_rate_percent
from public.decisions
where selected_food_id is not null and created_at >= now() - interval '7 days';

-- 按用户查看周活跃与完成决定次数
select p.nickname, count(distinct date_trunc('day', d.created_at)) as active_days,
       count(*) filter (where d.selected_food_id is not null) as completed_decisions
from public.profiles p
left join public.decisions d on d.user_id = p.id and d.created_at >= now() - interval '7 days'
where p.status = 'active'
group by p.id, p.nickname
order by completed_decisions desc;
