const encode=new TextEncoder(),decode=new TextDecoder();
const token=bytes=>btoa(String.fromCharCode(...new Uint8Array(bytes))).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
const bytes=value=>Uint8Array.from(atob(value.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0));
export const validCode=code=>typeof code==='string'&&/^FK1-[A-Za-z0-9_-]{87}$/.test(code);
const privateValid=key=>key?.kty==='EC'&&key.crv==='P-256'&&['d','x','y'].every(k=>/^[A-Za-z0-9_-]{43}$/.test(key[k]));
export function validMessage(x){
 return x&&typeof x.id==='string'&&x.id.length<=64&&Number.isFinite(x.createdAt)&&typeof x.name==='string'&&x.name.length<=80&&typeof x.title==='string'&&x.title.trim()&&x.title.length<=160&&['book','show','movie','game'].includes(x.kind)&&typeof x.note==='string'&&x.note.length<=800;
}
export function validExchange(x){
 return x&&validCode(x.identity?.code)&&privateValid(x.identity?.key)&&Array.isArray(x.messages)&&x.messages.length<=1000&&x.messages.every(m=>validMessage(m)&&['received','prepared'].includes(m.direction)&&validCode(m.peer)&&(!m.packet||typeof m.packet==='string'&&m.packet.length<=7000));
}
export async function makeIdentity(){
 const pair=await crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'},true,['deriveKey']);
 return {code:'FK1-'+token(await crypto.subtle.exportKey('raw',pair.publicKey)),key:await crypto.subtle.exportKey('jwk',pair.privateKey)};
}
async function conversationKey(identity,peer){
 if(!validCode(peer)||!validCode(identity?.code)||!privateValid(identity?.key))throw Error('Código no válido');
 const alg={name:'ECDH',namedCurve:'P-256'};
 const privateKey=await crypto.subtle.importKey('jwk',identity.key,alg,false,['deriveKey']);
 const publicKey=await crypto.subtle.importKey('raw',bytes(peer.slice(4)),alg,false,[]);
 return crypto.subtle.deriveKey({name:'ECDH',public:publicKey},privateKey,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
const context=(from,to)=>encode.encode(`FRIKIRIAM|recomendación|1|${from}|${to}`);
export async function sealRecommendation(identity,to,message){
 if(!validMessage(message)||to===identity.code)throw Error('Recomendación no válida');
 const key=await conversationKey(identity,to),iv=crypto.getRandomValues(new Uint8Array(12));
 const cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:context(identity.code,to)},key,encode.encode(JSON.stringify(message)));
 return [identity.code,token(iv),token(cipher)].join('.');
}
export async function openRecommendation(identity,packet){
 if(typeof packet!=='string'||packet.length>7000)throw Error('Enlace no válido');
 const fields=packet.split('.'),[from,nonce,cipher]=fields;
 if(fields.length!==3||!validCode(from)||!/^[A-Za-z0-9_-]{16}$/.test(nonce)||!/^[A-Za-z0-9_-]+$/.test(cipher))throw Error('Enlace no válido');
 const key=await conversationKey(identity,from);
 const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(nonce),additionalData:context(from,identity.code)},key,bytes(cipher));
 const data=JSON.parse(decode.decode(plain));
 if(!validMessage(data))throw Error('Recomendación no válida');
 const {id,createdAt,name,title,kind,note}=data;
 return {id,createdAt,name,title,kind,note,peer:from,direction:'received'};
}
