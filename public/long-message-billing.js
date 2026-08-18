(() => {
  if (window.__imessageLongMessageBillingLoaded) return;
  window.__imessageLongMessageBillingLoaded = true;

  const apply = () => {
    const input = document.getElementById('mainMessageContent');
    if (!input) return;

    input.removeAttribute('maxlength');

    const badge = input.closest('.form-section')?.querySelector('.message-limit-badge');
    if (badge) badge.textContent = 'No character limit';

    const sync = () => {
      const length = input.value.length;
      const counter = document.getElementById('wordsAndItemsCounter');
      const previewChars = document.getElementById('campaignPreviewCharacters');
      const previewSegments = document.getElementById('campaignPreviewSegments');

      if (counter) counter.textContent = `${length} characters · billed as 1 message per recipient`;
      if (previewChars) previewChars.textContent = `${length} characters`;
      if (previewSegments) previewSegments.textContent = length ? '1' : '0';
    };

    input.addEventListener('input', () => queueMicrotask(sync));
    sync();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', apply, { once: true });
  } else {
    apply();
  }
})();
