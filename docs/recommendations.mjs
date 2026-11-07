const appUrl='https://robertocuju-blip.github.io/FRIKIRIAM/';
const kinds=new Set(['book','show','movie','game']);
const limited=(v,max)=>typeof v==='string'&&v.length<=max;

export function validMessage(m){
 return !!m&&/^[a-zA-Z0-9_-]{1,80}$/.test(typeof m.id==='string'?m.id:'')&&kinds.has(m.kind)
  &&limited(m.title,160)&&!!m.title.trim()&&limited(m.name,80)&&limited(m.note,800)
  &&Number.isSafeInteger(m.createdAt)&&m.createdAt>=0&&m.createdAt<=8640000000000000;
}
const messageOnly=({id,title,kind,name,note,createdAt})=>({id,title,kind,name,note,createdAt});

export function normalizeRecommendations(messages){
 if(!Array.isArray(messages))return [];
 const unique=new Map();
 for(const m of messages){
  if(!validMessage(m)||!['prepared','received'].includes(m.direction))continue;
  unique.set(m.direction+':'+m.id,{...messageOnly(m),direction:m.direction});
 }
 return [...unique.values()].slice(-1000);
}

export function recommendationLink(message){
 if(!validMessage(message))throw Error('Recomendación no válida');
 const bytes=new TextEncoder().encode(JSON.stringify(messageOnly(message)));
 const token=btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
 return appUrl+'#rec=v2.'+token;
}

export function readRecommendation(value){
 try{
  const url=new URL(value,appUrl), hash=url.hash;
  if(!['http:','https:'].includes(url.protocol))return null;
  if(/^#rec=FK1[-.]/.test(hash))return {legacy:true};
  const token=hash.match(/^#rec=v2\.([\w-]{1,7000})$/)?.[1];
  if(!token)return null;
  const bytes=Uint8Array.from(atob(token.replaceAll('-','+').replaceAll('_','/')),ch=>ch.charCodeAt(0));
  const message=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
  return validMessage(message)?messageOnly(message):null;
 }catch{return null;}
}

export function readSharedRecommendation(value){
 if(typeof value!=='string'||value.length>9000)return null;
 if(value.trim().startsWith('#rec='))return readRecommendation(value.trim());
 // WhatsApp can copy the full message along with the link.
 for(const candidate of value.matchAll(/https:\/\/[^\s<>"']+/g)){
  let url;try{url=new URL(candidate[0].replace(/[),.;!?»\]]+$/,''))}catch{continue;}
  if(url.origin+url.pathname!==appUrl)continue;
  const message=readRecommendation(url.href);
  if(message)return message;
 }
 return null;
}

export function needsInstalledAppTransfer({userAgent='',platform='',maxTouchPoints=0,standalone=false}={}){
 const appleMobile=/iPhone|iPad|iPod/i.test(userAgent)||(platform==='MacIntel'&&maxTouchPoints>1);
 return appleMobile&&!standalone;
}
