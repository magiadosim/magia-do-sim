(function(){
'use strict';
const fields=[
 ['partner1','Primeiro nome','text'],['partner2','Segundo nome','text'],['initials','Iniciais do monograma','text'],
 ['cover_prompt','Texto da capa','text'],['cover_url','Imagem da capa (link)','url'],['photo_url','Foto do casal (link ou envio abaixo)','image'],['photo_position','Posição vertical da foto (0 a 100)','number'],
 ['quote','Versículo ou mensagem','textarea'],['quote_source','Referência da mensagem','text'],['invitation_text','Texto do convite','textarea'],
 ['event_date','Data','date'],['event_time','Horário','time'],['venue','Nome do local','text'],['address','Endereço','textarea'],
 ['celebration_text','Informações da celebração e pagamento','textarea'],['menu_text','Informações do cardápio','textarea'],
 ['links_intro','Título dos botões','text'],['links_hint','Orientação dos botões','text'],['confirmation_text','Texto de confirmação','textarea'],['rsvp_deadline','Prazo de confirmação','date'],['closing','Mensagem final','text'],
 ['directions_label','Texto do botão de localização','text'],['directions_url','Link de localização','url'],
 ['menu_label','Texto do botão do cardápio','text'],['menu_url','Link do cardápio','url'],
 ['gifts_label','Texto do botão de presentes','text'],['gifts_url','Link de presentes (vazio usa a lista da assessoria)','url'],
 ['rsvp_label','Texto do botão de presença','text'],['rsvp_url','Link de presença (vazio usa o cadastro do casal)','url'],
 ['website_label','Texto do botão do site','text'],['website_url','Link do site de casamento','url'],
 ['manual_label','Texto do botão do manual','text'],['manual_url','Link do manual (vazio usa o manual da assessoria)','url'],
 ['background_color','Cor de fundo','color'],['accent_color','Cor dos detalhes','color'],['music_url','Música (link ou upload abaixo)','url']
];
function defaults(w={}){return {
 partner1:w.partner1_name||'',partner2:w.partner2_name||'',initials:'',cover_prompt:'Clique para abrir',cover_url:'assets/convite-envelope.jpg',photo_url:'',photo_position:65,
 quote:'',quote_source:'',invitation_text:'Convidam para a celebração do casamento\na realizar-se em',event_date:w.wedding_date||'',event_time:String(w.wedding_time||'').slice(0,5),venue:w.venue||'',address:'',celebration_text:'',menu_text:'',links_intro:'Clique nos botões',links_hint:'para interagir',confirmation_text:'Queremos muito você conosco! Confirme sua presença até',rsvp_deadline:'',closing:'Esperamos por você!',directions_label:'Como chegar na cerimônia?',directions_url:'',menu_label:'Ver cardápio do restaurante',menu_url:'',gifts_label:'Lista de presentes',gifts_url:'',rsvp_label:'Confirme sua presença',rsvp_url:'',website_label:'Site de casamento',website_url:'',manual_label:'Manual do convidado',manual_url:'',background_color:'#efefed',accent_color:'#526544'
};}
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function url(value,image=false){if(!value)return '';if(image&&/^data:image\/(jpeg|png|webp);base64,[a-z0-9+/=]+$/i.test(value))return value;try{const u=new URL(value,location.href);return ['https:','http:'].includes(u.protocol)?u.href:'';}catch{return '';}}
function render(c,links={}){
 const accent=/^#[0-9a-f]{6}$/i.test(c.accent_color)?c.accent_color:'#526544';
 const background=/^#[0-9a-f]{6}$/i.test(c.background_color)?c.background_color:'#efefed';
 const d=c.event_date?new Date(c.event_date+'T12:00:00'):null;
 const date=d&&!isNaN(d)?d:null;
 const initials=c.initials||[c.partner1,c.partner2].map(n=>String(n||'').trim()[0]||'').join(' ♡ ');
 const photo=url(c.photo_url,true),cover=url(c.cover_url,true)||new URL('assets/convite-envelope.jpg',location.href).href;
 const button=(label,href,kind='outline')=>url(href)?`<a class="invite-link ${kind}" href="${esc(url(href))}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>`:'';
 const leaves='<img class="invite-leaves" src="assets/convite-folhas.png" alt="">';
 return `<div class="invite-shell" style="--invite-accent:${accent};--invite-paper:${background}">
 <section class="invite-cover" id="invite-cover"><button class="invite-envelope" id="invite-open" aria-label="${esc(c.cover_prompt||'Abrir convite')}"><img src="${esc(cover)}" alt="Envelope verde oliva com selo dourado"><span class="invite-cover-prompt">${esc(c.cover_prompt)}</span></button></section>
 <article class="invite-letter" id="invite-letter" tabindex="-1" hidden>
 ${photo?`<img class="invite-photo" src="${esc(photo)}" alt="${esc(c.partner1)} e ${esc(c.partner2)}" style="object-position:center ${Math.max(0,Math.min(100,Number(c.photo_position)||0))}%">`:''}
 <div class="invite-body"><div class="invite-monogram">${esc(initials)}</div>
 ${c.quote?`<blockquote>${esc(c.quote)}<cite>${esc(c.quote_source)}</cite></blockquote>`:''}
 <section class="invite-names">${leaves}<h1><span>${esc(c.partner1)}</span><i>&amp;</i><span>${esc(c.partner2)}</span></h1></section>
 <p class="invite-uppercase invite-intro">${esc(c.invitation_text)}</p>
 ${date?`<div class="invite-date"><span class="invite-month">${esc(date.toLocaleDateString('pt-BR',{month:'long'}))}</span><div><span class="invite-weekday">${esc(date.toLocaleDateString('pt-BR',{weekday:'long'}))}</span><strong>${date.getDate()}</strong><span class="invite-time">${esc(String(c.event_time||'').slice(0,5))}</span></div><span>${date.getFullYear()}</span></div>`:c.event_time?`<p>${esc(c.event_time)}</p>`:''}
 <section class="invite-location">${leaves}<h2>${esc(c.venue)}</h2><p>${esc(c.address)}</p>${button(c.directions_label,c.directions_url,'filled')}</section>
 ${c.celebration_text?`<p class="invite-uppercase invite-detail">${esc(c.celebration_text)}</p>`:''}
 ${c.menu_text||c.menu_url?`<section class="invite-menu">${leaves}<p class="invite-uppercase invite-detail">${esc(c.menu_text)}</p>${button(c.menu_label,c.menu_url,'filled')}</section>`:''}
 <div class="invite-divider" aria-hidden="true">❧ ❧ ❧</div><p class="invite-uppercase">${esc(c.links_intro)}</p><p class="invite-link-hint">${esc(c.links_hint)}</p>
 <nav class="invite-links" aria-label="Informações do casamento">${button(c.gifts_label,c.gifts_url||links.gifts)}${button(c.rsvp_label,c.rsvp_url||links.rsvp)}${button(c.website_label,c.website_url)}${button(c.manual_label,c.manual_url||links.manual)}</nav>
 <p class="invite-uppercase invite-confirmation">${esc(c.confirmation_text)}${c.rsvp_deadline?' '+esc(new Date(c.rsvp_deadline+'T12:00:00').toLocaleDateString('pt-BR')):''}</p>
 <p class="invite-closing">${esc(c.closing)}</p>${leaves}
 </div></article></div>`;
}
function bindOpen(root=document,onOpen){const open=root.querySelector('#invite-open');if(open)open.onclick=()=>{if(onOpen)onOpen();const cover=root.querySelector('#invite-cover'),letter=root.querySelector('#invite-letter');cover.hidden=true;letter.hidden=false;letter.focus({preventScroll:true});window.scrollTo({top:0,behavior:'smooth'});};}
window.AMSInvitation={fields,defaults,render,bindOpen,url};
})();
