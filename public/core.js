if('serviceWorker' in navigator)navigator.serviceWorker.register('/sw.js');
const $=s=>document.querySelector(s), app=$('#app'), nav=$('#nav');
let view='home', guildId=null, timer=null, me=null;
const inApp=navigator.userAgent.includes('NexusApp');
if(inApp)document.cookie='nexusapp=1; path=/; max-age=31536000; secure; samesite=lax';
function h(tag,props={},...kids){const e=document.createElement(tag);
 for(const[k,v]of Object.entries(props)){if(k==='on')for(const[ev,fn]of Object.entries(v))e.addEventListener(ev,fn);else if(k in e)e[k]=v;else e.setAttribute(k,v)}
 kids.flat().forEach(c=>e.append(c instanceof Node?c:document.createTextNode(c??'')));return e}
function toast(m){const t=$('#toast');t.textContent=m;t.style.display='block';clearTimeout(t._t);t._t=setTimeout(()=>t.style.display='none',3000)}
async function api(path,opt={}){const r=await fetch('/api'+path,{method:opt.method||'GET',headers:{'Content-Type':'application/json'},body:opt.body&&JSON.stringify(opt.body)});
 if(r.status===401){login();throw new Error('auth')}const d=await r.json();if(!r.ok)throw new Error(d.error||'Error');return d}
function fmtUp(ms){const s=Math.floor(ms/1e3),d=Math.floor(s/86400),hh=Math.floor(s%86400/3600),m=Math.floor(s%3600/60);return d?`${d}d ${hh}h`:hh?`${hh}h ${m}m`:`${m}m ${s%60}s`}
const go=u=>()=>{location.href=u};
function gate(){clearInterval(timer);nav.hidden=true;app.replaceChildren(h('div',{className:'login'},h('h1',{},'Nexus Bot Manager'),h('p',{className:'mu'},'Para administrar el bot necesitas la app de Android.'),h('button',{className:'pri',on:{click:go('/download')}},'Descargar la app')))}
function login(){clearInterval(timer);nav.hidden=true;app.replaceChildren(h('div',{className:'login'},h('h1',{},'Nexus Bot Manager'),h('p',{className:'mu'},'Inicia sesión con Discord o añade el bot a tu servidor.'),h('button',{className:'pri',on:{click:go('/invite')}},'Invitar el bot a mi servidor'),h('button',{on:{click:go('/auth/login')}},'Entrar con Discord')))}
function setNav(){const tabs=me&&me.isOwner?[['home','Panel'],['guilds','Servidores'],['events','Eventos']]:[['guilds','Servidores']];
 nav.hidden=false;nav.replaceChildren(...tabs.map(([k,l])=>h('button',{className:view===k||(k==='guilds'&&view==='guild')?'on':'',on:{click:()=>{view=k;render()}}},l)))}
async function render(){clearInterval(timer);
 if(!me.isOwner&&(view==='home'||view==='events'))view='guilds';
 setNav();try{await ({home,guilds,guild,events})[view]()}catch(e){if(e.message!=='auth')toast(e.message)}
 if(view==='home'||view==='events')timer=setInterval(()=>render().catch(()=>{}),5000)}