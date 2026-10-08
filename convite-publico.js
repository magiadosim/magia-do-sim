(async function(){
'use strict';
const app=document.getElementById('invitation-app'),code=new URLSearchParams(location.search).get('code')||document.documentElement.dataset.weddingCode;
const fail=text=>{app.innerHTML='<div class="invite-loading"><h1>Convite indisponível</h1><p></p></div>';app.querySelector('p').textContent=text;};
if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(code||'')){fail('Confira o link enviado pelos noivos.');return;}
try{
 const sb=window.supabase.createClient('https://yruwsmjmnssovojsdbah.supabase.co','sb_publishable_54PNMN8dAUNOliQ1tt1hQg_CVZRwXXw');
 const {data,error}=await sb.rpc('invitation_get_page',{wedding_code:code});if(error)throw error;
 if(!data){fail('Este convite ainda não foi publicado. Consulte os noivos.');return;}
 const link=(file,key,value)=>{const u=new URL(file,location.href);u.search='';u.searchParams.set(key,value);return u.href;};
 const c={...AMSInvitation.defaults(),...data.content};
 app.innerHTML=AMSInvitation.render(c,{gifts:link('presentes.html','code',code),manual:link('manual-convidado.html','code',code),rsvp:data.registration_code?link('rsvp.html','register',data.registration_code):link('rsvp.html','code',code)});
 document.title=`${c.partner1} & ${c.partner2} — Convite`;
 const musicUrl=AMSInvitation.url(c.music_url);
 let audio,control;
 if(c.music_enabled&&musicUrl){
   audio=document.createElement('audio');audio.src=musicUrl;audio.loop=c.music_loop!==false;audio.preload='none';
   control=document.createElement('button');control.type='button';control.className='invite-music-control';control.hidden=true;control.textContent='▶ Tocar música';control.setAttribute('aria-label','Tocar música do convite');
   app.appendChild(audio);app.appendChild(control);
   const update=()=>{control.textContent=audio.paused?'▶ Tocar música':'Ⅱ Pausar música';control.setAttribute('aria-label',audio.paused?'Tocar música do convite':'Pausar música do convite');};
   audio.addEventListener('play',update);audio.addEventListener('pause',update);
   control.onclick=()=>{if(audio.paused)audio.play().catch(()=>{control.textContent='Áudio indisponível — tentar novamente';});else audio.pause();};
 }
 AMSInvitation.bindOpen(app,()=>{if(audio){control.hidden=false;audio.play().catch(()=>{control.textContent='▶ Tocar música';});}});
}catch(error){console.error(error);fail('Não foi possível carregar agora. Tente novamente em alguns instantes.');}
})();
