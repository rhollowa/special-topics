// ======================================================================
// BUSI 2305 — Lectures page
// Fetches lessons from the Ivory Tower backend, renders grid + list views,
// grid/list toggle, YouTube modal player, and (for admins only) inline
// add/remove controls per week.
// ======================================================================

(function() {
  'use strict';

  const API = 'https://acc.indiafoxtrotcharlie.com';
  const API_KEY = 'c7852252558744ea5bef3c86136edbf31b5e3e556fd447454a4d37b06151b4e7';
  const COURSE = 'BUSI-2305';

  let LESSONS = [];
  let IS_ADMIN = false;

  function authFetch(url, opts = {}) {
    const isForm = opts.body instanceof FormData;
    const headers = Object.assign({ 'X-API-Key': API_KEY }, isForm ? {} : { 'Content-Type': 'application/json' }, opts.headers || {});
    return fetch(API + url, Object.assign({ credentials: 'include' }, opts, { headers }));
  }

  function youtubeIdFromUrl(url) {
    if (!url) return '';
    const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|watch\?v=))([\w-]+)/);
    return m ? m[1] : '';
  }

  function fileHref(r2Key) {
    if (!r2Key) return '#';
    if (r2Key.startsWith('/')) return r2Key; // legacy static path
    return 'https://pub-1a132fed4b804835ad984be987176147.r2.dev/' + r2Key;
  }

  function fileExt(r2Key) {
    if (!r2Key) return '';
    const m = r2Key.match(/\.([a-zA-Z0-9]+)$/);
    return m ? m[1] : '';
  }

  function groupByWeek(lessons) {
    const weeks = new Map();
    lessons.forEach(l => {
      if (!weeks.has(l.week_number)) weeks.set(l.week_number, { week_number: l.week_number, week_title: l.week_title, videos: [], files: [] });
      const w = weeks.get(l.week_number);
      if (l.asset_type === 'video') w.videos.push(l);
      else w.files.push(l);
    });
    return Array.from(weeks.values()).sort((a, b) => a.week_number - b.week_number);
  }

  function esc(s) {
    const d = document.createElement('div');
    d.textContent = s == null ? '' : String(s);
    return d.innerHTML;
  }

  function renderGrid(weeks) {
    let html = '<div class="week-table">';
    weeks.forEach(w => {
      html += `<div class="wt-label"><span class="wk">Week ${w.week_number}</span><span class="wk-title">${esc(w.week_title)}</span></div>`;
      html += '<div class="wt-videos">';
      w.videos.forEach(v => {
        const vid = youtubeIdFromUrl(v.youtube_url);
        html += `<div class="summary-card" data-video-id="${esc(vid)}" data-video-title="Week ${w.week_number} — ${esc(v.title)}" data-lesson-id="${v.id}">`
          + `<div class="summary-thumb"></div><div class="summary-card-ttl">${esc(v.title)}</div>`
          + (IS_ADMIN ? `<span class="admin-x" data-remove-lesson="${v.id}" title="Remove">×</span>` : '')
          + '</div>';
      });
      html += '</div><div class="wt-files">';
      w.files.forEach(f => {
        html += `<a href="${esc(fileHref(f.r2_key))}" download>${esc(f.title)} <span class="file-ext">.${esc(fileExt(f.r2_key))}</span>`
          + (IS_ADMIN ? `<span class="admin-x" data-remove-lesson="${f.id}" title="Remove">×</span>` : '')
          + '</a>';
      });
      if (IS_ADMIN) {
        html += `<button class="admin-add" data-add-week="${w.week_number}" data-add-week-title="${esc(w.week_title)}">+ Add to Week ${w.week_number}</button>`;
      }
      html += '</div>';
    });
    html += '</div>';
    if (IS_ADMIN) {
      html += '<button class="admin-add admin-add-week" data-add-new-week="1">+ Add New Week</button>';
    }
    return html;
  }

  function renderList(weeks) {
    let html = '<table class="lecture-table"><thead><tr><th>Name</th><th>Week</th><th>Type</th><th style="text-align:right;">Status</th></tr></thead><tbody>';
    weeks.forEach(w => {
      w.videos.forEach(v => {
        const vid = youtubeIdFromUrl(v.youtube_url);
        html += `<tr data-video-id="${esc(vid)}" data-video-title="Week ${w.week_number} — ${esc(v.title)}">`
          + `<td class="name"><svg class="icon" viewBox="0 0 16 16" fill="currentColor"><path d="M4 2h8a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1zm2 4l5 3-5 3V6z"/></svg>${esc(v.title)}</td>`
          + `<td class="wk-cell">Week ${w.week_number}</td><td class="type">Lecture</td></tr>`;
      });
      w.files.forEach(f => {
        html += `<tr><td class="name"><svg class="icon" viewBox="0 0 16 16" fill="currentColor"><path d="M3 1h7l3 3v11a1 1 0 01-1 1H3a1 1 0 01-1-1V2a1 1 0 011-1zm6 1v3h3"/></svg>${esc(f.title)}</td>`
          + `<td class="wk-cell">Week ${w.week_number}</td><td class="type excel">Excel</td></tr>`;
      });
    });
    html += '</tbody></table>';
    return html;
  }

  function bindVideoModal() {
    const modal = document.getElementById('video-modal');
    const modalFrame = document.getElementById('video-modal-frame');
    const modalClose = document.getElementById('video-modal-close');

    function openVideo(id) {
      if (!modal || !modalFrame) return;
      if (!id) { alert('Video not yet uploaded. Check back soon.'); return; }
      modalFrame.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`;
      modal.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
    function closeVideo() {
      if (!modal || !modalFrame) return;
      modalFrame.src = '';
      modal.classList.remove('open');
      document.body.style.overflow = '';
    }

    document.querySelectorAll('[data-video-id]').forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target.closest('[data-remove-lesson]')) return;
        e.preventDefault();
        openVideo(el.dataset.videoId);
      });
    });
    if (modalClose) modalClose.addEventListener('click', closeVideo);
    if (modal) modal.addEventListener('click', (e) => { if (e.target === modal) closeVideo(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal && modal.classList.contains('open')) closeVideo(); }, { once: false });
  }

  function bindViewToggle() {
    const container = document.querySelector('.lectures');
    const buttons = document.querySelectorAll('.view-toggle button');
    function setView(view) {
      if (!container) return;
      container.classList.remove('view-grid', 'view-list');
      container.classList.add('view-' + view);
      buttons.forEach(b => b.classList.toggle('active', b.dataset.view === view));
      try { localStorage.setItem('busi2305-lectures-view', view); } catch (e) {}
    }
    buttons.forEach(b => b.addEventListener('click', () => setView(b.dataset.view)));
    let saved = 'grid';
    try { saved = localStorage.getItem('busi2305-lectures-view') || 'grid'; } catch (e) {}
    setView(saved);
  }

  function bindAdminControls() {
    if (!IS_ADMIN) return;
    document.querySelectorAll('[data-remove-lesson]').forEach(el => {
      el.addEventListener('click', async (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (!confirm('Remove this item?')) return;
        const id = el.dataset.removeLesson;
        await authFetch('/ivory/admin/lessons/' + id, { method: 'DELETE' });
        await loadAndRender();
      });
    });
    document.querySelectorAll('[data-add-week]').forEach(btn => {
      btn.addEventListener('click', () => openAddModal(btn.dataset.addWeek, btn.dataset.addWeekTitle));
    });
    document.querySelectorAll('[data-add-new-week]').forEach(btn => {
      btn.addEventListener('click', () => openAddModal(null, null));
    });
  }

  function openAddModal(weekNumber, weekTitle) {
    if (document.getElementById('lessonAddModal')) return;
    const isNewWeek = weekNumber == null;
    const heading = isNewWeek ? 'Add New Week' : `Add to Week ${esc(weekNumber)}`;
    const weekFields = isNewWeek
      ? `<input type="text" id="lessonAddWeekNumber" placeholder="Week number or label (e.g. 6)" style="width:100%;padding:.5rem .65rem;border:1px solid #ccc;border-radius:4px;margin-bottom:.75rem;box-sizing:border-box;">
         <input type="text" id="lessonAddWeekTitle" placeholder="Week title (e.g. Probability)" style="width:100%;padding:.5rem .65rem;border:1px solid #ccc;border-radius:4px;margin-bottom:.75rem;box-sizing:border-box;">`
      : '';
    const html = `<div class="overlay open" id="lessonAddModal" onclick="if(event.target.id==='lessonAddModal')this.remove()">
      <div class="modal-inner" style="max-width:420px;background:#fff;border-radius:10px;padding:2rem;">
        <h3 style="margin:0 0 1rem;">${heading}</h3>
        ${weekFields}
        <input type="text" id="lessonAddTitle" placeholder="Title" style="width:100%;padding:.5rem .65rem;border:1px solid #ccc;border-radius:4px;margin-bottom:.75rem;box-sizing:border-box;">
        <input type="file" id="lessonAddFile" accept="video/*,.pptx,.xlsx,.pdf" style="width:100%;margin-bottom:.75rem;">
        <div class="msg" id="lessonAddMsg" style="min-height:1.2em;font-size:.85rem;"></div>
        <div style="display:flex;gap:.5rem;justify-content:flex-end;">
          <button onclick="document.getElementById('lessonAddModal').remove()" style="padding:.5rem 1rem;border-radius:4px;border:1px solid #ccc;background:#fff;cursor:pointer;">Cancel</button>
          <button id="lessonAddSubmit" style="padding:.5rem 1rem;border-radius:4px;border:1px solid #1a7a4a;background:#1a7a4a;color:#fff;cursor:pointer;">Add</button>
        </div>
      </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
    document.getElementById('lessonAddSubmit').addEventListener('click', () => submitAdd(weekNumber, weekTitle, isNewWeek));
  }

  async function submitAdd(weekNumber, weekTitle, isNewWeek) {
    const titleInput = document.getElementById('lessonAddTitle');
    const fileInput = document.getElementById('lessonAddFile');
    const msg = document.getElementById('lessonAddMsg');
    const title = titleInput.value.trim();
    const file = fileInput.files[0];

    if (isNewWeek) {
      const weekNumberInput = document.getElementById('lessonAddWeekNumber');
      const weekTitleInput = document.getElementById('lessonAddWeekTitle');
      weekNumber = weekNumberInput.value.trim();
      weekTitle = weekTitleInput.value.trim();
      if (!weekNumber || isNaN(Number(weekNumber))) {
        msg.textContent = 'Week number must be a number (e.g. 6). Use the title field for a custom label.';
        msg.style.color = '#c00';
        return;
      }
    }

    if (!title || !file) { msg.textContent = 'Title and file are required.'; msg.style.color = '#c00'; return; }

    const assetType = file.type.startsWith('video/') ? 'video' : 'file';
    msg.textContent = 'Uploading…'; msg.style.color = '#666';

    try {
      const presignRes = await authFetch(`/ivory/admin/lessons/presign?course=${encodeURIComponent(COURSE)}&filename=${encodeURIComponent(file.name)}`, { method: 'POST' });
      const presignData = await presignRes.json();
      if (!presignData.ok) throw new Error(presignData.error || 'Presign failed');

      const putRes = await fetch(presignData.upload_url, { method: 'PUT', headers: { 'Content-Type': file.type || 'application/octet-stream' }, body: file });
      if (!putRes.ok) throw new Error('Storage upload failed');

      const createRes = await authFetch('/ivory/admin/lessons', {
        method: 'POST',
        body: JSON.stringify({ course: COURSE, week_number: Number(weekNumber), week_title: weekTitle, title, asset_type: assetType, r2_key: presignData.r2_key }),
      });
      const createData = await createRes.json();
      if (!createData.ok) throw new Error(createData.error || 'Save failed');

      document.getElementById('lessonAddModal').remove();
      await loadAndRender();
    } catch (e) {
      msg.textContent = 'Failed: ' + e.message;
      msg.style.color = '#c00';
    }
  }

  async function loadAndRender() {
    const res = await authFetch(`/ivory/lessons?course=${encodeURIComponent(COURSE)}`, { method: 'GET' });
    const data = await res.json();
    LESSONS = data.ok ? data.lessons : [];
    const weeks = groupByWeek(LESSONS);

    const gridContainer = document.querySelector('.lectures .week-table-wrap') || document.querySelector('.lectures');
    const gridHost = document.getElementById('lessons-grid-host');
    const listHost = document.getElementById('lessons-list-host');
    if (gridHost) gridHost.innerHTML = renderGrid(weeks);
    if (listHost) listHost.innerHTML = renderList(weeks);

    const totalVideos = LESSONS.filter(l => l.asset_type === 'video').length;
    const maxWeek = weeks.length ? Math.max(...weeks.map(w => w.week_number)) : 0;
    const countEl = document.getElementById('lecture-count');
    if (countEl) countEl.textContent = `${totalVideos} video${totalVideos === 1 ? '' : 's'} available · Week ${maxWeek}`;

    bindVideoModal();
    bindAdminControls();
  }

  async function checkAdmin() {
    try {
      const res = await authFetch('/ivory/admin/ip-auth', { method: 'POST', body: JSON.stringify({}) });
      const data = await res.json();
      IS_ADMIN = !!data.ok;
    } catch (e) {
      IS_ADMIN = false;
    }
  }

  (async function boot() {
    await checkAdmin();
    await loadAndRender();
    bindViewToggle();
  })();

})();
