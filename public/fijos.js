// Gastos e ingresos fijos: el alquiler, el gimnasio o la paga se apuntan solos cada mes, el día que toca.
// Lo usan el servidor (al sincronizar, para quien tiene nube) y la app (para quien no la tiene).
// Cada mes de cada fijo tiene su propio id: nunca se apunta dos veces, y si borras el de un mes no vuelve.
//   fijo = { id, nombre, tipo: "gasto" | "ingreso", cat, importe (céntimos), dia (1-31), desde: "AAAA-MM" (primer mes que cuenta) }

export const idFijo = (f, mes) => `fijo-${f.id}-${mes}`;

export function moverMes(mes, n) {
  const [a, m] = mes.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1 + n, 1)).toISOString().slice(0, 7);
}

// El día 31 en un mes de 30 días es el 30 (y en febrero, el 28 o 29)
export function fechaEnMes(f, mes) {
  const [a, m] = mes.split("-").map(Number), ultimo = new Date(Date.UTC(a, m, 0)).getUTCDate();
  return `${mes}-${String(Math.min(f.dia, ultimo)).padStart(2, "0")}`;
}

export function fijoValido(f) {
  return Boolean(f) && typeof f.id === "string" && /^[a-z0-9]{3,12}$/.test(f.id) && ["gasto", "ingreso"].includes(f.tipo)
    && Number.isInteger(f.importe) && f.importe > 0 && f.importe <= 10_000_000
    && Number.isInteger(f.dia) && f.dia >= 1 && f.dia <= 31 && /^\d{4}-\d{2}$/.test(f.desde || "");
}

// Los que ya tocan hasta hoy: los de este mes y, por si llevabas días sin abrir la app, los del mes anterior
export function fijosQueTocan(fijos, hoy) {
  const salida = [], mesHoy = hoy.slice(0, 7);
  for (const f of (Array.isArray(fijos) ? fijos : []).filter(fijoValido)) {
    for (const mes of [moverMes(mesHoy, -1), mesHoy]) {
      const fecha = fechaEnMes(f, mes);
      if (mes < f.desde || fecha > hoy) continue;
      salida.push({ id: idFijo(f, mes), tipo: f.tipo, cat: String(f.cat || ""), importe: f.importe, nota: String(f.nombre || "").slice(0, 60), fecha });
    }
  }
  return salida;
}
