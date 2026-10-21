// Bolsillo funciona sin conexión: primero se sirve lo guardado y por detrás se actualiza para la próxima vez
const CACHE = "bolsillo-v64"; // súbelo en cada cambio de la app
const ARCHIVOS = ["./", "index.html", "iconos.js", "extras.js", "fijos.js", "manifest.webmanifest", "icono-180.png", "icono-192.png", "icono-512.png"];

// cache: "reload" → la versión nueva se baja del servidor, no de la caché del navegador
self.addEventListener("install", (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARCHIVOS.map((u) => new Request(u, { cache: "reload" }))))); self.skipWaiting(); });
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
// Avisos (push): renovaciones, racha, tu mes listo
self.addEventListener("push", (e) => {
  let m = {};
  try { m = e.data.json(); } catch { m = { titulo: "Bolsillo", cuerpo: e.data?.text() || "" }; }
  e.waitUntil(self.registration.showNotification(m.titulo || "Bolsillo", { body: m.cuerpo || "", icon: "icono-192.png", badge: "icono-192.png", tag: m.etiqueta || "bolsillo", data: { url: m.url || "./" } }));
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((ventanas) => {
    const abierta = ventanas.find((v) => new URL(v.url).origin === location.origin), url = e.notification.data?.url || "./";
    if (!abierta) return self.clients.openWindow(url);
    // Avisos que llevan a un sitio concreto (un cobro): si la app ya está abierta, se lleva allí
    return url === "./" || !abierta.navigate ? abierta.focus() : abierta.focus().then(() => abierta.navigate(url));
  }));
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin || url.pathname.startsWith("/api/") || url.pathname.endsWith("novedades.json")) return; // la API y las novedades, siempre frescas
  if (/^\/(conoce|novedades|privacidad|aviso-legal|c)(\/|$)/.test(url.pathname)) return; // la web y los enlaces de cobro no son la app: siempre lo último
  e.respondWith(caches.open(CACHE).then(async (c) => {
    const guardado = await c.match(e.request, { ignoreSearch: true });
    // Solo se guarda lo que es de verdad de la app: respuesta buena, del propio sitio y sin redirecciones
    const red = fetch(e.request).then((r) => { if (r.ok && r.type === "basic" && !r.redirected) c.put(e.request, r.clone()); return r; }).catch(() => guardado);
    return guardado || red;
  }));
});
