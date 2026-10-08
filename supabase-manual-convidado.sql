create table public.wedding_guest_manuals (
 wedding_id uuid primary key references public.weddings(id) on delete cascade,
 published boolean not null default false,
 welcome text not null default '' check(length(welcome)<=3000),
 event_date date, ceremony_time time, reception_time time,
 ceremony_location text not null default '' check(length(ceremony_location)<=500),
 reception_location text not null default '' check(length(reception_location)<=500),
 dress_code text not null default '' check(length(dress_code)<=1000),
 directions text not null default '' check(length(directions)<=3000),
 notes text not null default '' check(length(notes)<=5000),
 event_url text not null default '' check(event_url='' or event_url ~ '^https?://'),
 rsvp_url text not null default '' check(rsvp_url='' or rsvp_url ~ '^https?://'),
 gifts_url text not null default '' check(gifts_url='' or gifts_url ~ '^https?://')
);
alter table public.wedding_guest_manuals enable row level security;
revoke all on public.wedding_guest_manuals from anon,authenticated;
grant select,insert,update,delete on public.wedding_guest_manuals to authenticated;
create policy manual_owner on public.wedding_guest_manuals for all to authenticated
using(public.is_admin() or public.owns_wedding(wedding_id))
with check(public.is_admin() or public.owns_wedding(wedding_id));
-- Deliberate narrow read-only capability for guests without accounts.
-- Only explicitly published guest-facing fields are returned for an exact UUID.
create function public.guest_manual_get_page(wedding_code uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('couple_name',w.couple_name,
 'event_date',coalesce(m.event_date,w.wedding_date),
 'ceremony_time',coalesce(m.ceremony_time,w.wedding_time),
 'reception_time',m.reception_time,'ceremony_location',m.ceremony_location,
 'reception_location',m.reception_location,'welcome',m.welcome,
 'dress_code',m.dress_code,'directions',m.directions,'notes',m.notes,
 'event_url',m.event_url,'rsvp_url',m.rsvp_url,'gifts_url',m.gifts_url)
 from public.wedding_guest_manuals m join public.weddings w on w.id=m.wedding_id
 where w.rsvp_code=wedding_code and m.published and w.deleted_at is null
 and coalesce(w.lifecycle_status,'active') not in ('deleted','completed') limit 1;
$$;
revoke all on function public.guest_manual_get_page(uuid) from public;
grant execute on function public.guest_manual_get_page(uuid) to anon,authenticated;