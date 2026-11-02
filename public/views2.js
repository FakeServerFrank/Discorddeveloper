const MODS=[['welcome','Bienvenidas',1],['moderation','Moderación',0],['tickets','Tickets',0],['levels','Niveles',0],['security','Seguridad',0]];
async function guilds(){const g=await api('/guilds');
 app.replaceChildren(h('h1',{},'Servidores'),...(g.length?g.map(x=>h('div',{className:'card row',on:{click:()=>{guildId=x.id;view='guild';render()}}},h('img',{className:'av',src:x.icon||'/icon.svg',alt:''}),h('div',{className:'grow'},h('b',{},x.name),h('div',{className:'mu'},x.members+' miembros')))):[h('p',{className:'mu'},'No hay servidores con el bot donde puedas administrar.')]),
  h('button',{className:'pri',style:'margin-top:8px',on:{click:go('/invite')}},'Añadir el bot a otro servidor'))}
async function guild(){const g=await api('/guilds/'+guildId),sel=new Set(g.settings.modules||[]);
 const cats=h('div',{className:'card'},h('h2',{style:'margin-top:0'},'¿Para qué usarás el bot?'),...MODS.map(([k,l,ok])=>{
  const cb=h('input',{type:'checkbox',checked:sel.has(k)});
  cb.addEventListener('change',async()=>{cb.checked?sel.add(k):sel.delete(k);try{await api(`/guilds/${g.id}/modules`,{method:'PUT',body:{modules:[...sel]}});render()}catch(e){toast(e.message)}});
  return h('div',{className:'sw',style:'margin:8px 0'},h('span',{},l+(ok?'':' (próximamente)')),cb)}));
 const parts=[h('button',{on:{click:()=>{view='guilds';render()}}},'Volver'),h('h1',{style:'margin-top:14px'},g.name),cats,assistantCard(g)];
 if(sel.has('welcome')||g.settings.welcome.enabled)parts.push(welcomeCard(g));
 app.replaceChildren(...parts)}