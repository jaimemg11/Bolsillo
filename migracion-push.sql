-- Avisos (notificaciones push): a qué móviles avisar de cada persona
CREATE TABLE IF NOT EXISTS push_subs (endpoint TEXT PRIMARY KEY, usuario TEXT NOT NULL, p256dh TEXT NOT NULL, auth TEXT NOT NULL, creado TEXT NOT NULL, ultimo_envio TEXT);
CREATE INDEX IF NOT EXISTS push_subs_usuario ON push_subs (usuario);
