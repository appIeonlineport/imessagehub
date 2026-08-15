const toggle = document.querySelector('.sidebar-toggle-btn');
const sidebar = document.querySelector('.platform-sidebar');

let backdrop = document.querySelector('.mobile-sidebar-backdrop');
if (!backdrop) {
  backdrop = document.createElement('button');
  backdrop.type = 'button';
  backdrop.className = 'mobile-sidebar-backdrop';
  backdrop.setAttribute('aria-label', 'Close menu');
  document.body.appendChild(backdrop);
}

function setSidebar(open) {
  document.body.classList.toggle('mobile-sidebar-open', open);
  toggle?.setAttribute('aria-expanded', String(open));
  toggle?.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  if (toggle) toggle.textContent = open ? '×' : '☰';
}

toggle?.setAttribute('aria-expanded', 'false');

toggle?.addEventListener('click', (event) => {
  event.preventDefault();
  event.stopPropagation();
  setSidebar(!document.body.classList.contains('mobile-sidebar-open'));
});

backdrop.addEventListener('click', () => setSidebar(false));

sidebar?.addEventListener('click', (event) => {
  if (window.innerWidth <= 560 && event.target.closest('.menu-item')) {
    setSidebar(false);
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') setSidebar(false);
});

window.addEventListener('resize', () => {
  if (window.innerWidth > 560) setSidebar(false);
});
