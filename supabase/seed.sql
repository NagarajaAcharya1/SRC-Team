-- OPTIONAL: puts the 8 people from the ID card on the page (photos come from the /images folder).
-- Run after schema.sql. Skip it if you want the page to start empty.
-- Admin can change roles / order later in admin.html.
insert into public.members (name, role, photo_url, sort_order, edit_hash) values
  ('Pruthvi K R',     'Lead',       'images/p1.jpg', 1, public._hash(gen_random_uuid()::text)),
  ('Hemanth',         'Lead',       'images/p5.jpg', 2, public._hash(gen_random_uuid()::text)),
  ('Yash Shetty',     'Event Lead', 'images/p3.jpg', 3, public._hash(gen_random_uuid()::text)),
  ('Gopalakrishna',   'Event Lead', 'images/p4.jpg', 4, public._hash(gen_random_uuid()::text)),
  ('P R Pratheeksha', 'Event Lead', 'images/p6.jpg', 5, public._hash(gen_random_uuid()::text)),
  ('Nagaraja',        'Media',      'images/p2.jpg', 6, public._hash(gen_random_uuid()::text)),
  ('Harshitha',       'Volunteer',  'images/p7.jpg', 7, public._hash(gen_random_uuid()::text)),
  ('Likhitha',        'Volunteer',  'images/p8.jpg', 8, public._hash(gen_random_uuid()::text));
