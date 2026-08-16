(() => {
  if (window.__imessagePortalFinalLoaded) return;
  window.__imessagePortalFinalLoaded = true;

  const PROJECT_REF = 'djzyyapkibyvunrkxwih';
  const SUPABASE_URL = 'https://djzyyapkibyvunrkxwih.supabase.co';
  const PUBLISHABLE_KEY = 'sb_publishable_fuxoNISsI68qCbOmN6Iwfw_3iuc4-Uh';
  const AUTH_KEY = `sb-${PROJECT_REF}-auth-token`;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  let identity = null;

  function safeJson(value, fallback = null) {
    try { return JSON.parse(value); } catch { return fallback; }
  }

  function session() {
    const stored = safeJson(localStorage.getItem(AUTH_KEY), null);
    if (!stored) return null;
    if (stored.access_token) return stored;
    if (stored.currentSession?.access_token) return stored.currentSession;
    return null;
  }

  function tokenPayload(token) {
    try {
      const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(decodeURIComponent(atob(part).split('').map(c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join('')));
    } catch { return {}; }
  }

  async function rest(path, options = {}) {
    const s = session();
    if (!s?.access_token) throw new Error('Your session is not ready. Please sign in again.');
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      ...options,
      headers: {
        apikey: PUBLISHABLE_KEY,
        Authorization: `Bearer ${s.access_token}`,
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `Request failed (${response.status})`);
    }
    if (response.status === 204) return null;
    const text = await response.text();
    return text ? safeJson(text, []) : null;
  }

  function makePublicId(uid) {
    const raw = String(uid || '').replace(/-/g, '').toUpperCase();
    if (!raw) return 'IMH-ACCOUNT';
    const part = raw.slice(0, 16).padEnd(16, '0');
    return `IMH-${part.slice(0,4)}-${part.slice(4,8)}-${part.slice(8,12)}-${part.slice(12,16)}`;
  }

  function setAvatar(el, name) {
    if (!el) return;
    if (el.style.backgroundImage) return;
    const initial = (String(name || 'U').match(/[A-Za-z0-9]/)?.[0] || 'U').toUpperCase();
    el.textContent = initial;
  }

  async function loadIdentity() {
    const s = session();
    if (!s?.access_token) return null;
    const payload = tokenPayload(s.access_token);
    const uid = s.user?.id || payload.sub || '';
    if (!uid) return null;

    let profile = null;
    try {
      const rows = await rest(`profiles?id=eq.${encodeURIComponent(uid)}&select=id,full_name,email&limit=1`);
      profile = Array.isArray(rows) ? rows[0] : null;
    } catch (error) {
      console.warn('Profile lookup failed:', error);
    }

    const email = profile?.email || s.user?.email || payload.email || '';
    const meta = s.user?.user_metadata || payload.user_metadata || {};
    const profileName = String(profile?.full_name || '').trim();
    const metadataName = String(meta.full_name || meta.name || '').trim();
    const fallbackName = email ? email.split('@')[0] : 'User';
    const name = profileName || metadataName || fallbackName;
    identity = { uid, email, name, publicId: makePublicId(uid) };
    return identity;
  }

  function applyIdentity(data = identity) {
    if (!data) return;
    const { name, email, publicId } = data;

    const textMap = [
      ['#welcomeName', name],
      ['#welcomeEmail', email],
      ['#headerName', publicId],
      ['#dashWelcomeId', publicId],
      ['#dropdownUserTitle', publicId],
      ['#userId', publicId],
      ['#modalUserName', name],
      ['#modalUserEmail', email],
      ['#iosProfileDisplayName', name],
      ['#iosProfileDisplayEmail', email || 'Email linked to account'],
      ['#iosProfileDisplayId', `ID ${publicId}`]
    ];
    textMap.forEach(([selector, value]) => {
      const el = $(selector);
      if (el && value) el.textContent = value;
    });

    const profileNameInput = $('#iosProfileName');
    if (profileNameInput && (!profileNameInput.value.trim() || /^(account user|user)$/i.test(profileNameInput.value.trim()))) {
      profileNameInput.value = name;
    }

    setAvatar($('#headerAvatar'), name);
    setAvatar($('#iosProfileAvatar'), name);
    setAvatar($('.ios-profile-avatar'), name);
  }

  function installVisualFixes() {
    if ($('#portalFinalStyle')) return;
    const style = document.createElement('style');
    style.id = 'portalFinalStyle';
    style.textContent = `
      /* Keep only the Apple contact mark in the phone preview. */
      #viewNewCampaign .preview-contact-avatar{display:none!important}

      .sending-history-view{display:grid;gap:16px}
      .sending-history-hero{padding:20px 22px;border:1px solid #dfe9f6;border-radius:24px;background:linear-gradient(145deg,#fff,#f5f9ff);display:flex;align-items:center;justify-content:space-between;gap:16px;box-shadow:0 12px 32px rgba(39,74,122,.07)}
      .sending-history-hero h2{margin:3px 0 5px;font-size:25px;letter-spacing:-.035em;color:#13213b}.sending-history-hero p{margin:0;color:#7d8aa0;font-size:12px}.sending-history-refresh{border:1px solid #d8e5f5;background:#fff;color:#147ef5;border-radius:14px;padding:11px 14px;font-weight:800;cursor:pointer;white-space:nowrap}
      .sending-history-list{display:grid;gap:12px}.sending-history-card{border:1px solid #e0e9f5;background:#fff;border-radius:22px;padding:18px;box-shadow:0 11px 30px rgba(37,69,111,.06)}
      .sending-history-top{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.sending-history-file{font-size:16px;font-weight:850;color:#14233e;overflow-wrap:anywhere}.sending-history-meta{margin-top:4px;color:#8a96a8;font-size:11px}.sending-history-status{padding:6px 9px;border-radius:999px;background:#eef6ff;color:#1378e8;font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:.06em}
      .sending-history-message{margin:13px 0;padding:12px 13px;background:#f7faff;border:1px solid #e6edf7;border-radius:14px;color:#42516a;font-size:12px;line-height:1.5;white-space:pre-wrap;word-break:break-word}
      .sending-history-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:0 0 12px}.sending-history-stat{background:#fbfcfe;border:1px solid #e7edf5;border-radius:12px;padding:9px 10px}.sending-history-stat span{display:block;color:#909bad;font-size:9px;font-weight:700}.sending-history-stat strong{display:block;margin-top:3px;color:#172641;font-size:12px}
      .sending-history-actions{display:flex;gap:8px;flex-wrap:wrap}.sending-history-actions button{border:1px solid #dae5f3;background:#fff;color:#246cb8;border-radius:11px;padding:8px 11px;font-size:10px;font-weight:800;cursor:pointer}.sending-history-actions button.primary{background:#147ef5;border-color:#147ef5;color:#fff}.sending-history-numbers{display:none;margin-top:11px;padding:10px 12px;max-height:180px;overflow:auto;border-radius:12px;background:#101b2f;color:#d9e8ff;font:10px/1.55 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre-wrap}.sending-history-numbers.open{display:block}
      .sending-history-empty{padding:32px 20px;text-align:center;border:1px dashed #d9e4f2;border-radius:20px;background:#fbfdff;color:#8391a6}.sending-history-loading{padding:24px;text-align:center;color:#8391a6}
      @media(max-width:560px){.sending-history-hero{padding:16px;align-items:flex-start}.sending-history-hero h2{font-size:21px}.sending-history-card{padding:14px;border-radius:18px}.sending-history-stats{grid-template-columns:1fr 1fr 1fr}.sending-history-top{gap:8px}.sending-history-file{font-size:14px}.sending-history-refresh{padding:9px 11px;font-size:11px}}
    `;
    document.head.appendChild(style);
  }

  function cleanPaymentMinimumCopy() {
    const input = $('#customTopUpAmount');
    const wrapper = input?.closest('[data-custom-topup-wrapper]') || input?.parentElement?.parentElement;
    const help = wrapper?.querySelector('.form-help');
    if (help) help.textContent = 'Minimum top-up amount: $1.00.';
  }

  function installHistoryUI() {
    if ($('#btnSendingHistory')) return;
    const accountButton = $('.platform-menu .menu-item[id="btnShowProfile"]');
    const menu = accountButton?.parentElement;
    if (!menu) return;

    const btn = document.createElement('button');
    btn.className = 'menu-item';
    btn.id = 'btnSendingHistory';
    btn.type = 'button';
    btn.innerHTML = '<span class="menu-icon">◫</span><span>User Sending History</span>';
    accountButton.insertAdjacentElement('afterend', btn);

    const area = $('.platform-content-area');
    if (!area) return;
    const section = document.createElement('section');
    section.id = 'viewSendingHistory';
    section.className = 'view-panel hidden';
    section.innerHTML = `
      <div class="breadcrumb-bar">Account / User Sending History</div>
      <div class="sending-history-view">
        <div class="sending-history-hero">
          <div><span class="eyebrow">ACCOUNT ARCHIVE</span><h2>User Sending History</h2><p>Uploaded number files and campaign messages saved to your account.</p></div>
          <button class="sending-history-refresh" id="btnRefreshSendingHistory" type="button">Refresh</button>
        </div>
        <div id="sendingHistoryList" class="sending-history-list"><div class="sending-history-loading">Loading sending history…</div></div>
      </div>`;
    area.appendChild(section);

    const openHistory = async () => {
      $$('.view-panel').forEach(panel => panel.classList.add('hidden'));
      section.classList.remove('hidden');
      $$('.platform-menu .menu-item').forEach(item => item.classList.toggle('active', item === btn));
      $('.user-dropdown-menu')?.classList.add('hidden');
      document.body.classList.remove('mobile-sidebar-open');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      await loadSendingHistory();
    };

    btn.addEventListener('click', openHistory);
    $('#btnRefreshSendingHistory')?.addEventListener('click', loadSendingHistory);
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  }

  function formatDate(value) {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString(undefined, { year:'numeric', month:'short', day:'numeric', hour:'numeric', minute:'2-digit' });
  }

  async function loadSendingHistory() {
    const list = $('#sendingHistoryList');
    if (!list) return;
    list.innerHTML = '<div class="sending-history-loading">Loading sending history…</div>';

    try {
      const campaigns = await rest('campaigns?select=id,name,sender_id,message,recipient_count,total_recipients,status,source_file_name,created_at&order=created_at.desc&limit=100');
      const messages = await rest('campaign_messages?select=campaign_id,phone,status,created_at&order=created_at.asc&limit=10000');
      const rows = Array.isArray(campaigns) ? campaigns : [];
      const msgRows = Array.isArray(messages) ? messages : [];
      const grouped = new Map();
      msgRows.forEach(item => {
        if (!grouped.has(item.campaign_id)) grouped.set(item.campaign_id, []);
        grouped.get(item.campaign_id).push(item);
      });

      if (!rows.length) {
        list.innerHTML = '<div class="sending-history-empty"><strong>No sending history yet.</strong><br>Your submitted campaigns will appear here.</div>';
        return;
      }

      list.innerHTML = rows.map((campaign, index) => {
        const items = grouped.get(campaign.id) || [];
        const phones = items.map(x => x.phone).filter(Boolean);
        const delivered = items.filter(x => x.status === 'delivered').length;
        const failed = items.filter(x => x.status === 'failed').length;
        const count = Number(campaign.total_recipients || campaign.recipient_count || phones.length || 0);
        const fileName = campaign.source_file_name || campaign.name || 'Manual numbers';
        const numberText = phones.join('\n');
        return `
          <article class="sending-history-card" data-campaign-id="${escapeHtml(campaign.id)}">
            <div class="sending-history-top">
              <div><div class="sending-history-file">${escapeHtml(fileName)}</div><div class="sending-history-meta">${escapeHtml(formatDate(campaign.created_at))} · ${escapeHtml(campaign.sender_id || 'iMessage-Direct')}</div></div>
              <span class="sending-history-status">${escapeHtml(campaign.status || 'submitted')}</span>
            </div>
            <div class="sending-history-message">${escapeHtml(campaign.message || 'No message text saved.')}</div>
            <div class="sending-history-stats">
              <div class="sending-history-stat"><span>RECIPIENTS</span><strong>${count}</strong></div>
              <div class="sending-history-stat"><span>DELIVERED</span><strong>${delivered}</strong></div>
              <div class="sending-history-stat"><span>FAILED</span><strong>${failed}</strong></div>
            </div>
            <div class="sending-history-actions">
              <button type="button" class="primary" data-history-toggle="${index}">View numbers</button>
              <button type="button" data-history-download="${index}" ${phones.length ? '' : 'disabled'}>Download data</button>
            </div>
            <pre class="sending-history-numbers" id="historyNumbers${index}">${escapeHtml(numberText || 'Numbers are not available for this record.')}</pre>
          </article>`;
      }).join('');

      rows.forEach((campaign, index) => {
        const items = grouped.get(campaign.id) || [];
        const phones = items.map(x => x.phone).filter(Boolean);
        $(`[data-history-toggle="${index}"]`)?.addEventListener('click', e => {
          const box = $(`#historyNumbers${index}`);
          if (!box) return;
          const open = box.classList.toggle('open');
          e.currentTarget.textContent = open ? 'Hide numbers' : 'View numbers';
        });
        $(`[data-history-download="${index}"]`)?.addEventListener('click', () => {
          if (!phones.length) return;
          const blob = new Blob([phones.join('\n') + '\n'], { type: 'text/plain;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          const base = String(campaign.source_file_name || campaign.name || 'sending-data').replace(/[^a-z0-9._-]+/gi, '_');
          a.download = base.toLowerCase().endsWith('.txt') ? base : `${base}.txt`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        });
      });
    } catch (error) {
      console.error('Sending history error:', error);
      list.innerHTML = `<div class="sending-history-empty"><strong>Could not load sending history.</strong><br>${escapeHtml(error.message || 'Please refresh and try again.')}</div>`;
    }
  }

  function bindProfilePersistence() {
    document.addEventListener('click', async event => {
      const save = event.target.closest('#iosSaveProfile');
      if (!save || !identity?.uid) return;
      const name = $('#iosProfileName')?.value.trim();
      if (!name) return;
      try {
        await rest(`profiles?id=eq.${encodeURIComponent(identity.uid)}`, {
          method: 'PATCH',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({ full_name: name })
        });
        identity.name = name;
        applyIdentity(identity);
      } catch (error) {
        console.warn('Profile name save failed:', error);
      }
    }, true);
  }

  function observeProfileModal() {
    const modal = $('#accountModal');
    if (!modal) return;
    const observer = new MutationObserver(() => {
      if (!modal.classList.contains('hidden')) applyIdentity();
    });
    observer.observe(modal, { attributes: true, attributeFilter: ['class'] });
  }

  async function init() {
    installVisualFixes();
    cleanPaymentMinimumCopy();
    installHistoryUI();
    bindProfilePersistence();
    observeProfileModal();

    const data = await loadIdentity();
    if (data) applyIdentity(data);

    // Dashboard creates the custom amount field during its own startup.
    setTimeout(cleanPaymentMinimumCopy, 350);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
