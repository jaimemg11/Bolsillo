// Genera la landing de Bolsillo y sus páginas legales en public/ a partir de datos.mjs: node landing/build.mjs
// Sin dependencias: HTML estático con los iconos Phosphor en línea y el JSON-LD escrito en el propio HTML.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { instalar, sitio, seo, capturas, faq, versiones, enCamino, cartel } from "./datos.mjs";
import { IDEAS } from "../compartido/ideas.js";

const AQUI = path.dirname(fileURLToPath(import.meta.url)), PUBLIC = path.join(AQUI, "..", "public");
const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const icono = (n) => fs.readFileSync(path.join(AQUI, "iconos", n + ".svg"), "utf8").replace("<svg ", '<svg class="icono" aria-hidden="true" ');
// El mismo estilo que la app: icono relleno en blanco sobre un cuadrado de color sólido
const azulejo = (n, color, clase = "") => `<span class="azulejo ${clase}" style="--c:${color}">${fs.readFileSync(path.join(AQUI, "iconos", "relleno", n + ".svg"), "utf8").replace("<svg ", '<svg class="icono" aria-hidden="true" ')}</span>`;
const escribir = (ruta, html) => { fs.mkdirSync(path.dirname(path.join(PUBLIC, ruta)), { recursive: true }); fs.writeFileSync(path.join(PUBLIC, ruta), html); console.log("✓", ruta); };

// ---------- Piezas comunes ----------
const cabeza = ({ titulo, descripcion, url, indexar = true, extra = "" }) => `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(titulo)}</title>
<meta name="description" content="${esc(descripcion)}">
${indexar ? `<link rel="canonical" href="${url}">` : '<meta name="robots" content="noindex">'}
<meta name="theme-color" content="#ffffff">
<link rel="icon" href="/icono-192.png">
<link rel="apple-touch-icon" href="/icono-180.png">
<meta property="og:type" content="website">
<meta property="og:locale" content="es_ES">
<meta property="og:site_name" content="Bolsillo">
<meta property="og:title" content="${esc(titulo)}">
<meta property="og:description" content="${esc(descripcion)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${sitio.urlLanding}img/og.jpg">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${sitio.urlLanding}img/og.jpg">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Unbounded:wght@800&family=Onest:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/conoce/estilos.css">
${extra}</head>`;

// Barra de arriba: el nombre a la izquierda, tres enlaces y «Abrir app» a la derecha (en el móvil, solo el nombre y el botón)
const enlacesNav = [["/conoce/#funciones", "Qué hace"], ["/conoce/#preguntas", "Preguntas"], ["/conoce/#instalar", "Instalar"]];
const nav = () => `<a class="saltar" href="#contenido">Saltar al contenido</a>
<header class="nav-caja">
  <nav class="nav" aria-label="Principal">
    <a class="nav__marca" href="/conoce/"><img src="/icono-192.png" alt="" width="28" height="28"><span>Bolsillo</span></a>
    <ul class="nav__enlaces" role="list">${enlacesNav.map(([h, t]) => `<li><a class="nav__enlace" href="${h}" data-espia="${h.split("#")[1]}">${t}</a></li>`).join("")}</ul>
    <a class="nav__abrir" href="${sitio.urlApp}">${sitio.ctaCorto}</a>
  </nav>
</header>`;

// El pie es una despedida: el correo en grande, para escribir con una idea o un fallo
const [usuarioCorreo, dominioCorreo] = sitio.email.split("@");
const pie = () => `<footer class="pie">
  <div class="contenedor pie__dentro">
    <div class="pie__arriba"><p><b>Bolsillo</b> · La app de gastos para estudiantes. Hecha en ${esc(sitio.ciudad)}.</p><a class="pie__subir" href="#contenido">Volver arriba</a></div>
    <div class="pie__contacto"><p>¿Una idea o un fallo? Escríbeme:</p><a class="pie__correo" href="mailto:${sitio.email}"><span>${esc(usuarioCorreo)}</span><span>@${esc(dominioCorreo)}</span></a></div>
    <div class="pie__meta">
      <ul role="list" class="pie__enlaces"><li><a href="${sitio.urlApp}">Abrir la app</a></li><li><a href="/novedades/">Novedades</a></li><li><a href="https://github.com/jaimemg11/Bolsillo" rel="noopener">Código</a></li><li><a href="/privacidad/">Privacidad</a></li><li><a href="/aviso-legal/">Aviso legal</a></li></ul>
      <p class="pie__nota">Apple Pay es una marca de Apple Inc. y Google Wallet, de Google LLC. Bolsillo no está afiliado a ellas.</p>
      <p class="pie__lugar">${esc(sitio.ciudad)}, ${new Date().getFullYear()}</p>
    </div>
  </div>
</footer>`;

// Marco de iPhone: biselado, botones laterales e isla dinámica; la captura ya trae la barra de estado
const telefono = (img, alt, carga = "lazy") => `<div class="telefono"><div class="telefono__marco"><span class="telefono__isla" aria-hidden="true"></span><img src="/conoce/img/${img}" alt="${esc(alt)}" width="1170" height="2532" loading="${carga}" decoding="async"></div></div>`;

// ---------- Landing «cartel»: la vida de un estudiante, en carteles de colores (dirección «Loud and flat» de taste-skill) ----------
// Lo que se pregunta en la landing (y lo que se le dice a Google que se pregunta): las de cartel.preguntas, en ese orden
const preguntas = cartel.preguntas.map((p) => faq.find((f) => f.p === p)).filter(Boolean);
const jsonLd = [
  { "@context": "https://schema.org", "@type": "SoftwareApplication", name: "Bolsillo", applicationCategory: "FinanceApplication", operatingSystem: "iOS, Android, Web",
    description: seo.descripcion, url: sitio.urlLanding, inLanguage: "es", offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" } },
  { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: preguntas.map((f) => ({ "@type": "Question", name: f.p, acceptedAnswer: { "@type": "Answer", text: f.r } })) },
].map((o) => `<script type="application/ld+json">${JSON.stringify(o)}</script>`).join("\n");
const lineas = (l) => l.map((x) => `<span>${esc(x)}</span>`).join("");
// Letra negra o blanca sobre un color, la que se lea mejor
const tinta = (h) => { const l = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4)).reduce((t, v, i) => t + v * [.2126, .7152, .0722][i], 0); return (l + .05) / .05 >= 1.05 / (l + .05) ? "#000" : "#fff"; };
const { tablero, interruptores, campos, autor, final } = cartel;

const landing = `${cabeza({ titulo: seo.titulo, descripcion: seo.descripcion, url: sitio.urlLanding, extra: jsonLd + '\n<link rel="manifest" href="/manifest.webmanifest">\n<link rel="stylesheet" href="/conoce/cartel.css">\n' })}
<body class="cartel">
${nav()}
<main id="contenido">
  <section class="c-hero" aria-labelledby="titular">
    <div class="c-hero__campo">
      <h1 class="c-hero__titular" id="titular">${lineas(cartel.titular)}</h1>
      <figure class="c-hero__foto"><img src="/conoce/img/mes.webp" alt="${esc(capturas[0].alt)}" width="1170" height="2532" fetchpriority="high" decoding="async"></figure>
    </div>
    <div class="c-hero__banda">
      <p class="c-hero__sub">${esc(cartel.sub)}</p>
      <a class="c-boton" href="${sitio.urlApp}">${sitio.cta}${icono("arrow-right")}</a>
    </div>
  </section>

  <section class="c-tablero" id="tu-mes" aria-labelledby="t-tablero">
    <div class="c-marco"><h2 class="c-titulo aparece" id="t-tablero">${esc(tablero.titulo)}</h2></div>
    <ul class="c-filas" role="list" data-ui>${tablero.filas.map((f, i) => `
      <li class="aparece" style="--i:${i}"><button type="button" class="c-fila" aria-expanded="${i === tablero.abierta}" style="--cat:${f.color};--cat-tinta:${tinta(f.color)}">
        <span class="c-fila__nombre">${esc(f.nombre)}</span><span class="c-fila__nota">${esc(f.nota)}</span><span class="c-fila__cuando">${esc(f.cuando)}</span>
        <span class="c-fila__importe num">${esc(f.importe)}</span><span class="c-fila__cat">${esc(f.cat)}</span><span class="c-fila__detalle">${esc(f.detalle)}</span></button></li>`).join("")}
    </ul>
  </section>

  <section class="c-interruptores" id="funciones" aria-labelledby="t-funciones">
    <div class="c-marco"><h2 class="c-titulo aparece" id="t-funciones">${esc(interruptores.titulo)}</h2></div>
    ${interruptores.bandas.map((b, i) => `<div class="c-banda aparece${b.encendido ? " encendida" : ""}" style="--c:${b.color}">
      <div class="c-marco c-banda__dentro"><p class="c-banda__frase" id="banda-${i}">${esc(b.frase)}</p>
        <button type="button" class="c-switch" role="switch" aria-checked="${b.encendido}" aria-labelledby="banda-${i}" data-ui><span></span></button>
        <p class="c-banda__consecuencia" aria-live="polite">${esc(b.consecuencia)}</p></div></div>`).join("")}
  </section>

  <section class="c-campos" id="como-funciona" aria-labelledby="t-campos">
    ${campos.pasos.map((p, i) => `<div class="c-campo${p.color === "#000000" ? " c-campo--oscuro" : ""}" style="--c:${p.color}">
      ${i === 0 ? `<h2 class="c-titulo" id="t-campos">${esc(campos.titulo)}</h2>` : ""}
      <div class="c-campo__foto aparece"><img src="/conoce/img/${p.img}" alt="${esc(p.alt)}" width="1170" height="2532" loading="lazy" decoding="async"></div>
      <p class="c-campo__texto aparece">${esc(p.texto)}</p></div>`).join("")}
  </section>

  <section class="c-preguntas" id="preguntas" aria-labelledby="t-faq">
    <div class="c-marco c-preguntas__rejilla">
      <h2 class="c-titulo c-preguntas__titulo" id="t-faq">Preguntas</h2>
      <div class="c-acordeon">${preguntas.map((f, i) => `<details class="c-tile aparece" style="--i:${i}" name="preguntas"${i === 0 ? " open" : ""}><summary>${esc(f.p)}<span class="c-mas" aria-hidden="true"></span></summary><p>${esc(f.r)}</p></details>`).join("")}</div>
    </div>
  </section>

  <section class="c-autor" id="autor" aria-labelledby="t-autor">
    <div class="c-marco c-autor__rejilla">
      <div class="c-autor__texto aparece"><h2 class="c-titulo" id="t-autor">${esc(autor.titulo)}</h2><p>${esc(autor.texto)}</p></div>
      <a class="c-autor__codigo aparece" href="https://github.com/jaimemg11/Bolsillo" rel="noopener">${icono("github-logo")}<b>El código de Bolsillo</b><span>github.com/jaimemg11/Bolsillo</span></a>
    </div>
  </section>

  <section class="c-final" id="instalar" aria-labelledby="t-final">
    <div class="c-marco c-final__rejilla">
      <div class="c-final__texto aparece"><h2 class="c-final__titular" id="t-final">${lineas(final.titulo)}</h2><p>${esc(final.texto)}</p></div>
      <div class="c-dialogo" data-ui role="group" aria-labelledby="t-dialogo">
        <b class="c-dialogo__titulo" id="t-dialogo">¿Con qué móvil vas?</b>
        <div class="c-segmento" role="tablist" aria-label="Tu móvil">${instalar.sistemas.map((s, i) => `<button type="button" role="tab" id="tab-${s.id}" data-so="${s.id}" aria-selected="${i === 0}" aria-controls="so-${s.id}">${esc(s.nombre)}</button>`).join("")}</div>
        ${instalar.sistemas.map((s, i) => `<div class="c-dialogo__so" id="so-${s.id}" role="tabpanel" aria-labelledby="tab-${s.id}"${i ? " hidden" : ""}>
          <ol>${s.pasos.map((p) => `<li>${p.texto}</li>`).join("")}</ol>
          <button type="button" class="c-boton c-boton--ancho" data-instalar="${s.id}">${icono("download-simple")}${esc(s.boton)}</button>
          <p class="c-dialogo__ayuda" data-ayuda="${s.id}" hidden></p>
          <p class="c-dialogo__nota">${esc(s.nota)}</p></div>`).join("")}
      </div>
    </div>
  </section>
</main>
${pie()}
<script src="/conoce/landing.js" defer></script>
</body>
</html>`;
escribir("conoce/index.html", landing);

// ---------- Páginas legales ----------
const legal = (ruta, titulo, descripcion, cuerpo) => escribir(ruta, `${cabeza({ titulo: `${titulo} · Bolsillo`, descripcion, url: sitio.urlLanding.replace("conoce/", ruta.replace("index.html", "")) })}
<body>
${nav()}
<main id="contenido" class="legal">
  <div class="contenedor estrecho">
    <a class="volver" href="/conoce/">${icono("arrow-left")}Volver</a>
    <h1>${esc(titulo)}</h1>
    <p class="legal__fecha">Última actualización: ${sitio.actualizado}</p>
    ${cuerpo}
  </div>
</main>
${pie()}
<script src="/conoce/landing.js" defer></script>
</body>
</html>`);

legal("privacidad/index.html", "Política de privacidad", "Qué datos guarda Bolsillo, para qué, dónde y cómo borrarlos.", `
<p>Bolsillo está pensada para saber lo mínimo de ti. No pedimos email, nombre ni teléfono, no tenemos publicidad y no vendemos ni cedemos datos a nadie. Aquí tienes, en claro, qué se guarda y por qué.</p>

<h2>Responsable</h2>
<p>${esc(sitio.titular)}. Contacto: ${esc(sitio.email)}.</p>

<h2>Qué datos se guardan</h2>
<h3>En tu móvil</h3>
<p>Tus movimientos, tu presupuesto y tus ajustes se guardan en el almacenamiento del navegador de tu dispositivo. No salen de él si no creas tu nube.</p>
<h3>Si creas tu nube</h3>
<ul>
  <li><b>Tus movimientos:</b> importe, tipo, categoría, nota, fecha y si se apuntaron a mano, al pagar (Apple Pay o Google Wallet) o con la voz.</li>
  <li><b>Tus ajustes:</b> presupuesto, día de cobro, huchas, retos e insignias.</li>
  <li><b>Tu clave:</b> no la guardamos. Solo guardamos una huella cifrada (SHA-256) que permite reconocerla sin poder recuperarla.</li>
  <li><b>Fechas técnicas:</b> cuándo se creó tu nube y el último día que se usó.</li>
</ul>
<h3>Si usas grupos</h3>
<p>El nombre del grupo, los nombres que pongáis a cada persona y los gastos del grupo. Los ven todos los miembros del grupo.</p>
<h3>Si entras en un círculo (modo tóxico)</h3>
<p>Solo si te unes a un círculo con su código. Las personas de ese círculo ven lo que permite el nivel que tú eliges: el total del mes y por categorías (Light), además cada gasto con su importe, categoría y tienda de Apple Pay pero sin tus notas (Medio), o todo, notas incluidas (Tóxico total). También ven tus reacciones. Nunca ven tus ingresos ni tu presupuesto, y no ven los gastos que marques como ocultos. Si te sales, dejan de verlo al momento y se borran tus reacciones.</p>
<h3>Si cobras o pagas deudas de un grupo</h3>
<p>Si pones cómo quieres que te paguen, se guardan tu número de Bizum y tus usuarios de PayPal.me y Revolut. Solo los ve quien abre un enlace de cobro tuyo, y puedes cambiarlos o borrarlos cuando quieras (Amigos → tu grupo → Cómo me pagan). De cada cobro se guardan el importe, quién le debe a quién dentro del grupo, si se ha pagado y cómo (Bizum, PayPal, efectivo…), y cuándo se avisó. Bolsillo no mueve dinero ni ve tus cuentas: el pago lo haces tú en tu banco, PayPal o Revolut.</p>
<h3>Si conectas Apple Pay, Google Wallet o Siri</h3>
<p>El atajo de tu iPhone envía el importe y el nombre del comercio de cada pago, o la frase que dices. En Android, MacroDroid envía el título y el texto de la notificación de pago que tú eliges (de Google Wallet o de tu banco); las que no son pagos se descartan sin guardarse. Bolsillo nunca accede a tu banco ni a tu tarjeta.</p>
<h3>Si activas los avisos</h3>
<p>La dirección de suscripción que da tu navegador (Apple o Google) para hacerte llegar los avisos. Puedes desactivarlos en Ajustes.</p>
<h3>Seguridad y abusos</h3>
<p>Al crear una nube se guarda durante unas horas una huella cifrada de tu dirección IP, solo para limitar cuántas nubes se crean seguidas. Si alguien usa una clave incorrecta, se guarda un registro técnico del último intento (sin la clave y sin la IP) para poder ayudar con los atajos.</p>

<h2>Para qué y con qué base</h2>
<p>Para darte el servicio que pides: guardar y sincronizar tus gastos, los grupos y los avisos (artículo 6.1.b del RGPD). La protección contra abusos se basa en el interés legítimo de mantener el servicio seguro (artículo 6.1.f).</p>

<h2>Dónde se guardan y quién los trata</h2>
<p>En Cloudflare (Cloudflare, Inc.), que aloja la app y la base de datos como encargado del tratamiento. Cloudflare puede tratar datos fuera del Espacio Económico Europeo con las garantías de las cláusulas contractuales tipo de la Comisión Europea. Los avisos los entregan los servicios de notificaciones de Apple o Google.</p>

<h2>Cuánto tiempo</h2>
<p>Hasta que borres tu nube. Al pulsar «Borrar mi nube» en Ajustes se eliminan del servidor al momento tus movimientos, ajustes, avisos, tu clave, cómo quieres que te paguen (Bizum, PayPal, Revolut), los cobros en los que estabas y tus votos y sugerencias de la encuesta. Sales de tus grupos, aunque tu nombre se queda en sus cuentas para que cuadren.</p>

<h2>Tus derechos</h2>
<ul>
  <li><b>Acceso y portabilidad:</b> en Ajustes puedes exportar tus datos a Excel o guardar una copia completa.</li>
  <li><b>Rectificación:</b> puedes editar cualquier movimiento desde la app.</li>
  <li><b>Supresión:</b> «Borrar mi nube» lo elimina todo, sin pedir nada a nadie.</li>
  <li>Para cualquier otra petición, escribe a ${esc(sitio.email)}. Si crees que no se respetan tus derechos, puedes reclamar ante la Agencia Española de Protección de Datos (<a href="https://www.aepd.es">aepd.es</a>).</li>
</ul>

<h2>Menores</h2>
<p>En España, si tienes menos de 14 años necesitas el permiso de tus padres o tutores para usar servicios que traten datos personales.</p>

<h2>Cookies</h2>
<p>Bolsillo no usa cookies ni publicidad. Solo usa el almacenamiento local del navegador para funcionar, y eso no necesita tu consentimiento.</p>
<p>Para saber cuántas visitas tiene, usa Cloudflare Web Analytics, del mismo Cloudflare que aloja la app. No usa cookies, no guarda tu dirección IP ni te sigue de una web a otra: solo cuenta visitas y páginas vistas en total, sin saber quién eres. Nunca ve tus gastos, que no pasan por ahí.</p>
`);

legal("aviso-legal/index.html", "Aviso legal", "Titular, condiciones de uso y responsabilidad de Bolsillo.", `
<h2>Titular</h2>
<p>${esc(sitio.titular)}. Contacto: ${esc(sitio.email)}. ${esc(sitio.ciudad)}, España.</p>

<h2>Qué es Bolsillo</h2>
<p>Bolsillo es una aplicación web gratuita para apuntar y entender tus gastos personales. No es un banco, no presta servicios de pago y no da asesoramiento financiero: las cifras que muestra son orientativas y salen de lo que tú apuntas.</p>

<h2>Uso</h2>
<p>Puedes usar Bolsillo para tu uso personal y con tus grupos. No está permitido intentar acceder a datos de otras personas, saturar el servicio ni usarlo para fines ilícitos. Tu clave es personal: quien la tenga puede ver y modificar tus datos, así que no la compartas.</p>

<h2>Disponibilidad y responsabilidad</h2>
<p>Bolsillo se ofrece tal cual, sin garantía de que esté disponible siempre ni libre de errores. Haz copias de seguridad desde Ajustes si tus datos te importan. El titular no responde de las decisiones económicas que tomes a partir de la app ni de los fallos de servicios de terceros (Apple, Google o Cloudflare).</p>

<h2>Marcas</h2>
<p>Apple, Apple Pay, iPhone, Siri y Atajos son marcas de Apple Inc. Android y Google Wallet son marcas de Google LLC. Bolsillo no está afiliado ni patrocinado por ellas.</p>

<h2>Ley aplicable</h2>
<p>Este aviso se rige por la legislación española.</p>
`);

// ---------- 404 ----------
escribir("404.html", `${cabeza({ titulo: "Esta página no existe · Bolsillo", descripcion: "La página que buscas no existe.", url: sitio.urlLanding, indexar: false })}
<body>
<main id="contenido" class="no-encontrada">
  <div class="contenedor estrecho centro">
    <p class="no-encontrada__codigo num">404</p>
    <h1>Esta página no existe</h1>
    <p class="entradilla">Puede que el enlace esté mal escrito o que la página ya no esté.</p>
    <div class="botones-404"><a class="boton boton--grande" href="${sitio.urlApp}">${sitio.cta}</a><a class="boton boton--secundario" href="/conoce/">Qué es Bolsillo</a></div>
  </div>
</main>
</body>
</html>`);

// ---------- Novedades para la app: la hoja «Novedades» del móvil lee este archivo (lo nuevo desde la última versión que viste) ----------
escribir("novedades.json", JSON.stringify({ versiones: versiones.slice(0, 12).map(({ version, fecha, titulo, icono, color, cambios }) => ({ version, fecha, titulo, icono, color, cambios })) }));

// ---------- Novedades: hoja de ruta + historial de versiones ----------
const fechaLarga = (iso) => new Date(iso + "T12:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
escribir("novedades/index.html", `${cabeza({ titulo: "Novedades y hoja de ruta · Bolsillo", descripcion: "Cómo va creciendo Bolsillo: lo que trae cada versión y lo que viene después.", url: sitio.urlLanding.replace("conoce/", "novedades/") })}
<body>
${nav()}
<main id="contenido" class="novedades">
  <div class="contenedor estrecho">
    <a class="volver" href="/conoce/">${icono("arrow-left")}Volver</a>
    <h1>Novedades</h1>
    <p class="entradilla">Cómo va creciendo Bolsillo: lo que trae cada versión y lo que viene después. Versión actual: <b>${versiones[0].version}</b>, del ${fechaLarga(versiones[0].fecha)}.</p>

${enCamino.length ? `
    <h2 class="titulo-seccion">Ya en camino</h2>
    <ul class="ruta" role="list">${enCamino.map((p) => `<li class="ruta__item ruta__item--camino">${azulejo(p.icono, p.color)}<div class="ruta__texto"><span class="estado estado--siguiente">La próxima versión</span><h3>${esc(p.titulo)}</h3><p>${esc(p.texto)}</p></div></li>`).join("")}</ul>

` : ""}
    <h2 class="titulo-seccion">Tú decides lo que viene después</h2>
    <p class="entradilla votos__intro">Vota las ideas que quieras ver antes en Bolsillo. La que más votos tenga es la siguiente que hacemos. <span id="votantes"></span></p>
    <ul class="ruta" id="ideas" role="list">${IDEAS.map((p) => `<li class="ruta__item" data-idea-caja="${p.id}">${azulejo(p.icono, p.color)}<div class="ruta__texto"><h3>${esc(p.titulo)}</h3><p>${esc(p.texto)}</p></div>
      <button class="voto" type="button" data-idea="${p.id}" aria-pressed="false" aria-label="Votar: ${esc(p.titulo)}">${icono("arrow-up")}<span class="num" data-votos>–</span></button></li>`).join("")}</ul>
    <form class="sugerir" id="sugerir">
      <label for="sugerencia"><b>¿Echas algo en falta?</b> Cuéntanos tu idea. Solo la lee el equipo de Bolsillo.</label>
      <div class="sugerir__fila"><input id="sugerencia" maxlength="300" placeholder="Me gustaría que Bolsillo…" autocomplete="off"><button class="boton" type="submit">Enviar</button></div>
      <p class="sugerir__estado" id="sugerir-estado" role="status"></p>
    </form>

    <h2 class="titulo-seccion">Historial</h2>
    <ol class="historial" role="list">${versiones.map((v, i) => `<li class="version">
      <div class="version__marca">${azulejo(v.icono, v.color)}</div>
      <div class="version__cuerpo">
        <p class="version__fecha"><span class="num">Versión ${esc(v.version)}</span> · ${fechaLarga(v.fecha)}${i === 0 ? ' <span class="estado estado--siguiente">La última</span>' : ""}</p>
        <h3>${esc(v.titulo)}</h3>
        <ul role="list">${v.cambios.map((c) => `<li>${esc(c)}</li>`).join("")}</ul>
      </div></li>`).join("")}</ol>

    <script src="/conoce/votos.js" defer></script>
    <div class="cta-novedades"><a class="boton boton--grande" href="${sitio.urlApp}">${sitio.cta}${icono("arrow-right")}</a></div>
  </div>
</main>
${pie()}
<script src="/conoce/landing.js" defer></script>
</body>
</html>`);
