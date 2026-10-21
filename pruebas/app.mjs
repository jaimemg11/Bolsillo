// Pruebas de la app en un navegador de verdad, sin tocar la nube real: node pruebas/app.mjs
// Sirve public/ en este ordenador, abre Bolsillo como un móvil (iPhone o Android) y comprueba lo importante.
// La primera vez: npm install. Usa el Chrome, Edge o Brave que tengas instalado.
import { chromium } from "playwright-core";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ---------- Un servidor para public/ (la API no se usa: cada prueba dice qué contesta) ----------
const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public");
const TIPOS = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".json": "application/json", ".css": "text/css", ".png": "image/png", ".webp": "image/webp", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json" };
const servidor = http.createServer((pet, res) => {
  let f = path.join(RAIZ, decodeURIComponent(new URL(pet.url, "http://x").pathname));
  if (!f.startsWith(RAIZ)) return res.writeHead(403).end();
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, "index.html");
  if (!fs.existsSync(f)) return res.writeHead(404).end();
  res.writeHead(200, { "Content-Type": TIPOS[path.extname(f)] || "application/octet-stream" }).end(fs.readFileSync(f));
}).listen(0);
const URL_APP = `http://127.0.0.1:${servidor.address().port}/`;

// ---------- El navegador: el que diga PLAYWRIGHT_MCP_EXECUTABLE_PATH, o Chrome, Edge o Brave ----------
const candidatos = [process.env.PLAYWRIGHT_MCP_EXECUTABLE_PATH, "C:/Program Files/Google/Chrome/Application/chrome.exe", `${process.env.LOCALAPPDATA}/Google/Chrome/Application/chrome.exe`,
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/usr/bin/google-chrome", "/usr/bin/chromium"].filter(Boolean);
const ejecutable = candidatos.find((c) => fs.existsSync(c));
if (!ejecutable) { console.log("No encuentro Chrome, Edge ni Brave. Pon la ruta del navegador en PLAYWRIGHT_MCP_EXECUTABLE_PATH."); process.exit(1); }
const navegador = await chromium.launch({ executablePath: ejecutable });

let fallos = 0;
const ok = (c, t) => { if (!c) fallos++; console.log((c ? "OK    " : "FALLO ") + t); };
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const MOVILES = {
  iphone: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
  android: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Mobile Safari/537.36",
};

// Abre la app con unos datos guardados. api: qué contesta cada ruta de la API (lo demás, «sin conexión»)
async function abrir({ movil = "iphone", tema = "light", datos = {}, extra = {}, guardado = {}, api = {} } = {}) {
  const contexto = await navegador.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
    userAgent: MOVILES[movil], colorScheme: tema, serviceWorkers: "block", locale: "es-ES", timezoneId: "Europe/Madrid" });
  const pagina = await contexto.newPage(), errores = [];
  pagina.on("pageerror", (e) => errores.push(e.message));
  await pagina.route("**/api/**", (r) => { const ruta = new URL(r.request().url()).pathname.replace("/api/", ""); return api[ruta] ? r.fulfill({ json: api[ruta] }) : r.fulfill({ status: 503, body: "{}" }); });
  const todas = Object.fromEntries(["primer_paso", "racha_7", "nube", "applepay", "cazador", "hucha", "hucha_llena", "reto", "grupo", "ahorrador", "mes_verde"].map((k) => [k, "2026-01-01"])); // sin celebraciones que tapen la pantalla
  await contexto.addInitScript(({ datos, extra, guardado, todas }) => {
    if (sessionStorage.getItem("sembrado")) return;
    sessionStorage.setItem("sembrado", "1");
    localStorage.clear();
    localStorage.setItem("bolsillo.v1", JSON.stringify({ version: 1, presupuesto: 20000, movs: [], ...datos, extra: { huchas: [], retos: [], insignias: todas, ...extra }, extraAct: {}, extraPend: {} }));
    for (const [k, v] of Object.entries({ "bolsillo.bienvenida": "si", "bolsillo.ayuda": "no", "bolsillo.versionVista": "999.0", "bolsillo.sync": JSON.stringify({ clave: "clave-de-prueba" }), ...guardado })) localStorage.setItem(k, v);
  }, { datos, extra, guardado, todas });
  await pagina.goto(URL_APP);
  await pagina.waitForFunction(() => window.B && document.querySelector("#resumen")?.textContent);
  await espera(600);
  pagina.errores = errores;
  return pagina;
}
const pulsar = (p, selector) => p.$eval(selector, (b) => b.click()); // como un dedo, aunque haya algo animándose encima
const texto = (p, selector) => p.$eval(selector, (e) => e.textContent.replace(/\s+/g, " ").trim());
const hoy = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" });
const mov = (id, tipo, cat, importe, nota, fecha = hoy(), origen = "app") => ({ id, tipo, cat, importe, nota, fecha, creado: fecha + "T10:00:00Z", origen });
const errores = [];

// ---------- 1. Apuntar un gasto ----------
{
  const p = await abrir();
  await pulsar(p, "#abrir-anadir"); await espera(500);
  await p.fill("#importe", "12,5"); await p.fill("#nota", "Mercadona"); await espera(300);
  ok(await p.$eval('[data-cat="super"]', (b) => b.getAttribute("aria-pressed") === "true" || b.classList.contains("activa") || b.matches(".elegida, [aria-checked=true]")), "al escribir «Mercadona», elige sola la categoría Súper");
  await pulsar(p, "#guardar-mov"); await espera(700);
  ok((await texto(p, "#resumen")).includes("12,50"), "el gasto de 12,50 € sale en el resumen");
  ok(await p.evaluate(() => B.datos.movs.some((m) => m.importe === 1250 && m.cat === "super" && m.nota === "Mercadona")), "y queda guardado con su categoría y su nota");
  await pulsar(p, '[data-rango="semana"]'); await espera(500);
  ok(/semana/i.test(await texto(p, "#resumen .etiqueta")), "con «Semana» se ven las cuentas de la semana: " + (await texto(p, "#resumen .etiqueta")));
  ok(!(await p.$eval('meta[name="viewport"]', (m) => m.content)).includes("user-scalable=no"), "se puede ampliar con dos dedos");
  errores.push(...p.errores); await p.context().close();
}

// ---------- 2. Los tres sobres y lo que falta para los fijos (cobra los jueves; fijos: grado 219 € y ordenador 115,31 € al mes) ----------
async function sobresCon(cobros) {
  const fijos = [{ id: "grado", nombre: "Grado", tipo: "gasto", cat: "estudios", importe: 21900, dia: 5, desde: "2026-01" }, { id: "ordena", nombre: "Ordenador", tipo: "gasto", cat: "otros", importe: 11531, dia: 10, desde: "2026-01" }];
  const p = await abrir({ datos: { presupuesto: 5000 }, extra: { paga: { semana: 4 }, variable: { ahorro: 0 }, fijos } });
  // Las fechas, relativas a la semana de hoy: así la prueba vale cualquier día
  const semanas = await p.evaluate(() => { const pe = B.periodo(); return [-14, -7, 0].map((n) => new Date(Date.parse(pe.ini + "T12:00:00Z") + n * 864e5).toISOString().slice(0, 10)); });
  await p.evaluate(({ cobros, semanas }) => {
    cobros.forEach((c, i) => c && B.datos.movs.push({ id: "cobro" + i, tipo: "ingreso", cat: "trabajo", importe: c, nota: "Trabajo", fecha: semanas[i], creado: semanas[i] + "T10:00:00Z", origen: "app" }));
    B.pintar();
  }, { cobros, semanas });
  await espera(400);
  const s = await p.evaluate(() => B.sobres()), linea = await texto(p, "#resumen");
  errores.push(...p.errores); await p.context().close();
  return { s, linea };
}
{
  // Semana pasada: 68,25 € (los fijos de una semana son 77,15 €, faltan 8,90 €). Esta semana: 100 €
  const { s, linea } = await sobresCon([null, 6825, 10000]);
  ok(s.pendiente === 890 && s.fijos === 7715 + 890 && s.gastar === 10000 - 8605, `lo que faltó la semana pasada (8,90 €) se suma a los fijos de esta: fijos ${s.fijos / 100} €, para gastar ${s.gastar / 100} €`);
  ok(linea.includes("Los fijos incluyen 8,90 € que faltaron la semana pasada"), "y la app lo explica");
  const dos = await sobresCon([5000, 6825, 10000]); // hace dos semanas también faltó (27,15 €): se acumula
  ok(dos.s.pendiente === 7715 + 2715 - 6825, `si faltó dos semanas seguidas, se acumula (27,15 € + lo de la semana pasada): ${dos.s.pendiente / 100} €`);
  const sinCobro = await sobresCon([null, null, 10000]);
  ok(sinCobro.s.pendiente === 0, "si la semana pasada no apuntaste ningún cobro, no se inventa una deuda");
  const corto = await sobresCon([null, null, 5000]);
  ok(corto.linea.includes("te faltan 27,15 € para tus fijos") && corto.linea.includes("se suman a la semana que viene"), "si esta semana no llega, avisa de que se pasa a la siguiente");
}

// ---------- 3. Android: aviso para conectar Google Wallet, y la guía dice qué ha llegado ----------
{
  const hace = new Date(Date.now() - 5 * 60e3).toISOString();
  const p = await abrir({ movil: "android", guardado: { "bolsillo.primerosPasos": "no" }, datos: { movs: [mov("a1", "gasto", "super", 1250, "Mercadona")] }, api: { "ultimo-pago": { origen: "wallet", resultado: "ignorado", texto: "[not_title] [notification]", cuando: hace } } });
  ok(Boolean(await p.$("#banner-wallet")), "en Android sin pagos de Wallet sale el aviso para conectarlo");
  await pulsar(p, "#banner-wallet"); await espera(900);
  ok(await p.$eval("#hoja-applepay", (h) => h.classList.contains("abierta")), "al tocarlo se abre la guía");
  ok((await texto(p, "#url-pago")).includes("clave=clave-de-prueba"), "con la dirección de su nube ya puesta");
  ok((await texto(p, "#ultimo-pago")).includes("texto mágico"), "y si MacroDroid manda los nombres sin cambiar, la guía le dice cómo arreglarlo");
  errores.push(...p.errores); await p.context().close();
  const i = await abrir({ movil: "iphone" });
  ok(!(await i.$("#banner-wallet")), "en el iPhone no sale");
  errores.push(...i.errores); await i.context().close();
}

// ---------- 4. Todos los colores de Apariencia se leen bien (contraste 4,5:1), en claro y en oscuro ----------
{
  const lum = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4)).reduce((s, v, i) => s + v * [.2126, .7152, .0722][i], 0);
  const contraste = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
  for (const tema of ["light", "dark"]) {
    const p = await abrir({ tema }), fondo = tema === "light" ? "#f2f2f7" : "#000000", malos = [];
    for (const c of ["", "#5e5ce6", "#af52de", "#ff2d55", "#f57c00", "#1fa855", "#0fa3b1", "#c9a227"]) {
      const [acento, boton] = await p.evaluate((c) => { window.ponerColor(c); const r = getComputedStyle(document.documentElement); return [r.getPropertyValue("--acento").trim(), (r.getPropertyValue("--acento-fondo") || r.getPropertyValue("--acento")).trim()]; }, c);
      if (contraste(acento, fondo) < 4.5 || contraste(boton, "#ffffff") < 4.5) malos.push(`${c || "azul"} (${contraste(acento, fondo).toFixed(2)} / ${contraste(boton, "#ffffff").toFixed(2)})`);
    }
    ok(!malos.length, `modo ${tema === "light" ? "claro" : "oscuro"}: los 8 colores se leen bien${malos.length ? " — fallan: " + malos.join(", ") : ""}`);
    errores.push(...p.errores); await p.context().close();
  }
}

// ---------- 5. Elegir color en Ajustes pulsando los círculos, como lo hace una persona ----------
{
  const p = await abrir();
  await pulsar(p, "#abrir-ajustes"); await espera(700);
  const muestras = await p.$$eval(".muestra[data-color]:not([data-cerrado])", (bs) => bs.map((b) => b.dataset.color));
  const malos = [];
  for (const c of muestras.slice(1)) {
    await p.click(`.muestra[data-color="${c}"]`); await espera(250);
    const r = await p.evaluate((c) => ({ guardado: JSON.parse(localStorage.getItem("bolsillo.tema") || "{}").color, pulsado: document.querySelector(`.muestra[data-color="${c}"]`).getAttribute("aria-pressed") }), c);
    if (r.guardado !== c || r.pulsado !== "true") malos.push(`${c} → ${JSON.stringify(r)}`);
  }
  ok(!malos.length, `al tocar cada color, se elige ese color${malos.length ? " — fallan: " + malos.join(", ") : ""}`);
  const antes = await p.evaluate(() => localStorage.getItem("bolsillo.tema"));
  await p.click("#titulo-ajustes"); await p.mouse.click(200, 400); await espera(300); // tocar en otro sitio de la pantalla
  ok((await p.evaluate(() => localStorage.getItem("bolsillo.tema"))) === antes, "tocar en otro sitio de la pantalla no cambia el color");
  await pulsar(p, `.muestra[data-color="${muestras[0]}"]`); await espera(250);
  ok((await p.evaluate(() => JSON.parse(localStorage.getItem("bolsillo.tema")).color)) === "", "y el círculo azul vuelve al color de siempre");
  errores.push(...p.errores); await p.context().close();
  // Quien se quedó con el color roto del fallo («si») lo recupera solo, también el que estaba en la nube
  const r = await abrir({ extra: { tema: { modo: "", color: "si" } }, guardado: { "bolsillo.tema": JSON.stringify({ modo: "", color: "si" }) } });
  const estado = await r.evaluate(() => ({ acento: getComputedStyle(document.documentElement).getPropertyValue("--acento").trim(), local: JSON.parse(localStorage.getItem("bolsillo.tema")).color, nube: B.datos.extra.tema?.color }));
  ok(estado.acento === "#0066d6" && !estado.local && !estado.nube, `un color roto guardado se arregla solo: ${JSON.stringify(estado)}`);
  errores.push(...r.errores); await r.context().close();
}

// ---------- 6. Deslizar un gasto para borrarlo, con el dedo ----------
{
  const p = await abrir({ datos: { movs: [mov("g1", "gasto", "super", 1250, "Mercadona"), mov("g2", "gasto", "comida", 350, "Café")] } });
  const fondo = () => p.$eval('[data-editar="g1"]', (f) => getComputedStyle(f.parentElement).backgroundColor);
  ok(["rgba(0, 0, 0, 0)", "transparent"].includes(await fondo()), "en reposo no asoma el rojo de «Borrar» detrás de los gastos");
  // El dedo: empieza en la fila y se mueve a la izquierda
  const deslizar = (id, dx, soltar = true) => p.evaluate(async ({ id, dx, soltar }) => {
    const f = document.querySelector(`[data-editar="${id}"]`), r = f.getBoundingClientRect(), x = r.right - 40, y = r.top + r.height / 2;
    const toque = (px) => new Touch({ identifier: 1, target: f, clientX: px, clientY: y });
    f.dispatchEvent(new TouchEvent("touchstart", { bubbles: true, touches: [toque(x)], changedTouches: [toque(x)] }));
    for (let i = 1; i <= 5; i++) f.dispatchEvent(new TouchEvent("touchmove", { bubbles: true, touches: [toque(x + dx * i / 5)], changedTouches: [toque(x + dx * i / 5)] }));
    const durante = f.parentElement.classList.contains("deslizando");
    if (soltar) f.dispatchEvent(new TouchEvent("touchend", { bubbles: true, touches: [], changedTouches: [toque(x + dx)] }));
    return durante;
  }, { id, dx, soltar });
  ok(await deslizar("g1", -50), "al deslizar, aparece el rojo de «Borrar»");
  await espera(400);
  ok(["rgba(0, 0, 0, 0)", "transparent"].includes(await fondo()), "si sueltas antes de tiempo, la fila vuelve y el rojo se va");
  await deslizar("g1", -160); await espera(900);
  ok(await p.evaluate(() => { const m = B.datos.movs.find((x) => x.id === "g1"); return !m || m.borrado; }), "si deslizas hasta el final, el gasto se borra");
  errores.push(...p.errores); await p.context().close();
}

// ---------- 7. El gráfico del ritmo: «¿voy bien este mes?» ----------
{
  const p = await abrir({ datos: { presupuesto: 20000, movs: [mov("r1", "gasto", "super", 1250, "Mercadona"), mov("r2", "gasto", "comida", 350, "Café"), mov("r3", "gasto", "ocio", 900, "Cine")] } });
  ok(Boolean(await p.$("#resumen .ritmo-grafico")), "en el mes actual sale el gráfico del ritmo");
  const { dia, dias } = await p.evaluate(() => { const h = new Date(); return { dia: h.getDate(), dias: new Date(h.getFullYear(), h.getMonth() + 1, 0).getDate() }; });
  const hallazgo = await texto(p, "#resumen .ritmo-hallazgo");
  const euro = (c) => (c / 100).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
  ok(dia < 3 ? hallazgo.includes("Llevas 25,00 €") : hallazgo.includes(euro(Math.round((2500 / dia) * dias))), `la frase calcula bien a dónde llegarías: «${hallazgo}»`);
  const caja = await (await p.$("#resumen .ritmo-grafico")).boundingBox();
  await p.mouse.move(caja.x + caja.width - 2, caja.y + caja.height / 2); await espera(150);
  ok((await texto(p, "#resumen .ritmo-dato")).includes("25,00 €"), "al pasar por encima, se ve lo que llevas ese día: " + (await texto(p, "#resumen .ritmo-dato")));
  await pulsar(p, '[data-rango="semana"]'); await espera(400);
  ok(Boolean(await p.$("#resumen .ritmo-grafico")), "y también en la vista de la semana");
  await pulsar(p, "#mes-antes"); await espera(400);
  ok(!(await p.$("#resumen .ritmo-grafico")), "en una semana pasada no sale (ya no hay ritmo que seguir)");
  errores.push(...p.errores); await p.context().close();
}

// ---------- 8. La primera vez: primeros pasos y la lista vacía ----------
{
  const p = await abrir({ datos: { presupuesto: null }, guardado: { "bolsillo.sync": "{}" } });
  ok((await texto(p, ".primeros-pasos .pp-cabeza")).includes("0 de 4"), "a quien empieza le salen los primeros pasos: 0 de 4");
  ok(Boolean(await p.$('#lista [data-accion="anadir"]')), "la lista vacía tiene un botón para apuntar el primer gasto");
  await p.click('#lista [data-accion="anadir"]'); await espera(500);
  ok(await p.$eval("#hoja-mov", (h) => h.classList.contains("abierta")), "que abre la hoja de apuntar");
  await p.fill("#importe", "3,5"); await p.fill("#nota", "Café"); await pulsar(p, "#guardar-mov"); await espera(700);
  ok((await texto(p, ".primeros-pasos .pp-cabeza")).includes("1 de 4") && (await p.$eval('[data-paso="gasto"]', (b) => b.disabled)), "al apuntar el primer gasto, ese paso queda hecho: 1 de 4");
  await p.click('[data-paso="presupuesto"]'); await espera(600);
  ok(await p.$eval("#hoja-ajustes", (h) => h.classList.contains("abierta")), "el paso del presupuesto lleva a Ajustes");
  await p.evaluate(() => B.cerrarHoja()); await espera(400);
  await p.click("#pp-ocultar"); await espera(400);
  ok(!(await p.$(".primeros-pasos")), "con la × se quitan");
  await p.reload(); await p.waitForFunction(() => window.B && document.querySelector("#resumen")?.textContent); await espera(500);
  ok(!(await p.$(".primeros-pasos")), "y no vuelven a salir");
  errores.push(...p.errores); await p.context().close();
  const veterano = await abrir({ datos: { movs: Array.from({ length: 20 }, (_, i) => mov("v" + i, "gasto", "comida", 300, "Café")) } });
  ok(!(await veterano.$(".primeros-pasos")), "a quien ya usa la app no se le insiste con los primeros pasos");
  errores.push(...veterano.errores); await veterano.context().close();
}

ok(!errores.length, "ningún error de JavaScript en la app" + (errores.length ? ": " + [...new Set(errores)].join(" | ") : ""));
await navegador.close(); servidor.close();
console.log(fallos ? `\n${fallos} prueba(s) fallan` : "\nTodo bien");
process.exitCode = fallos ? 1 : 0;
