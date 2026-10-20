-- Encuesta de la hoja de ruta: votos («Lo quiero») y sugerencias (solo las ve el dueño)
CREATE TABLE IF NOT EXISTS ideas_votos (idea TEXT NOT NULL, votante TEXT NOT NULL, creado TEXT NOT NULL, PRIMARY KEY (idea, votante));
CREATE TABLE IF NOT EXISTS sugerencias (id TEXT PRIMARY KEY, texto TEXT NOT NULL, votante TEXT NOT NULL, ip_hash TEXT NOT NULL, creado TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS limites (ip_hash TEXT NOT NULL, accion TEXT NOT NULL, cuando INTEGER NOT NULL); -- para frenar a quien vota o sugiere sin parar
CREATE INDEX IF NOT EXISTS limites_ip ON limites (ip_hash, accion, cuando);
