/* Shared helpers: HTML escaping, social platforms, icons, link cleaning. */
(function () {
  "use strict";

  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const ICONS = {
    instagram: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2h10a5 5 0 015 5v10a5 5 0 01-5 5H7a5 5 0 01-5-5V7a5 5 0 015-5zm0 2a3 3 0 00-3 3v10a3 3 0 003 3h10a3 3 0 003-3V7a3 3 0 00-3-3H7zm5 3.5A4.5 4.5 0 1112 16.5 4.5 4.5 0 0112 7.5zm0 2A2.5 2.5 0 1014.5 12 2.5 2.5 0 0012 9.5zM17.2 6a1.1 1.1 0 11-1.1 1.1A1.1 1.1 0 0117.2 6z"/></svg>',
    linkedin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.98 3.5a2.5 2.5 0 11-.01 5 2.5 2.5 0 01.01-5zM3 9.75h4V21H3V9.75zm6.5 0h3.8v1.6h.06c.53-1 1.84-2.05 3.78-2.05 4.04 0 4.78 2.66 4.78 6.1V21h-4v-4.9c0-1.17-.02-2.67-1.63-2.67-1.63 0-1.88 1.27-1.88 2.58V21h-4V9.75z"/></svg>',
    github: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 .5a11.5 11.5 0 00-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.02 1.76 2.68 1.25 3.34.96.1-.74.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 015.78 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0012 .5z"/></svg>',
    x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>',
    youtube: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M23.5 6.2a3 3 0 00-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 00.5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 002.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 002.1-2.1c.5-1.9.5-5.8.5-5.8s0-3.9-.5-5.8zM9.6 15.6V8.4l6.2 3.6-6.2 3.6z"/></svg>',
    whatsapp: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.26-.47-2.4-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.08-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.07c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35zM12.05 21.8h0a9.87 9.87 0 01-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 01-1.51-5.26c0-5.45 4.44-9.89 9.89-9.89 2.64 0 5.12 1.03 6.99 2.9a9.83 9.83 0 012.89 7c0 5.45-4.44 9.88-9.89 9.88zM20.46 3.49A11.8 11.8 0 0012.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 005.68 1.45h0c6.55 0 11.89-5.34 11.9-11.9a11.82 11.82 0 00-3.48-8.41z"/></svg>',
    email: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 5h20v14H2V5zm2 2v.5l8 5.2 8-5.2V7H4zm16 10V10l-8 5.2L4 10v7h16z"/></svg>',
    website: '<svg viewBox="0 0 24 24" aria-hidden="true" class="stroke"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z"/></svg>'
  };

  /* order = order icons appear in cards and on profiles */
  const PLATFORMS = [
    { key: "instagram", label: "Instagram", color: "#e1306c", hosts: ["instagram.com"], base: "https://instagram.com/",
      handle: /^[A-Za-z0-9._]{1,30}$/, ph: "@username", hint: "Username or profile link" },
    { key: "linkedin", label: "LinkedIn", color: "#3b9eff", hosts: ["linkedin.com"], base: "https://www.linkedin.com/in/",
      handle: /^[A-Za-z0-9_%-]{3,100}$/, ph: "linkedin.com/in/you", hint: "Profile link or the name after /in/" },
    { key: "github", label: "GitHub", color: "#ffffff", hosts: ["github.com"], base: "https://github.com/",
      handle: /^[A-Za-z0-9-]{1,39}$/, ph: "username", hint: "Username or profile link" },
    { key: "x", label: "X", color: "#ffffff", hosts: ["x.com", "twitter.com"], base: "https://x.com/",
      handle: /^[A-Za-z0-9_]{1,15}$/, ph: "@username", hint: "Username or profile link" },
    { key: "youtube", label: "YouTube", color: "#ff3b3b", hosts: ["youtube.com", "youtu.be"], base: "https://youtube.com/@",
      handle: /^[A-Za-z0-9._-]{3,50}$/, ph: "@channel", hint: "Channel link or @handle" },
    { key: "whatsapp", label: "WhatsApp", color: "#25d366", special: true, ph: "+91 98765 43210",
      hint: "Number with country code. This is shown publicly." },
    { key: "email", label: "Email", color: "#2fb6e6", special: true, ph: "you@example.com", hint: "Shown publicly" },
    { key: "website", label: "Website", color: "#c9a8ff", special: true, ph: "yoursite.com", hint: "Portfolio or any link" }
  ];
  const BY_KEY = Object.fromEntries(PLATFORMS.map((p) => [p.key, p]));

  const cleanHost = (h) => h.toLowerCase().replace(/^(www|m|mobile)\./, "");

  function parseUrl(raw) {
    try { return new URL(/^https?:\/\//i.test(raw) ? raw : "https://" + raw); } catch (e) { return null; }
  }

  /* returns { value } ("" = empty) or { error } */
  function normalize(key, raw) {
    const p = BY_KEY[key];
    raw = (raw || "").trim();
    if (!raw) return { value: "" };

    if (key === "email") {
      const v = raw.replace(/^mailto:/i, "").toLowerCase();
      return /^[^@\s<>"']{1,64}@[^@\s<>"']{1,150}\.[^@\s<>"']{2,20}$/.test(v) ? { value: v } : { error: "Enter a valid email address." };
    }
    if (key === "whatsapp") {
      let d = raw.replace(/^https?:\/\/(wa\.me|api\.whatsapp\.com\/send\?phone=)\/?/i, "").replace(/\D/g, "");
      if (d.length === 10) d = "91" + d;
      if (d.length < 8 || d.length > 15) return { error: "Enter the number with country code, e.g. +91 98765 43210." };
      return { value: "https://wa.me/" + d };
    }
    if (key === "website") {
      const u = parseUrl(raw);
      if (!u || !u.hostname.includes(".") || /\s/.test(raw)) return { error: "Enter a valid website, e.g. yoursite.com." };
      u.protocol = "https:"; u.hash = "";
      const v = u.href.replace(/\/$/, "");
      return v.length <= 250 ? { value: v } : { error: "That link is too long." };
    }

    const looksUrl = /^https?:\/\//i.test(raw) || p.hosts.some((h) => raw.toLowerCase().includes(h));
    if (looksUrl) {
      const u = parseUrl(raw);
      if (!u || !p.hosts.includes(cleanHost(u.hostname))) return { error: "Use a link from " + p.hosts[0] + ", or just your username." };
      u.protocol = "https:"; u.hash = ""; if (key !== "youtube") u.search = "";
      const v = u.href.replace(/\/$/, "");
      return v.length <= 250 ? { value: v } : { error: "That link is too long." };
    }
    const h = raw.replace(/^@/, "");
    if (!p.handle.test(h)) return { error: "That doesn't look like a valid " + p.label + " username." };
    return { value: p.base + h };
  }

  const isHttps = (u) => /^https:\/\/[^\s<>"']+$/i.test(u || "");
  const safePhoto = (u) => (/^(https:\/\/|images\/|assets\/|data:image\/(jpeg|png|webp);base64,)[^\s<>"']+$/i.test(u || "") ? u : "");

  function hrefFor(key, v) {
    if (!v) return "";
    if (key === "email") return /^[^@\s<>"']+@[^@\s<>"']+$/.test(v) ? "mailto:" + v : "";
    return isHttps(v) ? v : "";
  }
  function shownFor(key, v) {
    if (key === "email") return v;
    if (key === "whatsapp") return "+" + String(v).replace(/\D/g, "");
    try { const u = new URL(v); return cleanHost(u.hostname) + u.pathname.replace(/\/$/, ""); } catch (e) { return v; }
  }

  /* generates URL-friendly slug from a name: e.g. "Pruthvi K R" -> "pruthvi-k-r" */
  function toSlug(name) {
    return String(name || "").toLowerCase().trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  /* only the links this person actually filled in */
  function filled(m) {
    return PLATFORMS.filter((p) => hrefFor(p.key, m[p.key])).map((p) => ({ p, href: hrefFor(p.key, m[p.key]), text: shownFor(p.key, m[p.key]) }));
  }

  window.SrcLinks = { esc, ICONS, PLATFORMS, BY_KEY, normalize, hrefFor, shownFor, filled, safePhoto, toSlug };
})();
