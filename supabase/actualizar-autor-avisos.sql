begin;

alter table public.avisos add column if not exists autor_id uuid references public.perfiles (id) on delete set null;
alter table public.avisos alter column autor_id set default auth.uid();

drop policy if exists avisos_leer on public.avisos;
drop policy if exists avisos_propios on public.avisos;
drop policy if exists avisos_eliminar on public.avisos;
drop policy if exists avisos_crear on public.avisos;
drop trigger if exists validar_edicion_aviso on public.avisos;

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

-- Dos avisos identificados por texto, destinatario y fecha en Nicaragua.
with identificados as (
  select a.id, maria.id as autor, count(*) over (partition by a.texto, a.user_id) as coincidencias
  from public.avisos a
  join public.perfiles destino on destino.id = a.user_id
  cross join public.perfiles maria
  where maria.correo = 'maria.torres@edertorres.com'
    and (a.fecha at time zone 'America/Managua')::date = date '2026-11-16'
    and (a.texto, destino.correo) in (
      ('Hola', 'luis.navarro@edertorres.com'),
      ('Saludo', 'ana.campos@edertorres.com')
    )
)
update public.avisos a set autor_id = i.autor
from identificados i
where a.id = i.id and i.coincidencias = 1 and a.autor_id is null;

commit;
