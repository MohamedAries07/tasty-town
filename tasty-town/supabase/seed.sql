-- Categories
insert into categories (name, slug, display_order) values
  ('Bread Omelette','bread-omelette',1),
  ('Rolls','rolls',2),
  ('Bun Specials','bun-specials',3),
  ('Burgers','burgers',4),
  ('Noodles','noodles',5),
  ('Sandwiches — Vegetarian','sandwiches-vegetarian',6),
  ('Sandwiches — Chicken','sandwiches-chicken',7);

-- 31 products. Prices in rupees here; stored as paise. Food type is editable in admin.
insert into products (category_id, name, slug, price_paise, food_type, display_order)
select c.id, v.name,
       trim(both '-' from regexp_replace(lower(v.name), '[^a-z0-9]+', '-', 'g')),
       v.rupees * 100, v.ft::food_type, v.ord
from (values
  ('bread-omelette','Classic Bread Omelet',50,'egg',1),
  ('bread-omelette','Cheese Bread Omelet',70,'egg',2),
  ('bread-omelette','Mexican Bread Omelet',70,'egg',3),
  ('bread-omelette','Schezwan Bread Omelet',70,'egg',4),
  ('rolls','Veg Roll',40,'veg',1),
  ('rolls','Chicken Roll',60,'non_veg',2),
  ('rolls','Paneer Roll',50,'veg',3),
  ('bun-specials','Bun Butter Jam',30,'veg',1),
  ('bun-specials','Palakova Bun',40,'veg',2),
  ('bun-specials','Gulab Jamun Bun',40,'veg',3),
  ('bun-specials','Chocolate Bun',40,'veg',4),
  ('burgers','Veg Burger',80,'veg',1),
  ('burgers','Veg Cheese Burger',90,'veg',2),
  ('burgers','Chicken Burger',100,'non_veg',3),
  ('burgers','Chicken Cheese Burger',110,'non_veg',4),
  ('noodles','Classic Yippee Noodles',50,'veg',1),
  ('noodles','Cheese Yippee Noodles',60,'veg',2),
  ('noodles','Manchurian Noodles',70,'veg',3),
  ('noodles','Schezwan Noodles',70,'veg',4),
  ('noodles','Hot & Garlic Noodles',70,'veg',5),
  ('noodles','Hot & Spicy Korean Noodles',80,'veg',6),
  ('sandwiches-vegetarian','Sweet Corn Sandwich',60,'veg',1),
  ('sandwiches-vegetarian','Veg Sandwich',70,'veg',2),
  ('sandwiches-vegetarian','Veg Cheese Sandwich',80,'veg',3),
  ('sandwiches-vegetarian','Paneer Sandwich',90,'veg',4),
  ('sandwiches-vegetarian','Peri Peri Veg Sandwich',90,'veg',5),
  ('sandwiches-vegetarian','Mexican Veg Sandwich',90,'veg',6),
  ('sandwiches-chicken','Fried Chicken Sandwich',100,'non_veg',1),
  ('sandwiches-chicken','Fried Cheese Chicken Sandwich',110,'non_veg',2),
  ('sandwiches-chicken','Peri Peri Fried Chicken Sandwich',120,'non_veg',3),
  ('sandwiches-chicken','Mexican Fried Chicken Sandwich',120,'non_veg',4)
) as v(cat, name, rupees, ft, ord)
join categories c on c.slug = v.cat;

-- Settings known from the brief. Everything else is configured in /admin/settings.
insert into store_settings (key, value, is_public) values
  ('restaurant_name','"TASTY TOWN"',true),
  ('tagline','"Tastiest sandwiches in the town"',true),
  ('address','"Samayapuram, 4 Road (Naal Road), near Ticket Collection Booth"',true),
  ('contact_phone','"+91 97919 51598"',true),
  ('whatsapp_number','"919791951598"',true),
  ('currency','"INR"',true),
  ('timezone','"Asia/Kolkata"',true),
  ('orders_enabled','true',true),
  ('delivery_enabled','true',true),
  ('takeaway_enabled','true',true),
  ('delivery_fee_paise','0',true),
  ('min_order_paise','0',true),
  ('free_delivery_threshold_paise','null',true),
  ('payment_methods','["cash_on_delivery","pay_at_pickup"]',true),
  ('payment_instructions','""',true),
  ('prep_time','""',true);
