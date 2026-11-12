alter table public.payments add column if not exists due_date date;
alter table public.payments add column if not exists paid_at date;
create or replace function public.confirm_vendor_installment(payment_id uuid, confirmed_date date)
returns void language plpgsql security invoker set search_path=public as $$
declare p public.payments%rowtype; changed uuid;
begin
 if auth.uid() is null then raise exception 'Autenticação necessária'; end if;
 select * into p from public.payments where id=payment_id for update;
 if not found then raise exception 'Parcela não encontrada'; end if;
 if p.status='Pago' then return; end if;
 if confirmed_date is null then raise exception 'Informe a data do pagamento'; end if;
 update public.vendors set paid_value=coalesce(paid_value,0)+p.amount
 where id=p.vendor_id and wedding_id=p.wedding_id returning id into changed;
 if changed is null then raise exception 'Fornecedor não disponível'; end if;
 update public.payments set status='Pago',paid_at=confirmed_date where id=p.id;
end $$;
revoke all on function public.confirm_vendor_installment(uuid,date) from public,anon;
grant execute on function public.confirm_vendor_installment(uuid,date) to authenticated;