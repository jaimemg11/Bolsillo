// Genera la landing de Bolsillo y sus páginas legales en public/ a partir de datos.mjs: node landing/build.mjs
// Sin dependencias: HTML estático con los iconos Phosphor en línea y el JSON-LD escrito en el propio HTML.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { instalar, sitio, seo, hero, problema, funciones, categorias, categoriasTexto, pasos, frase, capturas, privacidad, faq, novedad, versiones, enCamino } from "./datos.mjs";
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
<meta name="theme-color" content="#000000">
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
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/conoce/estilos.css">
${extra}</head>`;

const enlacesNav = [["/conoce/#instalar", "Instalar"], ["/conoce/#como-funciona", "Cómo funciona"], ["/conoce/#funciones", "Funciones"], ["/conoce/#duelos", "Duelos"], ["/conoce/#preguntas", "Preguntas"], ["/novedades/", "Novedades"]];
const nav = () => `<a class="saltar" href="#contenido">Saltar al contenido</a>
<header class="nav-caja">
  <nav class="nav" aria-label="Principal">
    <a class="nav__marca" href="/conoce/"><img src="/icono-192.png" alt="" width="28" height="28"><span>Bolsillo</span></a>
    <ul class="nav__enlaces" role="list">${enlacesNav.map(([h, t]) => `<li><a class="nav__enlace" href="${h}" ${h.includes("#") ? `data-espia="${h.split("#")[1]}"` : ""}>${t}</a></li>`).join("")}</ul>
    <a class="boton boton--peque nav__cta" href="${sitio.urlApp}">${sitio.ctaCorto}</a>
    <button class="nav__menu" type="button" aria-expanded="false" aria-controls="menu" aria-label="Abrir menú"><span></span><span></span></button>
  </nav>
  <div class="menu" id="menu" hidden>
    <ul role="list">${enlacesNav.map(([h, t], i) => `<li style="--i:${i}"><a class="menu__enlace" href="${h}">${t}</a></li>`).join("")}
      <li style="--i:${enlacesNav.length}"><a class="boton boton--grande" href="${sitio.urlApp}">${sitio.cta}${icono("arrow-right")}</a></li></ul>
  </div>
</header>`;

const pie = () => `<footer class="pie">
  <div class="contenedor pie__dentro">
    <div class="pie__marca"><img src="/icono-192.png" alt="" width="32" height="32"><div><b>Bolsillo</b><span>Tus gastos del mes, sin líos.</span></div></div>
    <nav aria-label="Legal"><ul role="list" class="pie__enlaces">
      <li><a href="${sitio.urlApp}">Abrir la app</a></li><li><a href="/novedades/">Novedades</a></li><li><a href="/privacidad/">Privacidad</a></li><li><a href="/aviso-legal/">Aviso legal</a></li></ul></nav>
    <p class="pie__nota">Apple Pay es una marca de Apple Inc. y Google Wallet, de Google LLC. Bolsillo no está afiliado a ellas.</p>
  </div>
</footer>`;

// Marco de iPhone: biselado, botones laterales e isla dinámica; la captura ya trae la barra de estado
const telefono = (img, alt, carga = "lazy") => `<div class="telefono"><div class="telefono__marco"><span class="telefono__isla" aria-hidden="true"></span><img src="/conoce/img/${img}" alt="${esc(alt)}" width="1170" height="2532" loading="${carga}" decoding="async"></div></div>`;

// ---------- Landing ----------
const jsonLd = [
  { "@context": "https://schema.org", "@type": "SoftwareApplication", name: "Bolsillo", applicationCategory: "FinanceApplication", operatingSystem: "iOS, Android, Web",
    description: seo.descripcion, url: sitio.urlLanding, inLanguage: "es", offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" } },
  { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.p, acceptedAnswer: { "@type": "Answer", text: f.r } })) },
].map((o) => `<script type="application/ld+json">${JSON.stringify(o)}</script>`).join("\n");

const landing = `${cabeza({ titulo: seo.titulo, descripcion: seo.descripcion, url: sitio.urlLanding, extra: jsonLd + '\n<link rel="manifest" href="/manifest.webmanifest">\n' })}
<body>
${nav()}
<main id="contenido">
  <section class="hero" aria-labelledby="titular">
    <div class="contenedor hero__rejilla">
      <div class="hero__texto">
        <a class="aviso-nuevo" href="#duelos"><span>${esc(novedad.etiqueta)}</span>${esc(novedad.aviso)}${icono("arrow-right")}</a>
        <h1 class="hero__titular" id="titular">${hero.titular.map((l) => `<span>${esc(l)}</span>`).join("")}</h1>
        <p class="hero__sub">${esc(hero.subtitulo)}</p>
        <div class="hero__acciones"><a class="boton boton--grande" href="${sitio.urlApp}">${sitio.cta}${icono("arrow-right")}</a><a class="boton boton--grande boton--secundario" href="#instalar">${icono("device-mobile")}Cómo instalarla</a></div>
        <ul class="prueba" role="list">${hero.prueba.map((p) => `<li>${icono("shield-check")}${esc(p)}</li>`).join("")}</ul>
      </div>
      <div class="hero__visual">
        <span class="hero__halo" aria-hidden="true"></span>
        ${telefono("mes.webp", capturas[0].alt, "eager")}
        <div class="hero__segundo">${telefono("duelo.webp", novedad.alt, "eager")}</div>
      </div>
    </div>
  </section>

  <section class="seccion instalar" id="instalar" aria-labelledby="t-instalar">
    <div class="contenedor">
      <h2 class="titulo-seccion aparece" id="t-instalar">${esc(instalar.titulo)}</h2>
      <p class="entradilla aparece">${esc(instalar.texto)}</p>
      <div class="instalar__selector aparece" role="tablist" aria-label="Tu móvil" data-activo="iphone">${instalar.sistemas.map((s, i) => `<button type="button" role="tab" id="tab-${s.id}" aria-controls="so-${s.id}" aria-selected="${i === 0}" data-so="${s.id}">${azulejo(s.icono, s.color, "azulejo--chip")}${esc(s.nombre)}</button>`).join("")}</div>
      <div class="instalar__ventana aparece"><div class="instalar__rejilla" data-activo="iphone">${instalar.sistemas.map((s) => `<article class="instalar__so tarjeta" id="so-${s.id}" role="tabpanel" aria-labelledby="tab-${s.id}">
        <header class="instalar__cabeza">${azulejo(s.icono, s.color)}<div><h3>${esc(s.nombre)}</h3><p>Con ${esc(s.navegador)}</p></div></header>
        <ol class="instalar__pasos" role="list">${s.pasos.map((p, i) => `<li><span class="instalar__num num">${i + 1}</span>${azulejo(p.icono, p.color, "azulejo--peque")}<p>${p.texto}</p></li>`).join("")}</ol>
        <button type="button" class="boton boton--grande instalar__boton" data-instalar="${s.id}">${icono("download-simple")}${esc(s.boton)}</button>
        <p class="instalar__ayuda" data-ayuda="${s.id}" hidden></p>
        <p class="instalar__nota">${esc(s.nota)}</p>
      </article>`).join("")}</div></div>
      <div class="instalar__acciones aparece"><a class="boton boton--grande" href="${sitio.urlApp}">Abrir Bolsillo para instalarla${icono("arrow-right")}</a></div>
    </div>
  </section>

  <section class="seccion problema aparece">
    <div class="contenedor estrecho">
      <h2 class="titulo-seccion">${esc(problema.titulo)}</h2>
      <p class="entradilla">${esc(problema.texto)}</p>
    </div>
  </section>

  <section class="seccion" id="duelos" aria-labelledby="t-duelos">
    <div class="contenedor">
      <div class="novedad aparece">
        <div class="novedad__texto">
          <span class="chip-nuevo">${azulejo("sword", "#ff2d55", "azulejo--chip")}${esc(novedad.etiqueta)} · ${esc(novedad.aviso)}</span>
          <h2 class="titulo-seccion" id="t-duelos">${esc(novedad.titulo)}</h2>
          <p class="entradilla">${esc(novedad.texto)}</p>
          <ul class="novedad__puntos" role="list">${novedad.puntos.map((p) => `<li>${azulejo(p.icono, p.color, "azulejo--peque")}<span>${esc(p.texto)}</span></li>`).join("")}</ul>
          <div class="novedad__acciones"><a class="boton boton--grande" href="${sitio.urlApp}">Retar a un amigo${icono("arrow-right")}</a><a class="enlace-flecha" href="/novedades/">Todas las novedades${icono("arrow-right")}</a></div>
        </div>
        <div class="novedad__visual">${telefono(novedad.img, novedad.alt)}</div>
      </div>
    </div>
  </section>

  <section class="seccion" id="funciones" aria-labelledby="t-funciones">
    <div class="contenedor">
      <h2 class="titulo-seccion aparece" id="t-funciones">Todo lo que necesitas, nada que te frene</h2>
      <ul class="rejilla-funciones" role="list">${funciones.map((f) => `<li class="tarjeta aparece">${azulejo(f.icono, f.color)}<h3>${esc(f.titulo)}</h3><p>${esc(f.texto)}</p></li>`).join("")}</ul>
    </div>
  </section>

  <section class="seccion categorias" aria-labelledby="t-categorias">
    <div class="contenedor">
      <div class="categorias__caja aparece">
        <div class="categorias__texto"><h2 class="titulo-seccion" id="t-categorias">${esc(categoriasTexto.titulo)}</h2><p class="entradilla">${esc(categoriasTexto.texto)}</p></div>
        <ul class="categorias__rejilla" role="list">${categorias.map((c) => `<li>${azulejo(c.icono, c.color, "azulejo--grande")}<span>${esc(c.nombre)}</span></li>`).join("")}</ul>
      </div>
    </div>
  </section>

  <section class="seccion" id="como-funciona" aria-labelledby="t-pasos">
    <div class="contenedor">
      <h2 class="titulo-seccion aparece" id="t-pasos">Empieza en un minuto</h2>
      <ol class="pasos" role="list">${pasos.map((p, i) => `<li class="paso aparece"><span class="paso__num num">${i + 1}</span><h3>${esc(p.titulo)}</h3><p>${esc(p.texto)}</p></li>`).join("")}</ol>
    </div>
  </section>

  <section class="seccion frase" aria-label="La idea de Bolsillo">
    <div class="contenedor"><p class="frase__texto">${frase.split(" ").map((w) => `<span class="frase__palabra">${esc(w)} </span>`).join("")}</p></div>
  </section>

  <section class="seccion" aria-labelledby="t-capturas">
    <div class="contenedor">
      <h2 class="titulo-seccion aparece" id="t-capturas">Así se ve por dentro</h2>
      <ul class="capturas" role="list">${capturas.map((c) => `<li class="captura aparece">${c.img === "tu-mes.webp" ? `<div class="tarjeta-mes"><img src="/conoce/img/${c.img}" alt="${esc(c.alt)}" width="720" height="1280" loading="lazy" decoding="async"></div>` : telefono(c.img, c.alt)}<h3>${esc(c.titulo)}</h3><p>${esc(c.texto)}</p></li>`).join("")}</ul>
    </div>
  </section>

  <section class="seccion" id="privacidad" aria-labelledby="t-privacidad">
    <div class="contenedor">
      <h2 class="titulo-seccion aparece" id="t-privacidad">${esc(privacidad.titulo)}</h2>
      <ul class="rejilla-privacidad" role="list">${privacidad.puntos.map((p) => `<li class="tarjeta aparece">${azulejo(p.icono, p.color)}<h3>${esc(p.titulo)}</h3><p>${esc(p.texto)}</p></li>`).join("")}</ul>
      <p class="nota-centro aparece">Todos los detalles en la <a href="/privacidad/">política de privacidad</a>.</p>
    </div>
  </section>

  <section class="seccion" id="preguntas" aria-labelledby="t-faq">
    <div class="contenedor estrecho">
      <h2 class="titulo-seccion aparece" id="t-faq">Preguntas frecuentes</h2>
      <div class="faq">${faq.map((f) => `<details class="aparece"><summary>${esc(f.p)}${icono("caret-down")}</summary><p>${esc(f.r)}</p></details>`).join("")}</div>
    </div>
  </section>

  <section class="seccion cta-final aparece" aria-labelledby="t-cta">
    <div class="contenedor estrecho centro">
      <h2 class="titulo-seccion" id="t-cta">Que el dinero te dure hasta final de mes</h2>
      <p class="entradilla">${esc(privacidad.riesgo)} Funciona en cualquier iPhone o Android.</p>
      <a class="boton boton--grande" href="${sitio.urlApp}">${sitio.cta}${icono("arrow-right")}</a>
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
<p>Hasta que borres tu nube. Al pulsar «Borrar mi nube» en Ajustes se eliminan tus movimientos, ajustes, avisos y tu clave del servidor al momento, y sales de tus grupos (tu nombre se queda en sus cuentas para que cuadren).</p>

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
<p>Bolsillo no usa cookies ni herramientas de analítica o publicidad de terceros. Solo usa el almacenamiento local del navegador para funcionar, y eso no necesita tu consentimiento. Cloudflare muestra al titular estadísticas de visitas agregadas que no identifican a nadie.</p>
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
