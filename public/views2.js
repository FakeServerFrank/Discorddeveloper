async function guilds(){const g=await api('/guilds');
 app.replaceChildren(h('h1',{},'Servidores'),...(g.length?g.map(x=>h('div',{className:'card row',on:{click:()=>{guildId=x.id;view='guild';render()}}},h('img',{className:'av',src:x.icon||'/icon.svg',alt:''}),h('div',{className:'grow'},h('b',{},x.name),h('div',{className:'mu'},x.members+' miembros')))):[h('p',{className:'mu'},'No hay servidores con el bot donde puedas administrar.')]),
  h('button',{className:'pri',style:'margin-top:8px',on:{click:go('/invite')}},'Añadir el bot a otro servidor'))}
async function guild(){const g=await api('/guilds/'+guildId),w=g.settings.welcome;
 const en=h('input',{type:'checkbox',checked:w.enabled}),ch=h('select',{},h('option',{value:''},'Elige un canal'),...g.channels.map(c=>h('option',{value:c.id,selected:c.id===w.channelId},'#'+c.name))),msg=h('textarea',{rows:3,maxLength:500,value:w.message});
 app.replaceChildren(h('button',{on:{click:()=>{view='guilds';render()}}},'Volver'),h('h1',{style:'margin-top:14px'},g.name),
  h('div',{className:'card'},h('h2',{style:'margin-top:0'},'Bienvenidas'),h('div',{className:'sw'},h('span',{},'Activadas'),en),h('label',{},'Canal'),ch,h('label',{},'Mensaje'),msg,h('div',{className:'mu'},'Variables: {user}, {server}'),
   h('button',{className:'pri',style:'margin-top:12px',on:{click:async()=>{try{await api(`/guilds/${g.id}/welcome`,{method:'PUT',body:{enabled:en.checked,channelId:ch.value,message:msg.value}});toast('Guardado')}catch(e){toast(e.message)}}}},'Guardar cambios')),
  h('p',{className:'mu'},`${g.channels.length} canales de texto, ${g.roles.length} roles`))}
(async()=>{
 try{const c=await fetch('/config').then(r=>r.json());if(c.requireApp&&!inApp)return gate()}catch{}
 try{me=await api('/me');view=me.isOwner?'home':'guilds';render()}catch{login()}
})();