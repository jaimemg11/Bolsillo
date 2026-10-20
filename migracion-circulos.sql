-- Modo tóxico: círculos de confianza (máx. 8) donde cada uno elige cuánto enseña.
-- nivel: 'light' (total del mes y categorías) · 'medio' (cada gasto con tienda e importe, sin notas propias) · 'total' (todo, notas incluidas)
CREATE TABLE IF NOT EXISTS circulos (id TEXT PRIMARY KEY, nombre TEXT NOT NULL, codigo TEXT NOT NULL UNIQUE, creador TEXT NOT NULL, creado TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS circulo_miembros (circulo TEXT NOT NULL, usuario TEXT NOT NULL, id TEXT NOT NULL, nombre TEXT NOT NULL, nivel TEXT NOT NULL, unido TEXT NOT NULL, PRIMARY KEY (circulo, usuario));
CREATE INDEX IF NOT EXISTS circulo_miembros_usuario ON circulo_miembros (usuario);
-- Una reacción por persona y gasto (si cambia de emoji, se sustituye)
CREATE TABLE IF NOT EXISTS reacciones (circulo TEXT NOT NULL, autor TEXT NOT NULL, mov TEXT NOT NULL, reactor TEXT NOT NULL, emoji TEXT NOT NULL, creado TEXT NOT NULL, PRIMARY KEY (circulo, autor, mov, reactor));
