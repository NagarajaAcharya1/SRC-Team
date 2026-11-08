-- OPTIONAL: puts the 8 people from the ID card on the page (photos come from the /images folder).
-- Run after schema.sql. Skip it if you want the page to start empty.
-- Each seed member has a known edit key so they can edit their card via #/edit/<id>/<key>.
insert into public.members (name, role, photo_url, sort_order, edit_hash) values
  ('Pruthvi K R',     'Lead',       'images/p1.jpg', 1, public._hash('src_pruthvi_kr_2026')),
  ('Hemanth',         'Lead',       'images/p5.jpg', 2, public._hash('src_hemanth_2026')),
  ('Yash Shetty',     'Event Lead', 'images/p3.jpg', 3, public._hash('src_yash_shetty_2026')),
  ('Gopalakrishna',   'Event Lead', 'images/p4.jpg', 4, public._hash('src_gopalakrishna_2026')),
  ('P R Pratheeksha', 'Event Lead', 'images/p6.jpg', 5, public._hash('src_pratheeksha_2026')),
  ('Nagaraja',        'Media',      'images/p2.jpg', 6, public._hash('src_nagaraja_2026')),
  ('Harshitha',       'Volunteer',  'images/p7.jpg', 7, public._hash('src_harshitha_2026')),
  ('Likhitha',        'Volunteer',  'images/p8.jpg', 8, public._hash('src_likhitha_2026'));
