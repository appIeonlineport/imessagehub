(() => {
  const reveal = () => {
    if (!document.body?.classList.contains("platform-body")) return;
    document.body.classList.add("imh-page-enter");
    window.setTimeout(() => document.body.classList.remove("imh-page-enter"), 1100);
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", reveal, { once: true });
  else reveal();
})();
