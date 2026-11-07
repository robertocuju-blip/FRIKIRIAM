
import test from 'node:test';
import assert from 'node:assert/strict';
import {recommendationCode,recommendationLink,readRecommendation,readSharedRecommendation,needsInstalledAppTransfer} from '../dist/recommendations.mjs';
import {normalizeLibrary} from '../dist/media.mjs';

const message={id:'test-rec',createdAt:Date.UTC(2026,10,7),name:'Ángela',kind:'movie',title:'El viaje de Chihiro · 千と千尋の神隠し',note:'¡Para ver juntos! 🍿'};

test('una persona sin perfil ni código abre la recomendación de un enlace de Pages',()=>{
 const link=recommendationLink({...message,peer:'dato privado',packet:'enlace viejo'});
 assert.equal(new URL(link).origin,'https://robertocuju-blip.github.io');
 assert.equal(new URL(link).pathname,'/FRIKIRIAM/');
 assert.equal(new URL(link).search,'');
 assert.deepEqual(readRecommendation(link),message);
 const largest={...message,title:'読'.repeat(160),name:'友'.repeat(80),note:'本'.repeat(800)};
 assert.deepEqual(readRecommendation(recommendationLink(largest)),largest);
});

test('los enlaces anteriores se reconocen y los datos inválidos se rechazan',()=>{
 assert.deepEqual(readRecommendation('#rec=FK1-codigo.iv.cifrado'),{legacy:true});
 for(const value of ['#rec=v2.ab','#rec=v2.'+'a'.repeat(7001),'#rec=v2.'+btoa('{"kind":"otro"}'),'javascript:#rec=v2.abc']){
  assert.equal(readRecommendation(value),null);
 }
 assert.throws(()=>recommendationLink({...message,note:'x'.repeat(801)}));
});

test('restaurar una copia anterior conserva el historial sin conservar códigos ni claves',()=>{
 const old={version:2,profile:{name:'Ana'},books:[],shows:[],games:[],activeSession:null,exchange:{
  identity:{key:'privada',code:'personal'},
  messages:[{...message,direction:'received',peer:'remitente'},{...message,direction:'prepared',packet:'anterior'},null]
 }};
 const data=normalizeLibrary(old);
 assert.equal(data.exchange,undefined);
 assert.deepEqual(data.recommendations,[{...message,direction:'received'},{...message,direction:'prepared'}]);
 assert.deepEqual(normalizeLibrary(data),data);
});

test('se puede importar el mensaje completo de WhatsApp además del enlace',()=>{
 const link=recommendationLink(message);
 assert.deepEqual(readSharedRecommendation(link),message);
 assert.deepEqual(readSharedRecommendation('Te recomiendo esta película 🍿\n'+link+'\n¡Que la disfrutes!'),message);
 assert.deepEqual(readSharedRecommendation('Te recomiendo esta película ('+link+').'),message);
 assert.deepEqual(readSharedRecommendation('https://[invalid] '+link),message);
 assert.equal(readSharedRecommendation(link.replace('robertocuju-blip.github.io','example.org')),null);
 assert.equal(readSharedRecommendation(null),null);
});

test('el código copiado de un enlace conserva la misma recomendación sin incluir una URL',()=>{
 const link=recommendationLink(message),code=recommendationCode(readRecommendation(link));
 assert.ok(!code.includes('://'));
 assert.deepEqual(readSharedRecommendation(' '+code+'\n'),message);
 assert.equal(readSharedRecommendation(code.replace(/.$/,'!')),null);
 assert.equal(readSharedRecommendation('FRK2.'+'a'.repeat(7001)),null);
});

test('el traspaso se ofrece en el navegador de iOS, sin interrumpir a la app instalada',()=>{
 const iphone={userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X)'};
 assert.equal(needsInstalledAppTransfer(iphone),true);
 assert.equal(needsInstalledAppTransfer({...iphone,standalone:true}),false);
 assert.equal(needsInstalledAppTransfer({platform:'MacIntel',maxTouchPoints:5}),true);
 assert.equal(needsInstalledAppTransfer({platform:'MacIntel',maxTouchPoints:0}),false);
 assert.equal(needsInstalledAppTransfer({userAgent:'Mozilla/5.0 (Android)'}),false);
});
