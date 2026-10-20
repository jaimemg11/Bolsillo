// Genera public/iconos.js con los trazados de los iconos Phosphor (versión rellena) que usa la app: node herramientas/iconos.mjs
// Un solo archivo sirve para el HTML (SVG en línea) y para el canvas de la tarjeta del mes (Path2D).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const FUENTE = "C:/Users/Moise/Desktop/landing pages/vatio/node_modules/@phosphor-icons/core/assets/fill";
const NOMBRES = `paint-brush rocket-launch skull eye eye-slash calendar-check gauge scan chart-pie-slice android-logo globe chat-circle-text thumbs-up trophy sword flag-checkered timer fork-knife shopping-cart-simple bus ticket t-shirt arrows-clockwise graduation-cap package wallet briefcase tag gift arrow-u-up-left
  snowflake flower-lotus moped coffee target trend-down plant fire crown seal-check note-pencil piggy-bank cooking-pot cloud-check contactless-payment
  microphone magnifying-glass vault coins lightning medal users-three camera laptop airplane-tilt game-controller car device-mobile headphones sneaker
  island house moon-stars bell user user-circle pencil-simple receipt handshake key lock-key lock-simple apple-logo sparkle check-circle confetti cloud shield-check check trend-up equals repeat`.split(/\s+/);

const iconos = {};
for (const n of NOMBRES) {
  const svg = fs.readFileSync(path.join(FUENTE, `${n}-fill.svg`), "utf8");
  iconos[n] = [...svg.matchAll(/<path d="([^"]+)"/g)].map((m) => m[1]).join(" ");
}
const salida = `// Generado por herramientas/iconos.mjs a partir de Phosphor Icons (MIT). No editar a mano.
window.ICONOS = ${JSON.stringify(iconos)};
// ico("fire") → <svg> listo para meter en el HTML (hereda el color del texto)
window.ico = (n, clase = "") => \`<svg class="ico \${clase}" viewBox="0 0 256 256" aria-hidden="true" focusable="false"><path d="\${window.ICONOS[n] || window.ICONOS.package}"/></svg>\`;
`;
const destino = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public", "iconos.js");
fs.writeFileSync(destino, salida);
console.log(`✓ public/iconos.js · ${NOMBRES.length} iconos · ${(salida.length / 1024).toFixed(1)} KB`);
