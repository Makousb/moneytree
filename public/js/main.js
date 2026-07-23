// Auto-dismiss flash messages after a few seconds.
document.querySelectorAll(".flash-success, .flash-error").forEach((flash) => {
  setTimeout(() => {
    flash.style.transition = "opacity 0.4s ease";
    flash.style.opacity = "0";
    setTimeout(() => flash.remove(), 400);
  }, 4000);
});
