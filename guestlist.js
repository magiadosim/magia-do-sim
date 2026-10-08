
Object.assign(state,{
  guests: state.guests || [],
  guestFilter: state.guestFilter || 'Todos',
  guestSearch: state.guestSearch || ''
});

if(!navItems.some(([key])=>key==='convidados')){
  navItems.splice(5,0,['convidados','Lista de convidados','users']);
}

const guestBaseResetWeddingCollections = resetWeddingCollections;
resetWeddingCollections = function(){
  guestBaseResetWeddingCollections();
  state.guests=[];
};

const guestBaseLoadWeddingData = loadWeddingData;
loadWeddingData = async function(weddingId){
  await guestBaseLoadWeddingData(weddingId);
  if(!weddingId){state.guests=[];return;}
  const {data,error}=await sb
    .from('wedding_guests')
    .select('*')
    .eq('wedding_id',weddingId)
    .order('full_name',{ascending:true});
  if(error){
    console.error(error);
    state.guests=[];
    return;
  }
  state.guests=data||[];
};

function guestStatusLabel(status){
  if(status==='confirmed') return 'Confirmado';
  if(status==='declined') return 'Recusou';
  return 'Não respondeu';
}

function guestStatusClass(status){
  if(status==='confirmed') return 'success';
  if(status==='declined') return 'danger';
  return 'warning';
}

function guestAgeLabel(age){
  return age==='child'?'Criança':'Adulto';
}

function guestStats(){
  const total=state.guests.length;
  const confirmed=state.guests.filter(g=>g.status==='confirmed').length;
  const pending=state.guests.filter(g=>g.status==='pending').length;
  const declined=state.guests.filter(g=>g.status==='declined').length;
  const checked=state.guests.filter(g=>g.checked_in).length;
  const children=state.guests.filter(g=>g.age_group==='child'&&g.status==='confirmed').length;
  const rate=total?Math.round((confirmed/total)*100):0;
  return {total,confirmed,pending,declined,checked,children,rate};
}

function guestRsvpUrl(){
  const code=state.wedding?.rsvp_code;
  if(!code) return '';
  const url=new URL('rsvp.html',window.location.href);
  url.search='';
  url.hash='';
  url.searchParams.set('code',code);
  return url.toString();
}

function guestListView(){
  const stats=guestStats();
  const query=(state.guestSearch||'').trim().toLowerCase();
  let items=state.guests.filter(g=>{
    const matchesSearch=!query
      || String(g.full_name||'').toLowerCase().includes(query)
      || String(g.group_name||'').toLowerCase().includes(query)
      || String(g.phone||'').toLowerCase().includes(query);
    const matchesFilter=
      state.guestFilter==='Todos'
      || (state.guestFilter==='Confirmados'&&g.status==='confirmed')
      || (state.guestFilter==='Aguardando'&&g.status==='pending')
      || (state.guestFilter==='Recusaram'&&g.status==='declined')
      || (state.guestFilter==='Check-in'&&g.checked_in);
    return matchesSearch&&matchesFilter;
  });

  return `<div class="page guest-page">
    <div class="page-head guest-page-head">
      <div>
        <h1>Lista de convidados</h1>
        <p>Acompanhe confirmações, recusas, pendências e check-in do casamento.</p>
      </div>
      <div class="guest-actions">
        <button class="btn-secondary" id="copy-rsvp-link">Copiar link RSVP</button>
        <button class="btn-secondary" id="open-rsvp-link">Ver página RSVP</button>
        <button class="btn-secondary" id="toggle-guest-registration">${state.wedding?.guest_registration_code?'Encerrar cadastro aberto':'Ativar cadastro aberto'}</button>
        ${state.wedding?.guest_registration_code?'<button class="btn-secondary" id="copy-guest-registration">Copiar link de cadastro aberto</button>':''}
        <button class="btn-secondary" id="refresh-guests">Atualizar lista</button>
        <button class="btn-primary" id="new-guest">+ Convidado</button>
      </div>
    </div>

    <div class="guest-kpis">
      <div class="card guest-kpi"><span>Total</span><strong>${stats.total}</strong><small>convidados</small></div>
      <div class="card guest-kpi confirmed"><span>Confirmados</span><strong>${stats.confirmed}</strong><small>${stats.rate}% da lista</small></div>
      <div class="card guest-kpi pending"><span>Aguardando</span><strong>${stats.pending}</strong><small>ainda não responderam</small></div>
      <div class="card guest-kpi declined"><span>Recusaram</span><strong>${stats.declined}</strong><small>não irão ao evento</small></div>
      <div class="card guest-kpi checked"><span>Check-in</span><strong>${stats.checked}</strong><small>já chegaram</small></div>
    </div>

    <div class="card guest-progress-card">
      <div class="guest-progress-top">
        <div><strong>${stats.confirmed} de ${stats.total}</strong><span> convidados confirmados</span></div>
        <strong>${stats.rate}%</strong>
      </div>
      <div class="progress-track"><div class="progress-fill" style="width:${stats.rate}%"></div></div>
      <div class="guest-progress-meta"><span>${stats.children} criança(s) confirmada(s)</span><span>${stats.pending} pendência(s)</span></div>
    </div>

    <div class="guest-tools">
      <div class="guest-search-wrap">
        ${icons.search||''}
        <input class="input" id="guest-search" placeholder="Pesquisar nome, família ou telefone" value="${esc(state.guestSearch||'')}">
      </div>
      <div class="guest-filter-row">
        ${['Todos','Confirmados','Aguardando','Recusaram','Check-in'].map(f=>`<button class="filter-btn ${state.guestFilter===f?'active':''}" data-guest-filter="${f}">${f}</button>`).join('')}
      </div>
      <div class="guest-file-actions">
        <input type="file" id="guest-import-file" accept=".xlsx,.xls,.csv" hidden>
        <button class="btn-secondary" id="import-guests">Importar Excel</button>
        <button class="btn-secondary" id="export-guests">Exportar lista</button>
      </div>
    </div>

    <div class="card guest-list-card">
      ${items.length?items.map(g=>`
        <div class="guest-row">
          <div class="guest-avatar">${esc((g.full_name||'C')[0]?.toUpperCase()||'C')}</div>
          <div class="guest-name">
            <strong>${esc(g.full_name)}</strong>
            <span>${esc(g.group_name||'Sem grupo/família')} • ${guestAgeLabel(g.age_group)}${g.phone?` • ${esc(g.phone)}`:''}</span>
          </div>
          <span class="badge ${guestStatusClass(g.status)}">${guestStatusLabel(g.status)}</span>
          <button class="guest-check-btn ${g.checked_in?'done':''}" data-check-guest="${g.id}" title="${g.checked_in?'Remover check-in':'Marcar chegada'}">${g.checked_in?'✓ Chegou':'Check-in'}</button>
          <button class="btn-secondary guest-edit-btn" data-edit-guest="${g.id}">Editar</button>
        </div>
      `).join(''):emptyState('Nenhum convidado encontrado','Adicione convidados ou altere os filtros da lista.')}
    </div>

    <div class="card card-pad guest-help-card">
      <h2>Cadastro aberto</h2><p class="small muted">Ative para compartilhar um link em que cada convidado preenche seu nome, telefone, família, adulto ou criança e presença, sem cadastro prévio e sem login. Os registros entram nesta lista. Use Atualizar lista para consultar novas respostas. Encerre quando quiser interromper os cadastros.</p>
      ${state.wedding?.guest_registration_code?`<div class="guest-public-link">${esc(guestRegistrationUrl())}</div>`:''}
      <div class="card-title"><h2>Como funciona o RSVP</h2></div>
      <p class="small muted">Compartilhe o link de confirmação com os convidados. Eles pesquisam o próprio nome, visualizam os integrantes do convite/família e informam quem irá ou não ao casamento. As respostas entram automaticamente neste painel.</p>
      ${state.wedding?.rsvp_code?`<div class="guest-public-link">${esc(guestRsvpUrl())}</div>`:'<div class="badge warning">O link será liberado após a atualização do banco.</div>'}
    </div>
  </div>`;
}

const guestBaseViewFor = viewFor;
viewFor = function(r){
  if(r==='convidados' && state.wedding) return guestListView();
  return guestBaseViewFor(r);
};

const guestBaseDashboardView = dashboardView;
dashboardView = function(){
  const html=guestBaseDashboardView();
  if(state.role!=='client') return html;
  const oldQuick=`<a href="#/cronograma"><span class="quick-icon">${icons.calendar}</span><strong>Cronograma</strong></a>`;
  const guestQuick=`<a href="#/convidados"><span class="quick-icon">${icons.users}</span><strong>Convidados</strong></a>`;
  return html.includes(oldQuick)?html.replace(oldQuick,guestQuick):html;
};

function openGuestEditor(guest){
  const groups=[...new Set(state.guests.map(g=>String(g.group_name||'').trim()).filter(Boolean))].sort();
  const groupList=groups.length?`<datalist id="guest-groups">${groups.map(g=>`<option value="${esc(g)}"></option>`).join('')}</datalist>`:'';
  const body=
    field('Nome completo','full_name',guest?.full_name||'','text','required')+
    field('Família / grupo','group_name',guest?.group_name||'','text','list="guest-groups" placeholder="Ex.: Família Silva"')+
    groupList+
    selectField('Tipo','age_group',[{value:'adult',label:'Adulto'},{value:'child',label:'Criança'}],guest?.age_group||'adult')+
    field('Telefone','phone',guest?.phone||'','tel')+
    selectField('Status','status',[
      {value:'pending',label:'Não respondeu'},
      {value:'confirmed',label:'Confirmado'},
      {value:'declined',label:'Recusou'}
    ],guest?.status||'pending')+
    `<div class="field"><label>Observações internas</label><textarea class="input guest-notes-input" name="notes">${esc(guest?.notes||'')}</textarea></div>`+
    `<label class="guest-checkbox"><input type="checkbox" name="checked_in" ${guest?.checked_in?'checked':''}> <span>Convidado já realizou check-in</span></label>`;

  const back=modal(guest?'Editar convidado':'Novo convidado',body,guest?'Salvar':'Adicionar',async el=>{
    const form=el.querySelector('.modal');
    const f=Object.fromEntries(new FormData(form).entries());
    const payload={
      wedding_id:state.wedding.id,
      full_name:String(f.full_name||'').trim(),
      group_name:String(f.group_name||'').trim()||null,
      age_group:f.age_group||'adult',
      phone:String(f.phone||'').trim()||null,
      status:f.status||'pending',
      notes:String(f.notes||'').trim()||null,
      checked_in:!!form.querySelector('[name=checked_in]')?.checked
    };
    if(!payload.full_name){toast('Informe o nome do convidado.');return false;}
    const res=guest
      ? await sb.from('wedding_guests').update(payload).eq('id',guest.id)
      : await sb.from('wedding_guests').insert(payload);
    if(res.error){console.error(res.error);toast('Não foi possível salvar o convidado.');return false;}
    await loadWeddingData(state.wedding.id);
    toast(guest?'Convidado atualizado.':'Convidado adicionado.');
    render();
    return true;
  });

  if(guest){
    const actions=back.querySelector('.modal-actions');
    const remove=document.createElement('button');
    remove.type='button';
    remove.className='btn-secondary guest-delete-btn';
    remove.textContent='Remover';
    remove.onclick=async()=>{
      if(!confirm(`Remover ${guest.full_name} da lista?`)) return;
      const {error}=await sb.from('wedding_guests').delete().eq('id',guest.id);
      if(error){console.error(error);toast('Não foi possível remover o convidado.');return;}
      back.remove();
      await loadWeddingData(state.wedding.id);
      toast('Convidado removido.');
      render();
    };
    actions.prepend(remove);
  }
}

async function toggleGuestCheckIn(guest){
  if(!guest) return;
  const {error}=await sb.from('wedding_guests').update({checked_in:!guest.checked_in}).eq('id',guest.id);
  if(error){console.error(error);toast('Não foi possível atualizar o check-in.');return;}
  await loadWeddingData(state.wedding.id);
  toast(guest.checked_in?'Check-in removido.':'Check-in realizado.');
  render();
}

async function copyGuestRsvpLink(){
  const url=guestRsvpUrl();
  if(!url){toast('O link de RSVP ainda não está disponível.');return;}
  try{
    await navigator.clipboard.writeText(url);
    toast('Link de RSVP copiado.');
  }catch{
    window.prompt('Copie o link de RSVP:',url);
  }
}

function exportGuestList(){
  const rows=[
    ['Nome','Família/Grupo','Tipo','Telefone','Status','Check-in','Observações'],
    ...state.guests.map(g=>[
      g.full_name||'',
      g.group_name||'',
      guestAgeLabel(g.age_group),
      g.phone||'',
      guestStatusLabel(g.status),
      g.checked_in?'Sim':'Não',
      g.notes||''
    ])
  ];
  const csv='\ufeff'+rows.map(row=>row.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(';')).join('\r\n');
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;
  a.download=`lista-convidados-${(state.wedding?.couple_name||'casamento').replace(/[^a-z0-9]+/gi,'-').toLowerCase()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function normalizedHeader(value){
  return String(value||'').trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9]/g,'');
}

async function importGuestList(file){
  if(!file){return;}
  if(!window.XLSX){toast('O importador ainda está carregando. Tente novamente.');return;}
  let workbook;
  try{
    const buffer=await file.arrayBuffer();
    workbook=XLSX.read(buffer,{type:'array'});
  }catch(error){
    console.error(error);
    toast('Não foi possível ler a planilha.');
    return;
  }

  const sheet=workbook.Sheets[workbook.SheetNames[0]];
  const data=XLSX.utils.sheet_to_json(sheet,{defval:''});
  if(!data.length){toast('A planilha está vazia.');return;}

  const payload=[];
  for(const row of data){
    const mapped={};
    Object.entries(row).forEach(([key,value])=>mapped[normalizedHeader(key)]=value);
    const name=String(mapped.nome||mapped.nomecompleto||mapped.convidado||'').trim();
    if(!name) continue;
    const rawType=String(mapped.tipo||mapped.faixa||mapped.idade||'adulto').toLowerCase();
    const rawStatus=String(mapped.status||'').toLowerCase();
    payload.push({
      wedding_id:state.wedding.id,
      full_name:name,
      group_name:String(mapped.familia||mapped.grupo||mapped.familiagrupo||'').trim()||null,
      age_group:rawType.includes('crian')?'child':'adult',
      phone:String(mapped.telefone||mapped.celular||mapped.whatsapp||'').trim()||null,
      status:rawStatus.includes('confirm')?'confirmed':rawStatus.includes('recus')||rawStatus.includes('nao')?'declined':'pending',
      notes:String(mapped.observacao||mapped.observacoes||mapped.obs||'').trim()||null
    });
  }

  if(!payload.length){
    toast('Não encontrei uma coluna "Nome" na planilha.');
    return;
  }

  const {error}=await sb.from('wedding_guests').insert(payload);
  if(error){console.error(error);toast('Não foi possível importar a lista.');return;}
  await loadWeddingData(state.wedding.id);
  toast(`${payload.length} convidado(s) importado(s).`);
  render();
}

const guestBaseBindView = bindView;
bindView = function(r){
  guestBaseBindView(r);

  document.querySelectorAll('[data-guest-filter]').forEach(btn=>{
    btn.onclick=()=>{
      state.guestFilter=btn.dataset.guestFilter;
      render();
    };
  });

  const search=document.getElementById('guest-search');
  if(search){
    search.oninput=()=>{
      state.guestSearch=search.value;
      const cursor=search.selectionStart;
      render();
      const next=document.getElementById('guest-search');
      if(next){next.focus();next.setSelectionRange(cursor,cursor);}
    };
  }

  const add=document.getElementById('new-guest');
  if(add) add.onclick=()=>openGuestEditor(null);

  document.querySelectorAll('[data-edit-guest]').forEach(btn=>{
    btn.onclick=()=>openGuestEditor(state.guests.find(g=>g.id===btn.dataset.editGuest));
  });

  document.querySelectorAll('[data-check-guest]').forEach(btn=>{
    btn.onclick=()=>toggleGuestCheckIn(state.guests.find(g=>g.id===btn.dataset.checkGuest));
  });

  const copy=document.getElementById('copy-rsvp-link');
  if(copy) copy.onclick=copyGuestRsvpLink;

  const open=document.getElementById('open-rsvp-link');
  if(open) open.onclick=()=>{
    const url=guestRsvpUrl();
    if(url) window.open(url,'_blank','noopener');
    else toast('O link de RSVP ainda não está disponível.');
  };

  const importBtn=document.getElementById('import-guests');
  const fileInput=document.getElementById('guest-import-file');
  if(importBtn&&fileInput){
    importBtn.onclick=()=>fileInput.click();
    fileInput.onchange=()=>importGuestList(fileInput.files?.[0]);
  }

  const exportBtn=document.getElementById('export-guests');
  if(exportBtn) exportBtn.onclick=exportGuestList;
};


function guestRegistrationUrl(){
  const url=new URL('rsvp.html',location.href);
  url.search='';url.hash='';
  url.searchParams.set('register',state.wedding.guest_registration_code);
  return url.toString();
}
const registrationBaseBindView=bindView;
bindView=function(r){
  registrationBaseBindView(r);
  const toggle=document.getElementById('toggle-guest-registration');
  if(toggle) toggle.onclick=async()=>{
    toggle.disabled=true;
    const code=state.wedding.guest_registration_code?null:crypto.randomUUID();
    try{
      const {data,error}=await sb.from('weddings').update({guest_registration_code:code}).eq('id',state.wedding.id).select('guest_registration_code').single();
      if(error) throw error;
      state.wedding.guest_registration_code=data.guest_registration_code;
      toast(code?'Cadastro aberto ativado. Copie o link para compartilhar.':'Cadastro aberto encerrado.');
      render();
    }catch(error){console.error(error);toast('Não foi possível alterar o cadastro aberto.');toggle.disabled=false;}
  };
  const copy=document.getElementById('copy-guest-registration');
  if(copy) copy.onclick=async()=>{
    const url=guestRegistrationUrl();
    try{await navigator.clipboard.writeText(url);toast('Link de cadastro aberto copiado.');}
    catch{window.prompt('Copie o link de cadastro aberto:',url);}
  };
  const refresh=document.getElementById('refresh-guests');
  if(refresh) refresh.onclick=async()=>{
    refresh.disabled=true;
    await loadWeddingData(state.wedding.id);render();
  };
};
