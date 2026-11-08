/* Data layer. Talks to Supabase when config.js has keys, otherwise runs a
   browser-only DEMO mode so the site can be tried without any setup. */
(function () {
  "use strict";
  const cfg = window.SRC_CONFIG || {};
  const live = !!(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && window.supabase);
  const FIELDS = ["instagram", "linkedin", "github", "x", "youtube", "whatsapp", "email", "website"];
  const COLS = ["id", "name", "role", "photo_url", ...FIELDS, "sort_order", "created_at"].join(",");

  /* ------------------------------------------------------------ Supabase */
  function makeLive() {
    const sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
    });
    const must = ({ data, error }) => { if (error) throw new Error(error.message || "request failed"); return data; };
    const args = (f) => ({
      p_name: f.name, p_role: f.role, p_photo_url: f.photo_url || "",
      p_instagram: f.instagram || "", p_linkedin: f.linkedin || "", p_github: f.github || "", p_x: f.x || "",
      p_youtube: f.youtube || "", p_whatsapp: f.whatsapp || "", p_email: f.email || "", p_website: f.website || ""
    });
    return {
      mode: "live",
      async list() {
        return must(await sb.from("members").select(COLS).order("sort_order").order("created_at"));
      },
      async isOpen() { return must(await sb.rpc("is_open")) !== false; },
      async uploadPhoto(blob) {
        const path = "members/" + crypto.randomUUID() + ".jpg";
        must(await sb.storage.from("photos").upload(path, blob, { contentType: "image/jpeg", cacheControl: "31536000", upsert: false }));
        return sb.storage.from("photos").getPublicUrl(path).data.publicUrl;
      },
      async add(f, honeypot) {
        const rows = must(await sb.rpc("add_member", { ...args(f), p_hp: honeypot || "" }));
        const r = Array.isArray(rows) ? rows[0] : rows;
        return { id: r.id, key: r.edit_key };
      },
      async update(id, key, f) { must(await sb.rpc("update_member", { p_id: id, p_key: key, ...args(f) })); },
      async remove(id, key) { must(await sb.rpc("delete_member", { p_id: id, p_key: key })); },
      admin: {
        async list(pass) { return must(await sb.rpc("admin_list", { p_pass: pass })); },
        async update(pass, id, role, sort, hidden) { must(await sb.rpc("admin_update", { p_pass: pass, p_id: id, p_role: role, p_sort: sort, p_hidden: hidden })); },
        async remove(pass, id) { must(await sb.rpc("admin_delete", { p_pass: pass, p_id: id })); },
        async setOpen(pass, open) { must(await sb.rpc("admin_set_open", { p_pass: pass, p_open: open })); }
      }
    };
  }

  /* ---------------------------------------------------------------- Demo */
  function makeDemo() {
    const K = "src_demo_v1", OPEN = "src_demo_open";
    const seed = [
      ["Pruthvi K R", "Lead", 1], ["Hemanth", "Lead", 2], ["Yash Shetty", "Event Lead", 3], ["Gopalakrishna", "Event Lead", 4],
      ["P R Pratheeksha", "Event Lead", 5], ["Nagaraja", "Media", 6], ["Harshitha", "Volunteer", 7], ["Likhitha", "Volunteer", 8]
    ];
    const imgFor = { "Pruthvi K R": 1, Hemanth: 5, "Yash Shetty": 3, Gopalakrishna: 4, "P R Pratheeksha": 6, Nagaraja: 2, Harshitha: 7, Likhitha: 8 };
    const read = () => {
      try { const v = JSON.parse(localStorage.getItem(K)); if (Array.isArray(v)) return v; } catch (e) {}
      const rows = seed.map(([name, role, o], i) => ({
        id: "demo-" + (i + 1), name, role, photo_url: "images/p" + imgFor[name] + ".jpg", sort_order: o, hidden: false,
        key: "", created_at: new Date(2026, 10, 1, 0, i).toISOString(),
        instagram: "", linkedin: "", github: "", x: "", youtube: "", whatsapp: "", email: "", website: ""
      }));
      write(rows); return rows;
    };
    const write = (rows) => { try { localStorage.setItem(K, JSON.stringify(rows)); } catch (e) { throw new Error("Browser storage is full (demo mode)."); } };
    const strip = ({ key, hidden, ...rest }) => rest;
    const sorted = (rows) => rows.slice().sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at));
    const isOpen = () => localStorage.getItem(OPEN) !== "false";
    const asDataUrl = (blob) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(blob); });
    const need = () => { if (!isOpen()) throw new Error("closed"); };
    const ADMIN = "admin";
    const guard = (p) => { if (p !== ADMIN) throw new Error("wrong passcode"); };
    return {
      mode: "demo",
      async list() { return sorted(read().filter((r) => !r.hidden)).map(strip); },
      async isOpen() { return isOpen(); },
      async uploadPhoto(blob) { return asDataUrl(blob); },
      async add(f, honeypot) {
        if (honeypot) throw new Error("rejected"); need();
        const rows = read(); const id = "demo-" + Date.now().toString(36); const key = Math.random().toString(36).slice(2) + Date.now().toString(36);
        rows.push({ id, key, hidden: false, sort_order: 100, created_at: new Date().toISOString(), ...f });
        write(rows); return { id, key };
      },
      async update(id, key, f) {
        need(); const rows = read(); const r = rows.find((x) => x.id === id && x.key === key);
        if (!r) throw new Error("not allowed"); Object.assign(r, f); write(rows);
      },
      async remove(id, key) {
        const rows = read(); const i = rows.findIndex((x) => x.id === id && x.key === key);
        if (i < 0) throw new Error("not allowed"); rows.splice(i, 1); write(rows);
      },
      admin: {
        async list(p) { guard(p); return { open: isOpen(), members: sorted(read()).map(({ key, ...r }) => r) }; },
        async update(p, id, role, sort, hidden) { guard(p); const rows = read(); const r = rows.find((x) => x.id === id); if (r) { r.role = role; r.sort_order = sort; r.hidden = hidden; write(rows); } },
        async remove(p, id) { guard(p); write(read().filter((x) => x.id !== id)); },
        async setOpen(p, open) { guard(p); localStorage.setItem(OPEN, open ? "true" : "false"); }
      }
    };
  }

  window.SrcAPI = live ? makeLive() : makeDemo();
  window.SrcAPI.FIELDS = FIELDS;
})();
