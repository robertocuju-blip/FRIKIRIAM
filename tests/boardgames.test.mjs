import test from 'node:test';
import assert from 'node:assert/strict';
import {createBoardGameCatalog,editionLabel} from '../dist/boardgames.mjs';

const memory=()=>{const data=new Map();return {getItem:key=>data.get(key),setItem:(key,value)=>data.set(key,value)}};
const claim=value=>({mainsnak:{datavalue:{value}}});
const item=(id,external_id,lang,name='Catan')=>({id,external_id,name,image:`https://example.org/${id}.jpg`,url:`https://boardgameprices.co.uk/item/show/${id}/catan`,versions:{lang:[lang]}});
function fixture(){
 const calls=[];
 const fetchJson=async endpoint=>{
  const u=new URL(endpoint);calls.push(u);
  if(u.searchParams.get('list')==='search')return {query:{search:[{title:'Q17271'},{title:'Q1903'},{title:'Q1'}]}};
  if(u.searchParams.get('action')==='wbgetentities')return {entities:{Q17271:{claims:{P2339:[claim('13')]}},Q1903:{claims:{}},Q1:{claims:{P2339:[claim('bad-id'),{...claim('999'),rank:'deprecated'}]}}}};
  return {items:[item(949,'13','GB'),item(32086,'13','ES','Colonos de Catán'),item(20,'20','ES','Otro juego'),{...item(30,'13','ES'),image:'javascript:alert(1)'},{...item(31,'13','ES'),url:'http://example.org'}]};
 };
 return {calls,fetchJson};
}

test('solo consulta identificadores válidos de juegos y prioriza la edición española',async()=>{
 const f=fixture(),search=createBoardGameCatalog({fetchJson:f.fetchJson});
 const results=await search('Catan');
 assert.equal(f.calls[0].searchParams.get('srsearch'),'"Catan" haswbstatement:P2339');
 assert.equal(f.calls[2].searchParams.get('eid'),'13');
 assert.equal(f.calls[2].searchParams.get('preferred_language'),'ES');
 assert.deepEqual(results.map(x=>x.id),['32086','949']);
 assert.equal(results[0].subtitle,'Español');
 assert.equal(results[0].provider,'BoardGamePrices');
 assert.match(results[0].sourceUrl,/boardgameprices/);
 assert.ok(f.calls.every(u=>!u.hostname.includes('boardgamegeek')));
});

test('reutiliza la caché durante una hora incluso después de reabrir la aplicación',async()=>{
 let at=1000;const f=fixture(),storage=memory(),options={fetchJson:f.fetchJson,storage,now:()=>at};
 const initial=await createBoardGameCatalog(options)('Catan');
 at+=3599999;
 assert.deepEqual(await createBoardGameCatalog(options)('  CATAN  '),initial);
 assert.equal(f.calls.length,3);
 at+=1;
 await createBoardGameCatalog(options)('Catan');
 assert.equal(f.calls.length,6);
});

test('comparte búsquedas simultáneas y ediciones entre consultas diferentes',async()=>{
 const f=fixture(),search=createBoardGameCatalog({fetchJson:f.fetchJson});
 await Promise.all([search('Catan'),search('catan'),search('Colonos de Catán')]);
 assert.equal(f.calls.filter(u=>u.hostname==='boardgameprices.co.uk').length,1);
 assert.equal(f.calls.filter(u=>u.searchParams.get('list')==='search').length,2);
});

test('un error no queda guardado como catálogo vacío y permite reintentar',async()=>{
 const f=fixture();let broken=true;
 const search=createBoardGameCatalog({fetchJson:async u=>{if(broken&&u.includes('/api/info'))throw Error('Sin conexión');return f.fetchJson(u)}});
 await assert.rejects(search('Catan'),/Sin conexión/);
 broken=false;
 assert.equal((await search('Catan')).length,2);
});

test('un título sin identificador no dispara consultas de portadas',async()=>{
 const calls=[];const search=createBoardGameCatalog({fetchJson:async u=>{calls.push(u);return {query:{search:[]}}}});
 assert.deepEqual(await search('Madrid'),[]);
 assert.equal(calls.length,1);
 assert.deepEqual(await search(''),[]);
 assert.equal(calls.length,1);
});

test('el almacenamiento desactivado no impide buscar y las ediciones se distinguen',async()=>{
 const f=fixture();const storage={getItem(){throw Error('Disabled')},setItem(){throw Error('Full')}};
 assert.equal((await createBoardGameCatalog({fetchJson:f.fetchJson,storage})('Catan')).length,2);
 assert.equal(editionLabel({lang:['ES','PT'],version:['2025']}),'Español · Portugués · 2025');
 assert.equal(editionLabel(),'Edición sin idioma indicado');
});
