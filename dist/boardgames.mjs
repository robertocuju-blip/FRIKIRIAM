const HOUR=60*60*1000;
const CACHE_KEY='frikiriam.boardgames.v2';
const numericId=value=>/^[1-9]\d*$/.test(String(value??''));
const https=value=>{try{const u=new URL(value);return u.protocol==='https:'?u.href:''}catch{return ''}};
const languageNames={ES:'Español',GB:'Inglés',EN:'Inglés',PT:'Portugués',DE:'Alemán',FR:'Francés',IT:'Italiano',NL:'Neerlandés',DK:'Danés',SE:'Sueco',NO:'Noruego',FI:'Finés',PL:'Polaco',CZ:'Checo',JP:'Japonés',CN:'Chino'};

export function editionLabel(versions={}){
 const languages=Array.isArray(versions.lang)?versions.lang.map(code=>languageNames[code]||code):[];
 const edition=Array.isArray(versions.version)?versions.version:[];
 return [...languages,...edition].join(' · ')||'Edición sin idioma indicado';
}

// Use product prices from offers in stock. Shipping totals depend on destination.
export function referencePrice(prices,currency,checked=Date.now()){
 const unavailable={price:'',priceChecked:null};
 if(!Array.isArray(prices)||!/^[A-Z]{3}$/.test(currency||''))return unavailable;
 const amounts=prices.filter(p=>p?.stock==='Y').map(p=>typeof p.product==='number'||typeof p.product==='string'?Number(p.product):NaN).filter(p=>Number.isFinite(p)&&p>0);
 if(!amounts.length)return unavailable;
 const amount=Math.round(Math.min(...amounts)*100)/100;
 return {price:new Intl.NumberFormat('es-ES',{style:'currency',currency}).format(amount),priceChecked:checked};
}

// Wikidata's BoardGameGeek identifiers restrict discovery to board games.
// BoardGamePrices /info supports browser access; /search does not offer CORS.
// No BoardGameGeek API, credentials, server or public CORS proxy is needed.
export function createBoardGameCatalog({fetchJson,storage=null,now=Date.now,sitename='https://robertocuju-blip.github.io/FRIKIRIAM/'}={}){
 let cache={},infoQueue=Promise.resolve();const pending=new Map();
 try{const parsed=JSON.parse(storage?.getItem(CACHE_KEY)||'{}');if(parsed&&typeof parsed==='object'&&!Array.isArray(parsed))cache=parsed}catch{ /* A full or disabled storage must not block manual entry. */ }
 function read(key){const entry=cache[key];return entry&&Number.isFinite(entry.at)&&now()-entry.at>=0&&now()-entry.at<HOUR?entry.data:undefined}
 function write(key,data){
  cache[key]={at:now(),data};
  for(const [id,entry] of Object.entries(cache))if(!entry||!Number.isFinite(entry.at)||now()-entry.at>=HOUR)delete cache[id];
  try{storage?.setItem(CACHE_KEY,JSON.stringify(cache))}catch{ /* Keep the hourly cache in memory when persistent storage is unavailable. */ }
 }
 async function remember(key,load){
  const hit=read(key);if(hit!==undefined)return hit;
  if(pending.has(key))return pending.get(key);
  const job=load().then(data=>{write(key,data);return data}).finally(()=>pending.delete(key));pending.set(key,job);return job;
 }
 const wikidata=params=>'https://www.wikidata.org/w/api.php?'+new URLSearchParams({format:'json',origin:'*',...params});
 async function discover(term){return remember('search:'+term.toLocaleLowerCase('es'),async()=>{
  const safeTerm=term.replace(/["\\]/g,' ').replace(/\s+/g,' ').trim();if(!safeTerm)return [];
  const found=await fetchJson(wikidata({action:'query',list:'search',srsearch:`"${safeTerm}" haswbstatement:P2339`,srnamespace:'0',srlimit:'8',srprop:''}));
  if(found.error)throw Error('No se pudo identificar el juego');
  const ids=(found.query?.search||[]).map(x=>x.title).filter(id=>/^Q\d+$/.test(id));if(!ids.length)return [];
  const detail=await fetchJson(wikidata({action:'wbgetentities',ids:ids.join('|'),props:'claims'}));
  if(detail.error)throw Error('No se pudo identificar el juego');
  return [...new Set(ids.flatMap(id=>(detail.entities?.[id]?.claims?.P2339||[]).filter(c=>c.rank!=='deprecated').map(c=>c.mainsnak?.datavalue?.value)).filter(numericId).map(String))].slice(0,8);
 })}
 async function editions(ids){
  const job=infoQueue.then(()=>loadEditions(ids));infoQueue=job.catch(()=>{});return job;
 }
 async function loadEditions(ids){
  const missing=ids.filter(id=>read('game:'+id)===undefined);
  if(missing.length){
   const data=await fetchJson('https://boardgameprices.co.uk/api/info?'+new URLSearchParams({eid:missing.join(','),sitename,currency:'EUR',destination:'GB',preferred_language:'ES'}));
   if(!Array.isArray(data.items))throw Error('El catálogo no ha devuelto juegos válidos');
   for(const id of missing){
    const items=data.items.filter(x=>String(x.external_id)===id&&numericId(x.id)&&typeof x.name==='string').map(x=>({id:String(x.id),title:x.name,cover:https(x.image)||https(x.thumbnail),sourceUrl:https(x.url),versions:x.versions||{},...referencePrice(x.prices,data.currency,now())}));
    write('game:'+id,items);
   }
  }
  return ids.flatMap(id=>{
   const items=read('game:'+id)||[];
   const priority=x=>x.versions?.lang?.includes('ES')?0:x.versions?.lang?.includes('GB')?1:2;
   return [...items].filter(x=>x.cover&&x.sourceUrl).sort((a,b)=>priority(a)-priority(b)).slice(0,4).map(x=>({...x,provider:'BoardGamePrices',subtitle:editionLabel(x.versions)}));
  });
 }
 return async query=>{
  const term=String(query).trim().replace(/\s+/g,' ').slice(0,160);if(term.length<2)return [];
  return remember('results:'+term.toLocaleLowerCase('es'),async()=>{
   const ids=await discover(term);if(!ids.length)return [];
   const results=await editions(ids),seen=new Set();
   return results.filter(x=>{if(seen.has(x.id))return false;seen.add(x.id);return true});
  });
 };
}
