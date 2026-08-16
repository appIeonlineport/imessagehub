const INTRO_ID = "imh-auth-intro";

function mountIntro() {
  if (document.getElementById(INTRO_ID)) return;
  if (new URLSearchParams(window.location.search).get("recovery") === "1" || window.location.hash.includes("type=recovery")) return;

  const style = document.createElement("style");
  style.id = "imh-auth-intro-style";
  style.textContent = `
    #${INTRO_ID}{position:fixed;inset:0;z-index:99999;display:grid;place-items:center;overflow:hidden;background:
      radial-gradient(circle at 18% 18%,rgba(0,122,255,.28),transparent 34%),
      radial-gradient(circle at 82% 78%,rgba(126,87,255,.22),transparent 38%),
      linear-gradient(145deg,#020b18 0%,#07182d 52%,#081120 100%);color:#fff;font-family:Inter,-apple-system,BlinkMacSystemFont,"SF Pro Display",sans-serif;transition:opacity .48s cubic-bezier(.22,.8,.22,1),visibility .48s ease;}
    #${INTRO_ID}.imh-intro-exit{opacity:0;visibility:hidden;pointer-events:none}
    .imh-intro-stage{width:min(88vw,430px);display:flex;flex-direction:column;align-items:center;text-align:center;transform:translateY(-2vh)}
    .imh-siri-shell{position:relative;width:154px;height:154px;display:grid;place-items:center;filter:drop-shadow(0 22px 44px rgba(0,122,255,.22));animation:imh-float 2.2s ease-in-out infinite}
    .imh-siri-glow{position:absolute;inset:5px;border-radius:50%;background:conic-gradient(from 15deg,#00d9ff,#1485ff,#925cff,#ff4fbd,#34f5d0,#00d9ff);filter:blur(20px);opacity:.68;animation:imh-spin 3.2s linear infinite,imh-breathe 1.15s ease-in-out infinite alternate}
    .imh-siri-orb{position:absolute;inset:22px;border-radius:50%;background:
      radial-gradient(circle at 32% 26%,rgba(255,255,255,.94) 0 4%,rgba(255,255,255,.22) 5%,transparent 20%),
      radial-gradient(circle at 30% 72%,#20ebd2 0 8%,transparent 34%),
      radial-gradient(circle at 73% 35%,#6d55ff 0 12%,transparent 42%),
      radial-gradient(circle at 64% 76%,#ff4dae 0 8%,transparent 36%),
      radial-gradient(circle at 48% 48%,#0ca5ff 0 22%,#0867ef 45%,#171748 78%,#09142f 100%);
      box-shadow:inset 0 0 24px rgba(255,255,255,.18),0 0 40px rgba(0,174,255,.26);overflow:hidden;animation:imh-orb-pulse 1.3s ease-in-out infinite alternate}
    .imh-siri-orb::before,.imh-siri-orb::after{content:"";position:absolute;border-radius:45% 55% 52% 48%;mix-blend-mode:screen;filter:blur(4px)}
    .imh-siri-orb::before{width:88px;height:44px;left:-10px;top:46px;background:linear-gradient(90deg,transparent,#37f3db 38%,#32bfff 72%,transparent);transform:rotate(18deg);animation:imh-wave-a 1.55s ease-in-out infinite alternate}
    .imh-siri-orb::after{width:76px;height:38px;right:-6px;top:34px;background:linear-gradient(90deg,transparent,#a86aff 28%,#ff58ba 62%,transparent);transform:rotate(-24deg);animation:imh-wave-b 1.3s ease-in-out infinite alternate}
    .imh-siri-ring{position:absolute;inset:0;border-radius:50%;border:1px solid rgba(120,203,255,.24);box-shadow:0 0 0 10px rgba(20,116,255,.04),0 0 0 22px rgba(133,82,255,.025);animation:imh-ring 1.6s ease-out infinite}
    .imh-intro-copy{margin-top:30px;animation:imh-copy-in .72s .18s both cubic-bezier(.2,.8,.2,1)}
    .imh-intro-kicker{font-size:12px;font-weight:800;letter-spacing:.24em;text-transform:uppercase;color:#73c7ff;margin-bottom:10px}
    .imh-intro-title{margin:0;font-size:clamp(28px,8vw,39px);line-height:1.05;font-weight:800;letter-spacing:-.035em;text-shadow:0 8px 28px rgba(0,0,0,.3)}
    .imh-intro-sub{margin:10px 0 0;font-size:14px;color:rgba(224,236,255,.72);font-weight:500}
    .imh-intro-dots{display:flex;gap:7px;margin-top:24px}
    .imh-intro-dots span{width:6px;height:6px;border-radius:999px;background:#72cfff;box-shadow:0 0 12px #2fa8ff;animation:imh-dot 1s ease-in-out infinite}
    .imh-intro-dots span:nth-child(2){animation-delay:.14s}.imh-intro-dots span:nth-child(3){animation-delay:.28s}
    @keyframes imh-spin{to{transform:rotate(360deg)}}
    @keyframes imh-breathe{from{transform:scale(.92);opacity:.5}to{transform:scale(1.08);opacity:.85}}
    @keyframes imh-float{50%{transform:translateY(-7px)}}
    @keyframes imh-orb-pulse{from{transform:scale(.96)}to{transform:scale(1.025)}}
    @keyframes imh-wave-a{from{transform:translate(-9px,8px) rotate(10deg) scale(.9)}to{transform:translate(24px,-7px) rotate(28deg) scale(1.08)}}
    @keyframes imh-wave-b{from{transform:translate(8px,-5px) rotate(-18deg) scale(.88)}to{transform:translate(-20px,9px) rotate(-32deg) scale(1.06)}}
    @keyframes imh-ring{0%{transform:scale(.74);opacity:.65}100%{transform:scale(1.16);opacity:0}}
    @keyframes imh-copy-in{from{opacity:0;transform:translateY(14px) scale(.98)}to{opacity:1;transform:none}}
    @keyframes imh-dot{0%,100%{opacity:.3;transform:scale(.8)}50%{opacity:1;transform:scale(1.25)}}
    @media (prefers-reduced-motion:reduce){.imh-siri-shell,.imh-siri-glow,.imh-siri-orb,.imh-siri-orb::before,.imh-siri-orb::after,.imh-siri-ring,.imh-intro-dots span{animation:none!important}}
  `;
  document.head.appendChild(style);

  const overlay = document.createElement("div");
  overlay.id = INTRO_ID;
  overlay.setAttribute("aria-label", "Welcome to iMessage Hub");
  overlay.innerHTML = `
    <div class="imh-intro-stage">
      <div class="imh-siri-shell" aria-hidden="true">
        <span class="imh-siri-ring"></span>
        <span class="imh-siri-glow"></span>
        <span class="imh-siri-orb"></span>
      </div>
      <div class="imh-intro-copy">
        <div class="imh-intro-kicker">Messaging Platform</div>
        <h1 class="imh-intro-title">Welcome to iMessage Hub</h1>
        <p class="imh-intro-sub">Secure messaging workspace</p>
      </div>
      <div class="imh-intro-dots" aria-hidden="true"><span></span><span></span><span></span></div>
    </div>`;
  document.body.prepend(overlay);

  window.setTimeout(() => overlay.classList.add("imh-intro-exit"), 2050);
  window.setTimeout(() => overlay.remove(), 2600);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mountIntro, { once: true });
} else {
  mountIntro();
}
