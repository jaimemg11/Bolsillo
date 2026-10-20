// Imagen para compartir el enlace (Open Graph, 1200×630): node landing/og.mjs  (después de capturas.mjs)
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const require = createRequire("C:/Users/Moise/Desktop/landing pages/vatio/package.json");
const puppeteer = require("puppeteer-core");
const IMG = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public", "conoce", "img");
const b64 = (f) => fs.readFileSync(path.join(IMG, f)).toString("base64");

const html = `<!doctype html><html><head><link href="https://fonts.googleapis.com/css2?family=Manrope:wght@500;700&display=swap" rel="stylesheet"><style>
*{margin:0;box-sizing:border-box} body{width:1200px;height:630px;background:#000;font-family:Manrope,sans-serif;color:#fff;display:flex;align-items:center;padding:0 80px;overflow:hidden;position:relative}
.texto{flex:1} h1{font-size:72px;line-height:1;font-weight:700;letter-spacing:-.02em;background:linear-gradient(90deg,#fff,#9b9b9b);-webkit-background-clip:text;color:transparent;padding-bottom:4px}
p{margin-top:24px;font-size:30px;line-height:36px;color:#9b9b9b;font-weight:500;max-width:560px}
.marca{display:flex;align-items:center;gap:16px;font-size:30px;font-weight:700;margin-bottom:40px} .marca img{width:56px;height:56px;border-radius:12px}
.tel{position:relative;width:300px;border-radius:50px;padding:11px;background:linear-gradient(150deg,#4a4a4f,#1b1b1d 22%,#0d0d0e 55%,#2a2a2d);box-shadow:inset 0 0 0 1px rgba(255,255,255,.14),inset 0 0 0 4px #050505,0 40px 80px -20px rgba(10,132,255,.45);transform:translateY(110px)} .tel img{width:100%;border-radius:39px;display:block} .isla{position:absolute;top:19px;left:50%;transform:translateX(-50%);width:90px;height:26px;border-radius:20px;background:#000;z-index:2} body::before{content:"";position:absolute;right:40px;top:120px;width:420px;height:420px;border-radius:50%;background:#0a84ff;opacity:.3;filter:blur(90px)}
</style></head><body><div class="texto"><div class="marca"><img src="data:image/png;base64,${fs.readFileSync(path.join(IMG, "..", "..", "icono-192.png")).toString("base64")}">Bolsillo</div>
<h1>Tus gastos<br>se apuntan solos</h1><p>Pagas con Apple Pay y se apunta. Gratis, sin banco y sin email.</p></div>
<div class="tel"><span class="isla"></span><img src="data:image/webp;base64,${b64("mes.webp")}"></div></body></html>`;

const nav = await puppeteer.launch({ executablePath: "C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe", headless: "new" });
try {
  const p = await nav.newPage();
  await p.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
  await p.setContent(html, { waitUntil: "networkidle0" });
  await p.screenshot({ path: path.join(IMG, "og.jpg"), type: "jpeg", quality: 85 });
  console.log("✓ og.jpg");
} finally { await nav.close(); }
