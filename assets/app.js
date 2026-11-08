(function () {
  "use strict";
  const L = window.SrcLinks, api = window.SrcAPI, cfg = window.SRC_CONFIG || {};
  const esc = L.esc;
  const $ = (s, r = document) => r.querySelector(s);
  const ROLES = ["Lead", "Event Lead", "Media", "Tech", "Design", "Volunteer"];
  const PLACEHOLDER = "data:image/svg+xml;utf8," + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 100"><rect width="80" height="100" fill="#1a002e"/><circle cx="40" cy="38" r="15" fill="#4b0082"/><path d="M10 100c2-26 16-38 30-38s28 12 30 38z" fill="#4b0082"/></svg>');
  const GO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17L17 7M8 7h9v9"/></svg>';
  const ARROW = GO.replace("<svg ", '<svg class="ar" ');

  /* ---------- state ---------- */
  let members = [], ready = false, loadFailed = false, isOpen = true, filter = "All", lastY = 0, io = null;
  const views = { home: $("#home"), profile: $("#profile"), form: $("#form") };

  /* ---------- storage (every access guarded: private mode can throw) ---------- */
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} }
  };
  const getMine = () => { const m = store.get("src_mine"); return m && m.id && m.key ? m : null; };

  /* ---------- gear drawn in code (matches the logo gear) ---------- */
  function gearPath(teeth, ro, ri, hole) {
    const pts = [], n = teeth * 4;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2, r = i % 4 === 1 || i % 4 === 2 ? ro : ri;
      pts.push(Math.cos(a) * r + "," + Math.sin(a) * r);
    }
    return "M" + pts.join("L") + "Z" + `M${hole},0A${hole},${hole} 0 1 0 ${-hole},0A${hole},${hole} 0 1 0 ${hole},0Z`;
  }
  $("#heroGear").innerHTML = `<path d="${gearPath(14, 96, 80, 38)}" fill-rule="evenodd" fill="rgba(106,0,168,.25)" stroke="rgba(201,168,255,.5)" stroke-width="1.2"/>`;

  /* ---------- small helpers ---------- */
  const toastEl = $("#toast");
  function say(t) { toastEl.textContent = t; toastEl.classList.add("show"); clearTimeout(say.t); say.t = setTimeout(() => toastEl.classList.remove("show"), 2200); }
  function friendly(e) {
    const m = String((e && e.message) || e).toLowerCase();
    if (m.includes("closed")) return "Submissions are closed, so changes can't be saved right now.";
    if (m.includes("slow down")) return "Lots of people are adding cards right now. Try again in a minute.";
    if (/\bfull\b/.test(m)) return "The page has reached its limit. Ask the core team for help.";
    if (m.includes("not allowed")) return "This device can't change that card. Open your private edit link instead.";
    if (m.includes("failed to fetch") || m.includes("network") || m.includes("load failed")) return "Can't reach the server. Check your internet and try again.";
    if (m.includes("size") || m.includes("exceed") || m.includes("too large") || m.includes("mime")) return "That photo couldn't be uploaded. Try a different, smaller photo.";
    if (m.includes("rejected")) return "That couldn't be saved. Please try again.";
    return "Something went wrong. Please try again.";
  }
  const photoOf = (m) => L.safePhoto(m.photo_url) || PLACEHOLDER;
  const shareUrl = (hash) => location.origin + location.pathname + hash;

  /* ================================================================
     BADGE CARD (used on the list and in the live form preview)
  ================================================================ */
  function badgeHTML(m, i, o = {}) {
    const right = i % 2 === 1;
    const long = Math.max(0, ...String(m.name || "").split(/\s+/).map((w) => w.length)) >= 9;
    const icons = L.filled(m).map(({ p, href }) =>
      `<a class="ic" style="--c:${p.color}" href="${esc(href)}" ${p.key === "email" ? "" : 'target="_blank" rel="noopener noreferrer"'} aria-label="${esc(m.name)} on ${p.label}" title="${p.label}">${L.ICONS[p.key]}</a>`).join("");
    return `<article class="badge-wrap${right ? " r" : ""}${o.in ? " in" : ""}">
      <div class="badge"><div class="badge-in">
        ${o.preview ? "" : `<a class="cover" href="#/m/${esc(m.id)}" aria-label="Open ${esc(m.name)}, ${esc(m.role)}"></a>`}
        <div class="strip"><span>${esc(m.role)}</span></div>
        <div class="badge-body">
          <div class="ph"><img src="${esc(photoOf(m))}" alt="" width="200" height="250" ${o.preview ? "" : 'loading="lazy"'} decoding="async"></div>
          <div class="txt">
            <div class="name${long ? " long" : ""}">${esc(m.name)}</div>
            ${icons ? `<div class="icons">${icons}</div>` : ""}
            <span class="go">View profile ${GO}</span>
          </div>
        </div>
      </div></div></article>`;
  }
  /* a broken photo link falls back to the silhouette */
  document.addEventListener("error", (e) => {
    const t = e.target;
    if (t && t.tagName === "IMG" && !t.dataset.fb && t.closest(".ph,.id-photo,.frame")) { t.dataset.fb = "1"; t.src = PLACEHOLDER; }
  }, true);

  /* ================================================================
     HOME
  ================================================================ */
  const listEl = $("#list"), chipsEl = $("#chips");

  function renderChips() {
    const present = ROLES.filter((r) => members.some((m) => m.role === r));
    if (!ready || present.length < 2) { chipsEl.innerHTML = ""; return; }
    if (filter !== "All" && !present.includes(filter)) filter = "All";
    chipsEl.innerHTML = ["All", ...present].map((r) => {
      const n = r === "All" ? members.length : members.filter((m) => m.role === r).length;
      return `<button class="chip" aria-pressed="${r === filter}" data-r="${esc(r)}">${esc(r)}<em>${n}</em></button>`;
    }).join("");
  }

  function renderList() {
    $("#count").textContent = ready ? (members.length === 1 ? "1 person" : members.length + " people") : "The people";
    if (!ready) {
      listEl.innerHTML = loadFailed
        ? `<div class="empty"><h3>Can't load the team</h3><p>Check your internet connection.</p><button class="btn" id="retry">Try again</button></div>`
        : '<div class="skel"></div>'.repeat(3);
      return;
    }
    if (!members.length) {
      listEl.innerHTML = `<div class="empty"><h3>No cards yet</h3><p>${isOpen ? "Be the first to add yours." : "Check back soon."}</p>${isOpen ? '<a class="btn" href="#/join">Add your card</a>' : ""}</div>`;
      return;
    }
    const items = members.filter((m) => filter === "All" || m.role === filter);
    listEl.innerHTML = items.map((m, i) =>
      (i ? `<div class="node" aria-hidden="true"><svg viewBox="-100 -100 200 200" class="g" data-dir="${i % 2 ? -1 : 1}"><path d="${gearPath(10, 96, 76, 34)}" fill-rule="evenodd"/></svg></div>` : "") + badgeHTML(m, i)).join("");
    if (io) io.disconnect();
    io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: 0.12 });
    listEl.querySelectorAll(".badge-wrap").forEach((el) => io.observe(el));
  }

  chipsEl.addEventListener("click", (e) => { const b = e.target.closest(".chip"); if (!b) return; filter = b.dataset.r; renderChips(); renderList(); });
  listEl.addEventListener("click", (e) => { if (e.target.closest("#retry")) loadData(); });
  listEl.addEventListener("pointermove", (e) => {
    const b = e.target.closest(".badge"); if (!b) return;
    const r = b.getBoundingClientRect(); b.style.setProperty("--mx", e.clientX - r.left + "px"); b.style.setProperty("--my", e.clientY - r.top + "px");
  });

  /* add / edit button in the hero + floating button */
  function updateCTA() {
    const mine = getMine(), btn = $("#ctaBtn"), fab = $("#fab");
    const text = mine ? "Edit your card" : "Add your card", href = mine ? "#/edit" : "#/join";
    btn.hidden = !isOpen; btn.href = href; $("#ctaText").textContent = text;
    $("#ctaNote").textContent = isOpen ? "" : "Adding and editing cards is closed.";
    fab.href = href; $("#fabText").textContent = text; fab.dataset.ok = isOpen ? "1" : "";
    onScroll();
  }

  /* ================================================================
     PROFILE
  ================================================================ */
  function renderProfile(id) {
    const el = views.profile;
    const back = `<div class="bar"><a class="btn-ghost" href="#/"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>Team</a>`;
    const m = members.find((x) => x.id === id);
    if (!m) {
      el.innerHTML = back + `</div>` + (ready
        ? `<div class="empty"><h3>Card not found</h3><p>This card was removed or never existed.</p><a class="btn" href="#/">See the team</a></div>`
        : loadFailed ? `<div class="empty"><h3>Can't load this card</h3><p>Check your internet connection.</p><button class="btn" id="retry2">Try again</button></div>` : '<div class="skel" style="margin-top:80px;height:420px"></div>');
      document.title = "Team SRC · Sahyadri Robotics Club";
      return;
    }
    const mine = getMine(), own = mine && mine.id === m.id && isOpen;
    const rows = L.filled(m).map(({ p, href, text }) =>
      `<a class="row" style="--c:${p.color}" href="${esc(href)}" ${p.key === "email" ? "" : 'target="_blank" rel="noopener noreferrer"'}><span class="ico">${L.ICONS[p.key]}</span><span class="t"><b>${p.label}</b><small>${esc(text)}</small></span>${ARROW}</a>`).join("");
    el.innerHTML = back + `<button class="btn-ghost" id="shareBtn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 15V3m0 0L7 8m5-5l5 5M5 13v6a2 2 0 002 2h10a2 2 0 002-2v-6"/></svg>Share</button></div>
      <div class="hang"><div class="cord"></div><div class="id"><div class="id-shell"><div class="id-in">
        <div class="strip"><span>${esc(m.role)}</span></div>
        <div class="id-main">
          <svg class="id-gear" viewBox="-100 -100 200 200" aria-hidden="true"><path d="${gearPath(12, 96, 80, 36)}" fill-rule="evenodd" fill="currentColor"/></svg>
          <div class="id-logo"><img src="assets/logo.webp" alt="SRC" width="93" height="38"></div>
          <div class="id-photo"><img src="${esc(photoOf(m))}" alt="${esc(m.name)}"></div>
          <div class="id-name">${esc(m.name)}</div>
        </div></div></div></div></div>
      <section class="contact"><h2>Get in touch</h2>
        ${rows ? `<div class="rows">${rows}</div>` : `<p class="none">${esc(m.name.split(" ")[0])} hasn't added any links yet.</p>`}
        ${own ? `<div class="owner"><a class="btn alt" href="#/edit">Edit my card</a></div>` : ""}
      </section>
      <footer><a href="#/">See the whole team</a></footer>`;
    document.title = m.name + " · Team SRC";
  }
  views.profile.addEventListener("click", async (e) => {
    if (e.target.closest("#retry2")) return loadData();
    if (!e.target.closest("#shareBtn")) return;
    const id = (location.hash.split("/")[2] || ""), m = members.find((x) => x.id === id); if (!m) return;
    const url = shareUrl("#/m/" + id);
    try {
      if (navigator.share) await navigator.share({ title: m.name + " · Team SRC", url });
      else { await navigator.clipboard.writeText(url); say("Link copied"); }
    } catch (err) {}
  });

  /* ================================================================
     PHOTO CROPPER  (drag to move, slider to zoom, saves 800x1000 JPEG)
  ================================================================ */
  function makeCropper(canvas, onchange) {
    const W = canvas.width, H = canvas.height, ctx = canvas.getContext("2d");
    let img = null, iw = 0, ih = 0, min = 1, z = 1, ox = 0, oy = 0, drag = null;
    const sc = () => min * z;
    const clamp = () => { ox = Math.min(0, Math.max(W - iw * sc(), ox)); oy = Math.min(0, Math.max(H - ih * sc(), oy)); };
    function paint(c, w, h) {
      const k = w / W; c.fillStyle = "#14002a"; c.fillRect(0, 0, w, h);
      if (img) c.drawImage(img, ox * k, oy * k, iw * sc() * k, ih * sc() * k);
    }
    const draw = () => paint(ctx, W, H);
    function setZoom(nz) {
      const cx = (W / 2 - ox) / sc(), cy = (H / 2 - oy) / sc();
      z = Math.min(3, Math.max(1, nz)); ox = W / 2 - cx * sc(); oy = H / 2 - cy * sc(); clamp(); draw();
    }
    async function load(file) {
      if (!/^image\//.test(file.type) && !/\.(jpe?g|png|webp|heic|heif)$/i.test(file.name)) throw new Error("Choose an image file.");
      if (file.size > 30 * 1024 * 1024) throw new Error("That photo is too large. Choose one under 30 MB.");
      let bmp;
      try { bmp = await createImageBitmap(file, { imageOrientation: "from-image" }); }
      catch (e) {
        bmp = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error("That file isn't a photo this browser can open.")); i.src = URL.createObjectURL(file); });
      }
      const bw = bmp.width || bmp.naturalWidth, bh = bmp.height || bmp.naturalHeight, f = Math.min(1, 1600 / Math.max(bw, bh));
      const off = document.createElement("canvas"); off.width = Math.round(bw * f); off.height = Math.round(bh * f);
      off.getContext("2d").drawImage(bmp, 0, 0, off.width, off.height);
      if (bmp.close) bmp.close();
      img = off; iw = off.width; ih = off.height; min = Math.max(W / iw, H / ih); z = 1;
      ox = (W - iw * min) / 2; oy = (H - ih * min) * 0.2; clamp(); draw();
    }
    canvas.addEventListener("pointerdown", (e) => { if (!img) return; canvas.setPointerCapture(e.pointerId); drag = { x: e.clientX, y: e.clientY, ox, oy }; canvas.style.cursor = "grabbing"; });
    canvas.addEventListener("pointermove", (e) => {
      if (!drag) return; const k = W / canvas.getBoundingClientRect().width;
      ox = drag.ox + (e.clientX - drag.x) * k; oy = drag.oy + (e.clientY - drag.y) * k; clamp(); draw();
    });
    const end = () => { if (drag) { drag = null; canvas.style.cursor = ""; onchange(); } };
    canvas.addEventListener("pointerup", end); canvas.addEventListener("pointercancel", end);
    canvas.addEventListener("wheel", (e) => { if (!img) return; e.preventDefault(); setZoom(z * (e.deltaY < 0 ? 1.06 : 0.94)); onchange("zoom"); }, { passive: false });
    return {
      load, setZoom, get z() { return z; }, get has() { return !!img; },
      blob() { const c = document.createElement("canvas"); c.width = 800; c.height = 1000; paint(c.getContext("2d"), 800, 1000); return new Promise((res) => c.toBlob(res, "image/jpeg", 0.86)); },
      thumb() { const c = document.createElement("canvas"); c.width = 240; c.height = 300; paint(c.getContext("2d"), 240, 300); return c.toDataURL("image/jpeg", 0.7); }
    };
  }

  /* ================================================================
     ADD / EDIT FORM
  ================================================================ */
  const FIELD_TYPE = { whatsapp: ["tel", "tel"], email: ["email", "email"], website: ["url", "url"] };

  function renderForm(editId) {
    const el = views.form, editing = !!editId;
    const m = editing ? members.find((x) => x.id === editId) : null;
    if (editing && !m) { el.innerHTML = `<div class="bar"><a class="btn-ghost" href="#/">Team</a></div><div class="empty"><h3>Card not found</h3><p>It may have been removed.</p><a class="btn" href="#/join">Add a new card</a></div>`; return; }
    if (!isOpen) { el.innerHTML = `<div class="bar"><a class="btn-ghost" href="#/">Team</a></div><div class="empty"><h3>Adding cards is closed</h3><p>The team page is no longer taking new cards or changes.</p><a class="btn" href="#/">See the team</a></div>`; return; }

    const val = (k) => (m && m[k] ? (k === "whatsapp" ? "+" + String(m[k]).replace(/\D/g, "") : k === "email" ? m[k] : L.shownFor(k, m[k])) : "");
    const fields = L.PLATFORMS.map((p) => {
      const [type, mode] = FIELD_TYPE[p.key] || ["text", "text"];
      return `<div class="field"><label for="f-${p.key}"><span class="ic" style="--c:${p.color}">${L.ICONS[p.key]}</span>${p.label} <i>optional</i></label>
        <input class="inp" id="f-${p.key}" type="${type}" inputmode="${mode === "text" ? "text" : mode}" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="${esc(p.ph)}" value="${esc(val(p.key))}">
        <p class="hint">${esc(p.hint)}</p><p class="err" id="e-${p.key}" role="alert"></p></div>`;
    }).join("");

    el.innerHTML = `<div class="bar"><a class="btn-ghost" href="${editing ? "#/m/" + esc(editId) : "#/"}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>${editing ? "Cancel" : "Team"}</a></div>
      <h1 class="form-title">${editing ? "Edit your card" : "Add your card"}</h1>
      <p class="lede">${editing ? "Change anything below. Your card updates as soon as you save." : "Add your photo and the links you want people to see. Only the links you fill in show up on your card."}</p>
      <div class="pv-label">Live preview</div>
      <div class="pv" id="pv"></div>
      <form id="f" novalidate>
        <div class="hp" aria-hidden="true"><label>Leave empty <input id="f-hp" tabindex="-1" autocomplete="off"></label></div>
        <section class="blk"><h2>1 · Your photo</h2>
          <div class="frame${editing ? " has" : ""}" id="frame">
            ${editing ? `<img class="cur" id="cur" src="${esc(photoOf(m))}" alt="Your current photo">` : ""}
            <canvas id="cv" width="400" height="500" hidden></canvas>
            <button type="button" class="pick" id="pick" ${editing ? "hidden" : ""}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8a2 2 0 012-2h1.5l1.2-2h6.6l1.2 2H18a2 2 0 012 2v9a2 2 0 01-2 2H6a2 2 0 01-2-2V8z"/><circle cx="12" cy="13" r="3.6"/></svg>
              Add your photo<small>Portrait works best.<br>Keep your face in the upper half.</small></button>
          </div>
          <div class="zoomrow" id="zoomrow" hidden><span aria-hidden="true">−</span><input type="range" id="zoom" min="1" max="3" step="0.01" value="1" aria-label="Zoom photo"><span aria-hidden="true">+</span></div>
          <p class="hint" id="cropHint" style="text-align:center" hidden>Drag the photo to move it. Use the slider to zoom.</p>
          <div class="photo-actions"><button type="button" class="btn-ghost" id="choose" ${editing ? "" : "hidden"}>Change photo</button></div>
          <input type="file" id="file" accept="image/*" hidden>
          <p class="err" id="e-photo" role="alert" style="text-align:center"></p>
        </section>
        <section class="blk"><h2>2 · About you</h2>
          <div class="field"><label for="f-name">Your name</label><input class="inp" id="f-name" type="text" maxlength="60" autocomplete="name" placeholder="e.g. Aditi Rao" value="${esc(m ? m.name : "")}"><p class="err" id="e-name" role="alert"></p></div>
          <div class="field"><label for="f-role">Your role</label><select class="inp" id="f-role">${ROLES.map((r) => `<option${m && m.role === r ? " selected" : ""}>${r}</option>`).join("")}</select>
            <p class="hint">The core team may adjust your role.</p></div>
        </section>
        <section class="blk"><h2>3 · Your links</h2>
          <p class="hint" style="margin-top:-4px">Add only what you want shown. Everything here is public.</p>${fields}</section>
        <div id="formErr"></div>
        <div class="submit"><button class="btn block" type="submit" id="save">${editing ? "Save changes" : "Add me to the team"}</button></div>
        ${editing ? `<div class="stack"><button class="btn danger block" type="button" id="del">Delete my card</button></div>` : ""}
      </form>`;

    const f = $("#f", el), canvas = $("#cv", el), frame = $("#frame", el);
    let thumbUrl = "", busy = false;

    /* live preview */
    function draft() {
      const d = { id: "preview", name: $("#f-name").value.trim() || "Your name", role: $("#f-role").value, photo_url: thumbUrl || (m ? m.photo_url : "") };
      L.PLATFORMS.forEach((p) => { const r = L.normalize(p.key, $("#f-" + p.key).value); if (r.value) d[p.key] = r.value; });
      return d;
    }
    const paintPreview = () => { $("#pv", el).innerHTML = badgeHTML(draft(), 0, { in: true, preview: true }); };

    /* photo */
    const cropper = makeCropper(canvas, (why) => {
      thumbUrl = cropper.thumb(); paintPreview();
      if (why === "zoom") $("#zoom").value = cropper.z;
    });
    const pickFile = () => $("#file").click();
    $("#pick").addEventListener("click", pickFile); $("#choose").addEventListener("click", pickFile);
    $("#file").addEventListener("change", async (e) => {
      const file = e.target.files[0]; e.target.value = ""; if (!file) return;
      $("#e-photo").textContent = "";
      try {
        await cropper.load(file);
        canvas.hidden = false; const cur = $("#cur"); if (cur) cur.hidden = true;
        $("#pick").hidden = true; $("#choose").hidden = false; $("#choose").textContent = "Change photo";
        $("#zoomrow").hidden = false; $("#cropHint").hidden = false; $("#zoom").value = 1; frame.classList.add("has");
        thumbUrl = cropper.thumb(); paintPreview();
      } catch (err) { $("#e-photo").textContent = err.message || "That photo couldn't be opened."; }
    });
    $("#zoom").addEventListener("input", (e) => { cropper.setZoom(parseFloat(e.target.value)); });
    $("#zoom").addEventListener("change", () => { thumbUrl = cropper.thumb(); paintPreview(); });

    f.addEventListener("input", (e) => { if (e.target.classList.contains("inp")) { e.target.classList.remove("bad"); const er = $("#e-" + e.target.id.slice(2)); if (er) er.textContent = ""; } paintPreview(); });
    L.PLATFORMS.forEach((p) => $("#f-" + p.key).addEventListener("blur", () => showErr(p.key, L.normalize(p.key, $("#f-" + p.key).value).error)));
    function showErr(k, msg) { const i = $("#f-" + k), e = $("#e-" + k); if (!i || !e) return; e.textContent = msg || ""; i.classList.toggle("bad", !!msg); }

    function collect() {
      const v = { name: $("#f-name").value.trim().replace(/\s+/g, " "), role: $("#f-role").value }, errors = {};
      if (v.name.length < 2 || v.name.length > 60) errors.name = "Enter your name (2 to 60 characters).";
      if (!ROLES.includes(v.role)) errors.role = "Choose a role.";
      L.PLATFORMS.forEach((p) => { const r = L.normalize(p.key, $("#f-" + p.key).value); if (r.error) errors[p.key] = r.error; else v[p.key] = r.value; });
      if (!editing && !cropper.has) errors.photo = "Add a photo of yourself.";
      return { v, errors };
    }

    f.addEventListener("submit", async (e) => {
      e.preventDefault(); if (busy) return;
      $("#formErr").innerHTML = "";
      const { v, errors } = collect();
      ["name", "photo", ...L.PLATFORMS.map((p) => p.key)].forEach((k) => { if (k === "photo") $("#e-photo").textContent = errors.photo || ""; else showErr(k, errors[k]); });
      const first = Object.keys(errors)[0];
      if (first) { const t = first === "photo" ? frame : $("#f-" + first); t.scrollIntoView({ behavior: "smooth", block: "center" }); if (t.focus && first !== "photo") t.focus({ preventScroll: true }); return; }

      busy = true; const btn = $("#save"); btn.disabled = true; btn.textContent = cropper.has ? "Uploading photo…" : "Saving…";
      try {
        v.photo_url = m ? m.photo_url : "";
        if (cropper.has) { const blob = await cropper.blob(); v.photo_url = await api.uploadPhoto(blob); btn.textContent = "Saving…"; }
        if (editing) {
          const mine = getMine(); if (!mine || mine.id !== editId) throw new Error("not allowed");
          await api.update(editId, mine.key, v); store.del("src_cache_v1"); await loadData(true);
          say("Saved"); location.hash = "#/m/" + editId;
        } else {
          const r = await api.add(v, $("#f-hp").value); store.set("src_mine", { id: r.id, key: r.key }); store.del("src_cache_v1");
          await loadData(true); updateCTA(); renderSuccess(r);
        }
      } catch (err) {
        $("#formErr").innerHTML = `<div class="formerr" role="alert">${esc(friendly(err))}</div>`;
        btn.disabled = false; btn.textContent = editing ? "Save changes" : "Add me to the team"; busy = false;
      }
    });

    if (editing) $("#del").addEventListener("click", async () => {
      if (!confirm("Delete your card? This can't be undone.")) return;
      const mine = getMine(); if (!mine) return;
      try { await api.remove(editId, mine.key); store.del("src_mine"); store.del("src_cache_v1"); await loadData(true); updateCTA(); say("Card deleted"); location.hash = "#/"; }
      catch (err) { $("#formErr").innerHTML = `<div class="formerr" role="alert">${esc(friendly(err))}</div>`; }
    });
    paintPreview();
  }

  function renderSuccess(r) {
    const link = shareUrl("#/edit/" + r.id + "/" + r.key);
    views.form.innerHTML = `<div class="success"><div class="tick" aria-hidden="true">✓</div>
      <h1 class="form-title">You're on the team page</h1>
      <p class="lede">Your card is live. Save the private link below to edit your card later from any phone or laptop. Don't share it with anyone.</p>
      <div class="keybox"><input class="inp" id="keyLink" readonly value="${esc(link)}" aria-label="Your private edit link"><button class="btn alt" id="copyKey" type="button">Copy</button></div>
      <div class="stack"><a class="btn block" href="#/m/${esc(r.id)}">View my card</a><a class="btn alt block" href="#/">Back to the team</a></div></div>`;
    $("#copyKey").addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(link); say("Private link copied"); } catch (e) { const i = $("#keyLink"); i.select(); say("Press copy on your keyboard"); }
    });
    scrollTo(0, 0);
  }

  /* ================================================================
     ROUTER
  ================================================================ */
  let current = "home";
  function show(name) {
    if (current === "home" && name !== "home") lastY = scrollY;
    current = name;
    Object.entries(views).forEach(([k, v]) => v.classList.toggle("active", k === name));
    onScroll();
  }
  function route(keep) {
    const parts = location.hash.replace(/^#\/?/, "").split("/");
    const r = parts[0], id = parts[1] || "";
    if (r === "m" && id) { show("profile"); renderProfile(id); if (!keep) scrollTo(0, 0); return; }
    if (r === "join") {
      if (getMine()) { location.replace("#/edit"); return; }
      const wasForm = current === "form"; show("form"); if (!(keep && wasForm)) { renderForm(null); scrollTo(0, 0); } return;
    }
    if (r === "edit") {
      if (parts[1] && parts[2]) { store.set("src_mine", { id: parts[1], key: parts[2] }); history.replaceState(null, "", "#/edit"); updateCTA(); }
      const mine = getMine();
      if (!mine) { say("Add your card first"); location.replace("#/join"); return; }
      const wasForm = current === "form"; show("form");
      if (!ready) { views.form.innerHTML = '<div class="skel" style="margin-top:80px;height:420px"></div>'; return; }
      if (!(keep && wasForm)) { renderForm(mine.id); scrollTo(0, 0); } return;
    }
    show("home"); document.title = "Team SRC · Sahyadri Robotics Club";
    if (!keep) { renderChips(); renderList(); scrollTo(0, lastY); }
  }
  addEventListener("hashchange", () => route());

  /* ================================================================
     DATA
  ================================================================ */
  async function loadData(force) {
    try {
      const fresh = await api.list();
      loadFailed = false;
      const changed = JSON.stringify(fresh) !== JSON.stringify(members) || !ready;
      members = fresh; ready = true; store.set("src_cache_v1", fresh);
      if (changed || force) { renderChips(); renderList(); if (current === "profile" || (current === "form" && location.hash.startsWith("#/edit") && !$("#f"))) route(true); }
    } catch (e) {
      if (!ready) { loadFailed = true; renderList(); if (current === "profile") route(true); }
    }
  }

  /* ================================================================
     SCROLL: progress bar, turning gears, floating button
  ================================================================ */
  const prog = $("#progress"), fab = $("#fab"); let tick = false;
  function onScroll() {
    if (tick) return; tick = true;
    requestAnimationFrame(() => {
      const y = scrollY, max = document.documentElement.scrollHeight - innerHeight;
      document.documentElement.style.setProperty("--rot", y * 0.22 + "deg");
      if (current === "home") listEl.querySelectorAll(".node .g").forEach((g) => { g.style.transform = `rotate(${y * 0.35 * g.dataset.dir}deg)`; });
      prog.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
      const show = current === "home" && fab.dataset.ok === "1" && y > 420;
      fab.hidden = false; fab.classList.toggle("show", show); fab.tabIndex = show ? 0 : -1;
      tick = false;
    });
  }
  addEventListener("scroll", onScroll, { passive: true });

  /* ================================================================
     START
  ================================================================ */
  function init() {
    if (api.mode === "demo") $("#demoBanner").hidden = false;
    const site = $("#siteLink"); if (cfg.CLUB_SITE) site.href = cfg.CLUB_SITE; else site.removeAttribute("href");
    const cached = store.get("src_cache_v1");
    if (Array.isArray(cached) && cached.length) { members = cached; ready = true; }
    updateCTA(); route();
    api.isOpen().then((o) => { isOpen = o; updateCTA(); if (!o && current === "form") route(); renderList(); }).catch(() => {});
    loadData();
  }
  init();
})();
