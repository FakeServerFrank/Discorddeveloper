async function home(){const s=await api('/status');
 const ctl=a=>async()=>{try{await api('/bot/'+a,{method:'POST'});toast('Hecho');render()}catch(e){toast(e.message)}};
 app.replaceChildren(h('h1',{},'Panel'),
  h('div',{className:'card'},h('div',{className:'row'},h('img',{className:'av',src:s.user?.avatar||'/icon.svg',alt:''}),
   h('div',{className:'grow'},h('b',{},s.user?.tag||'Bot sin conectar')),h('span',{className:'pill '+(s.state==='online'?'online':s.state==='starting'?'starting':'offline')},s.state==='online'?'ONLINE':s.state==='starting'?'INICIANDO':'OFFLINE')),
   h('div',{className:'btns'},h('button',{className:'pri',on:{click:ctl('start')}},'Iniciar'),h('button',{className:'dng',on:{click:ctl('stop')}},'Detener'),h('button',{on:{click:ctl('restart')}},'Reiniciar'))),
  h('div',{className:'grid'},...[['Servidores',s.guilds],['Usuarios',s.users.toLocaleString()],['Ping',s.ping>=0&&s.state==='online'?s.ping+' ms':'—'],['Activo',s.state==='online'?fmtUp(s.uptime):'—']].map(([l,v])=>h('div',{className:'card'},h('div',{className:'mu'},l),h('div',{className:'big'},v)))),
  h('h2',{},'Actividad reciente'),...(await evList(5)))}
async function evList(n){const ev=(await api('/events')).slice(0,n);return ev.length?ev.map(e=>h('div',{className:'ev '+e.type},h('div',{},e.msg),h('div',{className:'mu'},new Date(e.t).toLocaleTimeString()))):[h('p',{className:'mu'},'Sin eventos todavía.')]}
async function events(){app.replaceChildren(h('h1',{},'Eventos'),...(await evList(100)))}