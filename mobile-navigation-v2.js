
(function(){
  function mobileRouteKey(r){
    if(r.startsWith('fornecedores/')) return 'fornecedores';
    if(r.startsWith('eventos/')) return 'calendario-eventos';
    if(r.startsWith('clientes-servicos/')) return 'clientes-servicos';
    return r;
  }

  function mobileBottomItems(){
    if(state.role==='admin'){
      return [
        ['admin','Painel','admin'],
        ['dashboard-empresa','Dashboard','admin'],
        ['crm','CRM','users'],
        ['calendario-eventos','Eventos','calendar'],
        ['menu','Mais','menu']
      ];
    }
    return [
      ['dashboard','Início','home'],
      ['fornecedores','Fornecedores','users'],
      ['checklist','Checklist','check'],
      ['financeiro','Financeiro','money'],
      ['menu','Mais','menu']
    ];
  }

  function mobileMoreIsActive(r){
    const key=mobileRouteKey(r);
    if(state.role==='admin'){
      return !['admin','dashboard-empresa','crm','calendario-eventos'].includes(key);
    }
    return !['dashboard','fornecedores','checklist','financeiro'].includes(key);
  }

  function mobileNavHtml(r){
    const active=mobileRouteKey(r);
    return `
      <nav class="mobile-nav mobile-nav-v2" aria-label="Navegação principal">
        ${mobileBottomItems().map(([key,label,icon])=>{
          const selected=key==='menu'?mobileMoreIsActive(r):active===key;
          return `<a href="${key==='menu'?'#':`#/${key}`}" data-mobile="${key}" class="${selected?'active':''}" ${selected?'aria-current="page"':''}>
            ${icons[icon]||icons.menu}
            <span>${label}</span>
          </a>`;
        }).join('')}
      </nav>
    `;
  }

  function mobileBrandHtml(){
    const subtitle=state.role==='admin'?'Admin':'Área dos Noivos';
    return `<div class="mobile-app-brand"><img src="assets/logo-oficial.png" alt="A Magia do Sim"><div><strong>A Magia do Sim</strong><span>${subtitle}</span></div></div>`;
  }

  const baseShellViewMobileV2=shellView;
  shellView=function(r,content){
    let html=baseShellViewMobileV2(r,content);

    html=html.replace(/<nav class="mobile-nav">[\s\S]*?<\/nav>/,mobileNavHtml(r));

    const brandStart=html.indexOf('<div class="mobile-app-brand">');
    const brandEnd=brandStart>=0?html.indexOf('<div class="topbar-label',brandStart):-1;
    if(brandStart>=0&&brandEnd>brandStart){
      html=html.slice(0,brandStart)+mobileBrandHtml()+html.slice(brandEnd);
    }

    return html;
  };

  function mobileMenuSections(){
    if(state.role==='admin'){
      const sections=[
        {
          title:'Gestão da empresa',
          items:[
            ['clientes-servicos','Clientes de serviços','users'],
            ['agenda-comercial','Agenda de reuniões','meeting'],
            ['financeiro-empresa','Financeiro da empresa','money'],
            ['cadastros-gerais','Cadastros gerais','users'],
            ['backup-seguranca','Backup e Segurança','file']
          ]
        }
      ];

      if(state.wedding){
        sections.push({
          title:'Casamento selecionado',
          items:[
            ['dashboard','Visão do casamento','home'],
            ['meu-casamento','Meu casamento','heart'],
            ['fornecedores','Fornecedores','users'],
            ['checklist','Checklist','check'],
            ['cronograma','Cronograma','calendar'],
            ['cerimonial','Cerimonial','calendar'],
            ['organizacao-casa','Organização da casa','home'],
            ['convidados','Lista de convidados','users'],
            ['presentes','Lista de presentes','heart'],
            ['documentos','Documentos','file'],
            ['financeiro','Financeiro do casamento','money'],
            ['compras','Compras','money'],
            ['outros-gastos','Outros Gastos','money'],
            ['lua-de-mel','Lua de mel','heart'],
            ['reunioes','Reuniões do casamento','meeting']
          ]
        });
      }

      sections.push({
        title:'Conta',
        items:[
          ['perfil','Perfil','user']
        ]
      });
      return sections;
    }

    return [
      {
        title:'Planejamento',
        items:[
          ['meu-casamento','Meu casamento','heart'],
          ['cronograma','Cronograma','calendar'],
          ['cerimonial','Cerimonial','calendar'],
          ['organizacao-casa','Organização da casa','home'],
          ['convidados','Lista de convidados','users'],
            ['presentes','Lista de presentes','heart'],
          ['documentos','Documentos','file'],
          ['reunioes','Reuniões','meeting']
        ]
      },
      {
        title:'Gastos',
        items:[
          ['financeiro','Financeiro','money'],
          ['compras','Compras','money'],
          ['outros-gastos','Outros Gastos','money'],
          ['lua-de-mel','Lua de mel','heart']
        ]
      },
      {
        title:'Conta',
        items:[
          ['meus-dados','Meus dados','file'],
          ['perfil','Perfil','user']
        ]
      }
    ];
  }

  function closeMobileMore(){
    document.querySelector('.mobile-more-backdrop')?.remove();
    document.body.classList.remove('mobile-menu-open');
  }

  function openMobileMoreMenu(){
    closeMobileMore();

    const active=mobileRouteKey(route());
    const back=document.createElement('div');
    back.className='mobile-more-backdrop';

    const sections=mobileMenuSections().map(section=>`
      <section class="mobile-more-section">
        <div class="mobile-more-section-title">${esc(section.title)}</div>
        <div class="mobile-more-grid">
          ${section.items.map(([key,label,icon])=>`
            <a href="#/${key}" class="mobile-more-item ${active===key?'active':''}" data-mobile-close>
              <span class="mobile-more-icon">${icons[icon]||icons.file}</span>
              <span>${esc(label)}</span>
            </a>
          `).join('')}
        </div>
      </section>
    `).join('');

    back.innerHTML=`
      <div class="mobile-more-sheet" role="dialog" aria-modal="true" aria-label="Mais opções">
        <div class="mobile-more-handle"></div>
        <div class="mobile-more-head">
          <div>
            <strong>${state.role==='admin'?'Acesso rápido ADMIN':'Mais opções'}</strong>
            <span>${state.role==='admin'?'Gerencie a empresa e o casamento selecionado.':'Acesse todas as áreas do seu casamento.'}</span>
          </div>
          <button type="button" class="icon-btn mobile-more-close" aria-label="Fechar">${icons.close}</button>
        </div>
        <div class="mobile-more-scroll">
          ${sections}
          <button type="button" class="mobile-more-install" data-mobile-install>${icons.home}<span>Adicionar à tela inicial</span></button>
          <button type="button" class="mobile-more-logout" data-mobile-logout>${icons.logout}<span>Sair</span></button>
        </div>
      </div>
    `;

    document.body.appendChild(back);
    document.body.classList.add('mobile-menu-open');

    back.querySelector('.mobile-more-close').onclick=closeMobileMore;
    back.addEventListener('click',e=>{
      if(e.target===back) closeMobileMore();
    });
    back.querySelectorAll('[data-mobile-close]').forEach(a=>{
      a.onclick=()=>closeMobileMore();
    });
    const installBtn=back.querySelector('[data-mobile-install]');
    if(installBtn){
      if(window.AMSPWA?.isStandalone?.()){
        installBtn.hidden=true;
      }else{
        installBtn.onclick=()=>{
          closeMobileMore();
          setTimeout(()=>window.AMSPWA?.installOrExplain?.(),80);
        };
      }
    }

    back.querySelector('[data-mobile-logout]').onclick=()=>{
      closeMobileMore();
      document.getElementById('logout')?.click();
    };

    const escClose=e=>{
      if(e.key==='Escape'){
        closeMobileMore();
        document.removeEventListener('keydown',escClose);
      }
    };
    document.addEventListener('keydown',escClose);
  }

  const baseBindGlobalMobileV2=bindGlobal;
  bindGlobal=function(){
    baseBindGlobalMobileV2();

    document.querySelectorAll('[data-mobile="menu"]').forEach(a=>{
      a.onclick=e=>{
        e.preventDefault();
        openMobileMoreMenu();
      };
    });

    const hamburger=document.getElementById('mobile-menu');
    if(hamburger){
      hamburger.onclick=e=>{
        e.preventDefault();
        openMobileMoreMenu();
      };
    }
  };
})();
