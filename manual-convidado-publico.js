(async function(){
'use strict';
const app=document.getElementById('rsvp-app'),code=new URLSearchParams(location.search).get('code');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const brand='<div class="rsvp-brand"><img src="assets/logo-oficial.png" alt="A Magia do Sim"><strong>A Magia do Sim</strong></div>';
function fail(text){app.innerHTML=`<div class="rsvp-shell">${brand}<section class="rsvp-card"><div class="rsvp-content"><h1>Manual do Convidado</h1><p role="status">${esc(text)}</p><button class="rsvp-btn" onclick="location.reload()">Tentar novamente</button></div></section></div>`;}
if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(code||'')){fail('Confira o link enviado pelos noivos.');return;}
try{
const sb=window.supabase.createClient('https://yruwsmjmnssovojsdbah.supabase.co','sb_publishable_54PNMN8dAUNOliQ1tt1hQg_CVZRwXXw');
const {data:m,error}=await sb.rpc('guest_manual_get_page',{wedding_code:code});if(error)throw error;if(!m){fail('Este manual ainda não está disponível. Consulte os noivos.');return;}
const text=[m.welcome,m.notes].filter(Boolean).join('\n\n');
app.innerHTML=`<div class="rsvp-shell">${brand}<article class="rsvp-card"><header class="rsvp-hero"><span class="rsvp-eyebrow">MANUAL DO CONVIDADO</span><h1>${esc(m.couple_name)}</h1></header><div class="rsvp-content"><p class="manual-text">${esc(text)}</p></div></article><p class="rsvp-privacy">A Magia do Sim • Onde os sonhos se tornam alianças.</p></div>`;
}catch{fail('Não foi possível carregar o manual agora. Tente novamente.');}
})();