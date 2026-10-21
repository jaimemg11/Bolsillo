-- De dónde sale cada movimiento (efectivo o la cuenta del banco), para los saldos de «Tu dinero».
-- Se ejecuta una vez, ANTES de publicar el servidor nuevo:
--   npx -y wrangler@4 d1 execute bolsillo --remote --file migracion-donde.sql
ALTER TABLE movs ADD COLUMN donde TEXT;
-- Lo pagado con el móvil y los fijos salen de la cuenta
UPDATE movs SET donde = 'banco' WHERE origen IN ('applepay', 'wallet', 'fijo');
