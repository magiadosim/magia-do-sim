/* Manual do Convidado: edição por casamento e publicação explícita. */
Object.assign(state,{guestManual:null,guestManualError:false});
navItems.splice(navItems.findIndex(x=>x[0]==='convidados')+1,0,['manual-convidado','Manual do Convidado','calendar']);
const manualReset=resetWeddingCollections;
resetWeddingCollections=function(){manualReset();state.guestManual=null;state.guestManualError=false;};
const manualLoad=loadWeddingData;
loadWeddingData=async function(id){await manualLoad(id);state.guestManual=null;state.guestManualError=false;if(!id)return;const r=await sb.from('wedding_guest_manuals').select('*').eq('wedding_id',id).maybeSingle();state.guestManual=r.data;state.guestManualError=!!r.error;};
function manualUrl(){if(!state.wedding?.rsvp_code)return '';const u=new URL('manual-convidado.html',location.href);u.search='';u.hash='';u.searchParams.set('code',state.wedding.rsvp_code);return u.href;}
function manualText(m){return [m.welcome,m.notes].filter(Boolean).join('\n\n');}
function manualView(){const m=state.guestManual||{},w=state.wedding;return `<div class="page guest-page"><div class="page-head"><div><h1>Manual do Convidado</h1><p>Um espaço para colar o texto do manual e compartilhar com seus convidados.</p></div><div class="guest-actions"><button class="btn-secondary" id="manual-copy">Copiar link</button><button class="btn-secondary" id="manual-open">Ver página</button></div></div>
${state.guestManualError?'<p role="alert">Não foi possível carregar o manual. Reabra esta seção para tentar novamente.</p>':''}
<div class="card card-pad"><strong>${m.published?'Manual publicado':'Manual não publicado'}</strong><p class="small muted">Preencha somente as informações que deseja mostrar aos convidados.</p><input class="input" aria-label="Link do manual" readonly value="${esc(manualUrl())}"></div>
<form id="manual-form" class="card card-pad" style="margin-top:20px;display:grid;gap:18px">
<div class="field"><label for="manual-text">Texto do manual</label><textarea id="manual-text" class="input" name="notes" rows="16" maxlength="5000" placeholder="Copie e cole aqui o texto que os convidados vão ler.">${esc(manualText(m))}</textarea><p class="small muted">Cole seu texto completo. As quebras de linha serão mantidas.</p></div>
<label class="guest-checkbox"><input type="checkbox" name="published" ${m.published?'checked':''}> Publicar manual para quem receber o link</label><button class="btn-primary" type="submit" ${state.guestManualError?'disabled':''}>Salvar manual</button></form></div>`;}
const manualBaseView=viewFor;
viewFor=function(r){return r==='manual-convidado'&&state.wedding?manualView():manualBaseView(r);};
const manualBaseBind=bindView;
bindView=function(r){manualBaseBind(r);if(r!=='manual-convidado')return;
document.getElementById('manual-copy').onclick=async()=>{if(!manualUrl()){toast('Link indisponível.');return;}try{await navigator.clipboard.writeText(manualUrl());toast('Link do manual copiado.');}catch{toast('Copie o link exibido acima.');}};
document.getElementById('manual-open').onclick=()=>{if(manualUrl())window.open(manualUrl(),'_blank','noopener');};
document.getElementById('manual-form').onsubmit=async e=>{e.preventDefault();const form=e.currentTarget,button=form.querySelector('[type=submit]'),id=state.wedding.id,f=Object.fromEntries(new FormData(form));const p={wedding_id:id,published:form.elements.published.checked};
p.notes=String(f.notes||'');p.welcome='';
button.disabled=true;try{const {error}=await sb.from('wedding_guest_manuals').upsert(p);if(error)throw error;if(state.wedding?.id===id){await loadWeddingData(id);render();}toast('Manual salvo.');}catch{toast('Não foi possível salvar o manual. Tente novamente.');button.disabled=false;}};
};