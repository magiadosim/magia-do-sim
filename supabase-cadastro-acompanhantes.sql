create or replace function public.guest_registration_submit_group(registration_code uuid, guests jsonb)
returns integer language plpgsql security invoker set search_path=''
as $$
declare item jsonb; total integer:=0;
begin
 if jsonb_typeof(guests) is distinct from 'array' or jsonb_array_length(guests) not between 1 and 21 then
 raise exception 'Confira os convidados preenchidos.'; end if;
 for item in select value from jsonb_array_elements(guests) loop
 total:=total+public.guest_registration_submit(registration_code,(item->>'request_id')::uuid,item->'guest');
 end loop;
 return total;
end;
$$;
revoke all on function public.guest_registration_submit_group(uuid,jsonb) from public;
grant execute on function public.guest_registration_submit_group(uuid,jsonb) to anon,authenticated;
