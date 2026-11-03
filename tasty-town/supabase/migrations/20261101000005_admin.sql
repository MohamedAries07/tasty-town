-- Orders can only be changed through these functions (staff cannot update arbitrary columns).
drop policy if exists "staff update orders" on orders;

create or replace function log_order_status() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into order_status_history(order_id, from_status, to_status) values (new.id, null, new.status);
  elsif new.status is distinct from old.status then
    insert into order_status_history(order_id, from_status, to_status, changed_by, note)
    values (new.id, old.status, new.status, auth.uid(), nullif(current_setting('app.status_note', true), ''));
  end if;
  return new;
end $$;

create or replace function admin_set_order_status(p_order uuid, p_status order_status, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare o orders%rowtype; ok boolean;
begin
  if not is_staff() then raise exception 'not_allowed'; end if;
  select * into o from orders where id = p_order for update;
  if not found then raise exception 'not_found'; end if;
  if p_status = 'cancelled' and not is_manager() then raise exception 'not_allowed'; end if;

  ok := case o.status
    when 'pending_whatsapp' then p_status in ('received','confirmed','cancelled')
    when 'received' then p_status in ('confirmed','cancelled')
    when 'confirmed' then p_status in ('preparing','cancelled')
    when 'preparing' then p_status in ('ready','cancelled')
    when 'ready' then (p_status = 'cancelled') or (o.order_type = 'delivery' and p_status = 'out_for_delivery') or (o.order_type = 'takeaway' and p_status = 'completed')
    when 'out_for_delivery' then p_status in ('completed','cancelled')
    else false end;
  if not ok then raise exception 'bad_transition'; end if;

  perform set_config('app.status_note', coalesce(left(p_note, 300), ''), true);
  update orders set status = p_status,
    restaurant_confirmed_at = case when p_status = 'confirmed' then now() else restaurant_confirmed_at end
  where id = p_order;
  insert into audit_logs(actor_id, action, entity, entity_id, details)
  values (auth.uid(), 'order.status', 'order', p_order::text, jsonb_build_object('from', o.status, 'to', p_status));
end $$;

create or replace function admin_update_order(p_order uuid, p_notes text, p_payment payment_status)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_staff() then raise exception 'not_allowed'; end if;
  update orders set internal_notes = nullif(left(p_notes, 1000), ''), payment_status = p_payment where id = p_order;
  if not found then raise exception 'not_found'; end if;
  insert into audit_logs(actor_id, action, entity, entity_id, details)
  values (auth.uid(), 'order.update', 'order', p_order::text, jsonb_build_object('payment', p_payment));
end $$;

revoke all on function admin_set_order_status(uuid, order_status, text) from public, anon;
revoke all on function admin_update_order(uuid, text, payment_status) from public, anon;
grant execute on function admin_set_order_status(uuid, order_status, text) to authenticated;
grant execute on function admin_update_order(uuid, text, payment_status) to authenticated;

-- Realtime for the admin orders screen (RLS still applies: only staff can read orders).
do $$ begin
  alter publication supabase_realtime add table orders;
exception when duplicate_object then null; end $$;
