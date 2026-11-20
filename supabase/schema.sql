-- Team RHO · esquema
-- Pégalo en Supabase → SQL Editor → Run, una sola vez.
-- No guarda contraseñas. Esas viven en Authentication.

create extension if not exists pgcrypto;

create type public.rol_usuario as enum ('Gerencia', 'Administracion', 'ConsultaTecnica');
create type public.ambito as enum ('Publico', 'Privado');
create type public.tipo_expediente as enum ('Licitacion', 'Propuesta');
create type public.estado_expediente as enum (
  'Identificada', 'EnEvaluacion', 'EnPreparacion', 'Presentada', 'Ganada', 'Perdida', 'Descartada'
);
create type public.visibilidad_doc as enum ('Campo', 'Interna');

create table public.perfiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre text not null,
  rol public.rol_usuario not null,
  correo text,
  creado_en timestamptz not null default now()
);

create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  razon text not null,
  ambito public.ambito not null,
  contacto text not null,
  correo text not null,
  creado_en timestamptz not null default now()
);

create table public.expedientes (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nombre text not null,
  cliente_id uuid not null references public.clientes (id),
  anio int not null,
  tipo public.tipo_expediente not null,
  ambito public.ambito not null,
  ubicacion text not null default '',
  estado public.estado_expediente not null default 'Identificada',
  responsable_id uuid not null references public.perfiles (id),
  fecha_estado timestamptz not null default now(),
  motivo text not null default '',
  creado_en timestamptz not null default now()
);

create table public.expediente_accesos (
  expediente_id uuid not null references public.expedientes (id) on delete cascade,
  user_id uuid not null references public.perfiles (id) on delete cascade,
  primary key (expediente_id, user_id)
);

create table public.documentos (
  id uuid primary key default gen_random_uuid(),
  expediente_id uuid not null references public.expedientes (id) on delete cascade,
  nombre text not null,
  categoria text not null,
  visibilidad public.visibilidad_doc not null,
  unique (expediente_id, nombre)
);

create table public.versiones (
  id uuid primary key default gen_random_uuid(),
  documento_id uuid not null references public.documentos (id) on delete cascade,
  n int not null,
  archivo text not null,
  motivo text not null,
  fecha timestamptz not null default now(),
  autor_id uuid not null references public.perfiles (id),
  unique (documento_id, n)
);

create table public.presupuestos (
  id uuid primary key default gen_random_uuid(),
  expediente_id uuid not null references public.expedientes (id) on delete cascade,
  revision int not null,
  moneda text not null,
  materiales numeric not null default 0,
  mano numeric not null default 0,
  equipos numeric not null default 0,
  transporte numeric not null default 0,
  otros numeric not null default 0,
  aprobado boolean not null default false,
  fecha timestamptz not null default now(),
  unique (expediente_id, revision)
);

create table public.legales (
  id uuid primary key default gen_random_uuid(),
  tipo text not null,
  numero text not null,
  hasta timestamptz not null,
  emision timestamptz not null default now()
);

create table public.avisos (
  autor_id uuid references public.perfiles (id) on delete set null default auth.uid(),
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.perfiles (id) on delete cascade,
  texto text not null,
  fecha timestamptz not null default now(),
  leida boolean not null default false
);

create table public.auditoria (
  id uuid primary key default gen_random_uuid(),
  fecha timestamptz not null default now(),
  actor_id uuid not null references public.perfiles (id),
  accion text not null,
  recurso text not null
);

create table public.respaldos (
  id uuid primary key default gen_random_uuid(),
  fecha timestamptz not null default now(),
  nota text not null
);

create table public.transferencias (
  id uuid primary key default gen_random_uuid(),
  expediente_id uuid not null references public.expedientes (id) on delete cascade,
  fecha timestamptz not null default now(),
  estado text not null
);

-- El rol del usuario que está llamando. security definer evita el ciclo con las políticas.
create or replace function public.rol_actual()
returns public.rol_usuario
language sql
stable
security definer
set search_path = public
as $$
  select rol from public.perfiles where id = auth.uid()
$$;

create or replace function public.puede_ver_expediente(eid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.expedientes e
    where e.id = eid
      and (
        public.rol_actual() is distinct from 'ConsultaTecnica'
        or exists (
          select 1 from public.expediente_accesos a
          where a.expediente_id = e.id and a.user_id = auth.uid()
        )
      )
  );
$$;

-- Misma máquina de estados que la pantalla.
create or replace function public.validar_estado()
returns trigger
language plpgsql
as $$
begin
  if old.estado = new.estado then
    return new;
  end if;
  if not (
    (old.estado = 'Identificada' and new.estado in ('EnEvaluacion', 'Descartada')) or
    (old.estado = 'EnEvaluacion' and new.estado in ('EnPreparacion', 'Descartada')) or
    (old.estado = 'EnPreparacion' and new.estado in ('Presentada', 'Descartada')) or
    (old.estado = 'Presentada' and new.estado in ('Ganada', 'Perdida', 'Descartada'))
  ) then
    raise exception 'Transición no permitida';
  end if;
  if new.estado in ('Ganada', 'Perdida', 'Descartada') and length(trim(new.motivo)) < 4 then
    raise exception 'El motivo es obligatorio en un cierre';
  end if;
  new.fecha_estado = now();
  return new;
end;
$$;

create trigger expedientes_estado
before update on public.expedientes
for each row execute function public.validar_estado();

alter table public.perfiles enable row level security;
alter table public.clientes enable row level security;
alter table public.expedientes enable row level security;
alter table public.expediente_accesos enable row level security;
alter table public.documentos enable row level security;
alter table public.versiones enable row level security;
alter table public.presupuestos enable row level security;
alter table public.legales enable row level security;
alter table public.avisos enable row level security;
alter table public.auditoria enable row level security;
alter table public.respaldos enable row level security;
alter table public.transferencias enable row level security;

create policy perfiles_leer on public.perfiles
for select to authenticated using (true);

create policy perfiles_editar on public.perfiles
for update to authenticated
using (public.rol_actual() = 'Gerencia')
with check (public.rol_actual() = 'Gerencia');

create policy clientes_leer on public.clientes
for select to authenticated using (true);
create policy clientes_escribir on public.clientes
for all to authenticated
using (public.rol_actual() in ('Gerencia', 'Administracion'))
with check (public.rol_actual() in ('Gerencia', 'Administracion'));

create policy expedientes_leer on public.expedientes
for select to authenticated
using (public.puede_ver_expediente(id));
create policy expedientes_crear on public.expedientes
for insert to authenticated
with check (public.rol_actual() in ('Gerencia', 'Administracion'));
create policy expedientes_cambiar on public.expedientes
for update to authenticated
using (public.rol_actual() in ('Gerencia', 'Administracion') and public.puede_ver_expediente(id))
with check (public.rol_actual() in ('Gerencia', 'Administracion'));

create policy accesos_leer on public.expediente_accesos
for select to authenticated
using (public.puede_ver_expediente(expediente_id) or user_id = auth.uid());
create policy accesos_escribir on public.expediente_accesos
for all to authenticated
using (public.rol_actual() in ('Gerencia', 'Administracion'))
with check (public.rol_actual() in ('Gerencia', 'Administracion'));

create policy documentos_leer on public.documentos
for select to authenticated using (public.puede_ver_expediente(expediente_id));
create policy documentos_escribir on public.documentos
for all to authenticated
using (public.rol_actual() in ('Gerencia', 'Administracion'))
with check (public.rol_actual() in ('Gerencia', 'Administracion'));

create policy versiones_leer on public.versiones
for select to authenticated
using (exists (
  select 1 from public.documentos d
  where d.id = documento_id and public.puede_ver_expediente(d.expediente_id)
));
create policy versiones_escribir on public.versiones
for all to authenticated
using (public.rol_actual() in ('Gerencia', 'Administracion'))
with check (public.rol_actual() in ('Gerencia', 'Administracion'));

create policy presupuestos_leer on public.presupuestos
for select to authenticated using (public.puede_ver_expediente(expediente_id));
create policy presupuestos_escribir on public.presupuestos
for all to authenticated
using (public.rol_actual() in ('Gerencia', 'Administracion'))
with check (public.rol_actual() in ('Gerencia', 'Administracion'));

create policy legales_leer on public.legales for select to authenticated using (true);
create policy legales_escribir on public.legales
for all to authenticated
using (public.rol_actual() in ('Gerencia', 'Administracion'))
with check (public.rol_actual() in ('Gerencia', 'Administracion'));

create policy avisos_leer on public.avisos
for select to authenticated
using (user_id = auth.uid() or autor_id = auth.uid() or public.rol_actual() = 'Gerencia');

create policy avisos_propios on public.avisos
for update to authenticated
using (user_id = auth.uid() or autor_id = auth.uid())
with check (user_id = auth.uid() or autor_id = auth.uid());

create policy avisos_eliminar on public.avisos
for delete to authenticated using (autor_id = auth.uid());

create policy avisos_crear on public.avisos
for insert to authenticated
with check (autor_id = auth.uid() and public.rol_actual() in ('Gerencia', 'Administracion'));

create or replace function public.validar_edicion_aviso()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user = 'authenticated' then
    if (new.id, new.fecha, new.autor_id, new.user_id) is distinct from
       (old.id, old.fecha, old.autor_id, old.user_id) then
      raise exception 'La identidad del aviso no se puede modificar.';
    end if;
    if new.texto is distinct from old.texto and old.autor_id is distinct from auth.uid() then
      raise exception 'Solo el autor puede editar el mensaje.';
    end if;
    if new.leida is distinct from old.leida and old.user_id is distinct from auth.uid() then
      raise exception 'Solo el destinatario puede marcar el aviso como leído.';
    end if;
  end if;
  return new;
end;
$$;

create trigger validar_edicion_aviso before update on public.avisos
for each row execute function public.validar_edicion_aviso();

create policy auditoria_leer on public.auditoria
for select to authenticated
using (public.rol_actual() = 'Gerencia');
create policy auditoria_crear on public.auditoria
for insert to authenticated
with check (actor_id = auth.uid());

create policy respaldos_gerencia on public.respaldos
for all to authenticated
using (public.rol_actual() = 'Gerencia')
with check (public.rol_actual() = 'Gerencia');

create policy transferencias_gerencia on public.transferencias
for all to authenticated
using (public.rol_actual() = 'Gerencia')
with check (public.rol_actual() = 'Gerencia');

insert into storage.buckets (id, name, public)
values ('expedientes', 'expedientes', false)
on conflict (id) do nothing;

create policy storage_leer on storage.objects
for select to authenticated
using (bucket_id = 'expedientes');
create policy storage_escribir on storage.objects
for insert to authenticated
with check (bucket_id = 'expedientes' and public.rol_actual() in ('Gerencia', 'Administracion'));
