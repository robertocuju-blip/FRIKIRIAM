import {yearOf,translatedGenres} from './library.mjs?v=20261107-1';
const TTL=60*60*1000;
const CACHE_KEY='frikiriam.movies.v1';
const https=value=>{try{const u=new URL(value);return u.protocol==='https:'?u.href:''}catch{return ''}};

export function movieResults(data){
 if(!Array.isArray(data?.metas))throw Error('El catálogo no ha devuelto películas válidas');
 const seen=new Set();
 return data.metas.filter(x=>x?.type==='movie'&&/^tt\d+$/.test(x.id)&&typeof x.name==='string'&&x.name.trim()).filter(x=>{if(seen.has(x.id))return false;seen.add(x.id);return true}).slice(0,12).map(x=>({
  title:x.name,cover:https(x.poster),sourceUrl:`https://www.imdb.com/title/${x.id}/`,provider:'Cinemeta',category:'Película',subtitle:String(x.releaseInfo||'Año sin confirmar'),imdbId:x.id,year:yearOf(x.releaseInfo),genres:translatedGenres(x.genres),synopsis:typeof x.description==='string'?x.description.slice(0,1800):''
 }));
}

export const imdbOf=item=>/^tt\d+$/.test(item?.imdbId)?item.imdbId:([item?.sourceUrl,item?.coverSourceUrl].map(x=>String(x||'').match(/^https:\/\/(?:www\.)?imdb\.com\/title\/(tt\d+)\b/i)?.[1]).find(Boolean)||'');
export async function movieDetails(id,fetchJson){
 if(!/^tt\d+$/.test(id))return {};
 const {meta}=await fetchJson(`https://v3-cinemeta.strem.io/meta/movie/${id}.json`);
 if(!meta||meta.id!==id||meta.type!=='movie')return {};
 const runtime=Number(String(meta.runtime||'').match(/^\s*(\d+)\s*(?:min|$)/i)?.[1])||null;
 return {imdbId:id,year:yearOf(meta.releaseInfo||meta.year),genres:translatedGenres(meta.genres),synopsis:typeof meta.description==='string'?meta.description.slice(0,1800):'',runtime};
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
