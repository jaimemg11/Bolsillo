-- Préstamos sueltos entre dos amigos: un grupo de tipo «prestamo» con dos miembros (tú y tu amigo)
ALTER TABLE grupos ADD COLUMN tipo TEXT NOT NULL DEFAULT 'grupo';
-- Recordatorio a cada uno de que hay un préstamo sin devolver: cuándo fue el último y cuántos lleva
ALTER TABLE miembros ADD COLUMN recordado TEXT;
ALTER TABLE miembros ADD COLUMN recordatorios INTEGER NOT NULL DEFAULT 0;
