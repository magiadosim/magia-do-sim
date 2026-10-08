-- Cadastro aberto ativado individualmente no painel de cada casamento.
alter table public.weddings add column if not exists guest_registration_code uuid;
create unique index if not exists weddings_guest_registration_code_uidx on public.weddings(guest_registration_code);
alter table public.wedding_guests add column if not exists registration_request_id uuid;
create unique index if not exists wedding_guests_registration_request_uidx on public.wedding_guests(registration_request_id) where registration_request_id is not null;

create or replace function public.guest_registration_get_wedding(registration_code uuid)
returns table(couple_name text,wedding_date date,venue text)
language sql stable security definer set search_path = ''
as $$
 select w.couple_name,w.wedding_date,w.venue from public.weddings w
 where w.guest_registration_code=registration_code and w.deleted_at is null
 and coalesce(w.lifecycle_status,'active') <> 'completed' limit 1;
$$;
revoke all on function public.guest_registration_get_wedding(uuid) from public;
grant execute on function public.guest_registration_get_wedding(uuid) to anon,authenticated;

create or replace function public.guest_registration_submit(registration_code uuid, request_id uuid, guest jsonb)
returns integer language plpgsql security definer set search_path = ''
as $$
declare target_id uuid; guest_name text; guest_phone text; guest_age text; guest_status text;
begin
 select w.id into target_id from public.weddings w where w.guest_registration_code=registration_code
 and w.deleted_at is null and coalesce(w.lifecycle_status,'active') <> 'completed' for update;
 if target_id is null then raise exception 'Cadastro encerrado ou link inválido.'; end if;
 guest_name := trim(coalesce(guest->>'full_name',''));
 guest_phone := trim(coalesce(guest->>'phone',''));
 guest_age := guest->>'age_group'; guest_status := guest->>'status';
 if request_id is null or jsonb_typeof(guest) is distinct from 'object'
 or length(guest_name)<3 or length(guest_name)>150
 or length(guest_phone)>30 or length(coalesce(guest->>'group_name',''))>100
 or guest_age is null or guest_age not in ('adult','child')
 or guest_status is null or guest_status not in ('confirmed','declined') then
 raise exception 'Confira os dados preenchidos.'; end if;
 if exists(select 1 from public.wedding_guests where registration_request_id=request_id and wedding_id=target_id) then return 1; end if;
 insert into public.wedding_guests(wedding_id,full_name,phone,group_name,age_group,status,responded_at,registration_request_id)
 values(target_id,guest_name,nullif(guest_phone,''),nullif(trim(guest->>'group_name'),''),guest_age,guest_status,now(),request_id);
 return 1;
end;
$$;
revoke all on function public.guest_registration_submit(uuid,uuid,jsonb) from public;
grant execute on function public.guest_registration_submit(uuid,uuid,jsonb) to anon,authenticated;
