-- Server-side aggregation. Definitions (same as the dashboard):
--   confirmed  = status confirmed, preparing, ready, out_for_delivery or completed
--   confirmed_revenue = total of confirmed orders (pending, received and cancelled never count)
--   recognised_revenue = completed AND payment_status = 'paid'
-- All days and hours are Asia/Kolkata. Managers and owners only (RLS also applies).
create or replace function analytics_report(p_from timestamptz, p_to timestamptz) returns jsonb
language plpgsql stable set search_path = public as $$
declare res jsonb;
begin
  if not is_manager() then raise exception 'not_allowed'; end if;
  with o as (
    select id, status, payment_status, order_type, total_paise, discount_paise, delivery_fee_paise,
           (created_at at time zone 'Asia/Kolkata')::date as d,
           extract(hour from created_at at time zone 'Asia/Kolkata')::int as h,
           status in ('confirmed','preparing','ready','out_for_delivery','completed') as is_conf
    from orders where created_at >= p_from and created_at < p_to)
  select jsonb_build_object(
    'summary', (select jsonb_build_object(
        'requests', count(*), 'pending', count(*) filter (where status = 'pending_whatsapp'), 'received', count(*) filter (where status = 'received'),
        'confirmed', count(*) filter (where is_conf), 'completed', count(*) filter (where status = 'completed'), 'cancelled', count(*) filter (where status = 'cancelled'),
        'confirmed_revenue', coalesce(sum(total_paise) filter (where is_conf), 0),
        'recognised_revenue', coalesce(sum(total_paise) filter (where status = 'completed' and payment_status = 'paid'), 0),
        'discounts', coalesce(sum(discount_paise) filter (where is_conf), 0),
        'delivery_fees', coalesce(sum(delivery_fee_paise) filter (where is_conf), 0)) from o),
    'daily', coalesce((select jsonb_agg(to_jsonb(x) order by x.d) from (
        select d, count(*) as requests, count(*) filter (where is_conf) as confirmed, count(*) filter (where status = 'completed') as completed,
               count(*) filter (where status = 'cancelled') as cancelled,
               coalesce(sum(total_paise) filter (where is_conf), 0) as confirmed_revenue,
               coalesce(sum(total_paise) filter (where status = 'completed' and payment_status = 'paid'), 0) as recognised_revenue
        from o group by d) x), '[]'::jsonb),
    'hourly', coalesce((select jsonb_agg(to_jsonb(x) order by x.h) from (
        select h, count(*) as requests, count(*) filter (where is_conf) as confirmed from o group by h) x), '[]'::jsonb),
    'by_type', coalesce((select jsonb_agg(to_jsonb(x)) from (
        select order_type, count(*) as requests, count(*) filter (where is_conf) as confirmed,
               coalesce(sum(total_paise) filter (where is_conf), 0) as confirmed_revenue from o group by order_type) x), '[]'::jsonb),
    'top_products', coalesce((select jsonb_agg(to_jsonb(x)) from (
        select oi.product_name as name, sum(oi.quantity)::int as quantity, sum(oi.line_total_paise)::bigint as revenue
        from order_items oi join o on o.id = oi.order_id where o.is_conf
        group by oi.product_name order by sum(oi.quantity) desc, sum(oi.line_total_paise) desc limit 10) x), '[]'::jsonb),
    'categories', coalesce((select jsonb_agg(to_jsonb(x)) from (
        select coalesce(oi.category_name, 'Uncategorised') as name, sum(oi.quantity)::int as quantity, sum(oi.line_total_paise)::bigint as revenue
        from order_items oi join o on o.id = oi.order_id where o.is_conf
        group by coalesce(oi.category_name, 'Uncategorised') order by sum(oi.line_total_paise) desc) x), '[]'::jsonb)
  ) into res;
  return res;
end $$;

create or replace function customer_summary(p_search text default null, p_limit int default 25, p_offset int default 0)
returns table (phone text, name text, orders bigint, last_order timestamptz, confirmed_spend bigint, total_count bigint)
language plpgsql stable set search_path = public as $$
begin
  if not is_manager() then raise exception 'not_allowed'; end if;
  return query
  with g as (
    select o.customer_phone as phone, (array_agg(o.customer_name order by o.created_at desc))[1] as name, count(*) as orders,
           max(o.created_at) as last_order,
           coalesce(sum(o.total_paise) filter (where o.status in ('confirmed','preparing','ready','out_for_delivery','completed')), 0)::bigint as confirmed_spend
    from orders o
    where p_search is null or o.customer_phone ilike '%' || p_search || '%' or o.customer_name ilike '%' || p_search || '%'
    group by o.customer_phone)
  select g.phone, g.name, g.orders, g.last_order, g.confirmed_spend, count(*) over () from g
  order by g.last_order desc limit least(greatest(p_limit, 1), 100) offset greatest(p_offset, 0);
end $$;

revoke all on function analytics_report(timestamptz, timestamptz) from public, anon;
revoke all on function customer_summary(text, int, int) from public, anon;
grant execute on function analytics_report(timestamptz, timestamptz) to authenticated;
grant execute on function customer_summary(text, int, int) to authenticated;
