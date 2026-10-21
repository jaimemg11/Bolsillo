// Pruebas del servidor sin tocar la nube real: node pruebas/servidor.mjs
// Monta la base de datos en memoria (con esquema.sql) y llama a la API como lo haría la app.
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import { onRequest } from "../functions/api/[[ruta]].js";

// Imita la base D1 de Cloudflare: prepare → bind → first / all / run, y batch (todo o nada)
function baseEnMemoria() {
  const db = new DatabaseSync(":memory:");
  db.exec(fs.readFileSync(new URL("../esquema.sql", import.meta.url), "utf8"));
  const sentencia = (sql, valores = []) => ({
    bind: (...v) => sentencia(sql, v),
    first: async () => db.prepare(sql).get(...valores) ?? null,
    all: async () => ({ results: db.prepare(sql).all(...valores) }),
    run: async () => db.prepare(sql).run(...valores),
  });
  return {
    sql: db,
    prepare: (sql) => sentencia(sql),
    batch: async (lista) => { db.exec("BEGIN"); try { const r = []; for (const s of lista) r.push(await s.run()); db.exec("COMMIT"); return r; } catch (e) { db.exec("ROLLBACK"); throw e; } },
  };
}

const DB = baseEnMemoria(), env = { DB };
// cuerpo: un objeto se manda como JSON (así llama la app); un texto, tal cual (así lo manda MacroDroid)
const llamar = async (ruta, cuerpo, clave) => {
  const r = await onRequest({ request: new Request("https://bolsillo.test/api/" + ruta, { method: cuerpo ? "POST" : "GET", headers: { "CF-Connecting-IP": "1.2.3.4", ...(clave ? { Authorization: "Bearer " + clave } : {}) }, body: cuerpo ? (typeof cuerpo === "string" ? cuerpo : JSON.stringify(cuerpo)) : undefined }),
    env, params: { ruta: ruta.split("/") }, waitUntil: () => {} });
  return { estado: r.status, datos: await r.json() };
};
let fallos = 0;
const ok = (c, t) => { if (!c) fallos++; console.log((c ? "OK    " : "FALLO ") + t); };
const cuantas = (tabla, donde = "1", ...v) => DB.sql.prepare(`SELECT count(*) AS n FROM ${tabla} WHERE ${donde}`).get(...v).n;

// Dos amigos con nube
const ana = (await llamar("registro", {})).datos.clave, beto = (await llamar("registro", {})).datos.clave;
ok(ana && beto && ana !== beto, "se crean dos nubes con claves distintas");
ok((await llamar("estado", null, "x".repeat(32))).estado === 401, "una clave que no existe no entra");

// Fechas
const mov = (id, fecha) => ({ id, tipo: "gasto", cat: "ocio", importe: 950, nota: "Cine", fecha });
await llamar("sync", { cambios: [mov("m-buena", "2026-10-21"), mov("m-mala", "2026-13-45"), mov("m-febrero", "2026-02-30")] }, ana);
ok(cuantas("movs", "id = 'm-buena'") === 1, "un gasto con fecha real se guarda");
ok(cuantas("movs", "id IN ('m-mala', 'm-febrero')") === 0, "los gastos con fechas que no existen (13/45, 30 de febrero) no se guardan");

// Ana lo usa todo: ajustes, Bizum, votos, sugerencia, un grupo con Beto y un cobro
const usuarioAna = DB.sql.prepare("SELECT id FROM usuarios ORDER BY creado LIMIT 1").get().id;
await llamar("sync", { ajustes: { limites: { valor: { ocio: 2000 } } } }, ana);
ok((await llamar("grupos/datos", { bizum: "612345678" }, ana)).estado === 200, "Ana guarda su Bizum");
const idea = (await llamar("ideas")).datos.ideas[0].id;
await llamar("ideas/votar", { idea }, ana);
await llamar("ideas/sugerir", { texto: "Que se puedan escanear tickets" }, ana);
const idGrupo = (await llamar("grupos/crear", { nombre: "Piso", minombre: "Ana" }, ana)).datos.id;
const codigo = DB.sql.prepare("SELECT codigo FROM grupos WHERE id = ?").get(idGrupo).codigo;
await llamar("grupos/unirse", { codigo, minombre: "Beto" }, beto);
const miembros = DB.sql.prepare("SELECT id, usuario FROM miembros WHERE grupo = ?").all(idGrupo);
const mAna = miembros.find((m) => m.usuario === usuarioAna)?.id, mBeto = miembros.find((m) => m.usuario !== usuarioAna)?.id;
ok(mAna && mBeto, "Ana y Beto están en el mismo grupo");
const ahora = new Date().toISOString();
DB.sql.prepare("INSERT INTO cobros (id, grupo, de, a, importe, creado, actualizado) VALUES ('COBRO00001', ?, ?, ?, 1200, ?, ?)").run(idGrupo, mBeto, mAna, ahora, ahora);
ok(cuantas("cobro_datos", "usuario = ?", usuarioAna) === 1 && cuantas("ideas_votos", "votante = ?", "u:" + usuarioAna) === 1 && cuantas("sugerencias", "votante = ?", "u:" + usuarioAna) === 1, "antes de borrar: su Bizum, su voto y su sugerencia están guardados");

// «Borrar mi nube»: no tiene que quedar nada suyo
ok((await llamar("borrar-nube", { confirmar: true }, ana)).estado === 200, "Ana borra su nube");
for (const [tabla, donde] of [["usuarios", "id = ?"], ["movs", "usuario = ?"], ["ajustes", "usuario = ?"], ["push_subs", "usuario = ?"], ["cobro_datos", "usuario = ?"], ["miembros", "usuario = ?"]])
  ok(cuantas(tabla, donde, usuarioAna) === 0, `después de borrar no queda nada suyo en ${tabla}`);
for (const tabla of ["ideas_votos", "sugerencias"]) ok(cuantas(tabla, "votante = ?", "u:" + usuarioAna) === 0, `ni en ${tabla}`);
ok(cuantas("cobros", "id = 'COBRO00001'") === 0, "y el cobro en el que estaba se borra");
ok((await llamar("estado", null, ana)).estado === 401, "su clave ya no sirve");
ok((await llamar("estado", null, beto)).estado === 200, "la nube de Beto sigue intacta");

// Claves falsas sin parar: solo se apunta el primer fallo del minuto
const antes = DB.sql.prepare("SELECT actualizado FROM ajustes WHERE clave = 'ultimo_fallo'").get()?.actualizado;
for (let i = 0; i < 5; i++) await llamar("estado", null, "y".repeat(32));
ok(DB.sql.prepare("SELECT actualizado FROM ajustes WHERE clave = 'ultimo_fallo'").get()?.actualizado === antes, "muchos intentos con claves falsas no escriben cada vez en la base");

// Pagos que llegan solos (MacroDroid en Android, Atajos en iPhone): cómo se lee cada notificación
ok((await llamar("ultimo-pago", null, beto)).datos.cuando === undefined, "antes de ningún pago, la guía dice que no ha llegado nada");
const ultimoMov = () => DB.sql.prepare("SELECT importe, cat, nota FROM movs WHERE origen IN ('wallet', 'applepay') ORDER BY creado DESC, rowid DESC LIMIT 1").get();
for (const [titulo, texto, importe, cat, tienda] of [
  ["Mercadona", "12,50 € con Visa •••• 1234", 1250, "super", "Mercadona"],
  ["Google Wallet", "Has pagado 3,20 € en Starbucks", 320, "comida", "Starbucks"],
  ["BBVA", "Compra de 25,99 EUR en ZARA", 2599, "ropa", "Zara"],
  ["Renfe Viajeros", "7,85 € · Mastercard ••5678", 785, "transporte", "Renfe Viajeros"],
  ["Vinted", "Pago de 1.250,00 € realizado", 125000, "otros", "Vinted"],
  ["CaixaBank", "Pago con tarjeta ••4321: 4,50 € en Telepizza", 450, "comida", "Telepizza"],
  ["Lidl", "-18,40 €", 1840, "super", "Lidl"],
]) {
  const r = await llamar("pago", `${titulo} ${texto}`, beto), m = ultimoMov(); // título y texto juntos, como los manda MacroDroid
  ok(r.datos.ok && m?.importe === importe && m.cat === cat && m.nota.toLowerCase() === tienda.toLowerCase(), `«${titulo} · ${texto}» → ${m?.importe / 100} € en ${m?.cat} (${m?.nota})`);
}
await llamar("pago", "Zara Reembolso de -9,99 € con Visa ••1234", beto);
const devuelto = DB.sql.prepare("SELECT tipo, cat, importe FROM movs WHERE origen = 'wallet' ORDER BY creado DESC, rowid DESC LIMIT 1").get();
ok(devuelto.tipo === "ingreso" && devuelto.cat === "devolucion" && devuelto.importe === 999, "un reembolso sí se apunta como devolución");
ok((await llamar("ultimo-pago", null, beto)).datos.resultado === "apuntado", "la guía enseña el último pago apuntado");
ok((await llamar("pago", { titulo: "Vinted", texto: "Pago de 1.250,00 € realizado" }, beto)).datos.repetido, "la misma notificación dos veces seguidas no se apunta dos veces");
ok((await llamar("pago", { titulo: "Google Wallet", texto: "Tu tarjeta ya está lista para pagar" }, beto)).datos.ignorado, "una notificación que no es un pago se ignora");
await llamar("pago", { titulo: "[not_title]", texto: "[notification]" }, beto);
const ultimo = (await llamar("ultimo-pago", null, beto)).datos;
ok(ultimo.resultado === "ignorado" && ultimo.texto === "[not_title] [notification]", "si MacroDroid manda los nombres sin cambiar, la guía lo enseña tal cual para avisar");
await llamar("pago", { titulo: "Mercadona", texto: "4,00 €", prueba: true }, beto);
ok((await llamar("ultimo-pago", null, beto)).datos.texto === "[not_title] [notification]", "el botón «Probar» no cuenta como pago recibido");

// «Tu dinero»: de dónde sale cada gasto, los ajustes de saldo y el saldo guardado en la nube
await llamar("sync", { cambios: [{ ...mov("d-efectivo", "2026-10-21"), donde: "efectivo" }, { ...mov("d-raro", "2026-10-21"), donde: "bolsillo-trasero" },
  { id: "d-ajuste", tipo: "gasto", cat: "otros", importe: 250, nota: "Sin apuntar", fecha: "2026-10-21", origen: "ajuste", donde: "banco" }],
  ajustes: { saldo: { valor: { efectivo: { importe: 9000, desde: "2026-10-21T10:00:00Z" }, banco: { importe: 0, desde: "2026-10-21T10:00:00Z" } } } } }, beto);
const fila = (id) => DB.sql.prepare("SELECT donde, origen FROM movs WHERE id = ?").get(id);
ok(fila("d-efectivo").donde === "efectivo", "un gasto pagado en efectivo se guarda con «efectivo»");
ok(fila("d-raro").donde === null, "un sitio que no existe se queda sin decir");
ok(fila("d-ajuste").origen === "ajuste" && fila("d-ajuste").donde === "banco", "los ajustes de saldo se guardan como tales");
ok(DB.sql.prepare("SELECT donde FROM movs WHERE origen = 'wallet' LIMIT 1").get().donde === "banco", "lo pagado con el móvil sale de la cuenta del banco");
const vuelta = (await llamar("sync", { desde: 0 }, beto)).datos;
ok(vuelta.movs.find((m) => m.id === "d-efectivo")?.donde === "efectivo" && vuelta.ajustes.saldo?.valor.efectivo.importe === 9000, "al sincronizar vuelven el sitio de cada gasto y tus saldos");

// Tus horas: el precio y los apuntes se guardan en la nube como un ajuste más
await llamar("sync", { ajustes: { horas: { valor: { precio: 800, apuntes: [{ id: "h1", fecha: "2026-10-21", min: 270, nota: "Turno de tarde" }] } } } }, beto);
ok((await llamar("sync", { desde: 0 }, beto)).datos.ajustes.horas?.valor.apuntes[0].min === 270, "tus horas y lo que cobras la hora se guardan en la nube");
ok(!(await llamar("ideas")).datos.ideas.some((i) => i.id === "horas"), "«Apuntar tus horas» ya no sale en «Tú decides lo que viene»");

console.log(fallos ? `\n${fallos} prueba(s) fallan` : "\nTodo bien");
process.exitCode = fallos ? 1 : 0;
