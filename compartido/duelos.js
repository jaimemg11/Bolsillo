// Duelos: gana quien gasta MENOS porcentaje de su propio presupuesto (justo aunque cada uno tenga distinto dinero).
// Solo salen porcentajes: nadie ve los euros ni los gastos de nadie. Lo usan la API y el programa diario de avisos.
const dia = 864e5;
export const masDias = (iso, n) => new Date(new Date(iso + "T12:00:00Z").getTime() + n * dia).toISOString().slice(0, 10);
export const diasEntre = (a, b) => Math.round((new Date(b + "T12:00:00Z") - new Date(a + "T12:00:00Z")) / dia);
export const hoyMadrid = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" });
export const DURACION = { semana: 7, mes: 30 };

// Marcador a fecha de «hoy». Para contar, hay que haber apuntado algo al menos la mitad de los días (si no, no puede ganar).
export async function marcador(env, duelo, hoy) {
  const { results: miembros } = await env.DB.prepare("SELECT usuario, nombre, presupuesto FROM duelo_miembros WHERE duelo = ?1 ORDER BY unido").bind(duelo.id).all();
  const total = diasEntre(duelo.inicio, duelo.fin) + 1, hasta = hoy < duelo.fin ? hoy : duelo.fin;
  const transcurridos = hoy < duelo.inicio ? 0 : diasEntre(duelo.inicio, hasta) + 1, terminado = hoy > duelo.fin;
  const minimo = Math.ceil((terminado ? total : transcurridos) / 2);
  const filas = [];
  for (const m of miembros) {
    const r = await env.DB.prepare(`SELECT COALESCE(SUM(CASE WHEN tipo = 'gasto' THEN importe END), 0) AS gastado,
      COALESCE(SUM(CASE WHEN tipo = 'gasto' AND origen IN ('applepay', 'wallet') THEN importe END), 0) AS ap, COUNT(DISTINCT fecha) AS dias
      FROM movs WHERE usuario = ?1 AND borrado = 0 AND fecha BETWEEN ?2 AND ?3`).bind(m.usuario, duelo.inicio, hasta).first();
    const tope = Math.max(1, Math.round((m.presupuesto * total) / 30)); // lo que le toca gastar en todo el duelo
    filas.push({ usuario: m.usuario, nombre: m.nombre, pct: Math.round((r.gastado / tope) * 1000) / 10, dias: r.dias,
      applepay: r.gastado ? Math.round((r.ap / r.gastado) * 100) : 0, valido: r.dias >= minimo });
  }
  filas.sort((a, b) => Number(b.valido) - Number(a.valido) || a.pct - b.pct);
  return { total, transcurridos, terminado, minimo, filas };
}

// Si el duelo ya acabó y sigue abierto, se cierra: se congela el marcador y se decide el ganador
export async function cerrarSiToca(env, duelo, hoy = hoyMadrid()) {
  if (duelo.estado !== "activo" || hoy <= duelo.fin) return duelo;
  const m = await marcador(env, duelo, masDias(duelo.fin, 1));
  const [a, b] = m.filas;
  const ganador = m.filas.length >= 2 && a?.valido && (!b?.valido || a.pct < b.pct) ? a.usuario : null; // empate o nadie válido: sin ganador
  const resultado = JSON.stringify(m);
  await env.DB.prepare("UPDATE duelos SET estado = 'terminado', ganador = ?2, resultado = ?3 WHERE id = ?1 AND estado = 'activo'").bind(duelo.id, ganador, resultado).run();
  return { ...duelo, estado: "terminado", ganador, resultado };
}
