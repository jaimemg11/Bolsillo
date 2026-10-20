-- Grupos (piso, viaje, amigos): gastos compartidos y quién debe a quién.
-- Un miembro puede ser alguien con Bolsillo (usuario) o solo un nombre (un amigo sin la app).
CREATE TABLE IF NOT EXISTS grupos (id TEXT PRIMARY KEY, nombre TEXT NOT NULL, codigo TEXT NOT NULL UNIQUE, creado TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS miembros (grupo TEXT NOT NULL, id TEXT NOT NULL, nombre TEXT NOT NULL, usuario TEXT, creado TEXT NOT NULL, PRIMARY KEY (grupo, id));
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
