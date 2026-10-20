// Enlace de cobro de Bolsillo: bolsillo…/c/<id>. Se genera aquí (no es un archivo fijo) para que la vista previa
// de WhatsApp diga «Lucía te pide 23,40 €». Lo abre quien debe, tenga o no la app: ve el importe, cómo pagar
// (Bizum, PayPal con el importe ya puesto, Revolut) y avisa con «Ya te he pagado».
import { cobroPublico, euros } from "../../compartido/cobros.js";

const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const bizumBonito = (n) => n.replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3");

function pagina({ titulo, descripcion, url, cuerpo, datos }) {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(titulo)}</title>
<meta name="description" content="${esc(descripcion)}">
<meta name="robots" content="noindex">
<meta name="theme-color" content="#f2f2f7" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#000000" media="(prefers-color-scheme: dark)">
<meta property="og:type" content="website"><meta property="og:site_name" content="Bolsillo">
<meta property="og:title" content="${esc(titulo)}"><meta property="og:description" content="${esc(descripcion)}">
<meta property="og:url" content="${esc(url)}"><meta property="og:image" content="${new URL("/conoce/img/og.jpg", url).href}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/icono-192.png"><link rel="apple-touch-icon" href="/icono-180.png">
<style>
  :root { --fondo: #f2f2f7; --tarjeta: #fff; --texto: #000; --suave: #6c6c70; --linea: rgba(60,60,67,.14); --acento: #0a84ff; --verde: #248a3d; --relleno: rgba(118,118,128,.12); }
  @media (prefers-color-scheme: dark) { :root { --fondo: #000; --tarjeta: #1c1c1e; --texto: #fff; --suave: #98989f; --linea: rgba(84,84,88,.5); --verde: #30d158; --relleno: rgba(118,118,128,.24); } }
  * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  [hidden] { display: none !important; }
  body { margin: 0; background: var(--fondo); color: var(--texto); font: 17px/1.4 -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif; -webkit-font-smoothing: antialiased; }
  main { max-width: 460px; margin: 0 auto; padding: calc(20px + env(safe-area-inset-top)) 16px calc(32px + env(safe-area-inset-bottom)); }
  .marca { display: flex; align-items: center; gap: 8px; font-weight: 700; color: var(--texto); text-decoration: none; margin-bottom: 22px; }
  .marca img { width: 28px; height: 28px; border-radius: 7px; }
  .cabeza { text-align: center; margin: 10px 0 22px; }
  .cabeza p { margin: 0; color: var(--suave); font-size: 16px; }
  .importe { font-size: 52px; font-weight: 700; letter-spacing: -.03em; margin: 4px 0; font-variant-numeric: tabular-nums; }
  .tarjeta { background: var(--tarjeta); border-radius: 16px; overflow: hidden; margin-bottom: 12px; }
  .metodo { padding: 14px 16px; }
  .metodo + .metodo { border-top: .5px solid var(--linea); }
  .metodo b { display: block; font-size: 17px; }
  .metodo small { display: block; color: var(--suave); font-size: 14px; margin-top: 2px; }
  .fila { display: flex; gap: 8px; margin-top: 10px; flex-wrap: wrap; }
  button, .boton { font: inherit; border: 0; cursor: pointer; text-decoration: none; display: inline-flex; align-items: center; justify-content: center; gap: 6px; }
  .chico { background: var(--relleno); color: var(--acento); font-size: 15px; font-weight: 600; padding: 9px 14px; border-radius: 10px; flex: 1; }
  .grande { width: 100%; background: var(--acento); color: #fff; font-size: 17px; font-weight: 600; padding: 15px; border-radius: 14px; margin-top: 6px; }
  .paypal { background: #0070ba; color: #fff; }
  .estado { text-align: center; padding: 22px 16px; }
  .estado .icono { width: 56px; height: 56px; border-radius: 50%; display: grid; place-items: center; margin: 0 auto 10px; font-size: 28px; color: #fff; background: var(--verde); }
  .estado.espera .icono { background: #ff9f0a; }
  .estado b { display: block; font-size: 19px; margin-bottom: 4px; }
  .estado span { color: var(--suave); font-size: 15px; }
  .nota { color: var(--suave); font-size: 14px; margin: 8px 4px 0; }
  .metodos-pagado { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; padding: 14px 16px; }
  .metodos-pagado button { background: var(--relleno); color: var(--texto); padding: 12px 6px; border-radius: 10px; font-size: 15px; font-weight: 500; }
  .pie { text-align: center; margin-top: 28px; font-size: 14px; color: var(--suave); }
  .pie a { color: var(--acento); text-decoration: none; font-weight: 600; }
  .aviso { position: fixed; left: 50%; bottom: calc(24px + env(safe-area-inset-bottom)); transform: translateX(-50%); background: var(--texto); color: var(--fondo); padding: 10px 16px; border-radius: 999px; font-size: 15px; opacity: 0; transition: opacity .2s; pointer-events: none; white-space: nowrap; }
  .aviso.ver { opacity: 1; }
</style>
</head>
<body>
<main>
  <a class="marca" href="/conoce/"><img src="/icono-192.png" alt="">Bolsillo</a>
  ${cuerpo}
  <p class="pie">Cuentas del piso, viajes y duelos de ahorro con tus amigos.<br><a href="/conoce/#instalar">Prueba Bolsillo gratis</a></p>
</main>
<div class="aviso" id="aviso" role="status"></div>
${datos ? `<script>
(() => {
  const C = ${JSON.stringify(datos).replace(/</g, "\\u003c")};
  const aviso = (t) => { const a = document.getElementById("aviso"); a.textContent = t; a.classList.add("ver"); clearTimeout(aviso.t); aviso.t = setTimeout(() => a.classList.remove("ver"), 2200); };
  async function copiar(texto, que) {
    try { await navigator.clipboard.writeText(texto); aviso(que + " copiado"); }
    catch { const i = document.createElement("textarea"); i.value = texto; document.body.append(i); i.select(); document.execCommand("copy"); i.remove(); aviso(que + " copiado"); }
  }
  document.querySelectorAll("[data-copiar]").forEach((b) => b.addEventListener("click", () => copiar(b.dataset.copiar, b.dataset.que)));
  // «Ya te he pagado»: primero cómo, luego se avisa a quien cobra para que lo confirme
  const elegir = document.getElementById("elegir-metodo");
  document.getElementById("ya-pagado")?.addEventListener("click", () => { elegir.hidden = false; document.getElementById("ya-pagado").hidden = true; elegir.scrollIntoView({ behavior: "smooth", block: "center" }); });
  document.querySelectorAll("[data-metodo]").forEach((b) => b.addEventListener("click", async () => {
    document.querySelectorAll("[data-metodo]").forEach((x) => (x.disabled = true));
    try {
      const r = await fetch("/api/cobro/" + C.id + "/pagado", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ metodo: b.dataset.metodo }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "No se ha podido avisar");
      location.reload();
    } catch (e) { aviso(e.message === "Failed to fetch" ? "Sin conexión" : e.message); document.querySelectorAll("[data-metodo]").forEach((x) => (x.disabled = false)); }
  }));
})();
</script>` : ""}
</body>
</html>`;
}

export async function onRequestGet({ params, env, request }) {
  const url = new URL(request.url).href;
  const c = await cobroPublico(env, String(params.id || "").toUpperCase());
  const cabeceras = { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex",
    // Las funciones no reciben las cabeceras de _headers: van aquí (la página no puede cargar nada de fuera ni meterse en otra web)
    "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer", "X-Frame-Options": "DENY", "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "Content-Security-Policy": "default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'" };
  if (!c) return new Response(pagina({ titulo: "Enlace de cobro · Bolsillo", descripcion: "Este enlace de cobro no existe.", url,
    cuerpo: `<div class="tarjeta estado espera"><div class="icono">?</div><b>Este enlace no existe</b><span>Puede que esté mal copiado. Pídele a tu amigo que te lo mande otra vez.</span></div>` }), { status: 404, headers: cabeceras });

  const q = euros(c.importe), decimal = (c.importe / 100).toFixed(2), m = c.metodos;
  const metodos = [
    m.bizum && `<div class="metodo"><b>Bizum</b><small>Al ${bizumBonito(m.bizum)} · abre la app de tu banco → Bizum → Enviar, y pega el número y el importe</small>
      <div class="fila"><button class="chico" data-copiar="${m.bizum}" data-que="Número">Copiar número</button><button class="chico" data-copiar="${decimal.replace(".", ",")}" data-que="Importe">Copiar importe</button></div></div>`,
    m.paypal && `<div class="metodo"><b>PayPal</b><small>Se abre con los ${q} ya puestos</small>
      <div class="fila"><a class="boton chico paypal" href="https://paypal.me/${encodeURIComponent(m.paypal)}/${decimal}EUR" target="_blank" rel="noopener">Pagar ${q} con PayPal</a></div></div>`,
    m.revolut && `<div class="metodo"><b>Revolut</b><small>@${esc(m.revolut)} · pon el importe al abrirlo</small>
      <div class="fila"><a class="boton chico" href="https://revolut.me/${encodeURIComponent(m.revolut)}" target="_blank" rel="noopener">Abrir Revolut</a><button class="chico" data-copiar="${decimal.replace(".", ",")}" data-que="Importe">Copiar importe</button></div></div>`,
  ].filter(Boolean);

  const cabeza = `<div class="cabeza"><p>${esc(c.a)} te pide</p><div class="importe">${q}</div><p>de «${esc(c.grupo)}»</p></div>`;
  let cuerpo;
  if (c.estado === "confirmado") cuerpo = cabeza + `<div class="tarjeta estado"><div class="icono">✓</div><b>Pagado</b><span>${esc(c.a)} ha confirmado que le ha llegado. Estáis en paz.</span></div>`;
  else if (c.estado === "pagado") cuerpo = cabeza + `<div class="tarjeta estado espera"><div class="icono">…</div><b>Avisado</b><span>${esc(c.a)} tiene que confirmar que le ha llegado. Cuando lo haga, la deuda se borra sola.</span></div>`;
  else cuerpo = cabeza
    + (metodos.length ? `<div class="tarjeta">${metodos.join("")}</div>` : `<p class="nota" style="text-align:center">${esc(c.a)} no ha dicho cómo prefiere cobrar. Págale como soléis (Bizum, efectivo…) y avísale aquí.</p>`)
    + `<button class="grande" id="ya-pagado">Ya te he pagado</button>
      <div class="tarjeta" id="elegir-metodo" hidden style="margin-top:12px"><div class="metodo"><b>¿Cómo le has pagado?</b><small>${esc(c.a)} recibirá un aviso para confirmarlo.</small></div>
        <div class="metodos-pagado"><button data-metodo="bizum">Bizum</button><button data-metodo="paypal">PayPal</button><button data-metodo="revolut">Revolut</button><button data-metodo="efectivo">Efectivo</button><button data-metodo="otro">Otro</button></div></div>`;
  return new Response(pagina({ titulo: `${c.a} te pide ${q}`, descripcion: `De «${c.grupo}». ${(() => { const v = [m.bizum && "Bizum", m.paypal && "PayPal", m.revolut && "Revolut"].filter(Boolean); return v.length ? `Págalo en un momento por ${v.length > 1 ? v.slice(0, -1).join(", ") + " o " + v.at(-1) : v[0]}.` : "Págalo y avísale en un toque."; })()}`, url, cuerpo, datos: c.estado === "pendiente" ? { id: c.id } : null }), { headers: cabeceras });
}
