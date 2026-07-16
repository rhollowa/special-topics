// ======================================================================
// BUSI 2305 — Home page
// Fetches announcements from the Ivory Tower backend (replaces the old
// static announcements.json feed), renders the same <details> markup so
// theme.css styling is unchanged, and (for admins only) inline add/remove
// controls plus the same admin/preview toggle as Lessons/Tests.
// ======================================================================

(function() {
  'use strict';

  const API = 'https://acc.indiafoxtrotcharlie.com';
  const API_KEY = 'c7852252558744ea5bef3c86136edbf31b5e3e556fd447454a4d37b06151b4e7';
  const COURSE = 'BUSI-2305';
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  let ANNOUNCEMENTS = [];
  let IS_ADMIN = false;
  let SERVER_ADMIN = false;
  let PREVIEW_MODE = false;

  function authFetch(url, opts = {}) {
    const isForm = opts.body instanceof FormData;
    const headers = Object.assign({ 'X-API-Key': API_KEY }, isForm ? {} : { 'Content-Type': 'application/json' }, opts.headers || {});
    return fetch(API + url, Object.assign({ credentials: 'include' }, opts, { headers }));
  }

  function escapeHTML(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function fmtDate(iso) {
    const parts = (iso || "").split("-");
    if (parts.length !== 3) return iso || "";
    const y = parts[0], m = parseInt(parts[1], 10), d = parseInt(parts[2], 10);
    if (isNaN(m) || isNaN(d)) return iso;
    return MONTHS[m - 1] + " " + d + ", " + y;
  }

  function renderBody(text) {
    return escapeHTML(text).split(/\n\s*\n/).map(p => "<p>" + p.replace(/\n/g, "<br>") + "</p>").join("");
  }

  function renderAnnouncements() {
    const mount = document.getElementById("announcements-list");
    if (!mount) return;
    if (!ANNOUNCEMENTS.length) {
      mount.innerHTML = '<p class="announcements-empty">No announcements yet. Check back soon.</p>';
      return;
    }
    mount.innerHTML = ANNOUNCEMENTS.map((a, i) => {
      const open = i === 0 ? " open" : "";
      return `<details class="announcement"${open}>
        <summary>
          <span class="announcement-date">${escapeHTML(fmtDate(a.date))}</span>
          <span class="announcement-title">${escapeHTML(a.title || "Announcement")}</span>
          <span class="announcement-chevron" aria-hidden="true"></span>
          ${IS_ADMIN ? `<span class="admin-x" data-remove-announcement="${a.id}" title="Remove">×</span>` : ''}
        </summary>
        <div class="announcement-body">${renderBody(a.body || "")}</div>
      </details>`;
    }).join("");
  }

  function renderAddButton() {
    const host = document.getElementById("announcements-add-host");
    if (!host) return;
    host.innerHTML = IS_ADMIN ? '<button class="admin-add" data-add-announcement="1">+ Add Announcement</button>' : '';
  }

  async function loadAndRender() {
    const mount = document.getElementById("announcements-list");
    try {
      const res = await authFetch(`/ivory/announcements?course=${encodeURIComponent(COURSE)}`, { method: 'GET' });
      const data = await res.json();
      ANNOUNCEMENTS = data.ok ? data.announcements : [];
      renderAnnouncements();
      renderAddButton();
      bindAdminControls();
    } catch (e) {
      if (mount) mount.innerHTML = '<p class="announcements-empty">Announcements unavailable right now. Please refresh in a moment.</p>';
    }
  }

  function bindAdminControls() {
    if (!IS_ADMIN) return;
    document.querySelectorAll('[data-remove-announcement]').forEach(el => {
      el.addEventListener('click', async (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (!confirm('Remove this announcement?')) return;
        const id = el.dataset.removeAnnouncement;
        await authFetch('/ivory/admin/announcements/' + id, { method: 'DELETE' });
        await loadAndRender();
      });
    });
    document.querySelectorAll('[data-add-announcement]').forEach(btn => {
      btn.addEventListener('click', openAddModal);
    });
  }

  function openAddModal() {
    if (document.getElementById('announcementAddModal')) return;
    const today = new Date().toISOString().slice(0, 10);
    const html = `<div class="overlay open" id="announcementAddModal" onclick="if(event.target.id==='announcementAddModal')this.remove()">
      <div class="modal-inner">
        <h3 style="margin:0 0 1rem;">Add Announcement</h3>
        <input type="date" id="announcementAddDate" value="${today}" style="width:100%;padding:.5rem .65rem;border:1px solid #ccc;border-radius:4px;margin-bottom:.75rem;box-sizing:border-box;">
        <input type="text" id="announcementAddTitle" placeholder="Title (optional, defaults to 'Announcement')" style="width:100%;padding:.5rem .65rem;border:1px solid #ccc;border-radius:4px;margin-bottom:.75rem;box-sizing:border-box;">
        <textarea id="announcementAddBody" placeholder="Body text" rows="8" style="width:100%;padding:.5rem .65rem;border:1px solid #ccc;border-radius:4px;margin-bottom:.75rem;box-sizing:border-box;font-family:inherit;"></textarea>
        <div class="msg" id="announcementAddMsg" style="min-height:1.2em;font-size:.85rem;color:#c00;"></div>
        <div style="display:flex;gap:.5rem;justify-content:flex-end;">
          <button onclick="document.getElementById('announcementAddModal').remove()" style="padding:.5rem 1rem;border-radius:4px;border:1px solid #ccc;background:#fff;cursor:pointer;">Cancel</button>
          <button id="announcementAddSubmit" style="padding:.5rem 1rem;border-radius:4px;border:1px solid #1a7a4a;background:#1a7a4a;color:#fff;cursor:pointer;">Add</button>
        </div>
      </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
    document.getElementById('announcementAddSubmit').addEventListener('click', submitAdd);
  }

  async function submitAdd() {
    const dateInput = document.getElementById('announcementAddDate');
    const titleInput = document.getElementById('announcementAddTitle');
    const bodyInput = document.getElementById('announcementAddBody');
    const msg = document.getElementById('announcementAddMsg');
    const body = bodyInput.value.trim();

    if (!body) { msg.textContent = 'Body text is required.'; return; }

    msg.style.color = '#666';
    msg.textContent = 'Saving…';

    try {
      const res = await authFetch('/ivory/admin/announcements', {
        method: 'POST',
        body: JSON.stringify({
          course: COURSE,
          date: dateInput.value,
          title: titleInput.value.trim() || 'Announcement',
          body,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Save failed');

      document.getElementById('announcementAddModal').remove();
      await loadAndRender();
    } catch (e) {
      msg.style.color = '#c00';
      msg.textContent = 'Failed: ' + e.message;
    }
  }

  function renderAdminBadge() {
    let badge = document.getElementById('adminModeBadge');
    if (!SERVER_ADMIN) {
      if (badge) badge.remove();
      return;
    }
    const showingAdmin = !PREVIEW_MODE;
    if (!badge) {
      badge = document.createElement('div');
      badge.id = 'adminModeBadge';
      badge.style.cssText = 'position:fixed;top:12px;right:12px;z-index:2000;padding:6px 14px;border-radius:20px;font-family:system-ui,-apple-system,sans-serif;font-size:12px;font-weight:600;cursor:default;box-shadow:0 2px 8px rgba(0,0,0,0.15);';
      document.body.appendChild(badge);
    }
    badge.textContent = showingAdmin ? 'Admin view — triple-click crest to preview as student' : 'Student preview — triple-click crest to return to admin';
    badge.style.background = showingAdmin ? '#1a7a4a' : '#333';
    badge.style.color = '#fff';
  }

  function openLoginModal() {
    if (document.getElementById('adminLoginModal')) return;
    const html = `<div class="overlay open" id="adminLoginModal" onclick="if(event.target.id==='adminLoginModal')this.remove()">
      <div class="modal-inner">
        <h3 style="margin:0 0 1rem;">Admin Sign In</h3>
        <input type="password" id="adminLoginPw" placeholder="Password" autofocus style="width:100%;padding:.55rem .7rem;border:1px solid #ccc;border-radius:4px;font-size:.95rem;margin-bottom:.75rem;box-sizing:border-box;">
        <div class="msg" id="adminLoginMsg" style="min-height:1.2em;font-size:.85rem;color:#c00;"></div>
        <div style="display:flex;gap:.5rem;justify-content:flex-end;margin-top:.5rem;">
          <button onclick="document.getElementById('adminLoginModal').remove()" style="padding:.5rem 1rem;border-radius:4px;border:1px solid #ccc;background:#fff;cursor:pointer;">Cancel</button>
          <button id="adminLoginSubmit" style="padding:.5rem 1rem;border-radius:4px;border:1px solid #1a7a4a;background:#1a7a4a;color:#fff;cursor:pointer;">Sign In</button>
        </div>
      </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
    const pwInput = document.getElementById('adminLoginPw');
    const submit = async () => {
      const msg = document.getElementById('adminLoginMsg');
      const res = await authFetch('/ivory/admin/password-auth', { method: 'POST', body: JSON.stringify({ password: pwInput.value }) });
      const data = await res.json();
      if (data.ok) {
        document.getElementById('adminLoginModal').remove();
        SERVER_ADMIN = true;
        PREVIEW_MODE = false;
        IS_ADMIN = true;
        renderAdminBadge();
        await loadAndRender();
      } else {
        msg.textContent = 'Incorrect password.';
      }
    };
    document.getElementById('adminLoginSubmit').addEventListener('click', submit);
    pwInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
  }

  function bindSecretLogin() {
    const crest = document.querySelector('.crest');
    if (!crest) return;
    let clicks = 0, timer = null;
    crest.addEventListener('click', async (e) => {
      e.preventDefault();
      clicks++;
      clearTimeout(timer);
      if (clicks >= 3) {
        clicks = 0;
        if (!SERVER_ADMIN) {
          openLoginModal();
        } else if (PREVIEW_MODE) {
          PREVIEW_MODE = false;
          IS_ADMIN = true;
          renderAdminBadge();
          await loadAndRender();
        } else {
          await authFetch('/ivory/admin/logout', { method: 'POST', body: JSON.stringify({}) });
          await checkAdmin();
          if (SERVER_ADMIN) {
            PREVIEW_MODE = true;
            IS_ADMIN = false;
          }
          renderAdminBadge();
          await loadAndRender();
        }
      } else {
        timer = setTimeout(() => {
          const dest = crest.getAttribute('href');
          clicks = 0;
          if (dest) window.location.href = dest;
        }, 400);
      }
    });
  }

  async function checkAdmin() {
    try {
      const res = await authFetch('/ivory/admin/ip-auth', { method: 'POST', body: JSON.stringify({}) });
      const data = await res.json();
      SERVER_ADMIN = !!data.ok;
    } catch (e) {
      SERVER_ADMIN = false;
    }
    IS_ADMIN = SERVER_ADMIN && !PREVIEW_MODE;
  }

  (async function boot() {
    await checkAdmin();
    await loadAndRender();
    bindSecretLogin();
    renderAdminBadge();
  })();

})();
