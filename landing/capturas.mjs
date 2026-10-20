// Saca capturas reales de la app (con datos de ejemplo) para la landing: node landing/capturas.mjs
// Necesita puppeteer-core (se usa el de la carpeta de Vatio) y Brave/Chrome instalado.
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const require = createRequire("C:/Users/Moise/Desktop/landing pages/vatio/package.json");
const puppeteer = require("puppeteer-core");
const SALIDA = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public", "conoce", "img");
fs.mkdirSync(SALIDA, { recursive: true });
const URL = process.argv[2] || "https://bolsillo-app-9tz.pages.dev/";
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

// Un mes normal de estudiante (ficticio)
function datosEjemplo() {
  const hoy = new Date(), dia = (d, m = 0) => new Date(hoy.getFullYear(), hoy.getMonth() - m, d).toLocaleDateString("sv-SE");
  const atras = (n) => new Date(Date.now() - n * 864e5).toLocaleDateString("sv-SE");
  const movs = [];
  const add = (tipo, cat, importe, nota, fecha, origen = "app") => movs.push({ id: "e" + movs.length, tipo, cat, importe, nota, fecha, creado: new Date(fecha + "T1" + (movs.length % 9) + ":00:00").toISOString(), actualizado: "x", origen });
  // racha de 9 días y el mes en curso
  const diarios = [["transporte", 140, "Tussam"], ["comida", 350, "Bar La Esquina"], ["super", 1870, "Mercadona"], ["comida", 290, "Café con leche y tostada"], ["ocio", 790, "Cinesa Nervión"], ["transporte", 140, "Tussam"], ["comida", 1450, "Glovo"], ["super", 960, "Lidl"], ["estudios", 320, "Fotocopias"]];
  diarios.forEach(([cat, imp, nota], i) => add("gasto", cat, imp, nota, atras(i), i % 3 === 0 ? "applepay" : "app"));
  add("gasto", "subs", 1099, "Spotify", dia(3), "applepay"); add("gasto", "ropa", 2599, "Zara", dia(8), "applepay"); add("ingreso", "paga", 15000, "Paga", dia(1));
  for (const m of [1, 2, 3]) { add("gasto", "subs", 1099, "Spotify", dia(3, m)); add("gasto", "super", 4200, "Mercadona", dia(10, m)); add("gasto", "comida", 3100, "Bar La Esquina", dia(15, m)); add("gasto", "ocio", 1800, "Cinesa Nervión", dia(20, m)); add("ingreso", "paga", 15000, "Paga", dia(1, m)); }
  return { version: 1, movs, presupuesto: 25000, extra: { paga: null, huchas: [{ id: "h1", nombre: "Portátil nuevo", emoji: "laptop", objetivo: 45000, ahorrado: 16000, creado: atras(40) }, { id: "h2", nombre: "Viaje a Lisboa", emoji: "airplane-tilt", objetivo: 20000, ahorrado: 20000, creado: atras(60) }],
    retos: [{ id: "r1", tipo: "sin_delivery", inicio: atras(3), desde: new Date(Date.now() - 3 * 864e5).toISOString(), estado: "activo" }, { id: "r0", tipo: "sin_cafe", inicio: atras(30), desde: "x", estado: "superado", cerrado: atras(23) }],
    insignias: Object.fromEntries(["primer_paso", "racha_7", "nube", "applepay", "cazador", "hucha", "hucha_llena", "reto", "grupo", "ahorrador", "mes_verde"].map((k) => [k, atras(5)])) }, extraAct: {}, extraPend: {} };
}
// Un duelo en marcha (ficticio): solo porcentajes, como en la app
const dueloEjemplo = [{ id: "d1", nombre: "¿Quién gasta menos?", codigo: "R4TQ8B", tipo: "semana", inicio: "x", fin: "x", pacto: "El que pierda paga las pizzas", estado: "activo",
  quedan: 3, total: 7, transcurridos: 5, minimo: 3, ganador: null, gane: false, empate: false,
  filas: [{ nombre: "Álex", pct: 54.2, dias: 5, applepay: 61, valido: true, yo: true }, { nombre: "Lucía", pct: 68.9, dias: 5, applepay: 40, valido: true, yo: false }, { nombre: "Dani", pct: 91.5, dias: 4, applepay: 0, valido: true, yo: false }] }];
const grupoEjemplo = [{ id: "g1", nombre: "Piso Triana", codigo: "K7PQ2M", yo: "m1",
  miembros: [{ id: "m1", nombre: "Álex", con_app: true }, { id: "m2", nombre: "Lucía", con_app: true }, { id: "m3", nombre: "Dani", con_app: false }],
  gastos: [{ id: "x1", tipo: "gasto", pagador: "m2", importe: 6450, concepto: "Compra semanal", reparto: { m1: 2150, m2: 2150, m3: 2150 }, fecha: new Date(Date.now() - 864e5).toLocaleDateString("sv-SE") },
    { id: "x2", tipo: "gasto", pagador: "m1", importe: 3600, concepto: "Internet", reparto: { m1: 1200, m2: 1200, m3: 1200 }, fecha: new Date(Date.now() - 4 * 864e5).toLocaleDateString("sv-SE") },
    { id: "x3", tipo: "gasto", pagador: "m3", importe: 2400, concepto: "Productos de limpieza", reparto: { m1: 800, m2: 800, m3: 800 }, fecha: new Date(Date.now() - 6 * 864e5).toLocaleDateString("sv-SE") }] }];

const nav = await puppeteer.launch({ executablePath: "C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe", headless: "new" });
// Para que parezcan capturas de un iPhone de verdad: barra de estado (9:41, cobertura, wifi, batería), indicador de inicio
// y las hojas a pantalla completa (sin el fondo oscurecido, que en una foto queda sucio)
const ESTILO_IPHONE = `body { padding-top: 54px !important; padding-bottom: calc(96px + 20px) !important; }
  .pestanas { padding-bottom: 24px !important; }
  .velo { opacity: 0 !important; }
  .hoja.abierta { top: 0 !important; height: 100% !important; max-height: none !important; border-radius: 0 !important; padding-top: 62px !important; }
  .hoja .asa { display: none !important; }
  #barra-ios { position: fixed; top: 0; left: 0; right: 0; height: 54px; z-index: 99; display: flex; justify-content: space-between; align-items: center; padding: 4px 30px 0 46px;
    font: 600 17px -apple-system, "SF Pro Text", "Segoe UI", sans-serif; color: var(--texto); pointer-events: none; }
  #barra-ios svg { fill: currentColor; } #barra-ios .iconos { display: flex; gap: 6px; align-items: center; }
  #inicio-ios { position: fixed; left: 50%; bottom: 8px; transform: translateX(-50%); width: 134px; height: 5px; border-radius: 3px; background: var(--texto); z-index: 99; opacity: .9; }`;
const BARRA_IPHONE = `<div id="barra-ios"><span>9:41</span><span class="iconos">
  <svg width="18" height="12" viewBox="0 0 18 12"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg>
  <svg width="16" height="12" viewBox="0 0 16 12"><path d="M8 2.6c2.4 0 4.6.9 6.2 2.5l1.3-1.3A10.6 10.6 0 0 0 8 .7 10.6 10.6 0 0 0 .5 3.8l1.3 1.3A8.7 8.7 0 0 1 8 2.6Zm0 3.7c1.4 0 2.6.5 3.6 1.4l1.3-1.3A7 7 0 0 0 8 4.4a7 7 0 0 0-4.9 2l1.3 1.3c1-.9 2.2-1.4 3.6-1.4Zm0 3.6c.6 0 1.1.2 1.5.6L8 12 6.5 10.5c.4-.4.9-.6 1.5-.6Z"/></svg>
  <svg width="27" height="13" viewBox="0 0 27 13"><rect x=".5" y=".5" width="23" height="12" rx="3.5" fill="none" stroke="currentColor" opacity=".4"/><rect x="2" y="2" width="20" height="9" rx="2"/><path d="M25 4.5v4c.8-.3 1.3-1.1 1.3-2s-.5-1.7-1.3-2Z" opacity=".5"/></svg>
</span></div><div id="inicio-ios"></div>`;
const ponerIphone = (p) => p.evaluate((estilo, barra) => {
  document.head.insertAdjacentHTML("beforeend", `<style id="estilo-ios">${estilo}</style>`);
  document.body.insertAdjacentHTML("beforeend", barra);
}, ESTILO_IPHONE, BARRA_IPHONE);

try {
  const p = await nav.newPage();
  await p.setUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1");
  await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true }); // 1170×2532, como un iPhone 14/15
  await p.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "dark" }]); // en una web negra, la app en oscuro se ve integrada
  await p.setRequestInterception(true);
  p.on("request", (r) => (r.url().includes("/api/") ? r.respond({ status: 503, body: "{}" }) : r.continue())); // sin tocar la nube real
  await p.goto(URL, { waitUntil: "load" });
  await p.evaluate((d, g, du) => {
    localStorage.clear();
    localStorage.setItem("bolsillo.v1", JSON.stringify(d)); localStorage.setItem("bolsillo.grupos", JSON.stringify(g)); localStorage.setItem("bolsillo.duelos", JSON.stringify(du)); localStorage.setItem("bolsillo.duelosVistos", "[]");
    localStorage.setItem("bolsillo.sync", JSON.stringify({ clave: "ejemplo" })); localStorage.setItem("bolsillo.ayuda", "no"); localStorage.setItem("bolsillo.bienvenida", "si");
  }, datosEjemplo(), grupoEjemplo, dueloEjemplo);
  const foto = async (nombre) => { await p.evaluate(() => { document.querySelectorAll(".celebracion").forEach((c) => c.remove()); document.querySelector("#aviso")?.classList.remove("visible"); }); await espera(400); await p.screenshot({ path: path.join(SALIDA, nombre), type: "webp", quality: 86 }); console.log("✓", nombre); };
  await p.reload({ waitUntil: "load" }); await espera(1500);
  await ponerIphone(p); await espera(300);
  await foto("mes.webp");
  await p.$eval("#abrir-anadir", (b) => b.click()); await espera(700); await p.evaluate(() => document.activeElement.blur());
  await p.type("#importe", "12,5"); await p.type("#nota", "Mercadona"); await p.evaluate(() => document.activeElement.blur()); await espera(300);
  await foto("anadir.webp");
  await p.evaluate(() => B.cerrarHoja()); await espera(500);
  await p.$eval('[data-vista="metas"]', (b) => b.click()); await espera(800); await foto("metas.webp");
  await p.$eval('[data-vista="grupos"]', (b) => b.click()); await espera(800);
  await p.$eval("[data-grupo]", (b) => b.click()); await espera(800); await foto("grupo.webp");
  await p.evaluate(() => B.cerrarHoja()); await espera(400);
  await p.$eval("[data-duelo]", (b) => b.click()); await espera(800); await foto("duelo.webp");
  await p.evaluate(() => B.cerrarHoja()); await espera(400);
  await p.$eval('[data-vista="mes"]', (b) => b.click()); await espera(600);
  await p.$eval("#abrir-wrapped", (b) => b.click()); await espera(1500);
  const b64 = await p.evaluate(async () => { const b = await (await fetch(document.querySelector("#wrapped-img").src)).blob(); return await new Promise((r) => { const f = new FileReader(); f.onload = () => r(f.result.split(",")[1]); f.readAsDataURL(b); }); });
  // La tarjeta para stories a 720×1280 (nítida en pantallas retina)
  await p.setViewport({ width: 720, height: 1280, deviceScaleFactor: 1 });
  await p.setContent(`<style>*{margin:0}img{width:720px;height:1280px;display:block}</style><img src="data:image/jpeg;base64,${b64}">`);
  await p.screenshot({ path: path.join(SALIDA, "tu-mes.webp"), type: "webp", quality: 86 }); console.log("✓ tu-mes.webp");
} finally { await nav.close(); }
