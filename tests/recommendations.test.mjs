
import test from 'node:test';
import assert from 'node:assert/strict';
import {recommendationLink,readRecommendation} from '../dist/recommendations.mjs';
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
