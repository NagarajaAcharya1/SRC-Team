(function () {
  "use strict";
  const api = window.SrcAPI, esc = window.SrcLinks.esc, safePhoto = window.SrcLinks.safePhoto;
  const $ = (s) => document.querySelector(s);
  const ROLES = ["Lead", "Event Lead", "Media", "Tech", "Design", "Volunteer"];
  let pass = "", data = null;
  const toast = $("#toast");
  const say = (t) => { toast.textContent = t; toast.classList.add("show"); clearTimeout(say.t); say.t = setTimeout(() => toast.classList.remove("show"), 2000); };
  if (api.mode === "demo") $("#demoBanner").hidden = false;

  async function refresh() {
    data = await api.admin.list(pass);
    $("#login").hidden = true; $("#panel").hidden = false;
    const hiddenN = data.members.filter((m) => m.hidden).length;
    $("#total").textContent = data.members.length + " cards" + (hiddenN ? " (" + hiddenN + " hidden)" : "");
    $("#openState").textContent = data.open ? "Submissions are open" : "Submissions are closed";
    $("#toggleOpen").textContent = data.open ? "Close submissions" : "Open submissions";
    $("#rows").innerHTML = data.members.map((m) => `
      <div class="adm-card${m.hidden ? " off" : ""}" data-id="${esc(m.id)}">
        <img src="${esc(safePhoto(m.photo_url) || "assets/icon.png")}" alt="">
        <div>
          <div class="nm">${esc(m.name)}</div>
          <div class="adm-ctl">
            <select class="inp r" aria-label="Role">${ROLES.map((r) => `<option${r === m.role ? " selected" : ""}>${r}</option>`).join("")}</select>
            <input class="inp o" type="number" value="${Number(m.sort_order) || 100}" aria-label="Order" min="0" max="9999">
            <label><input class="h" type="checkbox"${m.hidden ? " checked" : ""}> Hidden</label>
          </div>
          <div class="adm-ctl">
            <button class="btn-ghost save" type="button">Save</button>
            <a class="btn-ghost" href="index.html#/m/${esc(m.id)}" target="_blank" rel="noopener">View</a>
            <button class="btn-ghost del" type="button" style="color:#ff6b8a;border-color:rgba(255,107,138,.5)">Delete</button>
          </div>
        </div>
      </div>`).join("") || '<p class="none" style="margin-top:20px">No cards yet.</p>';
  }

  $("#loginForm").addEventListener("submit", async (e) => {
    e.preventDefault(); pass = $("#pass").value; $("#loginErr").textContent = "";
    try { await refresh(); try { sessionStorage.setItem("src_admin", pass); } catch (x) {} }
    catch (err) { pass = ""; $("#loginErr").textContent = /passcode/i.test(err.message) ? "Wrong passcode." : "Can't reach the server."; }
  });
  $("#out").addEventListener("click", () => { pass = ""; try { sessionStorage.removeItem("src_admin"); } catch (e) {} location.reload(); });
  $("#toggleOpen").addEventListener("click", async () => {
    try { await api.admin.setOpen(pass, !data.open); await refresh(); say(data.open ? "Submissions opened" : "Submissions closed"); } catch (e) { say("Couldn't change that"); }
  });
  $("#rows").addEventListener("click", async (e) => {
    const card = e.target.closest(".adm-card"); if (!card) return; const id = card.dataset.id;
    try {
      if (e.target.closest(".save")) {
        await api.admin.update(pass, id, card.querySelector(".r").value, parseInt(card.querySelector(".o").value, 10) || 100, card.querySelector(".h").checked);
        await refresh(); say("Saved");
      } else if (e.target.closest(".del")) {
        if (!confirm("Delete this card for good?")) return;
        await api.admin.remove(pass, id); await refresh(); say("Deleted");
      }
    } catch (err) { say("Couldn't save. Sign in again."); }
  });

  let saved = ""; try { saved = sessionStorage.getItem("src_admin") || ""; } catch (e) {}
  if (saved) { pass = saved; refresh().catch(() => { pass = ""; }); }
})();
