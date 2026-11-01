import {isMovie,mediaStatus,mergeCatalog,toKatakana} from './media.mjs?v=20261101-3';
const $ = (s, root = document) => root.querySelector(s);
const KEY = 'frikiriam.v1';
const fresh = () => ({version:1,profile:{name:'',katakana:'',grade:'6º Kyu'},techniques:[],books:[],shows:[],games:[],activeSession:null});
let state = fresh(), storageError = false;
try { const raw=localStorage.getItem(KEY); if(raw){const data=JSON.parse(raw);validate(data);state=data} } catch { storageError=true; }
let view='home', filter='Todos', query='', lookupResults=[], lookupGeneration=0, typeFilter='Todos', catalogJob=null, catalogSingleRunning=false;
const modal=$('#modal');
const names={home:'Mi universo',aikido:'Llaves de Aikido',books:'Lecturas',shows:'Animes y series',movies:'Películas',games:'Juegos de mesa',profile:'Mi perfil'};
const paths={home:'<path d="m3 10 9-7 9 7v10H3Z"/><path d="M9 20v-8h6v8"/>',aikido:'<path d="M4 4q8 4 16 0M5 9h14M8 6v14m8-14v14M6 20h4m4 0h4"/>',books:'<path d="M12 5Q6 1 2 5v15q5-4 10 0 5-4 10 0V5q-5-4-10 0v15"/>',shows:'<rect x="3" y="5" width="18" height="13" rx="2"/><path d="m9 22 3-4 3 4M8 1l4 4 4-4"/>',games:'<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M7 7h.01M17 7h.01M7 17h.01M17 17h.01M12 12h.01"/>',profile:'<circle cx="12" cy="8" r="4"/><path d="M4 22v-3a8 8 0 0 1 16 0v3"/>',plus:'<path d="M12 5v14M5 12h14"/>',arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',play:'<path d="m9 5 11 7-11 7Z"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',download:'<path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"/>',upload:'<path d="M12 16V4m-5 5 5-5 5 5M4 17v4h16v-4"/>',check:'<path d="m5 12 4 4L19 6"/>',settings:'<circle cx="12" cy="12" r="3"/><path d="m9 3 6 0 1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1Z"/>',leaf:'<path d="M20 3C4 2 1 12 7 17s15 1 13-14ZM5 21 16 8"/>'};
paths.movies='<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 3v18M17 3v18M3 8h4m-4 8h4m10-8h4m-4 8h4"/>';
const icon = name => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${paths[name]||paths.leaf}</svg>`;
const esc = val => String(val??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function url(value){try{const u=new URL(value);return u.protocol==='https:'?u.href:''}catch{return ''}}
const uid = () => crypto.randomUUID();
const button = (text,action,cls='',id='')=>`<button class="btn ${cls}" data-action="${action}" ${id?`data-id="${esc(id)}"`:''}>${text}</button>`;
const totalTime = b => b.sessions.reduce((s,x)=>s+x.duration,0);
function time(ms){const mins=Math.floor(ms/60000);return ms<60000?`${Math.floor(ms/1000)} s`:mins>=60?`${Math.floor(mins/60)} h ${mins%60} min`:`${mins} min`}
const stars = n => n?`<span class="stars" aria-label="${n} de 5 estrellas">${'★'.repeat(n)}${'☆'.repeat(5-n)}</span>`:'';
const tag = (s,red=false)=>`<span class="tag ${red?'red':''}">${esc(s)}</span>`;
const date = v => new Date(v).toLocaleDateString('es-ES',{day:'numeric',month:'short',year:'numeric'});
function validate(d){
 if(!d||d.version!==1||!d.profile||typeof d.profile.name!=='string'||typeof d.profile.katakana!=='string'||!grades().includes(d.profile.grade))throw Error('Perfil no válido');
 const text=(v)=>typeof v==='string'&&v.length<=100000;
 const rating=n=>Number.isInteger(n)&&n>=0&&n<=5;
 const ids=new Set();
 for(const key of ['techniques','books','shows','games']){
  if(!Array.isArray(d[key])||d[key].length>10000)throw Error('Colección no válida');
  for(const x of d[key]){
   if(!x||!text(x.id)||ids.has(x.id)||!text(x.title)||!text(x.notes)||!text(x.status))throw Error('Registro no válido');ids.add(x.id);
   if(key!=='techniques'&&(!rating(x.rating)||!text(x.cover)))throw Error('Valoración no válida');
   if(key==='books'&&(!['Cómics','Mangas','Libros','Novelas gráficas'].includes(x.category)||!Array.isArray(x.sessions)||x.sessions.length>100000||!x.sessions.every(s=>s&&Number.isFinite(s.duration)&&s.duration>=0&&Number.isFinite(s.started)&&Number.isFinite(s.ended)&&s.ended>=s.started&&Number.isInteger(s.page)&&s.page>=0)))throw Error('Sesiones no válidas');
   if(key==='shows'&&(!Array.isArray(x.episodes)||x.episodes.length>10000||!x.episodes.every(e=>e&&text(e.id)&&text(e.title)&&text(e.notes)&&rating(e.rating)&&typeof e.watched==='boolean'&&Number.isInteger(e.season)&&e.season>=0&&Number.isInteger(e.number)&&e.number>0&&text(e.airdate))))throw Error('Episodios no válidos');
  }
 }
 if(d.activeSession!==null&&(!d.activeSession||!d.books.some(b=>b.id===d.activeSession.bookId)||!Number.isFinite(d.activeSession.started)||!Number.isFinite(d.activeSession.elapsed)||d.activeSession.elapsed<0||!(d.activeSession.runningSince===null||Number.isFinite(d.activeSession.runningSince))))throw Error('Sesión activa no válida');
}
function persist(){try{localStorage.setItem(KEY,JSON.stringify(state));return true}catch{toast('No se ha podido guardar. Exporta una copia: el almacenamiento puede estar lleno.');return false}}
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('visible');clearTimeout(window.toastTimer);window.toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),4500)}
function grades(){return [...Array.from({length:6},(_,i)=>`${6-i}º Kyu`),...Array.from({length:10},(_,i)=>`${i+1}º Dan`)]}
function gradeName(grade){return ['Rokkyu','Gokyu','Yonkyu','Sankyu','Nikyu','Ikkyu','Shodan','Nidan','Sandan','Yondan','Godan','Rokudan','Nanadan','Hachidan','Kudan','Judan'][grades().indexOf(grade)]||''}
function gradeLabel(grade){return `${grade} · ${gradeName(grade)}`}
function japaneseMeanings(){const meanings={'栞':'Marcapáginas','私の小さな宇宙':'Mi pequeño universo','一日一歩':'Un paso cada día','道':'Camino','日々の記録':'Registro del día a día','合気道':'Aikido, el camino de la armonía','読書':'Lectura','物語':'Historias','映画':'Cine','遊び':'Juego','自分':'Uno mismo','心の余白':'Espacio para la mente','読みかけ':'Lectura en curso','日課':'Rutina diaria','技':'Técnica','安心':'Tranquilidad','読書の時間':'Tiempo de lectura','月':'Luna','好きなことを、大切に。':'Cuida lo que te gusta.'};for(const el of document.querySelectorAll('.eyebrow,.brandmark,.brand small,.zen-quote span,.footer span:last-child,.cover-fallback,.kanji,.symbol,.moon,.section-heading h2 span')){const term=el.textContent.trim().split(' · ')[0];if(meanings[term])el.title=meanings[term]}}
function go(next){view=next;filter='Todos';typeFilter='Todos';query='';render();window.scrollTo({top:0,behavior:'smooth'})}
function shell(content){return `<div class="layout"><aside class="sidebar"><a class="brand" href="#" data-view="home"><span class="brandmark">栞</span><span><strong>FRIKIRIAM</strong><small>私の小さな宇宙</small></span></a><div class="nav-label">Tu espacio personal</div><nav class="nav" aria-label="Navegación principal">${Object.entries(names).map(([key,title])=>`<button data-view="${key}" class="${view===key?'active':''}" ${view===key?'aria-current="page"':''}>${icon(key)}<span>${title}</span></button>`).join('')}</nav><div class="sidebar-bottom"><div class="zen-quote"><span>一日一歩</span>Un día. Un pequeño paso.<br>Tu camino tiene su propio ritmo.</div><button class="profile-mini" data-view="profile"><span class="avatar">${esc(state.profile.katakana?.[0]||'道')}</span><span><strong>${esc(state.profile.name||'Tu camino empieza aquí')}</strong><small>${esc(gradeLabel(state.profile.grade))}</small></span></button></div></aside><div class="workspace"><header class="topbar"><a class="header-brand" href="#" data-view="home"><img src="./icon.svg" alt=""><strong>FRIKIRIAM</strong></a><button class="header-profile" data-view="profile" aria-label="Ver mi perfil y grado"><span class="header-katakana" lang="ja">${esc(state.profile.katakana||state.profile.name||'Mi perfil')}</span><span class="header-grade">${esc(gradeLabel(state.profile.grade))}</span></button></header>${!navigator.onLine?'<div class="online-warning">Sin conexión · Tu cuaderno sigue disponible. Las búsquedas necesitan internet.</div>':''}<main class="main">${content}<footer class="footer"><span>FRIKIRIAM · Un lugar para todo lo que te mueve.</span><span>好きなことを、大切に。</span></footer></main></div></div>${state.activeSession?cozy():''}`}
function render(){ $('#app').innerHTML=shell(view==='home'?home():view==='profile'?profile():collection());japaneseMeanings();if(state.activeSession){$('.layout').inert=true;$('.cozy').setAttribute('role','dialog');$('.cozy').setAttribute('aria-modal','true');}if(storageError){storageError=false;toast('No se pudo leer el guardado anterior. No se sobrescribirá hasta tu próxima acción.')}}
function heading(title,subtitle,action){return `<div class="page-title"><div><span class="eyebrow">${view==='home'?'日々の記録 · TU CUADERNO PERSONAL':{aikido:'合気道 · EL CAMINO DE LA ARMONÍA',books:'読書 · HISTORIAS POR DESCUBRIR',shows:'物語 · UN CAPÍTULO MÁS',movies:'映画 · TU SALA DE CINE',games:'遊び · ALREDEDOR DE UNA MESA',profile:'自分 · TU PROPIO CAMINO'}[view]}</span><h1>${title}</h1><p>${subtitle}</p></div>${action||`<span class="date-label">${new Date().toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long'})}</span>`}</div>`}
function home(){
 const learning=state.techniques.filter(t=>t.status==='Aprendiendo').length,read=state.books.filter(b=>b.status==='Leído').length,reading=state.books.filter(b=>b.status==='Leyendo'),watch=state.shows.filter(x=>!isMovie(x)).reduce((s,x)=>s+x.episodes.filter(e=>e.watched).length,0),played=state.games.filter(g=>g.status==='Jugado').length;
 const blocks=[['aikido','Técnicas en tu camino',state.techniques.length,`${learning} aprendiendo · ${state.techniques.length-learning} dominadas`],['books','Historias en tu estantería',state.books.length,`${read} ${read===1?'lectura completada':'lecturas completadas'}`],['shows','Capítulos disfrutados',watch,`${state.shows.length} animes, series y películas`],['games','Juegos por compartir',state.games.length,`${played} jugados · ${state.games.length-played} pendientes`]];
 return heading(`Tu pequeño universo${state.profile.name?`, ${esc(state.profile.name.split(' ')[0])}`:''}.`,'Entrena, descubre, disfruta. Cada pequeño paso cuenta.')+`<section class="hero"><div class="hero-copy"><span class="eyebrow">心の余白 · UN MOMENTO PARA TI</span><h2>Cultiva lo que<br>te hace disfrutar.</h2><p>Un tatami, una buena historia, una mesa compartida. Guarda aquí tu camino.</p><button class="btn primary" data-view="books">${icon('books')} Mi próxima lectura ${icon('arrow')}</button></div><div class="hero-art" role="img" aria-label="Ilustración de montañas japonesas, un sol rojo y un torii"><img src="./landscape.svg" alt="" class="landscape"></div></section><section class="stats" aria-label="Tu actividad">${blocks.map(([i,t,n,h])=>`<div class="stat"><div><small>${t}</small><b>${n}</b></div><div class="stat-icon">${icon(i)}</div><span class="hint">${h}</span></div>`).join('')}</section><div class="dashboard-grid"><section><div class="section-heading"><h2>Entre páginas <span>読みかけ</span></h2><button class="textbtn" data-view="books">Mi estantería ${icon('arrow')}</button></div><div class="panel">${reading.length?reading.slice(0,3).map(b=>`<div class="inline-book"><span class="avatar">本</span><div><h3>${esc(b.title)}</h3><p>${esc(b.author||b.category)} · ${time(totalTime(b))} de lectura</p></div><button class="iconbtn" aria-label="Leer ${esc(b.title)}" data-action="read" data-id="${esc(b.id)}">${icon('play')}</button></div>`).join(''):empty('books','Tu próxima historia te espera','Añade ese libro que tienes en la mesilla y reserva un ratito para ti.',button(`${icon('plus')} Añadir lectura`,'add-book','subtle'))}</div></section><section><div class="section-heading"><h2>Pequeños rituales <span>日課</span></h2></div><div class="panel"><div class="ritual"><span>01</span><div><h3>Un paso en el tatami</h3><p>Anota lo aprendido en tu práctica.</p></div><button class="iconbtn" data-view="aikido" aria-label="Ir a aikido">${icon('arrow')}</button></div><div class="ritual"><span>02</span><div><h3>Un capítulo, otro mundo</h3><p>Retoma esa historia que te atrapa.</p></div><button class="iconbtn" data-view="shows" aria-label="Ir a series">${icon('arrow')}</button></div><div class="ritual"><span>03</span><div><h3>Tiempo para jugar</h3><p>Tu próxima partida empieza aquí.</p></div><button class="iconbtn" data-view="games" aria-label="Ir a juegos">${icon('arrow')}</button></div></div></section></div>`;
}
function empty(i,t,p,b=''){return `<div class="empty"><div class="empty-mark">${icon(i)}</div><h3>${t}</h3><p>${p}</p>${b}</div>`}
function collection(){
 const cfg={
  aikido:['Tu práctica, paso a paso.','Cada técnica tiene su proceso. Guarda lo que aprendes en el tatami.','Añadir técnica','add-technique',['Todos','Aprendiendo','Dominada']],
  books:['Tu estantería personal.','Historias que empiezan, páginas que se quedan contigo.','Añadir lectura','add-book',['Todos','Cómics','Mangas','Libros','Novelas gráficas','Pendiente','Leyendo','Leído']],
  shows:['Historias que te acompañan.','Un capítulo cada vez. Tu progreso siempre a mano.','Añadir anime o serie','add-show',['Todos','Pendiente','Viendo','Visto']],
  movies:['Tu pequeña sala de cine.','Una película, un mundo entero. Guarda las que quieres ver y las que ya disfrutaste.','Añadir película','add-movie',['Todos','Pendiente','Vista']],
  games:['La próxima partida.','Descubre, juega y guarda los momentos alrededor de la mesa.','Añadir juego','add-game',['Todos','Pendiente','Jugado']]
 }[view];
 const source=state[{aikido:'techniques',books:'books',shows:'shows',movies:'shows',games:'games'}[view]];
 const list=source.filter(x=>(view!=='shows'||!isMovie(x))&&(view!=='movies'||isMovie(x))&&(filter==='Todos'||(view==='shows'||view==='movies'?mediaStatus(x):x.status)===filter||x.category===filter)&&(view!=='shows'||typeFilter==='Todos'||x.category===typeFilter)&&x.title.toLocaleLowerCase('es').includes(query.toLocaleLowerCase('es')));
 const tabs=cfg[4].map(t=>`<button data-filter="${esc(t)}" class="${t===filter?'active':''}" aria-pressed="${t===filter}">${t}</button>`).join('');
 return heading(cfg[0],cfg[1],button(`${icon('plus')} ${cfg[2]}`,cfg[3],'primary'))+
  (view==='shows'?`<div class="catalog-toolbar">${button(catalogJob?.running?'Actualizando catálogo…':'Actualizar todo el catálogo','refresh-all','subtle')}<span class="small">Actualiza episodios y emisión de todos los títulos vinculados a TVmaze.</span></div>${catalogJob?catalogProgress():'<div id="catalog-progress"></div>'}<details class="catalog-help"><summary>¿Cómo incluyo una serie añadida a mano?</summary><p class="small">Abre sus detalles, busca el título y marca «Vincular también el catálogo» antes de elegir un resultado.</p></details><div class="tabs media-types" aria-label="Tipo de serie">${['Todos','Anime','Serie'].map(t=>`<button data-type-filter="${t}" class="${typeFilter===t?'active':''}" aria-pressed="${typeFilter===t}">${t==='Todos'?'Animes y series':t==='Anime'?'Animes':'Series'}</button>`).join('')}</div>`:'')+
  `<div class="toolbar"><div class="tabs" aria-label="Filtros de estado">${tabs}</div><input class="search-input" id="collection-search" type="search" placeholder="Buscar en mi colección…" aria-label="Buscar en mi colección" value="${esc(query)}"></div><div id="collection-list">${list.length?`<div class="cards">${list.map(card).join('')}</div>`:`<div class="panel">${empty(view,query||filter!=='Todos'||typeFilter!=='Todos'?'Sin resultados por aquí.':{aikido:'Tu camino empieza con una técnica.',books:'Una estantería llena de posibilidades.',shows:'Una nueva historia está por empezar.',movies:'Una película para cada momento.',games:'Siempre hay sitio para otra partida.'}[view],query||filter!=='Todos'||typeFilter!=='Todos'?'Prueba otro filtro o una búsqueda diferente.':'Añade tu primer registro y haz de este espacio algo tuyo.',button(`${icon('plus')} ${cfg[2]}`,cfg[3],'subtle'))}</div>`}</div>`;
}
function cover(x,symbol){return `<div class="cover">${url(x.cover)?`<img src="${esc(url(x.cover))}" alt="Portada de ${esc(x.title)}" loading="lazy" referrerpolicy="no-referrer" data-cover>`:''}<span class="cover-fallback">${symbol}</span>${tag(x.category||'Juego de mesa')}</div>`}
function card(x){
 if(view==='aikido')return `<article class="item-card aikido-card ${x.status==='Dominada'?'mastered':''}"><div class="item-body"><div class="card-top">${tag(x.status,x.status==='Aprendiendo')}<span class="small">合気道</span></div><div class="symbol">技</div><h3>${esc(x.title)}</h3><p>${esc(x.attack||'Tu técnica, a tu ritmo')}</p><div class="notes">${esc(x.notes.length>145?x.notes.slice(0,145)+'…':x.notes||'Un espacio para tus apuntes del tatami.')}</div>${button('Ver técnica y apuntes','edit-technique','',x.id)}</div></article>`;
 let sub='',extra='';
 const status=view==='shows'||view==='movies'?mediaStatus(x):x.status;
 if(view==='books'){sub=esc(x.author||x.category);extra=`<div class="small">${time(totalTime(x))} · ${x.sessions.length} sesiones${x.page?` · pág. ${x.page}`:''}</div>${x.price?`<div class="small">${esc(x.price)} · precio de referencia</div>`:''}${button(`${icon('play')} ${x.status==='Leído'?'Volver a leer':'Iniciar sesión de lectura'}`,'read','green',x.id)}`}
 if(view==='shows'){const seen=x.episodes.filter(e=>e.watched).length;sub=`${seen} / ${x.episodes.length} capítulos vistos`;extra=`<div class="progress"><i style="width:${x.episodes.length?seen/x.episodes.length*100:0}%"></i></div><div class="small">${x.airStatus==='En emisión'?'● En emisión':x.airStatus==='Finalizada'?'Emisión finalizada':'Emisión sin confirmar'}</div>${x.checked?`<div class="small">Consultado: ${date(x.checked)}</div>`:''}${button('Ver capítulos y valoraciones','episodes','green',x.id)}`}
 if(view==='movies'){sub=esc(x.notes?.slice(0,110)||'Una historia para disfrutar de principio a fin.');extra=button(status==='Vista'?'Marcar pendiente':`${icon('check')} Marcar vista`,'toggle-movie',status==='Vista'?'':'green',x.id)}
 if(view==='games')sub=x.notes?esc(x.notes.slice(0,95)):'Una partida pendiente de contar.';
 return `<article class="item-card">${cover(x,view==='books'?'読書':view==='shows'||view==='movies'?'物語':'遊び')}<div class="item-body"><div class="card-top">${tag(status,status==='Pendiente')} ${stars(x.rating|| (view==='movies'?x.episodes[0]?.rating:0))}</div><h3>${esc(x.title)}</h3><p>${sub}</p>${x.coverSourceUrl&&url(x.coverSourceUrl)?`<p class="source"><a href="${esc(url(x.coverSourceUrl))}" target="_blank" rel="noopener noreferrer">Imagen: ${esc(x.coverProvider||'fuente')} ↗</a></p>`:''}${extra}${button(view==='games'?'Ver juego y valoración':'Detalles y notas',view==='books'?'edit-book':view==='shows'?'edit-show':view==='movies'?'edit-movie':'edit-game','',x.id)}</div></article>`;
}
function options(values,current){return values.map(v=>`<option value="${esc(v)}" ${v===current?'selected':''}>${esc(grades().includes(v)?gradeLabel(v):v)}</option>`).join('')}
function field(label,name,value='',type='text',full=false){if(name==='katakana')return `<div class="kana-field"><label>${label}<input name="katakana" lang="ja" inputmode="text" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="done" maxlength="80" placeholder="例：ロベルト" value="${esc(value)}"></label>${kanaKeyboard()}</div>`;return `<label class="${full?'full':''}">${label}<input name="${name}" type="${type}" value="${esc(value)}" ${name==='title'?'required maxlength="160"':name==='cover'?'placeholder="https://…"':name==='katakana'?'placeholder="例：ロベルト" maxlength="80"':name==='name'?'maxlength="80"':''} ${type==='number'?'min="0" max="100000" step="1"':''}></label>`}
function select(label,name,values,current,full=false){return `<label class="${full?'full':''}">${label}<select name="${name}" aria-label="${esc(label)}">${options(values,current)}</select></label>`}
function note(value,label='Tu bloc de notas'){return `<label class="full">${label}<textarea name="notes" maxlength="20000" placeholder="Ideas, sensaciones y pequeños detalles que quieres recordar…">${esc(value||'')}</textarea></label>`}
function rating(value){return `<div class="full"><label>Tu valoración</label><input name="rating" type="hidden" value="${value||0}"><div class="rating-picker" role="group" aria-label="Valoración de 1 a 5 estrellas">${[1,2,3,4,5].map(n=>`<button type="button" data-action="rate" data-value="${n}" aria-label="${n} ${n===1?'estrella':'estrellas'}" aria-pressed="${n==value}" class="${n<=value?'selected':''}">★</button>`).join('')}<button type="button" data-action="rate" data-value="0" aria-label="Quitar valoración" style="font-size:13px">×</button></div></div>`}
function profile(){return heading('Tu camino es único.','Un nombre, un grado y un espacio que se parece a ti.')+`<div class="settings-grid"><section class="panel padded"><div class="grade-badge"><span class="kanji">道</span><div><h3>${esc(state.profile.name||'Aikidoka')}</h3><p>${esc(state.profile.katakana||'Escribe tu nombre en katakana')} · ${esc(gradeLabel(state.profile.grade))}</p></div></div><form id="profile-form"><div class="form-grid">${field('Tu nombre','name',state.profile.name)}${field('Nombre en katakana · opcional','katakana',state.profile.katakana)}${select('Tu grado de aikido','grade',grades(),state.profile.grade,true)}</div><p class="small" style="margin-top:14px">Desde 6º Kyu (cinturón blanco) hasta 10º Dan. Elige el grado reconocido por tu dojo.</p><div class="actions"><button class="btn primary" type="submit">Guardar mi perfil</button></div></form></section><div><section class="panel padded"><span class="eyebrow">安心 · TODO EN SU LUGAR</span><h2>Tu cuaderno, contigo.</h2><p class="small">Los datos se guardan en este navegador y dispositivo. Cada persona tiene su propio cuaderno. No se sincronizan ni se envían a un servidor.</p><div class="backup-actions">${button(`${icon('download')} Exportar copia`,'export')}${button(`${icon('upload')} Importar copia`,'import')}</div><p class="small">Guarda una copia con frecuencia: borrar los datos de Safari, cambiar de móvil o usar el modo privado puede hacerte perder el cuaderno.</p></section><section class="panel padded"><h2>Llévalo a tu iPhone.</h2><p class="small">Abre la dirección de FRIKIRIAM en Safari.</p><ol class="install-steps"><li>Pulsa el botón Compartir.</li><li>Elige «Añadir a pantalla de inicio».</li><li>Confirma con «Añadir».</li></ol>${button('Instalar y compartir','help','subtle')}</section></div></div>`}
function openModal(title,subtitle,body){lookupGeneration++;modal.innerHTML=`<div class="modal-head"><div><h2>${title}</h2>${subtitle?`<p class="small" style="margin-bottom:0">${subtitle}</p>`:''}</div><button class="close" data-action="close" aria-label="Cerrar">×</button></div>${body}`;if(!modal.open)modal.showModal()}
function lookup(kind,x={}){return `<div class="lookup"><span class="eyebrow">${x.id?'Buscar otra portada':'Buscar portada y título'}</span><div class="lookup-row"><input id="lookup-query" type="search" aria-label="Título para buscar en internet" value="${esc(x.title||'')}" placeholder="${kind==='book'?'Título, autor o ISBN…':kind==='game'?'Nombre del juego de mesa…':kind==='movie'?'Nombre de la película…':'Nombre del anime o serie…'}"><button type="button" class="btn" data-action="lookup" data-kind="${kind}">Buscar</button></div><p>${x.id?'Tus notas, valoraciones y progreso se conservan al elegir una portada. ':''}${kind==='book'?'Portadas de Google Books y Open Library. Precio disponible solo si lo facilita el catálogo.':kind==='show'?'Portadas y capítulos de animes y series en TVmaze.':'Imágenes de Wikipedia. Revisa la miniatura antes de elegir.'}</p>${kind==='show'&&x.id&&!x.tvmazeId?`<label class="link-catalog"><input type="checkbox" id="link-catalog">Vincular también el catálogo de episodios y conservar mi progreso</label>`:''}<div id="lookup-results" class="lookup-results" aria-live="polite"></div></div>`}
function edit(kind,id){
 const key={technique:'techniques',book:'books',show:'shows',movie:'shows',game:'games'}[kind], x=state[key].find(x=>x.id===id)||{}, isNew=!x.id;
 const title={technique:'técnica',book:'lectura',show:'título',movie:'película',game:'juego'}[kind];let fields=field(kind==='technique'?'Nombre de la técnica':'Título','title',x.title,'text',true);
 if(kind==='technique')fields+=field('Ataque o variante · opcional','attack',x.attack,'text',true)+select('Mi progreso','status',['Aprendiendo','Dominada'],x.status)+note(x.notes,'Apuntes de práctica');
 if(kind==='book')fields+=field('Autor / autora','author',x.author)+select('Tipo de lectura','category',['Cómics','Mangas','Libros','Novelas gráficas'],x.category||'Libros')+select('Estado','status',['Pendiente','Leyendo','Leído'],x.status)+field('Página actual','page',x.page||0,'number')+field('URL de portada · opcional','cover',x.cover,'url',true)+field('Precio de referencia · opcional','price',x.price)+field('Enlace al catálogo o tienda · opcional','sourceUrl',x.sourceUrl,'url')+rating(x.rating)+note(x.notes,'Impresiones y notas de lectura');
 if(kind==='show')fields+=select('Tipo','category',['Anime','Serie'],x.category||'Anime')+select('Emisión','airStatus',['Sin confirmar','En emisión','Finalizada'],x.airStatus||'Sin confirmar')+field('URL de portada · opcional','cover',x.cover,'url',true)+(!x.id?`<div class="full notice">La búsqueda importará el listado real disponible. También puedes añadir temporadas y capítulos manualmente después de guardar.</div>`:'')+rating(x.rating)+note(x.notes,'Notas sobre este título');
 if(kind==='movie')fields+=select('Estado','status',['Pendiente','Vista'],x.id?mediaStatus(x):'Pendiente')+field('URL de portada · opcional','cover',x.cover,'url',true)+rating(x.rating||x.episodes?.[0]?.rating)+note(x.notes||x.episodes?.[0]?.notes,'Tu impresión de la película');
 if(kind==='game')fields+=select('Estado','status',['Pendiente','Jugado'],x.status)+field('URL de portada · opcional','cover',x.cover,'url',true)+rating(x.rating)+note(x.notes,'Tu experiencia de juego');
 openModal(`${isNew?'Añadir':'Tu'} ${title}`,isNew?'Haz un pequeño espacio para algo que te gusta.':'Cada detalle forma parte de tu camino.',`${kind!=='technique'?lookup(kind,x):''}<form id="item-form" data-kind="${kind}" data-id="${esc(x.id||'')}"><div class="form-grid">${fields}</div><div class="actions">${x.id?button('Eliminar','delete','danger',x.id):''}<button type="button" class="btn" data-action="close">Cancelar</button><button type="submit" class="btn primary">Guardar ${title}</button></div></form>${kind==='book'&&x.id?`<div class="section-heading"><h2>Tu tiempo entre páginas</h2><span>${time(totalTime(x))}</span></div><div class="history">${x.sessions.length?x.sessions.slice().reverse().map(s=>`<div class="history-row"><span>${date(s.started)}${s.page?` · pág. ${s.page}`:''}</span><span>${time(s.duration)}</span></div>`).join(''):'<p class="small">Tu primera sesión de lectura aparecerá aquí.</p>'}</div>${url(x.sourceUrl)?`<p class="source"><a href="${esc(url(x.sourceUrl))}" target="_blank" rel="noopener noreferrer">Consultar catálogo y disponibilidad ↗</a>${x.priceChecked?` · precio consultado el ${date(x.priceChecked)}`:''}</p>`:''}`:''}`);
 modal.pending=null;
 if(kind==='movie'&&x.episodes?.some(e=>e.notes||e.rating)){modal.insertAdjacentHTML('beforeend',`<details class="legacy-notes"><summary>Apuntes del registro anterior</summary>${x.episodes.filter(e=>e.notes||e.rating).map(e=>`<div class="notice">${stars(e.rating)}<p class="notes">${esc(e.notes)}</p></div>`).join('')}</details>`);}
}
function saveItem(form){
 const f=new FormData(form),kind=form.dataset.kind,key={technique:'techniques',book:'books',show:'shows',movie:'shows',game:'games'}[kind],old=state[key].find(x=>x.id===form.dataset.id),v=Object.fromEntries(f),title=v.title.trim();if(!title)return;
 if(v.cover&&!url(v.cover)){toast('La portada debe tener una dirección https:// válida.');return}
 if(v.sourceUrl&&!url(v.sourceUrl)){toast('El enlace debe empezar por https://.');return}
 let x={...old,id:old?.id||uid(),title,notes:v.notes||'',status:v.status||old?.status||'Pendiente'};
 if(kind==='technique')x.attack=v.attack;
 else {const image=modal.pending?.cover===v.cover?modal.pending:null,sameCover=old?.cover===v.cover;Object.assign(x,{rating:Number(v.rating||0),cover:v.cover||'',coverSourceUrl:image?.sourceUrl||(sameCover?old?.coverSourceUrl:'')||'',coverProvider:image?.provider||(sameCover?old?.coverProvider:'')||''});}
 if(kind==='book')Object.assign(x,{author:v.author,category:v.category,page:Number(v.page)||0,price:v.price,sourceUrl:v.sourceUrl,sessions:old?.sessions||[],priceChecked:modal.pending?.priceChecked||old?.priceChecked||null});
 if(kind==='movie'){Object.assign(x,{category:'Película',status:v.status,episodes:(old?.episodes||[]).map(e=>({...e,watched:v.status==='Vista'})),sourceUrl:old?.sourceUrl||modal.pending?.sourceUrl||''});}
 if(kind==='show'){
  const p=modal.pending;
  Object.assign(x,{category:v.category,airStatus:v.airStatus,episodes:old?.episodes||(p?.episodes||[]),tvmazeId:old?.tvmazeId||p?.tvmazeId||null,sourceUrl:old?.sourceUrl||p?.sourceUrl||'',checked:old?.checked||p?.checked||null});

  if(p?.linkCatalog&&p.tvmazeId){const merged=mergeCatalog(x,{status:p.airStatus==='En emisión'?'Running':p.airStatus==='Finalizada'?'Ended':''},p.catalogEpisodes||[],p.checked||Date.now());Object.assign(x,merged.item,{tvmazeId:p.tvmazeId,sourceUrl:p.sourceUrl});}
  x.status=x.episodes.length&&x.episodes.every(e=>e.watched)?'Visto':x.episodes.some(e=>e.watched)?'Viendo':'Pendiente';
 }
 if(old)state[key][state[key].indexOf(old)]=x;else state[key].push(x);
 if(persist()){modal.close();render();toast('Guardado en tu cuaderno.');if(kind==='show'&&!x.episodes.length)episodes(x.id)}
}
async function jsonFetch(endpoint){const response=await fetch(endpoint,{signal:AbortSignal.timeout(15000)});if(!response.ok){const error=Error(`Catálogo no disponible (${response.status})`);error.status=response.status;throw error};return response.json()}
async function wikiImages(q,kind){
 const titleQuery=`intitle:"${q.replaceAll('"','').trim()}"`;
 const queries=[['en',`${titleQuery} ${kind==='game'?'board game':'film'}`],['es',`${titleQuery} ${kind==='game'?'juego de mesa':'película'}`]];
 const responses=await Promise.allSettled(queries.map(async([lang,term])=>{
  const params=new URLSearchParams({action:'query',generator:'search',gsrsearch:term,gsrnamespace:'0',gsrlimit:'8',prop:'pageimages|info',inprop:'url',piprop:'thumbnail|name',pithumbsize:'400',pilicense:'any',format:'json',origin:'*'});
  const data=await jsonFetch(`https://${lang}.wikipedia.org/w/api.php?${params}`);
  return Object.values(data.query?.pages||{}).sort((a,b)=>a.index-b.index).filter(p=>url(p.thumbnail?.source)).map(p=>({title:p.title,cover:p.thumbnail.source,sourceUrl:p.fullurl,provider:'Wikipedia',category:kind==='game'?undefined:'Película',subtitle:lang==='es'?'Imagen del título · español':'Imagen del título · inglés'}));
 }));
 const succeeded=responses.filter(r=>r.status==='fulfilled');if(!succeeded.length)throw Error('No se pudo consultar Wikipedia');
 const seen=new Set();return succeeded.flatMap(r=>r.value).filter(x=>{const key=x.cover.split('?')[0];if(seen.has(key))return false;seen.add(key);return true}).slice(0,10);
}
async function searchCatalog(kind){
 const q=$('#lookup-query',modal).value.trim(),target=$('#lookup-results',modal),gen=++lookupGeneration;
 if(q.length<2){target.textContent='Escribe al menos dos caracteres.';return}
 target.textContent='Buscando portadas…';lookupResults=[];let results=[];
 try{
  if(kind==='book'){
   try{const data=await jsonFetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=8&printType=books`);results=(data.items||[]).map(b=>({title:b.volumeInfo.title,author:(b.volumeInfo.authors||[]).join(', '),cover:(b.volumeInfo.imageLinks?.thumbnail||'').replace('http:','https:'),price:b.saleInfo?.retailPrice?`${b.saleInfo.retailPrice.amount} ${b.saleInfo.retailPrice.currencyCode}`:'',sourceUrl:b.saleInfo?.buyLink||b.volumeInfo.infoLink?.replace('http:','https:')||'',priceChecked:Date.now(),provider:'Google Books'}))}catch{ /* Use the second public catalogue if unavailable. */ }
   if(!results.length){const data=await jsonFetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=8&fields=key,title,author_name,cover_i`);results=(data.docs||[]).map(b=>({title:b.title,author:(b.author_name||[]).join(', '),cover:b.cover_i?`https://covers.openlibrary.org/b/id/${b.cover_i}-M.jpg`:'',price:'',sourceUrl:`https://openlibrary.org${b.key}`,provider:'Open Library'}))}
  }else if(kind==='game'||kind==='movie'){
   results=await wikiImages(q,kind==='game'?'game':'movie');
  }else{
   const data=await jsonFetch(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(q)}`);
   results=data.slice(0,8).map(({show:s})=>({title:s.name,cover:s.image?.medium||'',tvmazeId:s.id,category:s.type==='Animation'?'Anime':'Serie',airStatus:s.status==='Running'?'En emisión':s.status==='Ended'?'Finalizada':'Sin confirmar',sourceUrl:s.url,provider:'TVmaze',subtitle:`${s.premiered?.slice(0,4)||'Sin fecha'} · ${s.type}`}));
  }
  if(gen!==lookupGeneration||!modal.open)return;
  lookupResults=results;
  target.innerHTML=results.length?results.map((x,i)=>`<button type="button" class="lookup-result" data-action="choose-result" data-index="${i}" data-kind="${kind}" ${kind!=='show'&&!url(x.cover)?'disabled':''}>${url(x.cover)?`<img src="${esc(url(x.cover))}" alt="Portada de ${esc(x.title)}" referrerpolicy="no-referrer">`:''}<span><strong>${esc(x.title)}</strong><small>${esc(x.author||x.subtitle||'')} · ${esc(x.provider)}${x.price?` · ${esc(x.price)}`:''}${!url(x.cover)?' · Sin portada disponible':''}</small></span></button>`).join(''):'No hemos encontrado una portada. Prueba el título original o pega una URL de imagen en el formulario.';
 }catch{if(gen===lookupGeneration&&modal.open)target.textContent='No se ha podido consultar el catálogo. Comprueba tu conexión o añade una URL de portada manualmente.'}
}
async function chooseResult(index,kind){
 const x=lookupResults[index];if(!x||(kind!=='show'&&!url(x.cover)))return;
 const form=$('#item-form',modal),existing=!!form.dataset.id,linkCatalog=kind==='show'&&!!$('#link-catalog',modal)?.checked,gen=++lookupGeneration;
 if((!existing||linkCatalog)&&kind==='show'&&x.tvmazeId){
  $('#lookup-results',modal).textContent='Importando el listado de capítulos…';
  const save=$('[type="submit"]',form);save.disabled=true;
  try{const eps=await jsonFetch(`https://api.tvmaze.com/shows/${x.tvmazeId}/episodes?specials=1`);x.catalogEpisodes=eps;x.episodes=eps.filter(e=>Number.isInteger(e.number)).map(e=>({id:`tvmaze-${e.id}`,season:e.season,number:e.number,title:e.name||`Capítulo ${e.number}`,airdate:e.airdate||'',watched:false,rating:0,notes:''}));x.checked=Date.now()}
  catch{x.episodes=[];toast('No se pudieron importar los capítulos. Puedes añadirlos manualmente.')}
  finally{save.disabled=false}
  if(gen!==lookupGeneration||!modal.open)return;
 }
 const keys=existing?['cover']:['title','author','cover','price','sourceUrl','category','airStatus'];
 for(const key of keys)if(x[key]!==undefined&&form.elements[key]&&(key!=='cover'||url(x.cover)))form.elements[key].value=x[key];
 modal.pending=existing&&!linkCatalog?{coverOnly:true,cover:x.cover,sourceUrl:x.sourceUrl,provider:x.provider}:{...x,linkCatalog};
 $('#lookup-results',modal).innerHTML=`<div class="chosen-cover">${url(x.cover)?`<img src="${esc(url(x.cover))}" alt="Portada elegida" referrerpolicy="no-referrer">`:''}<div><p>${linkCatalog?'Catálogo seleccionado. Se conservarán tus apuntes y capítulos vistos.':existing?'Nueva portada seleccionada.':`«${esc(x.title)}» seleccionado.`}${(!existing||linkCatalog)&&x.episodes?` ${x.episodes.length} capítulos encontrados.`:''} Pulsa Guardar para aplicarlo.</p><p class="source">Datos de <a href="${esc(url(x.sourceUrl))}" target="_blank" rel="noopener noreferrer">${esc(x.provider)}</a>${x.provider==='TVmaze'?' · CC BY-SA 4.0':''}</p></div></div>`;
}
function startReading(id){if(state.activeSession){render();return}const b=state.books.find(b=>b.id===id);if(!b)return;state.activeSession={bookId:id,started:Date.now(),elapsed:0,runningSince:Date.now()};if(b.status!=='Leído')b.status='Leyendo';persist();modal.close();render()}
function elapsed(){const s=state.activeSession;return s?s.elapsed+(s.runningSince?Math.max(0,Date.now()-s.runningSince):0):0}
function timerText(ms){let sec=Math.floor(ms/1000);return [Math.floor(sec/3600),Math.floor(sec/60)%60,sec%60].map(n=>String(n).padStart(2,'0')).join(':')}
function cozy(){const b=state.books.find(b=>b.id===state.activeSession.bookId);return `<section class="cozy" aria-label="Sesión de lectura"><div class="cozy-inner"><span class="eyebrow">読書の時間 · TU REFUGIO DE LECTURA</span><div class="moon">月</div><h1>${esc(b.title)}</h1><p>${esc(b.author||'Una historia. Un momento para ti.')}</p><div class="timer" role="timer" id="reading-timer">${timerText(elapsed())}</div><p>${state.activeSession.runningSince?'Respira. Deja que el mundo espere un poquito.':'La sesión está en pausa. Tómate tu tiempo.'}</p><div class="cozy-actions">${button(state.activeSession.runningSince?'Pausar':'Continuar','pause-reading','subtle')}${button('Finalizar sesión de lectura','finish-reading')}</div><label>¿En qué página te quedas? <input type="number" id="reading-page" min="0" max="100000" step="1" value="${b.page||0}"></label><p style="font-size:10px;margin-top:28px">El tiempo se conserva si sales de la aplicación.<br>Pausa la sesión si vas a dejar de leer.</p></div></section>`}
function finishReading(){const b=state.books.find(b=>b.id===state.activeSession.bookId),page=Number($('#reading-page')?.value)||0;if(page<0||page>100000||!Number.isInteger(page)){toast('Escribe un número de página válido.');return}b.sessions.push({started:state.activeSession.started,ended:Date.now(),duration:elapsed(),page});b.page=page;state.activeSession=null;if(persist()){view='books';render();openModal('Un ratito bien invertido.',`Sesión guardada · ${time(b.sessions.at(-1).duration)}`,`<p class="small">${esc(b.title)} lleva ${time(totalTime(b))} de lectura en ${b.sessions.length} sesiones.</p><div class="actions">${button('Seguir leyendo otro día','close')}${button('He terminado el libro','complete-book','primary',b.id)}</div>`)}}
function episodes(id){const x=state.shows.find(x=>x.id===id);if(!x)return;if(isMovie(x)){edit('movie',id);return;}const seasons=[...new Set(x.episodes.map(e=>e.season))].sort((a,b)=>a-b);openModal(esc(x.title),'Marca cada capítulo y guarda tu impresión. Los cambios se guardan al instante.',`<div class="toolbar">${button(`${icon('plus')} Añadir temporada / capítulos`,'add-season','',id)}${x.tvmazeId?button('Actualizar catálogo','refresh-show','',id):''}</div><div class="episode-list">${seasons.length?seasons.map(s=>`<h3 class="episode-season">${s===0?'Especiales':`Temporada ${s}`}</h3>${x.episodes.filter(e=>e.season===s).map(e=>`<div class="episode" data-show="${esc(id)}" data-episode="${esc(e.id)}"><div class="episode-top"><label><input type="checkbox" data-ep="watched" ${e.watched?'checked':''}><span>${e.number}. ${esc(e.title)}</span></label><select aria-label="Valorar capítulo ${e.number}" data-ep="rating"><option value="0">Sin valorar</option>${[1,2,3,4,5].map(n=>`<option value="${n}" ${e.rating===n?'selected':''}>${'★'.repeat(n)}</option>`).join('')}</select></div>${e.airdate?`<div class="airdate">${new Date(e.airdate+'T23:59:59').getTime()>Date.now()?'Previsto: ':'Emitido: '}${esc(e.airdate)}</div>`:''}<input type="text" data-ep="notes" maxlength="20000" aria-label="Notas del capítulo ${e.number}" placeholder="¿Qué te ha parecido este capítulo?" value="${esc(e.notes)}"></div>`).join('')}`).join(''):empty('shows','Todavía no hay capítulos.','Añade una temporada manualmente para empezar a registrar tu progreso.')}</div>${x.tvmazeId?`<p class="source">Datos de <a href="${esc(url(x.sourceUrl)||`https://www.tvmaze.com/shows/${x.tvmazeId}`)}" target="_blank" rel="noopener noreferrer">TVmaze</a> · <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer">CC BY-SA 4.0</a>${x.checked?` · Consulta: ${date(x.checked)}`:''}. Los listados pueden cambiar.</p>`:''}<div class="actions">${button('Listo','close','primary')}</div>`)}
function seasonForm(id){const x=state.shows.find(x=>x.id===id);openModal('Una temporada más.','Puedes completar el listado aunque el catálogo no tenga este título.',`<form id="season-form" data-id="${esc(id)}"><div class="form-grid"><label>Temporada (0 para especiales)<input name="season" type="number" min="0" max="1000" required value="${Math.max(0,...x.episodes.map(e=>e.season))+1}"></label><label>Número de capítulos<input name="count" type="number" min="1" max="500" required value="12"></label><label>Empezar en el capítulo<input name="start" type="number" min="1" max="10000" required value="1"></label></div><p class="small" style="margin-top:15px">Los capítulos ya existentes se conservan.</p><div class="actions">${button('Volver','episodes','',id)}<button class="btn primary" type="submit">Añadir capítulos</button></div></form>`)}
function kanaKeyboard(){
 const rows=['アイウエオカキクケコ','サシスセソタチツテト','ナニヌネノハヒフヘホ','マミムメモヤユヨワヲン','ラリルレロガギグゲゴ','ザジズゼゾダヂヅデド','バビブベボパピプペポ','ァィゥェォャュョッヴー・'];
 return `<details class="kana-keyboard"><summary>Teclado katakana <span lang="ja">カタカナ</span></summary><div class="kana-keys" role="group" aria-label="Teclado japonés en katakana">${rows.flatMap(row=>Array.from(row)).map(k=>`<button type="button" data-action="kana-key" data-kana="${k}" lang="ja" aria-label="Escribir ${k}">${k}</button>`).join('')}</div><div class="kana-tools"><button type="button" class="btn" data-action="kana-key" data-kana=" ">Espacio</button><button type="button" class="btn" data-action="kana-backspace">⌫ Borrar</button><button type="button" class="btn" data-action="kana-convert">Convertir hiragana</button></div><p class="small">Puedes escribir con estas teclas. Si tienes el teclado japonés de iPhone instalado, también puedes seleccionarlo con 🌐.</p></details>`;
}
function typeKana(action,value=''){
 const input=$('input[name="katakana"]');if(!input)return;
 let start=input.selectionStart??input.value.length,end=input.selectionEnd??start;
 if(action==='kana-convert'){input.value=toKatakana(input.value);return}
 if(action==='kana-backspace'){if(start===end)start=Math.max(0,start-1);value=''}
 if(input.value.length-(end-start)+value.length>input.maxLength)return;
 input.setRangeText(value,start,end,'end');
}
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
 const result=mergeCatalog(state.shows[index],data.show,data.episodes);
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
function exportBackup(){const blob=new Blob([JSON.stringify({...state,exportedAt:new Date().toISOString()},null,2)],{type:'application/json'}),href=URL.createObjectURL(blob),a=document.createElement('a');a.href=href;a.download=`frikiriam-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(href),10000);toast('Copia preparada. Guárdala en un lugar seguro.')}
function importBackup(){const input=document.createElement('input');input.type='file';input.accept='.json,application/json';input.onchange=async()=>{const f=input.files[0];if(!f)return;if(f.size>20*1024*1024){toast('La copia supera el límite de 20 MB.');return}try{const data=JSON.parse(await f.text());validate(data);openModal('Restaurar tu cuaderno',`${data.books.length} lecturas · ${data.techniques.length} técnicas · ${data.shows.length} títulos · ${data.games.length} juegos`,`<p class="small">La copia de ${esc(data.profile.name||'tu perfil')} sustituirá los datos de este dispositivo. Exporta primero el cuaderno actual si quieres conservarlo.</p><div class="actions">${button('Exportar cuaderno actual','export')}${button('Cancelar','close')}${button('Restaurar copia','confirm-import','primary')}</div>`);modal.backup=data}catch{toast('El archivo no es una copia válida de FRIKIRIAM. No se han cambiado tus datos.')}};input.click()}
function help(){openModal('Tu universo, siempre a mano.','Una aplicación para llevar a tu propio ritmo.',`<h3>Instalar en iPhone</h3><ol class="install-steps"><li>Abre esta dirección en Safari.</li><li>Pulsa Compartir → Añadir a pantalla de inicio.</li><li>Elige «Añadir». Ya tienes tu acceso a FRIKIRIAM.</li></ol><div class="notice">Cada persona guarda sus propios datos en su navegador. Haz una copia antes de cambiar de dispositivo. Después de la primera carga, el cuaderno funciona sin conexión; las portadas externas y búsquedas requieren internet.</div><h3>Comparte un pequeño universo</h3><p class="small">La dirección de la aplicación no incluye tus datos personales.</p><div class="actions">${button('Compartir aplicación','share','primary')}${button('Listo','close')}</div>`)}
document.addEventListener('click',async event=>{
 const target=event.target.closest('[data-action],[data-view],[data-filter],[data-type-filter]');if(!target)return;
 if(target.dataset.view){event.preventDefault();go(target.dataset.view);return}
 if(target.dataset.typeFilter){typeFilter=target.dataset.typeFilter;render();return}
 if(target.dataset.filter){filter=target.dataset.filter;render();return}
 const action=target.dataset.action,id=target.dataset.id;
 if(action==='close'){lookupGeneration++;modal.close()}
 else if(action.startsWith('add-')&&['technique','book','show','movie','game'].includes(action.slice(4)))edit(action.slice(4));
 else if(action.startsWith('edit-'))edit(action.slice(5),id);
 else if(action==='rate'){const form=target.closest('form');form.elements.rating.value=target.dataset.value;for(const b of form.querySelectorAll('[data-action="rate"]')){b.classList.toggle('selected',Number(b.dataset.value)>0&&Number(b.dataset.value)<=Number(target.dataset.value));b.setAttribute('aria-pressed',b===target?'true':'false')}}
 else if(action==='delete'){const form=$('#item-form',modal),kind=form.dataset.kind;openModal('¿Eliminar este registro?','Este cambio no se puede deshacer.',`<p class="small">Se eliminarán sus notas, valoraciones e historial asociado.</p><div class="actions">${button('Conservar','edit-'+kind,'',id)}<button class="btn danger" data-action="confirm-delete" data-kind="${kind}" data-id="${esc(id)}">Eliminar definitivamente</button></div>`)}
 else if(action==='confirm-delete'){const key={technique:'techniques',book:'books',show:'shows',movie:'shows',game:'games'}[target.dataset.kind];state[key]=state[key].filter(x=>x.id!==id);if(state.activeSession?.bookId===id)state.activeSession=null;if(persist()){modal.close();render();toast('Registro eliminado.')}}
 else if(action==='lookup')searchCatalog(target.dataset.kind);
 else if(action==='choose-result')chooseResult(Number(target.dataset.index),target.dataset.kind);
 else if(action==='read')startReading(id);
 else if(action==='pause-reading'){const s=state.activeSession,b=state.books.find(b=>b.id===s.bookId);b.page=Math.max(0,Math.min(100000,Number($('#reading-page')?.value)||0));if(s.runningSince){s.elapsed=elapsed();s.runningSince=null}else s.runningSince=Date.now();persist();render()}
 else if(action==='finish-reading')finishReading();
 else if(action==='complete-book'){const b=state.books.find(b=>b.id===id);b.status='Leído';persist();render();edit('book',id)}
 else if(action==='episodes')episodes(id);
 else if(action==='add-season')seasonForm(id);
 else if(action==='refresh-show')refreshShow(id);
 else if(action==='refresh-all')refreshAllCatalog();
 else if(action==='cancel-catalog'){if(catalogJob)catalogJob.cancelled=true;target.disabled=true;target.textContent='Deteniendo…';}
 else if(action.startsWith('kana-'))typeKana(action,target.dataset.kana);
 else if(action==='toggle-movie'){const x=state.shows.find(x=>x.id===id);if(!x||!isMovie(x))return;x.status=mediaStatus(x)==='Vista'?'Pendiente':'Vista';x.episodes.forEach(e=>e.watched=x.status==='Vista');if(persist())render();}
 else if(action==='export')exportBackup();
 else if(action==='import')importBackup();
 else if(action==='confirm-import'){state=modal.backup;if(persist()){modal.close();render();toast('Tu cuaderno ha sido restaurado.')}}
 else if(action==='help')help();
 else if(action==='share'){try{if(navigator.share)await navigator.share({title:'FRIKIRIAM',text:'Tu pequeño universo de aikido, lecturas, series y juegos.',url:location.href});else{await navigator.clipboard.writeText(location.href);toast('Enlace copiado.')}}catch(e){if(e.name!=='AbortError')toast('Puedes copiar la dirección desde la barra de tu navegador.')}}
});
document.addEventListener('keydown',event=>{if(event.key==='Enter'&&event.target.id==='lookup-query'){event.preventDefault();searchCatalog($('#item-form',modal).dataset.kind)}});
document.addEventListener('submit',event=>{
 if(event.target.id==='item-form'){event.preventDefault();saveItem(event.target)}
 if(event.target.id==='profile-form'){event.preventDefault();const f=new FormData(event.target),katakana=toKatakana(f.get('katakana').trim());if(katakana&&!/^[\u30a0-\u30ff\u31f0-\u31ff\uff65-\uff9f\u3000\s・ー]+$/u.test(katakana)){toast('El nombre japonés debe estar escrito en katakana.');return}state.profile={name:f.get('name').trim(),katakana,grade:f.get('grade')};if(persist()){render();toast('Perfil guardado.')}}
 if(event.target.id==='season-form'){event.preventDefault();const f=new FormData(event.target),x=state.shows.find(x=>x.id===event.target.dataset.id),s=Number(f.get('season')),n=Number(f.get('count')),start=Number(f.get('start'));if(!Number.isInteger(s)||s<0||s>1000||!Number.isInteger(n)||n<1||n>500||!Number.isInteger(start)||start<1||start+n>10001)return;for(let i=start;i<start+n;i++)if(!x.episodes.some(e=>e.season===s&&e.number===i))x.episodes.push({id:uid(),season:s,number:i,title:`Capítulo ${i}`,airdate:'',watched:false,rating:0,notes:''});x.episodes.sort((a,b)=>a.season-b.season||a.number-b.number);x.status=x.episodes.every(e=>e.watched)?'Visto':x.episodes.some(e=>e.watched)?'Viendo':'Pendiente';if(persist()){render();episodes(x.id);toast('Capítulos añadidos.')}}
});
document.addEventListener('input',event=>{
 if(event.target.id==='collection-search'){const pos=event.target.selectionStart;query=event.target.value;const content=collection(),temp=document.createElement('div');temp.innerHTML=content;$('#collection-list').innerHTML=$('#collection-list',temp).innerHTML;if(pos!==null)event.target.setSelectionRange(pos,pos)}
 if(event.target.dataset.ep==='notes')updateEpisode(event.target);
});
document.addEventListener('change',event=>{if(event.target.id==='lookup-type'){lookupGeneration++;lookupResults=[];$('#lookup-results',modal).textContent='';}if(event.target.dataset.ep)updateEpisode(event.target);if(event.target.id==='reading-page'){const b=state.books.find(b=>b.id===state.activeSession?.bookId);if(b){const n=Number(event.target.value);if(Number.isInteger(n)&&n>=0&&n<=100000){b.page=n;persist()}}}});
function updateEpisode(input){const parent=input.closest('.episode'),x=state.shows.find(x=>x.id===parent.dataset.show),e=x.episodes.find(e=>e.id===parent.dataset.episode),key=input.dataset.ep;e[key]=key==='watched'?input.checked:key==='rating'?Number(input.value):input.value;x.status=x.episodes.every(e=>e.watched)?'Visto':x.episodes.some(e=>e.watched)?'Viendo':'Pendiente';persist();if(key!=='notes')render()}
document.addEventListener('error',event=>{if(event.target.matches?.('img[data-cover]'))event.target.remove()},true);
document.addEventListener('focusin',event=>{if(event.target.name==='katakana')$('.kana-keyboard').open=true});
document.addEventListener('focusout',event=>{if(event.target.name==='katakana'&&!event.target.isComposing)event.target.value=toKatakana(event.target.value)});
modal.addEventListener('cancel',()=>lookupGeneration++);
setInterval(()=>{if($('#reading-timer'))$('#reading-timer').textContent=timerText(elapsed())},1000);
window.addEventListener('online',render);window.addEventListener('offline',render);
window.addEventListener('storage',event=>{if(event.key===KEY&&event.newValue){try{const incoming=JSON.parse(event.newValue);validate(incoming);state=incoming;if(modal.open)modal.close();render();toast('Cuaderno actualizado desde otra pestaña.')}catch{toast('No se pudo leer el cambio de otra pestaña.')}}});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&$('#reading-timer'))$('#reading-timer').textContent=timerText(elapsed())});
if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
render();
