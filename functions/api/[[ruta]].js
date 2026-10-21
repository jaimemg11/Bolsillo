// API de Bolsillo (Cloudflare Pages Functions + D1). Cada persona tiene su nube: una clave anónima (sin email) que identifica sus datos.
// La clave va en ?clave=, en la cabecera "Authorization: Bearer <clave>" o en el cuerpo como "clave". En la base solo se guarda su hash.
//   POST /api/registro     → crea una nube nueva y devuelve su clave (sin clave; con límite por IP)
//   GET  /api/estado       → comprueba la clave
//   POST /api/sync         → { cambios: [movs], presupuesto?, desde } → aplica los cambios y devuelve lo cambiado desde "desde"
//   POST /api/apple-pay    → { importe, tienda, prueba? } → lo manda el atajo del iPhone en cada pago con Apple Pay
//   POST /api/pago         → texto de la notificación de Google Wallet (o { titulo, texto }) → lo manda MacroDroid en Android en cada pago
//   POST /api/gasto        → { texto: "5 euros bus" } → lo manda el atajo de Siri / doble toque (apuntar con la voz)
//   POST /api/borrar-nube  → { confirmar: true } → borra todos los datos de esa clave
//   GET  /api/grupos · POST /api/grupos/{crear,unirse,miembro,gasto,salir} → gastos compartidos (piso, viaje…)
//   POST /api/grupos/{cobro,confirmar,toque,datos} → cobrar deudas del grupo · GET /api/cobro/<id> · POST /api/cobro/<id>/pagado (sin clave)
//   GET  /api/push/clave · POST /api/push/{alta,baja,prueba} → avisos en el móvil (notificaciones push)
//   GET  /api/duelos · POST /api/duelos/{crear,unirse,salir} → duelos entre amigos (solo porcentajes, nunca euros)
//   GET  /api/ideas · POST /api/ideas/{votar,sugerir} → encuesta de la hoja de ruta (sin clave: se vota con un id del navegador)
//   GET  /api/uso?dias=7   → panel de uso (recuentos de nubes, apuntes y funciones), solo con la clave del dueño
//   GET  /api/ideas/resumen → resultados y sugerencias, solo con la clave del dueño (lo usa Jarvis)
import { enviarPush } from "../../compartido/push.js";
import { IDEAS } from "../../compartido/ideas.js";
import { fijosQueTocan } from "../../public/fijos.js";
import { avisarUsuario, cobroPublico, textoToque, METODOS } from "../../compartido/cobros.js";
import { marcador, cerrarSiToca, hoyMadrid as hoyDuelo, masDias, diasEntre, DURACION } from "../../compartido/duelos.js";
const TIPOS = { gasto: ["comida", "super", "transporte", "ocio", "ropa", "subs", "estudios", "otros"], ingreso: ["paga", "trabajo", "ventas", "regalo", "devolucion"] };
const NOMBRES = { comida: "Comida", super: "Súper", transporte: "Transporte", ocio: "Ocio", ropa: "Ropa", subs: "Suscripciones", estudios: "Estudios", otros: "Otros", devolucion: "Devolución", paga: "Paga", trabajo: "Trabajo", ventas: "Ventas", regalo: "Regalo" };
const MAX_MOVS = 50_000; // por persona: años de gastos
const AJUSTES = ["paga", "huchas", "retos", "insignias", "ocultos", "tema", "fijos", "limites", "variable", "limitesPeriodo"]; // ocultos: ids de gastos que no se enseñan en los círculos // lo que se guarda además de los movimientos y el presupuesto
const REGISTROS_POR_HORA = 5; // nubes nuevas por IP y hora (evita que alguien llene la base)

// Categoría según la tienda (lo que pone el datáfono). Se mira en orden: lo más concreto primero.
const REGLAS = [
  ["subs", /spotify|netflix|disney|hbo|\bmax\b|prime video|amazon prime|youtube|apple\.com|icloud|itunes|google (one|play|storage)|chatgpt|openai|crunchyroll|dazn|movistar|twitch|patreon|xbox game pass|playstation plus|nintendo online/i],
  ["comida", /uber ?eats|glovo|just ?eat|deliveroo|mcdonald|burger king|kfc|telepizza|domino|pizz|starbucks|montaditos|goiko|rodilla|taco bell|five guys|foster|vips|ginos|tgb|popeyes|subway|tim hortons|kebab|doner|sushi|wok|bar\b|cafe|caf[eé]ter|restaur|cervec|taberna|bocad|churr|helad|panader|pasteler|tapas/i],
  ["super", /mercadona|lidl|carrefour|\bdia\b|aldi|alcampo|eroski|consum|hipercor|supersol|cov[ií]ran|el jamon|ahorramas|bm supermercados|caprabo|bonpreu|spar|gadis|froiz|mas y mas|maskom|supercor|super\b|supermerc|hiper|alimentaci|fruter|carnic|ultramarinos/i],
  ["transporte", /renfe|tussam|metro|emt\b|alsa|avanza|damas|bus\b|autob|taxi|cabify|uber(?! ?eats)|bolt|free ?now|blablacar|ryanair|vueling|iberia|air europa|easyjet|ouigo|iryo|repsol|cepsa|moeve|\bbp\b|galp|shell|petronor|ballenoil|plenoil|gasolin|parking|aparcam|peaje|autopista|sevici|lime|cooltra|acciona/i],
  ["ocio", /cine|cinesa|yelmo|kinep|ocine|steam|playstation|nintendo|xbox|epic games|riot|blizzard|ticketmaster|entradas|eventbrite|fnac|game stop|gamestop|\bgame\b|bolera|karting|escape|museo|teatro|concierto|discoteca|pub\b|gimnas|gym|basic ?fit|mcfit|holiday gym/i],
  ["ropa", /zara|pull ?& ?bear|pull and bear|bershka|stradivarius|massimo|oysho|lefties|h ?& ?m|primark|mango|springfield|cortefiel|nike|adidas|puma|decathlon|jd sports|foot ?locker|sprinter|kiabi|c ?& ?a|uniqlo|shein|zalando|vans|converse|new balance|levi/i],
  ["estudios", /casa del libro|papeler|copister|reprograf|librer|udemy|coursera|platzi|domestika|campus|universidad|matr[ií]cula|academia|escuela/i],
];
// Palabras sueltas de cuando lo dices tú ("5 euros bus", "cena con los de clase")
// \b no entiende las tildes ("café"): se usan límites de letra Unicode
const palabra = (alts, flags = "iu") => new RegExp(`(?<![\\p{L}\\d])(?:${alts})(?![\\p{L}\\d])`, flags);
const PALABRAS = [
  ["transporte", palabra("bus|autob[uú]s|metro|tren|taxi|gasolina|abono|billete|parking|patinete|uber")],
  ["comida", palabra("caf[eé]|cena|comida|almuerzo|desayuno|men[uú]|bocata|bocadillo|pizza|burger|hamburguesa|kebab|copas?|cervezas?|tapas|merienda|chuches|helado|refresco")],
  ["super", palabra("s[uú]per|compra|supermercado|fruta")],
  ["ocio", palabra("cine|fiesta|discoteca|concierto|entradas?|juego|videojuego|bolera|gym|gimnasio|partido|f[uú]tbol|p[aá]del")],
  ["ropa", palabra("ropa|camiseta|pantal[oó]n|zapatillas|sudadera|chaqueta|zapatos|vestido")],
  ["estudios", palabra("libros?|apuntes|fotocopias|copias|material|cuaderno|matr[ií]cula|curso|academia")],
  ["subs", palabra("suscripci[oó]n|netflix|spotify|hbo|disney|prime")],
];
const categoria = (tienda) => (REGLAS.find(([, r]) => r.test(tienda || "")) || PALABRAS.find(([, r]) => r.test(tienda || "")) || ["otros"])[0];

// "12,50 €", "€12.50", "1.234,56", 12.5 → céntimos (con signo)
function centimos(v) {
  if (typeof v === "number") return Math.round(v * 100);
  let s = String(v ?? "").replace(/[^\d,.\-−]/g, "").replace("−", "-");
  const negativo = s.startsWith("-"); s = s.replace(/-/g, "");
  const coma = s.lastIndexOf(","), punto = s.lastIndexOf(".");
  if (coma >= 0 && punto >= 0) s = coma > punto ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  else if (coma >= 0) s = /,\d{1,2}$/.test(s) ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  else if (punto >= 0 && !/\.\d{1,2}$/.test(s)) s = s.replace(/\./g, "");
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) * (negativo ? -1 : 1) : 0;
}

// "MERCADONA S.A." → "Mercadona"
const bonita = (t) => {
  let s = String(t || "").replace(/\s+/g, " ").replace(/\b(s\.?a\.?u?|s\.?l\.?u?|sociedad|limitada)\.?$/i, "").replace(/[*#]+\s*\d*$/, "").trim();
  if (s && s === s.toUpperCase()) s = s.toLowerCase().replace(/(^|[\s.&'-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase());
  return s.slice(0, 60);
};

const json = (datos, estado = 200) => new Response(JSON.stringify(datos), { status: estado, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
const hoyMadrid = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" });
const euros = (c) => (c / 100).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
const sha256 = async (t) => [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t)))].map((b) => b.toString(16).padStart(2, "0")).join("");

// ---------- Claves ----------
// Al pegarla en Atajos se cuelan espacios o comillas y se pierden guiones: solo cuentan letras y números.
const limpiarClave = (t) => String(t || "").replace(/^\s*bearer\b/i, "").replace(/[^A-Za-z0-9]+/g, "");
// Claves nuevas: 32 letras y números (sin guiones, que el iPhone corta al copiar)
const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
function claveNueva() {
  const b = crypto.getRandomValues(new Uint8Array(32));
  return [...b].map((x) => ALFABETO[x % ALFABETO.length]).join("");
}
// Prueba cada sitio donde puede venir la clave; devuelve { usuario } o { dada } (la que ha llegado, para la pista)
async function identificar(peticion, cuerpo, env) {
  const url = new URL(peticion.url);
  const candidatas = [url.searchParams.get("clave"), peticion.headers.get("Authorization"), cuerpo?.clave].map(limpiarClave).filter((c) => c.length >= 20 && c.length <= 64);
  for (const c of new Set(candidatas)) {
    const u = await env.DB.prepare("SELECT id FROM usuarios WHERE clave_hash = ?1").bind(await sha256(c)).first();
    if (u) return { usuario: u.id };
  }
  return { dada: [url.searchParams.get("clave"), peticion.headers.get("Authorization"), cuerpo?.clave].map(limpiarClave).find(Boolean) || "" };
}
const pistaClave = (dada) => !dada ? "No ha llegado ninguna clave: copia la dirección completa con el botón Copiar de Bolsillo (Ajustes → Configurar Apple Pay) y pégala en «URL»."
  : dada.length !== 32 && dada.length !== 30 ? `La clave que ha llegado tiene ${dada.length} letras y números y debería tener 32: cópiala otra vez entera.`
  : "Esa clave no existe (¿el corrector ha cambiado alguna letra?). Cópiala otra vez con el botón Copiar de Bolsillo.";

async function registro(peticion, env) {
  const ip = await sha256("bolsillo:" + (peticion.headers.get("CF-Connecting-IP") || "?"));
  const haceUnaHora = Date.now() - 3600_000;
  const { n } = await env.DB.prepare("SELECT count(*) AS n FROM registros WHERE ip_hash = ?1 AND cuando > ?2").bind(ip, haceUnaHora).first();
  if (n >= REGISTROS_POR_HORA) return json({ error: "Has creado varias nubes seguidas. Espera un rato y vuelve a probar." }, 429);
  const clave = claveNueva(), id = "u" + Date.now().toString(36) + claveNueva().slice(0, 6);
  await env.DB.batch([
    env.DB.prepare("INSERT INTO usuarios (id, clave_hash, creado) VALUES (?1, ?2, ?3)").bind(id, await sha256(clave), new Date().toISOString()),
    env.DB.prepare("INSERT INTO registros (ip_hash, cuando) VALUES (?1, ?2)").bind(ip, Date.now()),
    env.DB.prepare("DELETE FROM registros WHERE cuando < ?1").bind(haceUnaHora),
  ]);
  return json({ ok: true, clave });
}

// ---------- Datos ----------
// «2026-13-45» tiene buena pinta pero no existe: al convertirla, la fecha cambia
const fechaReal = (t) => { const d = new Date(t + "T12:00:00Z"); return !isNaN(d) && d.toISOString().slice(0, 10) === t; };
function movValido(m) {
  if (!m || typeof m.id !== "string" || !/^[\w-]{4,40}$/.test(m.id) || !TIPOS[m.tipo]) return null;
  const importe = Number(m.importe);
  if (!Number.isInteger(importe) || importe <= 0 || importe > 10_000_000) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(m.fecha || "") || !fechaReal(m.fecha)) return null;
  return { id: m.id, tipo: m.tipo, cat: TIPOS[m.tipo].includes(m.cat) ? m.cat : TIPOS[m.tipo].at(-1), importe, nota: String(m.nota || "").slice(0, 60),
    fecha: m.fecha, creado: String(m.creado || new Date().toISOString()).slice(0, 30), actualizado: String(m.actualizado || m.creado || new Date().toISOString()).slice(0, 30),
    borrado: m.borrado ? 1 : 0, origen: ["applepay", "wallet", "voz", "fijo"].includes(m.origen) ? m.origen : "app" };
}

async function sync(usuario, cuerpo, env) {
  const ahora = Date.now();
  const cambios = (Array.isArray(cuerpo.cambios) ? cuerpo.cambios : []).slice(0, 2000).map(movValido).filter(Boolean);
  if (cambios.length) {
    const { n } = await env.DB.prepare("SELECT count(*) AS n FROM movs WHERE usuario = ?1").bind(usuario).first();
    if (n + cambios.length > MAX_MOVS) return json({ error: "Tu nube está llena" }, 413);
  }
  // Lo que cambia el usuario en la app siempre manda (gana el último en llegar): no se comparan relojes, que en un PC pueden ir atrasados.
  // Apple Pay solo crea movimientos nuevos, así que nunca pisa un cambio tuyo.
  const insertar = env.DB.prepare(`INSERT INTO movs (usuario, id, tipo, cat, importe, nota, fecha, creado, actualizado, borrado, origen, servido) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)
    ON CONFLICT(usuario, id) DO UPDATE SET tipo = excluded.tipo, cat = excluded.cat, importe = excluded.importe, nota = excluded.nota, fecha = excluded.fecha,
    actualizado = excluded.actualizado, borrado = excluded.borrado, servido = excluded.servido`);
  const lote = cambios.map((m) => insertar.bind(usuario, m.id, m.tipo, m.cat, m.importe, m.nota, m.fecha, m.creado, m.actualizado, m.borrado, m.origen, ahora));
  if (cuerpo.presupuesto && typeof cuerpo.presupuesto === "object") {
    const p = cuerpo.presupuesto, valor = Number.isInteger(p.valor) && p.valor > 0 ? String(p.valor) : null;
    lote.push(env.DB.prepare(`INSERT INTO ajustes (usuario, clave, valor, actualizado, servido) VALUES (?1, 'presupuesto', ?2, ?3, ?4)
      ON CONFLICT(usuario, clave) DO UPDATE SET valor = excluded.valor, actualizado = excluded.actualizado, servido = excluded.servido`)
      .bind(usuario, valor, String(p.actualizado || new Date().toISOString()).slice(0, 30), ahora));
  }
  // Paga, huchas, retos e insignias: se guardan como JSON, gana el último en llegar
  for (const [clave, a] of Object.entries(cuerpo.ajustes && typeof cuerpo.ajustes === "object" ? cuerpo.ajustes : {})) {
    if (!AJUSTES.includes(clave) || !a || typeof a !== "object") continue;
    const valor = JSON.stringify(a.valor ?? null);
    if (valor.length > 20_000) continue;
    lote.push(env.DB.prepare(`INSERT INTO ajustes (usuario, clave, valor, actualizado, servido) VALUES (?1, ?2, ?3, ?4, ?5)
      ON CONFLICT(usuario, clave) DO UPDATE SET valor = excluded.valor, actualizado = excluded.actualizado, servido = excluded.servido`)
      .bind(usuario, clave, valor, String(a.actualizado || new Date().toISOString()).slice(0, 30), ahora));
  }
  lote.push(env.DB.prepare("UPDATE usuarios SET ultimo_uso = ?2 WHERE id = ?1").bind(usuario, new Date().toISOString().slice(0, 10)));
  await env.DB.batch(lote);
  const { results: filas } = await env.DB.prepare("SELECT clave, valor, actualizado FROM ajustes WHERE usuario = ?1").bind(usuario).all();
  // Gastos e ingresos fijos que ya tocan: se apuntan una sola vez por mes (si ya existe, aunque lo borraras, no se toca)
  const fijos = filas.find((f) => f.clave === "fijos");
  if (fijos) {
    let lista = []; try { lista = JSON.parse(fijos.valor) || []; } catch {}
    const cuando = new Date().toISOString();
    const nuevos = fijosQueTocan(lista, hoyMadrid()).map((m) => movValido({ ...m, creado: cuando, actualizado: cuando, origen: "fijo" })).filter(Boolean);
    const apuntar = env.DB.prepare(`INSERT INTO movs (usuario, id, tipo, cat, importe, nota, fecha, creado, actualizado, borrado, origen, servido) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 0, 'fijo', ?10)
      ON CONFLICT(usuario, id) DO NOTHING`);
    if (nuevos.length) await env.DB.batch(nuevos.map((m) => apuntar.bind(usuario, m.id, m.tipo, m.cat, m.importe, m.nota, m.fecha, m.creado, m.actualizado, ahora)));
  }
  // Se devuelve con 10 s de solape: si dos escrituras caen en el mismo instante, no se pierde ninguna (la app ignora repetidos)
  const desde = Math.max(0, Number(cuerpo.desde) || 0) - 10_000;
  const { results } = await env.DB.prepare("SELECT id, tipo, cat, importe, nota, fecha, creado, actualizado, borrado, origen, servido FROM movs WHERE usuario = ?1 AND servido > ?2 ORDER BY servido").bind(usuario, desde).all();
  const p = filas.find((f) => f.clave === "presupuesto");
  const ajustes = {};
  for (const f of filas) if (AJUSTES.includes(f.clave)) { try { ajustes[f.clave] = { valor: JSON.parse(f.valor), actualizado: f.actualizado }; } catch {} }
  return json({ movs: results.map((m) => ({ ...m, borrado: Boolean(m.borrado) })), presupuesto: p ? { valor: p.valor ? Number(p.valor) : null, actualizado: p.actualizado } : null, ajustes, servido: ahora });
}

// ---------- Apuntar con la voz: "gasté 5 euros en el bus", "12,50 cena", "me han dado 20 euros de paga" ----------
function leerFrase(frase) {
  const t = String(frase || "").replace(/\s+/g, " ").trim().slice(0, 200);
  const m = t.match(/(\d+(?:[.,]\d{1,2})?)\s*(?:€|euros?|eur\b|pavos)?(?:\s*con\s+(\d{1,2})\s*(?:c[eé]ntimos)?)?/i);
  if (!m) return null;
  const importe = centimos(m[1]) + (m[2] ? Number(m[2]) : 0);
  const concepto = (t.slice(0, m.index) + " " + t.slice(m.index + m[0].length))
    .replace(palabra("oye siri|apuntar?|me he gastado|he gastado|gast[eé]|pagu[eé]|he pagado|me ha costado|cost[oó]|un gasto de|un ingreso de|me han dado|me dieron|he cobrado|cobr[eé]|me han pagado|me pagaron|me han ingresado|vend[ií]|euros?|en|de|del|el|la|los|las|un|una|unos|unas|por|para|hoy", "giu"), " ").replace(/€/g, " ")
    .replace(/[.,;:!¡?¿]+/g, " ").replace(/\s+/g, " ").trim();
  const ingreso = palabra("me han dado|me dieron|cobr[eé]|he cobrado|ingres[eé]|me han ingresado|me han pagado|me pagaron|gan[eé]|vend[ií]|paga|propina|regalo").test(t);
  const catIngreso = /vend/i.test(t) ? "ventas" : /trabaj|n[oó]mina|sueldo|cobr|propina/i.test(t) ? "trabajo" : /regalo|cumple/i.test(t) ? "regalo" : "paga";
  return { importe, tipo: ingreso ? "ingreso" : "gasto", cat: ingreso ? catIngreso : categoria(concepto), nota: concepto.charAt(0).toUpperCase() + concepto.slice(1, 60) };
}

async function gastoVoz(usuario, cuerpo, env) {
  const r = cuerpo.texto ? leerFrase(cuerpo.texto) : null;
  if (!r || !r.importe || r.importe <= 0) return json({ error: "No he oído ninguna cantidad. Prueba con algo como «5 euros bus».", texto: "No he oído ninguna cantidad. Di algo como: 5 euros bus." }, 400);
  const mov = { id: "vz" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), ...r, fecha: hoyMadrid(), creado: new Date().toISOString() };
  if (cuerpo.prueba) return json({ ok: true, prueba: true, texto: `Se apuntaría: ${mov.tipo === "ingreso" ? "+" : "−"}${euros(mov.importe)} en ${NOMBRES[mov.cat] || mov.cat}${mov.nota ? ` (${mov.nota})` : ""}` });
  await env.DB.prepare("INSERT INTO movs (usuario, id, tipo, cat, importe, nota, fecha, creado, actualizado, borrado, origen, servido) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?8, 0, 'voz', ?9)")
    .bind(usuario, mov.id, mov.tipo, mov.cat, mov.importe, mov.nota, mov.fecha, mov.creado, Date.now()).run();
  return json({ ok: true, texto: `Apuntado: ${mov.tipo === "ingreso" ? "+" : "−"}${euros(mov.importe)} en ${NOMBRES[mov.cat] || mov.cat.charAt(0).toUpperCase() + mov.cat.slice(1)}${mov.nota ? ` (${mov.nota})` : ""}` });
}

// ---------- Grupos ----------
const CODIGO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const codigoNuevo = () => [...crypto.getRandomValues(new Uint8Array(6))].map((x) => CODIGO[x % CODIGO.length]).join("");
const idCorto = (p) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const idCobro = () => [...crypto.getRandomValues(new Uint8Array(10))].map((x) => CODIGO[x % CODIGO.length]).join(""); // 32^10: imposible de adivinar
const nombreMiembro = (t) => String(t || "").replace(/\s+/g, " ").trim().slice(0, 24);
// Freno contra probar códigos de invitación al azar: 20 fallos por hora y nube (quien se equivoca al teclear ni lo nota)
const FALLOS_CODIGO = 20;
async function codigoFrenado(usuario, env) {
  const { n } = await env.DB.prepare("SELECT count(*) AS n FROM limites WHERE ip_hash = ?1 AND accion = 'codigo' AND cuando > ?2").bind("u:" + usuario, Date.now() - 36e5).first();
  return n >= FALLOS_CODIGO;
}
const codigoFallido = (usuario, env) => env.DB.prepare("INSERT INTO limites (ip_hash, accion, cuando) VALUES (?1, 'codigo', ?2)").bind("u:" + usuario, Date.now()).run();
const demasiadosCodigos = () => json({ error: "Demasiados códigos que no existen. Espera un rato y pídele el código a tu amigo otra vez." }, 429);
const miGrupo = (usuario, grupo, env) => env.DB.prepare("SELECT id FROM miembros WHERE grupo = ?1 AND usuario = ?2").bind(grupo, usuario).first();

async function verGrupos(usuario, env) {
  const { results: mios } = await env.DB.prepare("SELECT g.id, g.nombre, g.codigo, g.tipo, m.id AS yo FROM grupos g JOIN miembros m ON m.grupo = g.id WHERE m.usuario = ?1 ORDER BY g.creado").bind(usuario).all();
  const grupos = [];
  for (const g of mios) {
    const [{ results: miembros }, { results: gastos }, { results: cobros }] = await Promise.all([
      env.DB.prepare("SELECT id, nombre, usuario IS NOT NULL AS con_app FROM miembros WHERE grupo = ?1 ORDER BY creado").bind(g.id).all(),
      env.DB.prepare("SELECT id, tipo, pagador, importe, concepto, reparto, fecha, creado FROM gastos_grupo WHERE grupo = ?1 AND borrado = 0 ORDER BY fecha DESC, creado DESC LIMIT 2000").bind(g.id).all(),
      env.DB.prepare("SELECT id, de, a, importe, estado, metodo, actualizado, ultimo_toque FROM cobros WHERE grupo = ?1 AND (estado <> 'confirmado' OR actualizado > ?2) ORDER BY actualizado DESC LIMIT 100").bind(g.id, new Date(Date.now() - 7 * 864e5).toISOString()).all(),
    ]);
    grupos.push({ ...g, miembros: miembros.map((m) => ({ ...m, con_app: Boolean(m.con_app) })), gastos: gastos.map((x) => ({ ...x, reparto: JSON.parse(x.reparto) })), cobros });
  }
  const misDatos = await env.DB.prepare("SELECT bizum, paypal, revolut FROM cobro_datos WHERE usuario = ?1").bind(usuario).first();
  return json({ grupos, misDatos: misDatos || null });
}

async function grupos(accion, usuario, cuerpo, env) {
  if (accion === "crear") {
    const nombre = String(cuerpo.nombre || "").trim().slice(0, 40), yo = nombreMiembro(cuerpo.minombre);
    if (!nombre || !yo) return json({ error: "Pon nombre al grupo y tu nombre" }, 400);
    const { n } = await env.DB.prepare("SELECT count(*) AS n FROM miembros m JOIN grupos g ON g.id = m.grupo WHERE m.usuario = ?1 AND g.tipo = 'grupo'").bind(usuario).first();
    if (n >= 30) return json({ error: "Ya estás en 30 grupos" }, 400);
    const id = idCorto("g"), ahora = new Date().toISOString();
    await env.DB.batch([
      env.DB.prepare("INSERT INTO grupos (id, nombre, codigo, creado) VALUES (?1, ?2, ?3, ?4)").bind(id, nombre, codigoNuevo(), ahora),
      env.DB.prepare("INSERT INTO miembros (grupo, id, nombre, usuario, creado) VALUES (?1, ?2, ?3, ?4, ?5)").bind(id, idCorto("m"), yo, usuario, ahora),
    ]);
    return json({ ok: true, id });
  }
  if (accion === "unirse") {
    if (await codigoFrenado(usuario, env)) return demasiadosCodigos();
    const g = await env.DB.prepare("SELECT id, nombre FROM grupos WHERE codigo = ?1").bind(String(cuerpo.codigo || "").toUpperCase().replace(/[^A-Z0-9]/g, "")).first();
    if (!g) { await codigoFallido(usuario, env); return json({ error: "No hay ningún grupo con ese código" }, 404); }
    if (await miGrupo(usuario, g.id, env)) return json({ ok: true, id: g.id });
    const { results: miembros } = await env.DB.prepare("SELECT id, nombre, usuario FROM miembros WHERE grupo = ?1").bind(g.id).all();
    // Sin nombre: se le enseñan los nombres libres por si ya le habían añadido sin app
    if (!cuerpo.miembro && !cuerpo.minombre) return json({ ok: false, grupo: g.nombre, libres: miembros.filter((m) => !m.usuario).map(({ id, nombre }) => ({ id, nombre })) });
    if (cuerpo.miembro) {
      const libre = miembros.find((m) => m.id === cuerpo.miembro && !m.usuario);
      if (!libre) return json({ error: "Ese nombre ya lo ha cogido otra persona" }, 409);
      await env.DB.prepare("UPDATE miembros SET usuario = ?1 WHERE grupo = ?2 AND id = ?3").bind(usuario, g.id, libre.id).run();
    } else {
      if (miembros.length >= 30) return json({ error: "El grupo está lleno (30 personas)" }, 400);
      await env.DB.prepare("INSERT INTO miembros (grupo, id, nombre, usuario, creado) VALUES (?1, ?2, ?3, ?4, ?5)").bind(g.id, idCorto("m"), nombreMiembro(cuerpo.minombre), usuario, new Date().toISOString()).run();
    }
    return json({ ok: true, id: g.id });
  }
  // Préstamo suelto a un amigo (o de un amigo): va a un grupo de dos, uno por amigo, para reutilizar cobros, toques y avisos
  if (accion === "prestamo") return await prestamo(usuario, cuerpo, env);
  // El resto necesita ser del grupo
  const grupo = String(cuerpo.grupo || "");
  const yo = await miGrupo(usuario, grupo, env);
  if (!yo) return json({ error: "No eres de ese grupo" }, 403);
  if (accion === "miembro") {
    const nombre = nombreMiembro(cuerpo.nombre);
    if (!nombre) return json({ error: "Falta el nombre" }, 400);
    const { n } = await env.DB.prepare("SELECT count(*) AS n FROM miembros WHERE grupo = ?1").bind(grupo).first();
    if (n >= 30) return json({ error: "El grupo está lleno (30 personas)" }, 400);
    await env.DB.prepare("INSERT INTO miembros (grupo, id, nombre, usuario, creado) VALUES (?1, ?2, ?3, NULL, ?4)").bind(grupo, idCorto("m"), nombre, new Date().toISOString()).run();
    return json({ ok: true });
  }
  if (accion === "gasto") {
    const x = cuerpo.gasto || {};
    const { results: miembros } = await env.DB.prepare("SELECT id FROM miembros WHERE grupo = ?1").bind(grupo).all();
    const ids = new Set(miembros.map((m) => m.id));
    const importe = Number(x.importe), reparto = x.reparto && typeof x.reparto === "object" ? x.reparto : {};
    const partes = Object.entries(reparto).filter(([id, c]) => ids.has(id) && Number.isInteger(c) && c >= 0);
    if (!/^[\w-]{4,40}$/.test(x.id || "") || !ids.has(x.pagador) || !Number.isInteger(importe) || importe <= 0 || importe > 10_000_000 || !partes.length
      || partes.reduce((s, [, c]) => s + c, 0) !== importe || !/^\d{4}-\d{2}-\d{2}$/.test(x.fecha || "")) return json({ error: "Gasto no válido" }, 400);
    await env.DB.prepare(`INSERT INTO gastos_grupo (grupo, id, tipo, pagador, importe, concepto, reparto, fecha, creado, autor, borrado, servido) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)
      ON CONFLICT(grupo, id) DO UPDATE SET tipo = excluded.tipo, pagador = excluded.pagador, importe = excluded.importe, concepto = excluded.concepto, reparto = excluded.reparto,
      fecha = excluded.fecha, borrado = excluded.borrado, servido = excluded.servido`)
      .bind(grupo, x.id, x.tipo === "pago" ? "pago" : "gasto", x.pagador, importe, String(x.concepto || "").slice(0, 60), JSON.stringify(Object.fromEntries(partes)), x.fecha, new Date().toISOString(), yo.id, x.borrado ? 1 : 0, Date.now()).run();
    if (x.tipo === "pago" && !x.borrado && partes.length === 1) await env.DB.prepare("UPDATE cobros SET estado = 'confirmado', actualizado = ?4 WHERE grupo = ?1 AND de = ?2 AND a = ?3 AND estado <> 'confirmado'").bind(grupo, x.pagador, partes[0][0], new Date().toISOString()).run();
    return json({ ok: true });
  }
  if (accion === "salir") {
    await env.DB.prepare("UPDATE miembros SET usuario = NULL WHERE grupo = ?1 AND usuario = ?2").bind(grupo, usuario).run(); // su nombre se queda en las cuentas
    return json({ ok: true });
  }
  // Pedir o pagar una deuda: crea (o reutiliza) el cobro de esa pareja y devuelve su enlace /c/<id>
  if (accion === "cobro") {
    const { de, a } = cuerpo, importe = Number(cuerpo.importe);
    const { results: miembros } = await env.DB.prepare("SELECT id FROM miembros WHERE grupo = ?1").bind(grupo).all();
    const ids = new Set(miembros.map((m) => m.id));
    if (!ids.has(de) || !ids.has(a) || de === a || ![de, a].includes(yo.id) || !Number.isInteger(importe) || importe <= 0 || importe > 10_000_000) return json({ error: "Cobro no válido" }, 400);
    const ahora = new Date().toISOString();
    const abierto = await env.DB.prepare("SELECT id, estado, importe FROM cobros WHERE grupo = ?1 AND de = ?2 AND a = ?3 AND estado IN ('pendiente', 'pagado') ORDER BY creado DESC LIMIT 1").bind(grupo, de, a).first();
    let id = abierto?.id;
    if (abierto && abierto.estado === "pendiente" && abierto.importe !== importe) await env.DB.prepare("UPDATE cobros SET importe = ?2, actualizado = ?3 WHERE id = ?1").bind(id, importe, ahora).run();
    if (!abierto) { id = idCobro(); await env.DB.prepare("INSERT INTO cobros (id, grupo, de, a, importe, creado, actualizado) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6)").bind(id, grupo, de, a, importe, ahora).run(); }
    const datos = a === yo.id ? await env.DB.prepare("SELECT bizum, paypal, revolut FROM cobro_datos WHERE usuario = ?1").bind(usuario).first() : null;
    return json({ ok: true, id, estado: abierto?.estado || "pendiente", sinDatos: a === yo.id && !datos });
  }
  // Quien cobra confirma (o no) que le ha llegado lo que el otro dice haber pagado
  if (accion === "confirmar" || accion === "toque") {
    const c = await env.DB.prepare(`SELECT c.*, md.usuario AS deudor, ma.nombre AS acreedor FROM cobros c JOIN miembros md ON md.grupo = c.grupo AND md.id = c.de
      JOIN miembros ma ON ma.grupo = c.grupo AND ma.id = c.a WHERE c.id = ?1 AND c.grupo = ?2`).bind(String(cuerpo.cobro || ""), grupo).first();
    if (!c) return json({ error: "Ese cobro ya no existe" }, 404);
    if (c.a !== yo.id) return json({ error: "Solo puede hacerlo quien cobra" }, 403);
    const ahora = new Date().toISOString();
    if (accion === "confirmar") {
      if (c.estado === "confirmado") return json({ ok: true });
      if (cuerpo.si) {
        await env.DB.batch([
          env.DB.prepare(`INSERT INTO gastos_grupo (grupo, id, tipo, pagador, importe, concepto, reparto, fecha, creado, autor, borrado, servido) VALUES (?1, ?2, 'pago', ?3, ?4, ?5, ?6, ?7, ?8, ?9, 0, ?10)
            ON CONFLICT(grupo, id) DO NOTHING`).bind(grupo, "cb" + c.id, c.de, c.importe, c.metodo ? `Pago (${METODOS[c.metodo] || c.metodo})` : "Pago", JSON.stringify({ [c.a]: c.importe }), hoyMadrid(), ahora, yo.id, Date.now()),
          env.DB.prepare("UPDATE cobros SET estado = 'confirmado', actualizado = ?2 WHERE id = ?1").bind(c.id, ahora),
        ]);
        await avisarUsuario(env, c.deudor, { titulo: `${c.acreedor} ha confirmado tu pago`, cuerpo: `${euros(c.importe)} saldados. Estáis en paz.`, etiqueta: "cobro-" + c.id, url: "/c/" + c.id });
      } else {
        await env.DB.prepare("UPDATE cobros SET estado = 'pendiente', metodo = NULL, actualizado = ?2 WHERE id = ?1").bind(c.id, ahora).run();
        await avisarUsuario(env, c.deudor, { titulo: `A ${c.acreedor} no le han llegado los ${euros(c.importe)}`, cuerpo: "Revisa el pago y vuelve a avisarle cuando esté.", etiqueta: "cobro-" + c.id, url: "/c/" + c.id });
      }
      return json({ ok: true });
    }
    // Toque: como mucho uno al día por cobro
    if (c.estado === "confirmado") return json({ error: "Ya está pagado" }, 400);
    if (c.ultimo_toque && Date.now() - new Date(c.ultimo_toque) < 20 * 36e5) return json({ error: "Ya le diste un toque hoy. Mañana puedes darle otro." }, 429);
    await env.DB.prepare("UPDATE cobros SET ultimo_toque = ?2 WHERE id = ?1").bind(c.id, ahora).run();
    const llegados = await avisarUsuario(env, c.deudor, { titulo: `${c.acreedor} te da un toque`, cuerpo: textoToque(c.importe, c.acreedor, Boolean(cuerpo.picante)), etiqueta: "cobro-" + c.id, url: "/c/" + c.id });
    return json({ ok: true, llegados, conApp: Boolean(c.deudor) });
  }
  return json({ error: "No existe" }, 404);
}

// «Le he dejado 20 € a Dani» (dejo) o «Dani me ha dejado 20 €» (me): se apunta en el préstamo con Dani, o se crea.
// Se busca por el nombre del amigo sin tildes ni mayúsculas, así «dani» y «Dani» son el mismo préstamo.
const comparable = (t) => String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
async function prestamo(usuario, cuerpo, env) {
  const amigo = nombreMiembro(cuerpo.amigo), importe = Number(cuerpo.importe), dejo = cuerpo.direccion !== "me";
  if (!Number.isInteger(importe) || importe <= 0 || importe > 10_000_000) return json({ error: "Pon cuánto dinero" }, 400);
  let g = null;
  if (cuerpo.grupo) {
    g = await env.DB.prepare(`SELECT g.id, me.id AS yo, otro.id AS otro FROM grupos g JOIN miembros me ON me.grupo = g.id AND me.usuario = ?2
      JOIN miembros otro ON otro.grupo = g.id AND otro.id <> me.id WHERE g.id = ?1 AND g.tipo = 'prestamo'`).bind(String(cuerpo.grupo), usuario).first();
    if (!g) return json({ error: "Ese préstamo ya no existe" }, 404);
  } else {
    if (!amigo) return json({ error: "Pon a quién" }, 400);
    const { results } = await env.DB.prepare(`SELECT g.id, me.id AS yo, otro.id AS otro, otro.nombre FROM grupos g JOIN miembros me ON me.grupo = g.id AND me.usuario = ?1
      JOIN miembros otro ON otro.grupo = g.id AND otro.id <> me.id WHERE g.tipo = 'prestamo'`).bind(usuario).all();
    g = results.find((x) => comparable(x.nombre) === comparable(amigo));
    if (!g) {
      if (results.length >= 50) return json({ error: "Ya tienes 50 préstamos. Borra alguno que esté saldado." }, 400);
      g = { id: idCorto("g"), yo: idCorto("m"), otro: idCorto("m") + "b" };
      const ahora = new Date().toISOString();
      await env.DB.batch([
        env.DB.prepare("INSERT INTO grupos (id, nombre, codigo, creado, tipo) VALUES (?1, ?2, ?3, ?4, 'prestamo')").bind(g.id, amigo, codigoNuevo(), ahora),
        env.DB.prepare("INSERT INTO miembros (grupo, id, nombre, usuario, creado) VALUES (?1, ?2, ?3, ?4, ?5)").bind(g.id, g.yo, nombreMiembro(cuerpo.minombre) || "Yo", usuario, ahora),
        env.DB.prepare("INSERT INTO miembros (grupo, id, nombre, usuario, creado) VALUES (?1, ?2, ?3, NULL, ?4)").bind(g.id, g.otro, amigo, ahora),
      ]);
    }
  }
  // Quien deja el dinero es quien «paga»; quien lo recibe lo debe entero. Cada préstamo nuevo vuelve a contar los recordatorios desde cero.
  const pagador = dejo ? g.yo : g.otro, recibe = dejo ? g.otro : g.yo, ahora = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO gastos_grupo (grupo, id, tipo, pagador, importe, concepto, reparto, fecha, creado, autor, borrado, servido) VALUES (?1, ?2, 'gasto', ?3, ?4, ?5, ?6, ?7, ?8, ?9, 0, ?10)`)
      .bind(g.id, "pr" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), pagador, importe, String(cuerpo.concepto || "").trim().slice(0, 60) || "Préstamo", JSON.stringify({ [recibe]: importe }), hoyMadrid(), ahora, g.yo, Date.now()),
    env.DB.prepare("UPDATE miembros SET recordado = NULL, recordatorios = 0 WHERE grupo = ?1").bind(g.id),
  ]);
  return json({ ok: true, id: g.id });
}

// Cómo quieres que te paguen tus amigos (se ve solo en tus enlaces de cobro)
const soloDigitos = (t) => String(t || "").replace(/[^\d+]/g, "").replace(/^(\+|00)34/, "");
const usuarioDe = (t) => String(t || "").trim().replace(/^@/, "").replace(/^(https?:\/\/)?(www\.)?(paypal\.me|revolut\.me)\//i, "").replace(/[/?#].*$/, "");
async function guardarDatosCobro(usuario, cuerpo, env) {
  const bizum = soloDigitos(cuerpo.bizum), paypal = usuarioDe(cuerpo.paypal), revolut = usuarioDe(cuerpo.revolut).toLowerCase();
  if (bizum && !/^[67]\d{8}$/.test(bizum)) return json({ error: "El Bizum tiene que ser un móvil español de 9 cifras" }, 400);
  if (paypal && !/^[A-Za-z0-9]{1,20}$/.test(paypal)) return json({ error: "Ese usuario de PayPal.me no es válido" }, 400);
  if (revolut && !/^[a-z0-9._-]{3,30}$/.test(revolut)) return json({ error: "Ese usuario de Revolut no es válido" }, 400);
  if (!bizum && !paypal && !revolut) await env.DB.prepare("DELETE FROM cobro_datos WHERE usuario = ?1").bind(usuario).run();
  else await env.DB.prepare(`INSERT INTO cobro_datos (usuario, bizum, paypal, revolut, actualizado) VALUES (?1, ?2, ?3, ?4, ?5)
    ON CONFLICT(usuario) DO UPDATE SET bizum = excluded.bizum, paypal = excluded.paypal, revolut = excluded.revolut, actualizado = excluded.actualizado`).bind(usuario, bizum || null, paypal || null, revolut || null, new Date().toISOString()).run();
  return json({ ok: true, datos: { bizum: bizum || null, paypal: paypal || null, revolut: revolut || null } });
}

// Desde el enlace de cobro (sin clave: quien debe puede no tener la app): ver el cobro y avisar de que ya ha pagado
async function cobroDesdeEnlace(id, accion, request, cuerpo, env) {
  const c = await cobroPublico(env, id);
  if (!c) return json({ error: "Este enlace de cobro no existe" }, 404);
  if (!accion && request.method === "GET") return json(c);
  if (accion === "pagado" && request.method === "POST") {
    if (c.estado !== "pendiente") return json({ ok: true, estado: c.estado }); // ya avisado: no cuenta como intento
    // Freno por conexión, generoso: en una residencia o en la uni mucha gente sale a internet con la misma IP
    if (!(await limitar(request, env, "pagado", 30, 36e5))) return json({ error: "Demasiados intentos. Prueba en un rato." }, 429);
    const metodo = Object.keys(METODOS).includes(cuerpo.metodo) ? cuerpo.metodo : "otro";
    const fila = await env.DB.prepare("SELECT ma.usuario FROM cobros co JOIN miembros ma ON ma.grupo = co.grupo AND ma.id = co.a WHERE co.id = ?1").bind(id).first();
    await env.DB.prepare("UPDATE cobros SET estado = 'pagado', metodo = ?2, actualizado = ?3 WHERE id = ?1 AND estado = 'pendiente'").bind(id, metodo, new Date().toISOString()).run();
    await avisarUsuario(env, fila?.usuario, { titulo: `${c.de} dice que te ha pagado ${euros(c.importe)}`, cuerpo: `${metodo === "otro" ? "" : `Por ${METODOS[metodo]}. `}Toca para confirmar que te ha llegado.`, etiqueta: "cobro-" + id, url: "/?cobro=" + id });
    return json({ ok: true, estado: "pagado" });
  }
  return json({ error: "No existe" }, 404);
}

// El atajo «de un toque» puede mandar la transacción entera como texto («Mercadona 12,50 €», «12,50 € en LIDL», con fecha…):
// de ahí se sacan el importe (la cifra con céntimos o con €) y la tienda (lo que queda, sin fechas ni horas)
function leerTransaccion(texto) {
  const t = String(texto || "").replace(/\s+/g, " ").trim().slice(0, 300);
  const m = t.match(/-?\s?(?:€\s?)?\d{1,3}(?:[.\s]\d{3})*(?:,\d{1,2})(?:\s?€)?|-?\s?(?:€\s?)?\d+(?:[.,]\d{1,2})?\s?(?:€|EUR\b)|-?€\s?\d+(?:[.,]\d{1,2})?/i);
  if (!m) return {};
  const tienda = (t.slice(0, m.index) + " " + t.slice(m.index + m[0].length))
    .replace(/\b(visa|mastercard|master|amex|maestro)\b\s*[•*·.]*\s*\d{0,4}/gi, " ").replace(/[•*]{2,}\s*\d{2,4}/g, " ") // la tarjeta no es la tienda
    .replace(/\b\d{1,2}[/:.-]\d{1,2}(?:[/:.-]\d{2,4})?\b/g, " ").replace(/\b(importe|comercio|tarjeta|pago|compra|has pagado|pagado|realizad[oa]|eur|euros|en|de|con)\b\s*:?/gi, " ").replace(/[|·,;:]+/g, " ").replace(/[^\p{L}\p{N}&'.()\- ]/gu, " ").replace(/\s+/g, " ").trim();
  return { importe: m[0], tienda };
}

// Android: MacroDroid manda la notificación de Google Wallet tal cual («Mercadona» + «12,50 €»).
// Wallet también avisa de cosas que no son pagos: sin importe, se ignora sin dar error.
// La misma notificación puede llegar dos veces (se actualiza): si en 3 minutos llega el mismo importe y tienda, no se repite.
async function pagoWallet(usuario, cuerpo, crudo, env, esperar) {
  const texto = cuerpo.transaccion || [cuerpo.titulo, cuerpo.texto].filter(Boolean).join(" ") || crudo;
  const leido = leerTransaccion(texto);
  if (!centimos(leido.importe)) return json({ ok: true, ignorado: true, texto: "No parece un pago: no se apunta nada" });
  if (cuerpo.prueba) return applePay(usuario, { ...leido, prueba: true }, env, "wallet");
  const c = Math.abs(centimos(leido.importe)), hace = new Date(Date.now() - 3 * 60_000).toISOString();
  const repe = await env.DB.prepare("SELECT 1 FROM movs WHERE usuario = ?1 AND origen = 'wallet' AND importe = ?2 AND nota = ?3 AND creado > ?4 LIMIT 1")
    .bind(usuario, c, bonita(leido.tienda), hace).first();
  if (repe) return json({ ok: true, repetido: true, texto: "Ya estaba apuntado" });
  return applePay(usuario, leido, env, "wallet", esperar);
}

// El periodo de las cuentas (mes natural, de paga a paga o de semana a semana), igual que en la app: ini entra, fin no.
// paga: { dia: 15 } cada mes ese día, o { semana: 4 } cada semana ese día (0 domingo … 6 sábado)
const masDiasISO = (iso, n) => new Date(Date.parse(iso + "T12:00:00Z") + n * 864e5).toISOString().slice(0, 10);
function periodoDe(hoy, paga) {
  if (Number.isInteger(paga?.semana)) {
    const ini = masDiasISO(hoy, -((new Date(hoy + "T12:00:00Z").getUTCDay() - paga.semana + 7) % 7));
    return { ini, fin: masDiasISO(ini, 7) };
  }
  const diaPaga = Number(paga?.dia) || 0, [a, m] = hoy.split("-").map(Number);
  const enMes = (an, me) => new Date(Date.UTC(an, me, diaPaga > 1 ? Math.min(diaPaga, new Date(Date.UTC(an, me + 1, 0)).getUTCDate()) : 1)).toISOString().slice(0, 10);
  let ini = enMes(a, m - 1);
  if (ini > hoy) ini = enMes(a, m - 2);
  const [ia, im] = ini.split("-").map(Number);
  return { ini, fin: enMes(ia, im) };
}
// Los mismos textos que la app al apuntar a mano
function textoLimite(antes, ahora, limite, nombre) {
  if (ahora > limite && antes <= limite) return `Te has pasado de tu límite de ${nombre}: ${euros(ahora)} de ${euros(limite)}.`;
  if (ahora >= limite && antes < limite) return `Has llegado a tu límite de ${nombre} (${euros(limite)}).`;
  if (antes > limite) return `Ya vas ${euros(ahora - limite)} por encima de tu límite de ${nombre}.`;
  if (ahora >= limite * 0.8 && antes < limite * 0.8) return `Ojo: llevas ${euros(ahora)} de ${euros(limite)} en ${nombre}.`;
  return "";
}
// Si el pago te acerca o te pasa de tu límite de esa categoría, lo dice el mismo aviso (nunca dos avisos por un pago)
async function avisoLimite(usuario, mov, env) {
  if (mov.tipo !== "gasto") return "";
  const { results } = await env.DB.prepare("SELECT clave, valor FROM ajustes WHERE usuario = ?1 AND clave IN ('limites', 'paga', 'limitesPeriodo')").bind(usuario).all();
  const leer = (k) => { try { return JSON.parse(results.find((f) => f.clave === k)?.valor || "null"); } catch { return null; } };
  const limite = Number(leer("limites")?.[mov.cat]) || 0;
  if (!Number.isInteger(limite) || limite <= 0) return "";
  // Igual que en la app: por semana (desde el día de cobro, o de lunes a domingo) o por mes (de paga a paga, o del 1 al último)
  const paga = leer("paga"), cobroSemanal = Number.isInteger(paga?.semana);
  const semanal = (leer("limitesPeriodo") || (cobroSemanal ? "semana" : "mes")) === "semana";
  const { ini, fin } = semanal ? periodoDe(mov.fecha, cobroSemanal ? paga : { semana: 1 }) : periodoDe(mov.fecha, cobroSemanal ? null : paga);
  const { n } = await env.DB.prepare("SELECT coalesce(sum(importe), 0) AS n FROM movs WHERE usuario = ?1 AND tipo = 'gasto' AND cat = ?2 AND borrado = 0 AND fecha >= ?3 AND fecha < ?4").bind(usuario, mov.cat, ini, fin).first();
  return textoLimite(n - mov.importe, n, limite, NOMBRES[mov.cat] || mov.cat);
}

async function applePay(usuario, cuerpo, env, origen = "applepay", esperar) {
  if (!cuerpo.importe && cuerpo.transaccion) Object.assign(cuerpo, leerTransaccion(cuerpo.transaccion), { tienda: cuerpo.tienda || leerTransaccion(cuerpo.transaccion).tienda });
  const c = centimos(cuerpo.importe);
  // Al darle al ▶ en Atajos no hay pago, así que el importe llega vacío: la clave está bien
  if (!c) return json({ error: cuerpo.importe ? `No entiendo el importe «${String(cuerpo.importe).slice(0, 40)}»` : "La clave está bien ✓, pero no ha llegado el importe. Si le has dado al ▶ es normal (no hay pago); si viene de un pago real, revisa que el campo «importe» sea la variable Entrada del atajo → Importe.", texto: "Clave correcta ✓ (falta el importe)" }, 400);
  const tienda = bonita(cuerpo.tienda);
  const devolucion = c < 0;
  const mov = { id: "ap" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), tipo: devolucion ? "ingreso" : "gasto", cat: devolucion ? "devolucion" : categoria(tienda),
    importe: Math.abs(c), nota: tienda, fecha: hoyMadrid(), creado: new Date().toISOString(), borrado: 0, origen };
  mov.actualizado = mov.creado;
  const texto = `${devolucion ? "+" : "−"}${euros(mov.importe)} · ${NOMBRES[mov.cat] || mov.cat}${tienda ? ` (${tienda})` : ""}`;
  if (cuerpo.prueba) return json({ ok: true, prueba: true, texto, mov });
  await env.DB.prepare("INSERT INTO movs (usuario, id, tipo, cat, importe, nota, fecha, creado, actualizado, borrado, origen, servido) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 0, ?10, ?11)")
    .bind(usuario, mov.id, mov.tipo, mov.cat, mov.importe, mov.nota, mov.fecha, mov.creado, mov.actualizado, origen, Date.now()).run();
  // El aviso de confirmación lo da Bolsillo (no el atajo): se manda por detrás para no hacer esperar al pago
  const aviso = avisoLimite(usuario, mov, env).catch(() => "").then((limite) => avisarUsuario(env, usuario, {
    titulo: devolucion ? `+${euros(mov.importe)} de vuelta${tienda ? ` de ${tienda}` : ""}` : `${euros(mov.importe)}${tienda ? ` en ${tienda}` : ""}`,
    cuerpo: limite ? `Apuntado en ${NOMBRES[mov.cat] || mov.cat}. ${limite}` : `Apuntado en ${NOMBRES[mov.cat] || mov.cat}. Si no es así, tócalo y lo cambias.`, etiqueta: "pago-" + mov.id })).catch(() => 0);
  if (esperar) esperar(aviso); else await aviso;
  return json({ ok: true, texto });
}

// ---------- Duelos ----------
// El presupuesto al mes (los duelos reparten por días sobre 30). Quien cobra cada semana lo tiene por semana: se pasa a su equivalente.
async function presupuestoDe(usuario, env) {
  const { results } = await env.DB.prepare("SELECT clave, valor FROM ajustes WHERE usuario = ?1 AND clave IN ('presupuesto', 'paga')").bind(usuario).all();
  const p = Number(results.find((f) => f.clave === "presupuesto")?.valor) || 0;
  let paga = null; try { paga = JSON.parse(results.find((f) => f.clave === "paga")?.valor || "null"); } catch {}
  return Number.isInteger(paga?.semana) ? Math.round(p * 30 / 7) : p;
}
// Lo que ve cada uno: porcentajes, días apuntados y quién es quién (sin ids de usuario ni euros)
const filaPublica = (f, usuario) => ({ nombre: f.nombre, pct: f.pct, dias: f.dias, applepay: f.applepay, valido: f.valido, yo: f.usuario === usuario });

async function verDuelos(usuario, env) {
  const hoy = hoyDuelo();
  const { results } = await env.DB.prepare(`SELECT d.* FROM duelos d JOIN duelo_miembros m ON m.duelo = d.id WHERE m.usuario = ?1 ORDER BY d.estado, d.fin DESC LIMIT 30`).bind(usuario).all();
  const salida = [];
  for (let d of results) {
    d = await cerrarSiToca(env, d, hoy);
    const m = d.estado === "terminado" && d.resultado ? JSON.parse(d.resultado) : await marcador(env, d, hoy);
    const ganador = m.filas.find((f) => f.usuario === d.ganador);
    salida.push({ id: d.id, nombre: d.nombre, codigo: d.codigo, tipo: d.tipo, inicio: d.inicio, fin: d.fin, pacto: d.pacto, estado: d.estado,
      quedan: Math.max(0, diasEntre(hoy, d.fin) + 1), total: m.total, transcurridos: m.transcurridos, minimo: m.minimo,
      ganador: ganador?.nombre || null, gane: d.ganador === usuario, empate: d.estado === "terminado" && !d.ganador && m.filas.length >= 2,
      filas: m.filas.map((f) => filaPublica(f, usuario)) });
  }
  return json({ duelos: salida });
}

async function duelos(accion, usuario, cuerpo, env) {
  const nombre = nombreMiembro(cuerpo.minombre);
  if (accion === "crear" || accion === "unirse") {
    const presupuesto = await presupuestoDe(usuario, env);
    if (!presupuesto) return json({ error: "Para jugar duelos necesitas un presupuesto: ponlo en Ajustes (se compara el % que gasta cada uno).", codigo: "sin_presupuesto" }, 400);
    if (!nombre) return json({ error: "Falta tu nombre" }, 400);
    const { n } = await env.DB.prepare("SELECT count(*) AS n FROM duelo_miembros m JOIN duelos d ON d.id = m.duelo WHERE m.usuario = ?1 AND d.estado = 'activo'").bind(usuario).first();
    if (n >= 10) return json({ error: "Ya tienes 10 duelos en marcha" }, 400);
    if (accion === "crear") {
      const tipo = cuerpo.tipo === "mes" ? "mes" : "semana", inicio = hoyDuelo(), id = idCorto("d");
      await env.DB.batch([
        env.DB.prepare("INSERT INTO duelos (id, nombre, codigo, tipo, inicio, fin, pacto, creador, creado) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)")
          .bind(id, String(cuerpo.nombre || "¿Quién gasta menos?").trim().slice(0, 40), codigoNuevo(), tipo, inicio, masDias(inicio, DURACION[tipo] - 1), String(cuerpo.pacto || "").trim().slice(0, 80), usuario, new Date().toISOString()),
        env.DB.prepare("INSERT INTO duelo_miembros (duelo, usuario, nombre, presupuesto, unido) VALUES (?1, ?2, ?3, ?4, ?5)").bind(id, usuario, nombre, presupuesto, new Date().toISOString()),
      ]);
      return json({ ok: true, id });
    }
    if (await codigoFrenado(usuario, env)) return demasiadosCodigos();
    const d = await env.DB.prepare("SELECT id, estado, fin FROM duelos WHERE codigo = ?1").bind(String(cuerpo.codigo || "").toUpperCase().replace(/[^A-Z0-9]/g, "")).first();
    if (!d) { await codigoFallido(usuario, env); return json({ error: "No hay ningún duelo con ese código" }, 404); }
    if (d.estado !== "activo" || hoyDuelo() > d.fin) return json({ error: "Ese duelo ya ha terminado" }, 400);
    const { n: cuantos } = await env.DB.prepare("SELECT count(*) AS n FROM duelo_miembros WHERE duelo = ?1").bind(d.id).first();
    if (cuantos >= 20) return json({ error: "El duelo está lleno (20 personas)" }, 400);
    await env.DB.prepare("INSERT OR IGNORE INTO duelo_miembros (duelo, usuario, nombre, presupuesto, unido) VALUES (?1, ?2, ?3, ?4, ?5)").bind(d.id, usuario, nombre, presupuesto, new Date().toISOString()).run();
    return json({ ok: true, id: d.id });
  }
  if (accion === "salir") {
    const duelo = String(cuerpo.duelo || "");
    await env.DB.batch([
      env.DB.prepare("DELETE FROM duelo_miembros WHERE duelo = ?1 AND usuario = ?2").bind(duelo, usuario),
      env.DB.prepare("DELETE FROM duelos WHERE id = ?1 AND id NOT IN (SELECT duelo FROM duelo_miembros)").bind(duelo),
    ]);
    return json({ ok: true });
  }
  return json({ error: "No existe" }, 404);
}

// ---------- Modo tóxico: círculos de confianza ----------
// Cada miembro elige su nivel. El servidor recorta según ese nivel: el móvil de los demás nunca recibe lo que no debe ver.
//   light → total del mes y por categorías · medio → además cada gasto (importe, categoría y tienda de Apple Pay, sin sus notas) · total → todo
// Nunca se enseñan ingresos ni presupuesto. Los gastos que la persona oculta no salen en la lista.
const NIVELES = ["light", "medio", "total"], REACCIONES = ["💀", "😂", "🔥", "🤡"], MAX_CIRCULO = 8;
const miCirculo = (usuario, circulo, env) => env.DB.prepare("SELECT id, nombre, nivel FROM circulo_miembros WHERE circulo = ?1 AND usuario = ?2").bind(circulo, usuario).first();

async function verCirculos(usuario, env) {
  const { results } = await env.DB.prepare(`SELECT c.id, c.nombre, c.codigo, m.nivel, m.id AS yo, (SELECT count(*) FROM circulo_miembros x WHERE x.circulo = c.id) AS personas
    FROM circulos c JOIN circulo_miembros m ON m.circulo = c.id WHERE m.usuario = ?1 ORDER BY c.creado`).bind(usuario).all();
  return json({ circulos: results });
}

async function muroCirculo(usuario, circulo, env) {
  const yo = await miCirculo(usuario, circulo, env);
  if (!yo) return json({ error: "No eres de ese círculo" }, 403);
  const c = await env.DB.prepare("SELECT id, nombre, codigo FROM circulos WHERE id = ?1").bind(circulo).first();
  const { results: miembros } = await env.DB.prepare("SELECT usuario, id, nombre, nivel FROM circulo_miembros WHERE circulo = ?1 ORDER BY unido").bind(circulo).all();
  const hoy = hoyDuelo(), mes = hoy.slice(0, 7) + "-01", semana = masDias(hoy, -6), desde = mes < semana ? mes : semana;
  const { results: reac } = await env.DB.prepare("SELECT autor, mov, reactor, emoji FROM reacciones WHERE circulo = ?1").bind(circulo).all();
  const salida = [];
  for (const m of miembros) {
    const { results: movs } = await env.DB.prepare("SELECT id, fecha, importe, cat, nota, origen, creado FROM movs WHERE usuario = ?1 AND borrado = 0 AND tipo = 'gasto' AND fecha >= ?2 ORDER BY fecha DESC, creado DESC LIMIT 400").bind(m.usuario, desde).all();
    const oc = await env.DB.prepare("SELECT valor FROM ajustes WHERE usuario = ?1 AND clave = 'ocultos'").bind(m.usuario).first();
    let ocultos = new Set(); try { ocultos = new Set(JSON.parse(oc?.valor || "[]")); } catch {}
    const suma = (lista) => { const cats = {}; let total = 0; for (const g of lista) { total += g.importe; cats[g.cat] = (cats[g.cat] || 0) + g.importe; } return { total, cats }; };
    const fila = { id: m.id, nombre: m.nombre, nivel: m.nivel, yo: m.usuario === usuario,
      // lo oculto tampoco cuenta en los totales: si no, sobraría dinero «sin explicar» (los totales son de lo que ven los demás)
      mes: suma(movs.filter((g) => g.fecha >= mes && !ocultos.has(g.id))), semana: suma(movs.filter((g) => g.fecha >= semana && !ocultos.has(g.id))) };
    if (m.nivel !== "light") {
      fila.gastos = movs.filter((g) => g.fecha >= mes && !ocultos.has(g.id)).slice(0, 80).map((g) => {
        const r = reac.filter((x) => x.autor === m.id && x.mov === g.id);
        return { id: g.id, fecha: g.fecha, importe: g.importe, cat: g.cat, origen: g.origen,
          texto: m.nivel === "total" || g.origen === "applepay" || g.origen === "wallet" ? g.nota : "", // en «medio», las notas propias no salen (la tienda del pago automático sí)
          reacciones: Object.fromEntries(REACCIONES.map((e) => [e, r.filter((x) => x.emoji === e).length]).filter(([, n]) => n)), mia: r.find((x) => x.reactor === yo.id)?.emoji || null };
      });
    }
    salida.push(fila);
  }
  return json({ circulo: c, yo: yo.id, nivel: yo.nivel, miembros: salida, reacciones: REACCIONES });
}

async function circulos(accion, usuario, cuerpo, env) {
  const nivel = NIVELES.includes(cuerpo.nivel) ? cuerpo.nivel : "light", nombre = nombreMiembro(cuerpo.minombre);
  if (accion === "crear") {
    const titulo = String(cuerpo.nombre || "").trim().slice(0, 40);
    if (!titulo || !nombre) return json({ error: "Pon nombre al círculo y tu nombre" }, 400);
    const { n } = await env.DB.prepare("SELECT count(*) AS n FROM circulo_miembros WHERE usuario = ?1").bind(usuario).first();
    if (n >= 10) return json({ error: "Ya estás en 10 círculos" }, 400);
    const id = idCorto("c"), ahora = new Date().toISOString();
    await env.DB.batch([
      env.DB.prepare("INSERT INTO circulos (id, nombre, codigo, creador, creado) VALUES (?1, ?2, ?3, ?4, ?5)").bind(id, titulo, codigoNuevo(), usuario, ahora),
      env.DB.prepare("INSERT INTO circulo_miembros (circulo, usuario, id, nombre, nivel, unido) VALUES (?1, ?2, ?3, ?4, ?5, ?6)").bind(id, usuario, idCorto("m"), nombre, nivel, ahora),
    ]);
    return json({ ok: true, id });
  }
  if (accion === "unirse") {
    if (await codigoFrenado(usuario, env)) return demasiadosCodigos();
    const c = await env.DB.prepare("SELECT id, nombre FROM circulos WHERE codigo = ?1").bind(String(cuerpo.codigo || "").toUpperCase().replace(/[^A-Z0-9]/g, "")).first();
    if (!c) { await codigoFallido(usuario, env); return json({ error: "No hay ningún círculo con ese código" }, 404); }
    if (await miCirculo(usuario, c.id, env)) return json({ ok: true, id: c.id });
    if (!nombre) return json({ ok: false, circulo: c.nombre }); // primero se le pregunta el nombre y el nivel
    const { n } = await env.DB.prepare("SELECT count(*) AS n FROM circulo_miembros WHERE circulo = ?1").bind(c.id).first();
    if (n >= MAX_CIRCULO) return json({ error: `El círculo está lleno (máximo ${MAX_CIRCULO} personas de confianza)` }, 400);
    await env.DB.prepare("INSERT INTO circulo_miembros (circulo, usuario, id, nombre, nivel, unido) VALUES (?1, ?2, ?3, ?4, ?5, ?6)").bind(c.id, usuario, idCorto("m"), nombre, nivel, new Date().toISOString()).run();
    return json({ ok: true, id: c.id });
  }
  const circulo = String(cuerpo.circulo || ""), yo = await miCirculo(usuario, circulo, env);
  if (!yo) return json({ error: "No eres de ese círculo" }, 403);
  if (accion === "nivel") {
    await env.DB.prepare("UPDATE circulo_miembros SET nivel = ?3 WHERE circulo = ?1 AND usuario = ?2").bind(circulo, usuario, nivel).run();
    return json({ ok: true, nivel });
  }
  if (accion === "reaccionar") {
    const autor = await env.DB.prepare("SELECT usuario, nivel FROM circulo_miembros WHERE circulo = ?1 AND id = ?2").bind(circulo, String(cuerpo.autor || "")).first();
    if (!autor || autor.nivel === "light") return json({ error: "Ese gasto no se puede ver" }, 400);
    const mov = String(cuerpo.mov || "");
    if (!(await env.DB.prepare("SELECT 1 FROM movs WHERE usuario = ?1 AND id = ?2 AND borrado = 0").bind(autor.usuario, mov).first())) return json({ error: "Ese gasto ya no existe" }, 404);
    if (cuerpo.emoji && !REACCIONES.includes(cuerpo.emoji)) return json({ error: "Reacción no válida" }, 400);
    if (cuerpo.emoji) await env.DB.prepare(`INSERT INTO reacciones (circulo, autor, mov, reactor, emoji, creado) VALUES (?1, ?2, ?3, ?4, ?5, ?6)
      ON CONFLICT(circulo, autor, mov, reactor) DO UPDATE SET emoji = excluded.emoji, creado = excluded.creado`).bind(circulo, cuerpo.autor, mov, yo.id, cuerpo.emoji, new Date().toISOString()).run();
    else await env.DB.prepare("DELETE FROM reacciones WHERE circulo = ?1 AND autor = ?2 AND mov = ?3 AND reactor = ?4").bind(circulo, cuerpo.autor, mov, yo.id).run();
    return json({ ok: true });
  }
  if (accion === "salir") {
    // Al salir, los demás dejan de ver lo tuyo al momento (y se borran tus reacciones)
    await env.DB.batch([
      env.DB.prepare("DELETE FROM reacciones WHERE circulo = ?1 AND (autor = ?2 OR reactor = ?2)").bind(circulo, yo.id),
      env.DB.prepare("DELETE FROM circulo_miembros WHERE circulo = ?1 AND usuario = ?2").bind(circulo, usuario),
      env.DB.prepare("DELETE FROM circulos WHERE id = ?1 AND id NOT IN (SELECT circulo FROM circulo_miembros)").bind(circulo),
      env.DB.prepare("DELETE FROM reacciones WHERE circulo NOT IN (SELECT id FROM circulos)"),
    ]);
    return json({ ok: true });
  }
  return json({ error: "No existe" }, 404);
}

// ---------- Encuesta de la hoja de ruta ----------
// Quien tiene nube vota con ella (un voto por nube); en la web, con un id aleatorio del navegador y un límite por conexión
async function votanteDe(request, cuerpo, env) {
  const { usuario } = await identificar(request, cuerpo, env);
  if (usuario) return { votante: "u:" + usuario, usuario };
  const w = String(cuerpo.votante || new URL(request.url).searchParams.get("votante") || "").replace(/[^\w-]/g, "").slice(0, 40);
  return { votante: w.length >= 16 ? "w:" + w : null };
}
async function limitar(request, env, accion, maximo, ventana) {
  const ip = await sha256("bolsillo:" + (request.headers.get("CF-Connecting-IP") || "?")), ahora = Date.now();
  const { n } = await env.DB.prepare("SELECT count(*) AS n FROM limites WHERE ip_hash = ?1 AND accion = ?2 AND cuando > ?3").bind(ip, accion, ahora - ventana).first();
  if (n >= maximo) return null;
  await env.DB.batch([
    env.DB.prepare("INSERT INTO limites (ip_hash, accion, cuando) VALUES (?1, ?2, ?3)").bind(ip, accion, ahora),
    env.DB.prepare("DELETE FROM limites WHERE cuando < ?1").bind(ahora - 864e5),
  ]);
  return ip;
}
// ---------- Panel de uso (solo el dueño) ----------
// Solo recuentos: cuántas nubes, cuántas se usan y cómo se apunta. Nunca importes, notas ni tiendas de nadie.
// Las cuentas no incluyen la nube del dueño, para ver el uso de los demás.
async function panelUso(request, env) {
  const dias = Math.min(90, Math.max(1, Number(new URL(request.url).searchParams.get("dias")) || 7));
  const hace = (n) => new Date(Date.now() - n * 864e5).toISOString();
  const dia = (n) => hace(n).slice(0, 10);
  const uno = (sql, ...v) => env.DB.prepare(sql).bind(...v).first();
  const [nubes, activas, apuntes, origenes, auto, avisos, grupos, duelos, circulos, votos, { results: serie }] = await Promise.all([
    uno("SELECT count(*) AS total, count(CASE WHEN creado >= ?1 THEN 1 END) AS nuevas, count(CASE WHEN creado >= ?2 THEN 1 END) AS hoy FROM usuarios WHERE id <> 'yo'", hace(dias), dia(0)),
    uno("SELECT count(CASE WHEN ultimo_uso >= ?1 THEN 1 END) AS hoy, count(CASE WHEN ultimo_uso >= ?2 THEN 1 END) AS semana, count(CASE WHEN ultimo_uso >= ?3 THEN 1 END) AS mes FROM usuarios WHERE id <> 'yo'", dia(0), dia(6), dia(29)),
    uno("SELECT count(*) AS n, count(DISTINCT usuario) AS personas FROM movs WHERE usuario <> 'yo' AND borrado = 0 AND creado >= ?1", hace(dias)),
    env.DB.prepare("SELECT origen, count(*) AS n FROM movs WHERE usuario <> 'yo' AND borrado = 0 AND creado >= ?1 GROUP BY origen").bind(hace(dias)).all(),
    uno("SELECT count(DISTINCT CASE WHEN origen = 'applepay' THEN usuario END) AS applepay, count(DISTINCT CASE WHEN origen = 'wallet' THEN usuario END) AS wallet FROM movs WHERE usuario <> 'yo' AND creado >= ?1", hace(30)),
    uno("SELECT count(DISTINCT usuario) AS n FROM push_subs WHERE usuario <> 'yo'"),
    uno("SELECT count(DISTINCT grupo) AS n FROM miembros WHERE usuario IS NOT NULL AND usuario <> 'yo'"),
    uno("SELECT count(*) AS total, count(CASE WHEN estado = 'activo' THEN 1 END) AS activos FROM duelos"),
    uno("SELECT count(DISTINCT circulo) AS n, count(*) AS miembros FROM circulo_miembros"),
    uno("SELECT count(DISTINCT votante) AS n FROM ideas_votos"),
    env.DB.prepare("SELECT substr(creado, 1, 10) AS dia, count(DISTINCT usuario) AS personas, count(*) AS apuntes FROM movs WHERE usuario <> 'yo' AND creado >= ?1 GROUP BY dia ORDER BY dia").bind(dia(13)).all(),
  ]);
  const porOrigen = Object.fromEntries(origenes.results.map((o) => [o.origen, o.n]));
  const porDia = Object.fromEntries(serie.map((s) => [s.dia, s]));
  return json({ dias, nubes, activas, apuntes: { ...apuntes, app: porOrigen.app || 0, applepay: porOrigen.applepay || 0, wallet: porOrigen.wallet || 0, voz: porOrigen.voz || 0 },
    automatico: auto, avisos: avisos.n, grupos: grupos.n, duelos, circulos, votantes: votos.n,
    serie: Array.from({ length: 14 }, (_, i) => { const d = dia(13 - i); return { dia: d, personas: porDia[d]?.personas || 0, apuntes: porDia[d]?.apuntes || 0 }; }) });
}

async function ideas(accion, request, cuerpo, env) {
  const validas = new Set(IDEAS.map((i) => i.id));
  if (accion === "" && request.method === "GET") {
    const { votante } = await votanteDe(request, cuerpo, env);
    const [{ results: cuentas }, { results: mios }, total] = await Promise.all([
      env.DB.prepare("SELECT idea, count(*) AS n FROM ideas_votos GROUP BY idea").all(),
      votante ? env.DB.prepare("SELECT idea FROM ideas_votos WHERE votante = ?1").bind(votante).all() : { results: [] },
      env.DB.prepare("SELECT count(DISTINCT votante) AS n FROM ideas_votos").first(),
    ]);
    const n = Object.fromEntries(cuentas.map((c) => [c.idea, c.n])), mio = new Set(mios.map((m) => m.idea));
    return json({ ideas: IDEAS.map((i) => ({ ...i, votos: n[i.id] || 0, mio: mio.has(i.id) })).sort((a, b) => b.votos - a.votos), votantes: total?.n || 0 });
  }
  if (accion === "votar" && request.method === "POST") {
    const { votante } = await votanteDe(request, cuerpo, env);
    if (!votante || !validas.has(cuerpo.idea)) return json({ error: "Voto no válido" }, 400);
    if (!(await limitar(request, env, "voto", 60, 3600_000))) return json({ error: "Demasiados votos seguidos. Prueba dentro de un rato." }, 429);
    if (cuerpo.quitar) await env.DB.prepare("DELETE FROM ideas_votos WHERE idea = ?1 AND votante = ?2").bind(cuerpo.idea, votante).run();
    else await env.DB.prepare("INSERT OR IGNORE INTO ideas_votos (idea, votante, creado) VALUES (?1, ?2, ?3)").bind(cuerpo.idea, votante, new Date().toISOString()).run();
    const { n } = await env.DB.prepare("SELECT count(*) AS n FROM ideas_votos WHERE idea = ?1").bind(cuerpo.idea).first();
    return json({ ok: true, votos: n, mio: !cuerpo.quitar });
  }
  if (accion === "sugerir" && request.method === "POST") {
    const { votante } = await votanteDe(request, cuerpo, env), texto = String(cuerpo.texto || "").replace(/\s+/g, " ").trim().slice(0, 300);
    if (texto.length < 5) return json({ error: "Cuéntanos un poco más" }, 400);
    const ip = await limitar(request, env, "sugerencia", 5, 864e5);
    if (!ip) return json({ error: "Ya nos has mandado varias hoy. ¡Gracias!" }, 429);
    await env.DB.prepare("INSERT INTO sugerencias (id, texto, votante, ip_hash, creado) VALUES (?1, ?2, ?3, ?4, ?5)").bind(idCorto("s"), texto, votante || "anonimo", ip, new Date().toISOString()).run();
    return json({ ok: true });
  }
  if (accion === "resumen" && request.method === "GET") {
    const { usuario } = await identificar(request, cuerpo, env);
    if (usuario !== "yo") return json({ error: "Solo para el dueño" }, 403);
    const dias = Math.min(90, Math.max(1, Number(new URL(request.url).searchParams.get("dias")) || 7)), desde = new Date(Date.now() - dias * 864e5).toISOString();
    const [{ results: total }, { results: recientes }, votantes, { results: sug }] = await Promise.all([
      env.DB.prepare("SELECT idea, count(*) AS n FROM ideas_votos GROUP BY idea").all(),
      env.DB.prepare("SELECT idea, count(*) AS n FROM ideas_votos WHERE creado >= ?1 GROUP BY idea").bind(desde).all(),
      env.DB.prepare("SELECT count(DISTINCT votante) AS n, count(DISTINCT CASE WHEN votante LIKE 'u:%' THEN votante END) AS app FROM ideas_votos").first(),
      env.DB.prepare("SELECT texto, votante, creado FROM sugerencias WHERE creado >= ?1 ORDER BY creado DESC LIMIT 50").bind(desde).all(),
    ]);
    const t = Object.fromEntries(total.map((x) => [x.idea, x.n])), r = Object.fromEntries(recientes.map((x) => [x.idea, x.n]));
    return json({ dias, votantes: votantes.n, desdeApp: votantes.app,
      ideas: IDEAS.map((i) => ({ titulo: i.titulo, votos: t[i.id] || 0, nuevos: r[i.id] || 0 })).sort((a, b) => b.votos - a.votos),
      sugerencias: sug.map((s) => ({ texto: s.texto, desde: s.votante.startsWith("u:") ? "app" : "web", fecha: s.creado.slice(0, 10) })) });
  }
  return json({ error: "No existe" }, 404);
}

// ---------- Avisos (push) ----------
const SERVICIOS_PUSH = /^https:\/\/([a-z0-9-]+\.)*(push\.apple\.com|fcm\.googleapis\.com|push\.services\.mozilla\.com|notify\.windows\.com)\//;
async function push(accion, usuario, cuerpo, env) {
  if (accion === "alta") {
    const s = cuerpo.suscripcion || {};
    // Solo servicios de avisos de verdad (Apple, Google, Mozilla, Microsoft): el servidor nunca manda peticiones a direcciones cualquiera
    if (!SERVICIOS_PUSH.test(String(s.endpoint || "")) || String(s.endpoint).length > 1000 || !/^[\w-]{20,200}$/.test(s.keys?.p256dh || "") || !/^[\w-]{8,100}$/.test(s.keys?.auth || "")) return json({ error: "Suscripción no válida" }, 400);
    await env.DB.prepare(`INSERT INTO push_subs (endpoint, usuario, p256dh, auth, creado) VALUES (?1, ?2, ?3, ?4, ?5)
      ON CONFLICT(endpoint) DO UPDATE SET usuario = excluded.usuario, p256dh = excluded.p256dh, auth = excluded.auth`).bind(s.endpoint, usuario, s.keys.p256dh, s.keys.auth, new Date().toISOString()).run();
    return json({ ok: true });
  }
  if (accion === "baja") {
    await env.DB.prepare("DELETE FROM push_subs WHERE usuario = ?1 AND endpoint = ?2").bind(usuario, String(cuerpo.endpoint || "")).run();
    return json({ ok: true });
  }
  if (accion === "prueba") {
    const { results } = await env.DB.prepare("SELECT endpoint, p256dh, auth FROM push_subs WHERE usuario = ?1").bind(usuario).all();
    if (!results.length) return json({ error: "Este móvil no tiene los avisos activados" }, 400);
    const estados = [];
    for (const s of results) {
      const estado = await enviarPush(s, { titulo: "Así te avisará Bolsillo", cuerpo: "Renovaciones de suscripciones, tu racha, tu resumen del domingo y tu mes para compartir. Como mucho un aviso al día." }, env).catch(() => 0);
      if (estado === 404 || estado === 410) await env.DB.prepare("DELETE FROM push_subs WHERE endpoint = ?1").bind(s.endpoint).run();
      estados.push(estado);
    }
    return estados.some((e) => e >= 200 && e < 300) ? json({ ok: true }) : json({ error: `El servicio de avisos no lo ha aceptado (${estados.join(", ")})` }, 502);
  }
  return json({ error: "No existe" }, 404);
}

async function borrarNube(usuario, cuerpo, env) {
  if (cuerpo.confirmar !== true) return json({ error: "Falta confirmar" }, 400);
  await env.DB.batch([
    env.DB.prepare("DELETE FROM movs WHERE usuario = ?1").bind(usuario),
    env.DB.prepare("DELETE FROM ajustes WHERE usuario = ?1").bind(usuario),
    env.DB.prepare("DELETE FROM usuarios WHERE id = ?1").bind(usuario),
    env.DB.prepare("DELETE FROM push_subs WHERE usuario = ?1").bind(usuario),
    // Su Bizum, PayPal y Revolut, sus votos y sugerencias de la encuesta y su freno de códigos
    env.DB.prepare("DELETE FROM cobro_datos WHERE usuario = ?1").bind(usuario),
    ...["ideas_votos", "sugerencias"].map((t) => env.DB.prepare(`DELETE FROM ${t} WHERE votante = ?1`).bind("u:" + usuario)),
    env.DB.prepare("DELETE FROM limites WHERE ip_hash = ?1").bind("u:" + usuario),
    // Los cobros en los que estaba (le debían o debía): sin él ya no hay a quién avisar ni cómo pagarle
    env.DB.prepare("DELETE FROM cobros WHERE EXISTS (SELECT 1 FROM miembros m WHERE m.grupo = cobros.grupo AND m.usuario = ?1 AND m.id IN (cobros.de, cobros.a))").bind(usuario),
    env.DB.prepare("DELETE FROM duelo_miembros WHERE usuario = ?1").bind(usuario),
    env.DB.prepare("DELETE FROM reacciones WHERE autor IN (SELECT id FROM circulo_miembros WHERE usuario = ?1) OR reactor IN (SELECT id FROM circulo_miembros WHERE usuario = ?1)").bind(usuario),
    env.DB.prepare("DELETE FROM circulo_miembros WHERE usuario = ?1").bind(usuario),
    env.DB.prepare("DELETE FROM circulos WHERE id NOT IN (SELECT circulo FROM circulo_miembros)"),
    env.DB.prepare("DELETE FROM duelos WHERE id NOT IN (SELECT duelo FROM duelo_miembros)"),
    // Sale de sus grupos (su nombre se queda en las cuentas); los grupos sin nadie con la app se borran
    env.DB.prepare("UPDATE miembros SET usuario = NULL WHERE usuario = ?1").bind(usuario),
    ...["gastos_grupo", "cobros", "miembros", "grupos"].map((t) => env.DB.prepare(`DELETE FROM ${t} WHERE ${t === "grupos" ? "id" : "grupo"} NOT IN (SELECT grupo FROM miembros WHERE usuario IS NOT NULL)`)),
  ]);
  return json({ ok: true });
}

export async function onRequest({ request, env, params, waitUntil }) {
  const ruta = (params.ruta || []).join("/");
  if (!env.DB) return json({ error: "Bolsillo no está configurado en el servidor" }, 500);
  // Atajos a veces manda el cuerpo como formulario en vez de JSON: se aceptan los dos
  let cuerpo = {}, texto = "";
  if (request.method === "POST") {
    texto = await request.text().catch(() => "");
    try { cuerpo = JSON.parse(texto || "{}"); } catch { cuerpo = Object.fromEntries(new URLSearchParams(texto)); }
    if (!cuerpo || typeof cuerpo !== "object") cuerpo = {};
  }
  try {
    if (ruta === "registro" && request.method === "POST") return await registro(request, env);
    if (ruta === "push/clave") return json({ clave: env.VAPID_PUBLICA || null }); // pública: la necesita el navegador para suscribirse
    // «Guardar en el llavero»: el iPhone solo ofrece guardar una contraseña tras enviar un formulario que cambia de página.
    // Este paso solo devuelve a la app; la clave que llega no se mira ni se guarda.
    if (ruta === "llavero" && request.method === "POST") return new Response(null, { status: 303, headers: { Location: "/?llavero=1", "Cache-Control": "no-store" } });
    if (ruta === "ideas" || ruta.startsWith("ideas/")) return await ideas(ruta.slice(6), request, cuerpo, env); // pública: se vota también desde la web
    const enlace = ruta.match(/^cobro\/([A-Z0-9]{10})(?:\/(pagado))?$/); // pública: la abre quien debe, tenga o no la app
    if (enlace) return await cobroDesdeEnlace(enlace[1], enlace[2], request, cuerpo, env);
    const { usuario, dada } = await identificar(request, cuerpo, env);
    if (!usuario) {
      // Diagnóstico del último fallo (nombres de cabeceras y longitudes, nunca la clave)
      const diag = { ruta, cuando: new Date().toISOString(), cabeceras: [...request.headers.keys()].filter((k) => !/^(cf-|x-forwarded|x-real-ip)/.test(k)), auth_largo: (request.headers.get("Authorization") || "").length,
        clave_largo: dada.length, campos: Object.keys(cuerpo), agente: (request.headers.get("User-Agent") || "").slice(0, 80) };
      // Como mucho uno por minuto: si alguien manda claves falsas sin parar, no gasta las escrituras del día en la base
      await env.DB.prepare("INSERT INTO ajustes (usuario, clave, valor, actualizado, servido) VALUES ('', 'ultimo_fallo', ?1, ?2, 0) ON CONFLICT(usuario, clave) DO UPDATE SET valor = excluded.valor, actualizado = excluded.actualizado WHERE ajustes.actualizado < ?3")
        .bind(JSON.stringify(diag), diag.cuando, new Date(Date.now() - 60_000).toISOString()).run().catch(() => {});
      return json({ error: "Clave incorrecta", pista: pistaClave(dada), texto: "Clave incorrecta" }, 401);
    }
    if (ruta === "estado" && request.method === "GET") return json({ ok: true, dueno: usuario === "yo" || undefined });
    if (ruta === "uso" && request.method === "GET") return usuario === "yo" ? await panelUso(request, env) : json({ error: "Solo para el dueño" }, 403);
    if (ruta === "sync" && request.method === "POST") return await sync(usuario, cuerpo, env);
    if (ruta === "apple-pay" && request.method === "POST") return await applePay(usuario, cuerpo, env, "applepay", waitUntil);
    if (ruta === "pago" && request.method === "POST") return await pagoWallet(usuario, cuerpo, texto, env, waitUntil);
    if (ruta === "gasto" && request.method === "POST") return await gastoVoz(usuario, cuerpo, env);
    if (ruta === "borrar-nube" && request.method === "POST") return await borrarNube(usuario, cuerpo, env);
    if (ruta === "grupos" && request.method === "GET") return await verGrupos(usuario, env);
    if (ruta === "grupos/datos" && request.method === "POST") return await guardarDatosCobro(usuario, cuerpo, env);
    if (ruta.startsWith("grupos/") && request.method === "POST") return await grupos(ruta.slice(7), usuario, cuerpo, env);
    if (ruta.startsWith("push/") && request.method === "POST") return await push(ruta.slice(5), usuario, cuerpo, env);
    if (ruta === "circulos" && request.method === "GET") return await verCirculos(usuario, env);
    if (ruta === "circulos/muro" && request.method === "GET") return await muroCirculo(usuario, new URL(request.url).searchParams.get("circulo") || "", env);
    if (ruta.startsWith("circulos/") && request.method === "POST") return await circulos(ruta.slice(9), usuario, cuerpo, env);
    if (ruta === "duelos" && request.method === "GET") return await verDuelos(usuario, env);
    if (ruta.startsWith("duelos/") && request.method === "POST") return await duelos(ruta.slice(7), usuario, cuerpo, env);
    return json({ error: "No existe" }, 404);
  } catch (e) {
    console.error(ruta, e); // el detalle se queda en los registros de Cloudflare: fuera no se enseña cómo está hecho por dentro
    return json({ error: "Error del servidor. Prueba otra vez en un momento." }, 500);
  }
}
