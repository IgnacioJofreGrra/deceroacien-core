// Simple tracker for video and content progress
// Assumes components.js exposes AppManager.getApiBase() and AuthManager.getSessionToken()
(function(){
  const HEARTBEAT_MS = 20000; // 20s
  async function getApiBase() {
    try { return (window.AppManager && AppManager.apiBase) || (await AppManager.init(), AppManager.apiBase) || '/api'; } catch { return '/api'; }
  }
  async function getToken() {
    try { return (window.AuthManager && AuthManager.getToken && AuthManager.getToken()) || null; } catch { return null; }
  }
  async function post(path, body) {
    const base = await getApiBase();
    const token = await getToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    return fetch(base.replace(/\/$/, '') + path, { method: 'POST', headers, body: JSON.stringify(body || {}) });
  }

  // Video heartbeat tracker
  function attachVideoHeartbeat(videoEl, opts = {}) {
    if (!videoEl) return () => {};
    const videoId = opts.videoId || videoEl.id || videoEl.getAttribute('data-video-id') || 'video_' + Math.random().toString(36).slice(2,8);
    let lastSent = Date.now();
    let lastTime = 0;
    let timer = null;

    async function tick(state = 'heartbeat') {
      try {
        const now = Date.now();
        const current = Math.floor(videoEl.currentTime || 0);
        const duration = Math.floor(videoEl.duration || 0);
        const delta = Math.max(0, current - lastTime);
        lastTime = current;
        lastSent = now;
        await post('/tracking/video', { video_id: videoId, delta, position: current, duration, state, visible: !videoEl.paused });
      } catch (e) { /* swallow */ }
    }

    function startTimer() {
      if (timer) return;
      timer = setInterval(() => tick('progress'), HEARTBEAT_MS);
    }
    function stopTimer() {
      if (timer) { clearInterval(timer); timer = null; }
    }

    videoEl.addEventListener('play', () => { tick('play'); startTimer(); });
    videoEl.addEventListener('pause', () => { tick('pause'); stopTimer(); });
    videoEl.addEventListener('seeked', () => { tick('seek'); });
    videoEl.addEventListener('ended', () => { tick('complete'); stopTimer(); });

    // Autostart timer if already playing
    if (!videoEl.paused) startTimer();
    return () => { stopTimer(); };
  }

  // Content tracker for non-video (articles/quizzes)
  async function trackContentDelta({ contentType='article', contentId, delta=15, completed=false } = {}) {
    if (!contentId) return;
    try {
      await post('/tracking/content', { content_type: contentType, content_id: contentId, delta, completed });
    } catch(_) {}
  }

  window.DC100Tracking = { attachVideoHeartbeat, trackContentDelta };
})();
