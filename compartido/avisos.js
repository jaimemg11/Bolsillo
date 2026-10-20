// Qué aviso le toca hoy a una persona, a partir de sus movimientos (como mucho uno al día, el más importante).
// Las mismas ideas que la app: cobros que se repiten, tu mes para compartir y la racha.
const dia = 864e5;
const masDias = (iso, n) => new Date(new Date(iso + "T12:00:00Z").getTime() + n * dia).toISOString().slice(0, 10);
const diasEntre = (a, b) => Math.round((new Date(b + "T12:00:00Z") - new Date(a + "T12:00:00Z")) / dia);
const euros = (c) => (c / 100).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
const nombreClave = (t) => String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z ]/g, " ").replace(/\b(sa|sl|slu|sau|ab|inc|ltd|es|espana)\b/g, "").replace(/\s+/g, " ").trim();

// Lo que se cobra cada mes por lo mismo (mismo nombre, importe parecido, cada ~30 días)
export function suscripciones(movs, hoy) {
  const grupos = {};
  for (const g of movs) if (g.tipo === "gasto") { const k = nombreClave(g.nota); if (k.length >= 3) (grupos[k] ||= []).push(g); }
  const salida = [];
  for (const lista of Object.values(grupos)) {
    lista.sort((a, b) => a.fecha.localeCompare(b.fecha));
    const meses = new Set(lista.map((g) => g.fecha.slice(0, 7)));
    if (meses.size < 2 || lista.length > meses.size + 1) continue;
    const imp = lista.map((g) => g.importe).sort((a, b) => a - b), mediana = imp[Math.floor(imp.length / 2)];
    if (lista.some((g) => Math.abs(g.importe - mediana) > mediana * 0.2)) continue;
    const saltos = lista.slice(1).map((g, i) => diasEntre(lista[i].fecha, g.fecha)), media = saltos.reduce((s, x) => s + x, 0) / saltos.length;
    if (media < 24 || media > 37) continue;
    const ultima = lista.at(-1), proximo = masDias(ultima.fecha, Math.round(media));
    salida.push({ nombre: ultima.nota, importe: ultima.importe, faltan: diasEntre(hoy, proximo) });
  }
  return salida;
}

export function racha(movs, hoy) {
  const dias = new Set(movs.map((m) => m.fecha));
  let d = masDias(hoy, -1), n = 0; // hasta ayer: lo de hoy es lo que se quiere conseguir
  while (dias.has(d)) { n++; d = masDias(d, -1); }
  return { n, hoy: dias.has(hoy) };
}

const NOMBRES = { comida: "Comida", super: "Súper", transporte: "Transporte", ocio: "Ocio", ropa: "Ropa", subs: "Suscripciones", estudios: "Estudios", otros: "Otros" };

// El domingo: lo gastado de lunes a hoy, comparado con la semana anterior, y en qué se fue más
export function resumenSemana(movs, hoy) {
  if (new Date(hoy + "T12:00:00Z").getUTCDay() !== 0) return null;
  const entre = (desde, hasta) => movs.filter((m) => m.tipo === "gasto" && m.fecha >= desde && m.fecha <= hasta);
  const semana = entre(masDias(hoy, -6), hoy), antes = entre(masDias(hoy, -13), masDias(hoy, -7));
  const suma = (l) => l.reduce((s, m) => s + m.importe, 0), total = suma(semana), totalAntes = suma(antes);
  if (!semana.length) return antes.length ? { titulo: "Esta semana no has apuntado nada", cuerpo: "¿Semana de ahorro o se te ha olvidado? Apunta lo que falte y mira cómo vas.", etiqueta: "semana" } : null;
  const porCat = {};
  for (const m of semana) porCat[m.cat] = (porCat[m.cat] || 0) + m.importe;
  const [cat, mas] = Object.entries(porCat).sort((a, b) => b[1] - a[1])[0];
  const dif = total - totalAntes;
  const comparacion = !antes.length ? "" : Math.abs(dif) < 100 ? "Igual que la semana pasada. " : `${euros(Math.abs(dif))} ${dif < 0 ? "menos" : "más"} que la semana pasada. `;
  return { titulo: `Tu semana: ${euros(total)}`, cuerpo: `${comparacion}Lo que más: ${NOMBRES[cat] || "Otros"} (${euros(mas)}).`, etiqueta: "semana" };
}

// Quien tiene el presupuesto «según lo que cobro»: el día que cobra, si aún no ha apuntado lo cobrado, se lo recuerda
export function recordarCobro(movs, hoy, { paga, variable } = {}) {
  if (!variable || !paga) return null;
  const [a, m, d] = hoy.split("-").map(Number), ultimo = new Date(Date.UTC(a, m, 0)).getUTCDate();
  const esHoy = Number.isInteger(paga.semana) ? new Date(hoy + "T12:00:00Z").getUTCDay() === paga.semana : Number(paga.dia) > 1 && d === Math.min(Number(paga.dia), ultimo);
  if (!esHoy || movs.some((x) => x.tipo === "ingreso" && (x.cat === "trabajo" || x.cat === "paga") && x.fecha === hoy)) return null;
  return { titulo: "¿Ya has cobrado?", cuerpo: `Apunta cuánto te han pagado hoy y tu presupuesto ${Number.isInteger(paga.semana) ? "de la semana" : "del mes"} se ajusta solo.`, etiqueta: "cobro" };
}

export function avisoDelDia(movs, hoy, ajustes = {}) {
  const renueva = suscripciones(movs, hoy).find((s) => s.faltan === 1);
  if (renueva) return { titulo: `Mañana se renueva ${renueva.nombre}`, cuerpo: `${euros(renueva.importe)}. ¿La sigues usando? Si no, aún estás a tiempo de darte de baja.`, etiqueta: "renovacion" };
  const cobro = recordarCobro(movs, hoy, ajustes);
  if (cobro) return cobro;
  if (hoy.endsWith("-01")) {
    const k = masDias(hoy, -1).slice(0, 7), n = movs.filter((m) => m.tipo === "gasto" && m.fecha.startsWith(k)).length;
    const mes = new Date(k + "-15T12:00:00Z").toLocaleDateString("es-ES", { month: "long" });
    if (n >= 3) return { titulo: `Tu ${mes} en Bolsillo está listo`, cuerpo: "Mira en qué se te fue el dinero y compártelo en stories.", etiqueta: "mes" };
  }
  const semana = resumenSemana(movs, hoy);
  if (semana) return semana;
  const r = racha(movs, hoy);
  if (r.n >= 3 && !r.hoy) return { titulo: `Tu racha de ${r.n} días está en peligro`, cuerpo: "Apunta algo hoy para no perderla. ¡Son dos segundos!", etiqueta: "racha" };
  return null;
}
