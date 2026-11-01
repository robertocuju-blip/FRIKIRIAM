const TTL=60*60*1000;
const CACHE_KEY='frikiriam.movies.v1';
const https=value=>{try{const u=new URL(value);return u.protocol==='https:'?u.href:''}catch{return ''}};

export function movieResults(data){
 if(!Array.isArray(data?.metas))throw Error('El catálogo no ha devuelto películas válidas');
 const seen=new Set();
 return data.metas.filter(x=>x?.type==='movie'&&/^tt\d+$/.test(x.id)&&typeof x.name==='string'&&x.name.trim()).filter(x=>{if(seen.has(x.id))return false;seen.add(x.id);return true}).slice(0,12).map(x=>({
  title:x.name,cover:https(x.poster),sourceUrl:`https://www.imdb.com/title/${x.id}/`,provider:'Cinemeta',category:'Película',subtitle:String(x.releaseInfo||'Año sin confirmar'),imdbId:x.id
 }));
}

export function createMovieCatalog({fetchJson,storage=null,now=Date.now}={}){
 let cache={};const pending=new Map();
 try{const saved=JSON.parse(storage?.getItem(CACHE_KEY)||'{}');if(saved&&typeof saved==='object'&&!Array.isArray(saved))cache=saved}catch{}
 return async query=>{
  const term=String(query).trim().replace(/\s+/g,' ').slice(0,160);if(term.length<2)return [];
  const key=term.toLocaleLowerCase('es'),entry=cache[key];
  if(entry&&now()-entry.at>=0&&now()-entry.at<TTL&&Array.isArray(entry.results))return entry.results;
  if(pending.has(key))return pending.get(key);
  const job=(async()=>{
   const data=await fetchJson(`https://v3-cinemeta.strem.io/catalog/movie/top/search=${encodeURIComponent(term)}.json`);
   const results=movieResults(data);cache[key]={at:now(),results};
   for(const [k,v] of Object.entries(cache))if(!v||!Number.isFinite(v.at)||now()-v.at>=TTL)delete cache[k];
   try{storage?.setItem(CACHE_KEY,JSON.stringify(cache))}catch{ /* An unavailable storage must not block catalogue or manual entry. */ }
   return results;
  })().finally(()=>pending.delete(key));
  pending.set(key,job);return job;
 };
}
