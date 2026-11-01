import test from 'node:test';
import assert from 'node:assert/strict';
import {movieResults,createMovieCatalog} from '../dist/movies.mjs';

const film={id:'tt0133093',type:'movie',name:'The Matrix',releaseInfo:'1999',poster:'https://example.org/matrix.jpg'};

test('el catálogo excluye series y duplicados y distingue películas por año',()=>{
 const results=movieResults({metas:[film,{...film,type:'series',id:'tt999'},film,{...film,id:'not-an-imdb-id'},{...film,id:'tt1234',name:'The Matrix Resurrections',releaseInfo:'2021'}]});
 assert.deepEqual(results.map(x=>[x.title,x.subtitle]),[['The Matrix','1999'],['The Matrix Resurrections','2021']]);
 assert.equal(results[0].provider,'Cinemeta');
 assert.equal(results[0].sourceUrl,'https://www.imdb.com/title/tt0133093/');
 assert.equal(movieResults({metas:[{...film,poster:'javascript:alert(1)'}]})[0].cover,'');
 assert.throws(()=>movieResults({error:'unavailable'}));
});

test('una búsqueda codifica el título y reutiliza la caché durante una hora',async()=>{
 let at=1000;const calls=[],values=new Map(),storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};
 const options={fetchJson:async u=>{calls.push(u);return {metas:[film]}},storage,now:()=>at};
 await createMovieCatalog(options)('Matrix / Reloaded & más');
 assert.equal(calls[0],'https://v3-cinemeta.strem.io/catalog/movie/top/search=Matrix%20%2F%20Reloaded%20%26%20m%C3%A1s.json');
 at+=3599999;
 await createMovieCatalog(options)('  MATRIX / Reloaded & más  ');
 assert.equal(calls.length,1);
 at+=1;
 await createMovieCatalog(options)('Matrix / Reloaded & más');
 assert.equal(calls.length,2);
});

test('las búsquedas simultáneas comparten consulta y un fallo permite reintentar',async()=>{
 let calls=0,broken=true;
 const search=createMovieCatalog({fetchJson:async()=>{calls++;if(broken)throw Error('Sin conexión');return {metas:[film]}}});
 await assert.rejects(search('Matrix'),/Sin conexión/);
 broken=false;
 const [first,second]=await Promise.all([search('Matrix'),search('matrix')]);
 assert.deepEqual(first,second);
 assert.equal(calls,2);
});

test('un resultado vacío y el almacenamiento desactivado mantienen disponible la entrada manual',async()=>{
 const storage={getItem(){throw Error('Disabled')},setItem(){throw Error('Full')}};
 const search=createMovieCatalog({storage,fetchJson:async()=>({metas:[]})});
 assert.deepEqual(await search('Un título ausente'),[]);
 assert.deepEqual(await search(''),[]);
});
