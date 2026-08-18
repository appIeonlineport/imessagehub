(() => {
  const params = new URLSearchParams(window.location.search);
  const demoMode = params.get('demo') === '1';
  if (!demoMode) return;

  window.__IMESSAGE_DEMO_MODE__ = true;

  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input, init = {}) => {
    const url = typeof input === 'string' ? input : (input?.url || '');
    if (url.includes('/functions/v1/send-telnyx-campaign') && typeof init?.body === 'string') {
      try {
        const payload = JSON.parse(init.body);
        payload.demoMode = true;
        init = { ...init, body: JSON.stringify(payload) };
      } catch {}
    }
    return originalFetch(input, init);
  };

  const addDemoUi = () => {
    if (!document.getElementById('demoSubmissionBanner')) {
      const banner = document.createElement('div');
      banner.id = 'demoSubmissionBanner';
      banner.setAttribute('role', 'status');
      banner.style.cssText = 'position:fixed;top:10px;left:50%;transform:translateX(-50%);z-index:9999;background:#eef6ff;border:1px solid #b7d5ff;color:#174a7c;padding:8px 12px;border-radius:12px;font:600 12px/1.35 -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.12);max-width:min(92vw,620px);text-align:center';
      banner.textContent = 'DEMO MODE · Campaigns are recorded as Submitted. Provider delivery is not attempted in this demo session.';
      document.body.appendChild(banner);
    }

    const submitted = document.getElementById('outboxSubmittedCount');
    const host = submitted?.parentElement;
    if (host && !host.querySelector('.demo-submitted-note')) {
      const note = document.createElement('small');
      note.className = 'demo-submitted-note';
      note.style.cssText = 'display:block;margin-top:5px;max-width:230px;color:#667085;font-size:10px;line-height:1.35;font-weight:500';
      note.textContent = 'Submitted = accepted by the portal in Demo Mode. It is not a delivery confirmation and will not appear as Delivered.';
      host.appendChild(note);
    }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addDemoUi, { once: true });
  else addDemoUi();

  const observer = new MutationObserver(addDemoUi);
  document.addEventListener('DOMContentLoaded', () => observer.observe(document.body, { childList: true, subtree: true }), { once: true });
})();
