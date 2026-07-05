/* ═══════════ Studio core — shared across all chapter studios ═══════════ */

/* ───────── navigation ─────────
   Each chapter script registers per-screen init hooks on window.SCREEN_INIT:
   window.SCREEN_INIT = { screenId: () => { ... }, ... };                    */
function go(id){
  const el = document.getElementById(id);
  if(!el) return;
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  el.classList.add('active');
  window.scrollTo({top:0, behavior:'smooth'});
  const init = (window.SCREEN_INIT || {})[id];
  if(init) init();
}

/* ───────── fullscreen ───────── */
const FS_EXPAND='<path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/>';
const FS_COMPRESS='<path d="M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3M16 21v-3a2 2 0 0 1 2-2h3"/>';
function toggleFS(){
  if(!document.fullscreenElement){
    (document.documentElement.requestFullscreen||document.documentElement.webkitRequestFullscreen||function(){}).call(document.documentElement);
  } else {
    (document.exitFullscreen||document.webkitExitFullscreen||function(){}).call(document);
  }
}
function updateFSIcon(){
  const icon=document.getElementById('fsIcon');
  if(!icon) return;
  icon.innerHTML=document.fullscreenElement?FS_COMPRESS:FS_EXPAND;
}
document.addEventListener('fullscreenchange',updateFSIcon);
document.addEventListener('webkitfullscreenchange',updateFSIcon);
