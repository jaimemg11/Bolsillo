// Encuesta de la hoja de ruta (página de Novedades): votar ideas con «Lo quiero» y mandar sugerencias.
// Si en este navegador está la app con su nube, se vota con ella (un voto por nube); si no, con un id aleatorio del navegador.
(() => {
  "use strict";
  const lista = document.getElementById("ideas");
  if (!lista) return;
  const nuevoId = () => (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2) + Date.now()).replace(/-/g, "");
  let votante, clave = null;
  try { votante = localStorage.getItem("bolsillo.votante") || nuevoId(); localStorage.setItem("bolsillo.votante", votante); } catch { votante = nuevoId(); }
  try { clave = JSON.parse(localStorage.getItem("bolsillo.sync"))?.clave || null; } catch {}
  const cabeceras = { "Content-Type": "application/json", ...(clave ? { Authorization: "Bearer " + clave } : {}) };
  const MINIMO = 5; // con menos votantes, mejor no enseñar un «1» que queda triste
  let votantes = 0;

  const boton = (id) => lista.querySelector(`[data-idea="${id}"]`);
  function pintarBoton(b, votos, mio) {
    b.setAttribute("aria-pressed", String(mio));
    b.dataset.n = votos;
    b.querySelector("[data-votos]").textContent = votantes >= MINIMO ? votos : mio ? "Votado" : "Lo quiero";
  }
  function pintar(j) {
    votantes = j.votantes;
    document.getElementById("votantes").textContent = votantes >= MINIMO ? `Ya han votado ${votantes} personas.` : "Sé de los primeros en votar.";
    for (const idea of j.ideas) {
      const b = boton(idea.id); if (!b) continue;
      pintarBoton(b, idea.votos, idea.mio);
      lista.append(b.closest("li")); // en el orden de votos que manda el servidor
    }
  }
  fetch(`/api/ideas?votante=${votante}`, { headers: cabeceras }).then((r) => r.json()).then(pintar).catch(() => {
    lista.querySelectorAll("[data-votos]").forEach((s) => (s.textContent = "Lo quiero"));
  });

  lista.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-idea]"); if (!b || b.disabled) return;
    const quitar = b.getAttribute("aria-pressed") === "true", antes = Number(b.dataset.n) || 0;
    pintarBoton(b, antes + (quitar ? -1 : 1), !quitar); // se ve al momento; luego manda el servidor
    b.disabled = true;
    try {
      const r = await fetch("/api/ideas/votar", { method: "POST", headers: cabeceras, body: JSON.stringify({ idea: b.dataset.idea, votante, quitar }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      pintarBoton(b, j.votos, j.mio);
    } catch (err) {
      pintarBoton(b, antes, quitar);
      document.getElementById("votantes").textContent = err.message || "No se ha podido votar. Prueba otra vez.";
    } finally { b.disabled = false; }
  });

  const form = document.getElementById("sugerir"), estado = document.getElementById("sugerir-estado");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = document.getElementById("sugerencia"), texto = input.value.trim();
    if (texto.length < 5) { estado.textContent = "Cuéntanos un poco más."; estado.dataset.tipo = "error"; return input.focus(); }
    const enviar = form.querySelector("button"); enviar.disabled = true; enviar.textContent = "Enviando…";
    try {
      const r = await fetch("/api/ideas/sugerir", { method: "POST", headers: cabeceras, body: JSON.stringify({ texto, votante }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      input.value = ""; estado.textContent = "Recibido. Gracias por ayudar a mejorar Bolsillo."; estado.dataset.tipo = "ok";
    } catch (err) { estado.textContent = err.message || "No se ha podido enviar. Prueba otra vez."; estado.dataset.tipo = "error"; }
    finally { enviar.disabled = false; enviar.textContent = "Enviar"; }
  });
})();
