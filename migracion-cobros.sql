-- Cobros entre amigos de un grupo: enlace de cobro, «ya te he pagado», confirmación, toques y recordatorios.
-- npx wrangler@4 d1 execute bolsillo --remote --file=migracion-cobros.sql
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
