// Service worker — notifications push web (EasyCom IA)

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: "EasyCom IA", body: event.data ? event.data.text() : "" };
  }

  const title = payload.title || "EasyCom IA";
  const options = {
    body: payload.body || "",
    icon: "/easycom-ai-logo.png",
    badge: "/easycom-ai-logo.png",
    tag: payload.tag || "easycom-ia",
    data: { url: payload.url || "/dashboard/assistant" },
    requireInteraction: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/dashboard/assistant";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Si une fenêtre de l'app est déjà ouverte, on la focus et on navigue.
      for (const client of clientList) {
        if ("focus" in client) {
          client.focus();
          if ("navigate" in client) client.navigate(targetUrl);
          return;
        }
      }
      // Sinon, on ouvre une nouvelle fenêtre.
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});
