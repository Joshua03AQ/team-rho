-- Córralo DESPUÉS de schema.sql y de crear las tres cuentas.
--   maria.torres@edertorres.com   / Demo123!   Gerencia
--   luis.navarro@edertorres.com   / Demo123!   Administración
--   ana.campos@edertorres.com     / Demo123!   Consulta técnica

insert into public.perfiles (id, nombre, rol, correo)
select id, 'María Torres', 'Gerencia'::public.rol_usuario, email
from auth.users where email = 'maria.torres@edertorres.com'
union all
select id, 'Luis Navarro', 'Administracion'::public.rol_usuario, email
from auth.users where email = 'luis.navarro@edertorres.com'
union all
select id, 'Ana Campos', 'ConsultaTecnica'::public.rol_usuario, email
from auth.users where email = 'ana.campos@edertorres.com'
on conflict (id) do update set nombre = excluded.nombre, rol = excluded.rol, correo = excluded.correo;

insert into public.clientes (id, razon, ambito, contacto, correo) values
  ('11111111-1111-1111-1111-111111111111', 'Ministerio de Transporte e Infraestructura', 'Publico'::public.ambito, 'Lic. Ana Pérez', 'ana.perez@mti.gob.ni'),
  ('22222222-2222-2222-2222-222222222222', 'Cliente del Pacífico', 'Privado'::public.ambito, 'Ing. Rosa Mena', 'rosa@pacifico.demo'),
  ('33333333-3333-3333-3333-333333333333', 'Servicios del Norte', 'Privado'::public.ambito, 'Carlos Ruiz', 'cruiz@norte.demo'),
  ('44444444-4444-4444-4444-444444444444', 'Comercial Central', 'Privado'::public.ambito, 'Elena Mora', 'elena@central.demo')
on conflict (id) do nothing;

insert into public.expedientes (
  id, codigo, nombre, cliente_id, anio, tipo, ambito, ubicacion, estado, responsable_id, fecha_estado, motivo
)
select
  'e1000001-0000-0000-0000-000000000001'::uuid,
  'EXP-2026-018',
  'Ampliación de oficinas',
  '22222222-2222-2222-2222-222222222222'::uuid,
  2026,
  'Licitacion'::public.tipo_expediente,
  'Privado'::public.ambito,
  'Managua',
  'EnPreparacion'::public.estado_expediente,
  (select id from public.perfiles where rol = 'Administracion' limit 1),
  now() - interval '2 days',
  ''
union all
select
  'e1000001-0000-0000-0000-000000000002'::uuid,
  'EXP-2026-017',
  'Mejora de instalaciones',
  '33333333-3333-3333-3333-333333333333'::uuid,
  2026,
  'Propuesta'::public.tipo_expediente,
  'Privado'::public.ambito,
  'León',
  'Presentada'::public.estado_expediente,
  (select id from public.perfiles where rol = 'Gerencia' limit 1),
  now() - interval '6 days',
  ''
union all
select
  'e1000001-0000-0000-0000-000000000003'::uuid,
  'EXP-2026-016',
  'Remodelación de bodega',
  '44444444-4444-4444-4444-444444444444'::uuid,
  2026,
  'Licitacion'::public.tipo_expediente,
  'Privado'::public.ambito,
  'Masaya',
  'Ganada'::public.estado_expediente,
  (select id from public.perfiles where rol = 'Gerencia' limit 1),
  now() - interval '12 days',
  'Oferta adjudicada'
union all
select
  'e1000001-0000-0000-0000-000000000004'::uuid,
  'LIC-2026-001',
  'Carretera Norte, tramo 2',
  '11111111-1111-1111-1111-111111111111'::uuid,
  2026,
  'Licitacion'::public.tipo_expediente,
  'Publico'::public.ambito,
  'Managua',
  'Presentada'::public.estado_expediente,
  (select id from public.perfiles where rol = 'Administracion' limit 1),
  now() - interval '4 days',
  ''
on conflict (id) do nothing;

insert into public.expediente_accesos (expediente_id, user_id)
select e.id, p.id
from public.expedientes e
join public.perfiles p on p.rol = 'ConsultaTecnica'
where e.codigo in ('EXP-2026-018', 'EXP-2026-016', 'LIC-2026-001')
on conflict do nothing;

insert into public.legales (tipo, numero, hasta, emision) values
  ('Solvencia municipal', 'SM-2026-02', now() + interval '5 days', now() - interval '40 days'),
  ('RUC', 'J0310000000001', now() + interval '220 days', now() - interval '140 days'),
  ('Constancia INSS', 'INSS-123456', now() + interval '12 days', now() - interval '20 days');
