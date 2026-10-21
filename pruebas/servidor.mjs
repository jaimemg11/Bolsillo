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
const llamar = async (ruta, cuerpo, clave) => {
  const r = await onRequest({ request: new Request("https://bolsillo.test/api/" + ruta, { method: cuerpo ? "POST" : "GET", headers: { "CF-Connecting-IP": "1.2.3.4", ...(clave ? { Authorization: "Bearer " + clave } : {}) }, body: cuerpo ? JSON.stringify(cuerpo) : undefined }),
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

console.log(fallos ? `\n${fallos} prueba(s) fallan` : "\nTodo bien");
process.exitCode = fallos ? 1 : 0;
