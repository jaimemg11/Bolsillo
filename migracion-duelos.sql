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
