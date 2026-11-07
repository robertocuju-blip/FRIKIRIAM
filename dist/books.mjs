import {yearOf,translatedGenres} from './library.mjs?v=20261107-1';
const ol='https://openlibrary.org';
const covers='https://covers.openlibrary.org/b/id/';
const https=value=>typeof value==='string'?value.replace(/^http:\/\//,'https://'):'';
const list=v=>Array.isArray(v)?v:[];
const cover=id=>Number(id)>0?`${covers}${id}-M.jpg`:'';
const isbnFrom=v=>list(v).find(i=>/^\d{13}$/.test(i))||list(v).find(i=>/^\d{9}[\dX]$/i.test(i))||'';

export async function searchBooks(term,source,kind,fetchJson){
 const q=term.slice(0,160);
 const jobs={
  google:async()=>{
   const data=await fetchJson('https://www.googleapis.com/books/v1/volumes?'+new URLSearchParams({q:/^[\dXx -]{10,19}$/.test(q)?'isbn:'+q.replace(/[ -]/g,''):q,maxResults:'12',printType:'books'}));
   return list(data.items).filter(x=>x.volumeInfo?.title).map(({id,volumeInfo:x,saleInfo:s})=>({
    editionId:'google:'+id,title:[x.title,x.subtitle].filter(Boolean).join(': '),author:list(x.authors).join(', '),
    cover:https(x.imageLinks?.thumbnail),price:s?.retailPrice?`${s.retailPrice.amount} ${s.retailPrice.currencyCode}`:'',
    priceChecked:Date.now(),sourceUrl:https(s?.buyLink||x.infoLink),provider:'Google Books',year:yearOf(x.publishedDate),publisher:x.publisher||'',isbn:isbnFrom(list(x.industryIdentifiers).map(x=>x.identifier)),language:x.language||'',genres:translatedGenres(x.categories)
   }));
  },
  open:async()=>{
   const data=await fetchJson(ol+'/search.json?'+new URLSearchParams({q,limit:'10',fields:'key,title,author_name,cover_i,first_publish_year,subject,editions,editions.key,editions.title,editions.isbn,editions.publisher,editions.cover_i,editions.publish_year,editions.language'}));
   return list(data.docs).filter(x=>/^\/works\/OL\d+W$/.test(x.key)&&x.title).map(x=>{
    const best=list(x.editions?.docs)[0],edition=/^\/books\/OL\d+M$/.test(best?.key)?best:null;
    return {title:edition?.title||x.title,author:list(x.author_name).join(', '),cover:cover(edition?.cover_i||x.cover_i),sourceUrl:ol+(edition?.key||x.key),provider:'Open Library',workKey:x.key,editionId:edition?.key||'',year:yearOf(edition?.publish_year?.[0]||x.first_publish_year),publisher:edition?.publisher?.[0]||'',isbn:isbnFrom(edition?.isbn),language:edition?.language?.[0]||'',genres:translatedGenres(list(x.subject).slice(0,8))};
   });
  },
  manga:async()=>{
   const data=await fetchJson('https://kitsu.io/api/edge/manga?'+new URLSearchParams({'filter[text]':q,'page[limit]':'10',include:'categories'}));
   const categories=new Map(list(data.included).filter(x=>x.type==='categories').map(x=>[x.id,x.attributes?.title]));
   return list(data.data).filter(x=>x.attributes?.canonicalTitle&&x.attributes?.nsfw!==true).map(({id,attributes:x,relationships})=>({title:x.canonicalTitle,cover:https(x.posterImage?.medium||x.posterImage?.small),sourceUrl:`https://kitsu.app/manga/${encodeURIComponent(x.slug||id)}`,provider:'Kitsu',year:yearOf(x.startDate),genres:translatedGenres(list(relationships?.categories?.data).map(g=>categories.get(g.id)).filter(Boolean)),subtitle:x.volumeCount?`${x.volumeCount} tomos · ficha de la obra`:'Ficha de la obra'}));
  },
  archive:async()=>{
   const term=q.replace(/["\\]/g,' ');
   const params=new URLSearchParams({q:`title:("${term}") AND mediatype:texts`,rows:'12',output:'json'});
   for(const f of ['identifier','title','creator','date','publisher','language','isbn','subject'])params.append('fl[]',f);
   const data=await fetchJson('https://archive.org/advancedsearch.php?'+params);
   return list(data.response?.docs).filter(x=>x.title&&/^[\w.-]+$/.test(x.identifier)).map(x=>({editionId:'archive:'+x.identifier,title:x.title,author:[x.creator].flat().filter(Boolean).join(', '),cover:`https://archive.org/services/img/${encodeURIComponent(x.identifier)}`,sourceUrl:`https://archive.org/details/${encodeURIComponent(x.identifier)}`,provider:'Internet Archive',year:yearOf(x.date),publisher:[x.publisher].flat().filter(Boolean)[0]||'',isbn:isbnFrom([x.isbn].flat()),language:[x.language].flat().filter(Boolean)[0]||'',genres:translatedGenres([x.subject].flat().filter(Boolean).slice(0,8))}));
  }
 };
 const selected=jobs[source]?[source]:['google','open',...(kind==='Mangas'?['manga']:[]),'archive'];
 const settled=await Promise.allSettled(selected.map(key=>jobs[key]()));
 if(settled.every(r=>r.status==='rejected'))throw Error('Catálogos no disponibles');
 // Interleave sources so a larger provider never hides the other catalogues.
 const rows=settled.map(r=>r.status==='fulfilled'?r.value:[]);
 return Array.from({length:Math.max(0,...rows.map(x=>x.length))},(_,i)=>rows.map(x=>x[i]).filter(Boolean)).flat().slice(0,36);
}

export async function bookEditions(item,offset,fetchJson){
 if(!/^\/works\/OL\d+W$/.test(item.workKey))return {results:[],more:false};
 const data=await fetchJson(`${ol}${item.workKey}/editions.json?limit=20&offset=${offset}`);
 return {more:offset+20<Number(data.size||0),results:list(data.entries).filter(x=>/^\/books\/OL\d+M$/.test(x.key)).map(x=>({
  ...item,editionId:x.key,title:x.title||item.title,sourceUrl:ol+x.key,cover:cover(list(x.covers)[0]),year:yearOf(x.publish_date),publisher:list(x.publishers).join(', '),isbn:isbnFrom([...list(x.isbn_13),...list(x.isbn_10)]),language:list(x.languages)[0]?.key?.split('/').at(-1)||'',subtitle:x.physical_format||''
 }))};
}
