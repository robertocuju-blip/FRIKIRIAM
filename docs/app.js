import {isMovie,mediaStatus,mergeCatalog,normalizeLibrary,newestFirst} from './media.mjs?v=20261107-3';
import {createBoardGameCatalog} from './boardgames.mjs?v=20261107-3';
import {createMovieCatalog,imdbOf,movieDetails} from './movies.mjs?v=20261107-1';
import {validMessage,recommendationCode,recommendationLink,readRecommendation,readSharedRecommendation,needsInstalledAppTransfer} from './recommendations.mjs?v=20261107-5';
import {searchBooks,bookEditions} from './books.mjs?v=20261107-1';
import {pausedStates,isPaused,formats,validRating,yearOf,bounded,labels,groupKey,groupNames,playersLabel,completionCount,changeSeason,suggestItem,libraryStats,translatedGenres} from './library.mjs?v=20261107-1';
let catalogStorage=null;try{catalogStorage=localStorage}catch{}
const searchBoardGames=createBoardGameCatalog({fetchJson:jsonFetch,storage:catalogStorage});
const searchMovies=createMovieCatalog({fetchJson:jsonFetch,storage:catalogStorage});
let collectionViews={};
try{const saved=JSON.parse(catalogStorage?.getItem('frikiriam.views.v1')||'{}');if(saved&&typeof saved==='object'&&!Array.isArray(saved))collectionViews=saved}catch{}
const $ = (s, root = document) => root.querySelector(s);
const KEY = 'frikiriam.v1';
const fresh = () => ({version:2,profile:{name:''},books:[],shows:[],games:[],groups:[],activeSession:null});
let state = fresh(), storageError = false, needsMigration = false;
try { const raw=localStorage.getItem(KEY); if(raw){const data=JSON.parse(raw);validate(data);state=normalizeLibrary(data);needsMigration=data.version!==2||!!data.exchange} } catch { storageError=true; }
let view='home', filter='Todos', query='', lookupResults=[], lookupGeneration=0, typeFilter='Todos', catalogJob=null, catalogSingleRunning=false;
const modal=$('#modal');
const sections={books:'book',shows:'show',movies:'movie',games:'game'};
const collectionKey={book:'books',show:'shows',movie:'shows',game:'games'};
const collectionTypes={books:['Cómics','Mangas','Libros','Novelas gráficas'],shows:['Anime','Serie']};
const jp={home:'ホーム',books:'読書',shows:'アニメ・ドラマ',movies:'映画',games:'ボードゲーム',profile:'プロフィール',recommendations:'おすすめ'};
const japanese=(value,cls='jp')=>`<span class="${cls}" lang="ja">${value}</span>`;
const kinds={book:'Lectura',show:'Anime o serie',movie:'Película',game:'Juego de mesa'};
const states={book:['Pendiente','Leyendo','Leído',...pausedStates],show:['Según el progreso',...pausedStates],movie:['Pendiente','Vista',...pausedStates],game:['Pendiente','Jugado',...pausedStates]};
const itemStatus=x=>['shows','movies'].includes(view)?mediaStatus(x):x.status;
let genreFilter='',yearFilter='',groupFilter='',formatFilter='',editionBrowse=null,bulk=null;
const getGroups=()=>groupNames([...(state.groups||[]),...['books','shows','games'].flatMap(k=>state[k].flatMap(x=>Array.isArray(x.groups)?x.groups:[]))],1000);
const showMeta=s=>({year:yearOf(s.premiered),genres:translatedGenres(s.genres),runtime:bounded(s.averageRuntime||s.runtime,1,2000)});
const setIfMissing=(target,incoming)=>{for(const key of ['year','genres','runtime','synopsis','imdbId','minPlayers','maxPlayers'])if((!target[key]||Array.isArray(target[key])&&!target[key].length)&&incoming[key]&&(!Array.isArray(incoming[key])||incoming[key].length))target[key]=incoming[key];return target;};
const names={home:'Inicio',books:'Lecturas',shows:'Animes y series',movies:'Películas',games:'Juegos de mesa',recommendations:'Recomendaciones',profile:'Mi perfil'};
const paths={home:'<path d="m3 10 9-7 9 7v10H3Z"/><path d="M9 20v-8h6v8"/>',books:'<path d="M12 5Q6 1 2 5v15q5-4 10 0 5-4 10 0V5q-5-4-10 0v15"/>',shows:'<rect x="3" y="5" width="18" height="13" rx="2"/><path d="m9 22 3-4 3 4M8 1l4 4 4-4"/>',games:'<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M7 7h.01M17 7h.01M7 17h.01M17 17h.01M12 12h.01"/>',profile:'<circle cx="12" cy="8" r="4"/><path d="M4 22v-3a8 8 0 0 1 16 0v3"/>',plus:'<path d="M12 5v14M5 12h14"/>',arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',play:'<path d="m9 5 11 7-11 7Z"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',download:'<path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"/>',upload:'<path d="M12 16V4m-5 5 5-5 5 5M4 17v4h16v-4"/>',check:'<path d="m5 12 4 4L19 6"/>',settings:'<circle cx="12" cy="12" r="3"/><path d="m9 3 6 0 1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1Z"/>',leaf:'<path d="M20 3C4 2 1 12 7 17s15 1 13-14ZM5 21 16 8"/>'};
paths.recommendations='<path d="M4 4h16v12H9l-5 4zM8 8h8M8 12h5"/>';
paths.list='<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>';
paths.grid='<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>';
paths.movies='<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 3v18M17 3v18M3 8h4m-4 8h4m10-8h4m-4 8h4"/>';
const icon = name => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${paths[name]||paths.leaf}</svg>`;
const esc = val => String(val??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function url(value){try{const u=new URL(value);return u.protocol==='https:'?u.href:''}catch{return ''}}
const uid = () => crypto.randomUUID();
const button = (text,action,cls='',id='')=>`<button type="button" class="btn ${cls}" data-action="${action}" ${id?`data-id="${esc(id)}"`:''}>${text}</button>`;
const totalTime = b => b.sessions.reduce((s,x)=>s+x.duration,0);
function time(ms){const mins=Math.floor(ms/60000);return ms<60000?`${Math.floor(ms/1000)} s`:mins>=60?`${Math.floor(mins/60)} h ${mins%60} min`:`${mins} min`}
const score=n=>Number(n).toLocaleString('es-ES');
const stars=n=>validRating(n)&&n?`<span class="stars stars-fraction" aria-label="${score(n)} de 5 estrellas"><span aria-hidden="true">★★★★★</span><span aria-hidden="true" style="width:${n*20}%">★★★★★</span></span>`:'';
const tag = (s,red=false)=>`<span class="tag ${red?'red':''}">${esc(s)}</span>`;
const date = v => new Date(v).toLocaleDateString('es-ES',{day:'numeric',month:'short',year:'numeric'});
function validate(d){
 if(!d||![1,2].includes(d.version)||!d.profile||typeof d.profile.name!=='string'||d.profile.name.length>80)throw Error('Perfil no válido');
 const text=(v)=>typeof v==='string'&&v.length<=100000;
 const rating=validRating;
 const ids=new Set();
 if(d.recommendations!==undefined&&(!Array.isArray(d.recommendations)||d.recommendations.length>1000||!d.recommendations.every(m=>validMessage(m)&&['received','prepared'].includes(m.direction))))throw Error('Recomendaciones no válidas');
 if(d.groups!==undefined&&(!Array.isArray(d.groups)||d.groups.length>1000||!d.groups.every(g=>typeof g==='string'&&g.length<=80)))throw Error('Grupos no válidos');
 for(const key of ['books','shows','games']){
  if(!Array.isArray(d[key])||d[key].length>10000)throw Error('Colección no válida');
  for(const x of d[key]){
   if(!x||!text(x.id)||ids.has(x.id)||!text(x.title)||!text(x.notes)||!text(x.status))throw Error('Registro no válido');ids.add(x.id);
   if(x.completions!==undefined&&bounded(x.completions)===null)throw Error('Recuento no válido');
   if(x.groups!==undefined&&(!Array.isArray(x.groups)||x.groups.length>20||!x.groups.every(g=>typeof g==='string'&&g.length<=80)))throw Error('Grupo no válido');
   if(!rating(x.rating)||!text(x.cover))throw Error('Valoración no válida');
   if(key==='games'&&x.price!==undefined&&(typeof x.price!=='string'||x.price.length>80))throw Error('Precio no válido');
   if(key==='books'&&(!['Cómics','Mangas','Libros','Novelas gráficas'].includes(x.category)||!Array.isArray(x.sessions)||x.sessions.length>100000||!x.sessions.every(s=>s&&Number.isFinite(s.duration)&&s.duration>=0&&Number.isFinite(s.started)&&Number.isFinite(s.ended)&&s.ended>=s.started&&Number.isInteger(s.page)&&s.page>=0)))throw Error('Sesiones no válidas');
   if(key==='shows'&&(!Array.isArray(x.episodes)||x.episodes.length>10000||!x.episodes.every(e=>e&&text(e.id)&&text(e.title)&&text(e.notes)&&rating(e.rating)&&typeof e.watched==='boolean'&&Number.isInteger(e.season)&&e.season>=0&&Number.isInteger(e.number)&&e.number>0&&text(e.airdate))))throw Error('Episodios no válidos');
  }
 }
 if(d.activeSession!==null&&(!d.activeSession||!d.books.some(b=>b.id===d.activeSession.bookId)||!Number.isFinite(d.activeSession.started)||!Number.isFinite(d.activeSession.elapsed)||d.activeSession.elapsed<0||!(d.activeSession.runningSince===null||Number.isFinite(d.activeSession.runningSince))))throw Error('Sesión activa no válida');
}
function persist(){try{localStorage.setItem(KEY,JSON.stringify(state));return true}catch{toast('No se ha podido guardar. Exporta una copia: el almacenamiento puede estar lleno.');return false}}
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('visible');clearTimeout(window.toastTimer);window.toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),4500)}
function go(next){
 view=next;filter='Todos';genreFilter=yearFilter=groupFilter=formatFilter=query='';
 const categories=collectionTypes[next]||[];
 const recent=newestFirst(next==='books'?state.books:next==='shows'?state.shows.filter(x=>!isMovie(x)):[])[0];
 typeFilter=categories.includes(recent?.category)?recent.category:categories[0]||'Todos';
 render();window.scrollTo({top:0,behavior:'instant'});
 if(next==='movies')enrichSaved('movie');
 if(next==='shows')enrichSaved('show');
 if(next==='games')enrichGames();
}
function shell(content){return `<div class="layout"><aside class="sidebar"><a class="brand" href="#" data-view="home"><img src="./icon.svg" alt="" class="brand-logo"><span><strong>FRIKIRIAM</strong><small>TU PEQUEÑO UNIVERSO</small></span></a><div class="nav-label">Tu espacio personal</div><nav class="nav" aria-label="Navegación principal">${Object.entries(names).map(([key,title])=>`<button data-view="${key}" class="${view===key?'active':''}" ${view===key?'aria-current="page"':''}>${icon(key)}<span>${title}${japanese(jp[key],"nav-jp")}</span></button>`).join('')}</nav><div class="sidebar-bottom"><div class="zen-quote">Tus historias, a tu ritmo.<br>Siempre hay algo por descubrir.</div><button class="profile-mini" data-view="profile"><span class="avatar">${icon('profile')}</span><span><strong>${esc(state.profile.name||'Mi perfil')}</strong><small>Mi colección personal</small></span></button></div></aside><div class="workspace"><header class="topbar"><a class="header-brand" href="#" data-view="home"><img src="./icon.svg" alt=""><strong>FRIKIRIAM</strong></a><button class="header-profile" data-view="profile" aria-label="Ver mi perfil"><span class="header-name">${esc(state.profile.name||'Mi perfil')}</span></button></header>${!navigator.onLine?'<div class="online-warning">Sin conexión · Tu cuaderno sigue disponible. Las búsquedas necesitan internet.</div>':''}<main class="main">${content}<footer class="footer"><span>FRIKIRIAM · Un lugar para todo lo que te mueve.</span></footer></main></div></div>${state.activeSession?cozy():''}`}
function render(){ $('#app').innerHTML=shell(view==='home'?home():view==='profile'?profile():view==='recommendations'?recommendations():collection());if(state.activeSession){$('.layout').inert=true;$('.cozy').setAttribute('role','dialog');$('.cozy').setAttribute('aria-modal','true');}if(storageError){storageError=false;toast('No se pudo leer el guardado anterior. No se sobrescribirá hasta tu próxima acción.')}}
function heading(title,subtitle,action){return `<div class="page-title"><div><span class="eyebrow">${{home:'TU CUADERNO PERSONAL',books:'HISTORIAS POR DESCUBRIR',shows:'UN CAPÍTULO MÁS',movies:'TU SALA DE CINE',games:'ALREDEDOR DE UNA MESA',profile:'TU ESPACIO PERSONAL',recommendations:'TUS RECOMENDACIONES'}[view]}</span><h1>${title} ${japanese(jp[view]||"")}</h1><p>${subtitle}</p></div>${action||`<span class="date-label">${new Date().toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long'})}</span>`}</div>`}
function home(){
 const read=state.books.filter(b=>b.status==='Leído').length,series=state.shows.filter(x=>!isMovie(x)),watch=series.reduce((s,x)=>s+x.episodes.filter(e=>e.watched).length,0),films=state.shows.filter(isMovie),seenFilms=films.filter(x=>completionCount(x,'movie')>0).length,played=state.games.filter(g=>g.status==='Jugado').length;
 const blocks=[['books','En tu estantería',state.books.length,`${read} ${read===1?'lectura completada':'lecturas completadas'}`],['shows','Capítulos disfrutados',watch,`${series.length} animes y series`],['movies','Películas vistas',seenFilms,`${films.length-seenFilms} pendientes`],['games','Juegos por compartir',state.games.length,`${played} jugados · ${state.games.length-played} pendientes`]];
 return heading(`Inicio${state.profile.name?`, ${esc(state.profile.name.split(' ')[0])}`:''}.`,'Tu colección, a tu ritmo.')+`<section class="hero home-hero"><div class="hero-copy"><span class="eyebrow">UN MOMENTO PARA TI ${japanese("ひと休み")}</span><h2>Cultiva lo que<br>te hace disfrutar.</h2><p>Lecturas, animes, series, películas y juegos de mesa. Todo lo que disfrutas, en un mismo lugar.</p></div><div class="hero-art" role="img" aria-label="Ilustración de montañas, un sol rojo y un torii"><img src="./landscape.svg" alt="" class="landscape"></div></section><section class="stats home-stats" aria-label="Tu actividad y colecciones">${blocks.map(([i,t,n,h])=>`<button type="button" class="stat" data-view="${i}" aria-label="Abrir ${names[i]}: ${t}, ${n}. ${h}."><div><small>${t}</small><b>${n}</b></div><div class="stat-icon">${icon(i)}</div><span class="hint">${h}</span><span class="stat-link">${names[i]} ${icon('arrow')}</span></button>`).join('')}</section>`;
}
function empty(i,t,p,b=''){return `<div class="empty"><div class="empty-mark">${icon(i)}</div><h3>${t}</h3><p>${p}</p>${b}</div>`}
function collection(){
 const cfg={
  books:['Tu estantería personal.','Historias que empiezan, páginas que se quedan contigo.','Añadir lectura','add-book',['Todos',...states.book]],
  shows:['Historias que te acompañan.','Un capítulo cada vez. Tu progreso siempre a mano.','Añadir anime o serie','add-show',['Todos','Pendiente','Viendo','Visto',...pausedStates]],
  movies:['Tu pequeña sala de cine.','Las películas que quieres ver y las que ya disfrutaste.','Añadir película','add-movie',['Todos',...states.movie]],
  games:['La próxima partida.','Descubre, juega y guarda los momentos alrededor de la mesa.','Añadir juego','add-game',['Todos',...states.game]]
 }[view];
 const layout=collectionViews[view]==='grid'?'grid':'list';
 const source=state[collectionKey[sections[view]]].filter(x=>(view!=='shows'||!isMovie(x))&&(view!=='movies'||isMovie(x)));
 const scoped=source.filter(x=>!collectionTypes[view]||x.category===typeFilter);
 const genres=[...new Set(scoped.flatMap(x=>labels(x.genres)))].sort((a,b)=>a.localeCompare(b,'es'));
 const years=[...new Set(scoped.map(x=>yearOf(x.year)).filter(Boolean))].sort((a,b)=>b-a);
 const list=newestFirst(scoped).filter(x=>(filter==='Todos'||itemStatus(x)===filter)&&x.title.toLocaleLowerCase('es').includes(query.toLocaleLowerCase('es'))
  &&(!genreFilter||(genreFilter==='?'?!labels(x.genres).length:labels(x.genres).includes(genreFilter)))&&(!yearFilter||(yearFilter==='?'?!yearOf(x.year):yearOf(x.year)===Number(yearFilter)))
  &&(!groupFilter||groupNames(x.groups).some(n=>groupKey(n)===groupKey(groupFilter)))&&(!formatFilter||x.format===formatFilter));
 const filtered=query||filter!=='Todos'||genreFilter||yearFilter||groupFilter||formatFilter;
 const filterSelect=(name,id,value,entries)=>`<label>${name}<select data-collection-filter="${id}" aria-label="${name}">${entries.map(([v,t])=>`<option value="${esc(v)}" ${String(v)===value?'selected':''}>${esc(t)}</option>`).join('')}</select></label>`;
 const moreFilters=`<details class="extra-filters" ${genreFilter||yearFilter||groupFilter||formatFilter?'open':''}><summary>${view==='games'?'Filtrar por grupo':'Género, año y grupos'} ${japanese("絞り込み")}</summary><div class="filter-grid">${view!=='games'?filterSelect('Género','genre',genreFilter,[['','Todos'],...genres.map(x=>[x,x]),['?','Sin género']]):''}${view==='games'?'':filterSelect('Año','year',yearFilter,[['','Todos'],...years.map(x=>[x,x]),['?','Sin año']])}${filterSelect('Grupo','group',groupFilter,[['','Todos'],...getGroups().map(x=>[x,x])])}${view==='books'?filterSelect('Formato de lectura','format',formatFilter,[['','Todos'],...formats.map(x=>[x,x])]):''}</div></details>`;
 const tabs=cfg[4].map(t=>`<button data-filter="${esc(t)}" class="${t===filter?'active':''}" aria-pressed="${t===filter}">${t}</button>`).join('');
 const types=view==='books'?['Cómics','Mangas','Libros','Novelas gráficas']:['Anime','Serie'];
 const categoryTabs=['books','shows'].includes(view)?`<div class="tabs media-types" aria-label="${view==='books'?'Categorías de lectura':'Tipo de serie'}">${types.map(t=>`<button data-type-filter="${t}" class="${typeFilter===t?'active':''}" aria-pressed="${typeFilter===t}">${view==='shows'?(t==='Anime'?'Animes':'Series'):t}</button>`).join('')}</div>`:'';
 return heading(cfg[0],cfg[1],`<div class="section-actions">${button(`${icon('plus')} ${cfg[2]}`,cfg[3],'primary')}${view==='movies'?button('Añadir varias','bulk-movies','subtle'):''}</div>`)+
  (view==='shows'?`<div class="catalog-toolbar">${button(catalogJob?.running?'Actualizando catálogo…':'Actualizar todo el catálogo','refresh-all','subtle')}<span class="small">Actualiza episodios y emisión de todos los títulos vinculados a TVmaze.</span></div>${catalogJob?catalogProgress():'<div id="catalog-progress"></div>'}`:'')+categoryTabs+
  `<div class="collection-tools">${button("Sugerir","suggest","subtle")}${button("Grupos","groups","subtle")}</div><div class="toolbar"><div class="tabs" aria-label="Filtros de estado${view==='books'&&typeFilter!=='Todos'?' de '+esc(typeFilter):''}">${tabs}</div><input class="search-input" id="collection-search" type="search" placeholder="Buscar en mi colección…" aria-label="Buscar en mi colección" value="${esc(query)}"></div>${moreFilters}<div class="collection-options"><p class="collection-caption">${view==='books'&&typeFilter!=='Todos'?esc(typeFilter)+' · ':''}Más recientes primero</p><div class="view-switch" role="group" aria-label="Formato de la colección">${[['list','Lista'],['grid','Tarjetas']].map(([value,label])=>`<button type="button" data-action="set-layout" data-layout="${value}" aria-pressed="${layout===value}">${icon(value)} ${label}</button>`).join('')}</div></div><div id="collection-list">${list.length?`<div class="library-list ${layout==='grid'?'is-grid':''}">${list.map(card).join('')}</div>`:`<div class="panel">${empty(view,filtered?'Sin resultados por aquí.':{books:'Una estantería llena de posibilidades.',shows:'Una nueva historia está por empezar.',movies:'Una película para cada momento.',games:'Siempre hay sitio para otra partida.'}[view],filtered?'Prueba otro filtro o una búsqueda diferente.':'Añade tu primer registro y haz de este espacio algo tuyo.',button(`${icon('plus')} ${cfg[2]}`,cfg[3],'subtle'))}</div>`}</div>`;
}
function cover(x,kind,clickable=true){
 const content=`${url(x.cover)?`<img src="${esc(url(x.cover))}" alt="" loading="lazy" referrerpolicy="no-referrer" data-cover>`:''}<span class="row-cover-fallback">${icon(view)}</span>`;
 return clickable?`<button type="button" class="row-cover cover-open" aria-label="Abrir ${esc(x.title)}" data-action="edit-${kind}" data-id="${esc(x.id)}">${content}</button>`:`<div class="row-cover" aria-hidden="true">${content}</div>`;
}
function card(x){
 const kind=sections[view],status=itemStatus(x),genres=labels(x.genres).slice(0,3);
 let details=[],sub='';
 if(kind==='book'){sub=x.author||'';details=[x.format,`${completionCount(x,kind)} lecturas completas`,x.sessions.length?time(totalTime(x)):'',x.price];}
 if(kind==='show'){details=[`${x.episodes.filter(e=>e.watched).length} / ${x.episodes.length} capítulos vistos`,x.airStatus==='En emisión'?'● En emisión':x.airStatus==='Finalizada'?'Emisión finalizada':'',x.checked?`Catálogo actualizado a ${date(x.checked)}`:''];}
 if(kind==='movie'){sub=x.synopsis||'';details=[`${completionCount(x,kind)} visionados`,x.runtime?`${x.runtime} min`:''];}
 if(kind==='game'){sub=x.notes?.slice(0,110)||'';details=[gameDetails(x)];}
 const tags=groupNames(x.groups),year=kind==='game'?null:yearOf(x.year);
 return `<article class="library-row">${cover(x,kind,false)}<button type="button" class="card-hit" aria-label="Abrir ${esc(x.title)}" data-action="edit-${kind}" data-id="${esc(x.id)}"></button><div class="row-info"><div class="row-labels">${tag(status,status==='Pendiente')}${stars(x.rating||(kind==='movie'?x.episodes[0]?.rating:0))}</div><h3>${esc(x.title)}</h3>${kind!=='game'&&(year||genres.length)?`<p class="row-detail">${esc([year,...genres].filter(Boolean).join(' · '))}</p>`:''}${sub?`<p class="row-summary">${esc(sub)}</p>`:''}${kind==='game'?`<p class="row-detail" data-game-details="${esc(x.id)}" ${details[0]?'':'hidden'}>${esc(details[0])}</p>`:details.some(Boolean)?`<p class="row-detail">${esc(details.filter(Boolean).join(' · '))}</p>`:''}${tags.length?`<p class="row-detail">${esc(tags.join(' · '))}</p>`:''}${kind==='game'&&url(x.priceSourceUrl)?`<a class="row-source" href="${esc(url(x.priceSourceUrl))}" target="_blank" rel="noopener noreferrer">Ver ofertas ↗</a>`:''}${x.coverSourceUrl&&url(x.coverSourceUrl)?`<a class="row-source" href="${esc(url(x.coverSourceUrl))}" target="_blank" rel="noopener noreferrer">Imagen: ${esc(x.coverProvider||'fuente')} ↗</a>`:''}</div></article>`;
}
function options(values,current){return values.map(v=>`<option value="${esc(v)}" ${v===current?'selected':''}>${esc(v)}</option>`).join('')}
function field(label,name,value='',type='text',full=false){return `<label class="${full?'full':''}">${label}<input name="${name}" type="${type}" value="${esc(value)}" ${name==='title'?'required maxlength="160"':name==='newGroup'||name==='groupName'?'maxlength="80"':name==='cover'?'placeholder="https://…"':name==='name'?'maxlength="80" autocomplete="name"':name==='price'?'maxlength="80" placeholder="Ej.: 35,00 €"':''} ${type==='number'?'min="0" max="100000" step="1"':''}></label>`}
function select(label,name,values,current,full=false){return `<label class="${full?'full':''}">${label}<select name="${name}" aria-label="${esc(label)}">${options(values,current)}</select></label>`}
function note(value,label='Tu bloc de notas'){return `<label class="full">${label}<textarea name="notes" maxlength="20000" placeholder="Ideas, sensaciones y pequeños detalles que quieres recordar…">${esc(value||'')}</textarea></label>`}
const halfRatings=Array.from({length:10},(_,i)=>(i+1)/2);
const ratingOptions=value=>`<option value="0">Sin valorar</option>${halfRatings.map(n=>`<option value="${n}" ${value===n?'selected':''}>${score(n)} / 5</option>`).join('')}`;
function rating(value){return `<div class="rating-control"><label>Tu valoración<select name="rating">${ratingOptions(value)}</select></label><span data-rating-preview>${stars(value)}</span></div>`;}
function groupFields(x){
 const all=getGroups(),chosen=groupNames(x.groups);
 return `<fieldset class="full entry-groups"><legend>Grupos ${japanese("グループ")}</legend>${all.length?`<div class="group-choices">${all.map(g=>`<label><input type="checkbox" name="groups" value="${esc(g)}" ${chosen.some(n=>groupKey(n)===groupKey(g))?'checked':''}>${esc(g)}</label>`).join('')}</div>`:''}${field('Añadir a un grupo nuevo · opcional','newGroup','','text',true)}</fieldset>`;
}
function statsPanel(){
 const a=libraryStats(state);
 return `<section class="panel padded profile-stats"><h2>Estadísticas ${japanese("統計")}</h2><div class="profile-stats-grid">${[
  ['Lectura',time(a.reading),`${a.readings} lecturas completas`],
  ['Películas',time(a.filmMinutes*60000),`${a.films} visionados${a.filmUnknown?' · '+a.filmUnknown+' sin duración':''}`],
  ['Animes y series',time(a.episodeMinutes*60000),`${a.episodes} capítulos vistos${a.episodeUnknown?' · '+a.episodeUnknown+' sin duración':''}`],
  ['Juegos de mesa',a.games,'juegos jugados']
 ].map(([t,n,d])=>`<div><small>${t}</small><strong>${n}</strong><span>${d}</span></div>`).join('')}</div><p class="small">La lectura suma tus sesiones. El vídeo suma la duración conocida de los visionados y capítulos vistos.</p>${button('Gestionar grupos','groups','subtle')}</section>`;
}
function profile(){return heading('Tu espacio personal.','Tu perfil y tu actividad.')+statsPanel()+`<div class="settings-grid"><section class="panel padded"><h2>Mi perfil</h2><form id="profile-form"><div class="form-grid">${field('Tu nombre','name',state.profile.name,'text',true)}</div><div class="actions"><button class="btn primary" type="submit">Guardar mi perfil</button></div></form></section><div><section class="panel padded"><h2>Tu cuaderno, contigo.</h2><p class="small">Los datos se guardan en este navegador y dispositivo. Cada persona tiene su propia colección. No se sincronizan entre dispositivos.</p><div class="backup-actions">${button(`${icon('download')} Exportar copia`,'export')}${button(`${icon('upload')} Importar copia`,'import')}</div><p class="small">Guarda una copia con frecuencia: borrar los datos de Safari, cambiar de móvil o usar el modo privado puede hacerte perder el cuaderno.</p></section><section class="panel padded"><h2>Llévalo a tu iPhone.</h2><p class="small">Abre la dirección de FRIKIRIAM en Safari.</p><ol class="install-steps"><li>Pulsa el botón Compartir.</li><li>Elige «Añadir a pantalla de inicio».</li><li>Confirma con «Añadir».</li></ol>${button('Instalar y compartir','help','subtle')}</section></div></div>`}
function openModal(title,subtitle,body){lookupGeneration++;modal.innerHTML=`<div class="modal-head"><div><h2>${title}</h2>${subtitle?`<p class="small" style="margin-bottom:0">${subtitle}</p>`:''}</div><button class="close" data-action="close" aria-label="Cerrar">×</button></div>${body}`;if(!modal.open)modal.showModal()}
function lookup(kind,x={}){return `<div class="lookup"><span class="eyebrow">${x.id?'Buscar en el catálogo':'Buscar en el catálogo'}</span><div class="lookup-row"><input id="lookup-query" type="search" aria-label="Título para buscar en internet" value="${esc(x.title||'')}" placeholder="${kind==='book'?'Título, autor o ISBN…':kind==='game'?'Nombre del juego de mesa…':kind==='movie'?'Nombre de la película…':'Nombre del anime o serie…'}"><button type="button" class="btn" data-action="lookup" data-kind="${kind}">Buscar</button></div><p>${x.id?'Tus notas, valoraciones y progreso se conservan al elegir una portada. ':''}${kind==='book'?'Busca por título, autor o ISBN. Compara editorial, idioma y año para elegir tu edición.':kind==='show'?'Portadas y capítulos de animes y series en TVmaze.':kind==='game'?'Busca juegos, portadas y precios. Se priorizan las ediciones en español. Precios de referencia sin envío ni posibles tasas.':'Carteles de películas de Cinemeta. El año te ayuda a distinguir versiones. Algunos títulos aparecen con su nombre internacional.'}</p>${kind==='game'?'<p class="catalog-credit"><a href="https://boardgameprices.co.uk/" target="_blank" rel="noopener noreferrer"><img src="https://boardgameprices.co.uk/img/meeple-logo-GB.png" alt="BoardGamePrices" referrerpolicy="no-referrer">Catálogo de juegos ↗</a></p>':''}${kind==='show'&&x.id&&!x.tvmazeId?`<label class="link-catalog"><input type="checkbox" id="link-catalog">Vincular también el catálogo de episodios y conservar mi progreso</label>`:''}${kind==='book'?select('Catálogo','lookupSource',['Todos','Google Books','Open Library','Internet Archive','Kitsu'],'Todos',true):''}<div id="lookup-results" class="lookup-results" aria-live="polite"></div></div>`}
function edit(kind,id){
 const key={book:'books',show:'shows',movie:'shows',game:'games'}[kind], x=state[key].find(x=>x.id===id)||{}, isNew=!x.id;
 const title={book:'lectura',show:'título',movie:'película',game:'juego'}[kind];let fields=field('Título','title',x.title,'text',true);
 if(kind==='book')fields+=field('Autor / autora','author',x.author)+select('Tipo de lectura','category',['Cómics','Mangas','Libros','Novelas gráficas'],x.category||(view==='books'&&typeFilter!=='Todos'?typeFilter:'Libros'))+select('Estado','status',states.book,x.status)+select('Formato de lectura','format',['Sin indicar',...formats],x.format||'Sin indicar')+field('Página actual','page',x.page||0,'number')+field('URL de portada · opcional','cover',x.cover,'url',true)+field('Precio de referencia · opcional','price',x.price)+field('Enlace al catálogo o tienda · opcional','sourceUrl',x.sourceUrl,'url')+rating(x.rating)+note(x.notes,'Impresiones y notas de lectura');
 if(kind==='show')fields+=select('Tipo','category',['Anime','Serie'],x.category||(view==='shows'?typeFilter:'Anime'))+select('Estado','status',states.show,isPaused(x)?x.status:states.show[0])+select('Emisión','airStatus',['Sin confirmar','En emisión','Finalizada'],x.airStatus||'Sin confirmar')+field('URL de portada · opcional','cover',x.cover,'url',true)+(!x.id?`<div class="full notice">La búsqueda importará el listado real disponible. También puedes añadir temporadas y capítulos manualmente después de guardar.</div>`:'')+rating(x.rating)+note(x.notes,'Notas sobre este título');
 if(kind==='movie')fields+=select('Estado','status',states.movie,x.id?mediaStatus(x):'Pendiente')+field('URL de portada · opcional','cover',x.cover,'url',true)+rating(x.rating||x.episodes?.[0]?.rating)+note(x.notes||x.episodes?.[0]?.notes,'Tu impresión de la película');
 if(kind==='game')fields+=select('Estado','status',states.game,x.status)+field('Precio de referencia · opcional','price',x.price)+field('URL de portada · opcional','cover',x.cover,'url',true)+`<p class="full small">Puedes escribir tu propio precio. El del catálogo corresponde al producto y no incluye envío ni posibles tasas.</p>`+rating(x.rating)+note(x.notes,'Tu experiencia de juego');
 const numeric=(label,key,value,min,max)=>`<label>${label}<input type="number" name="${key}" min="${min}" max="${max}" step="1" value="${esc(value??'')}"></label>`;
 if(kind!=='game')fields+=numeric('Año de publicación o estreno','year',yearOf(x.year),1000,2100);
 if(kind!=='game')fields+=field('Géneros · separados por comas','genres',labels(x.genres).join(', '),'text',true);
 if(kind==='movie'||kind==='show')fields+=numeric(kind==='movie'?'Duración (minutos)':'Duración habitual del capítulo (minutos)','runtime',x.runtime,1,2000);
 if(kind==='movie')fields+=`<label class="full">Sinopsis breve<textarea name="synopsis" maxlength="1800">${esc(x.synopsis||'')}</textarea></label>`;
 if(kind==='book')fields+=field('Editorial','publisher',x.publisher)+field('ISBN','isbn',x.isbn)+field('Idioma de la edición','language',x.language);
 if(kind==='book'||kind==='movie')fields+=numeric(kind==='book'?'Veces leído':'Veces vista','completions',completionCount(x,kind),0,10000)+`<div class="completion-action">${button(kind==='book'?'Sumar una lectura':'Sumar un visionado','increment-completion','subtle')}</div>`;
 if(kind==='game')fields+=`<p class="full small" data-game-players>${gamePlayersText(x)}</p>`+`<label class="full own-game"><input type="checkbox" name="owned" ${x.owned===true?'checked':''}> Tengo este juego</label>`;
 fields+=groupFields(x);
 const shortcuts=x.id?`<div class="item-shortcuts">${kind==='book'?button('Iniciar sesión de lectura','read','green',id):kind==='show'?button('Temporadas y capítulos','episodes','green',id):''}${button('Recomendar','recommend-item','subtle',id).replace('data-id=',`data-kind="${kind}" data-id=`)}</div>`:'';
 const finder=x.id?`<details class="editor-catalog"><summary>Buscar en el catálogo</summary>${lookup(kind,x)}</details>`:lookup(kind,x);
 openModal(`${isNew?'Añadir':'Tu'} ${title}`,isNew?'Haz un pequeño espacio para algo que te gusta.':'Cada detalle forma parte de tu camino.',`${shortcuts}${finder}<form id="item-form" data-kind="${kind}" data-id="${esc(x.id||'')}"><div class="form-grid">${fields}</div><div class="actions">${x.id?button('Eliminar','delete','danger',x.id):''}<button type="button" class="btn" data-action="close">Cancelar</button><button type="submit" class="btn primary">Guardar ${title}</button></div></form>${kind==='book'&&x.id?`<div class="section-heading"><h2>Tu tiempo entre páginas</h2><span>${time(totalTime(x))}</span></div><div class="history">${x.sessions.length?x.sessions.slice().reverse().map(s=>`<div class="history-row"><span>${date(s.started)}${s.page?` · pág. ${s.page}`:''}</span><span>${time(s.duration)}</span></div>`).join(''):'<p class="small">Tu primera sesión de lectura aparecerá aquí.</p>'}</div>${url(x.sourceUrl)?`<p class="source"><a href="${esc(url(x.sourceUrl))}" target="_blank" rel="noopener noreferrer">Consultar catálogo y disponibilidad ↗</a>${x.priceChecked?` · precio consultado el ${date(x.priceChecked)}`:''}</p>`:''}`:''}`);
 modal.pending=null;modal.pendingPrice=null;editionBrowse=null;
 if(kind==='game'&&x.id)enrichGamePlayers(x);
 if(kind==='movie'&&x.episodes?.some(e=>e.notes||e.rating)){modal.insertAdjacentHTML('beforeend',`<details class="legacy-notes"><summary>Apuntes del registro anterior</summary>${x.episodes.filter(e=>e.notes||e.rating).map(e=>`<div class="notice">${stars(e.rating)}<p class="notes">${esc(e.notes)}</p></div>`).join('')}</details>`);}
}
function saveItem(form){
 const f=new FormData(form),kind=form.dataset.kind,key=collectionKey[kind],old=state[key].find(x=>x.id===form.dataset.id),v=Object.fromEntries(f),title=v.title.trim();if(!title)return;
 if(v.cover&&!url(v.cover)){toast('La portada debe tener una dirección https:// válida.');return}
 if(v.sourceUrl&&!url(v.sourceUrl)){toast('El enlace debe empezar por https://.');return}
 const groups=groupNames([...f.getAll('groups'),v.newGroup||'']);
 const allGroups=groupNames([...getGroups(),...groups],1000);
 let x={...old,id:old?.id||uid(),addedAt:old?.addedAt||Date.now(),title,notes:v.notes||'',status:v.status||old?.status||'Pendiente',...(kind==='game'?{}:{year:yearOf(v.year),genres:labels(v.genres)}),groups};
 {const image=modal.pending?.cover===v.cover?modal.pending:null,sameCover=old?.cover===v.cover;Object.assign(x,{rating:Number(v.rating||0),cover:v.cover||'',coverSourceUrl:image?.sourceUrl||(sameCover?old?.coverSourceUrl:'')||'',coverProvider:image?.provider||(sameCover?old?.coverProvider:'')||''});}
 if(kind==='book')Object.assign(x,{author:v.author,category:v.category,page:Number(v.page)||0,price:v.price,sourceUrl:v.sourceUrl,sessions:old?.sessions||[],priceChecked:modal.pending?.priceChecked||old?.priceChecked||null,format:formats.includes(v.format)?v.format:'',publisher:v.publisher.trim().slice(0,200),isbn:v.isbn.trim().slice(0,30),language:v.language.trim().slice(0,35),editionId:modal.pending?.editionId||old?.editionId||'',completions:bounded(v.completions)??0});
 if(kind==='book'&&x.status==='Leído'&&!x.completions&&!completionCount(old||{},'book'))x.completions=1;
 if(kind==='game'){const amount=(v.price||'').trim(),price=modal.pendingPrice?.price===amount?modal.pendingPrice:old?.price===amount?old:null;const picked=modal.pending?.gameId?modal.pending:null,same=old&&(picked?String(old.gameId||'')===picked.gameId||old.coverSourceUrl===picked.sourceUrl:old.title===title||old.gameId||old.coverSourceUrl),range=playersLabel(picked?.minPlayers,picked?.maxPlayers)?picked:same?old:null;Object.assign(x,{gameId:picked?.gameId||old?.gameId||'',minPlayers:range?.minPlayers??null,maxPlayers:range?.maxPlayers??null,owned:f.has('owned'),price:amount,priceProvider:amount&&price?.priceProvider||'',priceSourceUrl:amount&&price?.priceSourceUrl||'',priceChecked:amount&&price?.priceChecked||null});}
 if(kind==='movie'){
  const count=bounded(v.completions)??0;
  x.completions=v.status==='Vista'&&!count&&!completionCount(old||{},kind)?1:count;
  x.status=isPaused(x)?x.status:x.completions?'Vista':'Pendiente';
  Object.assign(x,{category:'Película',runtime:bounded(v.runtime,1,2000),synopsis:v.synopsis.trim().slice(0,1800),imdbId:imdbOf(old)||modal.pending?.imdbId||'',episodes:(old?.episodes||[]).map(e=>({...e,watched:x.completions>0})),sourceUrl:old?.sourceUrl||modal.pending?.sourceUrl||''});
 }
 if(kind==='show'){
  const p=modal.pending;
  Object.assign(x,{category:v.category,airStatus:v.airStatus,runtime:bounded(v.runtime,1,2000),episodes:old?.episodes||(p?.episodes||[]),tvmazeId:old?.tvmazeId||p?.tvmazeId||null,sourceUrl:old?.sourceUrl||p?.sourceUrl||'',checked:old?.checked||p?.checked||null});

  if(p?.linkCatalog&&p.tvmazeId){const merged=mergeCatalog(x,{status:p.airStatus==='En emisión'?'Running':p.airStatus==='Finalizada'?'Ended':''},p.catalogEpisodes||[],p.checked||Date.now());Object.assign(x,merged.item,{tvmazeId:p.tvmazeId,sourceUrl:p.sourceUrl});}
  x.status=mediaStatus(x);
 }
 state.groups=allGroups;
 if(old)state[key][state[key].indexOf(old)]=x;else state[key].push(x);
 if(persist()){modal.close();render();toast('Guardado en tu cuaderno.');if(kind==='show'&&!x.episodes.length)episodes(x.id);if(kind==='game')enrichGamePlayers(x)}
}
function gamePlayersText(x){
 const range=playersLabel(x.minPlayers,x.maxPlayers);
 return range?`El catálogo indica ${range}.`:x.title?'Número de jugadores no disponible en el catálogo.':'El número de jugadores se rellena desde el catálogo.';
}
function gameDetails(x){
 return [playersLabel(x.minPlayers,x.maxPlayers),x.price?(x.priceProvider==='BoardGamePrices'?`Desde ${x.price} · sin envío ni tasas`:`Precio: ${x.price}`):''].filter(Boolean).join(' · ');
}
const gamePlayerJobs=new Map();
function enrichGamePlayers(item){
 if(!navigator.onLine||playersLabel(item.minPlayers,item.maxPlayers))return;
 const form=()=>{const current=$('#item-form',modal);return state.games.includes(item)&&modal.open&&current?.dataset.kind==='game'&&current.dataset.id===item.id&&!modal.pending?current:null;};
 const current=form(),label=current&&$('[data-game-players]',current);
 if(label)label.textContent='Buscando el número de jugadores…';
 if(gamePlayerJobs.has(item))return gamePlayerJobs.get(item);
 const job=searchBoardGames.players(item.title,{gameId:item.gameId,editionUrl:item.coverSourceUrl||item.priceSourceUrl}).then(range=>{
  if(!range||!state.games.includes(item))return;
  Object.assign(item,range);persist();
  const details=view==='games'&&$('[data-game-details="'+CSS.escape(item.id)+'"]');
  if(details){details.textContent=gameDetails(item);details.hidden=false;}
 }).catch(()=>{}).finally(()=>{
  const current=form(),label=current&&$('[data-game-players]',current);
  if(label)label.textContent=gamePlayersText(item);
  gamePlayerJobs.delete(item);
 });
 gamePlayerJobs.set(item,job);
 return job;
}
let enrichingGames=false;
async function enrichGames(){
 if(enrichingGames||!navigator.onLine)return;
 enrichingGames=true;
 try{
  const items=newestFirst(state.games).filter(x=>!playersLabel(x.minPlayers,x.maxPlayers));let i=0;
  const worker=async()=>{while(view==='games'&&i<items.length){const item=items[i++];if(state.games.includes(item))await enrichGamePlayers(item);}};
  await Promise.all([worker(),worker()]);
 }finally{enrichingGames=false;}
}
async function jsonFetch(endpoint){const response=await fetch(endpoint,{signal:AbortSignal.timeout(15000)});if(!response.ok){const error=Error(`Catálogo no disponible (${response.status})`);error.status=response.status;throw error};return response.json()}
async function searchCatalog(kind){
 const q=$('#lookup-query',modal).value.trim(),target=$('#lookup-results',modal),gen=++lookupGeneration;
 if(q.length<2){target.textContent='Escribe al menos dos caracteres.';return}
 target.textContent='Buscando portadas…';lookupResults=[];let results=[];
 try{
  if(kind==='book'){
   const source={'Google Books':'google','Open Library':'open','Internet Archive':'archive','Kitsu':'manga'}[$('[name="lookupSource"]',modal)?.value];
   const category=$('[name="category"]',modal)?.value;
   results=await searchBooks(q,source,category,jsonFetch);
  }else if(kind==='game'){
   results=await searchBoardGames(q);
  }else if(kind==='movie'){
   results=await searchMovies(q);
  }else{
   const data=await jsonFetch(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(q)}`);
   results=data.slice(0,8).map(({show:s})=>({title:s.name,cover:s.image?.medium||'',tvmazeId:s.id,category:s.type==='Animation'?'Anime':'Serie',airStatus:s.status==='Running'?'En emisión':s.status==='Ended'?'Finalizada':'Sin confirmar',sourceUrl:s.url,provider:'TVmaze',subtitle:`${s.premiered?.slice(0,4)||'Sin fecha'} · ${s.type}`,...showMeta(s)}));
  }
  if(gen!==lookupGeneration||!modal.open)return;
  lookupResults=results;
  editionBrowse=null;paintLookup(kind);
 }catch{if(gen===lookupGeneration&&modal.open)target.textContent='No se ha podido consultar el catálogo. Comprueba tu conexión o añade una URL de portada manualmente.'}
}
function paintLookup(kind){
 const target=$('#lookup-results',modal);if(!target)return;
 target.innerHTML=lookupResults.length?lookupResults.map((x,i)=>`<div class="lookup-entry"><button type="button" class="lookup-result" data-action="choose-result" data-index="${i}" data-kind="${kind}">${url(x.cover)?`<img src="${esc(url(x.cover))}" alt="" loading="lazy" referrerpolicy="no-referrer">`:''}<span><strong>${esc(x.title)}</strong><small>${esc([x.author,x.subtitle,x.publisher,x.language,x.isbn?'ISBN '+x.isbn:'',kind!=='game'&&x.year&&!x.subtitle?x.year:'',playersLabel(x.minPlayers,x.maxPlayers),x.provider,x.price?(kind==='game'?'Desde ':'')+x.price:kind==='game'?'Sin precio disponible':'',!url(x.cover)?'Sin portada':''].filter(Boolean).join(' · '))}</small></span></button>${kind==='book'&&x.workKey&&!editionBrowse?`<button type="button" class="btn subtle" data-action="book-editions" data-index="${i}">Ver ediciones</button>`:''}</div>`).join(''):'No se han encontrado coincidencias. Prueba el título original o añade el registro a mano.';
 if(editionBrowse)target.insertAdjacentHTML('afterbegin',`<div class="actions">${button('Volver a resultados','book-editions-back','subtle')}${editionBrowse.more?button('Más ediciones','book-editions-next','subtle'):''}</div>`);
}
async function showEditions(item,offset=0){
 const generation=++lookupGeneration,target=$('#lookup-results',modal);
 target.textContent='Buscando ediciones…';
 try{
  const result=await bookEditions(item,offset,jsonFetch);
  if(generation!==lookupGeneration||!modal.open)return;
  editionBrowse={item,offset,more:result.more,original:editionBrowse?.original||lookupResults};
  lookupResults=result.results;paintLookup('book');
 }catch{if(generation===lookupGeneration){paintLookup('book');toast('No se han podido cargar las ediciones.');}}
}
async function chooseResult(index,kind){
 let x=lookupResults[index];if(!x)return;
 const form=$('#item-form',modal),existing=!!form.dataset.id,linkCatalog=kind==='show'&&!!$('#link-catalog',modal)?.checked,gen=++lookupGeneration;
 if(kind==='movie'&&x.imdbId){
  const save=$('[type="submit"]',form);save.disabled=true;
  try{x={...x,...await movieDetails(x.imdbId,jsonFetch)};}catch{}finally{save.disabled=false}
  if(gen!==lookupGeneration||!modal.open)return;
 }
 if((!existing||linkCatalog)&&kind==='show'&&x.tvmazeId){
  $('#lookup-results',modal).textContent='Importando el listado de capítulos…';
  const save=$('[type="submit"]',form);save.disabled=true;
  try{const eps=await jsonFetch(`https://api.tvmaze.com/shows/${x.tvmazeId}/episodes?specials=1`);x.catalogEpisodes=eps;x.episodes=eps.filter(e=>Number.isInteger(e.number)).map(e=>({id:`tvmaze-${e.id}`,season:e.season,number:e.number,title:e.name||`Capítulo ${e.number}`,airdate:e.airdate||'',runtime:bounded(e.runtime,1,2000),watched:false,rating:0,notes:''}));x.checked=Date.now()}
  catch{x.episodes=[];toast('No se pudieron importar los capítulos. Puedes añadirlos manualmente.')}
  finally{save.disabled=false}
  if(gen!==lookupGeneration||!modal.open)return;
 }
 const keys=existing?['cover']:['title','author','cover','price','sourceUrl','category','airStatus'];
 if(kind==='book'){keys.push('publisher','isbn','language');if(existing&&x.sourceUrl)keys.push('sourceUrl');}
 for(const key of ['year','runtime','synopsis','genres']){
  const input=form.elements[key],value=key==='genres'?labels(x.genres).join(', '):x[key];
  if(input&&value&&(!existing||!input.value))input.value=value;
 }
 for(const key of keys)if(x[key]!==undefined&&form.elements[key]&&(key!=='cover'||url(x.cover)))form.elements[key].value=x[key];
 if(kind==='game'&&(!existing||!form.elements.price.value.trim()||form.elements.price.value===modal.pendingPrice?.price))applyGamePrice(x,form);
 modal.pending={...x,linkCatalog};
 if(kind==='game')$('[data-game-players]',form).textContent=gamePlayersText(x);
 $('#lookup-results',modal).innerHTML=`<div class="chosen-cover">${url(x.cover)?`<img src="${esc(url(x.cover))}" alt="Portada elegida" referrerpolicy="no-referrer">`:''}<div><p>${linkCatalog?'Catálogo seleccionado. Se conservarán tus apuntes y capítulos vistos.':existing?'Nueva portada seleccionada.':`«${esc(x.title)}» seleccionado.`}${(!existing||linkCatalog)&&x.episodes?` ${x.episodes.length} capítulos encontrados.`:''} Pulsa Guardar para aplicarlo.</p><p class="source">Datos de <a href="${esc(url(x.sourceUrl))}" target="_blank" rel="noopener noreferrer">${esc(x.provider)}</a>${x.provider==='TVmaze'?' · CC BY-SA 4.0':''}</p>${kind==='game'&&x.price?`<p>Desde ${esc(x.price)} · sin envío ni tasas${x.priceChecked?` · Consulta: ${date(x.priceChecked)}`:''}</p><button type="button" class="btn subtle" data-action="use-game-price" data-index="${index}">Usar este precio</button>`:''}</div></div>`;
}
function applyGamePrice(item,form){form.elements.price.value=item.price||'';modal.pendingPrice=item.price?{price:item.price,priceChecked:item.priceChecked,priceProvider:'BoardGamePrices',priceSourceUrl:item.sourceUrl}:null;}
function startReading(id){if(state.activeSession){render();return}const b=state.books.find(b=>b.id===id);if(!b)return;state.activeSession={bookId:id,started:Date.now(),elapsed:0,runningSince:Date.now()};b.completions=completionCount(b,'book');b.status='Leyendo';persist();modal.close();render()}
function elapsed(){const s=state.activeSession;return s?s.elapsed+(s.runningSince?Math.max(0,Date.now()-s.runningSince):0):0}
function timerText(ms){let sec=Math.floor(ms/1000);return [Math.floor(sec/3600),Math.floor(sec/60)%60,sec%60].map(n=>String(n).padStart(2,'0')).join(':')}
function cozy(){const b=state.books.find(b=>b.id===state.activeSession.bookId);return `<section class="cozy" aria-label="Sesión de lectura"><div class="cozy-inner"><span class="eyebrow">TU REFUGIO DE LECTURA</span><div class="reading-emblem">${icon('books')}</div><h1>${esc(b.title)}</h1><p>${esc(b.author||'Una historia. Un momento para ti.')}</p><div class="timer" role="timer" id="reading-timer">${timerText(elapsed())}</div><p>${state.activeSession.runningSince?'Respira. Deja que el mundo espere un poquito.':'La sesión está en pausa. Tómate tu tiempo.'}</p><div class="cozy-actions">${button(state.activeSession.runningSince?'Pausar':'Continuar','pause-reading','subtle')}${button('Finalizar sesión de lectura','finish-reading')}</div><label>¿En qué página te quedas? <input type="number" id="reading-page" min="0" max="100000" step="1" value="${b.page||0}"></label><p style="font-size:10px;margin-top:28px">El tiempo se conserva si sales de la aplicación.<br>Pausa la sesión si vas a dejar de leer.</p></div></section>`}
function finishReading(){const b=state.books.find(b=>b.id===state.activeSession.bookId),page=Number($('#reading-page')?.value)||0;if(page<0||page>100000||!Number.isInteger(page)){toast('Escribe un número de página válido.');return}b.sessions.push({started:state.activeSession.started,ended:Date.now(),duration:elapsed(),page});b.page=page;state.activeSession=null;if(persist()){go('books');typeFilter=b.category;render();openModal('Un ratito bien invertido.',`Sesión guardada · ${time(b.sessions.at(-1).duration)}`,`<p class="small">${esc(b.title)} lleva ${time(totalTime(b))} de lectura en ${b.sessions.length} sesiones.</p><div class="actions">${button('Seguir leyendo otro día','close')}${button('He terminado el libro','complete-book','primary',b.id)}</div>`)}}
function episodes(id,openSeasons=[]){
 const x=state.shows.find(x=>x.id===id);if(!x)return;
 if(isMovie(x)){edit('movie',id);return;}
 const seasons=[...new Set(x.episodes.map(e=>e.season))].sort((a,b)=>a-b);
 const today=new Date().toLocaleDateString('sv-SE');
 const item=(e)=>`<div class="episode" data-show="${esc(id)}" data-episode="${esc(e.id)}"><div class="episode-top"><label><input type="checkbox" data-ep="watched" ${e.watched?'checked':''}><span>${e.number}. ${esc(e.title)}</span></label><select aria-label="Valorar capítulo ${e.number}" data-ep="rating">${ratingOptions(e.rating)}</select></div>${e.airdate?`<div class="airdate">${e.airdate>today?'Previsto: ':'Emitido: '}${esc(e.airdate)}</div>`:''}<input type="text" data-ep="notes" maxlength="20000" aria-label="Notas del capítulo ${e.number}" placeholder="Tus notas" value="${esc(e.notes)}"></div>`;
 const parts=seasons.map(n=>{
  const rows=x.episodes.filter(e=>e.season===n),seen=rows.filter(e=>e.watched).length;
  const canMark=rows.some(e=>!e.watched&&(!e.airdate||e.airdate<=today));
  return `<section class="season-block"><div class="season-head"><strong>${n===0?'Especiales':`Temporada ${n}`}</strong><span data-season-progress="${n}">${seen} / ${rows.length} vistos</span>${canMark||seen?`<button type="button" class="btn subtle" data-action="watch-season" data-id="${esc(id)}" data-season="${n}" data-watched="${canMark}">${canMark?'Marcar temporada como vista':'Desmarcar temporada'}</button>`:''}</div><details data-season-details="${n}" ${openSeasons.includes(n)?'open':''}><summary>Capítulos ${japanese("エピソード")}</summary>${rows.map(item).join('')}</details></section>`;
 }).join('');
 openModal(esc(x.title),'Agrupa tus capítulos por temporada y marca de una vez los ya emitidos.',`<div class="toolbar">${button('Volver a la ficha','edit-show','subtle',id)}${button(`${icon('plus')} Añadir capítulos`,'add-season','',id)}${x.tvmazeId?button('Actualizar catálogo','refresh-show','',id):''}</div><div class="episode-list">${parts||empty('shows','Todavía no hay capítulos.','Añade una temporada para empezar a registrar tu progreso.')}</div>${x.tvmazeId?`<p class="source">Datos de <a href="${esc(url(x.sourceUrl)||`https://www.tvmaze.com/shows/${x.tvmazeId}`)}" target="_blank" rel="noopener noreferrer">TVmaze</a> · <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer">CC BY-SA 4.0</a>${x.checked?` · Catálogo actualizado a ${date(x.checked)}`:''}</p>`:''}<div class="actions">${button('Listo','close','primary')}</div>`);
}
function seasonForm(id){const x=state.shows.find(x=>x.id===id);openModal('Una temporada más.','Puedes completar el listado aunque el catálogo no tenga este título.',`<form id="season-form" data-id="${esc(id)}"><div class="form-grid"><label>Temporada (0 para especiales)<input name="season" type="number" min="0" max="1000" required value="${Math.max(0,...x.episodes.map(e=>e.season))+1}"></label><label>Número de capítulos<input name="count" type="number" min="1" max="500" required value="12"></label><label>Empezar en el capítulo<input name="start" type="number" min="1" max="10000" required value="1"></label></div><p class="small" style="margin-top:15px">Los capítulos ya existentes se conservan.</p><div class="actions">${button('Volver','episodes','',id)}<button class="btn primary" type="submit">Añadir capítulos</button></div></form>`)}
function catalogProgress(){
 if(!catalogJob)return '';
 const job=catalogJob;
 return `<div class="catalog-progress" id="catalog-progress" role="status" aria-live="polite"><strong>${job.running?`Actualizando catálogo · ${job.done} de ${job.total}`:job.cancelled?'Actualización detenida':'Catálogo actualizado'}</strong><p>${job.updated} títulos actualizados · ${job.added} capítulos nuevos${job.failed.length?` · ${job.failed.length} sin actualizar`:''}${job.skipped?` · ${job.skipped} sin vincular a TVmaze`:''}</p>${job.running?button('Detener al terminar este título','cancel-catalog','subtle'):job.failed.length?`<p>No se pudieron actualizar: ${job.failed.map(esc).join(', ')}. Puedes volver a intentarlo; se conservan tus registros.</p>`:''}</div>`;
}
function paintCatalogProgress(){
 const target=$('#catalog-progress');if(target)target.outerHTML=catalogProgress();
 const btn=$('[data-action="refresh-all"]');if(btn){btn.disabled=!!catalogJob?.running;btn.textContent=catalogJob?.running?'Actualizando catálogo…':'Actualizar todo el catálogo';}
}
async function fetchShowCatalog(id){
 for(let attempt=0;attempt<3;attempt++){
  try{const [show,episodes]=await Promise.all([jsonFetch(`https://api.tvmaze.com/shows/${id}`),jsonFetch(`https://api.tvmaze.com/shows/${id}/episodes?specials=1`)]);
   if(!Array.isArray(episodes)||!show||!show.id)throw Error('Respuesta de catálogo no válida');
   return {show,episodes};
  }catch(error){if(error.status!==429||attempt===2)throw error;await new Promise(resolve=>setTimeout(resolve,2500*(attempt+1)))}
 }
}
async function updateShow(id){
 const before=state.shows.find(x=>x.id===id);if(!before||isMovie(before)||!before.tvmazeId)return null;
 const data=await fetchShowCatalog(before.tvmazeId);
 // Read again after the request: preserve changes made while it was in flight.
 const index=state.shows.findIndex(x=>x.id===id);if(index<0||isMovie(state.shows[index]))return null;
 const result=mergeCatalog(state.shows[index],data.show,data.episodes);setIfMissing(result.item,showMeta(data.show));
 const previous=state.shows[index];state.shows[index]=result.item;
 if(!persist()){state.shows[index]=previous;throw Error('No se pudo guardar el catálogo');}
 return result;
}
async function refreshShow(id){
 if(catalogJob?.running||catalogSingleRunning){toast('Ya hay una actualización en marcha.');return}
 catalogSingleRunning=true;const btn=$('[data-action="refresh-show"]',modal);if(btn){btn.disabled=true;btn.textContent='Actualizando…'}
 try{const result=await updateShow(id);if(result){render();if(modal.open&&$('#modal [data-action="add-season"]')?.dataset.id===id)episodes(id);toast(`Catálogo actualizado. ${result.added} capítulos nuevos.`)}}
 catch{toast('No se pudo actualizar. Tus notas y capítulos se conservan.')}
 finally{catalogSingleRunning=false;if(btn?.isConnected){btn.disabled=false;btn.textContent='Actualizar catálogo'}}
}
async function refreshAllCatalog(){
 if(catalogJob?.running||catalogSingleRunning){toast('Ya hay una actualización en marcha.');return}
 const series=state.shows.filter(x=>!isMovie(x)),targets=series.filter(x=>x.tvmazeId).map(x=>({id:x.id,title:x.title}));
 catalogJob={running:true,total:targets.length,done:0,updated:0,added:0,failed:[],skipped:series.length-targets.length,cancelled:false};
 render();paintCatalogProgress();
 for(const target of targets){
  if(catalogJob.cancelled)break;
  try{const result=await updateShow(target.id);if(result){catalogJob.updated++;catalogJob.added+=result.added;}}
  catch{catalogJob.failed.push(target.title)}
  catalogJob.done++;paintCatalogProgress();
  // Two requests per title, spaced to respect the public API's rate limit.
  if(catalogJob.done<targets.length&&!catalogJob.cancelled)await new Promise(resolve=>setTimeout(resolve,1200));
 }
 catalogJob.running=false;
 if(view==='shows'&&!modal.open&&!document.activeElement?.matches('input,textarea,select'))render();else paintCatalogProgress();
 toast(catalogJob.cancelled?'Actualización detenida. Se conservan los títulos ya actualizados.':`Catálogo: ${catalogJob.updated} títulos actualizados, ${catalogJob.added} capítulos nuevos${catalogJob.failed.length?` y ${catalogJob.failed.length} sin actualizar`:''}.`);
}

function groupsDialog(){
 const groups=getGroups(), items=[...state.books,...state.shows,...state.games];
 openModal('Tus grupos','Agrupa títulos de cualquier colección: una saga, un reto o una selección propia.',`<form id="group-form" class="lookup-row"><label class="grow">Nombre del grupo<input name="groupName" maxlength="80" required></label><button type="submit" class="btn primary">Crear grupo</button></form><div class="lookup-results">${groups.map(g=>button(`${esc(g)} · ${items.filter(x=>groupNames(x.groups).some(n=>groupKey(n)===groupKey(g))).length} títulos`,'open-group','subtle',g)).join('')}</div>`);
}
function groupDialog(name){
 const items=newestFirst([...state.books.map(x=>({...x,kind:'book'})),...state.shows.map(x=>({...x,kind:isMovie(x)?'movie':'show'})),...state.games.map(x=>({...x,kind:'game'}))]).filter(x=>groupNames(x.groups).some(n=>groupKey(n)===groupKey(name)));
 openModal(esc(name),'Marca este grupo en la ficha de cualquier título para añadirlo aquí.',`<div class="lookup-results">${items.length?items.map(x=>button(`${esc(x.title)} · ${kinds[x.kind]}`,'edit-'+x.kind,'subtle',x.id)).join(''):'Este grupo todavía está vacío.'}</div><div class="actions">${button('Volver a grupos','groups','subtle')}</div>`);
}
function suggestGameDialog(){
 openModal('Sugerir un juego','Se incluyen tus juegos marcados como Jugado y que encajen con el número de jugadores.',`<form id="suggest-form"><label>¿Cuántos vais a jugar?<input type="number" name="players" min="1" max="1000" required></label><div class="actions"><button type="submit" class="btn primary">Sugerir juego</button></div></form>`);
}
function showSuggestion(kind,players=null,exclude){
 const source=state[collectionKey[kind]]?.filter(x=>kind==='movie'?isMovie(x):kind==='show'?!isMovie(x):true)||[];
 const item=suggestItem(source,kind,{players,exclude,status:x=>['show','movie'].includes(kind)?mediaStatus(x):x.status});
 if(!item){openModal('Por ahora no hay sugerencias',kind==='game'?`No hay juegos propios y jugados compatibles con ${players} jugadores. Solo se incluyen juegos cuyo número de jugadores figura en el catálogo.`:'No hay títulos pendientes en esta colección.',`<div class="actions">${kind==='game'?button('Cambiar jugadores','suggest','subtle'):''}${button('Listo','close','primary')}</div>`);return}
 openModal('Una sugerencia para ti',kind==='game'?playersLabel(item.minPlayers,item.maxPlayers):kinds[kind],`<article class="suggestion-item">${cover(item,kind)}<div><h3>${esc(item.title)}</h3>${item.synopsis?`<p class="small">${esc(item.synopsis)}</p>`:''}</div></article><div class="actions"><button type="button" class="btn subtle" data-action="suggest-again" data-kind="${kind}" data-players="${players||''}" data-id="${esc(item.id)}">Sugerir otro</button>${button('Abrir ficha','edit-'+kind,'primary',item.id)}</div>`);
}
function bulkMovies(){
 bulk={results:[],selected:new Map(),busy:false};
 openModal('Añadir varias películas','Selecciona los títulos de una saga o combina varias búsquedas. Se guardarán como pendientes.',`<form id="bulk-search-form" class="lookup-row"><label class="grow">Título o saga<input type="search" name="q" maxlength="160" required></label><button class="btn" type="submit">Buscar</button></form><div id="bulk-summary" aria-live="polite"></div><div id="bulk-results" class="lookup-results"></div><div class="actions">${button('Quitar selección','clear-bulk','subtle')}${button('Añadir seleccionadas','save-bulk','primary')}</div>`);
 paintBulkSummary();
}
function paintBulkSummary(){
 const summary=$('#bulk-summary',modal),save=$('[data-action="save-bulk"]',modal);if(!summary||!bulk)return;
 summary.textContent=bulk.selected.size?`${bulk.selected.size} seleccionadas: ${[...bulk.selected.values()].map(x=>x.title).join(' · ')}`:'Ninguna seleccionada';
 save.disabled=bulk.busy||!bulk.selected.size;
}
function paintBulk(){
 const target=$('#bulk-results',modal);if(!target||!bulk)return;
 const existing=new Set(state.shows.filter(isMovie).map(imdbOf).filter(Boolean));
 target.innerHTML=bulk.results.length?bulk.results.map(x=>`<label class="bulk-result">${url(x.cover)?`<img src="${esc(url(x.cover))}" alt="" loading="lazy" referrerpolicy="no-referrer">`:''}<span><strong>${esc(x.title)}</strong><small>${esc(x.year||x.subtitle||'')}${existing.has(x.imdbId)?' · Ya está en tu biblioteca':''}</small></span><input type="checkbox" aria-label="Seleccionar ${esc(x.title)}" data-bulk-pick="${esc(x.imdbId)}" ${bulk.selected.has(x.imdbId)?'checked':''} ${existing.has(x.imdbId)||bulk.busy?'disabled':''}></label>`).join(''):'No se han encontrado películas.';
 paintBulkSummary();
}
async function searchBulkMovies(form){
 const job=bulk,target=$('#bulk-results',modal);
 if(!job||job.busy)return;const gen=++lookupGeneration;target.textContent='Buscando películas…';
 try{const items=await searchMovies(String(new FormData(form).get('q')).trim());if(bulk===job&&gen===lookupGeneration&&modal.open){job.results=items;paintBulk();}}
 catch{if(gen===lookupGeneration)target.textContent='No se pudo buscar. Inténtalo de nuevo.';}
}
async function saveBulkMovies(target){
 const job=bulk;if(!job||job.busy||!job.selected.size)return;const gen=++lookupGeneration;
 job.busy=true;target.textContent='Preparando fichas…';paintBulk();
 const all=[...job.selected.values()];const prepared=[];
 for(let i=0;i<all.length;i+=3){
  if(gen!==lookupGeneration||!modal.open||bulk!==job){job.busy=false;return;}
  prepared.push(...await Promise.all(all.slice(i,i+3).map(async x=>{try{return {...x,...await movieDetails(x.imdbId,jsonFetch)}}catch{return x}})));
 }
 if(gen!==lookupGeneration||!modal.open||bulk!==job){job.busy=false;return;}
 const ids=new Set(state.shows.filter(isMovie).map(imdbOf).filter(Boolean));
 const added=prepared.filter(x=>!ids.has(x.imdbId)).slice(0,Math.max(0,10000-state.shows.length)).map((x,i)=>({...x,id:uid(),addedAt:Date.now()+i,status:'Pendiente',completions:0,notes:'',rating:0,episodes:[],coverSourceUrl:x.sourceUrl,coverProvider:x.cover?x.provider:'',cover:x.cover||''}));
 const previous=state.shows;state.shows=[...previous,...added];
 if(persist()){modal.close();bulk=null;render();toast(`${added.length} películas añadidas.`);}
 else{state.shows=previous;job.busy=false;target.textContent='Añadir seleccionadas';paintBulk();}
}
const metadataPending=new Set();
async function enrichSaved(kind){
 const matching=kind==='movie'?'movies':'shows';
 const entries=newestFirst(state.shows).filter(x=>kind==='movie'?isMovie(x)&&imdbOf(x)&&(!x.synopsis||!x.runtime||!x.year||!labels(x.genres).length):!isMovie(x)&&x.tvmazeId&&(!x.year||!x.runtime||!labels(x.genres).length)).filter(x=>!metadataPending.has(x.id)).slice(0,18);
 if(!entries.length)return;
 let changed=false;
 for(const entry of entries){
  if(view!==matching)break;
  metadataPending.add(entry.id);
  try{
   const incoming=kind==='movie'?await movieDetails(imdbOf(entry),jsonFetch):showMeta(await jsonFetch(`https://api.tvmaze.com/shows/${Number(entry.tvmazeId)}`));
   const current=state.shows.find(x=>x.id===entry.id);
   if(current){const before=JSON.stringify(current);setIfMissing(current,incoming);changed=changed||before!==JSON.stringify(current);}
  }catch{metadataPending.delete(entry.id);}
  if(kind==='show')await new Promise(r=>setTimeout(r,600));
 }
 if(changed&&persist()&&view===matching&&!modal.open&&!document.activeElement?.matches('input,select'))render();
}

function recommendations(){
 const messages=state.recommendations||[];
 return heading('Recomendaciones.','Guarda los títulos que te recomienden.')+`<section class="panel padded"><h2>Importar recomendación</h2><p class="small">Pega el código que copiaste al abrir la recomendación.</p><form id="receive-rec-form"><label>Código de recomendación<input id="receive-rec-code" type="text" name="code" maxlength="9000" required autocomplete="off" autocapitalize="none" spellcheck="false"></label><div class="actions">${navigator.clipboard?.readText?button('Pegar código','paste-rec-code','primary'):''}<button type="submit" class="btn">Abrir recomendación</button></div></form></section><section class="panel padded rec-history"><h2>Historial ${japanese("履歴")}</h2>${messages.length?[...messages].reverse().map(recCard).join(''):'<p class="small">Aquí aparecerán tus recomendaciones guardadas y preparadas.</p>'}</section>`;
}
function recCard(m){
 const received=m.direction==='received';
 return `<article class="rec-message"><span class="tag">${received?'Recibida':'Enlace preparado'} · ${esc(kinds[m.kind])}</span><h3>${esc(m.title)}</h3><p class="small">${received?'De '+esc(m.name)+' · ':''}${date(m.createdAt)}</p>${m.note?`<p class="notes">${esc(m.note)}</p>`:''}<div class="rec-actions">${received?button('Añadir a mi biblioteca','rec-to-library','subtle',m.id):button('Volver a compartir','rec-link-again','subtle',m.id)}</div></article>`;
}
function composeRec({title='',kind='book'}={}){
 const opts=Object.entries(kinds).map(([k,v])=>`<option value="${k}" ${k===kind?'selected':''}>${v}</option>`).join('');
 openModal('Preparar recomendación','Comparte un título con un amigo.',`<form id="compose-rec-form"><div class="form-grid">${field('Título','title',title,'text',true)}<label>Tipo<select name="kind">${opts}</select></label><label class="full">Tu mensaje · opcional<textarea name="note" maxlength="800"></textarea></label></div><div class="actions"><button type="submit" class="btn primary">Preparar enlace</button></div></form>`);
}
function saveRecommendation(message,direction){
 const previous=state.recommendations;
 state.recommendations=[...(previous||[]),{...message,direction}].slice(-1000);
 if(persist())return true;
 state.recommendations=previous;return false;
}
function prepareRec(form){
 const f=new FormData(form),message={id:uid(),createdAt:Date.now(),name:state.profile.name||'Usuario de FRIKIRIAM',title:String(f.get('title')).trim(),kind:f.get('kind'),note:String(f.get('note')).trim()};
 if(!validMessage(message)){toast('Escribe un título para la recomendación.');return;}
 if(saveRecommendation(message,'prepared')){if(view==='recommendations')render();recLink(message);}
}
function recLink(m){
 if(!m)return;
 const link=recommendationLink(m),whatsapp='https://wa.me/?text='+encodeURIComponent('Te recomiendo «'+m.title+'» en FRIKIRIAM:\n'+link);
 openModal('Enlace preparado','Quien tenga este enlace podrá leer el título y tu mensaje.',`<label>Enlace de la recomendación<input id="prepared-rec-link" type="text" readonly value="${esc(link)}"></label><div class="actions">${button('Copiar enlace','copy-rec-link','subtle')}${navigator.share?button('Compartir…','share-rec-link','subtle'):''}<a class="btn primary" href="${esc(whatsapp)}" target="_blank" rel="noopener noreferrer">Enviar por WhatsApp</a></div>`);
}
function receiveRec(value,fromLocation=false){
 const message=(fromLocation?readRecommendation:readSharedRecommendation)(value);
 if(fromLocation){history.replaceState(null,'',location.pathname+location.search);go('recommendations');}
 if(!message||message.legacy){toast(message?.legacy?'Este enlace es de la versión anterior. Pide que te lo compartan de nuevo.':fromLocation?'El enlace de recomendación no es válido.':'No se encontró un código de recomendación válido.');return;}
 const standalone=navigator.standalone===true||matchMedia('(display-mode: standalone)').matches;
 if(fromLocation&&!standalone){
  const fromAppleMobile=needsInstalledAppTransfer({userAgent:navigator.userAgent,platform:navigator.platform,maxTouchPoints:navigator.maxTouchPoints});
  showRecommendationTransfer(message,fromAppleMobile);return;
 }
 if(!fromLocation&&view!=='recommendations')go('recommendations');
 showReceivedRecommendation(message);
}
function showRecommendationTransfer(message,fromAppleMobile){
 const openApp=fromAppleMobile?'Abre FRIKIRIAM desde su icono en la pantalla de inicio.':'Abre FRIKIRIAM donde tienes tu biblioteca.';
 openModal(esc(message.title),`Recomendación de ${esc(message.name)} · ${kinds[message.kind]}`,`<p class="notes">${esc(message.note)}</p><div class="notice"><strong>Guárdala junto a tu biblioteca</strong><ol class="install-steps"><li>Pulsa «Copiar código».</li><li>${openApp}</li><li>En Recomendaciones, pulsa «Pegar código» y guárdala.</li></ol></div><div class="actions">${button('Copiar código','copy-rec-transfer','primary')}${button('Continuar en el navegador','continue-browser-rec','subtle')}</div><p class="small" id="rec-transfer-status" role="status"></p><div id="rec-transfer-field" hidden><label>Código de recomendación<input id="rec-transfer-code" type="text" readonly value="${esc(recommendationCode(message))}"></label></div>`);
 modal.transferRecommendation=message;
}
function showReceivedRecommendation(message){
 if(state.recommendations?.some(m=>m.id===message.id&&m.direction==='received')){if(modal.open)modal.close();toast('Esta recomendación ya está guardada.');return;}
 openModal(esc(message.title),`Recomendación de ${esc(message.name)} · ${kinds[message.kind]}`,`<p class="notes">${esc(message.note)}</p><div class="actions">${button('Cancelar','close')}${button('Guardar recomendación','save-rec','primary')}</div>`);
 modal.incoming=message;
}
function exportBackup(){const blob=new Blob([JSON.stringify({...state,exportedAt:new Date().toISOString()},null,2)],{type:'application/json'}),href=URL.createObjectURL(blob),a=document.createElement('a');a.href=href;a.download=`frikiriam-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(href),10000);toast('Copia preparada. Guárdala en un lugar seguro.')}
function importBackup(){const input=document.createElement('input');input.type='file';input.accept='.json,application/json';input.onchange=async()=>{const f=input.files[0];if(!f)return;if(f.size>20*1024*1024){toast('La copia supera el límite de 20 MB.');return}try{const data=JSON.parse(await f.text());validate(data);openModal('Restaurar tu cuaderno',`${data.books.length} lecturas · ${data.shows.filter(x=>!isMovie(x)).length} series · ${data.shows.filter(isMovie).length} películas · ${data.games.length} juegos`,`<p class="small">La copia de ${esc(data.profile.name||'tu perfil')} sustituirá los datos de este dispositivo. Exporta primero el cuaderno actual si quieres conservarlo.</p><div class="actions">${button('Exportar cuaderno actual','export')}${button('Cancelar','close')}${button('Restaurar copia','confirm-import','primary')}</div>`);modal.backup=normalizeLibrary(data)}catch{toast('El archivo no es una copia válida de FRIKIRIAM. No se han cambiado tus datos.')}};input.click()}
function help(){openModal('Tu universo, siempre a mano.','Una aplicación para llevar a tu propio ritmo.',`<h3>Instalar en iPhone</h3><ol class="install-steps"><li>Abre esta dirección en Safari.</li><li>Pulsa Compartir → Añadir a pantalla de inicio.</li><li>Elige «Añadir». Ya tienes tu acceso a FRIKIRIAM.</li></ol><div class="notice">Cada persona guarda sus propios datos en su navegador. Haz una copia antes de cambiar de dispositivo. Después de la primera carga, el cuaderno funciona sin conexión; las portadas externas y búsquedas requieren internet.</div><h3>Comparte un pequeño universo</h3><p class="small">La dirección de la aplicación no incluye tus datos personales.</p><div class="actions">${button('Compartir aplicación','share','primary')}${button('Listo','close')}</div>`)}
document.addEventListener('click',async event=>{
 const target=event.target.closest('[data-action],[data-view],[data-filter],[data-type-filter]');if(!target)return;
 if(target.dataset.view){event.preventDefault();go(target.dataset.view);return}
 if(target.dataset.typeFilter){typeFilter=target.dataset.typeFilter;if(view==='books')filter='Todos';genreFilter=yearFilter=formatFilter='';render();return}
 if(target.dataset.filter){filter=target.dataset.filter;render();return}
 const action=target.dataset.action,id=target.dataset.id;
 if(action==='set-layout'){if(!['books','shows','movies','games'].includes(view)||!['list','grid'].includes(target.dataset.layout))return;collectionViews[view]=target.dataset.layout;try{catalogStorage?.setItem('frikiriam.views.v1',JSON.stringify(collectionViews))}catch{toast('La vista se aplicará durante esta sesión. No se ha podido guardar la preferencia.')}render();$('.view-switch [aria-pressed="true"]')?.focus();}
 else if(action==='close'){lookupGeneration++;modal.close()}
 else if(action.startsWith('add-')&&['book','show','movie','game'].includes(action.slice(4)))edit(action.slice(4));
 else if(action.startsWith('edit-'))edit(action.slice(5),id);
 else if(action==='delete'){const form=$('#item-form',modal),kind=form.dataset.kind;openModal('¿Eliminar este registro?','Este cambio no se puede deshacer.',`<p class="small">Se eliminarán sus notas, valoraciones e historial asociado.</p><div class="actions">${button('Conservar','edit-'+kind,'',id)}<button class="btn danger" data-action="confirm-delete" data-kind="${kind}" data-id="${esc(id)}">Eliminar definitivamente</button></div>`)}
 else if(action==='confirm-delete'){const key={book:'books',show:'shows',movie:'shows',game:'games'}[target.dataset.kind];state[key]=state[key].filter(x=>x.id!==id);if(state.activeSession?.bookId===id)state.activeSession=null;if(persist()){modal.close();render();toast('Registro eliminado.')}}
 else if(action==='use-game-price'){const form=$('#item-form',modal),item=lookupResults[Number(target.dataset.index)];if(form?.dataset.kind==='game'&&item?.price){applyGamePrice(item,form);target.textContent='Precio aplicado al formulario';target.disabled=true;}}
 else if(action==='lookup')searchCatalog(target.dataset.kind);
 else if(action==='choose-result')chooseResult(Number(target.dataset.index),target.dataset.kind);
 else if(action==='read')startReading(id);
 else if(action==='pause-reading'){const s=state.activeSession,b=state.books.find(b=>b.id===s.bookId);b.page=Math.max(0,Math.min(100000,Number($('#reading-page')?.value)||0));if(s.runningSince){s.elapsed=elapsed();s.runningSince=null}else s.runningSince=Date.now();persist();render()}
 else if(action==='finish-reading')finishReading();
 else if(action==='complete-book'){const b=state.books.find(b=>b.id===id);b.completions=Math.min(10000,completionCount(b,'book')+1);b.status='Leído';persist();render();edit('book',id)}
 else if(action==='episodes')episodes(id);
 else if(action==='add-season')seasonForm(id);
 else if(action==='refresh-show')refreshShow(id);
 else if(action==='refresh-all')refreshAllCatalog();
 else if(action==='cancel-catalog'){if(catalogJob)catalogJob.cancelled=true;target.disabled=true;target.textContent='Deteniendo…';}
 else if(action==='increment-completion'){
  const form=target.closest('form'),input=form.elements.completions;
  input.value=Math.min(10000,(bounded(input.value)??0)+1);
  form.elements.status.value=form.dataset.kind==='book'?'Leído':'Vista';
 }
 else if(action==='watch-season'){
  const i=state.shows.findIndex(x=>x.id===id&&!isMovie(x));if(i<0)return;
  const opened=[...modal.querySelectorAll('[data-season-details][open]')].map(e=>Number(e.dataset.seasonDetails)),scroll=$('.episode-list',modal)?.scrollTop||0;
  const {item,affected}=changeSeason(state.shows[i],Number(target.dataset.season),target.dataset.watched==='true',new Date().toLocaleDateString('sv-SE'));
  item.status=mediaStatus(item);state.shows[i]=item;
  if(persist()){render();episodes(id,opened);$('.episode-list',modal).scrollTop=scroll;toast(`${affected} capítulos actualizados.`);}
 }
 else if(action==='groups')groupsDialog();
 else if(action==='open-group')groupDialog(id);
 else if(action==='suggest'){if(view==='games')suggestGameDialog();else showSuggestion(sections[view]);}
 else if(action==='suggest-again')showSuggestion(target.dataset.kind,Number(target.dataset.players)||null,id);
 else if(action==='bulk-movies')bulkMovies();
 else if(action==='save-bulk')saveBulkMovies(target);
 else if(action==='clear-bulk'){if(!bulk?.busy){bulk.selected.clear();paintBulk();}}
 else if(action==='book-editions')showEditions(lookupResults[Number(target.dataset.index)]);
 else if(action==='book-editions-back'){lookupResults=editionBrowse.original;editionBrowse=null;paintLookup('book');}
 else if(action==='book-editions-next')showEditions(editionBrowse.item,editionBrowse.offset+20);
 else if(action==='paste-rec-code'){
  const form=target.closest('form'),input=$('#receive-rec-code',form);
  try{const value=await navigator.clipboard.readText();if(form.isConnected&&!modal.open)receiveRec(value);}
  catch{if(form.isConnected&&!modal.open){input.focus();toast('Mantén pulsado el campo y elige «Pegar».');}}
 }
 else if(action==='copy-rec-transfer'){
  const input=$('#rec-transfer-code',modal),status=$('#rec-transfer-status',modal);
  if(input&&status){try{await navigator.clipboard.writeText(input.value);status.textContent='Código copiado. Pégalo en Recomendaciones en tu app de FRIKIRIAM.';}
   catch{$('#rec-transfer-field',modal)?.removeAttribute('hidden');input.focus();input.select();status.textContent='Copia el código seleccionado.';}}
 }
 else if(action==='continue-browser-rec'){if(modal.transferRecommendation)showReceivedRecommendation(modal.transferRecommendation);}
 else if(action==='copy-rec-link'||action==='share-rec-link'){
  const input=$('#prepared-rec-link');
  if(input){try{if(action==='share-rec-link'&&navigator.share)await navigator.share({title:'Recomendación de FRIKIRIAM',url:input.value});else{await navigator.clipboard.writeText(input.value);toast('Enlace copiado.');}}catch(e){if(e.name!=='AbortError'){input.focus();input.select();toast('Copia el enlace seleccionado.');}}}
 }
 else if(action==='recommend-item'){const kind=target.dataset.kind,item=state[collectionKey[kind]]?.find(x=>x.id===id);if(item)composeRec({kind,title:item.title});}
 else if(action==='rec-link-again')recLink(state.recommendations?.find(m=>m.id===id&&m.direction==='prepared'));
 else if(action==='rec-to-library'){const m=state.recommendations?.find(m=>m.id===id&&m.direction==='received');if(m){edit(m.kind);$('[name="title"]',modal).value=m.title;$('#lookup-query',modal).value=m.title;}}
 else if(action==='save-rec'){
  const m=modal.incoming;if(!m)return;
  if(state.recommendations?.some(x=>x.direction==='received'&&x.id===m.id)){modal.close();toast('Esta recomendación ya está guardada.');return;}
  if(saveRecommendation(m,'received')){modal.incoming=null;modal.close();render();toast('Recomendación guardada.');}
 }
 else if(action==='export')exportBackup();
 else if(action==='import')importBackup();
 else if(action==='confirm-import'){state=modal.backup;if(persist()){modal.close();render();toast('Tu cuaderno ha sido restaurado.')}}
 else if(action==='help')help();
 else if(action==='share'){try{if(navigator.share)await navigator.share({title:'FRIKIRIAM',text:'Tus lecturas, series, películas y juegos en un mismo lugar.',url:location.href});else{await navigator.clipboard.writeText(location.href);toast('Enlace copiado.')}}catch(e){if(e.name!=='AbortError')toast('Puedes copiar la dirección desde la barra de tu navegador.')}}
});
document.addEventListener('keydown',event=>{if(event.key==='Enter'&&event.target.id==='lookup-query'){event.preventDefault();const form=$('#item-form',modal);if(form)searchCatalog(form.dataset.kind)}});
document.addEventListener('paste',event=>{
 if(event.target.id!=='receive-rec-code')return;
 const value=event.clipboardData?.getData('text/plain');
 if(!readSharedRecommendation(value))return;
 event.preventDefault();receiveRec(value);
});
document.addEventListener('submit',event=>{
 if(event.target.id==='compose-rec-form'){event.preventDefault();prepareRec(event.target);}
 if(event.target.id==='receive-rec-form'){event.preventDefault();receiveRec(String(new FormData(event.target).get('code')).trim());}
 if(event.target.id==='bulk-search-form'){event.preventDefault();searchBulkMovies(event.target);}
 if(event.target.id==='group-form'){
  event.preventDefault();const n=groupNames([new FormData(event.target).get('groupName')])[0];if(!n)return;
  if(getGroups().some(g=>groupKey(g)===groupKey(n))){toast('Ya existe un grupo con ese nombre.');return;}
  state.groups=groupNames([...getGroups(),n],1000);if(persist())groupsDialog();
 }
 if(event.target.id==='suggest-form'){event.preventDefault();const n=bounded(new FormData(event.target).get('players'),1,1000);if(n)showSuggestion('game',n);}
 if(event.target.id==='item-form'){event.preventDefault();saveItem(event.target)}
 if(event.target.id==='profile-form'){event.preventDefault();const f=new FormData(event.target);state.profile={name:f.get('name').trim()};if(persist()){render();toast('Perfil guardado.')}}
 if(event.target.id==='season-form'){event.preventDefault();const f=new FormData(event.target),x=state.shows.find(x=>x.id===event.target.dataset.id),s=Number(f.get('season')),n=Number(f.get('count')),start=Number(f.get('start'));if(!Number.isInteger(s)||s<0||s>1000||!Number.isInteger(n)||n<1||n>500||!Number.isInteger(start)||start<1||start+n>10001)return;for(let i=start;i<start+n;i++)if(!x.episodes.some(e=>e.season===s&&e.number===i))x.episodes.push({id:uid(),season:s,number:i,title:`Capítulo ${i}`,airdate:'',watched:false,rating:0,notes:''});x.episodes.sort((a,b)=>a.season-b.season||a.number-b.number);x.status=mediaStatus(x);if(persist()){render();episodes(x.id);toast('Capítulos añadidos.')}}
});
document.addEventListener('input',event=>{
 if(event.target.id==='collection-search'){const pos=event.target.selectionStart;query=event.target.value;const content=collection(),temp=document.createElement('div');temp.innerHTML=content;$('#collection-list').innerHTML=$('#collection-list',temp).innerHTML;if(pos!==null)event.target.setSelectionRange(pos,pos)}
 if(event.target.dataset.ep==='notes')updateEpisode(event.target);
});
document.addEventListener('change',event=>{
 const t=event.target;
 if(t.dataset.collectionFilter){
  const key=t.dataset.collectionFilter,value=t.value;
  if(key==='genre')genreFilter=value;if(key==='year')yearFilter=value;if(key==='group')groupFilter=value;if(key==='format')formatFilter=value;
  render();const next=$(`[data-collection-filter="${key}"]`);if(next){next.closest('details').open=true;next.focus({preventScroll:true});}return;
 }
 if(t.name==='rating'&&!t.dataset.ep){const preview=$('[data-rating-preview]',t.closest('form'));if(preview)preview.innerHTML=stars(Number(t.value));}
 if(t.dataset.bulkPick&&bulk){const candidate=bulk.results.find(x=>x.imdbId===t.dataset.bulkPick);if(t.checked&&candidate&&bulk.selected.size<30)bulk.selected.set(candidate.imdbId,candidate);else if(!t.checked)bulk.selected.delete(t.dataset.bulkPick);else t.checked=false;paintBulkSummary();}
 if(t.name==='lookupSource'){lookupGeneration++;lookupResults=[];editionBrowse=null;$('#lookup-results',modal).textContent='';}
 if(event.target.id==='lookup-type'){lookupGeneration++;lookupResults=[];$('#lookup-results',modal).textContent='';}if(event.target.dataset.ep)updateEpisode(event.target);if(event.target.id==='reading-page'){const b=state.books.find(b=>b.id===state.activeSession?.bookId);if(b){const n=Number(event.target.value);if(Number.isInteger(n)&&n>=0&&n<=100000){b.page=n;persist()}}}});
function updateEpisode(input){const parent=input.closest('.episode'),x=state.shows.find(x=>x.id===parent.dataset.show),e=x.episodes.find(e=>e.id===parent.dataset.episode),key=input.dataset.ep;e[key]=key==='watched'?input.checked:key==='rating'?Number(input.value):input.value;x.status=mediaStatus(x);persist();if(key==='watched'){const p=$(`[data-season-progress="${e.season}"]`,modal),rows=x.episodes.filter(z=>z.season===e.season);if(p)p.textContent=`${rows.filter(z=>z.watched).length} / ${rows.length} vistos`;const b=p?.parentElement.querySelector('[data-action="watch-season"]');if(b){const mark=rows.some(z=>!z.watched&&(!z.airdate||z.airdate<=new Date().toLocaleDateString('sv-SE')));b.dataset.watched=mark;b.textContent=mark?'Marcar temporada como vista':'Desmarcar temporada';}render()}}
document.addEventListener('error',event=>{if(event.target.matches?.('img[data-cover]'))event.target.remove()},true);
modal.addEventListener('cancel',()=>lookupGeneration++);
setInterval(()=>{if($('#reading-timer'))$('#reading-timer').textContent=timerText(elapsed())},1000);
window.addEventListener('online',render);window.addEventListener('offline',render);
window.addEventListener('storage',event=>{if(event.key===KEY&&event.newValue){try{const incoming=JSON.parse(event.newValue);validate(incoming);state=normalizeLibrary(incoming);if(modal.open)modal.close();render();toast('Cuaderno actualizado desde otra pestaña.')}catch{toast('No se pudo leer el cambio de otra pestaña.')}}});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&$('#reading-timer'))$('#reading-timer').textContent=timerText(elapsed())});
if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
render();
if(needsMigration)persist();

window.addEventListener("hashchange",()=>{if(location.hash.startsWith("#rec="))receiveRec(location.href,true)});
if(location.hash.startsWith("#rec="))receiveRec(location.href,true);
