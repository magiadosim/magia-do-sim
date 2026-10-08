/* Manual do Convidado: edição por casamento e publicação explícita. */
Object.assign(state,{guestManual:null,guestManualError:false});
navItems.splice(navItems.findIndex(x=>x[0]==='convidados')+1,0,['manual-convidado','Manual do Convidado','calendar']);
const manualReset=resetWeddingCollections;
resetWeddingCollections=function(){manualReset();state.guestManual=null;state.guestManualError=false;};
const manualLoad=loadWeddingData;
loadWeddingData=async function(id){await manualLoad(id);state.guestManual=null;state.guestManualError=false;if(!id)return;const r=await sb.from('wedding_guest_manuals').select('*').eq('wedding_id',id).maybeSingle();state.guestManual=r.data;state.guestManualError=!!r.error;};
function manualUrl(){if(!state.wedding?.rsvp_code)return '';const u=new URL('manual-convidado.html',location.href);u.search='';u.hash='';u.searchParams.set('code',state.wedding.rsvp_code);return u.href;}
const manualFields=[
['welcome','Mensagem de boas-vindas','textarea',3000],
['event_date','Data da festa','date'],
['ceremony_time','Horário da cerimônia','time'],
['reception_time','Horário da recepção','time'],
['ceremony_location','Local e endereço da cerimônia','textarea',500],
['reception_location','Local e endereço da recepção','textarea',500],
['dress_code','Traje sugerido','textarea',1000],
['directions','Como chegar e estacionamento','textarea',3000],
['notes','Orientações e informações adicionais','textarea',5000],
['event_url','Link da página da festa / convite','url'],
['rsvp_url','Link de confirmação / cadastro de convidados','url'],
['gifts_url','Link da lista de presentes','url']];
function manualView(){const m=state.guestManual||{},w=state.wedding;return `<div class="page guest-page"><div class="page-head"><div><h1>Manual do Convidado</h1><p>Informações da festa em uma página para compartilhar com seus convidados.</p></div><div class="guest-actions"><button class="btn-secondary" id="manual-copy">Copiar link</button><button class="btn-secondary" id="manual-open">Ver página</button></div></div>
${state.guestManualError?'<p role="alert">Não foi possível carregar o manual. Reabra esta seção para tentar novamente.</p>':''}
<div class="card card-pad"><strong>${m.published?'Manual publicado':'Manual não publicado'}</strong><p class="small muted">Preencha somente as informações que deseja mostrar aos convidados.</p><input class="input" aria-label="Link do manual" readonly value="${esc(manualUrl())}"></div>
<form id="manual-form" class="card card-pad" style="margin-top:20px;display:grid;gap:18px">
${manualFields.map(([key,label,type,max])=>{const value=m[key]??(key==='event_date'?w.wedding_date:key==='ceremony_time'?w.wedding_time:key==='ceremony_location'?w.venue:'')??'';return type==='textarea'?`<div class="field"><label for="manual-${key}">${label}</label><textarea id="manual-${key}" class="input" name="${key}" rows="3" maxlength="${max}">${esc(value)}</textarea></div>`:`<div class="field"><label for="manual-${key}">${label}</label><input id="manual-${key}" class="input" name="${key}" type="${type}" value="${esc(type==='time'?String(value).slice(0,5):value)}" ${type==='url'?'maxlength="2000" placeholder="https://"':''}></div>`;}).join('')}
<label class="guest-checkbox"><input type="checkbox" name="published" ${m.published?'checked':''}> Publicar manual para quem receber o link</label><button class="btn-primary" type="submit" ${state.guestManualError?'disabled':''}>Salvar manual</button></form></div>`;}
const manualBaseView=viewFor;
viewFor=function(r){return r==='manual-convidado'&&state.wedding?manualView():manualBaseView(r);};
const manualBaseBind=bindView;
bindView=function(r){manualBaseBind(r);if(r!=='manual-convidado')return;
document.getElementById('manual-copy').onclick=async()=>{if(!manualUrl()){toast('Link indisponível.');return;}try{await navigator.clipboard.writeText(manualUrl());toast('Link do manual copiado.');}catch{toast('Copie o link exibido acima.');}};
document.getElementById('manual-open').onclick=()=>{if(manualUrl())window.open(manualUrl(),'_blank','noopener');};
document.getElementById('manual-form').onsubmit=async e=>{e.preventDefault();const form=e.currentTarget,button=form.querySelector('[type=submit]'),id=state.wedding.id,f=Object.fromEntries(new FormData(form));const p={wedding_id:id,published:form.elements.published.checked};
for(const [key,,type] of manualFields){const v=String(f[key]||'').trim();if(type==='url'&&v){try{if(!['http:','https:'].includes(new URL(v).protocol))throw Error();}catch{toast('Informe links válidos começando com https://.');return;}}p[key]=['date','time'].includes(type)?v||null:v;}
button.disabled=true;try{const {error}=await sb.from('wedding_guest_manuals').upsert(p);if(error)throw error;if(state.wedding?.id===id){await loadWeddingData(id);render();}toast('Manual salvo.');}catch{toast('Não foi possível salvar o manual. Tente novamente.');button.disabled=false;}};
};