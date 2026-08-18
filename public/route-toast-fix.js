(() => {
  if (window.__routeToastFixLoaded) return;
  window.__routeToastFixLoaded = true;

  const hasActiveRoute = () => {
    const radios = [...document.querySelectorAll('input[name="campaignRoute"]')];
    return radios.some((radio) => !radio.disabled && (radio.dataset.routeId || radio.checked));
  };

  const isMisleadingRouteToast = (text) => {
    const value = String(text || '').toLowerCase();
    return value.includes('routes unavailable. first recharge is compulsory') ||
      value.includes('route unavailable. first recharge is compulsory') ||
      value.includes('first recharge is compulsory to activate routes');
  };

  const clean = (root = document) => {
    if (!hasActiveRoute()) return;
    root.querySelectorAll?.('.toast-item, .toast, [role="alert"]').forEach((node) => {
      if (isMisleadingRouteToast(node.textContent)) node.remove();
    });
    const notice = document.getElementById('routeActivationNotice');
    if (notice && isMisleadingRouteToast(notice.textContent)) notice.classList.add('hidden');
  };

  const observer = new MutationObserver(() => clean(document));
  observer.observe(document.documentElement, { childList: true, subtree: true });

  const init = () => {
    clean(document);
    document.addEventListener('click', (event) => {
      if (event.target.closest('#btnSubmitCampaign, .campaign-submit-button')) {
        setTimeout(() => clean(document), 0);
        setTimeout(() => clean(document), 300);
      }
    }, true);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
