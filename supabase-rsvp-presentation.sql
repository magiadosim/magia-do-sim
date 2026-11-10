create or replace function public.rsvp_get_presentation(invitation_code uuid,is_registration boolean default false) returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce((select jsonb_object_agg(e.key,e.value) from jsonb_each(i.content) e where e.key in ('photo_url','photo_position','initials','rsvp_theme','rsvp_message','address','directions_url')), '{}'::jsonb)
 from public.weddings w join public.wedding_invitations i on i.wedding_id=w.id
 where (case when is_registration then w.guest_registration_code else w.rsvp_code end)=invitation_code
 and w.deleted_at is null and coalesce(w.lifecycle_status,'active') not in ('deleted','completed')
 and i.content->>'rsvp_published'='true' limit 1;
$$;
revoke all on function public.rsvp_get_presentation(uuid,boolean) from public;
grant execute on function public.rsvp_get_presentation(uuid,boolean) to anon,authenticated;