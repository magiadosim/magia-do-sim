// Parcelas dos fornecedores, usando os pagamentos do próprio casamento.
function installmentToday(){return new Date().toLocaleDateString('sv-SE');}
function installmentStatus(p){return p.status==='Pago'?'Pago':((p.due_date||p.payment_date||'9999')<installmentToday()?'Atrasado':'A vencer');}
function installmentSection(vendorId){
  const items=(state.payments||[]).filter(p=>!vendorId||p.vendor_id===vendorId).slice().sort((a,b)=>(a.due_date||a.payment_date||'9999').localeCompare(b.due_date||b.payment_date||'9999'));
  return `<section class="card card-pad" style="margin-top:20px"><div class="card-title"><h2>Parcelas e pagamentos</h2><button class="btn-primary" data-add-installments="${vendorId||''}">+ Adicionar parcelas</button></div><p class="small muted">Cadastre os vencimentos e confirme cada parcela quando pagar. O saldo é atualizado automaticamente.</p>${items.length?items.map(p=>{const v=state.vendors.find(v=>v.id===p.vendor_id);const status=installmentStatus(p);return `<div class="contract-line" style="gap:12px;flex-wrap:wrap"><div><strong>${esc(p.description||'Pagamento')}</strong><div class="small muted">${vendorId?'':esc(v?.name||'Fornecedor')+' • '}Vencimento: ${dateBR(p.due_date||p.payment_date)}${p.status==='Pago'?' • Pago em '+dateBR(p.paid_at||p.payment_date):''}</div></div><strong>${brl(p.amount)}</strong><span class="badge ${status==='Pago'?'success':'warning'}">${status}</span>${p.status!=='Pago'?`<button class="btn-secondary" data-confirm-installment="${p.id}">Confirmar pagamento</button>`:''}</div>`;}).join(''):emptyState('Nenhuma parcela cadastrada','Adicione as parcelas do fornecedor com valor e vencimento.')}</section>`;
}
const installmentsVendorView=vendorDetailView;
vendorDetailView=function(id){return installmentsVendorView(id)+installmentSection(id);};
const installmentsFinanceView=financeView;
financeView=function(){return installmentsFinanceView()+installmentSection();};
function openInstallmentsEditor(vendorId){
 const options=[{value:'',label:'Selecione o fornecedor'},...state.vendors.map(v=>({value:v.id,label:v.category+' — '+v.name}))];
 const row=(i)=>`<div class="card card-pad installment-entry" style="margin:10px 0"><strong>Parcela ${i}</strong>${field('Descrição','description','Parcela '+i)}${field('Valor (R$)','amount','','number','min="0.01" step="0.01" required')}${field('Vencimento','due_date','','date','required')}<button type="button" class="link-btn" data-remove-installment>Remover parcela</button></div>`;
 const back=modal('Adicionar parcelas',selectField('Fornecedor','vendor_id',options,vendorId||'')+'<div data-installment-rows>'+row(1)+'</div><button type="button" class="btn-secondary" data-another-installment>+ Outra parcela</button>','Salvar parcelas',async back=>{
  const vendor=back.querySelector('[name=vendor_id]').value;
  const rows=[...back.querySelectorAll('.installment-entry')].map(el=>({wedding_id:state.wedding.id,vendor_id:vendor,description:el.querySelector('[name=description]').value||'Parcela',amount:Number(el.querySelector('[name=amount]').value),due_date:el.querySelector('[name=due_date]').value,payment_date:el.querySelector('[name=due_date]').value,status:'Pendente'}));
  if(!vendor||!rows.length||rows.some(p=>!Number.isFinite(p.amount)||p.amount<=0||!p.due_date)){toast('Selecione o fornecedor e preencha valor e vencimento de cada parcela.');return false;}
  const {error}=await sb.from('payments').insert(rows);
  if(error){console.error(error);toast('Não foi possível salvar as parcelas.');return false;}
  await loadWeddingData(state.wedding.id);render();toast('Parcelas cadastradas.');return true;
 });
 let next=2;
 back.querySelector('[data-another-installment]').onclick=()=>back.querySelector('[data-installment-rows]').insertAdjacentHTML('beforeend',row(next++));
 back.addEventListener('click',e=>{if(e.target.closest('[data-remove-installment]'))e.target.closest('.installment-entry').remove();});
}
function confirmInstallment(id){
 const p=state.payments.find(p=>p.id===id);if(!p||p.status==='Pago')return;
 modal('Confirmar pagamento',`<p>${esc(p.description||'Parcela')} • <strong>${brl(p.amount)}</strong></p>`+field('Data do pagamento','paid_at',installmentToday(),'date','required'),'Confirmar pagamento',async back=>{
  const date=back.querySelector('[name=paid_at]').value;if(!date){toast('Informe a data do pagamento.');return false;}
  const {error}=await sb.rpc('confirm_vendor_installment',{payment_id:id,confirmed_date:date});
  if(error){console.error(error);toast('Não foi possível confirmar o pagamento.');return false;}
  await loadWeddingData(state.wedding.id);render();toast('Pagamento confirmado e saldo atualizado.');return true;
 });
}
const installmentsBindView=bindView;
bindView=function(r){installmentsBindView(r);document.querySelectorAll('[data-add-installments]').forEach(b=>b.onclick=()=>openInstallmentsEditor(b.dataset.addInstallments));document.querySelectorAll('[data-confirm-installment]').forEach(b=>b.onclick=()=>confirmInstallment(b.dataset.confirmInstallment));};
