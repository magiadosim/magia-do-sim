-- Presentes Pix: somente administradores/noivos editam. A leitura pública exige
-- o código UUID compartilhado e publicação explícita; não retorna dados privados.
create table public.wedding_gift_settings (
 wedding_id uuid primary key references public.weddings(id) on delete cascade,
 pix_key text not null check(length(trim(pix_key)) between 1 and 140),
 recipient_name text not null check(length(trim(recipient_name)) between 1 and 120),
 published boolean not null default false
);
create table public.wedding_gifts (
 id uuid primary key default gen_random_uuid(),
 wedding_id uuid not null references public.weddings(id) on delete cascade,
 name text not null check(length(trim(name)) between 1 and 120),
 description text not null default '' check(length(description)<=1000),
 amount numeric(10,2) not null check(amount>0 and amount<=999999.99),
 active boolean not null default true,
 created_at timestamptz not null default now()
);
create index wedding_gifts_wedding_idx on public.wedding_gifts(wedding_id);
alter table public.wedding_gifts enable row level security;
alter table public.wedding_gift_settings enable row level security;
revoke all on public.wedding_gifts,public.wedding_gift_settings from anon,authenticated;
grant select,insert,update,delete on public.wedding_gifts,public.wedding_gift_settings to authenticated;
create policy gift_owner_select on public.wedding_gifts for select to authenticated using(public.is_admin() or public.owns_wedding(wedding_id));
create policy gift_owner_insert on public.wedding_gifts for insert to authenticated with check(public.is_admin() or public.owns_wedding(wedding_id));
create policy gift_owner_update on public.wedding_gifts for update to authenticated using(public.is_admin() or public.owns_wedding(wedding_id)) with check(public.is_admin() or public.owns_wedding(wedding_id));
create policy gift_owner_delete on public.wedding_gifts for delete to authenticated using(public.is_admin() or public.owns_wedding(wedding_id));
create policy gift_settings_select on public.wedding_gift_settings for select to authenticated using(public.is_admin() or public.owns_wedding(wedding_id));
create policy gift_settings_insert on public.wedding_gift_settings for insert to authenticated with check(public.is_admin() or public.owns_wedding(wedding_id));
create policy gift_settings_update on public.wedding_gift_settings for update to authenticated using(public.is_admin() or public.owns_wedding(wedding_id)) with check(public.is_admin() or public.owns_wedding(wedding_id));
create policy gift_settings_delete on public.wedding_gift_settings for delete to authenticated using(public.is_admin() or public.owns_wedding(wedding_id));
-- SECURITY DEFINER is intentional for this narrowly scoped, read-only public
-- capability, as guests do not have accounts. No table grants to anon; no writes.
create function public.gift_get_page(wedding_code uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('couple_name',w.couple_name,'wedding_date',w.wedding_date,
 'pix_key',s.pix_key,'recipient_name',s.recipient_name,'gifts',coalesce((
 select jsonb_agg(jsonb_build_object('id',g.id,'name',g.name,'description',g.description,'amount',g.amount) order by g.created_at,g.id)
 from public.wedding_gifts g where g.wedding_id=w.id and g.active
 ),'[]'::jsonb))
 from public.weddings w join public.wedding_gift_settings s on s.wedding_id=w.id
 where w.rsvp_code=wedding_code and s.published and w.deleted_at is null
 and coalesce(w.lifecycle_status,'active') not in ('deleted','completed') limit 1;
$$;
revoke all on function public.gift_get_page(uuid) from public;
grant execute on function public.gift_get_page(uuid) to anon,authenticated;
