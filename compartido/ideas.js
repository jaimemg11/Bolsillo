// Ideas de la hoja de ruta que se pueden votar. La usan la API (para validar votos), la página de Novedades y la app.
// Para añadir una idea: una línea aquí, `node landing/build.mjs` y desplegar. Si se hace realidad, se quita de aquí y se apunta en las versiones.
export const IDEAS = [
  { id: "limites", icono: "gauge", color: "#ff9500", titulo: "Límites por categoría", texto: "«Máximo 60 € en comida fuera», con su barra y un aviso al llegar al 80 %." },
  { id: "tickets", icono: "scan", color: "#5856d6", titulo: "Escanear tickets", texto: "Haces una foto al ticket y se apuntan el importe, la tienda y la fecha." },
  { id: "resumen-domingo", icono: "chart-pie-slice", color: "#28a745", titulo: "Resumen del domingo", texto: "Un aviso cada semana con lo que llevas y cómo vas respecto a la anterior." },
  { id: "monedas", icono: "globe", color: "#30b0c7", titulo: "Monedas para viajes", texto: "Apunta en libras o dólares y Bolsillo lo pasa a euros." },
];
