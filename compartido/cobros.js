// Cobros entre amigos: avisos al móvil, textos de los toques y recordatorios automáticos.
// Lo usan la API (functions/api) y el programa diario de avisos (avisos/).
import { enviarPush } from "./push.js";

export const euros = (c) => (c / 100).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
export const METODOS = { bizum: "Bizum", paypal: "PayPal", revolut: "Revolut", efectivo: "en efectivo", otro: "otra forma" };

// Manda un aviso a todos los móviles de esa persona; borra los que ya no existen. Devuelve a cuántos llegó.
export async function avisarUsuario(env, usuario, mensaje) {
  if (!usuario || !env.VAPID_PRIVADA) return 0;
  const { results: subs } = await env.DB.prepare("SELECT endpoint, p256dh, auth FROM push_subs WHERE usuario = ?1").bind(usuario).all();
  let llegados = 0;
  for (const s of subs) {
    const estado = await enviarPush(s, mensaje, env).catch(() => 0);
    if (estado === 404 || estado === 410) await env.DB.prepare("DELETE FROM push_subs WHERE endpoint = ?1").bind(s.endpoint).run();
    else if (estado >= 200 && estado < 300) llegados++;
  }
  return llegados;
}

// Lo que ve quien abre el enlace de cobro: quién pide cuánto y cómo se le puede pagar. Nada más (ni el resto del grupo ni ids).
export async function cobroPublico(env, id) {
  if (!/^[A-Z0-9]{10}$/.test(String(id || ""))) return null;
  const c = await env.DB.prepare(`SELECT c.id, c.importe, c.estado, c.metodo, c.actualizado, g.nombre AS grupo, md.nombre AS de, ma.nombre AS a, ma.usuario AS usuario_a
    FROM cobros c JOIN grupos g ON g.id = c.grupo JOIN miembros md ON md.grupo = c.grupo AND md.id = c.de JOIN miembros ma ON ma.grupo = c.grupo AND ma.id = c.a WHERE c.id = ?1`).bind(id).first();
  if (!c) return null;
  const d = c.usuario_a ? await env.DB.prepare("SELECT bizum, paypal, revolut FROM cobro_datos WHERE usuario = ?1").bind(c.usuario_a).first() : null;
  const { usuario_a, ...publico } = c;
  return { ...publico, metodos: { bizum: d?.bizum || null, paypal: d?.paypal || null, revolut: d?.revolut || null } };
}

// Toques: el normal es educado; el picante, para grupos de confianza. Se elige uno al azar.
const TOQUES = {
  normal: [
    (q, a) => `Le debes ${q} a ${a}. Cuando puedas, págalo desde aquí.`,
    (q, a) => `${a} te recuerda los ${q}. Son dos toques.`,
    (q, a) => `Pendiente: ${q} para ${a}. Toca para pagar.`,
  ],
  picante: [
    (q, a) => `${a} sigue esperando sus ${q}. Que se note que eres de fiar.`,
    (q, a) => `Los ${q} de ${a} no se van a pagar solos.`,
    (q, a) => `${a} ya ha preguntado por sus ${q}. Dos veces.`,
    (q, a) => `Ese Bizum de ${q} a ${a} lleva más tiempo esperando que tú en la cola del súper.`,
  ],
};
export function textoToque(importe, acreedor, picante) {
  const lista = TOQUES[picante ? "picante" : "normal"];
  return lista[Math.floor(Math.random() * lista.length)](euros(importe), acreedor);
}

// Recordatorios automáticos: cobros pendientes de hace 3 días o más, cada 3 días, como mucho 3 veces.
// Solo a quien debe y tiene la app con avisos; y nunca el mismo día que le dieron un toque.
export async function recordarCobros(env, ahora = new Date()) {
  const hace3 = new Date(ahora - 3 * 864e5).toISOString(), hace20h = new Date(ahora - 20 * 36e5).toISOString();
  const { results } = await env.DB.prepare(`SELECT c.id, c.importe, c.de, c.a, g.nombre AS grupo, md.usuario AS deudor, ma.nombre AS acreedor
    FROM cobros c JOIN grupos g ON g.id = c.grupo
    JOIN miembros md ON md.grupo = c.grupo AND md.id = c.de JOIN miembros ma ON ma.grupo = c.grupo AND ma.id = c.a
    WHERE c.estado = 'pendiente' AND c.creado <= ?1 AND c.avisos < 3 AND (c.ultimo_aviso IS NULL OR c.ultimo_aviso <= ?1)
      AND (c.ultimo_toque IS NULL OR c.ultimo_toque <= ?2) AND md.usuario IS NOT NULL LIMIT 200`).bind(hace3, hace20h).all();
  let enviados = 0;
  for (const c of results) {
    const llegados = await avisarUsuario(env, c.deudor, { titulo: `Recuerda: ${euros(c.importe)} a ${c.acreedor}`, cuerpo: `De «${c.grupo}». Toca para pagarlo en un momento.`, etiqueta: "cobro-" + c.id, url: "/c/" + c.id });
    await env.DB.prepare("UPDATE cobros SET avisos = avisos + 1, ultimo_aviso = ?2 WHERE id = ?1").bind(c.id, ahora.toISOString()).run();
    if (llegados) enviados++;
  }
  return { pendientes: results.length, enviados };
}
