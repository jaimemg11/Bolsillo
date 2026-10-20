// Todo el texto de la landing, la privacidad y el aviso legal de Bolsillo. Los componentes de build.mjs no llevan copy escrito a mano.

export const sitio = {
  nombre: "Bolsillo",
  urlApp: "https://bolsillo-app-9tz.pages.dev/",
  urlLanding: "https://bolsillo-app-9tz.pages.dev/conoce/",
  cta: "Abrir Bolsillo gratis",
  ctaCorto: "Abrir app",
  // Datos del responsable (obligatorios en el aviso legal y la privacidad)
  titular: "Jaime Morales García",
  email: "jaimemorr11@gmail.com",
  ciudad: "Sevilla",
  actualizado: "20 de octubre de 2026",
};

export const seo = {
  titulo: "Bolsillo: la app de gastos que se apunta sola al pagar con el móvil",
  descripcion: "Controla tus gastos sin acordarte de apuntarlos: pagas con Apple Pay o Google Wallet y Bolsillo lo apunta solo. Gratis, sin dar acceso a tu banco y sin email. Para iPhone y Android.",
};

export const hero = {
  titular: ["Tus gastos", "se apuntan solos"],
  subtitulo: "La app de gastos para estudiantes. Pagas con el móvil (Apple Pay o Google Wallet) y Bolsillo lo apunta, con su categoría. Sabes cuánto te queda hasta final de mes sin hacer nada.",
  prueba: ["Gratis", "iPhone y Android", "Sin registro ni email", "Sin acceso a tu banco"],
};

export const problema = {
  titulo: "Las apps de gastos fallan por lo mismo",
  texto: "Las descargas con ganas, apuntas tres días y al cuarto se te olvida. Las que lo apuntan solas te piden las claves de tu banco. Bolsillo hace lo primero sin lo segundo.",
};

export const funciones = [
  { icono: "lightning", color: "#ff9500", titulo: "Se apunta sola al pagar", texto: "Pagas en el súper con el móvil y aparece «−12,50 € · Súper (Mercadona)». Sin abrir la app. Con Apple Pay en iPhone y con Google Wallet en Android." },
  { icono: "lock-key", color: "#28a745", titulo: "Sin tu banco y sin email", texto: "No pide claves del banco, ni cuenta, ni datos personales. Tu nube va con una clave anónima." },
  { icono: "wallet", color: "#007aff", titulo: "Sabes cuánto puedes gastar hoy", texto: "Pones tu presupuesto y te dice lo que te queda y cuánto puedes gastar al día. También de paga a paga." },
  { icono: "users-three", color: "#5856d6", titulo: "Gastos de piso y de viaje", texto: "Apunta quién paga qué y Bolsillo calcula quién debe a quién, con el mínimo de pagos." },
  { icono: "bell", color: "#ff2d55", titulo: "Te avisa antes de que te cobren", texto: "Detecta las suscripciones que se repiten y te avisa el día antes de que se renueven." },
  { icono: "trophy", color: "#ffb800", titulo: "Retos, huchas e insignias", texto: "«Una semana sin delivery», una hucha para el portátil y tu racha de días. Ahorrar engancha." },
];

// Las categorías tal como salen en la app (mismo icono y color)
export const categorias = [
  { icono: "fork-knife", nombre: "Comida", color: "#ff9500" }, { icono: "shopping-cart-simple", nombre: "Súper", color: "#30b0c7" },
  { icono: "bus", nombre: "Transporte", color: "#007aff" }, { icono: "ticket", nombre: "Ocio", color: "#af52de" },
  { icono: "t-shirt", nombre: "Ropa", color: "#ff2d55" }, { icono: "arrows-clockwise", nombre: "Suscripciones", color: "#5856d6" },
  { icono: "graduation-cap", nombre: "Estudios", color: "#28a745" }, { icono: "package", nombre: "Otros", color: "#8e8e93" },
];
export const categoriasTexto = { titulo: "Cada gasto en su sitio", texto: "Bolsillo elige la categoría por ti, por la tienda o por lo que escribes. «Mercadona» va a Súper y «bus a clase» a Transporte." };

export const instalar = {
  titulo: "Instálala en tu móvil",
  texto: "No está en la App Store ni en Google Play: se instala desde el navegador en diez segundos y queda en tu pantalla de inicio como cualquier app, con su icono y funcionando sin conexión.",
  sistemas: [
    { id: "iphone", nombre: "iPhone", icono: "apple-logo", color: "#8e8e93", navegador: "Safari", boton: "Instalar en iPhone", nota: "Tiene que ser Safari: desde Chrome o Instagram en iPhone no sale la opción.", pasos: [
      { icono: "compass", color: "#0a84ff", texto: "Abre la app en <b>Safari</b>." },
      { icono: "export", color: "#0a84ff", texto: "Pulsa <b>Compartir</b> (el cuadrado con la flecha hacia arriba, abajo en el centro)." },
      { icono: "plus-square", color: "#0a84ff", texto: "Baja y elige <b>Añadir a pantalla de inicio</b> → <b>Añadir</b>." },
    ] },
    { id: "android", nombre: "Android", icono: "android-logo", color: "#30d158", navegador: "Chrome", boton: "Instalar en Android", nota: "Si la abres desde Instagram o WhatsApp, pulsa antes «Abrir en Chrome».", pasos: [
      { icono: "google-chrome-logo", color: "#30d158", texto: "Abre la app en <b>Chrome</b>." },
      { icono: "dots-three-vertical", color: "#30d158", texto: "Pulsa el menú <b>⋮</b> (arriba a la derecha)." },
      { icono: "download-simple", color: "#30d158", texto: "Elige <b>Instalar aplicación</b> (o <b>Añadir a pantalla de inicio</b>) → <b>Instalar</b>." },
    ] },
  ],
};

export const pasos = [
  { titulo: "Instálala en tu pantalla de inicio", texto: "En iPhone desde Safari y en Android desde Chrome, sin tiendas de apps. Arriba tienes los pasos." },
  { titulo: "Pon tu presupuesto y crea tu nube", texto: "Treinta segundos. Tu clave se guarda en el llavero de iCloud." },
  { titulo: "Conecta tus pagos y olvídate", texto: "En iPhone, un atajo le manda cada pago con Apple Pay. En Android, MacroDroid le pasa la notificación de Google Wallet. Tú solo miras cuánto te queda." },
];

export const frase = "Bolsillo no te pide tu banco, ni tu email, ni tu nombre. Solo te ayuda a que el dinero te dure hasta final de mes.";

export const capturas = [
  { img: "mes.webp", alt: "Pantalla Mes de Bolsillo: 100,08 € gastados de 250 €, cuánto queda y en qué se va", titulo: "Tu mes de un vistazo", texto: "Lo que llevas, lo que te queda y en qué se te va." },
  { img: "grupo.webp", alt: "Grupo Piso Triana en Bolsillo: saldos de cada persona y quién debe pagar a quién", titulo: "Cuentas claras en el piso", texto: "Cada uno ve lo mismo. Sin hojas de cálculo." },
  { img: "metas.webp", alt: "Pantalla Metas de Bolsillo: racha de 9 días, reto semana sin delivery y huchas", titulo: "Ahorrar como un juego", texto: "Rachas, retos que se comprueban solos y huchas." },
  { img: "tu-mes.webp", alt: "Tarjeta para stories «Mi mes en Bolsillo» con el total gastado, la categoría principal y la racha", titulo: "Tu mes, para stories", texto: "Una tarjeta con tu mes para compartir. Solo la imagen, nunca tus datos." },
];

export const privacidad = {
  titulo: "Tus datos son tuyos",
  puntos: [
    { icono: "eye-slash", color: "#5856d6", titulo: "No sabemos quién eres", texto: "Sin email, sin nombre, sin teléfono. Tu nube se identifica con una clave anónima." },
    { icono: "shield-check", color: "#28a745", titulo: "Nada de tu banco", texto: "Bolsillo nunca ve tu cuenta. Solo apunta el importe y la tienda de cada pago." },
    { icono: "trash", color: "#ff3b30", titulo: "Bórralo todo con un botón", texto: "«Borrar mi nube» elimina tus datos del servidor al momento. Sin correos ni formularios." },
  ],
  riesgo: "Gratis, sin anuncios y sin permanencia.",
};

export const faq = [
  { p: "¿Es gratis?", r: "Sí. Bolsillo es gratis y no tiene anuncios ni compras dentro de la app." },
  { p: "¿Funciona en Android?", r: "Sí. Ábrela en Chrome, pulsa el menú ⋮ (arriba a la derecha) y elige «Instalar aplicación» o «Añadir a pantalla de inicio». Queda como una app más, con su icono. Tienes todo: apuntar con un toque, la nube, los grupos, los duelos, el modo tóxico y las metas. Y también se apunta sola al pagar con Google Wallet, con la app gratuita MacroDroid." },
  { p: "¿Hay que descargarla de la App Store o de Google Play?", r: "No. Es una app web: en iPhone la abres en Safari y pulsas Compartir → Añadir a pantalla de inicio; en Android, en Chrome, menú ⋮ → Instalar aplicación. Queda como una app más, con su icono y funcionando sin conexión." },
  { p: "¿Cómo se apunta sola al pagar?", r: "En iPhone, con una automatización de la app Atajos: cada vez que pagas con Apple Pay, le manda a Bolsillo el importe y la tienda. En Android, la app gratuita MacroDroid le pasa a Bolsillo la notificación de pago de Google Wallet (o de la app de tu banco). Se configura una vez y Bolsillo te explica los pasos." },
  { p: "¿Tengo que dar acceso a mi banco?", r: "No. Bolsillo nunca se conecta a tu banco ni te pide sus claves. Solo recibe el importe y el nombre de la tienda de cada pago que haces con el móvil." },
  { p: "¿Cómo se pagan las deudas del piso o del viaje?", r: "En el grupo, Bolsillo calcula el mínimo de pagos para quedar en paz. Quien cobra manda un enlace por WhatsApp con su Bizum, PayPal o Revolut; quien paga lo abre (tenga o no la app), paga y pulsa «Ya te he pagado». Al confirmarlo, la deuda se salda sola. Bolsillo no mueve dinero: solo te lo pone fácil." },
  { p: "¿Qué pasa si cambio de móvil?", r: "Si tienes tu nube, abres Bolsillo en el móvil nuevo, pones tu clave y recuperas todo. Si la guardaste en el llavero de iCloud, el iPhone te la ofrece solo." },
  { p: "¿Y si pierdo la clave?", r: "Como no pedimos email, no hay forma de recuperarla. Por eso Bolsillo te propone guardarla en el llavero de iCloud nada más crear tu nube. Lo que tengas en el móvil no se pierde." },
  { p: "¿Puedo usarla con mis compañeros de piso o en un viaje?", r: "Sí. Creas un grupo, los demás entran con un código de seis letras y Bolsillo calcula quién debe a quién. Puedes añadir también a quien no tenga la app." },
  { p: "¿Cómo funcionan los duelos?", r: "Creas un duelo de una semana o un mes y tus amigos entran con un código. Gana quien gasta menos porcentaje de su presupuesto, y para contar hay que apuntar al menos la mitad de los días. Solo se comparten porcentajes: nadie ve tus euros. Lo que os juguéis (un café, unas pizzas) es cosa vuestra; en Bolsillo no se apuesta dinero." },
  { p: "¿Qué es el modo tóxico?", r: "Un círculo de confianza (máximo 8 personas) donde os veis los gastos y reaccionáis. Está apagado si no entras en uno, y cada persona elige cuánto enseña: Light (solo el total del mes y las categorías), Medio (cada gasto con su importe y la tienda, sin tus notas) o Tóxico total. Nunca se ven ingresos ni presupuestos, puedes ocultar un gasto concreto y, si te sales, dejan de verte al momento." },
  { p: "¿Dónde se guardan mis datos?", r: "En tu móvil y, si creas tu nube, en una base de datos de Cloudflare asociada a tu clave anónima. Puedes borrarlo todo cuando quieras desde Ajustes. Los detalles están en la política de privacidad." },
];

// ---------- Novedad destacada en la landing ----------
export const novedad = {
  etiqueta: "Nuevo",
  aviso: "Duelos con amigos",
  titulo: "Reta a tus amigos a ver quién gasta menos",
  texto: "Creas un duelo de una semana o un mes, le pasas el código a tu amigo y Bolsillo lleva el marcador. Gana quien gasta menos porcentaje de su presupuesto, así es justo aunque tengáis distinto dinero.",
  puntos: [
    { icono: "eye-slash", color: "#5856d6", texto: "Solo se comparten porcentajes. Nadie ve tus euros ni en qué gastas." },
    { icono: "handshake", color: "#ff9500", texto: "Os jugáis un pacto: un café, las pizzas del viernes… Bolsillo lo recuerda." },
    { icono: "trophy", color: "#ffb800", texto: "Trofeos, insignias de Campeón e Imbatible y tu victoria lista para stories." },
  ],
  img: "duelo.webp",
  alt: "Duelo «¿Quién gasta menos?» en Bolsillo: marcador con Álex primero al 54,2 %, Lucía al 68,9 % y Dani al 91,5 %, y el pacto de pagar las pizzas",
};

// ---------- Novedades: lo que trae cada versión (la más nueva arriba). Al añadir algo a la app, se apunta aquí. ----------
export const versiones = [
  { version: "2.7", fecha: "2026-10-20", titulo: "Si cobras cada semana", icono: "calendar-check", color: "#28a745", cambios: [
    "En Ajustes → Cobro ya puedes elegir «Cada jueves» (o el día de la semana que cobres).",
    "Las cuentas van de jueves a jueves: cuánto llevas, cuánto te queda y cuánto puedes gastar al día hasta que cobres.",
    "El presupuesto pasa a ser semanal, y se compara con lo que llevabas la semana pasada a estas alturas.",
    "Los límites por categoría y «¿Me lo puedo permitir?» también cuentan por semanas.",
  ] },
  { version: "2.6", fecha: "2026-10-20", titulo: "Préstamos entre amigos", icono: "handshake", color: "#ff9500", cambios: [
    "Apunta lo que le dejas a un amigo (o lo que te dejan) desde el botón +, en «Préstamo».",
    "No cuenta como gasto: es dinero que vuelve. En tu mes ves aparte «Te deben 20 € de préstamos».",
    "Si en una semana no te lo ha devuelto, te avisamos, y se lo cobras con el enlace de Bizum en un toque.",
    "Si tu amigo tiene Bolsillo, lo ve también desde su lado y le llegan tus toques.",
  ] },
  { version: "2.5", fecha: "2026-10-20", titulo: "Tu semana", icono: "calendar-check", color: "#5856d6", cambios: [
    "Resumen del domingo: cada domingo por la tarde, un aviso con lo que has gastado en la semana.",
    "Te dice si has gastado más o menos que la semana anterior y en qué se te fue más.",
    "Si no has apuntado nada, te lo recuerda por si se te ha olvidado algo.",
  ] },
  { version: "2.4", fecha: "2026-10-20", titulo: "¿Me lo puedo permitir?", icono: "gauge", color: "#ff9500", cambios: [
    "«¿Me lo puedo permitir?»: dices cuánto cuesta y te dice si te llega, contando lo que llevas y los fijos que te faltan.",
    "Si no te llega, te dice desde qué día podrás o cuánto apartar al mes, y te crea una hucha para ello.",
    "Límites por categoría (por ejemplo, 60 € al mes en Ocio), con la barra en naranja al acercarte y en rojo al pasarte.",
    "Al apuntar un gasto, o en el aviso de Apple Pay o Wallet, te avisa al llegar al 80 % del límite y si te pasas.",
    "Los avisos de los pagos automáticos ahora los manda Bolsillo, sin el aviso de Atajos.",
  ] },
  { version: "2.3", fecha: "2026-10-19", titulo: "Cobrar sin dar la chapa", icono: "handshake", color: "#28a745", cambios: [
    "Enlace de cobro para WhatsApp: «Lucía te pide 23,40 €», con tu Bizum, PayPal (con el importe ya puesto) y Revolut.",
    "«Ya te he pagado»: te llega un aviso, lo confirmas y la deuda se salda sola en el grupo.",
    "Dar un toque a quien te debe (normal o picante), como mucho uno al día; si no tiene la app, por WhatsApp.",
    "Si alguien se olvida, Bolsillo se lo recuerda cada 3 días (como mucho 3 veces).",
    "Para quedar en paz, el mínimo de pagos de verdad: menos bizums que antes en muchos grupos.",
  ] },
  { version: "2.2", fecha: "2026-10-19", titulo: "Fijos y comparación", icono: "calendar-check", color: "#5856d6", cambios: [
    "Gastos e ingresos fijos: el alquiler, el gimnasio, Spotify o tu paga se apuntan solos cada mes el día que toca.",
    "Bolsillo te propone hacer fijos los cobros que ve repetirse cada mes.",
    "En el mes, un aviso con los gastos fijos que aún faltan, para que el «te quedan» no engañe.",
    "Debajo del total: cuánto llevas más o menos que el mes pasado a estas alturas (o que tu paga anterior).",
  ] },
  { version: "2.1", fecha: "2026-10-19", titulo: "Tu Bolsillo, a tu gusto", icono: "paint-brush", color: "#af52de", cambios: [
    "Ajustes → Apariencia: modo claro, oscuro o el del móvil.",
    "Ocho colores para la app: azul, índigo, morado, rosa, naranja, verde, menta y oro.",
    "El Oro se desbloquea al conseguir 5 insignias.",
    "Tu tema se guarda en la nube: es el mismo en todos tus móviles.",
  ] },
  { version: "2.0", fecha: "2026-10-19", titulo: "Se apunta sola en Android", icono: "android-logo", color: "#30d158", cambios: [
    "Los pagos con Google Wallet se apuntan solos, igual que Apple Pay en iPhone, con la app gratuita MacroDroid.",
    "También vale la notificación de pago de la app de tu banco.",
    "Ajustes → «Pago automático», con los pasos para iPhone y para Android.",
    "Los gastos apuntados así llevan la etiqueta Wallet y cuentan para la insignia Piloto automático.",
  ] },
  { version: "1.9", fecha: "2026-10-19", titulo: "Instálala en Android", icono: "android-logo", color: "#34c759", cambios: [
    "En Android, Bolsillo te enseña cómo instalarla y, si Chrome lo permite, se instala con un botón.",
    "La web tiene una sección para instalarla, con botones «Instalar en iPhone» e «Instalar en Android».",
  ] },
  { version: "1.8", fecha: "2026-10-19", titulo: "Modo tóxico", icono: "eye", color: "#af52de", cambios: [
    "Círculos de confianza (máximo 8 personas) para ver los gastos de tu gente.",
    "Tres niveles: Light (solo totales), Medio (cada gasto sin tus notas) y Tóxico total.",
    "Reacciones 💀 😂 🔥 🤡, ranking de la vergüenza semanal y el momento del día.",
    "Oculta un gasto concreto o sal del círculo cuando quieras: dejan de verte al momento.",
  ] },
  { version: "1.7", fecha: "2026-10-19", titulo: "Tú decides lo que viene", icono: "thumbs-up", color: "#007aff", cambios: [
    "Vota las próximas funciones desde la app (Metas) o desde la página de Novedades.",
    "La hoja de ruta se ordena sola por votos: la más votada es la siguiente.",
    "Manda tus ideas al equipo con «¿Echas algo en falta?».",
  ] },
  { version: "1.6", fecha: "2026-10-19", titulo: "Duelos con amigos", icono: "sword", color: "#ff2d55", cambios: [
    "Duelos de una semana o un mes: gana quien gasta menos % de su presupuesto.",
    "Marcador en directo con medallas, pacto entre amigos y aviso al terminar.",
    "La pestaña Grupos pasa a llamarse Amigos: duelos y gastos compartidos juntos.",
    "Insignias nuevas: Campeón e Imbatible.",
  ] },
  { version: "1.5", fecha: "2026-10-19", titulo: "Nuevo diseño", icono: "paint-brush", color: "#af52de", cambios: [
    "Adiós a los emojis: iconos propios en cuadrados de color, como en los ajustes del iPhone.",
    "Insignias convertidas en medallas con brillo.",
    "Gasto en rojo e ingreso en verde al apuntar, para no confundirlos.",
    "Página de presentación, política de privacidad y aviso legal.",
  ] },
  { version: "1.4", fecha: "2026-10-19", titulo: "Más rápida y más cómoda", icono: "lightning", color: "#ff9500", cambios: [
    "Bienvenida de tres pasos la primera vez.",
    "Gastos habituales a un toque y categoría que se elige sola al escribir.",
    "Desliza un gasto para borrarlo y «Deshacer» en vez de preguntar.",
    "Buscador en todos los meses y filtro por categoría.",
    "Avisos en el móvil: renovaciones, racha en peligro y tu mes listo.",
    "Tu clave, guardable en el llavero de iCloud.",
  ] },
  { version: "1.3", fecha: "2026-10-19", titulo: "Amigos, metas y tu mes", icono: "medal", color: "#28a745", cambios: [
    "Grupos de gastos para el piso o un viaje: quién debe a quién.",
    "Tu mes en una tarjeta para stories.",
    "Retos, huchas, racha de días e insignias.",
    "Modo paga: las cuentas de paga a paga.",
    "Cobros que se repiten y apuntar con Siri o dos toques.",
  ] },
  { version: "1.2", fecha: "2026-10-19", titulo: "Tu nube, para todos", icono: "cloud-check", color: "#32ade6", cambios: [
    "Cualquiera puede crear su nube con una clave anónima, sin email.",
    "Recupera tus datos en otro móvil con tu clave.",
    "Borrar tu nube con un botón.",
  ] },
  { version: "1.1", fecha: "2026-10-19", titulo: "Apple Pay apunta solo", icono: "contactless-payment", color: "#1c1c1e", cambios: [
    "Cada pago con Apple Pay se apunta solo, con la categoría según la tienda.",
    "Sincronización en la nube: tus gastos a salvo aunque cambies de móvil.",
  ] },
  { version: "1.0", fecha: "2026-10-18", titulo: "Nace Bolsillo", icono: "rocket-launch", color: "#007aff", cambios: [
    "Apunta gastos e ingresos en dos segundos.",
    "Presupuesto mensual y cuánto puedes gastar al día.",
    "En qué se te va el dinero y gráfico de los últimos seis meses.",
    "Funciona sin conexión, con exportación a Excel y copia de seguridad.",
  ] },
];

// Ya decidido y en marcha (fuera de la votación)
export const enCamino = [];

// La hoja de ruta (ideas que se votan) vive en compartido/ideas.js: la comparten la web, la app y el servidor.
