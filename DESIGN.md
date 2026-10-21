---
version: 1
name: Bolsillo
description: |
  La app de gastos para estudiantes, hecha para sentirse como una app más del iPhone:
  fondo gris claro de iOS (o negro de verdad en oscuro), tarjetas blancas con esquinas
  redondeadas, la letra del sistema y un solo color de acento (el azul, o el que elijas
  en Apariencia). El color va en los datos (las categorías, tu gasto, lo que te pasas),
  no en los marcos.

colors:            # modo claro · modo oscuro
  fondo:           "#f2f2f7 · #000000"
  tarjeta:         "#ffffff · #1c1c1e"
  texto:           "#000000 · #ffffff"
  suave:           "#6c6c70 · #98989f"   # textos secundarios (4,5:1 o más)
  tenue:           "#aeaeb2 · #636366"   # solo marcas y adornos, nunca texto que haya que leer
  linea:           "rgba(60,60,67,.14) · rgba(84,84,88,.5)"
  relleno:         "rgba(118,118,128,.12) · rgba(118,118,128,.24)"   # fondo de controles
  acento:          "#0066d6 · #0a84ff"   # texto y marcas en color
  acento-fondo:    "#0066d6 · #0066d6"   # botones con letra blanca (5,4:1)
  verde:           "#1f7a35 · #30d158"   # ingresos, hecho, en paz
  rojo:            "#d70015 · #ff453a"   # te pasas, borrar, debes
  aviso:           "#ff9f0a"             # cerca del límite (85 %)

categorias:        # el color de cada categoría es su identidad: es el mismo en la lista, la barra y el icono
  comida: "#ff9500"
  super: "#30b0c7"
  transporte: "#007aff"
  ocio: "#af52de"
  ropa: "#ff2d55"
  subs: "#5856d6"
  estudios: "#28a745"
  otros: "#8e8e93"

typography:
  familia: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, sans-serif"
  titulo-pantalla: "34px / 700 / -0.02em"   # «Octubre», «Amigos» (el título grande de iOS)
  cifra-principal: "44px / 700"             # lo gastado, en el resumen
  seccion: "20px / 700"                     # «En qué se va», «Préstamos»
  cuerpo: "17px / 1.35"
  fila-sub: "13-15px, suave"
  pequeño: "12px, suave"                    # ejes de gráficos, leyendas
  minimo: "11px"                            # nada que se lea por debajo
  cifras: "font-variant-numeric: tabular-nums (clase .num)"

radius:
  control: 7-12px       # segmentos (9px el marco, 7px la opción), botones y campos (10-12px)
  tarjeta: 16px         # .grupo, banners, retos
  resumen: 20px         # la tarjeta grande del mes
  hoja: 14px arriba     # las hojas que suben desde abajo
  circulo: 50%          # el botón +, los puntos

spacing:
  margen: 16px
  entre-tarjetas: 12px
  fila: "11px 16px (mínimo 44-48px de alto para el dedo)"
  antes-de-seccion: 28px

motion:
  curva: "cubic-bezier(.2, .8, .2, 1)"
  hojas: 400ms
  filas: 250ms
  reducido: "con prefers-reduced-motion no se mueve nada"
---

# Bolsillo · sistema de diseño

Este archivo describe cómo es Bolsillo por dentro para que todo lo nuevo encaje con lo que ya hay.
Los valores de arriba son los que usa `public/index.html` (variables de `:root`); si cambias uno allí,
cámbialo aquí. La landing (`public/conoce/`) tiene su propio estilo, oscuro y más grande, con la misma
letra de marca (Manrope) y el mismo azul.

## La idea

Bolsillo se tiene que sentir como una app del iPhone que ya conoces: Ajustes, Salud, Cartera. Por eso
copia sus costumbres (título grande, tarjetas agrupadas, hojas que suben desde abajo, iconos de
colores en las categorías) y no inventa otras. Lo propio de Bolsillo está en los datos: cuánto te
queda, a qué ritmo vas y en qué se te va.

## Colores

- **Un solo acento.** El azul (o el color que elija cada persona en Apariencia) va en lo que se puede
  tocar y en tus datos: el botón +, los enlaces, tu línea en el gráfico. No en los marcos.
- **El color de las categorías es su nombre.** Comida siempre es naranja, en la lista, en «En qué se
  va» y en el icono. No se reutiliza para otra cosa.
- **Verde y rojo dicen bien o mal**, nunca «sube» o «baja»: verde para ingresos y lo que está hecho,
  rojo para lo que te pasas o debes. Un cero va en gris.
- **Todo texto se lee a 4,5:1 o más.** Por eso en claro el azul es `#0066d6` (el de iOS, `#0a84ff`,
  se lee mal sobre blanco). Los colores de Apariencia se ajustan solos (`window.ponerColor`).
- **Modo oscuro de verdad:** negro `#000` y tarjetas `#1c1c1e`, como iOS. Nada de azul marino.

## Tipografía

La letra del sistema (San Francisco en el iPhone). Tres tamaños hacen casi todo el trabajo: el título
de la pantalla (34px), la cifra principal (44px) y el cuerpo (17px). Las cifras llevan `.num` para que
los dígitos midan lo mismo y las columnas cuadren. Nada que haya que leer baja de 11px.

## Piezas

| Pieza | Clase | Cuándo |
| --- | --- | --- |
| Tarjeta agrupada | `.grupo` con `.fila` dentro | Cualquier lista: gastos, categorías, ajustes. Las filas se separan con una línea fina que empieza después del icono. |
| Fila | `.fila` | Icono a la izquierda, título y subtítulo en medio, cifra o `›` a la derecha. Mínimo 44px de alto. |
| Icono de categoría | `.icono` con `--c` | Blanco sobre el color de la categoría, 12px de radio. Solo para categorías y tipos (Apple Pay, préstamo…). |
| Resumen | `.resumen` | Una por pantalla: la respuesta a «¿cuánto me queda?». |
| Barra | `.barra` | Una proporción real (lo gastado de tu presupuesto). Azul, naranja al 85 %, rojo al pasarte. |
| Gráfico del ritmo | `.ritmo` | Lo que llevas (línea de acento) frente al ritmo para llegar justo (gris discontinua). Con su frase: a dónde llegarías. |
| Segmento | `.segmento` | Elegir entre 2-3 opciones (Mes / Semana, Gasto / Ingreso). |
| Botones | `.boton-azul`, `.boton-gris` | Uno principal por hoja. El rojo (`.rojo`) solo para borrar. |
| Hoja | `.hoja` | Todo lo que se rellena o se configura sube desde abajo, con Cancelar y Guardar arriba. |
| Banner | `.banner` | Un aviso del momento (se renueva Spotify, te deben dinero). Se puede quitar con ×. |
| Primeros pasos | `.primeros-pasos` | Solo a quien empieza: lo que le falta, con su progreso real. |
| Aviso | `#aviso` | Lo que acaba de pasar («Apuntado», «Copiado»), abajo, unos segundos. Se lee en voz alta. |

## Reglas que no se rompen

1. **Sin degradados, brillos ni cristal.** Colores lisos. La sombra solo en lo que flota (el botón +,
   los avisos, la celebración de una insignia).
2. **Todo se puede tocar con el dedo:** 44px de alto como mínimo; la fila entera, no solo su texto.
3. **Se puede ampliar con dos dedos** y se ve dónde estás con el teclado (`:focus-visible`).
4. **Cada pantalla responde primero a una pregunta.** Mes: ¿cuánto me queda? Amigos: ¿quién debe a
   quién? Metas: ¿cómo voy con mis retos y huchas?
5. **Pantallas vacías con salida:** una frase de qué hacer y el botón para hacerlo, donde luego
   aparecerán los datos.
6. **Los números cuadran:** un total es la suma de lo que se ve, y una comparación dice con qué se
   compara («que en septiembre a estas alturas»).
7. **Las etiquetas de la página (`<html>`) no se llaman como las de los botones.** `data-color` es de
   los círculos de Apariencia; la página usa `data-acento-propio`. Si se confunden, cualquier toque
   cambia el color (pasó el 21 de octubre de 2026).
8. **Todo en español y de tú.** Frases cortas que dicen qué hacer, no qué ha fallado por dentro.

## Antes de publicar

`npm test` prueba el servidor y la app en un navegador de verdad, pulsando como una persona (colores,
deslizar para borrar, el gráfico, los primeros pasos). Si sale un «FALLO», no se publica.
