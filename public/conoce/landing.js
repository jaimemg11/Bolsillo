// Landing de Bolsillo: menú móvil, apariciones al entrar en pantalla, frase palabra a palabra y enlace activo en la nav.
(() => {
  "use strict";
  const reducido = matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.documentElement.classList.add("js");

  // Menú: la hamburguesa se convierte en X; Escape cierra
  const boton = document.querySelector(".nav__menu"), menu = document.getElementById("menu");
  if (boton && menu) {
    const abrir = (si) => {
      boton.setAttribute("aria-expanded", String(si)); boton.setAttribute("aria-label", si ? "Cerrar menú" : "Abrir menú");
      document.body.style.overflow = si ? "hidden" : "";
      if (si) { menu.hidden = false; requestAnimationFrame(() => requestAnimationFrame(() => menu.classList.add("abierto"))); }
      else { menu.classList.remove("abierto"); setTimeout(() => { if (boton.getAttribute("aria-expanded") === "false") menu.hidden = true; }, reducido ? 0 : 500); }
    };
    boton.addEventListener("click", () => abrir(boton.getAttribute("aria-expanded") !== "true"));
    menu.addEventListener("click", (e) => { if (e.target.closest("a")) abrir(false); });
    addEventListener("keydown", (e) => { if (e.key === "Escape" && boton.getAttribute("aria-expanded") === "true") { abrir(false); boton.focus(); } });
  }

  // Apariciones
  const aparecen = document.querySelectorAll(".aparece");
  if (reducido || !("IntersectionObserver" in window)) aparecen.forEach((el) => el.classList.add("visible"));
  else {
    const io = new IntersectionObserver((entradas) => entradas.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("visible"); io.unobserve(e.target); } }), { rootMargin: "0px 0px 15% 0px" }); // empieza un poco antes de entrar: al llegar ya se ve
    aparecen.forEach((el) => io.observe(el));
  }

  // Frase reveladora: cada palabra se enciende al cruzar la línea del 55 % de la pantalla
  const palabras = document.querySelectorAll(".frase__palabra");
  if (palabras.length && !reducido && "IntersectionObserver" in window) {
    const io = new IntersectionObserver((entradas) => {
      for (const e of entradas) {
        if (e.isIntersecting) e.target.classList.add("encendida");
        else if (e.rootBounds && e.boundingClientRect.top > e.rootBounds.bottom) e.target.classList.remove("encendida");
      }
    }, { rootMargin: "0px 0px -45% 0px", threshold: 1 });
    palabras.forEach((p) => io.observe(p));
  }

  // Enlace activo en la nav según la sección visible
  const enlaces = document.querySelectorAll("[data-espia]");
  const secciones = [...enlaces].map((a) => document.getElementById(a.dataset.espia)).filter(Boolean);
  if (secciones.length && "IntersectionObserver" in window) {
    const io = new IntersectionObserver((entradas) => entradas.forEach((e) => {
      if (!e.isIntersecting) return;
      enlaces.forEach((a) => (a.dataset.espia === e.target.id ? a.setAttribute("aria-current", "true") : a.removeAttribute("aria-current")));
    }), { rootMargin: "-40% 0px -55% 0px" });
    secciones.forEach((s) => io.observe(s));
  }

  // Instalar: se abre la pestaña de tu móvil (iPhone por defecto)
  const pestanas = [...document.querySelectorAll("[data-so]")];
  if (pestanas.length) {
    // En el móvil los dos sistemas van en fila: se desliza la fila y la ventana toma la altura del elegido
    const selector = document.querySelector(".instalar__selector"), ventana = document.querySelector(".instalar__ventana"), fila = document.querySelector(".instalar__rejilla");
    const movil = matchMedia("(max-width: 767px)");
    let activo = "iphone";
    const ajustarAltura = () => { ventana.style.height = movil.matches ? document.getElementById("so-" + activo).offsetHeight + "px" : ""; };
    const elegir = (id) => {
      activo = id;
      selector.dataset.activo = fila.dataset.activo = id;
      pestanas.forEach((b) => {
        const si = b.dataset.so === id, panel = document.getElementById("so-" + b.dataset.so);
        b.setAttribute("aria-selected", String(si));
        // El que no se ve no se puede tocar ni lo lee el lector de pantalla (en ordenador se ven los dos)
        panel.toggleAttribute("inert", !si && movil.matches);
        panel.setAttribute("aria-hidden", String(!si && movil.matches));
      });
      ajustarAltura();
    };
    pestanas.forEach((b) => b.addEventListener("click", () => elegir(b.dataset.so)));
    movil.addEventListener("change", () => elegir(activo));
    addEventListener("resize", ajustarAltura);
    // Si cambia el contenido (el texto de ayuda de los botones), la altura acompaña
    if ("ResizeObserver" in window) { const ro = new ResizeObserver(ajustarAltura); document.querySelectorAll(".instalar__so").forEach((p) => ro.observe(p)); }
    elegir(/Android/i.test(navigator.userAgent) ? "android" : "iphone");
  }

  // Botones de instalar. Android (Chrome): se instala desde aquí con el aviso del propio navegador.
  // iPhone: Apple no deja instalar con un botón, así que se abre la app en Safari con la guía en pantalla.
  let pedirInstalar = null;
  addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); pedirInstalar = e; });
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const android = /Android/i.test(ua);
  const dentroDeOtraApp = /Instagram|FBAN|FBAV|FB_IAB|TikTok|musical_ly|Snapchat|Twitter|LinkedInApp|; wv\)/i.test(ua);
  const safari = ios && !dentroDeOtraApp && !/CriOS|FxiOS|EdgiOS|OPiOS|GSA\//.test(ua);
  const APP = location.origin + "/?instalar=1";
  const ayuda = (so, texto) => { const p = document.querySelector(`[data-ayuda="${so}"]`); p.textContent = texto; p.hidden = false; };
  addEventListener("appinstalled", () => ayuda("android", "¡Listo! Bolsillo ya está en tu pantalla de inicio."));
  document.querySelectorAll("[data-instalar]").forEach((b) => b.addEventListener("click", async () => {
    if (b.dataset.instalar === "iphone") {
      if (!ios) return ayuda("iphone", "Abre esta página en tu iPhone, con Safari, y pulsa este botón.");
      if (!safari) { ayuda("iphone", "Abriendo Safari… Si no se abre, copia el enlace de esta página y pégalo en Safari."); location.href = "x-safari-" + APP; return; }
      location.href = APP;
      return;
    }
    if (pedirInstalar) {
      pedirInstalar.prompt();
      const { outcome } = await pedirInstalar.userChoice;
      pedirInstalar = null;
      if (outcome !== "accepted") ayuda("android", "Sin problema. Cuando quieras, vuelve a pulsar el botón o usa el menú ⋮ de Chrome.");
      return;
    }
    if (!android) return ayuda("android", "Abre esta página en tu Android, con Chrome, y pulsa este botón.");
    if (dentroDeOtraApp || !/Chrome\//.test(ua)) { location.href = "intent://" + location.host + "/?instalar=1#Intent;scheme=https;package=com.android.chrome;end"; return; }
    location.href = APP;
  }));
})();
