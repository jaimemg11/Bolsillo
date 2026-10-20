// QA de la landing con navegador real (receta landing-definitiva §6): node landing/qa.mjs <carpeta-salida>
import { createRequire } from "node:module";
const require = createRequire("C:/Users/Moise/Desktop/landing pages/vatio/package.json");
const puppeteer = require("puppeteer-core");
const [salida = "."] = process.argv.slice(2), BASE = "https://bolsillo-app-9tz.pages.dev";
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const nav = await puppeteer.launch({ executablePath: "C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe", headless: "new" });
const tamanos = [[360, 640, true], [390, 844, true], [768, 1024, true], [1024, 768, false], [1440, 900, false], [1920, 1080, false]];
try {
  for (const [w, h, movil] of tamanos) {
    const p = await nav.newPage(), errores = [];
    p.on("pageerror", (e) => errores.push(e.message)); p.on("console", (m) => m.type() === "error" && errores.push(m.text()));
    await p.setViewport({ width: w, height: h, isMobile: movil, hasTouch: movil });
    await p.goto(BASE + "/conoce/", { waitUntil: "networkidle2" }); await espera(800);
    const desborde = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    const cta = await p.$eval(".hero .boton", (b) => { const r = b.getBoundingClientRect(); return r.bottom <= innerHeight; });
    const lineas = await p.$$eval(".hero__titular span", (s) => s.map((x) => Math.round(x.getBoundingClientRect().height / parseFloat(getComputedStyle(x).lineHeight === "normal" ? 48 : getComputedStyle(x).fontSize))));
    await p.screenshot({ path: `${salida}/hero-${w}.jpg`, type: "jpeg", quality: 70 });
    console.log(`${w}px · scroll horizontal: ${desborde ? "❌ " + desborde : "✓ no"} · CTA en primera pantalla: ${cta ? "✓" : "❌"} · líneas del titular: ${lineas.join("+")} · errores: ${errores.length ? errores : "ninguno"}`);
    if (w === 390) {
      // Menú móvil
      await p.click(".nav__menu"); await espera(900);
      await p.screenshot({ path: `${salida}/menu-390.jpg`, type: "jpeg", quality: 70 });
      const abierto = await p.$eval("#menu", (m) => !m.hidden && m.classList.contains("abierto"));
      await p.keyboard.press("Escape"); await espera(700);
      console.log(`  menú: abre ${abierto ? "✓" : "❌"} · cierra con Escape ${await p.$eval("#menu", (m) => m.hidden) ? "✓" : "❌"}`);
      // Frase reveladora: palabras encendidas al ir bajando
      const top = await p.$eval(".frase", (f) => f.getBoundingClientRect().top + scrollY);
      const cuentas = [];
      for (const d of [-700, -300, 0, 250]) { await p.evaluate((y) => scrollTo(0, y), top + d); await espera(600); cuentas.push(await p.$$eval(".frase__palabra.encendida", (x) => x.length)); }
      console.log(`  frase reveladora (palabras encendidas al bajar): ${cuentas.join(" → ")} de ${await p.$$eval(".frase__palabra", (x) => x.length)}`);
    }
    if (w === 390 || w === 1440) {
      await p.evaluate(() => document.querySelectorAll(".aparece").forEach((e) => e.classList.add("visible")));
      await p.evaluate(() => scrollTo(0, 0)); await espera(400);
      await p.screenshot({ path: `${salida}/completa-${w}.jpg`, type: "jpeg", quality: 60, fullPage: true });
    }
    await p.close();
  }
  for (const ruta of ["/novedades/", "/privacidad/", "/aviso-legal/", "/no-existe"]) {
    const p = await nav.newPage(), errores = [];
    p.on("pageerror", (e) => errores.push(e.message));
    await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    const r = await p.goto(BASE + ruta, { waitUntil: "networkidle2" });
    const desborde = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    await p.screenshot({ path: `${salida}/pag${ruta.replace(/\//g, "-")}.jpg`, type: "jpeg", quality: 60, fullPage: ruta !== "/no-existe" });
    console.log(`${ruta} · ${r.status()} · scroll horizontal: ${desborde ? "❌" : "✓ no"} · errores: ${errores.length ? errores : "ninguno"}`);
    await p.close();
  }
} finally { await nav.close(); }
