// Bolsillo · lo que la diferencia: tu mes para compartir, cobros que se repiten, retos, huchas, insignias, grupos y apuntar con la voz.
// Usa la API que deja el núcleo en window.B (datos, sincronización, hojas, avisos…).
(() => {
  "use strict";
  const B = window.B, $ = (s) => document.querySelector(s), $$ = (s) => [...document.querySelectorAll(s)];
  const { euros, esc, catDe, avisar } = B;
  const dia = 864e5;
  const fechaISO = (d) => d.toLocaleDateString("sv-SE");
  const masDias = (iso, n) => fechaISO(new Date(new Date(iso + "T12:00:00").getTime() + n * dia));
  const diasEntre = (a, b) => Math.round((new Date(b + "T12:00:00") - new Date(a + "T12:00:00")) / dia);
  const gastos = () => B.vivos().filter((m) => m.tipo === "gasto");
  const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;
  const fechaCorta = (iso) => new Date(iso + "T12:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "short" }).replace(".", "");

  // ============ Racha: días seguidos apuntando algo (hoy o ayer cuentan) ============
  function racha() {
    const dias = new Set(B.vivos().map((m) => m.fecha));
    let d = B.hoyISO();
    if (!dias.has(d)) d = masDias(d, -1);
    let n = 0;
    while (dias.has(d)) { n++; d = masDias(d, -1); }
    return n;
  }
  function mejorRacha() {
    const dias = [...new Set(B.vivos().map((m) => m.fecha))].sort();
    let mejor = 0, actual = 0;
    dias.forEach((d, i) => { actual = i && diasEntre(dias[i - 1], d) === 1 ? actual + 1 : 1; mejor = Math.max(mejor, actual); });
    return mejor;
  }

  // ============ Cazador de suscripciones: lo que se cobra cada mes por lo mismo ============
  const nombreClave = (t) => String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z ]/g, " ").replace(/\b(sa|sl|slu|sau|ab|inc|ltd|es|espana)\b/g, "").replace(/\s+/g, " ").trim();
  function suscripciones() {
    const grupos = {};
    for (const g of gastos()) {
      const k = nombreClave(g.nota);
      if (k.length < 3) continue;
      (grupos[k] ||= []).push(g);
    }
    const hoy = B.hoyISO(), salida = [];
    for (const lista of Object.values(grupos)) {
      lista.sort((a, b) => a.fecha.localeCompare(b.fecha));
      const meses = [...new Set(lista.map((g) => g.fecha.slice(0, 7)))];
      if (meses.length < 2 || lista.length > meses.length + 1) continue; // varias veces al mes = no es una suscripción (es el súper)
      const importes = lista.map((g) => g.importe).sort((a, b) => a - b), mediana = importes[Math.floor(importes.length / 2)];
      if (lista.some((g) => Math.abs(g.importe - mediana) > mediana * 0.2)) continue; // el importe tiene que ser parecido
      const saltos = lista.slice(1).map((g, i) => diasEntre(lista[i].fecha, g.fecha)), media = saltos.reduce((s, x) => s + x, 0) / saltos.length;
      if (media < 24 || media > 37) continue; // más o menos cada mes
      const ultima = lista.at(-1), proximo = masDias(ultima.fecha, Math.round(media));
      if (diasEntre(proximo, hoy) > 20) continue; // ya no se cobra (se dio de baja)
      salida.push({ nombre: ultima.nota, importe: ultima.importe, cat: ultima.cat, proximo, faltan: diasEntre(hoy, proximo), anual: ultima.importe * 12, veces: lista.length, origen: ultima.origen });
    }
    return salida.sort((a, b) => a.faltan - b.faltan);
  }

  // ============ Retos ============
  const DELIVERY = /glovo|uber ?eats|just ?eat|deliveroo|telepizza|domino|a domicilio/i;
  const RETOS = [
    { tipo: "sin_gastar", icono: "snowflake", color: "#32ade6", nombre: "Un día sin gastar", desc: "Pasa un día entero sin ningún gasto.", dias: 1, falla: () => true },
    { tipo: "sin_caprichos", icono: "flower-lotus", color: "#af52de", nombre: "3 días sin caprichos", desc: "Nada de comida fuera, ocio ni ropa durante 3 días.", dias: 3, falla: (g) => ["comida", "ocio", "ropa"].includes(g.cat) },
    { tipo: "sin_delivery", icono: "moped", color: "#ff9500", nombre: "Semana sin delivery", desc: "7 días sin pedir comida a domicilio (Glovo, Uber Eats, Just Eat…).", dias: 7, falla: (g) => DELIVERY.test(g.nota || "") },
    { tipo: "sin_cafe", icono: "coffee", color: "#a2845e", nombre: "Semana sin cafeterías", desc: "7 días sin cafés ni Starbucks: el café, en casa.", dias: 7, falla: (g) => /caf[eé]|starbucks|cafeter/i.test(g.nota || "") },
    { tipo: "semana_presupuesto", icono: "target", color: "#ff2d55", nombre: "Semana en presupuesto", desc: "Gasta como mucho lo que te toca por semana según tu presupuesto.", dias: 7, necesita: "presupuesto", limite: () => B.presupuestoSemana() || 0 },
    { tipo: "menos_semana", icono: "trend-down", color: "#28a745", nombre: "Gasta menos que la semana pasada", desc: "Que estos 7 días sumen menos que los 7 anteriores.", dias: 7, limite: (inicio) => gastos().filter((g) => g.fecha >= masDias(inicio, -7) && g.fecha < inicio).reduce((s, g) => s + g.importe, 0) },
  ];
  const retoDe = (r) => RETOS.find((x) => x.tipo === r.tipo);
  // Gastos que cuentan para un reto: desde que lo empezaste (los de ese día apuntados antes, no)
  const gastosReto = (r) => gastos().filter((g) => g.fecha > r.inicio || (g.fecha === r.inicio && (g.creado || "") >= r.desde));
  function evaluarRetos() {
    const retos = (B.datos.extra.retos || []).map((r) => ({ ...r }));
    const hoy = B.hoyISO(), nuevos = [];
    let cambio = false;
    for (const r of retos) {
      if (r.estado !== "activo") continue;
      const def = retoDe(r); if (!def) continue;
      const fin = masDias(r.inicio, def.dias - 1), lista = gastosReto(r).filter((g) => g.fecha <= fin);
      const total = lista.reduce((s, g) => s + g.importe, 0);
      const fallado = def.limite ? total > r.limite : lista.some(def.falla);
      if (fallado && !(def.tipo === "menos_semana" && hoy <= fin)) { r.estado = "fallado"; r.cerrado = hoy; cambio = true; }
      else if (hoy > fin && !fallado) { r.estado = "superado"; r.cerrado = hoy; cambio = true; nuevos.push(def); }
    }
    if (cambio) B.setExtra("retos", retos);
    nuevos.forEach((d) => celebrar(d.icono, d.color, "¡Reto superado!", d.nombre));
  }
  function empezarReto(tipo) {
    const def = RETOS.find((x) => x.tipo === tipo);
    if (def.necesita === "presupuesto" && !B.datos.presupuesto) return avisar("Pon antes un presupuesto en Ajustes");
    const r = { id: tipo + Date.now().toString(36), tipo, inicio: B.hoyISO(), desde: new Date().toISOString(), estado: "activo" };
    if (def.limite) r.limite = def.limite(r.inicio);
    if (def.tipo === "menos_semana" && !r.limite) return avisar("Aún no hay gastos de la semana pasada para comparar");
    B.setExtra("retos", [...(B.datos.extra.retos || []).filter((x) => x.estado === "activo" || x.cerrado >= masDias(B.hoyISO(), -60)), r]);
    avisar(`Reto empezado: ${def.nombre}`); pintarMetas();
  }

  // ============ Insignias ============
  const mesesCerrados = () => [...new Set(B.vivos().map((m) => m.fecha.slice(0, 7)))].filter((k) => k < B.hoyISO().slice(0, 7));
  const totalMes = (k, tipo) => B.vivos().filter((m) => m.tipo === tipo && m.fecha.startsWith(k)).reduce((s, m) => s + m.importe, 0);
  const INSIGNIAS = [
    { id: "primer_paso", icono: "plant", color: "#28a745", nombre: "Primer paso", desc: "Apunta tu primer gasto", ok: () => B.vivos().length >= 1 },
    { id: "racha_7", icono: "fire", color: "#ff9500", nombre: "Una semana seguida", desc: "7 días seguidos apuntando", ok: () => mejorRacha() >= 7 },
    { id: "racha_30", icono: "crown", color: "#ffb800", nombre: "Un mes imparable", desc: "30 días seguidos apuntando", ok: () => mejorRacha() >= 30 },
    { id: "cien", icono: "seal-check", color: "#007aff", nombre: "Centenario", desc: "100 movimientos apuntados", ok: () => B.vivos().length >= 100 },
    { id: "detallista", icono: "note-pencil", color: "#5856d6", nombre: "Detallista", desc: "20 gastos con nota", ok: () => B.vivos().filter((m) => m.nota).length >= 20 },
    { id: "mes_verde", icono: "target", color: "#ff2d55", nombre: "Mes en verde", desc: "Termina un mes sin pasarte del presupuesto", ok: () => B.datos.presupuesto && mesesCerrados().some((k) => totalMes(k, "gasto") > 0 && totalMes(k, "gasto") <= B.presupuestoMes()) },
    { id: "ahorrador", icono: "piggy-bank", color: "#ff6b9a", nombre: "Mes en positivo", desc: "Un mes con más ingresos que gastos", ok: () => mesesCerrados().some((k) => totalMes(k, "ingreso") > totalMes(k, "gasto") && totalMes(k, "gasto") > 0) },
    { id: "cocinillas", icono: "cooking-pot", color: "#34c759", nombre: "Cocinillas", desc: "Un mes entero sin pedir a domicilio", ok: () => mesesCerrados().some((k) => B.vivos().filter((m) => m.fecha.startsWith(k)).length >= 10 && !gastos().some((g) => g.fecha.startsWith(k) && DELIVERY.test(g.nota || ""))) },
    { id: "nube", icono: "cloud-check", color: "#32ade6", nombre: "En la nube", desc: "Crea tu nube", ok: () => Boolean(B.sync.clave) },
    { id: "applepay", icono: "contactless-payment", color: "#1c1c1e", nombre: "Piloto automático", desc: "Un pago apuntado solo al pagar con el móvil", ok: () => B.vivos().some((m) => m.origen === "applepay" || m.origen === "wallet") },
    { id: "voz", icono: "microphone", color: "#af52de", nombre: "Manos libres", desc: "Apunta un gasto con la voz", ok: () => B.vivos().some((m) => m.origen === "voz") },
    { id: "cazador", icono: "magnifying-glass", color: "#30b0c7", nombre: "Cazasuscripciones", desc: "Bolsillo detecta un cobro que se repite", ok: () => suscripciones().length > 0 },
    { id: "hucha", icono: "vault", color: "#a2845e", nombre: "Primera hucha", desc: "Crea una hucha para ahorrar", ok: () => (B.datos.extra.huchas || []).length > 0 },
    { id: "hucha_llena", icono: "coins", color: "#ffb800", nombre: "Hucha llena", desc: "Completa una hucha", ok: () => (B.datos.extra.huchas || []).some((h) => h.ahorrado >= h.objetivo) },
    { id: "reto", icono: "lightning", color: "#ff9500", nombre: "Retador", desc: "Supera tu primer reto", ok: () => (B.datos.extra.retos || []).some((r) => r.estado === "superado") },
    { id: "retos_5", icono: "medal", color: "#ff2d55", nombre: "Imparable", desc: "Supera 5 retos", ok: () => (B.datos.extra.retos || []).filter((r) => r.estado === "superado").length >= 5 },
    { id: "grupo", icono: "users-three", color: "#007aff", nombre: "En equipo", desc: "Únete a un grupo de gastos", ok: () => gruposCache.length > 0 },
    { id: "wrapped", icono: "camera", color: "#5856d6", nombre: "Influencer", desc: "Comparte tu mes", ok: () => Boolean(B.datos.extra.insignias?.wrapped) },
    { id: "duelo", icono: "trophy", color: "#ffb800", nombre: "Campeón", desc: "Gana un duelo", ok: () => duelosCache.some((d) => d.gane) },
    { id: "toxico", icono: "eye", color: "#af52de", nombre: "Sin secretos", desc: "Entra en un círculo del modo tóxico", ok: () => circulosCache.length > 0 },
    { id: "duelos_3", icono: "sword", color: "#ff2d55", nombre: "Imbatible", desc: "Gana 3 duelos", ok: () => duelosCache.filter((d) => d.gane).length >= 3 },
  ];
  let evaluando = false;
  function evaluarInsignias() {
    if (evaluando) return;
    evaluando = true;
    try {
      const tengo = { ...(B.datos.extra.insignias || {}) }, nuevas = [];
      for (const i of INSIGNIAS) if (!tengo[i.id]) { let ok = false; try { ok = i.ok(); } catch {} if (ok) { tengo[i.id] = B.hoyISO(); nuevas.push(i); } }
      if (nuevas.length) {
        B.setExtra("insignias", tengo);
        if (nuevas.length > 2) celebrar(nuevas[0].icono, nuevas[0].color, `¡${nuevas.length} insignias nuevas!`, "Míralas en Metas");
        else nuevas.forEach((i, n) => setTimeout(() => celebrar(i.icono, i.color, "¡Nueva insignia!", i.nombre), n * 2600));
      }
    } finally { evaluando = false; }
  }
  function ganarInsignia(id) {
    const tengo = B.datos.extra.insignias || {};
    if (tengo[id]) return;
    const i = INSIGNIAS.find((x) => x.id === id);
    B.setExtra("insignias", { ...tengo, [id]: B.hoyISO() });
    celebrar(i.icono, i.color, "¡Nueva insignia!", i.nombre);
  }

  // Celebración: la insignia en grande con confeti
  function celebrar(icono, color, titulo, texto) {
    const c = document.createElement("div");
    c.className = "celebracion";
    c.innerHTML = `<div class="medalla"><span class="medallon" style="--c:${color}">${ico(icono)}</span><b>${esc(titulo)}</b><small>${esc(texto)}</small></div>` +
      Array.from({ length: 28 }, (_, i) => `<i style="left:${Math.random() * 100}%;background:${["#ff9f0a", "#0a84ff", "#34c759", "#ff375f", "#bf5af2", "#ffd60a"][i % 6]};animation-delay:${Math.random() * .4}s;transform:rotate(${Math.random() * 360}deg)"></i>`).join("");
    c.addEventListener("click", () => c.remove());
    document.body.append(c);
    if (navigator.vibrate && navigator.userActivation?.hasBeenActive) navigator.vibrate([20, 40, 20]);
    setTimeout(() => c.classList.add("fuera"), 2200);
    setTimeout(() => c.remove(), 2700);
  }

  // ============ Huchas ============
  let huchaEditando = null, iconoElegido = "target";
  const ICONOS_HUCHA = ["target", "laptop", "airplane-tilt", "game-controller", "car", "device-mobile", "headphones", "sneaker", "gift", "island", "graduation-cap", "house"];
  const iconoHucha = (h) => (window.ICONOS[h.emoji] ? h.emoji : "piggy-bank");
  function pintarIconosHucha() {
    $("#hucha-iconos").innerHTML = ICONOS_HUCHA.map((n) => `<button type="button" role="radio" aria-checked="${n === iconoElegido}" data-icono-hucha="${n}" aria-label="Icono ${n}">${ico(n)}</button>`).join("");
  }
  function abrirHucha(h) {
    huchaEditando = h || null;
    $("#titulo-hucha").textContent = h ? h.nombre : "Nueva hucha";
    $("#hucha-nombre").value = h?.nombre || "";
    $("#hucha-objetivo").value = h ? String(h.objetivo / 100).replace(".", ",") : "";
    iconoElegido = h ? iconoHucha(h) : "target"; pintarIconosHucha();
    $("#hucha-aportar").hidden = $("#hucha-borrar").hidden = !h;
    $("#hucha-cantidad").value = "";
    $("#hucha-progreso").innerHTML = h ? `<div class="progreso"><i style="width:${Math.min(100, h.ahorrado / h.objetivo * 100)}%"></i></div><p class="nota-ajuste num">${euros(h.ahorrado)} de ${euros(h.objetivo)}${h.ahorrado >= h.objetivo ? " · ¡Conseguido!" : ` · te faltan ${euros(h.objetivo - h.ahorrado)}`}</p>` : "";
    B.abrirHoja($("#hoja-hucha"));
  }
  function guardarHucha() {
    const nombre = $("#hucha-nombre").value.trim().slice(0, 30), objetivo = B.aCentimos($("#hucha-objetivo").value), emoji = iconoElegido; // el campo se sigue llamando emoji por compatibilidad: ahora guarda el nombre del icono
    if (!nombre || !objetivo) return avisar("Pon un nombre y cuánto quieres ahorrar");
    const huchas = (B.datos.extra.huchas || []).map((x) => ({ ...x }));
    if (huchaEditando) Object.assign(huchas.find((x) => x.id === huchaEditando.id), { nombre, objetivo, emoji });
    else huchas.push({ id: "h" + Date.now().toString(36), nombre, objetivo, emoji, ahorrado: 0, creado: B.hoyISO() });
    B.setExtra("huchas", huchas); B.cerrarHoja(); pintarMetas(); avisar(huchaEditando ? "Hucha guardada" : "Hucha creada");
  }
  function aportar(signo) {
    const c = B.aCentimos($("#hucha-cantidad").value);
    if (!c || !huchaEditando) return avisar("Escribe una cantidad");
    const huchas = (B.datos.extra.huchas || []).map((x) => ({ ...x })), h = huchas.find((x) => x.id === huchaEditando.id);
    const antes = h.ahorrado;
    h.ahorrado = Math.max(0, h.ahorrado + signo * c);
    B.setExtra("huchas", huchas);
    if (antes < h.objetivo && h.ahorrado >= h.objetivo) celebrar(iconoHucha(h), "#ffb800", "¡Hucha completada!", h.nombre);
    else avisar(signo > 0 ? `+${euros(c)} a ${h.nombre}` : `−${euros(c)} de ${h.nombre}`);
    abrirHucha(h); pintarMetas();
  }

  // ============ Vista Metas: racha, retos, huchas e insignias ============
  function pintarMetas() {
    const v = $("#vista-metas");
    if (!v || v.hidden) return;
    const r = racha(), tengo = B.datos.extra.insignias || {}, conseguidas = INSIGNIAS.filter((i) => tengo[i.id]).length;
    const retos = B.datos.extra.retos || [], activos = retos.filter((x) => x.estado === "activo"), superados = retos.filter((x) => x.estado === "superado").length;
    const huchas = B.datos.extra.huchas || [];
    v.innerHTML = `<div class="cabecera"><h1>Metas</h1></div>
      <section class="resumen racha"><div><span class="icono grande" style="--c:${r ? "#ff9500" : "#8e8e93"}">${ico(r ? "fire" : "moon-stars")}</span></div><div><div class="total num" style="font-size:36px">${plural(r, "día", "días")}</div>
        <div class="etiqueta">${r ? "seguidos apuntando. ¡No rompas la racha!" : "Apunta algo hoy para empezar una racha"} · récord ${mejorRacha()}</div></div></section>
      <h2>Retos</h2>
      ${activos.length ? `<div class="grupo">${activos.map((x) => {
        const def = retoDe(x), fin = masDias(x.inicio, def.dias - 1), pasados = Math.min(def.dias, diasEntre(x.inicio, B.hoyISO()) + 1);
        const total = def.limite ? gastosReto(x).filter((g) => g.fecha <= fin).reduce((s, g) => s + g.importe, 0) : 0;
        return `<div class="fila"><div class="icono" style="--c:${def.color}">${ico(def.icono)}</div><div class="medio"><div class="titulo">${def.nombre}</div>
          <div class="sub">${def.limite ? `${euros(total)} de ${euros(x.limite)} · ` : ""}día ${pasados} de ${def.dias} · acaba el ${fechaCorta(fin)}</div>
          <div class="cat-barra"><i style="width:${pasados / def.dias * 100}%;background:var(--acento)"></i></div></div></div>`;
      }).join("")}</div>` : ""}
      <div class="tarjetas-retos">${RETOS.filter((d) => !activos.some((x) => x.tipo === d.tipo)).map((d) => `<button class="tarjeta-reto" data-reto="${d.tipo}"><span class="icono" style="--c:${d.color}">${ico(d.icono)}</span><b>${d.nombre}</b><small>${d.desc}</small></button>`).join("")}</div>
      ${superados ? `<p class="nota-ajuste">Has superado ${plural(superados, "reto", "retos")}.</p>` : ""}
      <h2 style="display:flex;justify-content:space-between;align-items:baseline">Huchas <button class="enlace" id="nueva-hucha">+ Nueva</button></h2>
      ${huchas.length ? `<div class="grupo">${huchas.map((h) => `<button class="fila" data-hucha="${h.id}"><div class="icono" style="--c:${h.ahorrado >= h.objetivo ? "#28a745" : "#007aff"}">${ico(iconoHucha(h))}</div><div class="medio">
        <div style="display:flex;justify-content:space-between;gap:8px"><span class="titulo">${esc(h.nombre)}</span><span class="cifra num">${euros(h.ahorrado, false)} / ${euros(h.objetivo, false)}</span></div>
        <div class="cat-barra"><i style="width:${Math.min(100, h.ahorrado / h.objetivo * 100)}%;background:${h.ahorrado >= h.objetivo ? "var(--verde)" : "var(--acento)"}"></i></div></div></button>`).join("")}</div>`
        : `<div class="vacio" style="padding:20px"><b>Ahorra para algo</b>Un portátil, un viaje, el carnet… Crea una hucha y ve metiendo dinero.</div>`}
      <h2>Insignias <span class="etiqueta">${conseguidas} de ${INSIGNIAS.length}</span></h2>
      <div class="insignias">${INSIGNIAS.map((i) => `<button class="insignia ${tengo[i.id] ? "si" : ""}" data-insignia="${i.id}" aria-label="${esc(i.nombre)}: ${esc(i.desc)}${tengo[i.id] ? " (conseguida)" : ""}"><span class="medallon" style="--c:${tengo[i.id] ? i.color : "#8e8e93"}">${ico(tengo[i.id] ? i.icono : "lock-simple")}</span><b>${i.nombre}</b></button>`).join("")}</div>
      <button class="tarjeta-ideas" id="abrir-ideas"><span class="icono" style="--c:#007aff">${ico("thumbs-up")}</span><div><b>Tú decides lo que viene</b><small>Vota las próximas funciones de Bolsillo</small></div><span class="enlace">›</span></button>`;
    v.querySelectorAll("[data-reto]").forEach((b) => b.addEventListener("click", () => {
      const d = RETOS.find((x) => x.tipo === b.dataset.reto);
      B.dialogo({ titulo: d.nombre, texto: `${d.desc} Bolsillo lo comprueba solo con tus gastos.`, boton: "Empezar hoy", cancelar: "Ahora no" }).then((ok) => ok && empezarReto(d.tipo));
    }));
    v.querySelectorAll("[data-hucha]").forEach((b) => b.addEventListener("click", () => abrirHucha(huchas.find((h) => h.id === b.dataset.hucha))));
    $("#nueva-hucha").addEventListener("click", () => abrirHucha());
    $("#abrir-ideas").addEventListener("click", abrirIdeas);
    v.querySelectorAll("[data-insignia]").forEach((b) => b.addEventListener("click", () => {
      const i = INSIGNIAS.find((x) => x.id === b.dataset.insignia);
      avisar(tengo[i.id] ? `${i.nombre} · conseguida el ${fechaCorta(tengo[i.id])}` : `Por conseguir: ${i.desc}`);
    }));
  }

  // ============ En la vista Mes: avisos de renovación, cobros fijos y tu mes para compartir ============
  function pintarEnMes() {
    const subs = suscripciones(), proximas = subs.filter((s) => s.faltan >= 0 && s.faltan <= 3);
    const caja = $("#extras-mes");
    if (!caja) return;
    const esActual = B.mesVisto === B.hoyISO().slice(0, 7);
    const delMes = gastos().filter((g) => g.fecha.startsWith(B.mesVisto));
    // Fijos de este mes que aún no han llegado: para que el «te quedan» no engañe
    const faltan = esActual ? (B.datos.extra.fijos || []).filter((f) => f.tipo === "gasto" && f.dia > Number(B.hoyISO().slice(8)) && f.desde <= B.mesVisto) : [];
    const avisoFijos = faltan.length ? `<button class="banner" id="banner-fijos" style="width:100%;text-align:left"><span class="icono chico" style="--c:#5856d6">${ico("calendar-check")}</span><span>Este mes aún faltan <b>${faltan.length === 1 ? esc(faltan[0].nombre) : `${faltan.length} gastos fijos`}</b>: ${euros(faltan.reduce((s, f) => s + f.importe, 0))}${faltan.length === 1 ? ` (día ${faltan[0].dia})` : ""}.</span></button>` : "";
    caja.innerHTML = avisoFijos + (esActual && proximas.length ? proximas.map((s) => `<div class="banner"><span class="icono chico" style="--c:#ff9500">${ico("bell")}</span><span>${s.faltan === 0 ? "Hoy" : s.faltan === 1 ? "Mañana" : `En ${s.faltan} días`} se renueva <b>${esc(s.nombre)}</b> (${euros(s.importe)}). ¿La sigues usando?</span></div>`).join("") : "")
      + (delMes.length >= 3 ? `<button class="compartir-mes" id="abrir-wrapped"><span class="icono-blanco">${ico("camera")}</span><div><b>Tu ${B.nombreMes(B.mesVisto)} en Bolsillo</b><small>Crea una tarjeta para tus stories</small></div><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M9 18l6-6-6-6"/></svg></button>` : "");
    // Préstamos sin devolver: no cuentan en el gasto, pero se ven aquí para que no se olviden
    if (esActual && B.sync.clave) {
      const prest = gruposCache.filter(esPrestamo).map((g) => ({ g, mio: saldos(g)[g.yo] || 0 })).filter((x) => x.mio);
      const nombres = (n) => n.length === 1 ? n[0] : `${n[0]} y ${n.length - 1} más`;
      const fila = (lista, color, icono, texto) => lista.length ? `<button class="banner" data-banner-prestamo="${lista.length === 1 ? lista[0].g.id : ""}" style="width:100%;text-align:left"><span class="icono chico" style="--c:${color}">${ico(icono)}</span><span>${texto(euros(Math.abs(lista.reduce((t, x) => t + x.mio, 0))), nombres(lista.map((x) => esc(otroDe(x.g).nombre))))}</span></button>` : "";
      caja.insertAdjacentHTML("afterbegin", fila(prest.filter((x) => x.mio > 0), "#ff9500", "coins", (q, n) => `Te deben <b>${q}</b> de préstamos: ${n}.`)
        + fila(prest.filter((x) => x.mio < 0), "#ff3b30", "wallet", (q, n) => `Debes <b>${q}</b> de préstamos: ${n}.`));
      caja.querySelectorAll("[data-banner-prestamo]").forEach((b) => b.addEventListener("click", () => (b.dataset.bannerPrestamo ? abrirPrestamo(b.dataset.bannerPrestamo) : B.irVista("grupos"))));
    }
    // Android sin ningún pago de Wallet todavía: falta MacroDroid, que no viene en el móvil (en el iPhone, Atajos sí)
    let walletOculto = false; try { walletOculto = localStorage.getItem("bolsillo.avisoWallet") === "no"; } catch {}
    if (esActual && /Android/i.test(navigator.userAgent) && !walletOculto && !B.datos.movs.some((m) => m.origen === "wallet")) {
      caja.insertAdjacentHTML("afterbegin", `<div class="banner"><button id="banner-wallet" style="display:flex;gap:12px;align-items:center;flex:1;text-align:left"><span class="icono chico" style="--c:#007aff">${ico("contactless-payment")}</span>
        <span><b>Que tus pagos se apunten solos</b><br>Falta un paso: conectar Google Wallet con la app gratis MacroDroid (3 minutos).</span></button><button id="ocultar-wallet" aria-label="Ocultar" style="font-size:22px;padding:0 4px;color:var(--suave)">×</button></div>`);
      $("#banner-wallet").addEventListener("click", async () => {
        // La guía necesita la clave de tu nube: si aún no la tienes, se crea primero (y se te pide guardarla)
        if (!B.sync.clave) { await B.crearNube(); return; }
        B.abrirHoja($("#hoja-applepay"));
      });
      $("#ocultar-wallet").addEventListener("click", () => { try { localStorage.setItem("bolsillo.avisoWallet", "no"); } catch {} B.pintar(); avisar("Lo tienes en Ajustes → Apuntar solo al pagar (Wallet)"); });
    }
    $("#abrir-wrapped")?.addEventListener("click", abrirWrapped);
    $("#banner-fijos")?.addEventListener("click", abrirFijos);
    $("#extras-subs").innerHTML = subs.length ? `<h2>Cobros que se repiten</h2><div class="grupo">${subs.map((s) => {
      const [, , icono, color] = catDe("gasto", s.cat);
      return `<div class="fila"><div class="icono" style="--c:${color}">${ico(icono)}</div><div class="medio"><div class="titulo">${esc(s.nombre)}</div><div class="sub">Próximo: ${s.faltan < 0 ? "pendiente" : fechaCorta(s.proximo)} · ${euros(s.anual, false)} al año</div></div><div class="cifra num">${euros(s.importe)}</div></div>`;
    }).join("")}</div><p class="nota-ajuste">En total, ${euros(subs.reduce((t, s) => t + s.anual, 0), false)} al año. Bolsillo los detecta solo cuando se repiten cada mes. Puedes hacerlos fijos en Ajustes → Gastos e ingresos fijos.</p>` : "";
    const r = racha();
    $("#chip-racha").innerHTML = r >= 2 ? `${ico("fire", "ico-fuego")}${r}` : "";
    $("#chip-racha").hidden = r < 2;
  }

  // ============ Tu mes para compartir (tarjeta vertical para stories) ============
  const EQUIVALENCIAS = {
    comida: [1200, "menús del día"], super: [60, "barras de pan"], transporte: [140, "viajes en bus"], ocio: [800, "entradas de cine"],
    ropa: [800, "camisetas básicas"], subs: [1099, "meses de Spotify"], estudios: [2000, "libros"], otros: [150, "cafés"],
  };
  function datosWrapped(k) {
    const movs = B.vivos().filter((m) => m.fecha.startsWith(k)), gs = movs.filter((m) => m.tipo === "gasto");
    const total = gs.reduce((s, g) => s + g.importe, 0);
    const porCat = {}; gs.forEach((g) => (porCat[g.cat] = (porCat[g.cat] || 0) + g.importe));
    const [topCat, topCatTotal] = Object.entries(porCat).sort((a, b) => b[1] - a[1])[0] || ["otros", 0];
    const porSitio = {}; gs.filter((g) => g.nota).forEach((g) => { const n = g.nota.trim(); porSitio[n] = (porSitio[n] || 0) + 1; });
    const [topSitio, veces] = Object.entries(porSitio).sort((a, b) => b[1] - a[1])[0] || [null, 0];
    const porDia = {}; gs.forEach((g) => (porDia[g.fecha] = (porDia[g.fecha] || 0) + g.importe));
    const [diaCaro, diaCaroTotal] = Object.entries(porDia).sort((a, b) => b[1] - a[1])[0] || [null, 0];
    const [precio, cosa] = EQUIVALENCIAS[topCat] || EQUIVALENCIAS.otros;
    const insignias = Object.values(B.datos.extra.insignias || {}).filter((f) => f.startsWith(k)).length;
    return { k, total, n: gs.length, topCat, topCatTotal, topSitio, veces, diaCaro, diaCaroTotal, equivalencia: `${Math.max(1, Math.round(topCatTotal / precio))} ${cosa}`, insignias, racha: mejorRacha() };
  }
  function dibujarWrapped(d) {
    const W = 1080, H = 1920, c = document.createElement("canvas"); c.width = W; c.height = H;
    const x = c.getContext("2d"), [, nombreCat, iconoCat, color] = catDe("gasto", d.topCat);
    const icono = (n, cx, cy, tam, color = "#fff") => { x.save(); x.translate(cx, cy); x.scale(tam / 256, tam / 256); x.fillStyle = color; x.fill(new Path2D(window.ICONOS[n])); x.restore(); };
    const f = (peso, tam) => `${peso} ${tam}px -apple-system, "SF Pro Display", "Segoe UI", Roboto, sans-serif`;
    const fondo = x.createLinearGradient(0, 0, W, H); fondo.addColorStop(0, color); fondo.addColorStop(1, "#111114");
    x.fillStyle = fondo; x.fillRect(0, 0, W, H);
    // círculos decorativos
    x.globalAlpha = .12; x.fillStyle = "#fff";
    [[900, 260, 260], [120, 1500, 340], [980, 1700, 180]].forEach(([cx, cy, r]) => { x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill(); });
    x.globalAlpha = 1; x.fillStyle = "#fff"; x.textBaseline = "alphabetic";
    const mes = new Date(d.k + "-15T12:00:00").toLocaleDateString("es-ES", { month: "long", year: "numeric" });
    x.font = f(600, 44); x.globalAlpha = .85; x.fillText("MI MES EN BOLSILLO", 90, 190); x.globalAlpha = 1;
    x.font = f(800, 92); x.fillText(mes.charAt(0).toUpperCase() + mes.slice(1), 90, 300);
    x.font = f(500, 46); x.globalAlpha = .85; x.fillText("He gastado", 90, 470); x.globalAlpha = 1;
    x.font = f(800, 170); x.fillText(euros(d.total, d.total < 100000), 82, 640);
    x.font = f(500, 44); x.globalAlpha = .85; x.fillText(`en ${plural(d.n, "gasto", "gastos")}`, 90, 715); x.globalAlpha = 1;
    // tarjetas
    const tarjeta = (y, alto, titulo, valor, extra) => {
      x.fillStyle = "rgba(255,255,255,.14)"; x.beginPath(); x.roundRect(70, y, W - 140, alto, 44); x.fill(); x.fillStyle = "#fff";
      x.font = f(500, 38); x.globalAlpha = .8; x.fillText(titulo, 120, y + 72); x.globalAlpha = 1;
      x.font = f(700, 60); x.fillText(valor, 120, y + 150);
      if (extra) { x.font = f(500, 38); x.globalAlpha = .8; x.fillText(extra, 120, y + 210); x.globalAlpha = 1; }
    };
    tarjeta(800, 250, "Donde más se me va", nombreCat, `${euros(d.topCatTotal)} = ${d.equivalencia}`);
    x.fillStyle = "rgba(255,255,255,.18)"; x.beginPath(); x.roundRect(W - 280, 845, 160, 160, 40); x.fill(); icono(iconoCat, W - 245, 880, 90);
    let y = 1080;
    if (d.topSitio) { tarjeta(y, 190, "Mi sitio favorito", d.topSitio.length > 22 ? d.topSitio.slice(0, 21) + "…" : d.topSitio, null); x.font = f(500, 40); x.globalAlpha = .8; x.fillText(`${d.veces} veces`, W - 300, y + 150); x.globalAlpha = 1; y += 220; }
    if (d.diaCaro) { tarjeta(y, 190, "Mi día más caro", new Date(d.diaCaro + "T12:00:00").toLocaleDateString("es-ES", { weekday: "long", day: "numeric" }), null); x.font = f(600, 46); x.fillText(euros(d.diaCaroTotal), W - 330, y + 150); y += 220; }
    tarjeta(y, 190, "Racha récord", `       ${plural(d.racha, "día", "días")}`, null); icono("fire", 118, y + 100, 58, "#ffb340");
    if (d.insignias) { icono("medal", W - 300, y + 104, 54, "#ffd60a"); x.font = f(600, 46); x.fillText(String(d.insignias), W - 236, y + 150); }
    x.font = f(600, 40); x.globalAlpha = .9; x.textAlign = "center"; x.fillText("Hecho con Bolsillo", W / 2, H - 150);
    x.font = f(500, 34); x.globalAlpha = .7; x.fillText(location.host, W / 2, H - 96);
    return c;
  }
  let wrappedBlob = null;
  async function abrirWrapped() {
    const c = dibujarWrapped(datosWrapped(B.mesVisto));
    wrappedBlob = await new Promise((r) => c.toBlob(r, "image/jpeg", 0.9)); // JPG: unas 6 veces menos que PNG, se comparte antes
    $("#wrapped-img").src = URL.createObjectURL(wrappedBlob);
    B.abrirHoja($("#hoja-wrapped"));
  }
  async function compartirWrapped() {
    if (!wrappedBlob) return;
    const archivo = new File([wrappedBlob], `mi-${B.nombreMes(B.mesVisto)}-bolsillo.jpg`, { type: "image/jpeg" });
    try {
      if (navigator.canShare?.({ files: [archivo] })) await navigator.share({ files: [archivo], text: `Mi ${B.nombreMes(B.mesVisto)} en Bolsillo · ${location.origin}/conoce/` });
      else { const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(archivo), download: archivo.name }); a.click(); }
      ganarInsignia("wrapped");
    } catch (e) { if (e.name !== "AbortError") avisar("No se ha podido compartir"); }
  }

  // ============ Grupos: gastos de piso, viajes, amigos ============
  const CLAVE_GRUPOS = "bolsillo.grupos";
  let gruposCache = []; try { gruposCache = JSON.parse(localStorage.getItem(CLAVE_GRUPOS)) || []; } catch {}
  let grupoAbierto = null, cargandoGrupos = false;
  let misDatosCobro = null; try { misDatosCobro = JSON.parse(localStorage.getItem("bolsillo.misDatosCobro")); } catch {} // tu Bizum, PayPal y Revolut
  async function cargarGrupos() {
    if (!B.sync.clave || cargandoGrupos) return;
    cargandoGrupos = true;
    try {
      const r = await B.api("grupos");
      if (!r.ok) throw new Error();
      const j = await r.json();
      gruposCache = j.grupos; misDatosCobro = j.misDatos || null;
      try { localStorage.setItem(CLAVE_GRUPOS, JSON.stringify(gruposCache)); localStorage.setItem("bolsillo.misDatosCobro", JSON.stringify(misDatosCobro)); } catch {}
      if (grupoAbierto) grupoAbierto = gruposCache.find((g) => g.id === grupoAbierto.id) || null;
    } catch {} finally { cargandoGrupos = false; }
    pintarGrupos(); if (grupoAbierto && $("#hoja-grupo").classList.contains("abierta")) pintarGrupo();
    evaluarInsignias(); pintarEnMes();
  }
  async function accionGrupo(accion, cuerpo) {
    const r = await B.api("grupos/" + accion, cuerpo);
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || "No se ha podido");
    return j;
  }
  // Saldo de cada miembro: positivo = le deben, negativo = debe
  function saldos(g) {
    const s = Object.fromEntries(g.miembros.map((m) => [m.id, 0]));
    for (const x of g.gastos) { s[x.pagador] = (s[x.pagador] || 0) + x.importe; for (const [id, c] of Object.entries(x.reparto)) s[id] = (s[id] || 0) - c; }
    return s;
  }
  // Cómo quedar en paz con el MÍNIMO de pagos.
  // Truco: si el grupo se puede partir en k bloques que suman cero cada uno, bastan (personas − k) pagos, y no se puede con menos.
  // Así que se busca el mayor número de bloques que suman cero (programación dinámica sobre subconjuntos, hasta 16 personas con saldo)
  // y dentro de cada bloque paga el que más debe al que más le deben. Con más de 16 personas, solo esto último (casi siempre igual de bueno).
  function pagosVoraces(lista) {
    const deben = lista.filter(([, v]) => v < 0).map(([id, v]) => ({ id, v: -v })).sort((a, b) => b.v - a.v);
    const cobran = lista.filter(([, v]) => v > 0).map(([id, v]) => ({ id, v })).sort((a, b) => b.v - a.v);
    const pagos = [];
    while (deben.length && cobran.length) {
      const d = deben[0], c = cobran[0], q = Math.min(d.v, c.v);
      if (q > 0) pagos.push({ de: d.id, a: c.id, importe: q });
      d.v -= q; c.v -= q;
      if (d.v <= 0) deben.shift(); if (c.v <= 0) cobran.shift();
    }
    return pagos;
  }
  function liquidar(s) {
    const lista = Object.entries(s).filter(([, v]) => v !== 0), n = lista.length;
    if (n > 16) return pagosVoraces(lista);
    const total = 1 << n, suma = new Int32Array(total), bloques = new Int8Array(total);
    for (let m = 1; m < total; m++) { const b = 31 - Math.clz32(m & -m); suma[m] = suma[m & (m - 1)] + lista[b][1]; }
    for (let m = 1; m < total; m++) {
      let mejor = 0;
      for (let i = 0; i < n; i++) if (m & (1 << i)) mejor = Math.max(mejor, bloques[m ^ (1 << i)]);
      bloques[m] = mejor + (suma[m] === 0 ? 1 : 0);
    }
    // Se deshace el camino quitando una persona cada vez: cada vez que lo quitado suma cero, se cierra un bloque
    const orden = [];
    for (let m = total - 1; m; ) {
      for (let i = 0; i < n; i++) if (m & (1 << i) && bloques[m ^ (1 << i)] + (suma[m] === 0 ? 1 : 0) === bloques[m]) { orden.push(i); m ^= 1 << i; break; }
    }
    const pagos = []; let bloque = [], acumulado = 0;
    for (const i of orden.reverse()) { bloque.push(lista[i]); acumulado += lista[i][1]; if (acumulado === 0) { pagos.push(...pagosVoraces(bloque)); bloque = []; } }
    return pagos;
  }
  const nombreDe = (g, id) => g.miembros.find((m) => m.id === id)?.nombre || "?";
  // Un préstamo es un grupo de dos: tú y tu amigo. Se ve con el nombre del otro (desde cada lado, el suyo)
  const esPrestamo = (g) => g.tipo === "prestamo";
  const otroDe = (g) => g.miembros.find((m) => m.id !== g.yo) || { id: "", nombre: "?" };
  const textoSaldo = (mio) => mio > 0 ? `Te debe<br>${euros(mio)}` : mio < 0 ? `Le debes<br>${euros(-mio)}` : "En paz ✓";
  function pintarGrupos() {
    const v = $("#vista-grupos");
    if (!v || v.hidden) return;
    if (!B.sync.clave) {
      v.innerHTML = `<div class="cabecera"><h1>Amigos</h1></div><div class="vacio"><span class="icono grande" style="--c:#ff2d55;margin:0 auto 14px">${ico("sword")}</span><b>Duelos y gastos compartidos</b>Reta a tus amigos a ver quién gasta menos, y lleva las cuentas del piso o de un viaje sin líos.<br><br>Para jugar necesitas tu nube (gratis, sin email).<br><br><button class="boton-azul" id="grupos-nube">Crear mi nube</button></div>`;
      $("#grupos-nube").addEventListener("click", async () => { await B.crearNube(); cargarGrupos(); cargarDuelos(); });
      return;
    }
    v.innerHTML = `<div class="cabecera"><h1>Amigos</h1></div>
      ${seccionDuelos()}
      ${seccionCirculos()}
      ${seccionPrestamos()}
      <h2>Grupos de gastos</h2>
      ${gruposCache.filter((g) => !esPrestamo(g)).length ? `<div class="grupo">${gruposCache.filter((g) => !esPrestamo(g)).map((g) => {
        const mio = saldos(g)[g.yo] || 0;
        return `<button class="fila" data-grupo="${g.id}"><div class="icono" style="--c:#007aff">${ico("users-three")}</div><div class="medio"><div class="titulo">${esc(g.nombre)}</div><div class="sub">${(() => { const av = (g.cobros || []).filter((c) => c.a === g.yo && c.estado === "pagado"); return av.length ? `<b style="color:var(--verde)">${av.length === 1 ? `${esc(nombreDe(g, av[0].de))} dice que te ha pagado` : `${av.length} pagos por confirmar`}</b>` : plural(g.miembros.length, "persona", "personas"); })()}</div></div>
          <div class="cifra num ${mio > 0 ? "ingreso" : mio < 0 ? "pasado" : ""}" style="text-align:right;font-size:14px">${mio > 0 ? `Te deben<br>${euros(mio)}` : mio < 0 ? `Debes<br>${euros(-mio)}` : "En paz ✓"}</div></button>`;
      }).join("")}</div>` : `<div class="vacio"><b>Aún no tienes grupos</b>Crea uno para el piso o un viaje e invita a los demás con un código.</div>`}
      <div class="botones-par"><button class="boton-azul" id="crear-grupo">Crear grupo</button><button class="boton-gris" id="unirse-grupo">Unirme con código</button></div>`;
    v.querySelectorAll("[data-grupo]").forEach((b) => b.addEventListener("click", () => { grupoAbierto = gruposCache.find((g) => g.id === b.dataset.grupo); pintarGrupo(); B.abrirHoja($("#hoja-grupo")); }));
    v.querySelectorAll("[data-prestamo]").forEach((b) => b.addEventListener("click", () => abrirPrestamo(b.dataset.prestamo)));
    $("#nuevo-prestamo").addEventListener("click", () => nuevoPrestamo());
    $("#crear-grupo").addEventListener("click", crearGrupo);
    $("#unirse-grupo").addEventListener("click", () => unirse());
    engancharDuelos(v);
    engancharCirculos(v);
  }

  // ============ Modo tóxico: círculos de confianza (máx. 8). Cada uno elige cuánto enseña; el servidor recorta lo demás ============
  const NIVELES = [
    { valor: "light", texto: "Light", sub: "Solo cuánto llevas este mes y en qué categorías" },
    { valor: "medio", texto: "Medio", sub: "Cada gasto con su importe y la tienda, sin tus notas" },
    { valor: "total", texto: "Tóxico total", sub: "Todo, notas incluidas. Sin secretos" },
  ];
  const nombreNivel = (n) => NIVELES.find((x) => x.valor === n)?.texto || n;
  const CLAVE_CIRCULOS = "bolsillo.circulos";
  let circulosCache = []; try { circulosCache = JSON.parse(localStorage.getItem(CLAVE_CIRCULOS)) || []; } catch {}
  let circuloAbierto = null, muro = null;
  async function cargarCirculos() {
    if (!B.sync.clave) return;
    try {
      const r = await B.api("circulos"); if (!r.ok) throw new Error();
      circulosCache = (await r.json()).circulos;
      try { localStorage.setItem(CLAVE_CIRCULOS, JSON.stringify(circulosCache)); } catch {}
    } catch {}
    pintarGrupos(); evaluarInsignias();
  }
  function seccionCirculos() {
    return `<h2>Modo tóxico</h2>
      ${circulosCache.length ? `<div class="grupo">${circulosCache.map((c) => `<button class="fila" data-circulo="${c.id}"><div class="icono" style="--c:#af52de">${ico("eye")}</div>
        <div class="medio"><div class="titulo">${esc(c.nombre)}</div><div class="sub">${plural(c.personas, "persona", "personas")} · tú en ${nombreNivel(c.nivel)}</div></div><span class="enlace">›</span></button>`).join("")}</div>`
        : `<div class="tarjeta-duelo-vacia"><span class="icono" style="--c:#af52de">${ico("eye")}</span><div><b>Gastos sin secretos</b><span>Comparte tus gastos con tu gente de confianza (máximo 8) y reaccionad. Tú eliges cuánto enseñas y te sales cuando quieras.</span></div></div>`}
      <div class="botones-par"><button class="boton-azul" id="crear-circulo">Crear círculo</button><button class="boton-gris" id="unirse-circulo">Tengo un código</button></div>`;
  }
  function engancharCirculos(v) {
    v.querySelectorAll("[data-circulo]").forEach((b) => b.addEventListener("click", () => abrirCirculo(b.dataset.circulo)));
    $("#crear-circulo")?.addEventListener("click", crearCirculo);
    $("#unirse-circulo")?.addEventListener("click", () => unirseCirculo());
  }
  const elegirNivel = (titulo, texto) => B.dialogo({ titulo, texto, opciones: NIVELES });
  async function crearCirculo() {
    const nivel = await elegirNivel("¿Cuánto quieres enseñar?", "Lo eliges tú y lo puedes cambiar cuando quieras. Nunca se ven tus ingresos ni tu presupuesto.");
    if (!nivel) return;
    const v = await B.dialogo({ titulo: "Nuevo círculo", texto: "Solo para gente de confianza: máximo 8 personas, y todas tienen que entrar con el código.", boton: "Crear",
      campos: [{ id: "nombre", etiqueta: "Nombre", placeholder: "Los del piso", max: 40 }, { id: "yo", etiqueta: "Tu nombre", valor: miNombre(), max: 24 }] });
    if (!v) return;
    guardarMiNombre(v.yo);
    try { const { id } = await accionCirculo("crear", { nombre: v.nombre, minombre: v.yo, nivel }); await cargarCirculos(); abrirCirculo(id); avisar("Círculo creado: pásales el código"); }
    catch (e) { avisar(e.message); }
  }
  async function unirseCirculo(codigoDado) {
    if (!B.sync.clave) {
      if (!(await B.dialogo({ titulo: "Necesitas tu nube", texto: "Los círculos viven en la nube para que todos veáis lo mismo. Es gratis y no pide email.", boton: "Crear mi nube" }))) return;
      await B.crearNube(); if (!B.sync.clave) return;
    }
    let codigo = (codigoDado || "").toUpperCase();
    if (!codigo) { const v = await B.dialogo({ titulo: "Entrar en un círculo", boton: "Continuar", campos: [{ id: "codigo", etiqueta: "Código", placeholder: "6 letras", max: 6 }] }); if (!v) return; codigo = v.codigo.toUpperCase(); }
    try {
      const info = await accionCirculo("unirse", { codigo });
      if (!info.ok) {
        const nivel = await elegirNivel(`Entrar en «${info.circulo}»`, "Elige cuánto enseñas a este círculo. Puedes cambiarlo o salirte cuando quieras.");
        if (!nivel) return;
        const v = await B.dialogo({ titulo: info.circulo, boton: "Entrar", campos: [{ id: "yo", etiqueta: "Tu nombre", valor: miNombre(), max: 24 }] });
        if (!v) return;
        guardarMiNombre(v.yo);
        await accionCirculo("unirse", { codigo, minombre: v.yo, nivel });
      }
      B.irVista("grupos"); await cargarCirculos();
      const c = circulosCache.find((x) => x.codigo === codigo); if (c) abrirCirculo(c.id);
      avisar("Ya estás dentro. Lo que pasa en el círculo, se queda en el círculo");
    } catch (e) { avisar(e.message); }
  }
  async function accionCirculo(accion, cuerpo) {
    const r = await B.api("circulos/" + accion, cuerpo), j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || "No se ha podido");
    return j;
  }
  async function abrirCirculo(id, silencioso) {
    circuloAbierto = id;
    if (!silencioso) { $("#circulo-cuerpo").innerHTML = `<div class="vacio" style="padding:20px">Cargando…</div>`; $("#titulo-circulo").textContent = circulosCache.find((c) => c.id === id)?.nombre || "Círculo"; B.cerrarHoja(); setTimeout(() => B.abrirHoja($("#hoja-circulo")), 260); }
    try { const r = await B.api(`circulos/muro?circulo=${id}`); if (!r.ok) throw new Error((await r.json()).error); muro = await r.json(); pintarCirculo(); }
    catch (e) { $("#circulo-cuerpo").innerHTML = `<div class="vacio" style="padding:20px">${esc(e.message || "Sin conexión")}</div>`; }
  }
  const fechaRelativa = (iso) => iso === B.hoyISO() ? "hoy" : iso === new Date(Date.now() - 864e5).toLocaleDateString("sv-SE") ? "ayer" : fechaCorta(iso);
  function pintarCirculo() {
    const m = muro, h = $("#circulo-cuerpo"), yo = m.miembros.find((x) => x.yo);
    $("#titulo-circulo").textContent = m.circulo.nombre;
    // Muro: los gastos de quien enseña (medio y total), mezclados y del más nuevo al más viejo
    const muroGastos = m.miembros.flatMap((p) => (p.gastos || []).map((g) => ({ ...g, quien: p }))).sort((a, b) => b.fecha.localeCompare(a.fecha));
    const hoy = muroGastos.filter((g) => g.fecha === B.hoyISO()).sort((a, b) => b.importe - a.importe)[0];
    // Ranking de la vergüenza: quién más en cada cosa los últimos 7 días (solo totales por categoría, que ven todos)
    const premios = [["comida", "Más en comer fuera"], ["ocio", "Más en ocio"], ["ropa", "Más en ropa"], ["super", "Más en el súper"]]
      .map(([cat, titulo]) => { const top = m.miembros.filter((p) => (p.semana.cats[cat] || 0) > 0).sort((a, b) => b.semana.cats[cat] - a.semana.cats[cat])[0]; return top && { cat, titulo, quien: top, importe: top.semana.cats[cat] }; }).filter(Boolean);
    const derrochon = m.miembros.filter((p) => p.semana.total > 0).sort((a, b) => b.semana.total - a.semana.total)[0];
    const reacciona = (g) => `<div class="reacciones">${m.reacciones.map((e) => `<button class="reaccion" data-reaccion="${e}" data-autor="${g.quien.id}" data-mov="${g.id}" aria-pressed="${g.mia === e}" ${g.quien.yo ? "disabled" : ""}>${e}${g.reacciones[e] ? `<span class="num">${g.reacciones[e]}</span>` : ""}</button>`).join("")}</div>`;
    h.innerHTML = `<div class="aviso-circulo">${ico("eye", "ico-texto")}Lo que pasa en el círculo, se queda en el círculo.</div>
      <div class="campos" style="margin-top:12px"><div class="campo"><span>Tú enseñas</span><span class="estado-sync">${nombreNivel(m.nivel)}</span></div><div class="campo"><button class="boton-fila" id="cambiar-nivel">Cambiar lo que enseño</button></div></div>
      ${hoy ? `<h2>Momento del día</h2><div class="momento"><span class="icono" style="--c:${catDe("gasto", hoy.cat)[3]}">${ico(catDe("gasto", hoy.cat)[2])}</span><div><b>${esc(hoy.quien.nombre)}</b> se ha gastado <b class="num">${euros(hoy.importe)}</b> en ${esc(hoy.texto || catDe("gasto", hoy.cat)[1])}</div></div>` : ""}
      ${m.miembros.length >= 2 && (premios.length || derrochon) ? `<h2>Ranking de la vergüenza <span class="etiqueta">7 días</span></h2><div class="premios">
        ${derrochon ? `<div class="premio grande"><span class="icono" style="--c:#ff2d55">${ico("crown")}</span><small>Más ha gastado</small><b>${esc(derrochon.nombre)}</b><span class="num">${euros(derrochon.semana.total)}</span></div>` : ""}
        ${premios.map((p) => `<div class="premio"><span class="icono" style="--c:${catDe("gasto", p.cat)[3]}">${ico(catDe("gasto", p.cat)[2])}</span><small>${p.titulo}</small><b>${esc(p.quien.nombre)}</b><span class="num">${euros(p.importe)}</span></div>`).join("")}</div>` : ""}
      <h2>Este mes</h2><div class="grupo">${m.miembros.map((p) => { const top = Object.entries(p.mes.cats).sort((a, b) => b[1] - a[1]).slice(0, 3);
        return `<div class="fila"><div class="icono" style="--c:${p.yo ? "#007aff" : "#5856d6"}">${ico(p.yo ? "user-circle" : "user")}</div><div class="medio"><div style="display:flex;justify-content:space-between;gap:8px"><span class="titulo">${esc(p.nombre)}${p.yo ? " (tú)" : ""}</span><span class="cifra num">${euros(p.mes.total)}</span></div>
          <div class="sub">${nombreNivel(p.nivel)}${top.length ? " · " + top.map(([c, v]) => `${catDe("gasto", c)[1]} ${euros(v, false)}`).join(" · ") : ""}</div></div></div>`; }).join("")}</div>
      <h2>El muro</h2>${muroGastos.length ? `<div class="grupo">${muroGastos.map((g) => { const [, nombre, icono, color] = catDe("gasto", g.cat);
        return `<div class="fila muro-fila"><div class="icono" style="--c:${color}">${ico(icono)}</div><div class="medio"><div style="display:flex;justify-content:space-between;gap:8px"><span class="titulo">${esc(g.texto || nombre)}</span><span class="cifra num">−${euros(g.importe)}</span></div>
          <div class="sub">${esc(g.quien.nombre)}${g.quien.yo ? " (tú)" : ""} · ${fechaRelativa(g.fecha)}${g.origen === "applepay" ? ` · ${ico("apple-logo", "ico-texto")}Pay` : g.origen === "wallet" ? ` · ${ico("contactless-payment", "ico-texto")}Wallet` : ""}</div>${reacciona(g)}</div></div>`; }).join("")}</div>`
        : `<div class="vacio" style="padding:20px">Aún no hay gastos que ver: en el nivel Light solo se ven los totales.</div>`}
      <div class="copiar" style="margin-top:20px"><span style="flex:1">Código: <b class="num" style="letter-spacing:.12em">${m.circulo.codigo}</b></span><button id="invitar-circulo">Invitar</button></div>
      <p class="nota-ajuste">Nunca se ven ingresos ni presupuestos. Para ocultar un gasto concreto, ábrelo y marca «Ocultar en mis círculos».</p>
      <button class="borrar" id="salir-circulo">Salir del círculo</button>`;
    $("#cambiar-nivel").addEventListener("click", async () => {
      const nivel = await elegirNivel("¿Cuánto quieres enseñar?", `Ahora: ${nombreNivel(m.nivel)}. El cambio se ve al momento.`);
      if (!nivel) return setTimeout(() => B.abrirHoja($("#hoja-circulo")), 260);
      try { await accionCirculo("nivel", { circulo: m.circulo.id, nivel }); await cargarCirculos(); abrirCirculo(m.circulo.id); avisar(`Ahora enseñas: ${nombreNivel(nivel)}`); } catch (e) { avisar(e.message); }
    });
    $("#invitar-circulo").addEventListener("click", async () => {
      const texto = `Te invito a «${m.circulo.nombre}» en Bolsillo (modo tóxico: nos vemos los gastos 💀). Entra en ${location.origin}/?circulo=${m.circulo.codigo} o mete el código ${m.circulo.codigo} en Amigos. Tú eliges cuánto enseñas.`;
      try { if (navigator.share) await navigator.share({ text: texto }); else { await navigator.clipboard.writeText(texto); avisar("Invitación copiada"); } } catch {}
    });
    $("#salir-circulo").addEventListener("click", async () => {
      if (!(await B.dialogo({ titulo: "¿Salir del círculo?", texto: "Dejarán de ver tus gastos al momento y se borran tus reacciones.", boton: "Salir", peligro: true }))) return setTimeout(() => B.abrirHoja($("#hoja-circulo")), 260);
      try { await accionCirculo("salir", { circulo: m.circulo.id }); circuloAbierto = null; await cargarCirculos(); avisar("Has salido del círculo"); } catch (e) { avisar(e.message); }
    });
  }
  // Reaccionar: otro toque en la misma la quita
  $("#circulo-cuerpo").addEventListener("click", async (e) => {
    const b = e.target.closest("[data-reaccion]"); if (!b || b.disabled) return;
    const quitar = b.getAttribute("aria-pressed") === "true";
    b.closest(".reacciones").querySelectorAll("[data-reaccion]").forEach((x) => (x.disabled = true));
    try { await accionCirculo("reaccionar", { circulo: muro.circulo.id, autor: b.dataset.autor, mov: b.dataset.mov, emoji: quitar ? null : b.dataset.reaccion }); if (!quitar && navigator.vibrate) navigator.vibrate(8); }
    catch (err) { avisar(err.message); }
    abrirCirculo(muro.circulo.id, true);
  });

  // ============ Duelos:¿quién gasta menos? (gana el menor % de su propio presupuesto; nadie ve los euros de nadie) ============
  const CLAVE_DUELOS = "bolsillo.duelos", CLAVE_VISTOS = "bolsillo.duelosVistos";
  let duelosCache = []; try { duelosCache = JSON.parse(localStorage.getItem(CLAVE_DUELOS)) || []; } catch {}
  let dueloAbierto = null, cargandoDuelos = false;
  const pct = (n) => `${String(n).replace(".", ",")} %`;
  async function cargarDuelos() {
    if (!B.sync.clave || cargandoDuelos) return;
    cargandoDuelos = true;
    try {
      const r = await B.api("duelos");
      if (!r.ok) throw new Error();
      duelosCache = (await r.json()).duelos;
      try { localStorage.setItem(CLAVE_DUELOS, JSON.stringify(duelosCache)); } catch {}
      if (dueloAbierto) dueloAbierto = duelosCache.find((d) => d.id === dueloAbierto.id) || null;
    } catch {} finally { cargandoDuelos = false; }
    pintarGrupos(); if (dueloAbierto && $("#hoja-duelo").classList.contains("abierta")) pintarDuelo();
    celebrarVictorias(); evaluarInsignias();
  }
  // Celebración de cada duelo ganado (una sola vez)
  function celebrarVictorias() {
    let vistos = []; try { vistos = JSON.parse(localStorage.getItem(CLAVE_VISTOS)) || []; } catch {}
    const nuevos = duelosCache.filter((d) => d.estado === "terminado" && !vistos.includes(d.id));
    if (!nuevos.length) return;
    const ganado = nuevos.find((d) => d.gane);
    if (ganado) setTimeout(() => celebrar("trophy", "#ffb800", "¡Has ganado el duelo!", ganado.nombre), 400);
    try { localStorage.setItem(CLAVE_VISTOS, JSON.stringify([...vistos, ...nuevos.map((d) => d.id)].slice(-100))); } catch {}
  }
  const posicion = (d) => d.filas.findIndex((f) => f.yo) + 1;
  function seccionDuelos() {
    const activos = duelosCache.filter((d) => d.estado === "activo"), pasados = duelosCache.filter((d) => d.estado === "terminado").slice(0, 5);
    const victorias = duelosCache.filter((d) => d.gane).length;
    const tarjeta = (d) => {
      const yo = d.filas.find((f) => f.yo), pos = posicion(d), solo = d.filas.length < 2;
      const estado = d.estado === "activo" ? (solo ? "Esperando rival · invita con el código" : `${pos}º de ${d.filas.length} · ${d.quedan === 1 ? "último día" : `quedan ${d.quedan} días`}`)
        : d.gane ? "Ganaste" : d.empate ? "Empate" : d.ganador ? `Ganó ${esc(d.ganador)}` : "Sin ganador";
      const color = d.estado === "terminado" ? (d.gane ? "#ffb800" : "#8e8e93") : pos === 1 && !solo ? "#ffb800" : "#ff2d55";
      return `<button class="fila" data-duelo="${d.id}"><div class="icono" style="--c:${color}">${ico(d.estado === "terminado" ? (d.gane ? "trophy" : "flag-checkered") : "sword")}</div>
        <div class="medio"><div class="titulo">${esc(d.nombre)}</div><div class="sub">${estado}</div></div><div class="cifra num" style="font-size:15px">${yo ? pct(yo.pct) : ""}</div></button>`;
    };
    return `<h2 style="display:flex;justify-content:space-between;align-items:baseline">Duelos ${victorias ? `<span class="etiqueta">${ico("trophy", "ico-texto")}${plural(victorias, "victoria", "victorias")}</span>` : ""}</h2>
      ${activos.length ? `<div class="grupo">${activos.map(tarjeta).join("")}</div>` : `<div class="tarjeta-duelo-vacia"><span class="icono" style="--c:#ff2d55">${ico("sword")}</span><div><b>Reta a un amigo</b><span>¿Quién gasta menos esta semana? Gana quien gaste menos % de su presupuesto. Nadie ve tus euros.</span></div></div>`}
      <div class="botones-par"><button class="boton-azul" id="crear-duelo">Nuevo duelo</button><button class="boton-gris" id="unirse-duelo">Tengo un código</button></div>
      ${pasados.length ? `<h4 class="titulo-grupo">Terminados</h4><div class="grupo">${pasados.map(tarjeta).join("")}</div>` : ""}`;
  }
  function engancharDuelos(v) {
    v.querySelectorAll("[data-duelo]").forEach((b) => b.addEventListener("click", () => { dueloAbierto = duelosCache.find((d) => d.id === b.dataset.duelo); pintarDuelo(); B.abrirHoja($("#hoja-duelo")); }));
    $("#crear-duelo")?.addEventListener("click", crearDuelo);
    $("#unirse-duelo")?.addEventListener("click", () => unirseDuelo());
  }
  // Sin presupuesto no se puede comparar: se ofrece ponerlo ahí mismo
  async function asegurarPresupuesto() {
    if (B.datos.presupuesto) return true;
    const v = await B.dialogo({ titulo: "Primero, tu presupuesto", texto: "En los duelos se compara qué % de su presupuesto gasta cada uno, así es justo aunque tengáis distinto dinero.", boton: "Guardar",
      campos: [{ id: "p", etiqueta: B.pagaSemanal() ? "A la semana" : "Al mes", placeholder: B.pagaSemanal() ? "60 €" : "250 €", decimal: true }] });
    const c = v && B.aCentimos(v.p);
    if (!c) return false;
    B.ponerPresupuesto(c);
    await new Promise((r) => setTimeout(r, 1200)); // que llegue a la nube antes de unirse
    return true;
  }
  const volverAlDuelo = () => { pintarDuelo(); setTimeout(() => B.abrirHoja($("#hoja-duelo")), 260); };
  async function crearDuelo() {
    if (!(await asegurarPresupuesto())) return;
    const tipo = await B.dialogo({ titulo: "Nuevo duelo", texto: "Gana quien gaste menos % de su presupuesto. Tus amigos solo ven porcentajes, nunca tus euros.",
      opciones: [{ valor: "semana", texto: "Una semana", sub: "7 días, empieza hoy" }, { valor: "mes", texto: "Un mes", sub: "30 días, empieza hoy" }] });
    if (!tipo) return;
    const v = await B.dialogo({ titulo: tipo === "mes" ? "Duelo de un mes" : "Duelo de una semana", boton: "Crear duelo", campos: [
      { id: "nombre", etiqueta: "Nombre", valor: "¿Quién gasta menos?", max: 40 },
      { id: "pacto", etiqueta: "Pacto", placeholder: "El que pierda invita a un café", opcional: true, max: 80 },
      { id: "yo", etiqueta: "Tu nombre", valor: miNombre(), max: 24 }] });
    if (!v) return;
    guardarMiNombre(v.yo);
    try {
      const { id } = await accionDuelo("crear", { tipo, nombre: v.nombre, pacto: v.pacto, minombre: v.yo });
      await cargarDuelos(); dueloAbierto = duelosCache.find((d) => d.id === id); if (dueloAbierto) volverAlDuelo();
      avisar("Duelo creado: pásale el código a tu rival");
    } catch (e) { avisar(e.message); }
  }
  async function unirseDuelo(codigoDado) {
    if (!B.sync.clave) {
      if (!(await B.dialogo({ titulo: "Necesitas tu nube", texto: "Los duelos se juegan en la nube para que todos veáis el mismo marcador. Es gratis y no pide email.", boton: "Crear mi nube" }))) return;
      await B.crearNube(); if (!B.sync.clave) return;
    }
    if (!(await asegurarPresupuesto())) return;
    const v = await B.dialogo({ titulo: "Unirme a un duelo", boton: "Unirme", campos: [
      ...(codigoDado ? [] : [{ id: "codigo", etiqueta: "Código", placeholder: "6 letras", max: 6 }]), { id: "yo", etiqueta: "Tu nombre", valor: miNombre(), max: 24 }] });
    if (!v) return;
    guardarMiNombre(v.yo);
    try {
      const { id } = await accionDuelo("unirse", { codigo: (codigoDado || v.codigo).toUpperCase(), minombre: v.yo });
      B.irVista("grupos"); await cargarDuelos(); dueloAbierto = duelosCache.find((d) => d.id === id); if (dueloAbierto) volverAlDuelo();
      avisar("¡Que gane el mejor!");
    } catch (e) { avisar(e.message); }
  }
  async function accionDuelo(accion, cuerpo) {
    const r = await B.api("duelos/" + accion, cuerpo);
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || "No se ha podido");
    return j;
  }
  function pintarDuelo() {
    const d = dueloAbierto, h = $("#duelo-cuerpo");
    if (!d) return;
    $("#titulo-duelo").textContent = d.nombre;
    const medalla = (i, f) => !f.valido ? "#8e8e93" : ["#ffb800", "#a7b1bd", "#cd7f32"][i] || "#5856d6";
    const terminado = d.estado === "terminado", solo = d.filas.length < 2;
    h.innerHTML = `${terminado ? `<div class="resultado-duelo ${d.gane ? "gane" : ""}"><span class="medallon" style="--c:${d.gane ? "#ffb800" : "#8e8e93"}">${ico(d.gane ? "trophy" : "flag-checkered")}</span>
        <b>${d.gane ? "¡Has ganado!" : d.empate ? "Empate" : d.ganador ? `Ha ganado ${esc(d.ganador)}` : "Sin ganador"}</b>${d.pacto ? `<span>Pacto: ${esc(d.pacto)}</span>` : ""}</div>`
      : `<div class="estado-duelo"><div><b class="num">${d.quedan === 1 ? "Último día" : `${d.quedan} días`}</b><span>${d.quedan === 1 ? "mañana se decide" : "para terminar"}</span></div><div class="progreso-duelo"><i style="width:${Math.round(d.transcurridos / d.total * 100)}%"></i></div></div>
        ${d.pacto ? `<div class="pacto">${ico("handshake", "ico-texto")}<span><b>Pacto:</b> ${esc(d.pacto)}</span></div>` : ""}`}
      <h2>Marcador</h2>
      <div class="grupo">${d.filas.map((f, i) => `<div class="fila marcador ${f.yo ? "yo" : ""}"><span class="puesto" style="--c:${medalla(i, f)}">${f.valido ? i + 1 : "–"}</span>
        <div class="medio"><div style="display:flex;justify-content:space-between;gap:8px"><span class="titulo">${esc(f.nombre)}${f.yo ? " (tú)" : ""}</span><span class="cifra num">${pct(f.pct)}</span></div>
        <div class="cat-barra"><i style="width:${Math.min(100, f.pct)}%;background:${f.pct > 100 ? "var(--rojo)" : f.pct > 85 ? "#ff9500" : "var(--verde)"}"></i></div>
        <div class="sub">${f.valido ? `Apuntó ${f.dias} de ${plural(d.transcurridos, "día", "días")}` : `No cuenta: apuntó ${f.dias} de ${plural(d.transcurridos, "día", "días")} (mínimo ${d.minimo})`}${f.applepay ? ` · ${f.applepay} % apuntado solo al pagar` : ""}</div></div></div>`).join("")}</div>
      <p class="nota-ajuste">Gana quien gaste menos % de su presupuesto${d.tipo === "mes" ? " del mes" : " de la semana"}. Para contar hay que apuntar al menos la mitad de los días. Nadie ve tus euros ni en qué gastas.</p>
      ${terminado ? "" : `<div class="copiar"><span style="flex:1">${solo ? "Invita a tu rival" : "Código"}: <b class="num" style="letter-spacing:.12em">${d.codigo}</b></span><button id="invitar-duelo">Invitar</button></div>`}
      ${terminado && d.gane ? `<button class="boton-azul" style="width:100%;margin-top:14px" id="compartir-victoria">Compartir mi victoria</button>` : ""}
      <button class="borrar" id="salir-duelo">${terminado ? "Quitar de mi lista" : "Abandonar el duelo"}</button>`;
    $("#invitar-duelo")?.addEventListener("click", async () => {
      const texto = `Te reto en Bolsillo: «${d.nombre}». Gana quien gaste menos % de su presupuesto${d.pacto ? ` y el que pierda: ${d.pacto}` : ""}. Entra en ${location.origin}/?duelo=${d.codigo} o mete el código ${d.codigo} en Amigos.`;
      try { if (navigator.share) await navigator.share({ text: texto }); else { await navigator.clipboard.writeText(texto); avisar("Invitación copiada"); } } catch {}
    });
    $("#compartir-victoria")?.addEventListener("click", () => compartirVictoria(d));
    $("#salir-duelo").addEventListener("click", async () => {
      if (!terminado && !(await B.dialogo({ titulo: "¿Abandonar el duelo?", texto: "Saldrás del marcador y no podrás ganar.", boton: "Abandonar", peligro: true }))) return;
      try { await accionDuelo("salir", { duelo: d.id }); dueloAbierto = null; B.cerrarHoja(); await cargarDuelos(); } catch (e) { avisar(e.message); }
    });
  }
  // Tarjeta para stories con la victoria (solo tu porcentaje, nada de euros ni de los demás)
  async function compartirVictoria(d) {
    const W = 1080, H = 1920, c = document.createElement("canvas"); c.width = W; c.height = H;
    const x = c.getContext("2d"), yo = d.filas.find((f) => f.yo), f = (p, t) => `${p} ${t}px -apple-system, "SF Pro Display", "Segoe UI", Roboto, sans-serif`;
    const fondo = x.createLinearGradient(0, 0, W, H); fondo.addColorStop(0, "#ffb800"); fondo.addColorStop(1, "#ff2d55"); x.fillStyle = fondo; x.fillRect(0, 0, W, H);
    x.globalAlpha = .14; x.fillStyle = "#fff"; [[880, 300, 300], [160, 1600, 360]].forEach(([cx, cy, r]) => { x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill(); }); x.globalAlpha = 1;
    x.save(); x.translate(W / 2 - 160, 380); x.scale(320 / 256, 320 / 256); x.fillStyle = "#fff"; x.fill(new Path2D(window.ICONOS.trophy)); x.restore();
    x.fillStyle = "#fff"; x.textAlign = "center";
    x.font = f(600, 46); x.globalAlpha = .9; x.fillText("HE GANADO EL DUELO", W / 2, 840); x.globalAlpha = 1;
    x.font = f(800, 84); x.fillText(`«${d.nombre.length > 22 ? d.nombre.slice(0, 21) + "…" : d.nombre}»`, W / 2, 960);
    x.font = f(500, 46); x.globalAlpha = .9; x.fillText(`contra ${plural(d.filas.length - 1, "amigo", "amigos")} · ${d.tipo === "mes" ? "un mes" : "una semana"}`, W / 2, 1050); x.globalAlpha = 1;
    x.font = f(800, 200); x.fillText(pct(yo.pct), W / 2, 1360);
    x.font = f(500, 44); x.globalAlpha = .9; x.fillText("de mi presupuesto gastado", W / 2, 1440);
    x.font = f(600, 40); x.fillText("Hecho con Bolsillo", W / 2, H - 150); x.font = f(500, 34); x.globalAlpha = .75; x.fillText(location.host, W / 2, H - 96);
    const blob = await new Promise((r) => c.toBlob(r, "image/jpeg", 0.9)), archivo = new File([blob], "victoria-bolsillo.jpg", { type: "image/jpeg" });
    try {
      if (navigator.canShare?.({ files: [archivo] })) await navigator.share({ files: [archivo], text: `He ganado «${d.nombre}» en Bolsillo · ${location.origin}/conoce/` });
      else { const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(archivo), download: archivo.name }); a.click(); }
    } catch (e) { if (e.name !== "AbortError") avisar("No se ha podido compartir"); }
  }
  const miNombre = () => { try { return localStorage.getItem("bolsillo.minombre") || ""; } catch { return ""; } };
  const guardarMiNombre = (n) => { try { localStorage.setItem("bolsillo.minombre", n); } catch {} };
  const volverAlGrupo = () => { pintarGrupo(); setTimeout(() => B.abrirHoja($("#hoja-grupo")), 260); };
  async function crearGrupo() {
    const v = await B.dialogo({ titulo: "Nuevo grupo", texto: "Para el piso, un viaje o las cenas con amigos. Luego invitas a los demás con un código.", boton: "Crear grupo",
      campos: [{ id: "nombre", etiqueta: "Nombre", placeholder: "Piso Triana", max: 40 }, { id: "yo", etiqueta: "Tu nombre", valor: miNombre(), placeholder: "Cómo te verán", max: 24 }] });
    if (!v) return;
    guardarMiNombre(v.yo);
    try { const { id } = await accionGrupo("crear", { nombre: v.nombre, minombre: v.yo }); await cargarGrupos(); grupoAbierto = gruposCache.find((g) => g.id === id); volverAlGrupo(); avisar("Grupo creado: invita a los demás con el código"); }
    catch (e) { avisar(e.message); }
  }
  async function unirse(codigoDado) {
    if (!B.sync.clave) {
      if (!(await B.dialogo({ titulo: "Necesitas tu nube", texto: "Los grupos se guardan en la nube para que todos veáis lo mismo. Es gratis y no pide email.", boton: "Crear mi nube" }))) return;
      await B.crearNube(); if (!B.sync.clave) return;
    }
    let codigo = (codigoDado || "").trim().toUpperCase();
    if (!codigo) {
      const v = await B.dialogo({ titulo: "Unirme a un grupo", texto: "Pide el código a quien creó el grupo.", boton: "Continuar", campos: [{ id: "codigo", etiqueta: "Código", placeholder: "6 letras", max: 6 }] });
      if (!v) return; codigo = v.codigo.toUpperCase();
    }
    try {
      const info = await accionGrupo("unirse", { codigo });
      let cuerpo = { codigo };
      if (!info.ok) {
        // Si ya te habían añadido sin app, puedes quedarte con tu nombre y sus cuentas
        const libres = info.libres || [];
        let elegido = libres.length ? await B.dialogo({ titulo: info.grupo, texto: "¿Ya te habían apuntado a este grupo? Elige tu nombre y te quedas con tus cuentas.", cancelar: "Cancelar",
          opciones: [...libres.map((l) => ({ valor: { miembro: l.id }, texto: `Soy ${l.nombre}` })), { valor: "nuevo", texto: "No estoy en la lista", sub: "Entrar con mi nombre" }] }) : "nuevo";
        if (!elegido) return;
        if (elegido === "nuevo") {
          const v = await B.dialogo({ titulo: info.grupo, boton: "Unirme", campos: [{ id: "yo", etiqueta: "Tu nombre", valor: miNombre(), max: 24 }] });
          if (!v) return; guardarMiNombre(v.yo); elegido = { minombre: v.yo };
        }
        cuerpo = { codigo, ...elegido };
      }
      const { id } = await accionGrupo("unirse", cuerpo);
      await cargarGrupos(); B.irVista("grupos");
      grupoAbierto = gruposCache.find((g) => g.id === id); if (grupoAbierto) volverAlGrupo();
      avisar("Ya estás dentro del grupo");
    } catch (e) { avisar(e.message); }
  }
  // ============ Cobrar sin dar la chapa: enlace de cobro, «ya te he pagado», confirmar y toques ============
  const COMO = { bizum: "por Bizum", paypal: "por PayPal", revolut: "por Revolut", efectivo: "en efectivo", otro: "" };
  const cobroAbierto = (g, de, a) => (g.cobros || []).find((c) => c.de === de && c.a === a && c.estado !== "confirmado");
  const textoDatosCobro = () => { const v = [misDatosCobro?.bizum && "Bizum", misDatosCobro?.paypal && "PayPal", misDatosCobro?.revolut && "Revolut"].filter(Boolean); return v.length ? v[0] + (v.length > 1 ? ` y ${v.length - 1} más` : "") : "Sin poner"; };
  const hace = (iso) => { const h = Math.round((Date.now() - new Date(iso)) / 36e5); return h < 1 ? "hace un momento" : h < 24 ? `hace ${h} h` : `hace ${plural(Math.round(h / 24), "día", "días")}`; };

  // Arriba del grupo, lo tuyo: lo que debes (con «Pagar») y lo que te deben (con «Cobrar», «Toque» o «¿Te ha llegado?»)
  function seccionMisCuentas(g, pagos) {
    const avisados = (g.cobros || []).filter((c) => c.a === g.yo && c.estado === "pagado");
    const meDeben = pagos.filter((p) => p.a === g.yo && !avisados.some((c) => c.de === p.de));
    const debo = pagos.filter((p) => p.de === g.yo);
    if (!avisados.length && !meDeben.length && !debo.length) return "";
    const tarjeta = (clase, icono, color, titulo, sub, botones) => `<div class="deuda ${clase}"><div class="deuda__fila"><span class="icono chico" style="--c:${color}">${ico(icono)}</span>
      <div class="medio"><b>${titulo}</b><span>${sub}</span></div></div>${botones ? `<div class="deuda__botones">${botones}</div>` : ""}</div>`;
    return `<h2>Tus cuentas</h2>` + [
      ...avisados.map((c) => tarjeta("llega", "handshake", "#28a745", `${esc(nombreDe(g, c.de))} dice que te ha pagado ${euros(c.importe)}`, `${COMO[c.metodo] ? COMO[c.metodo][0].toUpperCase() + COMO[c.metodo].slice(1) + " · " : ""}${hace(c.actualizado)}. ¿Te ha llegado?`,
        `<button class="boton-azul" data-confirmar="${c.id}" data-si="1">Sí, me ha llegado</button><button class="boton-gris" data-confirmar="${c.id}">No</button>`)),
      ...meDeben.map((p) => { const c = cobroAbierto(g, p.de, p.a), m = g.miembros.find((x) => x.id === p.de);
        return tarjeta("", "coins", "#ff9500", `${esc(m.nombre)} te debe ${euros(p.importe)}`, c?.ultimo_toque ? `Toque ${hace(c.ultimo_toque)}` : c ? "Enlace de cobro creado" : "Mándale el enlace: lo paga en un toque",
          `<button class="boton-azul" data-cobrar="${pagos.indexOf(p)}">Cobrar</button><button class="boton-gris" data-toque="${pagos.indexOf(p)}">Dar un toque</button>`); }),
      ...debo.map((p) => { const c = cobroAbierto(g, p.de, p.a);
        return c?.estado === "pagado" ? tarjeta("espera", "handshake", "#8e8e93", `Le has pagado ${euros(c.importe)} a ${esc(nombreDe(g, p.a))}`, `Esperando a que lo confirme · ${hace(c.actualizado)}`, "")
          : tarjeta("", "wallet", "#ff3b30", `Debes ${euros(p.importe)} a ${esc(nombreDe(g, p.a))}`, "Bizum, PayPal o Revolut, y le avisas en un toque", `<button class="boton-azul" data-pagar="${pagos.indexOf(p)}">Pagar</button>`); }),
    ].join("");
  }
  function engancharMisCuentas(g, h, pagos) {
    h.querySelectorAll("[data-cobrar]").forEach((b) => b.addEventListener("click", () => cobrar(g, pagos[b.dataset.cobrar])));
    h.querySelectorAll("[data-toque]").forEach((b) => b.addEventListener("click", () => darToque(g, pagos[b.dataset.toque])));
    h.querySelectorAll("[data-pagar]").forEach((b) => b.addEventListener("click", () => pagar(g, pagos[b.dataset.pagar])));
    h.querySelectorAll("[data-confirmar]").forEach((b) => b.addEventListener("click", () => confirmarCobro(g, (g.cobros || []).find((c) => c.id === b.dataset.confirmar), Boolean(b.dataset.si))));
  }
  const abrirCobro = async (g, p) => (await accionGrupo("cobro", { grupo: g.id, de: p.de, a: p.a, importe: p.importe })).id;
  const enlaceCobro = (id) => `${location.origin}/c/${id}`;
  async function compartirTexto(texto, copiado) {
    try { if (navigator.share) await navigator.share({ text: texto }); else { await navigator.clipboard.writeText(texto); avisar(copiado); } return true; }
    catch (e) { if (e.name !== "AbortError") avisar("No se ha podido compartir"); return false; }
  }
  async function pedirDatosCobro() {
    const d = misDatosCobro || {};
    const v = await B.dialogo({ titulo: "¿Cómo quieres que te paguen?", texto: "Sale en tus enlaces de cobro para que te paguen en un toque. Pon los que uses; solo los ve quien abre tu enlace.", boton: "Guardar", campos: [
      { id: "bizum", etiqueta: "Bizum", valor: d.bizum || "", placeholder: "Tu móvil", tel: true, opcional: true, max: 16 },
      { id: "paypal", etiqueta: "PayPal.me", valor: d.paypal || "", placeholder: "usuario", usuario: true, opcional: true, max: 50 },
      { id: "revolut", etiqueta: "Revolut", valor: d.revolut || "", placeholder: "@usuario", usuario: true, opcional: true, max: 50 },
    ] });
    if (!v) return false;
    try {
      misDatosCobro = (await accionGrupo("datos", v)).datos;
      if (!misDatosCobro.bizum && !misDatosCobro.paypal && !misDatosCobro.revolut) misDatosCobro = null;
      try { localStorage.setItem("bolsillo.misDatosCobro", JSON.stringify(misDatosCobro)); } catch {}
      avisar(misDatosCobro ? "Guardado: ya te pueden pagar en un toque" : "Quitado");
      return true;
    } catch (e) { avisar(e.message); return pedirDatosCobro(); } // un número mal puesto: se vuelve a preguntar
  }
  async function cobrar(g, p) {
    if (!misDatosCobro && !(await pedirDatosCobro())) return volverAlGrupo();
    try {
      const id = await abrirCobro(g, p);
      await compartirTexto(`${nombreDe(g, g.yo)} te pide ${esPrestamo(g) ? `los ${euros(p.importe)} que te dejó` : `${euros(p.importe)} de «${g.nombre}»`}. Págalo aquí en un momento: ${enlaceCobro(id)}`, "Enlace copiado: pégalo en WhatsApp");
      cargarGrupos();
    } catch (e) { avisar(e.message); }
  }
  async function pagar(g, p) {
    try { const id = await abrirCobro(g, p); location.href = "/c/" + id; } catch (e) { avisar(e.message); }
  }
  async function darToque(g, p) {
    const m = g.miembros.find((x) => x.id === p.de), q = euros(p.importe), yo = nombreDe(g, g.yo);
    const tipo = await B.dialogo({ titulo: `Toque a ${m.nombre}`, texto: `Le llega un aviso al móvil con los ${q} y el enlace para pagar. Como mucho uno al día.`, opciones: [
      { valor: "normal", texto: "Toque normal", sub: `«${yo} te recuerda los ${q}. Son dos toques.»` },
      { valor: "picante", texto: "Toque picante", sub: `«Los ${q} de ${yo} no se van a pagar solos.»` },
    ] });
    if (!tipo) return;
    try {
      const id = await abrirCobro(g, p);
      const r = await accionGrupo("toque", { grupo: g.id, cobro: id, picante: tipo === "picante" });
      await cargarGrupos();
      if (r.llegados) { avisar(`Toque enviado a ${m.nombre}`); return volverAlGrupo(); }
      // Sin la app o sin avisos: el toque va por WhatsApp, con el enlace para pagar
      const de = esPrestamo(g) ? "que te dejé" : `de «${g.nombre}»`;
      const texto = (tipo === "picante" ? `Los ${q} ${de} no se van a pagar solos.` : `Te recuerdo los ${q} ${de}.`) + ` Págalo aquí en un momento: ${enlaceCobro(id)}`;
      if (await B.dialogo({ titulo: "Mándaselo por WhatsApp", texto: `${m.nombre} no tiene ${m.con_app ? "los avisos activados" : "la app"}, así que el aviso no le llega. Mándale el toque por WhatsApp con el enlace para pagar.`, boton: "Mandar" })) await compartirTexto(texto, "Toque copiado: pégalo en WhatsApp");
      volverAlGrupo();
    } catch (e) { avisar(e.message); volverAlGrupo(); }
  }
  async function confirmarCobro(g, c, si, yaPreguntado) {
    if (!c) return;
    if (!si && !yaPreguntado && !(await B.dialogo({ titulo: "¿No te ha llegado?", texto: `Se lo diremos a ${nombreDe(g, c.de)} para que lo revise. La deuda sigue ahí.`, boton: "No me ha llegado" }))) return;
    try {
      await accionGrupo("confirmar", { grupo: g.id, cobro: c.id, si });
      await cargarGrupos();
      avisar(si ? `Confirmado: ${nombreDe(g, c.de)} y tú estáis en paz` : `Avisado: ${nombreDe(g, c.de)} lo revisará`);
      volverAlGrupo();
    } catch (e) { avisar(e.message); }
  }
  // Desde el aviso «Dani dice que te ha pagado»: bolsillo…/?cobro=<id> abre el grupo y pregunta
  async function abrirCobroDeAviso(id) {
    await cargarGrupos();
    const g = gruposCache.find((x) => (x.cobros || []).some((c) => c.id === id));
    if (!g) return avisar("Ese cobro ya no está");
    const c = g.cobros.find((x) => x.id === id);
    grupoAbierto = g; B.irVista("grupos"); volverAlGrupo();
    if (c.estado === "pagado" && c.a === g.yo) setTimeout(async () => {
      const si = await B.dialogo({ titulo: `¿Te han llegado los ${euros(c.importe)}?`, texto: `${nombreDe(g, c.de)} dice que te ha pagado${COMO[c.metodo] ? " " + COMO[c.metodo] : ""}.`, opciones: [{ valor: "si", texto: "Sí, me ha llegado", sub: "La deuda se salda sola" }, { valor: "no", texto: "No me ha llegado", sub: `Se lo diremos a ${nombreDe(g, c.de)}` }] });
      if (si) confirmarCobro(g, c, si === "si", true); else volverAlGrupo();
    }, 700);
  }

  // ============ Préstamos: «le he dejado 20 € a Dani» ============
  // No cuentan como gasto ni como ingreso (es dinero que vuelve). Van en la nube para poder cobrarlos con el enlace y avisar si se olvidan.
  function seccionPrestamos() {
    const lista = gruposCache.filter(esPrestamo).map((g) => ({ g, mio: saldos(g)[g.yo] || 0 })).sort((a, b) => Math.abs(b.mio) - Math.abs(a.mio));
    return `<h2>Préstamos</h2>
      ${lista.length ? `<div class="grupo">${lista.map(({ g, mio }) => `<button class="fila" data-prestamo="${g.id}"><div class="icono" style="--c:${mio > 0 ? "#ff9500" : mio < 0 ? "#ff3b30" : "#28a745"}">${ico(mio ? "coins" : "handshake")}</div>
        <div class="medio"><div class="titulo">${esc(otroDe(g).nombre)}</div><div class="sub">${plural(g.gastos.length, "movimiento", "movimientos")}</div></div>
        <div class="cifra num ${mio > 0 ? "ingreso" : mio < 0 ? "pasado" : ""}" style="text-align:right;font-size:14px">${textoSaldo(mio)}</div></button>`).join("")}</div>`
        : `<div class="tarjeta-duelo-vacia"><span class="icono" style="--c:#ff9500">${ico("coins")}</span><div><b>¿Le has dejado dinero a alguien?</b><span>Apúntalo y no se te olvida: si en una semana no te lo ha devuelto, te avisamos, y se lo cobras con un enlace.</span></div></div>`}
      <button class="boton-azul" id="nuevo-prestamo" style="width:100%;margin-top:10px">Apuntar un préstamo</button>`;
  }
  async function abrirPrestamo(id) {
    grupoAbierto = gruposCache.find((g) => g.id === id);
    if (!grupoAbierto) { await cargarGrupos(); grupoAbierto = gruposCache.find((g) => g.id === id); }
    if (!grupoAbierto) return avisar("Ese préstamo ya no está");
    B.irVista("grupos"); B.cerrarHoja(); setTimeout(() => { pintarGrupo(); B.abrirHoja($("#hoja-grupo")); }, 260);
  }
  async function nuevoPrestamo(g, direccion) {
    if (!B.sync.clave) {
      if (!(await B.dialogo({ titulo: "Necesitas tu nube", texto: "Los préstamos se guardan en la nube para poder mandarle el enlace de cobro y avisarte si no te lo devuelve. Es gratis y no pide email.", boton: "Crear mi nube" }))) return;
      await B.crearNube(); if (!B.sync.clave) return;
    }
    const otro = g ? otroDe(g).nombre : "";
    direccion ||= await B.dialogo({ titulo: otro ? `Préstamo con ${otro}` : "Apuntar un préstamo", opciones: [
      { valor: "dejo", texto: otro ? `Le he dejado dinero a ${otro}` : "Le he dejado dinero a alguien", sub: "Si no te lo devuelve, te avisamos" },
      { valor: "me", texto: otro ? `${otro} me ha dejado dinero` : "Alguien me ha dejado dinero", sub: "Para que no se te olvide devolverlo" }] });
    if (!direccion) return g && volverAlGrupo();
    const campos = [{ id: "importe", etiqueta: "Cuánto", placeholder: "20", decimal: true, max: 9 }];
    if (!g) campos.push({ id: "amigo", etiqueta: direccion === "dejo" ? "A quién" : "Quién", placeholder: "Dani", max: 24 });
    campos.push({ id: "concepto", etiqueta: "Para qué", placeholder: "Opcional", max: 40, opcional: true });
    if (!miNombre()) campos.push({ id: "yo", etiqueta: "Tu nombre", placeholder: "Sale en el enlace de cobro", max: 24 });
    const v = await B.dialogo({ titulo: direccion === "dejo" ? "Le he dejado dinero" : "Me han dejado dinero", campos, boton: "Apuntar",
      texto: direccion === "dejo" ? "No cuenta como gasto: es dinero que vuelve." : "No cuenta como ingreso: es dinero que tienes que devolver." });
    if (!v) return g && volverAlGrupo();
    const importe = B.aCentimos(v.importe);
    if (!importe) return avisar("Pon cuánto dinero");
    if (v.yo) guardarMiNombre(v.yo);
    try {
      const { id } = await accionGrupo("prestamo", { grupo: g?.id, amigo: v.amigo, importe, direccion, concepto: v.concepto, minombre: miNombre() });
      await cargarGrupos();
      const nuevo = gruposCache.find((x) => x.id === id);
      if (!nuevo) return;
      const mio = saldos(nuevo)[nuevo.yo] || 0, quien = otroDe(nuevo).nombre;
      avisar(mio > 0 ? `Apuntado: ${quien} te debe ${euros(mio)}` : mio < 0 ? `Apuntado: le debes ${euros(-mio)} a ${quien}` : `Apuntado: ${quien} y tú estáis en paz`);
      abrirPrestamo(id);
    } catch (e) { avisar(e.message); }
  }
  // «Me lo ha devuelto» o «Se lo he devuelto»: todo o una parte (con lo que falte, sigue el préstamo)
  async function apuntarDevuelto(g) {
    const mio = saldos(g)[g.yo] || 0, otro = otroDe(g);
    if (!mio) return;
    const v = await B.dialogo({ titulo: mio > 0 ? `¿Cuánto te ha devuelto ${otro.nombre}?` : `¿Cuánto le has devuelto a ${otro.nombre}?`, boton: "Apuntar",
      texto: "Si es solo una parte, cambia la cantidad: el resto sigue pendiente.", campos: [{ id: "importe", etiqueta: "Cuánto", valor: String(Math.abs(mio) / 100).replace(".", ","), decimal: true, max: 9 }] });
    if (!v) return volverAlGrupo();
    const importe = Math.min(B.aCentimos(v.importe), Math.abs(mio));
    if (!importe) return avisar("Pon cuánto");
    const de = mio > 0 ? otro.id : g.yo, a = mio > 0 ? g.yo : otro.id;
    try {
      await accionGrupo("gasto", { grupo: g.id, gasto: { id: "p" + Date.now().toString(36), tipo: "pago", pagador: de, importe, concepto: "Devuelto", reparto: { [a]: importe }, fecha: B.hoyISO() } });
      await cargarGrupos(); volverAlGrupo();
      avisar(importe === Math.abs(mio) ? `${otro.nombre} y tú estáis en paz` : `Apuntado. Quedan ${euros(Math.abs(mio) - importe)}`);
    } catch (e) { avisar(e.message); }
  }
  function pintarPrestamo() {
    const g = grupoAbierto, h = $("#grupo-cuerpo"), otro = otroDe(g), s = saldos(g), mio = s[g.yo] || 0, pagos = liquidar(s);
    $("#titulo-grupo").textContent = otro.nombre;
    const linea = (x) => x.tipo === "pago" ? (x.pagador === g.yo ? "Le devolviste" : "Te devolvió") : (x.pagador === g.yo ? "Le dejaste" : "Te dejó");
    h.innerHTML = `<div class="prestamo-total"><span>${mio > 0 ? `${esc(otro.nombre)} te debe` : mio < 0 ? `Le debes a ${esc(otro.nombre)}` : "Estáis en paz"}</span>
        <b class="num ${mio > 0 ? "ingreso" : mio < 0 ? "pasado" : ""}">${mio ? euros(Math.abs(mio)) : "✓"}</b></div>
      ${seccionMisCuentas(g, pagos)}
      <div class="botones-par">${mio ? `<button class="boton-azul" id="prestamo-devuelto">${mio > 0 ? "Me lo ha devuelto" : "Se lo he devuelto"}</button>` : ""}<button class="boton-gris" id="prestamo-otro">Apuntar otro</button></div>
      <h2>Historial</h2><div class="grupo">${g.gastos.map((x) => `<button class="fila" data-gasto-grupo="${x.id}"><div class="icono" style="--c:${x.tipo === "pago" ? "#28a745" : x.pagador === g.yo ? "#ff9500" : "#5856d6"}">${ico(x.tipo === "pago" ? "handshake" : "coins")}</div>
        <div class="medio"><div class="titulo">${linea(x)} ${euros(x.importe)}</div><div class="sub">${x.tipo === "pago" || x.concepto === "Préstamo" ? "" : esc(x.concepto) + " · "}${fechaCorta(x.fecha)}</div></div><span class="enlace">Borrar</span></button>`).join("")}</div>
      <div class="copiar" style="margin-top:18px"><span style="flex:1">¿${esc(otro.nombre)} tiene Bolsillo? Así lo ve también y le llegan tus toques.</span><button id="invitar">Invitar</button></div>
      <div class="campos" style="margin-top:14px"><div class="campo"><button class="boton-fila" id="mis-datos-cobro">Cómo me pagan</button><span class="estado-sync">${esc(textoDatosCobro())}</span></div></div>
      <button class="borrar" id="salir-grupo">Borrar este préstamo</button>`;
    engancharMisCuentas(g, h, pagos);
    $("#prestamo-devuelto")?.addEventListener("click", () => apuntarDevuelto(g));
    $("#prestamo-otro").addEventListener("click", () => nuevoPrestamo(g));
    h.querySelectorAll("[data-gasto-grupo]").forEach((b) => b.addEventListener("click", () => borrarGastoGrupo(g.gastos.find((y) => y.id === b.dataset.gastoGrupo))));
    $("#mis-datos-cobro").addEventListener("click", async () => { if (await pedirDatosCobro()) volverAlGrupo(); });
    $("#invitar").addEventListener("click", () => compartirTexto(`Te he apuntado en Bolsillo lo de nuestro préstamo, para que lo veas tú también: abre ${location.origin}/?unirse=${g.codigo} y elige tu nombre.`, "Invitación copiada"));
    $("#salir-grupo").addEventListener("click", async () => {
      if (!(await B.dialogo({ titulo: "¿Borrar este préstamo?", texto: mio ? "Aún no está saldado. Si lo borras, dejarás de verlo y no te avisaremos." : "Ya está saldado. Dejarás de verlo en tu lista.", boton: "Borrar", peligro: true }))) return volverAlGrupo();
      try { await accionGrupo("salir", { grupo: g.id }); grupoAbierto = null; await cargarGrupos(); avisar("Préstamo borrado"); } catch (e) { avisar(e.message); }
    });
  }

  function pintarGrupo() {
    const g = grupoAbierto, h = $("#grupo-cuerpo");
    if (!g) return;
    if (esPrestamo(g)) return pintarPrestamo();
    $("#titulo-grupo").textContent = g.nombre;
    const s = saldos(g), pagos = liquidar(s);
    const otros = pagos.filter((p) => p.de !== g.yo && p.a !== g.yo);
    h.innerHTML = `<div class="copiar"><span style="flex:1">Código para invitar: <b class="num" style="letter-spacing:.12em">${g.codigo}</b></span><button id="invitar">Invitar</button></div>
      ${seccionMisCuentas(g, pagos)}
      <h2>Saldos</h2><div class="grupo">${g.miembros.map((m) => `<div class="fila"><div class="icono" style="--c:${m.id === g.yo ? "#007aff" : m.con_app ? "#5856d6" : "#8e8e93"}">${ico(m.id === g.yo ? "user-circle" : m.con_app ? "user" : "pencil-simple")}</div><div class="medio"><div class="titulo">${esc(m.nombre)}${m.id === g.yo ? " (tú)" : ""}</div>${m.con_app ? "" : `<div class="sub">sin la app</div>`}</div>
        <div class="cifra num ${s[m.id] > 0 ? "ingreso" : s[m.id] < 0 ? "pasado" : ""}">${s[m.id] > 0 ? "+" : ""}${euros(s[m.id] || 0)}</div></div>`).join("")}</div>
      ${otros.length ? `<h2>Entre los demás</h2><div class="grupo">${otros.map((p) => `<div class="fila"><div class="medio"><div class="titulo">${esc(nombreDe(g, p.de))} → ${esc(nombreDe(g, p.a))}</div></div><div class="cifra num">${euros(p.importe)}</div><button class="enlace" data-saldar="${pagos.indexOf(p)}">Pagado</button></div>`).join("")}</div>` : ""}
      ${pagos.length ? `<p class="nota-ajuste">${plural(pagos.length, "pago", "pagos")} en total para quedar en paz: el mínimo posible.</p>` : `<p class="nota-ajuste">Estáis en paz ✓</p>`}
      <div class="botones-par"><button class="boton-azul" id="gasto-grupo">Añadir gasto</button><button class="boton-gris" id="persona-grupo">Añadir persona</button></div>
      <h2>Gastos</h2>${g.gastos.length ? `<div class="grupo">${g.gastos.map((x) => `<button class="fila" data-gasto-grupo="${x.id}"><div class="icono" style="--c:${x.tipo === "pago" ? "#28a745" : "#ff9500"}">${ico(x.tipo === "pago" ? "handshake" : "receipt")}</div><div class="medio">
        <div class="titulo">${x.tipo === "pago" ? `${esc(nombreDe(g, x.pagador))} pagó a ${esc(nombreDe(g, Object.keys(x.reparto)[0]))}` : esc(x.concepto || "Gasto")}</div><div class="sub">${x.tipo === "pago" ? "" : `Pagó ${esc(nombreDe(g, x.pagador))} · `}${fechaCorta(x.fecha)}</div></div><div class="cifra num">${euros(x.importe)}</div></button>`).join("")}</div>` : `<div class="vacio" style="padding:20px">Aún no hay gastos en este grupo.</div>`}
      <div class="campos" style="margin-top:22px"><div class="campo"><button class="boton-fila" id="mis-datos-cobro">Cómo me pagan</button><span class="estado-sync">${esc(textoDatosCobro())}</span></div></div>
      <p class="nota-ajuste">Tu Bizum, PayPal o Revolut salen en tus enlaces de cobro para que te paguen en un toque.</p>
      <button class="borrar" id="salir-grupo">Salir del grupo</button>`;
    engancharMisCuentas(g, h, pagos);
    $("#mis-datos-cobro").addEventListener("click", async () => { if (await pedirDatosCobro()) volverAlGrupo(); });
    $("#invitar").addEventListener("click", async () => {
      const texto = `Únete a «${g.nombre}» en Bolsillo para llevar los gastos: abre ${location.origin}/?unirse=${g.codigo} o mete el código ${g.codigo} en Grupos.`;
      try { if (navigator.share) await navigator.share({ text: texto }); else { await navigator.clipboard.writeText(texto); avisar("Invitación copiada"); } } catch {}
    });
    h.querySelectorAll("[data-saldar]").forEach((b) => b.addEventListener("click", async () => {
      const p = pagos[Number(b.dataset.saldar)];
      if (!(await B.dialogo({ titulo: "¿Ya está pagado?", texto: `${nombreDe(g, p.de)} le ha pagado ${euros(p.importe)} a ${nombreDe(g, p.a)}.`, boton: "Sí, está pagado" }))) return;
      try { await accionGrupo("gasto", { grupo: g.id, gasto: { id: "p" + Date.now().toString(36), tipo: "pago", pagador: p.de, importe: p.importe, concepto: "Pago", reparto: { [p.a]: p.importe }, fecha: B.hoyISO() } }); await cargarGrupos(); volverAlGrupo(); avisar("Pago apuntado"); }
      catch (e) { avisar(e.message); }
    }));
    $("#gasto-grupo").addEventListener("click", () => abrirGastoGrupo());
    $("#persona-grupo").addEventListener("click", async () => {
      const v = await B.dialogo({ titulo: "Añadir persona", texto: "Aunque no tenga la app. Si luego se une con el código, podrá quedarse con este nombre y sus cuentas.", boton: "Añadir", campos: [{ id: "nombre", etiqueta: "Nombre", max: 24 }] });
      if (!v) return;
      try { await accionGrupo("miembro", { grupo: g.id, nombre: v.nombre }); await cargarGrupos(); volverAlGrupo(); } catch (e) { avisar(e.message); }
    });
    h.querySelectorAll("[data-gasto-grupo]").forEach((b) => b.addEventListener("click", () => { const x = g.gastos.find((y) => y.id === b.dataset.gastoGrupo); if (x.tipo === "gasto") abrirGastoGrupo(x); else borrarGastoGrupo(x); }));
    $("#salir-grupo").addEventListener("click", async () => {
      if (!(await B.dialogo({ titulo: "¿Salir del grupo?", texto: "Tu nombre se queda en las cuentas para que cuadren.", boton: "Salir", peligro: true }))) return;
      try { await accionGrupo("salir", { grupo: g.id }); grupoAbierto = null; await cargarGrupos(); avisar("Has salido del grupo"); } catch (e) { avisar(e.message); }
    });
  }
  // Borrar sin preguntar, con «Deshacer»
  async function borrarGastoGrupo(x) {
    const grupo = grupoAbierto.id;
    try {
      await accionGrupo("gasto", { grupo, gasto: { ...x, borrado: true } }); await cargarGrupos(); volverAlGrupo();
      avisar(`Borrado: ${x.tipo === "pago" ? "pago" : x.concepto || "gasto"}`, { texto: "Deshacer", fn: async () => { try { await accionGrupo("gasto", { grupo, gasto: { ...x, borrado: false } }); await cargarGrupos(); } catch (e) { avisar(e.message); } } });
    } catch (e) { avisar(e.message); }
  }
  // Formulario de gasto de grupo
  let gastoGrupoEditando = null;
  function abrirGastoGrupo(x) {
    const g = grupoAbierto;
    gastoGrupoEditando = x || null;
    $("#gg-concepto").value = x?.concepto || "";
    $("#gg-importe").value = x ? String(x.importe / 100).replace(".", ",") : "";
    $("#gg-pagador").innerHTML = g.miembros.map((m) => `<option value="${m.id}" ${(x ? x.pagador === m.id : m.id === g.yo) ? "selected" : ""}>${esc(m.nombre)}${m.id === g.yo ? " (tú)" : ""}</option>`).join("");
    $("#gg-entre").innerHTML = g.miembros.map((m) => `<label class="check"><input type="checkbox" value="${m.id}" ${!x || x.reparto[m.id] !== undefined ? "checked" : ""}> ${esc(m.nombre)}</label>`).join("");
    $("#gg-cat").innerHTML = B.CATS.gasto.map(([id, nombre]) => `<option value="${id}">${nombre}</option>`).join("");
    $("#gg-mio").checked = !x; $("#fila-gg-mio").hidden = Boolean(x);
    $("#gg-borrar").hidden = !x;
    $("#titulo-gasto-grupo").textContent = x ? "Editar gasto" : "Gasto del grupo";
    B.cerrarHoja(); setTimeout(() => B.abrirHoja($("#hoja-gasto-grupo")), 250);
  }
  async function guardarGastoGrupo() {
    const g = grupoAbierto, importe = B.aCentimos($("#gg-importe").value), concepto = $("#gg-concepto").value.trim();
    const entre = $$("#gg-entre input:checked").map((i) => i.value);
    if (!importe || !entre.length) return avisar("Pon el importe y entre quién se reparte");
    // Reparto a partes iguales; los céntimos que sobran, a los primeros
    const base = Math.floor(importe / entre.length), sobra = importe - base * entre.length;
    const reparto = Object.fromEntries(entre.map((id, i) => [id, base + (i < sobra ? 1 : 0)]));
    const gasto = { id: gastoGrupoEditando?.id || "gg" + Date.now().toString(36), tipo: "gasto", pagador: $("#gg-pagador").value, importe, concepto, reparto, fecha: gastoGrupoEditando?.fecha || B.hoyISO() };
    try {
      await accionGrupo("gasto", { grupo: g.id, gasto });
      // Tu parte también cuenta como gasto tuyo del mes
      if (!gastoGrupoEditando && $("#gg-mio").checked && reparto[g.yo]) B.anadirMov({ tipo: "gasto", cat: $("#gg-cat").value, importe: reparto[g.yo], nota: `${concepto || "Gasto"} (${g.nombre})`.slice(0, 60) });
      B.cerrarHoja(); await cargarGrupos(); setTimeout(() => { pintarGrupo(); B.abrirHoja($("#hoja-grupo")); }, 250); avisar("Gasto del grupo apuntado");
    } catch (e) { avisar(e.message); }
  }

  // ============ Novedades: al actualizarse la app, se enseña una vez lo que trae cada versión que no has visto ============
  const CLAVE_VERSION = "bolsillo.versionVista";
  const numVersion = (v) => String(v).split(".").reduce((n, p) => n * 1000 + (Number(p) || 0), 0);
  let versiones = [];
  async function cargarVersiones() {
    try { versiones = (await (await fetch("novedades.json", { cache: "no-store" })).json()).versiones || []; } catch {}
    if (versiones[0]) $("#version-actual").textContent = "Versión " + versiones[0].version;
    return versiones;
  }
  function pintarNovedades(lista, nuevas) {
    $("#novedades-cuerpo").innerHTML = lista.map((v) => `<article class="version-app ${nuevas ? "nueva" : ""}"><div class="version-app__cabeza"><span class="icono grande" style="--c:${v.color};width:52px;height:52px;border-radius:14px">${ico(v.icono)}</span>
      <div><small>Versión ${esc(v.version)} · ${fechaCorta(v.fecha)}${nuevas ? '<span class="etiqueta-nueva">Nuevo</span>' : ""}</small><b>${esc(v.titulo)}</b></div></div>
      <ul>${v.cambios.map((c) => `<li>${esc(c)}</li>`).join("")}</ul></article>`).join("");
    $("#titulo-novedades").textContent = nuevas ? "Lo nuevo en Bolsillo" : "Novedades";
    B.abrirHoja($("#hoja-novedades"));
  }
  async function comprobarNovedades() {
    await cargarVersiones();
    if (!versiones.length) return;
    const ultima = versiones[0].version;
    let vista = null; try { vista = localStorage.getItem(CLAVE_VERSION); } catch {}
    const marcar = () => { try { localStorage.setItem(CLAVE_VERSION, ultima); } catch {} };
    if (!vista) {
      // Primera vez con este aviso: a quien acaba de llegar no se le enseña (todo es nuevo); a quien ya la usaba, lo último
      let nuevoUsuario = true; try { nuevoUsuario = localStorage.getItem("bolsillo.bienvenida") !== "si" && !B.vivos().length; } catch {}
      if (nuevoUsuario) return marcar();
      vista = "0";
    }
    const pendientes = versiones.filter((v) => numVersion(v.version) > numVersion(vista));
    if (!pendientes.length) return;
    marcar();
    // Sin pisar nada: espera a que no haya otra hoja abierta ni la bienvenida
    const enseñar = () => (document.querySelector(".hoja.abierta") || !$("#bienvenida").hidden ? setTimeout(enseñar, 1500) : pintarNovedades(pendientes.slice(0, vista === "0" ? 1 : 3), true));
    setTimeout(enseñar, 1200);
  }
  $("#abrir-novedades").addEventListener("click", async () => { if (!versiones.length) await cargarVersiones(); B.cerrarHoja(); setTimeout(() => pintarNovedades(versiones.slice(0, 5), false), 260); });

  // ============ Tú decides: encuesta de la hoja de ruta ============
  // Con nube se vota con ella; sin nube, con el mismo id de navegador que usa la web (están en la misma dirección)
  const votanteWeb = () => { let v; try { v = localStorage.getItem("bolsillo.votante"); if (!v) { v = crypto.randomUUID().replace(/-/g, ""); localStorage.setItem("bolsillo.votante", v); } } catch { v = crypto.randomUUID().replace(/-/g, ""); } return v; };
  async function abrirIdeas() {
    $("#ideas-lista").innerHTML = `<div class="vacio" style="padding:20px">Cargando…</div>`;
    B.abrirHoja($("#hoja-ideas"));
    try {
      const j = await (await B.api(`ideas?votante=${votanteWeb()}`)).json();
      $("#ideas-votantes").textContent = j.votantes >= 5 ? `Ya han votado ${j.votantes} personas.` : "Sé de los primeros en votar.";
      $("#ideas-lista").innerHTML = j.ideas.map((i) => `<div class="fila"><div class="icono" style="--c:${i.color}">${ico(i.icono)}</div><div class="medio"><div class="titulo" style="white-space:normal">${esc(i.titulo)}</div><div class="sub" style="white-space:normal">${esc(i.texto)}</div></div>
        <button class="voto-app" data-votar="${i.id}" data-n="${i.votos}" aria-pressed="${i.mio}" aria-label="Votar: ${esc(i.titulo)}">${ico("thumbs-up")}<span>${j.votantes >= 5 ? i.votos : i.mio ? "Votado" : "Lo quiero"}</span></button></div>`).join("");
      $("#ideas-lista").dataset.votantes = j.votantes;
    } catch { $("#ideas-lista").innerHTML = `<div class="vacio" style="padding:20px">Sin conexión. Prueba en un rato.</div>`; }
  }
  $("#ideas-lista").addEventListener("click", async (e) => {
    const b = e.target.closest("[data-votar]"); if (!b || b.disabled) return;
    const quitar = b.getAttribute("aria-pressed") === "true", muchos = Number($("#ideas-lista").dataset.votantes) >= 5;
    const pinta = (n, mio) => { b.setAttribute("aria-pressed", String(mio)); b.dataset.n = n; b.querySelector("span").textContent = muchos ? n : mio ? "Votado" : "Lo quiero"; };
    const antes = Number(b.dataset.n) || 0;
    pinta(antes + (quitar ? -1 : 1), !quitar); b.disabled = true;
    try {
      const r = await B.api("ideas/votar", { idea: b.dataset.votar, votante: votanteWeb(), quitar }), j = await r.json();
      if (!r.ok) throw new Error(j.error);
      pinta(j.votos, j.mio);
      if (!quitar && navigator.vibrate) navigator.vibrate(10);
    } catch (err) { pinta(antes, quitar); avisar(err.message || "No se ha podido votar"); }
    finally { b.disabled = false; }
  });
  $("#enviar-idea").addEventListener("click", async () => {
    const texto = $("#idea-propia").value.trim();
    if (texto.length < 5) return avisar("Cuéntanos un poco más");
    try {
      const r = await B.api("ideas/sugerir", { texto, votante: votanteWeb() }), j = await r.json();
      if (!r.ok) throw new Error(j.error);
      $("#idea-propia").value = ""; avisar("Recibido. ¡Gracias por la idea!");
    } catch (err) { avisar(err.message || "No se ha podido enviar"); }
  });

  // ============ Apuntar con la voz (Siri / doble toque) ============
  function abrirVoz() {
    $("#url-voz").textContent = new URL("api/gasto?clave=" + encodeURIComponent(B.sync.clave || ""), location.href).href;
    B.cerrarHoja(); setTimeout(() => B.abrirHoja($("#hoja-voz")), 250);
  }
  async function probarVoz() {
    const t = $("#frase-voz").value.trim();
    if (!t) return avisar("Escribe una frase de prueba");
    try { const r = await B.api("gasto", { texto: t, prueba: true }); const j = await r.json(); $("#resultado-voz").textContent = j.texto || j.error; }
    catch { $("#resultado-voz").textContent = "Sin conexión"; }
  }

  // ============ Enganches ============
  $("#guardar-hucha").addEventListener("click", guardarHucha);
  $("#hucha-iconos").addEventListener("click", (e) => { const b = e.target.closest("[data-icono-hucha]"); if (b) { iconoElegido = b.dataset.iconoHucha; pintarIconosHucha(); } });
  $("#hucha-mas").addEventListener("click", () => aportar(1));
  $("#hucha-menos").addEventListener("click", () => aportar(-1));
  $("#hucha-borrar").addEventListener("click", () => {
    if (!huchaEditando) return;
    const antes = B.datos.extra.huchas || [], h = huchaEditando;
    B.setExtra("huchas", antes.filter((x) => x.id !== h.id)); B.cerrarHoja(); pintarMetas();
    avisar(`Hucha borrada: ${h.nombre}`, { texto: "Deshacer", fn: () => { B.setExtra("huchas", antes); pintarMetas(); } });
  });
  $("#compartir-wrapped").addEventListener("click", compartirWrapped);
  $("#guardar-gasto-grupo").addEventListener("click", guardarGastoGrupo);
  $("#gg-borrar").addEventListener("click", () => { const x = gastoGrupoEditando; B.cerrarHoja(); setTimeout(() => borrarGastoGrupo(x), 250); });
  $("#gg-volver").addEventListener("click", () => { B.cerrarHoja(); setTimeout(() => B.abrirHoja($("#hoja-grupo")), 250); });
  $("#abrir-voz").addEventListener("click", () => B.sync.clave ? abrirVoz() : avisar("Primero crea tu nube (aquí arriba)"));
  $("#probar-voz").addEventListener("click", probarVoz);

  // ============ Gastos e ingresos fijos: se apuntan solos cada mes el día que toca ============
  // La cuenta de qué toca está en fijos.js, que comparte con el servidor. Con nube los apunta el servidor al sincronizar
  // (así no salen repetidos si usas varios móviles); sin nube, este móvil.
  let F = null;
  const cargarF = async () => (F ||= await import("./fijos.js"));
  const listaFijos = () => B.datos.extra.fijos || [];
  const mesHoy = () => B.hoyISO().slice(0, 7), diaHoy = () => Number(B.hoyISO().slice(8));
  let fijoEditando = null, tipoFijo = "gasto", fijoDeCobro = false;

  async function apuntarFijosAqui() {
    if (B.sync.clave || !listaFijos().length) return;
    await cargarF();
    let hechos = []; try { hechos = JSON.parse(localStorage.getItem("bolsillo.fijosHechos") || "[]"); } catch {}
    const ya = new Set([...hechos, ...B.datos.movs.map((m) => m.id)]);
    const nuevos = F.fijosQueTocan(listaFijos(), B.hoyISO()).filter((m) => !ya.has(m.id));
    for (const m of nuevos) B.anadirMov({ ...m, origen: "fijo" });
    if (nuevos.length) try { localStorage.setItem("bolsillo.fijosHechos", JSON.stringify([...hechos, ...nuevos.map((m) => m.id)].slice(-300))); } catch {}
  }

  function pintarFijos() {
    const lista = [...listaFijos()].sort((a, b) => a.dia - b.dia);
    $("#cuantos-fijos").textContent = lista.length || "";
    const total = (t) => lista.filter((f) => f.tipo === t).reduce((s, f) => s + f.importe, 0);
    // Cobros que Bolsillo ve repetirse cada mes y que apuntas a mano: candidatos a fijo (los de Apple Pay o Wallet ya se apuntan solos)
    const tengo = new Set(lista.map((f) => nombreClave(f.nombre)));
    const sugeridos = suscripciones().filter((s) => (s.origen || "app") === "app" && !tengo.has(nombreClave(s.nombre)));
    $("#fijos-cuerpo").innerHTML = (lista.length ? `<div class="grupo">${lista.map((f) => {
        const [, nombreCat, icono, color] = B.catDe(f.tipo, f.cat);
        return `<button class="fila" data-fijo="${f.id}"><div class="icono" style="--c:${color}">${ico(icono)}</div><div class="medio"><div class="titulo">${esc(f.nombre)}</div><div class="sub">Día ${f.dia} de cada mes · ${esc(nombreCat)}</div></div><div class="cifra num ${f.tipo === "ingreso" ? "ingreso" : ""}">${f.tipo === "ingreso" ? "+" : ""}${euros(f.importe)}</div></button>`;
      }).join("")}</div>
      <p class="nota-ajuste">Al mes: ${euros(total("gasto"))} en gastos fijos${total("ingreso") ? ` y ${euros(total("ingreso"))} en ingresos` : ""}. Se apuntan solos el día que toca, con la etiqueta Fijo. Si un mes no toca, borra ese movimiento y no volverá.</p>`
      : `<div class="vacio"><b>Aún no tienes fijos</b>Pulsa Añadir para el alquiler, el gimnasio, tus suscripciones o tu paga.</div>`)
      + (sugeridos.length ? `<h4 class="titulo-grupo">Se repiten en tus gastos</h4><div class="grupo">${sugeridos.map((s, i) => {
        const [, , icono, color] = B.catDe("gasto", s.cat);
        return `<div class="fila"><div class="icono" style="--c:${color}">${ico(icono)}</div><div class="medio"><div class="titulo">${esc(s.nombre)}</div><div class="sub">Cada mes, sobre el día ${Number(s.proximo.slice(8))}</div></div><button class="boton-mini" data-sugerido="${i}">Hacer fijo</button></div>`;
      }).join("")}</div>` : "");
    $$("[data-fijo]").forEach((b) => b.addEventListener("click", () => abrirFijo(listaFijos().find((f) => f.id === b.dataset.fijo))));
    $$("[data-sugerido]").forEach((b) => b.addEventListener("click", () => { const s = sugeridos[b.dataset.sugerido]; abrirFijo(null, { nombre: s.nombre, importe: s.importe, cat: s.cat, tipo: "gasto", dia: Number(s.proximo.slice(8)) }); }));
  }
  function abrirFijos() { pintarFijos(); B.cerrarHoja(); setTimeout(() => B.abrirHoja($("#hoja-fijos")), 250); }

  function elegirTipoFijo(tipo, cat) {
    tipoFijo = tipo;
    $$("[data-fijo-tipo]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.fijoTipo === tipo)));
    $("#fijo-cat").innerHTML = B.CATS[tipo].map(([id, nombre]) => `<option value="${id}">${nombre}</option>`).join("");
    if (cat) $("#fijo-cat").value = cat;
  }
  function notaFijo() {
    const dia = Number($("#fijo-dia").value), paso = dia <= diaHoy();
    $("#fila-fijo-ya").hidden = Boolean(fijoEditando) || !paso;
    $("#texto-fijo-ya").textContent = `Apuntarlo también este mes (el día ${dia} ya ha pasado)`;
    $("#nota-fijo").textContent = (fijoEditando ? `Se apunta solo el día ${dia} de cada mes. Lo ya apuntado no cambia.`
      : paso ? (fijoDeCobro ? "Este mes ya lo tienes apuntado, así que empezará el mes que viene." : "Si este mes ya lo apuntaste a mano, quita la marca para no tenerlo dos veces.")
      : `Se apuntará solo el día ${dia} de este mes y después cada mes.`)
      + (dia >= 29 ? " En los meses más cortos, el último día." : "") + " Si ya se apunta solo con Apple Pay o Wallet, no lo hagas fijo.";
  }
  function abrirFijo(f, plantilla) {
    fijoEditando = f || null; fijoDeCobro = Boolean(plantilla);
    const base = f || plantilla || {};
    elegirTipoFijo(base.tipo || "gasto", base.cat);
    $("#titulo-fijo").textContent = f ? f.nombre : "Nuevo fijo";
    $("#fijo-nombre").value = base.nombre || "";
    $("#fijo-importe").value = base.importe ? String(base.importe / 100).replace(".", ",") : "";
    $("#fijo-dia").value = String(base.dia || diaHoy());
    $("#fijo-ya").checked = !plantilla; // un cobro detectado ya está apuntado este mes
    $("#fijo-borrar").hidden = !f;
    notaFijo();
    B.cerrarHoja(); setTimeout(() => B.abrirHoja($("#hoja-fijo")), 250);
  }
  function guardarFijo() {
    const nombre = $("#fijo-nombre").value.trim().slice(0, 40), importe = B.aCentimos($("#fijo-importe").value), dia = Number($("#fijo-dia").value);
    if (!nombre || !importe) return avisar("Pon qué es y el importe");
    const [a, m] = mesHoy().split("-").map(Number), siguiente = new Date(a, m, 1).toLocaleDateString("sv-SE").slice(0, 7);
    const fijo = { id: fijoEditando?.id || Math.random().toString(36).slice(2, 10).padEnd(8, "0"), nombre, tipo: tipoFijo, cat: $("#fijo-cat").value, importe, dia,
      desde: fijoEditando?.desde || (dia > diaHoy() || $("#fijo-ya").checked ? mesHoy() : siguiente) };
    B.setExtra("fijos", [...listaFijos().filter((f) => f.id !== fijo.id), fijo]);
    apuntarFijosAqui();
    avisar(fijoEditando ? "Fijo guardado" : `${nombre}: se apuntará solo el día ${dia} de cada mes`);
    abrirFijos(); B.pintar();
  }
  $("#fijo-dia").innerHTML = Array.from({ length: 31 }, (_, i) => `<option value="${i + 1}">${i + 1}</option>`).join("");
  $("#fijo-dia").addEventListener("change", notaFijo);
  $$("[data-fijo-tipo]").forEach((b) => b.addEventListener("click", () => elegirTipoFijo(b.dataset.fijoTipo)));
  $("#abrir-fijos").addEventListener("click", abrirFijos);
  $("#nuevo-fijo").addEventListener("click", () => abrirFijo());
  $("#fijo-volver").addEventListener("click", abrirFijos);
  $("#guardar-fijo").addEventListener("click", guardarFijo);
  $("#fijo-borrar").addEventListener("click", () => {
    const antes = listaFijos(), f = fijoEditando;
    B.setExtra("fijos", antes.filter((x) => x.id !== f.id)); abrirFijos(); B.pintar();
    avisar(`${f.nombre} ya no se apuntará solo`, { texto: "Deshacer", fn: () => { B.setExtra("fijos", antes); pintarFijos(); B.pintar(); } });
  });
  $("#abrir-ajustes").addEventListener("click", () => ($("#cuantos-fijos").textContent = listaFijos().length || ""));
  document.addEventListener("visibilitychange", () => { if (!document.hidden) apuntarFijosAqui(); });
  apuntarFijosAqui();

  // ============ Límites por categoría ============
  // Se guardan como { categoría: céntimos }. Cuentan por semana o por mes (limitesPeriodo; si no lo eliges, como tu presupuesto)
  const listaLimites = () => B.datos.extra.limites || {};
  const mesAntes = (n) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - n); return fechaISO(d).slice(0, 7); };
  // Lo que sueles gastar: la media de los 3 meses anteriores (los que tienen gastos), para que el límite tenga sentido
  function mediaCat(cat) {
    const g = gastos().filter((m) => m.cat === cat);
    const totales = [1, 2, 3].map(mesAntes).map((k) => g.filter((m) => m.fecha.startsWith(k)).reduce((s, m) => s + m.importe, 0)).filter(Boolean);
    return totales.length ? Math.round(totales.reduce((a, b) => a + b, 0) / totales.length) : 0;
  }
  function subLimite(cat) {
    const l = listaLimites()[cat], usado = B.gastoPeriodo(B.periodoLimites(), cat), media = mediaCat(cat);
    const corto = (c) => euros(c, B.conCentimos(c));
    if (l) return usado > l ? `<span class="limite-pasado">Te has pasado ${corto(usado - l)}</span>` : `${corto(usado)} de ${corto(l)} · quedan ${corto(l - usado)}`;
    if (media && B.limitesSemanales()) return `Sueles gastar unos ${euros(Math.round(media * 7 / 30), false)} a la semana`;
    return media ? `Sueles gastar unos ${euros(media, false)} al mes` : usado ? `Llevas ${euros(usado)}` : "Sin gastos todavía";
  }
  function pintarLimites() {
    const lim = listaLimites(), pe = B.periodo(), semanal = B.limitesSemanales();
    $("#cuantos-limites").textContent = Object.keys(lim).length || "";
    $$("[data-limites-periodo]").forEach((b) => b.setAttribute("aria-pressed", String((b.dataset.limitesPeriodo === "semana") === semanal)));
    const cuando = semanal ? (pe.semanal ? `de ${pe.nombreDia} a ${pe.nombreDia}` : "de lunes a domingo") : pe.paga && !pe.semanal ? `de paga a paga (desde el día ${pe.diaPaga})` : "del día 1 al último del mes";
    $("#limites-intro").textContent = `Cada límite es ${semanal ? "para la semana" : "para el mes"}: cuenta ${cuando}. Deja vacío lo que no quieras limitar.`;
    $("#limites-cuerpo").innerHTML = `<div class="grupo">${B.CATS.gasto.map(([id, nombre, icono, color]) => `<label class="fila limite-fila" for="lim-${id}"><div class="icono" style="--c:${color}">${ico(icono)}</div>
      <div class="medio"><div class="titulo">${nombre}</div><div class="sub">${subLimite(id)}</div></div>
      <input id="lim-${id}" data-limite="${id}" class="num" inputmode="decimal" placeholder="Sin límite" value="${lim[id] ? String(lim[id] / 100).replace(".", ",") : ""}" autocomplete="off" aria-label="Límite de ${nombre} en euros"></label>`).join("")}</div>`;
    $$("[data-limite]").forEach((i) => i.addEventListener("change", () => guardarLimite(i)));
  }
  // Solo se repinta su fila: si se repintara todo, el campo al que acabas de pasar perdería el foco
  function guardarLimite(campo) {
    const cat = campo.dataset.limite, c = B.aCentimos(campo.value), lim = { ...listaLimites() }, nombre = B.catDe("gasto", cat)[1];
    if (c) lim[cat] = c; else delete lim[cat];
    B.setExtra("limites", lim); B.pintar();
    campo.closest(".fila").querySelector(".sub").innerHTML = subLimite(cat);
    $("#cuantos-limites").textContent = Object.keys(lim).length || "";
    avisar(c ? `Límite de ${nombre}: ${euros(c, B.conCentimos(c))}` : `${nombre}, sin límite`);
  }
  function abrirLimites() { pintarLimites(); B.cerrarHoja(); setTimeout(() => B.abrirHoja($("#hoja-limites")), 250); }
  $("#abrir-limites").addEventListener("click", abrirLimites);
  // Por semana o por mes: las cantidades no se tocan (60 € siguen siendo 60 €), solo cambia en cuánto tiempo cuentan
  $$("[data-limites-periodo]").forEach((b) => b.addEventListener("click", () => {
    if ((b.dataset.limitesPeriodo === "semana") === B.limitesSemanales()) return;
    B.setExtra("limitesPeriodo", b.dataset.limitesPeriodo); pintarLimites(); B.pintar();
    avisar(b.dataset.limitesPeriodo === "semana" ? "Tus límites ahora son por semana" : "Tus límites ahora son por mes");
  }));
  $("#abrir-ajustes").addEventListener("click", () => ($("#cuantos-limites").textContent = Object.keys(listaLimites()).length || ""));

  // ============ ¿Me lo puedo permitir? ============
  // Lo que te queda del presupuesto en este periodo, menos los gastos fijos que aún no se han apuntado. Si no llega, cuándo sí.
  async function fijosPendientes(pe) {
    await cargarF();
    const hoy = B.hoyISO(), tengo = new Set(B.datos.movs.map((m) => m.id)), meses = [...new Set([pe.ini.slice(0, 7), masDias(pe.fin, -1).slice(0, 7)])];
    const pendientes = [];
    for (const f of listaFijos().filter((f) => f.tipo === "gasto" && F.fijoValido(f))) {
      for (const mes of meses) {
        const fecha = F.fechaEnMes(f, mes);
        if (mes >= f.desde && fecha > hoy && fecha >= pe.ini && fecha < pe.fin && !tengo.has(F.idFijo(f, mes))) pendientes.push(f);
      }
    }
    return { total: pendientes.reduce((s, f) => s + f.importe, 0), nombres: pendientes.map((f) => f.nombre) };
  }
  async function permitir() {
    let p = B.datos.presupuesto;
    const variable = Boolean(B.datos.extra.variable);
    if (!p && variable && B.sobres()) return avisar("Lo que has cobrado no llega ni para tus fijos: no queda nada para gastar");
    if (!p) {
      const semanal = B.pagaSemanal();
      const r = await B.dialogo({ titulo: "Primero, tu presupuesto", texto: `Para saber si te lo puedes permitir necesito saber cuánto quieres gastar como mucho ${semanal ? "a la semana" : "al mes"}.`, campos: [{ id: "p", etiqueta: semanal ? "A la semana" : "Al mes", placeholder: semanal ? "60" : "250", decimal: true, max: 9 }], boton: "Seguir" });
      if (!r) return;
      p = B.aCentimos(r.p);
      if (!p) return avisar("Escribe una cantidad");
      B.ponerPresupuesto(p);
    }
    const r = await B.dialogo({ titulo: "¿Me lo puedo permitir?", texto: "Te digo si te llega contando lo que ya llevas gastado y los gastos fijos que aún te faltan.",
      campos: [{ id: "precio", etiqueta: "Cuesta", placeholder: "80", decimal: true, max: 9 }, { id: "que", etiqueta: "Qué es", placeholder: "Opcional", max: 40, opcional: true }], boton: "Calcular" });
    if (!r) return;
    const precio = B.aCentimos(r.precio);
    if (!precio) return avisar("Escribe cuánto cuesta");
    // Con los sobres, los fijos ya tienen su parte apartada: no se vuelven a restar
    const que = r.que.slice(0, 40), pe = B.periodo(), fijos = variable ? { total: 0, nombres: [] } : await fijosPendientes(pe);
    const queda = p - B.gastoPeriodo(pe) - fijos.total - precio, dias = pe.quedanDias, normal = Math.floor(p / pe.largo);
    const notaFijos = fijos.total ? ` Ya cuento ${euros(fijos.total)} de fijos que te faltan (${fijos.nombres.slice(0, 2).join(", ")}${fijos.nombres.length > 2 ? "…" : ""}).` : "";
    const hasta = pe.semanal ? `hasta el ${pe.nombreDia}` : pe.paga ? "hasta tu paga" : "hasta fin de mes";
    if (queda >= 0) {
      const alDia = Math.floor(queda / dias), holgado = alDia >= normal * 0.5;
      const eleccion = await B.dialogo({ titulo: holgado ? "Sí, te lo puedes permitir" : "Sí, pero irás justo",
        texto: `Después te quedarían ${euros(queda)} ${hasta}: ${euros(alDia)} al día ${dias === 1 ? "para hoy" : `durante ${dias} días`}${holgado ? "." : `, y lo normal para ti son ${euros(normal)}.`}${notaFijos}`,
        opciones: [{ valor: "apuntar", texto: "Lo compro: apúntalo", sub: `−${euros(precio)}${que ? " · " + que : ""}` }, { valor: "no", texto: "Mejor no", sub: "No se apunta nada" }] });
      if (eleccion === "apuntar") {
        const cat = B.adivinarCat(que) || "otros";
        B.anadirMov({ tipo: "gasto", cat, importe: precio, nota: que });
        avisar(`−${euros(precio)} · ${que || B.catDe("gasto", cat)[1]}`);
      }
      return;
    }
    // No llega: si cabe en el próximo periodo (con sus fijos), desde cuándo; si ni con uno entero, cuánto apartar cada periodo
    // Con los sobres no se sabe cuánto cobrarás: se supone que lo mismo que ahora
    const siguiente = B.periodo(pe.fin), libre = variable ? p : p - (await fijosPendientes(siguiente)).total;
    const cuando = new Date(pe.fin + "T12:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "long" });
    const unidad = pe.semanal ? ["semana", "semanas", "a la semana", "una semana entera"] : ["mes", "meses", "al mes", "un mes entero"];
    let titulo, texto;
    if (precio <= libre) {
      titulo = pe.semanal ? "Esta semana no te llega" : "Este mes no te llega";
      texto = `Te faltan ${euros(-queda)} ${hasta}.${notaFijos} ${variable ? "Si cobras lo mismo, a" : "A"} partir del ${pe.semanal ? `${pe.nombreDia}, ${cuando}` : cuando} (en ${dias === 1 ? "1 día" : `${dias} días`}) sí podrás, y te quedarían ${euros(libre - precio)} para ${pe.semanal ? "esa semana" : pe.paga ? "esa paga" : "ese mes"}.`;
    } else {
      const aparta = Math.max(pe.semanal ? 200 : 500, Math.ceil((libre * 0.2) / 100) * 100), veces = Math.ceil(precio / aparta);
      titulo = "Mejor ahorra para ello";
      texto = libre > 0 ? `Cuesta más de lo que tienes libre en ${unidad[3]} (${euros(libre, false)} después de tus fijos). Si apartas ${euros(aparta, false)} ${unidad[2]}, lo tienes en ${veces} ${veces === 1 ? unidad[0] : unidad[1]}.`
        : "Tus gastos fijos ya ocupan todo tu presupuesto. Revisa el presupuesto o los fijos en Ajustes antes de pensar en esto.";
    }
    const eleccion = await B.dialogo({ titulo, texto, opciones: [{ valor: "hucha", texto: "Ahorrar para esto en una hucha", sub: `Meta: ${euros(precio, B.conCentimos(precio))}` }, { valor: "vale", texto: "Vale", sub: "No se apunta nada" }] });
    if (eleccion === "hucha") setTimeout(() => { abrirHucha(); $("#hucha-nombre").value = que || "Mi capricho"; $("#hucha-objetivo").value = String(precio / 100).replace(".", ","); }, 300);
  }
  document.addEventListener("click", (e) => {
    if (e.target.closest("#permitir")) permitir();
    else if (e.target.closest("#poner-limites")) abrirLimites();
  });

  // ============ Apariencia: modo claro u oscuro y color de la app ============
  // Se guarda en este móvil (para aplicarlo antes de pintar) y en la nube (para que sea igual en todos tus móviles)
  const COLORES = [
    { id: "azul", nombre: "Azul", c: "#0a84ff" }, { id: "indigo", nombre: "Índigo", c: "#5e5ce6" }, { id: "morado", nombre: "Morado", c: "#af52de" },
    { id: "rosa", nombre: "Rosa", c: "#ff2d55" }, { id: "naranja", nombre: "Naranja", c: "#f57c00" }, { id: "verde", nombre: "Verde", c: "#1fa855" },
    { id: "menta", nombre: "Menta", c: "#0fa3b1" }, { id: "oro", nombre: "Oro", c: "#c9a227", insignias: 5 },
  ];
  const MODOS = [["", "Automático"], ["claro", "Claro"], ["oscuro", "Oscuro"]];
  const temaActual = () => ({ modo: "", color: "", ...(B.datos.extra.tema || {}) });
  const misInsignias = () => Object.keys(B.datos.extra.insignias || {}).length;
  function aplicarTema(t) {
    const raiz = document.documentElement;
    if (t.modo) raiz.dataset.tema = t.modo; else delete raiz.dataset.tema;
    if (t.color) raiz.style.setProperty("--acento", t.color); else raiz.style.removeProperty("--acento");
    // La barra de estado del móvil, a juego con el fondo
    $$('meta[name="theme-color"]').forEach((m) => (m.content = t.modo ? (t.modo === "oscuro" ? "#000000" : "#f2f2f7") : (m.media.includes("dark") ? "#000000" : "#f2f2f7")));
    try { localStorage.setItem("bolsillo.tema", JSON.stringify(t)); } catch {}
  }
  function pintarApariencia() {
    const t = temaActual(), tengo = misInsignias();
    $("#apariencia").innerHTML = `<div class="campo" style="display:block;padding:12px 16px">
        <div class="segmento tres" role="group" aria-label="Modo">${MODOS.map(([id, nombre]) => `<button data-modo="${id}" aria-pressed="${t.modo === id}">${nombre}</button>`).join("")}</div></div>
      <div class="campo" style="display:block;padding:12px 16px 14px"><div class="etiqueta" style="margin-bottom:10px">Color</div>
        <div class="muestras">${COLORES.map((c) => { const cerrado = c.insignias && tengo < c.insignias, elegido = (t.color || COLORES[0].c) === c.c;
          return `<button class="muestra" data-color="${c.c}" style="--m:${c.c}" aria-pressed="${elegido}" aria-label="${c.nombre}${cerrado ? ` (se desbloquea con ${c.insignias} insignias)` : ""}" ${cerrado ? 'data-cerrado="1"' : ""}>${cerrado ? ico("lock-key") : elegido ? ico("check") : ""}</button>`; }).join("")}</div>
        <p class="nota-ajuste" style="margin:10px 0 0">${tengo >= 5 ? "Tienes el color Oro: es para quien consigue 5 insignias." : `El color Oro se desbloquea con 5 insignias (llevas ${tengo}).`}</p></div>`;
    $$("[data-modo]").forEach((b) => b.addEventListener("click", () => elegirTema({ modo: b.dataset.modo })));
    $$("[data-color]").forEach((b) => b.addEventListener("click", () => b.dataset.cerrado ? avisar(`Consigue ${5 - tengo} insignias más para desbloquear el Oro`) : elegirTema({ color: b.dataset.color === COLORES[0].c ? "" : b.dataset.color })));
  }
  function elegirTema(cambio) {
    const t = { ...temaActual(), ...cambio };
    B.setExtra("tema", t); aplicarTema(t); pintarApariencia();
  }
  $("#abrir-ajustes").addEventListener("click", pintarApariencia);
  // Si en otro móvil cambiaste el tema, al sincronizar se pone aquí también
  B.alSincronizar.push(() => { const t = temaActual(); let local = "{}"; try { local = localStorage.getItem("bolsillo.tema") || "{}"; } catch {} if (JSON.stringify(t) !== local && B.datos.extra.tema) aplicarTema(t); });

  // ============ Panel de uso: solo para el dueño de Bolsillo (el servidor lo comprueba con su clave) ============
  let esDueno = null;
  async function comprobarDueno() {
    if (!B.sync.clave) return ($("#fila-panel").hidden = true);
    if (esDueno === null) { try { esDueno = Boolean((await (await B.api("estado")).json()).dueno); } catch { return; } }
    $("#fila-panel").hidden = !esDueno;
  }
  $("#abrir-ajustes").addEventListener("click", comprobarDueno);
  const cifra = (n, texto) => `<div class="mini"><span class="etiqueta">${texto}</span><b class="num">${n}</b></div>`;
  async function pintarPanel() {
    const cuerpo = $("#panel-cuerpo");
    cuerpo.innerHTML = `<div class="vacio" style="padding:30px">Cargando…</div>`;
    try {
      const r = await B.api("uso?dias=7"), j = await r.json();
      if (!r.ok) throw new Error(j.error || "No se pudo cargar");
      const a = j.apuntes, max = Math.max(1, ...j.serie.map((d) => d.personas));
      cuerpo.innerHTML = `<p class="nota-ajuste" style="margin-top:0">Sin contar tu nube. Solo recuentos: nunca se ven importes ni tiendas de nadie.</p>
        <h4 class="titulo-grupo">Nubes</h4>
        <div class="panel-rejilla">${cifra(j.nubes.total, "En total")}${cifra(j.nubes.nuevas, "Nuevas esta semana")}${cifra(j.nubes.hoy, "Nuevas hoy")}${cifra(j.activas.hoy, "Activas hoy")}${cifra(j.activas.semana, "Activas 7 días")}${cifra(j.activas.mes, "Activas 30 días")}</div>
        <h4 class="titulo-grupo">Personas que apuntan · 14 días</h4>
        <div class="panel-grafica">${j.serie.map((d) => `<div title="${d.dia}: ${d.personas} personas, ${d.apuntes} apuntes"><span class="num">${d.personas || ""}</span><i style="height:calc(${(d.personas / max).toFixed(2)} * (100% - 32px))"></i><small>${Number(d.dia.slice(8))}</small></div>`).join("")}</div>
        <h4 class="titulo-grupo">Apuntes esta semana</h4>
        <div class="panel-rejilla">${cifra(a.n, "En total")}${cifra(a.personas, "Personas")}${cifra(a.app, "A mano")}${cifra(a.applepay, "Apple Pay")}${cifra(a.wallet, "Google Wallet")}${cifra(a.voz, "Con la voz")}</div>
        <h4 class="titulo-grupo">Funciones · personas</h4>
        <div class="panel-rejilla">${cifra(j.automatico.applepay, "Usan Apple Pay (30 d)")}${cifra(j.automatico.wallet, "Usan Wallet (30 d)")}${cifra(j.avisos, "Con avisos")}${cifra(j.grupos, "Grupos de gastos")}${cifra(`${j.duelos.activos}<small> / ${j.duelos.total}</small>`, "Duelos activos / total")}${cifra(`${j.circulos.n}<small> · ${j.circulos.miembros}</small>`, "Círculos · miembros")}${cifra(j.votantes, "Han votado")}</div>
        <p class="nota-ajuste">Los duelos y círculos te incluyen si estás en ellos. Las visitas a la web las ves en Cloudflare → Pages → bolsillo-app → Analíticas.</p>`;
    } catch (e) { cuerpo.innerHTML = `<div class="vacio" style="padding:30px">${esc(e.message === "Failed to fetch" ? "Sin conexión" : e.message)}</div>`; }
  }
  $("#abrir-panel").addEventListener("click", () => { B.cerrarHoja(); setTimeout(() => { B.abrirHoja($("#hoja-panel")); pintarPanel(); }, 250); });
  $("#refrescar-panel").addEventListener("click", pintarPanel);

  B.alPintar.push(() => { pintarEnMes(); evaluarRetos(); evaluarInsignias(); });
  B.alCambiarVista.push((v) => { if (v === "metas") pintarMetas(); if (v === "grupos") { pintarGrupos(); cargarGrupos(); cargarDuelos(); cargarCirculos(); } });
  B.alSincronizar.push(() => { if (!$("#vista-metas").hidden) pintarMetas(); });

  // Invitación: bolsillo…/?unirse=CODIGO
  const invitacion = new URLSearchParams(location.search).get("unirse");
  if (invitacion) { history.replaceState(null, "", location.pathname); B.irVista("grupos"); setTimeout(() => unirse(invitacion), 400); }
  // Invitación a un círculo: bolsillo…/?circulo=CODIGO
  const circuloInvitado = new URLSearchParams(location.search).get("circulo");
  if (circuloInvitado) { history.replaceState(null, "", location.pathname); B.irVista("grupos"); setTimeout(() => unirseCirculo(circuloInvitado), 400); }
  // Desde el aviso de un pago: bolsillo…/?cobro=ID
  const cobroAviso = new URLSearchParams(location.search).get("cobro");
  if (cobroAviso && B.sync.clave) { history.replaceState(null, "", location.pathname); setTimeout(() => abrirCobroDeAviso(cobroAviso), 400); }
  // Desde el recordatorio de un préstamo: bolsillo…/?prestamo=ID
  const prestamoAviso = new URLSearchParams(location.search).get("prestamo");
  if (prestamoAviso && B.sync.clave) { history.replaceState(null, "", location.pathname); setTimeout(() => abrirPrestamo(prestamoAviso), 400); }
  $("[data-abrir-prestamo]").addEventListener("click", () => { B.cerrarHoja(); setTimeout(() => nuevoPrestamo(), 260); });
  // Reto de un amigo: bolsillo…/?duelo=CODIGO
  const reto = new URLSearchParams(location.search).get("duelo");
  if (reto) { history.replaceState(null, "", location.pathname); B.irVista("grupos"); setTimeout(() => unirseDuelo(reto), 400); }
  if (B.sync.clave) { cargarGrupos(); cargarDuelos(); cargarCirculos(); }
  B.pintar();
  comprobarNovedades();
})();
