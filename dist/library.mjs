export const pausedStates=['En pausa','Abandonado'];
export const isPaused=item=>pausedStates.includes(item.status);
export const formats=['Papel','Electrónico','Audiolibro'];
export const validRating=n=>Number.isFinite(n)&&n>=0&&n<=5&&Number.isInteger(n*2);
export const yearOf=value=>Number(String(value??'').match(/\b(?:1[0-9]{3}|20[0-9]{2}|2100)\b/)?.[0])||null;
export const bounded=(value,min=0,max=10000)=>Number.isInteger(Number(value))&&value!==''&&value!=null&&Number(value)>=min&&Number(value)<=max?Number(value):null;
export const labels=(value,limit=20)=>[...new Set((Array.isArray(value)?value:String(value??'').split(',')).filter(v=>typeof v==='string').map(v=>v.trim().slice(0,80)).filter(Boolean))].slice(0,limit);
export const groupKey=name=>name.normalize('NFC').toLocaleLowerCase('es');
export function groupNames(values,limit=20){
 const seen=new Set();
 return labels(values,limit).filter(name=>{const key=groupKey(name);if(seen.has(key))return false;seen.add(key);return true});
}
export const playersLabel=(a,b)=>a&&b?(a===b?(a===1?'1 jugador':`${a} jugadores`):`${a}–${b} jugadores`):'';
export function completionCount(item,kind){
 return bounded(item.completions)??(kind==='book'?(item.status==='Leído'?1:0):(['Vista','Visto'].includes(item.status)||item.episodes?.some(e=>e.watched)?1:0));
}
export function changeSeason(item,season,watched,today=new Date().toISOString().slice(0,10)){
 let affected=0;
 const episodes=item.episodes.map(e=>{
  if(e.season!==season||e.watched===watched||(watched&&e.airdate&&e.airdate>today))return e;
  affected++;return {...e,watched};
 });
 return {item:{...item,episodes},affected};
}
export function suggestItem(items,kind,{players=null,status=x=>x.status,random=Math.random,exclude}={}){
 const eligible=items.filter(x=>kind==='game'
  ?x.owned===true&&status(x)==='Jugado'&&Number.isInteger(players)&&x.minPlayers>0&&x.maxPlayers>=x.minPlayers&&players>=x.minPlayers&&players<=x.maxPlayers
  :status(x)==='Pendiente');
 const pool=eligible.length>1?eligible.filter(x=>x.id!==exclude):eligible;
 return pool[Math.floor(random()*pool.length)]||null;
}
export function libraryStats(data){
 const reading=data.books.reduce((n,x)=>n+x.sessions.reduce((m,s)=>m+s.duration,0),0);
 let films=0,filmMinutes=0,filmUnknown=0,episodes=0,episodeMinutes=0,episodeUnknown=0;
 for(const x of data.shows){
  if(x.category==='Película'){
   const count=completionCount(x,'movie');films+=count;
   if(x.runtime>0)filmMinutes+=count*x.runtime;else filmUnknown+=count;
  }else for(const e of x.episodes.filter(e=>e.watched)){
   episodes++;const mins=e.runtime||x.runtime;if(mins>0)episodeMinutes+=mins;else episodeUnknown++;
  }
 }
 return {reading,readings:data.books.reduce((n,x)=>n+completionCount(x,'book'),0),films,filmMinutes,filmUnknown,episodes,episodeMinutes,episodeUnknown,games:data.games.filter(x=>x.status==='Jugado').length};
}
const translations={Action:'Acción',Adventure:'Aventura',Animation:'Animación',Biography:'Biografía',Comedy:'Comedia',Crime:'Crimen',Documentary:'Documental',Drama:'Drama',Family:'Familiar',Fantasy:'Fantasía',History:'Historia',Horror:'Terror',Mystery:'Misterio',Romance:'Romance','Sci-Fi':'Ciencia ficción','Science-Fiction':'Ciencia ficción','Science Fiction':'Ciencia ficción',Sport:'Deportes',Thriller:'Suspense',War:'Bélica',Western:'Wéstern'};
export const translatedGenres=items=>labels(labels(items).map(value=>translations[value]||value));
