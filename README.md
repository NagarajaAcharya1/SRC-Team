# Team SRC: setup (about 10 minutes)

The site is plain HTML/CSS/JS (no build step). Supabase is the backend: database, photo storage and security rules.

## 1. Create the database
1. Make a free project at supabase.com.
2. SQL Editor → New query → open `supabase/schema.sql`, **change `CHANGE-THIS-ADMIN-PASSCODE`** near the bottom, paste it all, Run.
3. Optional: run `supabase/seed.sql` to put the 8 people from the ID card on the page.

## 2. Connect the site
Project Settings → API → copy **Project URL** and the **anon public** key into `config.js`.
(Until you do, the site runs in demo mode and saves data only in the visitor's own browser.)

## 3. Deploy
Upload this folder to your existing Vercel project. The QR code keeps working because the link doesn't change.

## During the two days
- Students tap **Add your card**, crop a photo, fill only the links they want, and save.
  They get a private edit link (also remembered on that device).
- `/admin.html` (your passcode): hide, reorder, change roles, delete cards.
  Leads: set order 1 to 5 so they appear first.
- When the window ends, press **Close submissions** in admin. New cards and edits stop; the page stays up.

## Good to know
- Everything on a card is public, including WhatsApp numbers and emails. The form says so.
- Free Supabase projects pause after a week with no activity; open the dashboard to wake one.
- Photos are resized in the browser to 800x1000 JPEG (about 100 to 200 KB).
