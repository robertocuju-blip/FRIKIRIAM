import test from 'node:test';
import assert from 'node:assert/strict';
import {makeIdentity,sealRecommendation,openRecommendation,validExchange} from '../dist/recommendations.mjs';

test('un enlace se abre con el código destinatario, se puede responder y rechaza modificaciones',async()=>{
 const [sender,recipient,stranger]=await Promise.all([makeIdentity(),makeIdentity(),makeIdentity()]);
 const item={id:crypto.randomUUID(),createdAt:Date.now(),name:'Ana',kind:'movie',title:'El viaje de Chihiro',note:'Una película para ver juntos'};
 const packet=await sealRecommendation(sender,recipient.code,item);
 assert.ok(!packet.includes(item.title));
 await assert.rejects(openRecommendation(stranger,packet));
 const opened=await openRecommendation(recipient,packet);
 assert.equal(opened.peer,sender.code);
 assert.equal(opened.note,item.note);
 assert.equal(opened.title,item.title);
 const [code,iv,cipher]=packet.split('.');
 await assert.rejects(openRecommendation(recipient,[code,iv,(cipher[0]==='A'?'B':'A')+cipher.slice(1)].join('.')));
 const reply=await sealRecommendation(recipient,opened.peer,{...item,id:crypto.randomUUID(),name:'Pablo',note:'Gracias'});
 assert.equal((await openRecommendation(sender,reply)).note,'Gracias');
 assert.ok(validExchange({identity:recipient,messages:[opened]}));
});
