// Ideas de la hoja de ruta que se pueden votar. La usan la API (para validar votos), la página de Novedades y la app.
// Para añadir una idea: una línea aquí, `node landing/build.mjs` y desplegar. Si se hace realidad, se quita de aquí y se apunta en las versiones.
export const IDEAS = [
  { id: "horas", icono: "calendar-check", color: "#ff9500", titulo: "Apuntar tus horas", texto: "Si trabajas por horas, apuntas las que haces y Bolsillo calcula cuánto vas a cobrar." },
  { id: "tickets", icono: "scan", color: "#5856d6", titulo: "Escanear tickets", texto: "Haces una foto al ticket y se apuntan el importe, la tienda y la fecha." },
  { id: "semana-stories", icono: "camera", color: "#ff2d55", titulo: "Tu semana para stories", texto: "Como la tarjeta de tu mes, pero cada domingo: lo que has gastado y tu racha." },
  { id: "monedas", icono: "globe", color: "#30b0c7", titulo: "Monedas para viajes", texto: "Apunta en libras o dólares y Bolsillo lo pasa a euros." },
];
