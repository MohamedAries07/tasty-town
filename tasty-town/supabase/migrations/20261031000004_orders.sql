alter table orders add column client_ip_hash text;
create index orders_ip_idx on orders(client_ip_hash, created_at desc);

-- Atomic order creation. Prices are computed by the server; this function only persists them.
create or replace function create_order(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare ex orders%rowtype; o orders%rowtype; item jsonb;
begin
  if p->>'idempotency_key' is not null then
    select * into ex from orders where idempotency_key = p->>'idempotency_key';
    if found then
      return jsonb_build_object('reference', ex.reference, 'receipt_token', ex.receipt_token, 'duplicate', true);
    end if;
  end if;

  if p->>'offer_id' is not null then
    update offers set usage_count = usage_count + 1
     where id = (p->>'offer_id')::uuid and (usage_limit is null or usage_count < usage_limit);
    if not found then raise exception 'offer_exhausted'; end if;
  end if;

  insert into orders (idempotency_key, user_id, customer_name, customer_phone, order_type, address,
    subtotal_paise, discount_paise, delivery_fee_paise, total_paise, offer_id, offer_snapshot,
    payment_method, special_instructions, client_ip_hash)
  values (p->>'idempotency_key', nullif(p->>'user_id','')::uuid, p->>'customer_name', p->>'customer_phone',
    (p->>'order_type')::order_type, p->'address', (p->>'subtotal_paise')::int, (p->>'discount_paise')::int,
    (p->>'delivery_fee_paise')::int, (p->>'total_paise')::int, nullif(p->>'offer_id','')::uuid, p->'offer_snapshot',
    (p->>'payment_method')::payment_method, nullif(p->>'special_instructions',''), p->>'client_ip_hash')
  returning * into o;

  for item in select * from jsonb_array_elements(p->'items') loop
    insert into order_items (order_id, product_id, product_name, category_name, quantity, unit_price_paise, selected_options, line_total_paise)
    values (o.id, nullif(item->>'product_id','')::uuid, item->>'product_name', item->>'category_name',
      (item->>'quantity')::int, (item->>'unit_price_paise')::int, coalesce(item->'selected_options','{}'), (item->>'line_total_paise')::int);
  end loop;

  return jsonb_build_object('reference', o.reference, 'receipt_token', o.receipt_token, 'duplicate', false);
exception when unique_violation then
  select * into ex from orders where idempotency_key = p->>'idempotency_key';
  if found then
    return jsonb_build_object('reference', ex.reference, 'receipt_token', ex.receipt_token, 'duplicate', true);
  end if;
  raise;
end $$;

revoke all on function create_order(jsonb) from public, anon, authenticated;
grant execute on function create_order(jsonb) to service_role;
