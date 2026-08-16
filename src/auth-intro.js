const INTRO_ID = "imh-auth-intro";

function mountIntro() {
  if (document.getElementById(INTRO_ID)) return;
  if (new URLSearchParams(window.location.search).get("recovery") === "1" || window.location.hash.includes("type=recovery")) return;

  const style = document.createElement("style");
  style.id = "imh-auth-intro-style";
  style.textContent = `
    #${INTRO_ID}{position:fixed;inset:0;z-index:99999;display:grid;place-items:center;overflow:hidden;isolation:isolate;background:#020611;color:#fff;font-family:Inter,-apple-system,BlinkMacSystemFont,"SF Pro Display",sans-serif;opacity:1;visibility:visible;transition:opacity .72s cubic-bezier(.4,0,.15,1),visibility .72s linear;contain:strict}
    #${INTRO_ID}::before{content:"";position:absolute;inset:-20%;z-index:-3;background:radial-gradient(circle at 50% 47%,#123f7c 0,rgba(7,27,58,.82) 18%,rgba(2,7,20,.96) 48%,#01030a 72%);transform:scale(.7);opacity:0;animation:imh-space-bloom 3.35s cubic-bezier(.22,.72,.2,1) both}
    #${INTRO_ID}::after{content:"";position:absolute;inset:0;z-index:5;pointer-events:none;background:linear-gradient(110deg,transparent 15%,rgba(255,255,255,.06) 46%,transparent 72%);transform:translateX(-130%);animation:imh-sheen 1.1s 1.82s cubic-bezier(.2,.7,.2,1) both}
    #${INTRO_ID}.imh-intro-exit{opacity:0;visibility:hidden;pointer-events:none}
    .imh-intro-noise{position:absolute;inset:0;z-index:-1;opacity:.055;mix-blend-mode:soft-light;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.8'/%3E%3C/svg%3E")}
    .imh-intro-stage{position:relative;width:min(92vw,580px);min-height:420px;display:grid;place-items:center;text-align:center;perspective:900px}
    .imh-siri-field{position:absolute;width:min(77vw,350px);aspect-ratio:1;display:grid;place-items:center;transform:scale(.3) rotateX(18deg);opacity:0;animation:imh-orbit-arrive 1.1s .22s cubic-bezier(.16,.84,.24,1.12) forwards}
    .imh-siri-aura{position:absolute;inset:-8%;border-radius:50%;background:conic-gradient(from 12deg,#31e7ff,#287cff 21%,#7657ff 42%,#f04bc8 62%,#ff7ab7 71%,#4ef1bd 88%,#31e7ff);filter:blur(42px);opacity:.72;animation:imh-aura 2s .3s ease-in-out infinite alternate,imh-rotate 4.4s linear infinite}
    .imh-siri-halo{position:absolute;inset:4%;border-radius:50%;border:1px solid rgba(164,222,255,.24);box-shadow:0 0 0 14px rgba(44,128,255,.035),0 0 0 34px rgba(130,82,255,.02),inset 0 0 50px rgba(61,167,255,.07);animation:imh-halo 1.7s .45s cubic-bezier(.2,.75,.2,1) infinite}
    .imh-siri-orb{position:absolute;inset:19%;border-radius:50%;overflow:hidden;background:radial-gradient(circle at 31% 25%,rgba(255,255,255,.96) 0 2%,rgba(255,255,255,.28) 3%,transparent 17%),radial-gradient(circle at 28% 74%,#1bf4ca 0 6%,transparent 34%),radial-gradient(circle at 76% 29%,#7d5bff 0 9%,transparent 39%),radial-gradient(circle at 68% 77%,#ff4ebd 0 7%,transparent 33%),radial-gradient(circle at 48% 47%,#15b8ff 0 18%,#1266ed 43%,#21194c 74%,#070d24 100%);box-shadow:inset 0 0 28px rgba(255,255,255,.2),inset -18px -24px 34px rgba(3,5,25,.44),0 0 60px rgba(21,159,255,.4);animation:imh-orb-live 1.18s ease-in-out infinite alternate}
    .imh-ribbon{position:absolute;left:-22%;top:38%;width:144%;height:24%;border-radius:50%;mix-blend-mode:screen;filter:blur(5px);opacity:.9;will-change:transform}
    .imh-ribbon-a{background:linear-gradient(90deg,transparent 2%,#38f6d6 22%,#28c9ff 46%,#6a65ff 73%,transparent 98%);transform:rotate(14deg);animation:imh-ribbon-a 1.45s ease-in-out infinite alternate}
    .imh-ribbon-b{top:48%;background:linear-gradient(90deg,transparent 4%,#4ea6ff 25%,#a75cff 54%,#ff55c7 78%,transparent 98%);transform:rotate(-17deg);animation:imh-ribbon-b 1.22s ease-in-out infinite alternate}
    .imh-ribbon-c{top:31%;height:13%;background:linear-gradient(90deg,transparent,#bcecff 28%,#ff71cc 67%,transparent);transform:rotate(31deg);filter:blur(3px);animation:imh-ribbon-c 1.7s ease-in-out infinite alternate}
    .imh-intro-copy{position:absolute;top:72%;width:100%;opacity:0;transform:translateY(18px);animation:imh-copy-in .72s 1.12s cubic-bezier(.16,.8,.2,1) forwards}
    .imh-intro-kicker{font-size:10px;font-weight:750;letter-spacing:.34em;text-transform:uppercase;color:rgba(151,218,255,.82);margin-bottom:12px}
    .imh-intro-title{margin:0;font-size:clamp(29px,7vw,45px);line-height:1.03;font-weight:720;letter-spacing:-.045em;text-shadow:0 12px 38px rgba(0,0,0,.48)}
    .imh-intro-title span{background:linear-gradient(105deg,#fff 15%,#d8efff 46%,#e6dcff 75%,#fff);background-size:200% auto;color:transparent;background-clip:text;-webkit-background-clip:text;animation:imh-text-light 1.4s 1.4s ease both}
    .imh-intro-sub{margin:11px 0 0;font-size:13px;letter-spacing:.015em;color:rgba(218,233,255,.66);font-weight:500}
    .imh-intro-line{width:0;height:1px;margin:21px auto 0;background:linear-gradient(90deg,transparent,#6fd9ff,#a975ff,transparent);box-shadow:0 0 13px #4aaeff;animation:imh-line .8s 1.68s cubic-bezier(.2,.8,.2,1) forwards}
    .imh-intro-status{margin-top:11px;font:600 9px/1.3 "Fira Code",ui-monospace,monospace;letter-spacing:.2em;text-transform:uppercase;color:rgba(157,207,255,.52);opacity:0;animation:imh-status .4s 2.02s ease forwards}
    @keyframes imh-space-bloom{0%{opacity:0;transform:scale(.65)}25%{opacity:1}78%{transform:scale(1)}100%{opacity:1;transform:scale(1.06)}}
    @keyframes imh-orbit-arrive{0%{opacity:0;transform:scale(.25) rotateX(26deg) rotate(-14deg)}65%{opacity:1}100%{opacity:1;transform:scale(1) rotateX(0) rotate(0)}}
    @keyframes imh-aura{from{transform:scale(.88);opacity:.48}to{transform:scale(1.08);opacity:.82}}
    @keyframes imh-rotate{to{rotate:360deg}}
    @keyframes imh-halo{0%{transform:scale(.58);opacity:.7}100%{transform:scale(1.14);opacity:0}}
    @keyframes imh-orb-live{from{transform:scale(.97) rotate(-1deg)}to{transform:scale(1.025) rotate(1deg)}}
    @keyframes imh-ribbon-a{from{transform:translate(-10%,8%) rotate(11deg) scale(.9)}to{transform:translate(9%,-9%) rotate(19deg) scale(1.08)}}
    @keyframes imh-ribbon-b{from{transform:translate(9%,-8%) rotate(-13deg) scale(.92)}to{transform:translate(-9%,10%) rotate(-22deg) scale(1.05)}}
    @keyframes imh-ribbon-c{from{transform:translate(-8%,5%) rotate(27deg)}to{transform:translate(12%,-7%) rotate(35deg)}}
    @keyframes imh-copy-in{to{opacity:1;transform:none}}
    @keyframes imh-text-light{from{background-position:120% center}to{background-position:-30% center}}
    @keyframes imh-line{to{width:min(58vw,250px)}}
    @keyframes imh-status{to{opacity:1}}
    @keyframes imh-sheen{to{transform:translateX(130%)}}
    @media (max-height:650px){.imh-intro-stage{min-height:350px;transform:scale(.88)}.imh-intro-copy{top:70%}}
    @media (prefers-reduced-motion:reduce){#${INTRO_ID}::before,.imh-siri-field,.imh-siri-aura,.imh-siri-halo,.imh-siri-orb,.imh-ribbon,.imh-intro-copy,.imh-intro-title span,.imh-intro-line,.imh-intro-status{animation:none!important}.imh-siri-field,.imh-intro-copy,.imh-intro-status{opacity:1;transform:none}.imh-intro-line{width:220px}}
  `;
  document.head.appendChild(style);

  const overlay = document.createElement("div");
  overlay.id = INTRO_ID;
  overlay.setAttribute("role", "status");
  overlay.setAttribute("aria-label", "Welcome to iMessage Hub");
  overlay.innerHTML = `
    <span class="imh-intro-noise" aria-hidden="true"></span>
    <div class="imh-intro-stage">
      <div class="imh-siri-field" aria-hidden="true">
        <span class="imh-siri-aura"></span><span class="imh-siri-halo"></span>
        <span class="imh-siri-orb"><i class="imh-ribbon imh-ribbon-a"></i><i class="imh-ribbon imh-ribbon-b"></i><i class="imh-ribbon imh-ribbon-c"></i></span>
      </div>
      <div class="imh-intro-copy">
        <div class="imh-intro-kicker">Private Messaging Infrastructure</div>
        <h1 class="imh-intro-title"><span>iMessage Hub</span></h1>
        <p class="imh-intro-sub">Secure. Precise. Connected.</p>
        <div class="imh-intro-line"></div>
        <div class="imh-intro-status">Initializing secure workspace</div>
      </div>
    </div>`;
  document.body.prepend(overlay);

  window.setTimeout(() => overlay.classList.add("imh-intro-exit"), 2740);
  window.setTimeout(() => overlay.remove(), 3460);
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mountIntro, { once: true });
else mountIntro();
