/* admin-crest.js — shared triple-click hook for the crest element.
 *
 * Loaded on every student-facing page via:
 *     <script src="/admin-crest.js" defer></script>
 *
 * Behavior:
 *   - Single/double click on .crest follows its href normally.
 *   - Triple-click within 400ms jumps to ADMIN_URL.
 *
 * To change where the secret door goes, edit ADMIN_URL once here.
 */
const ADMIN_URL = '/admin/';

(function(){
  var clicks = 0, t = null;
  var el = document.querySelector('.crest');
  if (!el) return;
  el.addEventListener('click', function(e){
    e.preventDefault();
    clicks++;
    clearTimeout(t);
    if (clicks >= 3) {
      clicks = 0;
      window.location.href = ADMIN_URL;
    } else {
      t = setTimeout(function(){
        var dest = el.getAttribute('href');
        clicks = 0;
        if (dest) window.location.href = dest;
      }, 400);
    }
  });
})();
