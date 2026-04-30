// ======================================================================
// BUSI 2305 — Lectures page
// Grid/List view toggle + YouTube modal player
// ======================================================================

(function() {
  'use strict';

  // View toggle
  const container = document.querySelector('.lectures');
  const buttons = document.querySelectorAll('.view-toggle button');

  function setView(view) {
    if (!container) return;
    container.classList.remove('view-grid', 'view-list');
    container.classList.add('view-' + view);
    buttons.forEach(b => {
      b.classList.toggle('active', b.dataset.view === view);
    });
    try { localStorage.setItem('busi2305-lectures-view', view); } catch(e) {}
  }

  buttons.forEach(b => {
    b.addEventListener('click', () => setView(b.dataset.view));
  });

  // Restore saved view or default to grid
  let saved = 'grid';
  try { saved = localStorage.getItem('busi2305-lectures-view') || 'grid'; } catch(e) {}
  setView(saved);

  // Video modal — open any element with data-video-id
  const modal = document.getElementById('video-modal');
  const modalFrame = document.getElementById('video-modal-frame');
  const modalClose = document.getElementById('video-modal-close');

  function openVideo(id, title) {
    if (!modal || !modalFrame) return;
    if (!id || id === 'PLACEHOLDER') {
      alert('Video not yet uploaded. Check back soon.');
      return;
    }
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
      e.preventDefault();
      const id = el.dataset.videoId;
      const title = el.dataset.videoTitle || '';
      openVideo(id, title);
    });
  });

  if (modalClose) modalClose.addEventListener('click', closeVideo);
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeVideo();
    });
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal && modal.classList.contains('open')) closeVideo();
  });

})();
