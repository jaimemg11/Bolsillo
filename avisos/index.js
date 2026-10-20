// Programa diario de avisos de Bolsillo (Cloudflare Worker con horario): cada tarde mira a quién le toca un aviso y se lo manda.
// Usa la misma base de datos que la app. Como mucho un aviso por persona y día.
import { enviarPush } from "../compartido/push.js";
import { avisoDelDia } from "../compartido/avisos.js";
import { cerrarSiToca, masDias } from "../compartido/duelos.js";
import { recordarCobros } from "../compartido/cobros.js";

// Duelo que terminó ayer: se cierra y se anuncia quién ha ganado (y el pacto)
async function avisoDuelo(env, usuario, hoy) {
  const d0 = await env.DB.prepare("SELECT d.* FROM duelos d JOIN duelo_miembros m ON m.duelo = d.id WHERE m.usuario = ?1 AND d.fin = ?2 LIMIT 1").bind(usuario, masDias(hoy, -1)).first();
  if (!d0) return null;
  const d = await cerrarSiToca(env, d0, hoy);
  const filas = JSON.parse(d.resultado || "{}").filas || [];
  if (filas.length < 2) return null;
  const ganador = filas.find((f) => f.usuario === d.ganador);
  const pacto = d.pacto ? ` Pacto: ${d.pacto}.` : "";
  if (d.ganador === usuario) return { titulo: `Has ganado «${d.nombre}»`, cuerpo: `Gastaste el ${String(ganador.pct).replace(".", ",")} % de tu presupuesto, menos que nadie.${pacto}`, etiqueta: "duelo" };
  return { titulo: `«${d.nombre}» ha terminado`, cuerpo: ganador ? `Ha ganado ${ganador.nombre}.${pacto} La próxima es tuya.` : `Empate: nadie ha ganado esta vez.${pacto}`, etiqueta: "duelo" };
}

const hoyMadrid = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" });

async function repartir(env) {
  const hoy = hoyMadrid(), desde = new Date(Date.now() - 120 * 864e5).toISOString().slice(0, 10);
  const { results: subs } = await env.DB.prepare("SELECT endpoint, usuario, p256dh, auth FROM push_subs WHERE ultimo_envio IS NULL OR ultimo_envio < ?1").bind(hoy).all();
  const porUsuario = {};
  for (const s of subs) (porUsuario[s.usuario] ||= []).push(s);
  let enviados = 0, borrados = 0;
  for (const [usuario, lista] of Object.entries(porUsuario)) {
    const { results: movs } = await env.DB.prepare("SELECT tipo, importe, nota, fecha FROM movs WHERE usuario = ?1 AND borrado = 0 AND fecha >= ?2").bind(usuario, desde).all();
    const aviso = (await avisoDuelo(env, usuario, hoy).catch(() => null)) || avisoDelDia(movs, hoy);
    if (!aviso) continue;
    for (const s of lista) {
      const estado = await enviarPush(s, aviso, env).catch(() => 0);
      if (estado === 404 || estado === 410) { await env.DB.prepare("DELETE FROM push_subs WHERE endpoint = ?1").bind(s.endpoint).run(); borrados++; }
      else if (estado >= 200 && estado < 300) { await env.DB.prepare("UPDATE push_subs SET ultimo_envio = ?2 WHERE endpoint = ?1").bind(s.endpoint, hoy).run(); enviados++; }
    }
  }
  return { hoy, personas: Object.keys(porUsuario).length, enviados, borrados };
}

export default {
  async scheduled(evento, env, ctx) {
    ctx.waitUntil(repartir(env).then((r) => console.log("avisos", JSON.stringify(r))));
    // Deudas de grupo olvidadas: un recordatorio a quien debe (cada 3 días, como mucho 3 veces)
    ctx.waitUntil(recordarCobros(env).then((r) => console.log("cobros", JSON.stringify(r))).catch((e) => console.log("cobros falla", e.message)));
  },
};
