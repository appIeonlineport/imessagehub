import { resolve } from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, "..");

const mobileCss = String.raw`
@media(max-width:560px){
  html,body{max-width:100%;overflow-x:hidden}
  .platform-layout,.platform-main{width:100%;max-width:100%;overflow-x:hidden}
  .platform-topbar{height:64px;padding:0 12px;gap:8px}
  .topbar-left-controls{flex:0 0 auto;min-width:42px;z-index:2}
  .topbar-right-controls{flex:0 0 auto;margin-left:auto;z-index:2}
  .topbar-brand-center{position:absolute;left:50%;max-width:150px;transform:translateX(-50%);gap:6px;animation:none}
  .topbar-brand-mark{width:28px;height:28px;flex:0 0 28px}
  .topbar-brand-name{font-size:15px;overflow:hidden;text-overflow:ellipsis}
  .sidebar-toggle-btn{display:grid;place-items:center;width:40px;height:40px;padding:0;position:relative;z-index:141}
  .topbar-balance-pill{min-height:38px;padding:0 8px}
  .user-dropdown-trigger{min-height:40px;padding:0 8px}
  .user-avatar-circle{width:28px;height:28px}
  .platform-sidebar{display:flex!important;width:min(82vw,290px)!important;flex-basis:auto!important;transform:translateX(-105%);transition:transform .22s ease;z-index:140;box-shadow:20px 0 55px rgba(4,15,32,.28)}
  body.mobile-sidebar-open .platform-sidebar{transform:translateX(0)}
  .platform-brand-text,.nav-section-title,.menu-item span:not(.menu-icon),.gateway-title,.gateway-uptime{display:initial!important}
  .sidebar-brand-box{justify-content:flex-start;padding:16px 18px}
  .platform-menu{overflow-y:auto;padding-bottom:10px}
  .menu-item{width:calc(100% - 20px);justify-content:flex-start;padding:0 13px;font-size:13px}
  .menu-icon{width:18px}
  .sidebar-footer{margin-top:auto}
  body.mobile-sidebar-open::after{content:"";position:fixed;inset:0;background:rgba(4,12,25,.42);backdrop-filter:blur(2px);z-index:135}
  body.mobile-sidebar-open{overflow:hidden}
  .platform-content-area{width:100%;max-width:100%;padding:16px 12px 28px}
  .welcome-saas-banner{min-height:0;grid-template-columns:1fr;gap:18px;padding:24px 20px;border-radius:18px}
  .welcome-saas-banner h1{font-size:clamp(30px,9vw,42px);line-height:1.08;overflow-wrap:anywhere}
  .welcome-saas-banner p{font-size:14px;line-height:1.55}
  .messaging-hero-animation{width:100%;max-width:100%;height:165px;transform:none;margin:0;gap:8px;overflow:hidden}
  .portal-card{padding:16px;border-radius:15px}
  .credential-cards-grid,.stats-overview-grid,.account-info-grid,.route-options,.campaign-cost-card,.submission-summary-card{grid-template-columns:minmax(0,1fr)}
  .cred-card,.stat-box-panel{min-width:0}
  .outbox-table-wrap,.table-responsive{max-width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch}
  input,select,textarea{max-width:100%}
}
@media(max-width:390px){
  .platform-topbar{padding:0 9px}
  .topbar-brand-center{max-width:120px}
  .topbar-brand-name{font-size:14px}
  .topbar-balance-pill{padding:0 6px}
  .welcome-saas-banner{padding:21px 17px}
  .platform-content-area{padding-left:9px;padding-right:9px}
}
`;

const mobileJs = String.raw`
(() => {
  const init = () => {
    const toggle = document.querySelector('.sidebar-toggle-btn');
    const sidebar = document.querySelector('.platform-sidebar');
    if (!toggle || !sidebar) return;

    const setSidebar = (open) => {
      document.body.classList.toggle('mobile-sidebar-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      toggle.textContent = open ? '×' : '☰';
    };

    toggle.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      setSidebar(!document.body.classList.contains('mobile-sidebar-open'));
    });

    sidebar.addEventListener('click', (event) => {
      if (window.innerWidth <= 560 && event.target.closest('.menu-item')) setSidebar(false);
    });

    document.addEventListener('click', (event) => {
      if (window.innerWidth > 560) return;
      if (!document.body.classList.contains('mobile-sidebar-open')) return;
      if (sidebar.contains(event.target) || toggle.contains(event.target)) return;
      setSidebar(false);
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') setSidebar(false);
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 560) setSidebar(false);
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
`;

const mobileDashboardFixes = {
  name: "mobile-dashboard-fixes-inline",
  transformIndexHtml: {
    order: "post",
    handler(html) {
      if (!html.includes('class="platform-layout"') || !html.includes('sidebar-toggle-btn')) return html;
      return {
        html,
        tags: [
          { tag: "style", children: mobileCss, injectTo: "head" },
          { tag: "script", children: mobileJs, injectTo: "body" }
        ]
      };
    }
  }
};

export default defineConfig({
  plugins: [mobileDashboardFixes],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        dashboard: resolve(__dirname, "dashboard.html"),
        admin: resolve(__dirname, "admin.html"),
      },
    },
  },
});
