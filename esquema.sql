-- Esquema actual de Bolsillo (D1). Cada persona es un usuario identificado por el hash SHA-256 de su clave (sin email).
-- Los borrados se quedan marcados (borrado = 1) para que el borrado llegue a todos los dispositivos.
-- servido = hora del servidor (ms) del último cambio: la app pide "lo que ha cambiado desde X".
CREATE TABLE IF NOT EXISTS usuarios (id TEXT PRIMARY KEY, clave_hash TEXT NOT NULL UNIQUE, creado TEXT NOT NULL, ultimo_uso TEXT);
CREATE TABLE IF NOT EXISTS registros (ip_hash TEXT NOT NULL, cuando INTEGER NOT NULL); -- límite de nubes nuevas por IP
CREATE INDEX IF NOT EXISTS registros_ip ON registros (ip_hash, cuando);
CREATE TABLE IF NOT EXISTS movs (
  usuario TEXT NOT NULL, id TEXT NOT NULL, tipo TEXT NOT NULL, cat TEXT NOT NULL,
  importe INTEGER NOT NULL,           -- céntimos
  nota TEXT NOT NULL DEFAULT '', fecha TEXT NOT NULL, creado TEXT NOT NULL, actualizado TEXT NOT NULL,
  borrado INTEGER NOT NULL DEFAULT 0, origen TEXT NOT NULL DEFAULT 'app', servido INTEGER NOT NULL,
  donde TEXT,                         -- de dónde sale: 'efectivo' o 'banco' (NULL: sin decir)
  PRIMARY KEY (usuario, id)
);
CREATE INDEX IF NOT EXISTS movs_usuario_servido ON movs (usuario, servido);
CREATE TABLE IF NOT EXISTS ajustes (usuario TEXT NOT NULL, clave TEXT NOT NULL, valor TEXT, actualizado TEXT NOT NULL, servido INTEGER NOT NULL, PRIMARY KEY (usuario, clave));
-- Grupos (piso, viaje, amigos): gastos compartidos y quién debe a quién.
-- Un miembro puede ser alguien con Bolsillo (usuario) o solo un nombre (un amigo sin la app).
CREATE TABLE IF NOT EXISTS grupos (id TEXT PRIMARY KEY, nombre TEXT NOT NULL, codigo TEXT NOT NULL UNIQUE, creado TEXT NOT NULL, tipo TEXT NOT NULL DEFAULT 'grupo'); -- tipo: grupo o prestamo (dos personas)
CREATE TABLE IF NOT EXISTS miembros (grupo TEXT NOT NULL, id TEXT NOT NULL, nombre TEXT NOT NULL, usuario TEXT, creado TEXT NOT NULL, recordado TEXT, recordatorios INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (grupo, id));
CREATE INDEX IF NOT EXISTS miembros_usuario ON miembros (usuario);
CREATE TABLE IF NOT EXISTS gastos_grupo (
  grupo TEXT NOT NULL, id TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'gasto',  -- 'gasto' o 'pago' (cuando alguien salda una deuda)
  pagador TEXT NOT NULL,               -- id del miembro que pagó
  importe INTEGER NOT NULL,            -- céntimos
  concepto TEXT NOT NULL DEFAULT '',
  reparto TEXT NOT NULL,               -- JSON { miembro: céntimos } que suma el importe
  fecha TEXT NOT NULL, creado TEXT NOT NULL, autor TEXT,
  borrado INTEGER NOT NULL DEFAULT 0, servido INTEGER NOT NULL,
  PRIMARY KEY (grupo, id)
);
-- Avisos (notificaciones push): a qué móviles avisar de cada persona
CREATE TABLE IF NOT EXISTS push_subs (endpoint TEXT PRIMARY KEY, usuario TEXT NOT NULL, p256dh TEXT NOT NULL, auth TEXT NOT NULL, creado TEXT NOT NULL, ultimo_envio TEXT);
CREATE INDEX IF NOT EXISTS push_subs_usuario ON push_subs (usuario);
-- Duelos entre amigos: gana quien gasta menos porcentaje de su presupuesto. Nadie ve los euros de nadie.
CREATE TABLE IF NOT EXISTS duelos (
  id TEXT PRIMARY KEY, nombre TEXT NOT NULL, codigo TEXT NOT NULL UNIQUE,
  tipo TEXT NOT NULL,                  -- 'semana' (7 días) o 'mes' (30 días)
  inicio TEXT NOT NULL, fin TEXT NOT NULL, pacto TEXT NOT NULL DEFAULT '',
  creador TEXT NOT NULL, creado TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'activo', -- 'activo' o 'terminado'
  ganador TEXT,                        -- usuario ganador (NULL si empate o sin ganador)
  resultado TEXT                       -- marcador final congelado (JSON)
);
CREATE TABLE IF NOT EXISTS duelo_miembros (
  duelo TEXT NOT NULL, usuario TEXT NOT NULL, nombre TEXT NOT NULL,
  presupuesto INTEGER NOT NULL,        -- su presupuesto al unirse (para que no lo suba a mitad de duelo)
  unido TEXT NOT NULL, PRIMARY KEY (duelo, usuario)
);
CREATE INDEX IF NOT EXISTS duelo_miembros_usuario ON duelo_miembros (usuario);
-- Encuesta de la hoja de ruta: votos («Lo quiero») y sugerencias (solo las ve el dueño)
CREATE TABLE IF NOT EXISTS ideas_votos (idea TEXT NOT NULL, votante TEXT NOT NULL, creado TEXT NOT NULL, PRIMARY KEY (idea, votante));
CREATE TABLE IF NOT EXISTS sugerencias (id TEXT PRIMARY KEY, texto TEXT NOT NULL, votante TEXT NOT NULL, ip_hash TEXT NOT NULL, creado TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS limites (ip_hash TEXT NOT NULL, accion TEXT NOT NULL, cuando INTEGER NOT NULL); -- para frenar a quien vota o sugiere sin parar
CREATE INDEX IF NOT EXISTS limites_ip ON limites (ip_hash, accion, cuando);
-- Modo tóxico: círculos de confianza (máx. 8) donde cada uno elige cuánto enseña.
-- nivel: 'light' (total del mes y categorías) · 'medio' (cada gasto con tienda e importe, sin notas propias) · 'total' (todo, notas incluidas)
CREATE TABLE IF NOT EXISTS circulos (id TEXT PRIMARY KEY, nombre TEXT NOT NULL, codigo TEXT NOT NULL UNIQUE, creador TEXT NOT NULL, creado TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS circulo_miembros (circulo TEXT NOT NULL, usuario TEXT NOT NULL, id TEXT NOT NULL, nombre TEXT NOT NULL, nivel TEXT NOT NULL, unido TEXT NOT NULL, PRIMARY KEY (circulo, usuario));
CREATE INDEX IF NOT EXISTS circulo_miembros_usuario ON circulo_miembros (usuario);
-- Una reacción por persona y gasto (si cambia de emoji, se sustituye)
CREATE TABLE IF NOT EXISTS reacciones (circulo TEXT NOT NULL, autor TEXT NOT NULL, mov TEXT NOT NULL, reactor TEXT NOT NULL, emoji TEXT NOT NULL, creado TEXT NOT NULL, PRIMARY KEY (circulo, autor, mov, reactor));

-- Cobros entre amigos de un grupo: enlace de cobro, «ya te he pagado», confirmación, toques y recordatorios.
CREATE TABLE IF NOT EXISTS cobro_datos (       -- cómo quiere cobrar cada persona (lo ve quien le debe dinero)
  usuario TEXT PRIMARY KEY, bizum TEXT, paypal TEXT, revolut TEXT, actualizado TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS cobros (
  id TEXT PRIMARY KEY,                         -- va en el enlace corto /c/<id>
  grupo TEXT NOT NULL, de TEXT NOT NULL, a TEXT NOT NULL, -- ids de miembro: «de» le debe a «a»
  importe INTEGER NOT NULL,                    -- céntimos
  estado TEXT NOT NULL DEFAULT 'pendiente',    -- 'pendiente' → 'pagado' (dice que ha pagado) → 'confirmado'
  metodo TEXT,                                 -- bizum, paypal, revolut, efectivo, otro
  creado TEXT NOT NULL, actualizado TEXT NOT NULL,
  avisos INTEGER NOT NULL DEFAULT 0,           -- recordatorios automáticos enviados (como mucho 3)
  ultimo_aviso TEXT, ultimo_toque TEXT
);
CREATE INDEX IF NOT EXISTS cobros_grupo ON cobros (grupo, estado);
CREATE INDEX IF NOT EXISTS cobros_estado ON cobros (estado, actualizado);
