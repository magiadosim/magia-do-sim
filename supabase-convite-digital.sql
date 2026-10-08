create table public.wedding_invitations (
 wedding_id uuid primary key references public.weddings(id) on delete cascade,
 published boolean not null default false,
 content jsonb not null default '{}'::jsonb check(jsonb_typeof(content)='object' and octet_length(content::text)<=100000),
 updated_at timestamptz not null default now()
);
alter table public.wedding_invitations enable row level security;
revoke all on public.wedding_invitations from anon,authenticated;
grant select,insert,update,delete on public.wedding_invitations to authenticated;
create policy invitation_owner on public.wedding_invitations for all to authenticated
 using(public.is_admin() or public.owns_wedding(wedding_id))
 with check(public.is_admin() or public.owns_wedding(wedding_id));
create function public.invitation_get_page(wedding_code uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('content',i.content,'registration_code',w.guest_registration_code)
 from public.wedding_invitations i join public.weddings w on w.id=i.wedding_id
 where w.rsvp_code=wedding_code and i.published and w.deleted_at is null
 and coalesce(w.lifecycle_status,'active') not in ('deleted','completed') limit 1;
$$;
revoke all on function public.invitation_get_page(uuid) from public;
grant execute on function public.invitation_get_page(uuid) to anon,authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('invitation-media','invitation-media',true,15728640,
 array['image/jpeg','image/png','image/webp','audio/mpeg','audio/mp4','audio/ogg','audio/wav','audio/x-wav','audio/webm','audio/aac']);
-- Images/audio are intentionally public; only wedding owners/admins can upload or manage.
create policy invitation_media_owner on storage.objects for all to authenticated
 using(bucket_id='invitation-media' and (
 public.is_admin() or exists(select 1 from public.weddings w where w.id::text=(storage.foldername(name))[1] and public.owns_wedding(w.id))))
 with check(bucket_id='invitation-media' and (
 public.is_admin() or exists(select 1 from public.weddings w where w.id::text=(storage.foldername(name))[1] and public.owns_wedding(w.id))));

