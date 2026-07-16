// ======================================================================
// BUSI 2305 — Tests page
// Fetches exams from the Ivory Tower backend, renders each as the existing
// .page/.section-head layout, and (for admins only) inline add/remove
// controls plus the same admin/preview toggle as the Lessons page.
// ======================================================================

(function() {
  'use strict';

  const API = 'https://acc.indiafoxtrotcharlie.com';
  const API_KEY = 'c7852252558744ea5bef3c86136edbf31b5e3e556fd447454a4d37b06151b4e7';
  const COURSE = 'BUSI-2305';

  let TESTS = [];
  let IS_ADMIN = false;
  let SERVER_ADMIN = false;
  let PREVIEW_MODE = false;

  function authFetch(url, opts = {}) {
    const isForm = opts.body instanceof FormData;
    const headers = Object.assign({ 'X-API-Key': API_KEY }, isForm ? {} : { 'Content-Type': 'application/json' }, opts.headers || {});
    return fetch(API + url, Object.assign({ credentials: 'include' }, opts, { headers }));
  }

  function esc(s) {
    const d = document.createElement('div');
    d.textContent = s == null ? '' : String(s);
    return d.innerHTML;
  }

  function fileHref(r2Key) {
    if (!r2Key) return '#';
    if (r2Key.startsWith('/')) return r2Key;
    return 'https://pub-1a132fed4b804835ad984be987176147.r2.dev/' + r2Key;
  }

  function fileExt(r2Key) {
    if (!r2Key) return '';
    const m = r2Key.match(/\.([a-zA-Z0-9]+)$/);
    return m ? m[1] : '';
  }

  function fileLabel(title, ext) {
    return `${title} — ${ext ? ext.toUpperCase() : 'File'}`;
  }

  function formatDue(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d)) return '';
    const opts = { weekday: 'long', month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit' };
    return 'Due ' + d.toLocaleString('en-US', opts);
  }

  function renderTests() {
    let html = '';
    TESTS.forEach(t => {
      html += `<section class="page" data-test-id="${t.id}">
        <div class="section-head">
          <div class="num">${esc(formatDue(t.due_date))}</div>
          <h2>${esc(t.title)}</h2>
          ${t.sub ? `<p class="sub">${esc(t.sub)}</p>` : ''}
        </div>`;
      if (t.r2_key) {
        html += `<p style="margin: 0 0 1.25rem;">
          <a href="${esc(fileHref(t.r2_key))}" download>${esc(fileLabel(t.title, fileExt(t.r2_key)))} <span class="file-ext">.${esc(fileExt(t.r2_key))}</span></a>
          ${IS_ADMIN ? `<span class="admin-x" data-remove-test="${t.id}" title="Remove">×</span>` : ''}
        </p>`;
      }
      html += `<button class="submit-btn" onclick="openModal('${esc(t.title).replace(/'/g, "\\'")}', '${esc(t.exam_key)}')">Submit ${esc(t.title)}</button>`;
      html += '</section>';
    });
    return html;
  }

  function renderAddButton() {
    if (!IS_ADMIN) return '';
    return '<div style="padding:1.5rem 0;"><button class="admin-add" data-add-test="1">+ Add Test</button></div>';
  }

  async function loadAndRender() {
    const res = await authFetch(`/ivory/tests?course=${encodeURIComponent(COURSE)}`, { method: 'GET' });
    const data = await res.json();
    TESTS = data.ok ? data.tests : [];

    const host = document.getElementById('tests-host');
    const addHost = document.getElementById('tests-add-host');
    if (host) host.innerHTML = renderTests();
    if (addHost) addHost.innerHTML = renderAddButton();

    bindAdminControls();
  }

  function bindAdminControls() {
    if (!IS_ADMIN) return;
    document.querySelectorAll('[data-remove-test]').forEach(el => {
      el.addEventListener('click', async (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (!confirm('Remove this test?')) return;
        const id = el.dataset.removeTest;
        await authFetch('/ivory/admin/tests/' + id, { method: 'DELETE' });
        await loadAndRender();
      });
    });
    document.querySelectorAll('[data-add-test]').forEach(btn => {
      btn.addEventListener('click', openAddModal);
    });
  }

  function openAddModal() {
    if (document.getElementById('testAddModal')) return;
    const html = `<div class="overlay open" id="testAddModal" onclick="if(event.target.id==='testAddModal')this.remove()">
      <div class="modal-inner">
        <h3 style="margin:0 0 1rem;">Add Test</h3>
        <input type="text" id="testAddTitle" placeholder="Title (e.g. Final Exam)" style="width:100%;padding:.5rem .65rem;border:1px solid #ccc;border-radius:4px;margin-bottom:.75rem;box-sizing:border-box;">
        <input type="text" id="testAddSub" placeholder="Description (optional)" style="width:100%;padding:.5rem .65rem;border:1px solid #ccc;border-radius:4px;margin-bottom:.75rem;box-sizing:border-box;">
        <input type="datetime-local" id="testAddDue" style="width:100%;padding:.5rem .65rem;border:1px solid #ccc;border-radius:4px;margin-bottom:.75rem;box-sizing:border-box;">
        <input type="file" id="testAddFile" accept=".xlsx,.xls,.csv,.pdf" style="width:100%;margin-bottom:.75rem;">
        <div class="msg" id="testAddMsg" style="min-height:1.2em;font-size:.85rem;color:#c00;"></div>
        <div style="display:flex;gap:.5rem;justify-content:flex-end;">
          <button onclick="document.getElementById('testAddModal').remove()" style="padding:.5rem 1rem;border-radius:4px;border:1px solid #ccc;background:#fff;cursor:pointer;">Cancel</button>
          <button id="testAddSubmit" style="padding:.5rem 1rem;border-radius:4px;border:1px solid #1a7a4a;background:#1a7a4a;color:#fff;cursor:pointer;">Add</button>
        </div>
      </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
    document.getElementById('testAddSubmit').addEventListener('click', submitAdd);
  }

  function slugify(s) {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'exam';
  }

  async function submitAdd() {
    const titleInput = document.getElementById('testAddTitle');
    const subInput = document.getElementById('testAddSub');
    const dueInput = document.getElementById('testAddDue');
    const fileInput = document.getElementById('testAddFile');
    const msg = document.getElementById('testAddMsg');
    const title = titleInput.value.trim();
    const file = fileInput.files[0];

    if (!title) { msg.textContent = 'Title is required.'; return; }

    msg.style.color = '#666';
    msg.textContent = file ? 'Uploading…' : 'Saving…';

    try {
      let r2Key = null;
      if (file) {
        const presignRes = await authFetch(`/ivory/admin/tests/presign?course=${encodeURIComponent(COURSE)}&filename=${encodeURIComponent(file.name)}`, { method: 'POST' });
        const presignData = await presignRes.json();
        if (!presignData.ok) throw new Error(presignData.error || 'Presign failed');

        const putRes = await fetch(presignData.upload_url, { method: 'PUT', headers: { 'Content-Type': file.type || 'application/octet-stream' }, body: file });
        if (!putRes.ok) throw new Error('Storage upload failed');
        r2Key = presignData.r2_key;
      }

      const createRes = await authFetch('/ivory/admin/tests', {
        method: 'POST',
        body: JSON.stringify({
          course: COURSE,
          title,
          sub: subInput.value.trim() || null,
          due_date: dueInput.value ? new Date(dueInput.value).toISOString() : null,
          r2_key: r2Key,
          exam_key: slugify(title),
        }),
      });
      const createData = await createRes.json();
      if (!createData.ok) throw new Error(createData.error || 'Save failed');

      document.getElementById('testAddModal').remove();
      await loadAndRender();
    } catch (e) {
      msg.style.color = '#c00';
      msg.textContent = 'Failed: ' + e.message;
    }
  }

  function renderAdminBadge() {
    const crest = document.querySelector('.crest');
    if (!crest) return;
    let label = document.getElementById('adminModeLabel');
    const showingAdmin = SERVER_ADMIN && !PREVIEW_MODE;
    if (!showingAdmin) {
      if (label) label.remove();
      return;
    }
    if (!label) {
      label = document.createElement('div');
      label.id = 'adminModeLabel';
      label.style.cssText = 'font-family:var(--mono, monospace);font-size:11px;font-weight:600;color:var(--accent);letter-spacing:0.03em;margin-top:2px;';
      crest.insertAdjacentElement('afterend', label);
    }
    label.textContent = 'Professor Holloway';
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
