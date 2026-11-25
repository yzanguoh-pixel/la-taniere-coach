-- La Tanière Coach — 0025 : heures de séances encadrées sans aucun chevauchement
-- (séances d'1 h, heures toutes différentes, hors créneaux de bilan 10:00, 12:30, 18:00, 19:00).
do $$
begin
  execute replace(pg_get_functiondef('public.demo_presentiel()'::regprocedure),
    $a$values (1, '07:00'), (2, '12:00'), (3, '18:00'), (4, '19:00'), (5, '17:00'),
           (6, '08:00'), (7, '12:45'), (8, '20:00'), (9, '09:30'), (10, '13:45')$a$,
    $b$values (1, '07:00'), (2, '08:00'), (3, '09:00'), (4, '11:00'), (5, '17:00'),
           (6, '13:30'), (7, '14:30'), (8, '15:30'), (9, '20:00'), (10, '06:30')$b$);
end $$;
select public.demo_presentiel();
