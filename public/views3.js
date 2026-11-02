function welcomeCard(g){const w=g.settings.welcome;
 const en=h('input',{type:'checkbox',checked:w.enabled}),ch=h('select',{},h('option',{value:''},'Elige un canal'),...g.channels.map(c=>h('option',{value:c.id,selected:c.id===w.channelId},'#'+c.name))),msg=h('textarea',{rows:3,maxLength:500,value:w.message});
 return h('div',{className:'card'},h('h2',{style:'margin-top:0'},'Bienvenidas'),h('div',{className:'sw'},h('span',{},'Activadas'),en),h('label',{},'Canal'),ch,h('label',{},'Mensaje'),msg,h('div',{className:'mu'},'Variables: {user}, {server}'),
  h('button',{className:'pri',style:'margin-top:12px',on:{click:async()=>{try{await api(`/guilds/${g.id}/welcome`,{method:'PUT',body:{enabled:en.checked,channelId:ch.value,message:msg.value}});toast('Guardado')}catch(e){toast(e.message)}}}},'Guardar cambios'))}
function describe(a,g){
 if(a.type==='enable_module')return 'Activar módulo: '+(MODS.find(m=>m[0]===a.module)?.[1]||a.module);
 if(a.type==='create_category')return 'Crear categoría: '+a.name;
 if(a.type==='create_channel')return `Crear canal ${a.kind==='text'?'de texto':'de voz'}: ${a.name}${a.category?' en '+a.category:''}${a.private?' (privado)':''}`;
 if(a.type==='send_message')return `Enviar a ${a.channel}: "${a.text.slice(0,80)}"`;
 const c=g.channels.find(x=>x.id===a.channelId);return `Bienvenidas ${a.enabled?'activadas':'desactivadas'}${c?' en #'+c.name:''}`}
function assistantCard(g){
 const box=h('textarea',{rows:4,maxLength:800,placeholder:'Ej: crea una categoría Comunidad con canales #general, #memes y un canal de voz Charla'}),out=h('div',{}),btn=h('button',{className:'pri',style:'margin-top:10px'},'Pedir al asistente');
 btn.addEventListener('click',async()=>{if(!box.value.trim())return;btn.disabled=true;out.replaceChildren(h('p',{className:'mu'},'Pensando…'));
  try{const r=await api(`/guilds/${g.id}/assistant`,{method:'POST',body:{text:box.value}});
   const items=[h('p',{},r.reply||'Listo.')];
   if(r.actions.length)items.push(h('div',{className:'mu'},'Cambios propuestos:'),...r.actions.map(a=>h('div',{className:'ev ok'},describe(a,g))),
    h('button',{className:'pri',style:'margin-top:8px',on:{click:async()=>{try{const x=await api(`/guilds/${g.id}/assistant/apply`,{method:'POST',body:{actions:r.actions}});toast(x.errors.length?`${x.applied} aplicados. Error: ${x.errors[0]}`:`${x.applied} cambio(s) aplicado(s)`);render()}catch(e){toast(e.message)}}}},'Aplicar cambios'));
   out.replaceChildren(...items)}catch(e){out.replaceChildren(h('p',{className:'mu'},e.message))}
  btn.disabled=false});
 return h('div',{className:'card'},h('h2',{style:'margin-top:0'},'Asistente'),box,btn,out)}
(async()=>{
 try{const c=await fetch('/config').then(r=>r.json());if(c.requireApp&&!inApp)return gate()}catch{}
 try{me=await api('/me');view=me.isOwner?'home':'guilds';render()}catch{login()}
})();