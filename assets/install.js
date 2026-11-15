const installButton = document.getElementById("installSuite");
let installPrompt;

window.addEventListener("beforeinstallprompt", event => {
  event.preventDefault();
  installPrompt = event;
  installButton.hidden = false;
});

window.addEventListener("appinstalled", () => {
  installPrompt = undefined;
  installButton.hidden = true;
});

installButton.addEventListener("click", async () => {
  if (!installPrompt) return;
  const prompt = installPrompt;
  installPrompt = undefined;
  installButton.hidden = true;
  await prompt.prompt();
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register(new URL("../service-worker.js", import.meta.url)).catch(error => {
    console.warn("Desktop preview offline cache was not registered", error);
  });
}
