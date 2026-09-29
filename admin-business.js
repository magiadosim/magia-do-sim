
Object.assign(state, {
  companyEvents: state.companyEvents || [],
  companyMeetings: state.companyMeetings || [],
  financialEntries: state.financialEntries || [],
  eventDocuments: state.eventDocuments || [],
  selectedCompanyEventId: state.selectedCompanyEventId || null,
  dashboardMonth: state.dashboardMonth || new Date().toISOString().slice(0,7),
  dashboardYear: state.dashboardYear || String(new Date().getFullYear()),
  dashboardSector: state.dashboardSector || 'Todos',
  financeMonth: state.financeMonth || new Date().toISOString().slice(0,7),
  financeYear: state.financeYear || String(new Date().getFullYear()),
  financeSector: state.financeSector || 'Todos',
  eventCalendarMonth: state.eventCalendarMonth || new Date().toISOString().slice(0,7),
  serviceClientFilter: state.serviceClientFilter || 'Todos',
  serviceClientSearch: state.serviceClientSearch || '',
  serviceDashboardMonth: state.serviceDashboardMonth || 'Todos',
  serviceDashboardYear: state.serviceDashboardYear || String(new Date().getFullYear())
});

const CRM_STATUSES = [
  'Cliente interessado',
  'Cliente validou proposta',
  'Cliente fechado',
  'Contrato assinado e sinal dado'
];

const COMPANY_SECTORS = [
  'Assessoria completa',
  'Decoração',
  'Serviços terceirizados'
];

function isClosedLead(status){
  return status === 'Cliente fechado' || status === 'Contrato assinado e sinal dado';
}

function crmStatusClass(status){
  return isClosedLead(status) ? 'crm-closed' : 'crm-open';
}

function monthLabel(key){
  if(!key) return '';
  const [y,m] = key.split('-').map(Number);
  return new Date(y,m-1,1).toLocaleDateString('pt-BR',{month:'long',year:'numeric'});
}

function monthKeyFromDate(v){
  return v ? String(v).slice(0,7) : '';
}

function moneyNumber(v){
  return Number(v || 0);
}

function sectorMatches(item, filter){
  return filter === 'Todos' || item.service_sector === filter;
}

const baseLoadAdminData = loadAdminData;
loadAdminData = async function(){
  await baseLoadAdminData();
  if(state.role !== 'admin') return;

  const [
    {data:events,error:eventError},
    {data:meetings,error:meetingError},
    {data:entries,error:entryError}
  ] = await Promise.all([
    sb.from('company_events').select('*').order('event_date',{ascending:true}),
    sb.from('company_meetings').select('*').order('meeting_date',{ascending:true}).order('meeting_time',{ascending:true}),
    sb.from('financial_entries').select('*').order('entry_date',{ascending:false})
  ]);

  if(eventError) console.error(eventError);
  if(meetingError) console.error(meetingError);
  if(entryError) console.error(entryError);

  state.companyEvents = events || [];
  state.companyMeetings = meetings || [];
  state.financialEntries = entries || [];
};

async function loadCompanyEventDocuments(eventId){
  if(!eventId){
    state.eventDocuments = [];
    return;
  }
  const {data,error} = await sb
    .from('event_documents')
    .select('*')
    .eq('event_id',eventId)
    .order('created_at',{ascending:false});

  if(error){
    console.error(error);
    state.eventDocuments = [];
    return;
  }
  state.eventDocuments = data || [];
}

const baseViewFor = viewFor;
viewFor = function(r){
  if(state.role === 'admin'){
    if(r === 'dashboard-empresa') return companyDashboardView();
    if(r === 'crm') return crmView();
    if(r === 'clientes-servicos') return serviceClientsView();
    if(r.startsWith('clientes-servicos/')) return companyEventDetailView(r.split('/')[1]);
    if(r === 'agenda-comercial') return companyMeetingsView();
    if(r === 'calendario-eventos') return companyCalendarView();
    if(r === 'financeiro-empresa') return companyFinanceView();
    if(r.startsWith('eventos/')) return companyEventDetailView(r.split('/')[1]);
  }
  return baseViewFor(r);
};

const baseRender = render;
render = function(){
  if(state.session && state.role !== 'admin'){
    const r = route();
    const adminOnly =
      r === 'dashboard-empresa' ||
      r === 'crm' ||
      r === 'clientes-servicos' ||
      r.startsWith('clientes-servicos/') ||
      r === 'agenda-comercial' ||
      r === 'calendario-eventos' ||
      r === 'financeiro-empresa' ||
      r.startsWith('eventos/');
    if(adminOnly){
      goto('dashboard');
      return;
    }
  }
  return baseRender();
};

const baseShellView = shellView;
shellView = function(r,content){
  let html = baseShellView(r,content);
  if(state.role !== 'admin') return html;

  const active = r.startsWith('eventos/')
    ? 'calendario-eventos'
    : r.startsWith('clientes-servicos/')
      ? 'clientes-servicos'
      : r;
  const adminMenu = `
    <div class="admin-company-nav">
      <div class="admin-nav-label">GESTÃO DA EMPRESA</div>
      <a href="#/dashboard-empresa" class="nav-item ${active==='dashboard-empresa'?'active':''}">${icons.admin}<span>Dashboard</span></a>
      <a href="#/crm" class="nav-item ${active==='crm'?'active':''}">${icons.users}<span>CRM</span></a>
      <a href="#/clientes-servicos" class="nav-item ${active==='clientes-servicos'?'active':''}">${icons.users}<span>Clientes de serviços</span></a>
      <a href="#/agenda-comercial" class="nav-item ${active==='agenda-comercial'?'active':''}">${icons.meeting}<span>Agenda reuniões</span></a>
      <a href="#/calendario-eventos" class="nav-item ${active==='calendario-eventos'?'active':''}">${icons.calendar}<span>Calendário eventos</span></a>
      <a href="#/financeiro-empresa" class="nav-item ${active==='financeiro-empresa'?'active':''}">${icons.money}<span>Financeiro empresa</span></a>
    </div>
  `;
  return html.replace('<div class="sidebar-bottom">', adminMenu + '<div class="sidebar-bottom">');
};

function companyPeriodMatches(date, month, year){
  const key = monthKeyFromDate(date);
  return (!year || key.slice(0,4) === year) && (!month || month === 'Todos' || key.slice(5,7) === month.slice(-2));
}

function filteredCompanyFinance(month, sector, year){
  return state.financialEntries.filter(x =>
    companyPeriodMatches(x.entry_date,month,year) &&
    sectorMatches(x,sector)
  );
}

function companyFinanceTotals(entries){
  const revenue = entries
    .filter(x => x.entry_type === 'Entrada' && x.status === 'Recebido')
    .reduce((s,x)=>s+moneyNumber(x.amount),0);

  const expenses = entries
    .filter(x => x.entry_type === 'Saída' && x.status === 'Pago')
    .reduce((s,x)=>s+moneyNumber(x.amount),0);

  const staff = entries
    .filter(x => x.entry_type === 'Remuneração staff' && x.status === 'Pago')
    .reduce((s,x)=>s+moneyNumber(x.amount),0);

  const expectedIncome = entries
    .filter(x => x.entry_type === 'Entrada' && (x.status === 'Pendente' || x.status === 'Previsto'))
    .reduce((s,x)=>s+moneyNumber(x.amount),0);
  const expectedCosts = entries
    .filter(x => (x.entry_type === 'Saída' || x.entry_type === 'Remuneração staff') && (x.status === 'Pendente' || x.status === 'Previsto'))
    .reduce((s,x)=>s+moneyNumber(x.amount),0);
  const net = revenue-expenses-staff;
  return {revenue,expenses,staff,net,expectedIncome,expectedCosts,projectedNet:net+expectedIncome-expectedCosts};
}

function companyForecastView(totals){
  return `
    <h2 class="finance-section-title">Previstos e pendentes</h2>
    <div class="company-kpis finance-forecast">
      <div class="card company-money-kpi"><span>Entradas previstas</span><strong>${brl(totals.expectedIncome)}</strong><small>A receber</small></div>
      <div class="card company-money-kpi"><span>Gastos previstos</span><strong>${brl(totals.expectedCosts)}</strong><small>Saídas e staff a pagar</small></div>
      <div class="card company-money-kpi net"><span>Saldo projetado</span><strong class="${totals.projectedNet<0?'negative-balance':''}">${brl(totals.projectedNet)}</strong><small>Saldo realizado + entradas previstas − gastos previstos</small></div>
    </div>`;
}

function companyFilterControls(month,sector,prefix,year){
  const options = [{value:'Todos',label:'Todos os setores'}]
    .concat(COMPANY_SECTORS.map(x=>({value:x,label:x})));
  const years = [...new Set([year,String(new Date().getFullYear()),...state.financialEntries.map(x=>String(x.entry_date||'').slice(0,4)),...state.companyEvents.map(x=>String(x.event_date||'').slice(0,4))])].filter(x=>/^\d{4}$/.test(x)).sort().reverse();
  const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const selectedMonth = month === 'Todos' ? 'Todos' : String(month||'').slice(-2);

  return `
    <div class="company-filters">
      <div class="field compact-field">
        <label>Ano</label>
        <select class="input" id="${prefix}-year">${years.map(y=>`<option value="${y}" ${y===year?'selected':''}>${y}</option>`).join('')}</select>
      </div>
      <div class="field compact-field">
        <label>Mês</label>
        <select class="input" id="${prefix}-month"><option value="Todos" ${selectedMonth==='Todos'?'selected':''}>Todos os meses</option>${months.map((name,i)=>{const value=String(i+1).padStart(2,'0');return `<option value="${value}" ${selectedMonth===value?'selected':''}>${name}</option>`}).join('')}</select>
      </div>
      <div class="field compact-field">
        <label>Setor</label>
        <select class="input" id="${prefix}-sector">
          ${options.map(o=>`<option value="${esc(o.value)}" ${o.value===sector?'selected':''}>${esc(o.label)}</option>`).join('')}
        </select>
      </div>
    </div>
  `;
}

function companyDashboardView(){
  const entries = filteredCompanyFinance(state.dashboardMonth,state.dashboardSector,state.dashboardYear);
  const totals = companyFinanceTotals(entries);
  const events = state.companyEvents.filter(e =>
    sectorMatches(e,state.dashboardSector) &&
    companyPeriodMatches(e.event_date,state.dashboardMonth,state.dashboardYear)
  );
  const counts = CRM_STATUSES.map(status=>({
    status,
    count: events.filter(e=>e.status===status).length
  }));

  return `
    <div class="page">
      <div class="page-head">
        <div>
          <h1>Dashboard da empresa</h1>
          <p>Visão financeira e comercial da A Magia do Sim.</p>
        </div>
      </div>

      ${companyFilterControls(state.dashboardMonth,state.dashboardSector,'dashboard',state.dashboardYear)}

      <div class="company-kpis">
        <div class="card company-money-kpi">
          <span>Faturamento total</span>
          <strong>${brl(totals.revenue)}</strong>
          <small>Entradas recebidas</small>
        </div>
        <div class="card company-money-kpi">
          <span>Despesas mensais</span>
          <strong>${brl(totals.expenses)}</strong>
          <small>Saídas pagas</small>
        </div>
        <div class="card company-money-kpi">
          <span>Remuneração staff</span>
          <strong>${brl(totals.staff)}</strong>
          <small>Staff pago</small>
        </div>
        <div class="card company-money-kpi net">
          <span>Valor líquido</span>
          <strong>${brl(totals.net)}</strong>
          <small>Faturamento − despesas − staff</small>
        </div>
      </div>

      ${companyForecastView(totals)}

      <div class="grid grid-2">
        <div class="card card-pad">
          <div class="card-title">
            <h2>Funil comercial</h2>
            <a href="#/crm" class="sub">Abrir CRM ›</a>
          </div>
          <div class="crm-summary">
            ${counts.map(x=>`
              <div>
                <span class="crm-dot ${crmStatusClass(x.status)}"></span>
                <span>${esc(x.status)}</span>
                <strong>${x.count}</strong>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="card card-pad">
          <div class="card-title">
            <h2>Próximos eventos</h2>
            <a href="#/calendario-eventos" class="sub">Ver calendário ›</a>
          </div>
          ${
            events
              .filter(e=>e.event_date)
              .sort((a,b)=>String(a.event_date).localeCompare(String(b.event_date)))
              .slice(0,5)
              .map(e=>`
                <button class="company-quick-row" data-open-company-event="${e.id}">
                  <div>
                    <strong>${esc(e.client_name)}</strong>
                    <span>${dateBR(e.event_date)} • ${esc(e.service_sector)}</span>
                  </div>
                  <span class="crm-inline-status ${crmStatusClass(e.status)}">${esc(e.status)}</span>
                </button>
              `).join('')
            || emptyState('Nenhum evento neste filtro','Cadastre um lead ou evento no CRM.')
          }
        </div>
      </div>
    </div>
  `;
}

function crmView(){
  const columns = CRM_STATUSES.map(status=>{
    const items = state.companyEvents.filter(e=>e.status===status);
    return `
      <section class="crm-column">
        <div class="crm-column-head">
          <div>
            <span class="crm-dot ${crmStatusClass(status)}"></span>
            <strong>${esc(status)}</strong>
          </div>
          <span>${items.length}</span>
        </div>

        <div class="crm-card-list">
          ${
            items.map(e=>`
              <div class="crm-card">
                <button class="crm-card-main" data-open-company-event="${e.id}">
                  <strong>${esc(e.client_name)}</strong>
                  <span class="crm-inline-status ${crmStatusClass(e.status)}">${esc(e.status)}</span>
                  <small>${e.event_date?dateBR(e.event_date):'Data a definir'} • ${esc(e.service_sector)}</small>
                  <small>${e.phone?esc(e.phone)+' • ':''}${brl(e.proposal_value)}</small>
                </button>
                <button class="link-btn" data-edit-company-event="${e.id}">Editar</button>
              </div>
            `).join('')
            || '<div class="crm-empty">Nenhum cliente nesta etapa.</div>'
          }
        </div>
      </section>
    `;
  }).join('');

  return `
    <div class="page">
      <div class="page-head">
        <div>
          <h1>CRM</h1>
          <p>Um funil direto para acompanhar cada oportunidade.</p>
        </div>
        <button class="btn-primary" id="new-lead">+ Novo lead</button>
      </div>
      <div class="crm-board">${columns}</div>
    </div>
  `;
}


function serviceClientsView(){
  const search=String(state.serviceClientSearch||'').trim().toLowerCase();
  const today=new Date().toISOString().slice(0,10);
  const SERVICE_CLIENT_SECTORS=['Decoração','Serviços terceirizados'];
  const selectedSector=SERVICE_CLIENT_SECTORS.includes(state.serviceClientFilter)
    ? state.serviceClientFilter
    : 'Todos';

  const allServiceEvents=state.companyEvents
    .filter(e=>SERVICE_CLIENT_SECTORS.includes(e.service_sector))
    .filter(e=>selectedSector==='Todos'||e.service_sector===selectedSector);

  const years=[...new Set([
    String(new Date().getFullYear()),
    ...state.companyEvents.map(e=>String(e.event_date||'').slice(0,4)).filter(Boolean),
    ...state.companyMeetings.map(m=>String(m.meeting_date||'').slice(0,4)).filter(Boolean),
    ...state.financialEntries.map(x=>String(x.entry_date||'').slice(0,4)).filter(Boolean)
  ])].sort((a,b)=>Number(b)-Number(a));

  const matchPeriod=dateValue=>{
    if(!dateValue) return false;
    const raw=String(dateValue);
    const y=raw.slice(0,4);
    const m=raw.slice(5,7);
    const yearOk=state.serviceDashboardYear==='Todos'||y===state.serviceDashboardYear;
    const monthOk=state.serviceDashboardMonth==='Todos'||m===state.serviceDashboardMonth;
    return yearOk&&monthOk;
  };

  const periodEvents=allServiceEvents.filter(e=>matchPeriod(e.event_date));
  const periodEventIds=new Set(periodEvents.map(e=>e.id));
  const allSelectedEventIds=new Set(allServiceEvents.map(e=>e.id));

  const closedEvents=periodEvents.filter(e=>isClosedLead(e.status));
  const contracted=periodEvents.reduce((s,e)=>s+moneyNumber(e.contracted_value),0);

  const receivedInPeriod=state.financialEntries
    .filter(x=>
      allSelectedEventIds.has(x.event_id) &&
      x.entry_type==='Entrada' &&
      x.status==='Recebido' &&
      matchPeriod(x.entry_date)
    )
    .reduce((s,x)=>s+moneyNumber(x.amount),0);

  const receivedForPeriodEvents=state.financialEntries
    .filter(x=>
      periodEventIds.has(x.event_id) &&
      x.entry_type==='Entrada' &&
      x.status==='Recebido'
    )
    .reduce((s,x)=>s+moneyNumber(x.amount),0);

  const receivable=Math.max(contracted-receivedForPeriodEvents,0);

  const meetingsInPeriod=state.companyMeetings.filter(m=>{
    const event=state.companyEvents.find(e=>e.id===m.event_id);
    const sectorOk=!event||selectedSector==='Todos'||event.service_sector===selectedSector;
    return sectorOk&&matchPeriod(m.meeting_date);
  });

  const upcoming=[...state.companyMeetings]
    .filter(m=>{
      const event=state.companyEvents.find(e=>e.id===m.event_id);
      const sectorOk=!event||selectedSector==='Todos'||event.service_sector===selectedSector;
      return sectorOk&&m.meeting_date>=today;
    })
    .sort((a,b)=>(String(a.meeting_date)+String(a.meeting_time||'')).localeCompare(String(b.meeting_date)+String(b.meeting_time||'')));

  const items=allServiceEvents
    .filter(e=>!search||[e.client_name,e.phone,e.venue,e.service_sector,e.notes].some(v=>String(v||'').toLowerCase().includes(search)))
    .sort((a,b)=>String(a.event_date||'9999-12-31').localeCompare(String(b.event_date||'9999-12-31'))||String(a.client_name||'').localeCompare(String(b.client_name||'')));

  const monthOptions=[
    ['Todos','Todos os meses'],
    ['01','Janeiro'],['02','Fevereiro'],['03','Março'],['04','Abril'],
    ['05','Maio'],['06','Junho'],['07','Julho'],['08','Agosto'],
    ['09','Setembro'],['10','Outubro'],['11','Novembro'],['12','Dezembro']
  ];

  return `
    <div class="page service-clients-page">
      <div class="page-head">
        <div>
          <h1>Clientes de serviços</h1>
          <p>Gerencie clientes de decoração e outros serviços, com evento, reuniões e anotações no mesmo lugar.</p>
        </div>
        <button class="btn-primary" id="new-service-client">+ Novo cliente</button>
      </div>

      <section class="service-dashboard">
        <div class="service-dashboard-head">
          <div>
            <span class="service-dashboard-eyebrow">DASHBOARD DE OUTROS SERVIÇOS</span>
            <h2>Visão do período</h2>
            <p>Somente Decoração e Serviços terceirizados. Assessoria completa fica fora deste painel.</p>
          </div>
          <div class="service-dashboard-filters">
            <div class="field compact-field">
              <label>Mês</label>
              <select class="input" id="service-dashboard-month">
                ${monthOptions.map(([value,label])=>`<option value="${value}" ${state.serviceDashboardMonth===value?'selected':''}>${label}</option>`).join('')}
              </select>
            </div>
            <div class="field compact-field">
              <label>Ano</label>
              <select class="input" id="service-dashboard-year">
                <option value="Todos" ${state.serviceDashboardYear==='Todos'?'selected':''}>Todos os anos</option>
                ${years.map(y=>`<option value="${y}" ${state.serviceDashboardYear===y?'selected':''}>${y}</option>`).join('')}
              </select>
            </div>
          </div>
        </div>

        <div class="service-dashboard-kpis">
          <div class="card service-dashboard-kpi">
            <span>Clientes no período</span>
            <strong>${periodEvents.length}</strong>
            <small>${selectedSector==='Todos'?'todos os serviços':esc(selectedSector)}</small>
          </div>
          <div class="card service-dashboard-kpi">
            <span>Fechados</span>
            <strong>${closedEvents.length}</strong>
            <small>eventos confirmados</small>
          </div>
          <div class="card service-dashboard-kpi money">
            <span>Valor contratado</span>
            <strong>${brl(contracted)}</strong>
            <small>contratos dos eventos do período</small>
          </div>
          <div class="card service-dashboard-kpi money">
            <span>Recebido no período</span>
            <strong>${brl(receivedInPeriod)}</strong>
            <small>entradas recebidas no mês/ano</small>
          </div>
          <div class="card service-dashboard-kpi money">
            <span>A receber</span>
            <strong>${brl(receivable)}</strong>
            <small>saldo dos eventos do período</small>
          </div>
          <div class="card service-dashboard-kpi">
            <span>Reuniões no período</span>
            <strong>${meetingsInPeriod.length}</strong>
            <small>${upcoming[0]?'próxima: '+dateBR(upcoming[0].meeting_date):'nenhuma próxima reunião'}</small>
          </div>
        </div>
      </section>

      <div class="service-client-tools">
        <input class="input" id="service-client-search" type="search" placeholder="Buscar cliente, telefone ou local..." value="${esc(state.serviceClientSearch)}">
        <div class="filters service-client-filters">
          ${['Todos',...SERVICE_CLIENT_SECTORS].map(s=>`<button class="filter-btn ${selectedSector===s?'active':''}" data-service-client-filter="${esc(s)}">${esc(s)}</button>`).join('')}
        </div>
      </div>

      <div class="card service-client-list">
        ${items.length?items.map(e=>{
          const meetings=state.companyMeetings.filter(m=>m.event_id===e.id&&m.meeting_date>=today).sort((a,b)=>(String(a.meeting_date)+String(a.meeting_time||'')).localeCompare(String(b.meeting_date)+String(b.meeting_time||'')));
          return `
            <a href="#/clientes-servicos/${e.id}" class="service-client-row">
              <div class="service-client-avatar">${esc((e.client_name||'C')[0].toUpperCase())}</div>
              <div class="service-client-main"><strong>${esc(e.client_name)}</strong><span>${esc(e.service_sector)} • ${esc(e.phone||'sem telefone')}</span></div>
              <div class="service-client-date"><span>Evento</span><strong>${e.event_date?dateBR(e.event_date):'A definir'}</strong></div>
              <div class="service-client-date"><span>Próxima reunião</span><strong>${meetings[0]?dateBR(meetings[0].meeting_date):'—'}</strong></div>
              <span class="crm-inline-status ${crmStatusClass(e.status)}">${esc(e.status)}</span>
              <span class="service-client-arrow">›</span>
            </a>
          `;
        }).join(''):emptyState('Nenhum cliente encontrado','Cadastre um cliente de decoração ou outro serviço para começar.')}
      </div>
    </div>
  `;
}

function companyMeetingsView(){
  const today = new Date().toISOString().slice(0,10);
  const items = [...state.companyMeetings].sort((a,b)=>
    (String(a.meeting_date)+String(a.meeting_time||''))
      .localeCompare(String(b.meeting_date)+String(b.meeting_time||''))
  );

  return `
    <div class="page">
      <div class="page-head">
        <div>
          <h1>Agenda de reuniões</h1>
          <p>Reuniões comerciais e alinhamentos em uma agenda separada dos eventos.</p>
        </div>
        <button class="btn-primary" id="new-company-meeting">+ Nova reunião</button>
      </div>

      <div class="card list-card">
        ${
          items.map(m=>`
            <div class="list-row company-meeting-row ${m.meeting_date<today?'past':''}">
              <div class="meeting-date-small">
                <strong>${String(m.meeting_date||'').slice(8,10)||'—'}</strong>
                <span>${m.meeting_date?new Date(m.meeting_date+'T12:00:00').toLocaleDateString('pt-BR',{month:'short'}).replace('.','').toUpperCase():'—'}</span>
              </div>
              <div class="vendor-name">
                <strong>${esc(m.client_name)}</strong>
                <span>${esc(m.meeting_type||'Reunião')} • ${timeBR(m.meeting_time)}</span>
              </div>
              <div class="small muted">${dateBR(m.meeting_date)}</div>
              <button class="btn-secondary" data-edit-company-meeting="${m.id}">Editar</button>
            </div>
          `).join('')
          || emptyState('Nenhuma reunião agendada','Cadastre a primeira reunião comercial.')
        }
      </div>
    </div>
  `;
}

function changeEventCalendarMonth(delta){
  const [y,m] = state.eventCalendarMonth.split('-').map(Number);
  const d = new Date(y,m-1+delta,1);
  state.eventCalendarMonth =
    `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  render();
}

function companyCalendarView(){
  const [year,month] = state.eventCalendarMonth.split('-').map(Number);
  const first = new Date(year,month-1,1);
  const start = new Date(year,month-1,1-first.getDay());
  const cells = [];

  for(let i=0;i<42;i++){
    const d = new Date(start);
    d.setDate(start.getDate()+i);
    const iso =
      `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const events = state.companyEvents.filter(e=>e.event_date===iso);
    const meetings = state.companyMeetings.filter(m=>m.meeting_date===iso);

    cells.push(`
      <div class="company-calendar-day ${d.getMonth()!==month-1?'outside':''}">
        <div class="company-calendar-number">${d.getDate()}</div>
        <div class="company-calendar-events">
          ${events.map(e=>`
            <button class="company-calendar-event ${crmStatusClass(e.status)}" data-open-company-event="${e.id}">
              <strong>${esc(e.client_name)}</strong>
              <span>${esc(e.status)}</span>
              <small>${e.event_time?timeBR(e.event_time)+' • ':''}${esc(e.service_sector)}</small>
            </button>
          `).join('')}
          ${meetings.map(m=>`
            <button class="company-calendar-event company-calendar-meeting"
              ${m.event_id?`data-open-service-client="${m.event_id}"`:`data-edit-company-meeting="${m.id}"`}>
              <strong>Reunião • ${esc(m.client_name)}</strong>
              <span>${esc(m.meeting_type||'Reunião')}</span>
              <small>${m.meeting_time?timeBR(m.meeting_time):'horário a definir'}</small>
            </button>
          `).join('')}
        </div>
      </div>
    `);
  }

  return `
    <div class="page">
      <div class="page-head">
        <div>
          <h1>Calendário de eventos</h1>
          <p>Eventos e reuniões dos seus clientes no mesmo calendário. Verde = fechado; vermelho = em negociação.</p>
        </div>
        <button class="btn-primary" id="new-lead">+ Novo evento/lead</button>
      </div>

      <div class="card company-calendar-card">
        <div class="company-calendar-toolbar">
          <div class="action-row">
            <button class="btn-secondary" id="calendar-prev">‹</button>
            <button class="btn-secondary" id="calendar-today">Hoje</button>
            <button class="btn-secondary" id="calendar-next">›</button>
          </div>
          <h2>${esc(monthLabel(state.eventCalendarMonth))}</h2>
          <div class="calendar-legend">
            <span><i class="crm-open"></i>Não fechado</span>
            <span><i class="crm-closed"></i>Fechado</span>
            <span><i class="calendar-meeting-dot"></i>Reunião</span>
          </div>
        </div>

        <div class="company-calendar-weekdays">
          ${['DOM','SEG','TER','QUA','QUI','SEX','SÁB'].map(x=>`<div>${x}</div>`).join('')}
        </div>
        <div class="company-calendar-grid">${cells.join('')}</div>
      </div>
    </div>
  `;
}

function companyFinanceView(){
  const entries = filteredCompanyFinance(state.financeMonth,state.financeSector,state.financeYear);
  const totals = companyFinanceTotals(entries);
  const sorted = [...entries].sort((a,b)=>String(b.entry_date).localeCompare(String(a.entry_date)));

  return `
    <div class="page">
      <div class="page-head">
        <div>
          <h1>Financeiro da empresa</h1>
          <p>Entradas, saídas e remuneração do staff em uma única base.</p>
        </div>
        <button class="btn-primary" id="new-financial-entry">+ Novo lançamento</button>
      </div>

      ${companyFilterControls(state.financeMonth,state.financeSector,'finance',state.financeYear)}

      <h2 class="finance-section-title">Realizado</h2>
      <div class="company-kpis">
        <div class="card company-money-kpi">
          <span>Faturamento total</span>
          <strong>${brl(totals.revenue)}</strong>
        </div>
        <div class="card company-money-kpi">
          <span>Despesas pagas</span>
          <strong>${brl(totals.expenses)}</strong>
        </div>
        <div class="card company-money-kpi">
          <span>Remuneração staff</span>
          <strong>${brl(totals.staff)}</strong>
        </div>
        <div class="card company-money-kpi net">
          <span>Saldo realizado</span>
          <strong class="${totals.net<0?'negative-balance':''}">${brl(totals.net)}</strong>
        </div>
      </div>

      ${companyForecastView(totals)}

      <div class="card list-card">
        ${
          sorted.map(x=>{
            const ev = state.companyEvents.find(e=>e.id===x.event_id);
            return `
              <div class="list-row finance-company-row">
                <div class="finance-kind ${x.entry_type==='Entrada'?'income':x.entry_type==='Remuneração staff'?'staff':'expense'}">
                  ${x.entry_type==='Entrada'?'↑':x.entry_type==='Remuneração staff'?'S':'↓'}
                </div>
                <div class="vendor-name">
                  <strong>${esc(x.description)}</strong>
                  <span>${dateBR(x.entry_date)} • ${esc(x.category||x.entry_type)}${ev?' • '+esc(ev.client_name):''}</span>
                </div>
                <div class="small muted">${esc(x.service_sector||'Geral')}</div>
                <span class="badge ${x.status==='Recebido'||x.status==='Pago'?'success':'warning'}">${esc(x.status)}</span>
                <strong>${brl(x.amount)}</strong>
                <button class="link-btn" data-edit-financial-entry="${x.id}">Editar</button>
              </div>
            `;
          }).join('')
          || emptyState('Nenhum lançamento neste filtro','Cadastre entradas, saídas e remuneração do staff.')
        }
      </div>
    </div>
  `;
}

function companyEventDetailView(id){
  const e = state.companyEvents.find(x=>x.id===id);
  const fromServiceClients = route().startsWith('clientes-servicos/');
  const clientMeetings = state.companyMeetings
    .filter(m=>m.event_id===id)
    .sort((a,b)=>(String(b.meeting_date)+String(b.meeting_time||'')).localeCompare(String(a.meeting_date)+String(a.meeting_time||'')));
  if(!e){
    return `<div class="page">${emptyState('Evento não encontrado','Volte ao calendário e selecione um evento.')}</div>`;
  }

  const entries = state.financialEntries.filter(x=>x.event_id===id);
  const received = entries
    .filter(x=>x.entry_type==='Entrada' && x.status==='Recebido')
    .reduce((s,x)=>s+moneyNumber(x.amount),0);

  const costs = entries
    .filter(x=>x.entry_type!=='Entrada')
    .reduce((s,x)=>s+moneyNumber(x.amount),0);

  const contracted = moneyNumber(e.contracted_value || e.proposal_value);
  const receivable = Math.max(contracted-received,0);
  const profit = contracted-costs;

  return `
    <div class="page">
      <div class="page-head">
        <div>
          <a class="link-btn" href="${fromServiceClients?'#/clientes-servicos':'#/calendario-eventos'}">← ${fromServiceClients?'Voltar aos clientes':'Voltar ao calendário'}</a>
          <h1 style="margin-top:8px">${esc(e.client_name)}</h1>
          <div class="crm-inline-status ${crmStatusClass(e.status)}" style="display:inline-flex;margin-top:5px">
            ${esc(e.status)}
          </div>
        </div>
        <button class="btn-primary" id="edit-company-event">Editar cadastro</button>
      </div>

      <div class="event-detail-grid">
        <div class="card card-pad">
          <div class="card-title"><h2>Dados do evento</h2></div>
          <div class="contract-lines">
            <div class="contract-line"><span>Telefone</span><strong>${esc(e.phone||'—')}</strong></div>
            <div class="contract-line"><span>Data</span><strong>${dateBR(e.event_date)}</strong></div>
            <div class="contract-line"><span>Horário</span><strong>${timeBR(e.event_time)}</strong></div>
            <div class="contract-line"><span>Local</span><strong>${esc(e.venue||'—')}</strong></div>
            <div class="contract-line"><span>Setor</span><strong>${esc(e.service_sector)}</strong></div>
            <div class="contract-line"><span>Proposta</span><strong>${brl(e.proposal_value)}</strong></div>
            <div class="contract-line"><span>Valor contratado</span><strong>${brl(e.contracted_value)}</strong></div>
          </div>
          <div class="notes">
            <strong style="color:var(--brown)">Observações</strong><br>
            ${esc(e.notes||'Sem observações.')}
          </div>
        </div>

        <div class="card card-pad">
          <div class="card-title">
            <h2>Resumo financeiro do evento</h2>
            <a href="#/financeiro-empresa" class="sub">Financeiro ›</a>
          </div>
          <div class="event-money-grid">
            <div><span>Recebido</span><strong>${brl(received)}</strong></div>
            <div><span>A receber</span><strong>${brl(receivable)}</strong></div>
            <div><span>Custos</span><strong>${brl(costs)}</strong></div>
            <div class="profit"><span>Lucro previsto</span><strong>${brl(profit)}</strong></div>
          </div>
          <p class="tiny muted">Custos consideram saídas e remuneração de staff vinculadas ao evento. O lucro previsto usa o valor contratado.</p>
        </div>
      </div>

      <div class="card card-pad service-client-meetings">
        <div class="card-title">
          <div>
            <h2>Reuniões e anotações</h2>
            <span class="sub">Registre cada conversa, alinhamento e decisão deste cliente.</span>
          </div>
          <button class="btn-primary" id="new-client-meeting" data-event-id="${e.id}">+ Reunião / nota</button>
        </div>
        <div class="service-meeting-history">
          ${clientMeetings.length?clientMeetings.map(m=>`
            <div class="service-meeting-note">
              <div class="meeting-date-small">
                <strong>${String(m.meeting_date||'').slice(8,10)||'—'}</strong>
                <span>${m.meeting_date?new Date(m.meeting_date+'T12:00:00').toLocaleDateString('pt-BR',{month:'short'}).replace('.','').toUpperCase():'—'}</span>
              </div>
              <div class="service-meeting-copy">
                <strong>${esc(m.meeting_type||'Reunião')}</strong>
                <span>${dateBR(m.meeting_date)}${m.meeting_time?' às '+timeBR(m.meeting_time):''}</span>
                <p>${esc(m.notes||'Sem anotações registradas.')}</p>
              </div>
              <button class="btn-secondary" data-edit-company-meeting="${m.id}">Editar</button>
            </div>
          `).join(''):emptyState('Nenhuma reunião registrada','Use “+ Reunião / nota” para criar o histórico deste cliente.')}
        </div>
      </div>

      <div class="grid grid-2" style="margin-top:18px">
        <div class="card card-pad">
          <div class="card-title"><h2>Contratos e documentos</h2></div>
          <div class="event-upload">
            <input type="file" id="event-document-file" class="input" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png">
            <button class="btn-primary" id="upload-event-doc">Enviar documento</button>
          </div>
          <div class="contract-lines">
            ${
              state.eventDocuments.map(d=>`
                <div class="contract-line">
                  <span>${esc(d.name)}</span>
                  <button class="btn-secondary" data-view-event-doc="${d.id}">Abrir</button>
                </div>
              `).join('')
              || '<div class="muted small">Nenhum documento anexado.</div>'
            }
          </div>
        </div>

        <div class="card card-pad">
          <div class="card-title">
            <h2>Lançamentos vinculados</h2>
            <button class="btn-secondary" id="new-financial-entry">+ Lançamento</button>
          </div>
          <div class="contract-lines">
            ${
              entries.slice(0,8).map(x=>`
                <div class="contract-line">
                  <span>
                    ${esc(x.description)}<br>
                    <small class="muted">${dateBR(x.entry_date)} • ${esc(x.entry_type)}</small>
                  </span>
                  <strong>${brl(x.amount)}</strong>
                </div>
              `).join('')
              || '<div class="muted small">Nenhum lançamento vinculado a este evento.</div>'
            }
          </div>
        </div>
      </div>
    </div>
  `;
}

function openCompanyEventEditor(e,asServiceClient=false){
  const serviceClientMode = asServiceClient || route().startsWith('clientes-servicos');
  const body =
    field('Nome do cliente','client_name',e?.client_name||'') +
    field('Telefone','phone',e?.phone||'') +
    field('Data do evento','event_date',e?.event_date||'','date') +
    field('Horário','event_time',(e?.event_time||'').slice(0,5),'time') +
    field('Local','venue',e?.venue||'') +
    selectField(
      'Setor / serviço',
      'service_sector',
      serviceClientMode?['Decoração','Serviços terceirizados']:COMPANY_SECTORS,
      e?.service_sector||(serviceClientMode?'Decoração':'Assessoria completa')
    ) +
    selectField('Status','status',CRM_STATUSES,e?.status||'Cliente interessado') +
    field('Valor da proposta','proposal_value',e?.proposal_value||0,'number','step="0.01"') +
    field('Valor contratado','contracted_value',e?.contracted_value||0,'number','step="0.01"') +
    `<div class="field">
      <label>Observações</label>
      <textarea class="input" style="padding:13px;min-height:100px" name="notes">${esc(e?.notes||'')}</textarea>
    </div>`;

  modal(
    e?(serviceClientMode?'Editar cliente de serviço':'Editar cliente/evento'):(serviceClientMode?'Novo cliente de serviço':'Novo lead'),
    body,
    e?'Salvar':'Cadastrar',
    async back=>{
    const f = Object.fromEntries(new FormData(back.querySelector('.modal')).entries());
    const payload = {
      client_name: String(f.client_name||'').trim(),
      phone: String(f.phone||'').trim() || null,
      event_date: f.event_date || null,
      event_time: f.event_time || null,
      venue: String(f.venue||'').trim() || null,
      service_sector: f.service_sector,
      status: f.status,
      proposal_value: Number(f.proposal_value||0),
      contracted_value: Number(f.contracted_value||0),
      notes: String(f.notes||'').trim() || null
    };

    if(!payload.client_name){
      toast('Informe o nome do cliente.');
      return false;
    }

    const res = e
      ? await sb.from('company_events').update(payload).eq('id',e.id).select().single()
      : await sb.from('company_events').insert(payload).select().single();

    if(res.error){
      console.error(res.error);
      toast('Não foi possível salvar o lead/evento.');
      return false;
    }

    await loadAdminData();
    if(state.selectedCompanyEventId){
      await loadCompanyEventDocuments(state.selectedCompanyEventId);
    }
    toast(e?'Cadastro atualizado.':(serviceClientMode?'Cliente cadastrado.':'Lead cadastrado.'));
    render();
    return true;
  });
}

function openCompanyMeetingEditor(m,preselectedEventId=''){
  const eventOptions = [{value:'',label:'Sem vínculo'}]
    .concat(state.companyEvents.map(e=>({
      value:e.id,
      label:`${e.client_name} — ${e.event_date?dateBR(e.event_date):'sem data'}`
    })));

  const body =
    selectField('Cliente/evento','event_id',eventOptions,m?.event_id||preselectedEventId||'') +
    field('Nome do cliente','client_name',m?.client_name||state.companyEvents.find(e=>e.id===preselectedEventId)?.client_name||'') +
    field('Data','meeting_date',m?.meeting_date||'','date') +
    field('Horário','meeting_time',(m?.meeting_time||'').slice(0,5),'time') +
    field('Tipo de reunião','meeting_type',m?.meeting_type||'Reunião comercial') +
    `<div class="field">
      <label>Observações</label>
      <textarea class="input" style="padding:13px;min-height:90px" name="notes">${esc(m?.notes||'')}</textarea>
    </div>`;

  const back = modal(m?'Editar reunião':'Nova reunião',body,m?'Salvar':'Agendar',async el=>{
    const f = Object.fromEntries(new FormData(el.querySelector('.modal')).entries());
    const payload = {
      event_id: f.event_id || null,
      client_name: String(f.client_name||'').trim(),
      meeting_date: f.meeting_date || null,
      meeting_time: f.meeting_time || null,
      meeting_type: String(f.meeting_type||'').trim() || null,
      notes: String(f.notes||'').trim() || null
    };

    if(!payload.client_name || !payload.meeting_date){
      toast('Informe cliente e data.');
      return false;
    }

    const res = m
      ? await sb.from('company_meetings').update(payload).eq('id',m.id)
      : await sb.from('company_meetings').insert(payload);

    if(res.error){
      console.error(res.error);
      toast('Não foi possível salvar a reunião.');
      return false;
    }

    await loadAdminData();
    toast('Reunião salva.');
    render();
    return true;
  });

  const sel = back.querySelector('[name=event_id]');
  const name = back.querySelector('[name=client_name]');
  if(sel && name){
    sel.onchange = ()=>{
      const ev = state.companyEvents.find(e=>e.id===sel.value);
      if(ev) name.value = ev.client_name;
    };
  }
}

function openFinancialEntryEditor(x){
  const eventOptions = [{value:'',label:'Despesa/receita geral'}]
    .concat(state.companyEvents.map(e=>({
      value:e.id,
      label:`${e.client_name} — ${e.event_date?dateBR(e.event_date):'sem data'}`
    })));

  const preselectedEvent =
    x?.event_id ||
    (route().startsWith('eventos/') ? route().split('/')[1] : '');

  const body =
    field('Data','entry_date',x?.entry_date||new Date().toISOString().slice(0,10),'date') +
    selectField('Tipo','entry_type',['Entrada','Saída','Remuneração staff'],x?.entry_type||'Entrada') +
    field('Descrição','description',x?.description||'') +
    selectField(
      'Setor',
      'service_sector',
      [{value:'',label:'Geral'}].concat(COMPANY_SECTORS.map(s=>({value:s,label:s}))),
      x?.service_sector||''
    ) +
    field('Categoria','category',x?.category||'') +
    field('Valor','amount',x?.amount||0,'number','step="0.01"') +
    selectField('Status','status',['Previsto','Pendente','Recebido','Pago'],x?.status||'Pendente') +
    selectField('Cliente/evento','event_id',eventOptions,preselectedEvent) +
    `<div class="field">
      <label>Observações</label>
      <textarea class="input" style="padding:13px;min-height:80px" name="notes">${esc(x?.notes||'')}</textarea>
    </div>`;

  modal(x?'Editar lançamento':'Novo lançamento',body,x?'Salvar':'Lançar',async back=>{
    const f = Object.fromEntries(new FormData(back.querySelector('.modal')).entries());
    const payload = {
      entry_date: f.entry_date,
      entry_type: f.entry_type,
      description: String(f.description||'').trim(),
      service_sector: f.service_sector || null,
      category: String(f.category||'').trim() || null,
      amount: Number(f.amount||0),
      status: f.status,
      event_id: f.event_id || null,
      notes: String(f.notes||'').trim() || null
    };

    if(!payload.entry_date || !payload.description || payload.amount < 0){
      toast('Preencha data, descrição e valor.');
      return false;
    }

    const res = x
      ? await sb.from('financial_entries').update(payload).eq('id',x.id)
      : await sb.from('financial_entries').insert(payload);

    if(res.error){
      console.error(res.error);
      toast('Não foi possível salvar o lançamento.');
      return false;
    }

    await loadAdminData();
    toast('Lançamento salvo.');
    render();
    return true;
  });
}

async function uploadCompanyEventDocument(){
  const id = route().split('/')[1];
  const e = state.companyEvents.find(x=>x.id===id);
  const input = document.getElementById('event-document-file');
  const file = input?.files?.[0];

  if(!e || !file){
    toast('Selecione um arquivo.');
    return;
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g,'_');
  const path = `${id}/${Date.now()}-${safeName}`;
  const btn = document.getElementById('upload-event-doc');

  if(btn){
    btn.disabled = true;
    btn.textContent = 'Enviando...';
  }

  try{
    const {error:uploadError} = await sb.storage
      .from('event-documents')
      .upload(path,file,{upsert:false});

    if(uploadError){
      console.error(uploadError);
      toast('Não foi possível enviar o documento.');
      return;
    }

    const {error:dbError} = await sb
      .from('event_documents')
      .insert({event_id:id,name:file.name,file_path:path});

    if(dbError){
      console.error(dbError);
      await sb.storage.from('event-documents').remove([path]);
      toast('Não foi possível registrar o documento.');
      return;
    }

    await loadCompanyEventDocuments(id);
    toast('Documento anexado.');
    render();
  } finally {
    if(btn){
      btn.disabled = false;
      btn.textContent = 'Enviar documento';
    }
  }
}

const baseBindView = bindView;
bindView = function(r){
  baseBindView(r);

  const newLead = document.getElementById('new-lead');
  if(newLead) newLead.onclick = ()=>openCompanyEventEditor(null);

  const newServiceClient = document.getElementById('new-service-client');
  if(newServiceClient) newServiceClient.onclick = ()=>openCompanyEventEditor(null,true);

  const serviceSearch = document.getElementById('service-client-search');
  if(serviceSearch){
    serviceSearch.onchange = ()=>{
      state.serviceClientSearch = serviceSearch.value;
      render();
    };
  }

  document.querySelectorAll('[data-service-client-filter]').forEach(b=>{
    b.onclick=()=>{
      state.serviceClientFilter=b.dataset.serviceClientFilter;
      render();
    };
  });

  const serviceDashboardMonth=document.getElementById('service-dashboard-month');
  if(serviceDashboardMonth){
    serviceDashboardMonth.onchange=()=>{
      state.serviceDashboardMonth=serviceDashboardMonth.value;
      render();
    };
  }

  const serviceDashboardYear=document.getElementById('service-dashboard-year');
  if(serviceDashboardYear){
    serviceDashboardYear.onchange=()=>{
      state.serviceDashboardYear=serviceDashboardYear.value;
      render();
    };
  }

  document.querySelectorAll('[data-open-service-client]').forEach(b=>{
    b.onclick=()=>{
      goto('clientes-servicos/'+b.dataset.openServiceClient);
      render();
    };
  });

  document.querySelectorAll('[data-edit-company-event]').forEach(b=>{
    b.onclick = ()=>openCompanyEventEditor(
      state.companyEvents.find(e=>e.id===b.dataset.editCompanyEvent)
    );
  });

  document.querySelectorAll('[data-open-company-event]').forEach(b=>{
    b.onclick = async ()=>{
      state.selectedCompanyEventId = b.dataset.openCompanyEvent;
      await loadCompanyEventDocuments(state.selectedCompanyEventId);
      goto('eventos/'+state.selectedCompanyEventId);
      render();
    };
  });

  const editEvent = document.getElementById('edit-company-event');
  if(editEvent){
    const id = route().split('/')[1];
    editEvent.onclick = ()=>openCompanyEventEditor(
      state.companyEvents.find(e=>e.id===id)
    );
  }

  const newMeeting = document.getElementById('new-company-meeting');
  if(newMeeting) newMeeting.onclick = ()=>openCompanyMeetingEditor(null);

  const newClientMeeting = document.getElementById('new-client-meeting');
  if(newClientMeeting) newClientMeeting.onclick = ()=>openCompanyMeetingEditor(null,newClientMeeting.dataset.eventId||'');

  document.querySelectorAll('[data-edit-company-meeting]').forEach(b=>{
    b.onclick = ()=>openCompanyMeetingEditor(
      state.companyMeetings.find(m=>m.id===b.dataset.editCompanyMeeting)
    );
  });

  const newEntry = document.getElementById('new-financial-entry');
  if(newEntry) newEntry.onclick = ()=>openFinancialEntryEditor(null);

  document.querySelectorAll('[data-edit-financial-entry]').forEach(b=>{
    b.onclick = ()=>openFinancialEntryEditor(
      state.financialEntries.find(x=>x.id===b.dataset.editFinancialEntry)
    );
  });

  const upload = document.getElementById('upload-event-doc');
  if(upload) upload.onclick = uploadCompanyEventDocument;

  document.querySelectorAll('[data-view-event-doc]').forEach(b=>{
    b.onclick = async ()=>{
      const d = state.eventDocuments.find(x=>x.id===b.dataset.viewEventDoc);
      if(!d) return;
      const {data,error} = await sb.storage
        .from('event-documents')
        .createSignedUrl(d.file_path,120);

      if(error || !data?.signedUrl){
        toast('Não foi possível abrir o documento.');
        return;
      }
      window.open(data.signedUrl,'_blank','noopener');
    };
  });

  const dashMonth = document.getElementById('dashboard-month');
  if(dashMonth) dashMonth.onchange = ()=>{
    state.dashboardMonth = dashMonth.value;
    render();
  };

  const dashYear = document.getElementById('dashboard-year');
  if(dashYear) dashYear.onchange = ()=>{
    state.dashboardYear = dashYear.value;
    render();
  };

  const dashSector = document.getElementById('dashboard-sector');
  if(dashSector) dashSector.onchange = ()=>{
    state.dashboardSector = dashSector.value;
    render();
  };

  const finMonth = document.getElementById('finance-month');
  if(finMonth) finMonth.onchange = ()=>{
    state.financeMonth = finMonth.value;
    render();
  };

  const finYear = document.getElementById('finance-year');
  if(finYear) finYear.onchange = ()=>{
    state.financeYear = finYear.value;
    render();
  };

  const finSector = document.getElementById('finance-sector');
  if(finSector) finSector.onchange = ()=>{
    state.financeSector = finSector.value;
    render();
  };

  const prev = document.getElementById('calendar-prev');
  if(prev) prev.onclick = ()=>changeEventCalendarMonth(-1);

  const next = document.getElementById('calendar-next');
  if(next) next.onclick = ()=>changeEventCalendarMonth(1);

  const today = document.getElementById('calendar-today');
  if(today) today.onclick = ()=>{
    state.eventCalendarMonth = new Date().toISOString().slice(0,7);
    render();
  };
};

window.addEventListener('hashchange',async ()=>{
  const r = route();
  if(state.role === 'admin' && r.startsWith('eventos/')){
    state.selectedCompanyEventId = r.split('/')[1];
    await loadCompanyEventDocuments(state.selectedCompanyEventId);
    render();
  }
});


/* Controles rápidos de navegação vertical no ADMIN */
const businessShellWithScrollControls = shellView;
shellView = function(r,content){
  let html = businessShellWithScrollControls(r,content);
  if(state.role !== 'admin') return html;

  const controls = `
    <div class="admin-scroll-controls" aria-label="Atalhos de rolagem">
      <button type="button" id="scroll-page-up" class="admin-scroll-btn" title="Subir para o início" aria-label="Subir para o início">↑</button>
      <button type="button" id="scroll-page-down" class="admin-scroll-btn" title="Descer para o final" aria-label="Descer para o final">↓</button>
    </div>
  `;

  return html.replace('</main>', controls + '</main>');
};

const businessBindViewWithScrollControls = bindView;
bindView = function(r){
  businessBindViewWithScrollControls(r);

  const up = document.getElementById('scroll-page-up');
  const down = document.getElementById('scroll-page-down');

  if(up){
    up.onclick = ()=>window.scrollTo({top:0,behavior:'smooth'});
  }

  if(down){
    down.onclick = ()=>window.scrollTo({
      top:Math.max(document.documentElement.scrollHeight,document.body.scrollHeight),
      behavior:'smooth'
    });
  }
};
