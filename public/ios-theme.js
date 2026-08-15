(() => {
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];

  function clickView(viewId) {
    const trigger = $(`[data-view="${viewId}"]`);
    if (trigger) trigger.click();
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 20);
  }

  function installBrand() {
    const center = $('.topbar-brand-center');
    if (!center || $('.ios-brand-shell', center)) return;
    center.innerHTML = `
      <div class="ios-brand-shell" aria-label="iMessage Hub">
        <img class="ios-brand-logo" src="/imessage-hub-logo.svg" alt="iMessage Hub" />
        <span class="ios-plane-orbit" aria-hidden="true"></span>
      </div>`;
  }

  function metricCard(icon, tone, label, valueId, fallback, sub, subClass = '') {
    return `<article class="ios-metric-card">
      <div class="ios-metric-icon ${tone}">${icon}</div>
      <div class="ios-metric-copy">
        <span class="ios-metric-label">${label}</span>
        <strong class="ios-metric-value" id="${valueId}">${fallback}</strong>
        <span class="ios-metric-sub ${subClass}">${sub}</span>
      </div>
    </article>`;
  }

  function installDashboardExtras() {
    const dashboard = $('#viewDashboard');
    const hero = $('.welcome-saas-banner', dashboard);
    if (!dashboard || !hero || $('.ios-dashboard-extras', dashboard)) return;

    const extras = document.createElement('section');
    extras.className = 'ios-dashboard-extras';
    extras.innerHTML = `
      <div class="ios-section-head"><h3>Overview</h3><button type="button" data-ios-action="reports">View reports →</button></div>
      <div class="ios-overview-grid">
        ${metricCard('➤', 'blue', 'Total Sent', 'iosTotalSent', '0', 'Last 7 days', 'good')}
        ${metricCard('✓', 'green', 'Delivered', 'iosDelivered', '0', 'Delivery status', 'good')}
        ${metricCard('◷', 'purple', 'Pending', 'iosPending', '0', 'In progress')}
        ${metricCard('×', 'orange', 'Failed', 'iosFailed', '0', 'Needs review', 'bad')}
      </div>
      <div class="ios-section-head"><h3>Quick Actions</h3></div>
      <div class="ios-quick-grid">
        <button class="ios-quick-card" type="button" data-action="campaign"><span class="ios-quick-icon">➤</span><span>New Campaign</span></button>
        <button class="ios-quick-card" type="button" data-action="contacts"><span class="ios-quick-icon">●</span><span>Contacts</span></button>
        <button class="ios-quick-card" type="button" data-action="reports"><span class="ios-quick-icon">▥</span><span>Reports</span></button>
        <button class="ios-quick-card" type="button" data-action="balance"><span class="ios-quick-icon">▣</span><span>Add Balance</span></button>
      </div>
      <div class="ios-section-head"><h3>Recent Campaigns</h3><button type="button" data-ios-action="outbox">View all →</button></div>
      <div class="ios-recent-list" id="iosRecentList"><div class="ios-recent-item"><div class="ios-recent-icon">➤</div><div class="ios-recent-main"><div class="ios-recent-title">No campaign activity yet</div><div class="ios-recent-meta">Your latest campaigns will appear here</div></div><span class="ios-recent-status">Ready</span></div></div>`;
    hero.insertAdjacentElement('afterend', extras);
  }

  function installBottomNav() {
    if ($('.ios-bottom-nav')) return;
    const nav = document.createElement('nav');
    nav.className = 'ios-bottom-nav';
    nav.setAttribute('aria-label', 'Mobile navigation');
    nav.innerHTML = `
      <button type="button" class="active" data-bottom-view="viewDashboard"><span class="nav-ico">⌂</span><span>Dashboard</span></button>
      <button type="button" data-bottom-view="viewNewCampaign"><span class="nav-ico">➤</span><span>Campaigns</span></button>
      <button type="button" data-bottom-view="viewOutbox"><span class="nav-ico">▱</span><span>Outbox</span></button>
      <button type="button" data-bottom-action="reports"><span class="nav-ico">▥</span><span>Reports</span></button>
      <button type="button" data-bottom-action="settings"><span class="nav-ico">⚙</span><span>Settings</span></button>`;
    document.body.appendChild(nav);
  }

  function installMiniModal() {
    if ($('#iosMiniModal')) return;
    const modal = document.createElement('div');
    modal.id = 'iosMiniModal';
    modal.className = 'ios-mini-modal';
    modal.innerHTML = `<div class="ios-mini-sheet"><h3 id="iosMiniTitle">Contacts</h3><p id="iosMiniText"></p><button type="button" class="btn-primary" id="iosMiniClose">Done</button></div>`;
    document.body.appendChild(modal);
    $('#iosMiniClose')?.addEventListener('click', () => modal.classList.remove('open'));
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('open'); });
  }

  function showMini(title, text) {
    const modal = $('#iosMiniModal');
    if (!modal) return;
    $('#iosMiniTitle').textContent = title;
    $('#iosMiniText').textContent = text;
    modal.classList.add('open');
  }

  function setActiveBottom(viewId) {
    $$('.ios-bottom-nav button').forEach((b) => b.classList.toggle('active', b.dataset.bottomView === viewId));
  }

  function bindActions() {
    document.addEventListener('click', (e) => {
      const quick = e.target.closest('.ios-quick-card');
      const headAction = e.target.closest('[data-ios-action]');
      const bottom = e.target.closest('.ios-bottom-nav button');

      if (quick) {
        const action = quick.dataset.action;
        if (action === 'campaign') clickView('viewNewCampaign');
        if (action === 'reports') { clickView('viewOutbox'); setTimeout(() => $('.outbox-summary-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 180); }
        if (action === 'balance') $('#btnDashboardTopUp')?.click() || $('#topbarBalanceBtn')?.click();
        if (action === 'contacts') showMini('Contacts', 'Contacts has been added to the new interface. Campaign recipient lists can be managed here once contact storage is connected to the backend.');
      }

      if (headAction) {
        if (headAction.dataset.iosAction === 'reports') { clickView('viewOutbox'); setTimeout(() => $('.outbox-summary-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 180); }
        if (headAction.dataset.iosAction === 'outbox') clickView('viewOutbox');
      }

      if (bottom) {
        const view = bottom.dataset.bottomView;
        const action = bottom.dataset.bottomAction;
        if (view) { clickView(view); setActiveBottom(view); }
        if (action === 'reports') { clickView('viewOutbox'); setActiveBottom(''); setTimeout(() => $('.outbox-summary-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 180); }
        if (action === 'settings') { setActiveBottom(''); $('[id="btnShowProfile"]')?.click(); }
      }

      const regularMenu = e.target.closest('[data-view]');
      if (regularMenu?.dataset.view) setActiveBottom(regularMenu.dataset.view);
    });
  }

  function cleanNumber(text) {
    const value = String(text || '').trim();
    return value || '0';
  }

  function syncMetrics() {
    const total = $('#outboxTotalCount');
    const sent = $('#outboxSentCount');
    const delivered = $('#outboxDeliveredCount');
    const failed = $('#outboxFailedCount');
    const submitted = $('#outboxSubmittedCount');
    const activity = $('#activitySevenDayTotal');

    const totalValue = cleanNumber(sent?.textContent || total?.textContent || activity?.textContent?.match(/\d+/)?.[0] || '0');
    const deliveredValue = cleanNumber(delivered?.textContent || '0');
    const failedValue = cleanNumber(failed?.textContent || '0');
    let pendingValue = cleanNumber(submitted?.textContent || '0');
    const t = parseInt(total?.textContent || '0', 10) || 0;
    const d = parseInt(delivered?.textContent || '0', 10) || 0;
    const f = parseInt(failed?.textContent || '0', 10) || 0;
    const s = parseInt(sent?.textContent || '0', 10) || 0;
    if (t > 0) pendingValue = String(Math.max(0, t - d - f - s));

    if ($('#iosTotalSent')) $('#iosTotalSent').textContent = totalValue;
    if ($('#iosDelivered')) $('#iosDelivered').textContent = deliveredValue;
    if ($('#iosFailed')) $('#iosFailed').textContent = failedValue;
    if ($('#iosPending')) $('#iosPending').textContent = pendingValue;
  }

  function syncRecent() {
    const tbody = $('#outboxRecordsTbody');
    const list = $('#iosRecentList');
    if (!tbody || !list) return;
    const rows = $$('tr', tbody).slice(0, 3);
    if (!rows.length) return;
    list.innerHTML = rows.map((row, index) => {
      const cells = $$('td', row).map((c) => c.textContent.trim());
      const date = cells[0] || 'Recent';
      const route = cells[1] || `Campaign ${index + 1}`;
      const recipients = cells[2] || '';
      const status = cells[3] || 'Submitted';
      return `<div class="ios-recent-item"><div class="ios-recent-icon">➤</div><div class="ios-recent-main"><div class="ios-recent-title">${route}</div><div class="ios-recent-meta">${recipients}${recipients ? ' recipients • ' : ''}${date}</div></div><span class="ios-recent-status">${status}</span></div>`;
    }).join('');
  }

  function observeData() {
    const watched = ['#outboxTotalCount','#outboxSubmittedCount','#outboxSentCount','#outboxDeliveredCount','#outboxFailedCount','#activitySevenDayTotal','#outboxRecordsTbody'];
    const observer = new MutationObserver(() => { syncMetrics(); syncRecent(); });
    watched.forEach((selector) => { const el = $(selector); if (el) observer.observe(el, { childList: true, subtree: true, characterData: true }); });
    syncMetrics(); syncRecent();
  }

  function polishAvatar() {
    const name = $('#welcomeName')?.textContent?.trim() || $('#headerName')?.textContent?.trim() || 'V';
    const initial = (name.match(/[A-Za-z]/)?.[0] || 'V').toUpperCase();
    if ($('#headerAvatar')) $('#headerAvatar').textContent = initial;
  }

  function init() {
    installBrand();
    installDashboardExtras();
    installBottomNav();
    installMiniModal();
    bindActions();
    observeData();
    polishAvatar();
    setTimeout(polishAvatar, 900);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
