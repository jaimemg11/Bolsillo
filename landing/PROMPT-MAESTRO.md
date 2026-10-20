# Prompt maestro: landing de Bolsillo

Instrucción única para construir o rehacer la página de presentación de Bolsillo. Si se pide un cambio de diseño, se cambia primero aquí y después el código.

## 1. Objetivo

> **Una oferta → un público → una acción: abrir Bolsillo gratis.**

- **Qué es:** app web de gastos para iPhone (también funciona en Android) que se instala desde Safari. Apunta sola los pagos con Apple Pay, sin dar acceso al banco ni pedir email.
- **Público:** estudiantes de 16 a 25 años en España que viven con una paga o un sueldo pequeño y a los que el dinero no les llega a fin de mes.
- **De dónde llegan:** de TikTok, Instagram o un enlace que les pasa un amigo. Saben poco: «una app para controlar gastos».
- **Objeciones:** «se me olvida apuntar» · «no quiero dar acceso a mi banco» · «otra app más que pide registrarse» · «¿y si la pierdo o cambio de móvil?».
- **Respuesta:** se apunta sola con Apple Pay · sin banco, sin email, sin anuncios · tu nube con una clave guardada en el llavero · gratis.
- **Conversión:** pulsar «Abrir Bolsillo gratis» (va a la app, `/`).

Todo el texto vive en `landing/datos.mjs`. `landing/build.mjs` genera las páginas en `public/`. Los supuestos van marcados `REVISAR`.

## 2. Estructura

1. **Nav isla flotante:** marca, enlaces (Cómo funciona, Funciones, Privacidad, Preguntas) y botón pequeño «Abrir app». En móvil, hamburguesa que se convierte en X y menú a pantalla completa con enlaces escalonados.
2. **Hero:** titular (resultado), subtítulo (cómo y para quién), CTA principal, señal de prueba con datos verificables (gratis · sin registro · sin acceso a tu banco) y dos capturas reales de la app en marcos de iPhone.
3. **Problema → solución:** por qué fallan las apps de gastos (se te olvida apuntar) y cómo lo resuelve Bolsillo.
4. **Funciones:** rejilla de 6 beneficios orientados a resultado, con icono Phosphor.
4b. **Categorías:** caja con las 8 categorías de la app (mismo icono y color) y cómo se eligen solas.
5. **Cómo funciona:** 3 pasos numerados.
6. **Frase reveladora:** palabra a palabra.
7. **Capturas:** Metas, Grupos y la tarjeta «Tu mes» para stories.
8. **Privacidad:** qué se guarda y qué no, con la reversión de riesgo (gratis, borras tu nube con un botón).
9. **Preguntas frecuentes:** 9, en acordeón accesible, con JSON-LD `FAQPage`.
10. **CTA final:** el mismo que el hero.
11. **Pie:** privacidad, aviso legal, enlace a la app.

Páginas extra: `/privacidad/`, `/aviso-legal/` y `404.html`.

## 3. Sistema visual

- **Tema oscuro.** Fondos solo `#000000`, `#181818`, `#1F1F1F` y `#272727`, siempre planos. Texto `#FFFFFF`, secundario `#9B9B9B`. Acento: el azul de la app, `#0A84FF`. Rojo y verde de la app solo para hablar de gasto e ingreso.
- **Tipografía:** Manrope (400, 500, 600 y 700), una sola familia, sin cursivas. Escala de la skill (12/16 … 72/1). `text-wrap: balance` en titulares y `pretty` en párrafos.
- **Titular del hero:** degradado de texto `#FFFFFF → #9B9B9B`, máximo 680 px, guardado como array de líneas y cada línea en bloque. Es el único degradado.
- **Espaciado:** 0, 2, 4, 8, 12, 16, 24, 32, 40, 48, 64, 80 y 96. Márgenes laterales de 16 (móvil), 24 (tablet) y 32 px (escritorio).
- **Radios:** 8, 12, 16, 24, 32 y full. Anidados: el marco del iPhone (radio 48, borde de 10) da imagen de radio 38.
- **Bordes:** en los cuatro lados o en ninguno: `1px rgba(255,255,255,.08)`.
- **Iconos:** Phosphor, en SVG dentro del HTML. Los de funciones, categorías y privacidad van como en la app: versión rellena, en blanco, sobre un «azulejo» de color sólido con un brillo suave y su sombra de color. Lo pidió el dueño para que la web se vea igual de premium que la app (manda sobre la regla de fondos planos). Los iconos de línea quedan para detalles pequeños (flechas, check de la prueba, acordeón).
- **Botón principal:** 16 px semibold, 12 × 24, radio full, azul con texto blanco. Hover más claro, active `scale(.98)` y foco visible.

## 4. Movimiento

- Curva única `cubic-bezier(0.32, 0.72, 0, 1)`, entre 700 y 900 ms.
- Apariciones al entrar en pantalla: `translateY(64px) + blur(12px) + opacity 0` → reposo, con IntersectionObserver. El hero no aparece animado.
- Frase reveladora: palabras al 30 % que se encienden al cruzar la línea del 55 %.
- Sin listeners de scroll sin limitar. `prefers-reduced-motion` lo anula todo.

## 5. Responsive

Móvil primero. El hero se apila (texto y luego capturas) por debajo de 1024 px, con el CTA visible en la primera pantalla a 360 × 640. Sin scroll horizontal en 360, 390, 768, 1024, 1440 ni 1920.

## 6. Texto

Español de España, de tú, cercano y concreto. Sin guiones dentro de las frases, sin muletillas de IA («descubre», «potencia», «eleva», «experiencia única»), sin exclamaciones ni cifras inventadas. **Sin testimonios**, porque aún no hay reales. La prueba son datos verificables del producto.

## 7. SEO

Indexable (oferta permanente). Title: «Bolsillo: la app de gastos que se apunta sola con Apple Pay». Meta descripción, canonical, Open Graph con imagen 1200 × 630, Twitter card, JSON-LD `SoftwareApplication` (gratis, FinanceApplication) y `FAQPage`, escritos en el HTML generado.

## 8. Accesibilidad

HTML semántico, `lang="es"`, enlace «Saltar al contenido» (visible al recibir foco, con `top`), `alt` en las capturas, acordeón con `<details>`, contraste AA y áreas táctiles de 44 px como mínimo.

## 9. Checklist

Ver la checklist final de la skill landing-definitiva. Lo que no se puede probar aquí (Safari en un iPhone real), se dice.
