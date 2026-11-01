import test from 'node:test';
import assert from 'node:assert/strict';
import {mediaStatus,mergeCatalog,toKatakana} from '../dist/media.mjs';

const episode = {id:'manual-first',season:1,number:1,title:'Apunte manual',airdate:'',watched:true,rating:5,notes:'Conservar esta impresión.'};
const series = () => ({id:'series',category:'Anime',title:'Mi título',notes:'Mis notas',rating:4,cover:'https://example.com/personal.jpg',episodes:[{...episode}],status:'Visto'});

test('la actualización incorpora capítulos y conserva progreso, notas, portada y títulos personales',()=>{
 const original=series();
 const result=mergeCatalog(original,{status:'Running'},[{id:10,season:1,number:1,name:'Nombre del catálogo',airdate:'2020-01-01'},{id:11,season:1,number:2,name:'Segundo',airdate:'2020-01-02'}],123);
 assert.equal(result.added,1);
 assert.equal(result.item.episodes.length,2);
 assert.deepEqual(result.item.episodes[0],{...episode,title:'Nombre del catálogo',airdate:'2020-01-01'});
 assert.equal(result.item.episodes[1].watched,false);
 assert.equal(result.item.status,'Viendo');
 assert.equal(result.item.title,'Mi título');
 assert.equal(result.item.notes,'Mis notas');
 assert.equal(result.item.cover,original.cover);
 assert.equal(original.episodes.length,1);
 assert.equal(original.episodes[0].title,'Apunte manual');
 const again=mergeCatalog(result.item,{status:'Ended'},[{id:10,season:1,number:1,name:'Nombre',airdate:''},{id:11,season:1,number:2,name:'Segundo',airdate:''}]);
 assert.equal(again.added,0);
 assert.equal(again.item.episodes.length,2);
 assert.equal(again.item.airStatus,'Finalizada');
});

test('los episodios manuales adicionales se conservan aunque no aparezcan en el catálogo',()=>{
 const item=series();item.episodes.push({...episode,id:'manual-extra',season:0,number:1});
 const result=mergeCatalog(item,{status:'Ended'},[]);
 assert.equal(result.item.episodes.length,2);
 assert.equal(result.item.status,'Visto');
});

test('los filtros distinguen pendientes, viendo, vistos y películas antiguas ya vistas',()=>{
 assert.equal(mediaStatus({...series(),episodes:[]}), 'Pendiente');
 assert.equal(mediaStatus(series()),'Visto');
 assert.equal(mediaStatus({...series(),episodes:[episode,{...episode,number:2,watched:false}]}),'Viendo');
 assert.equal(mediaStatus({...series(),category:'Película',status:'Visto'}),'Vista');
 assert.equal(mediaStatus({...series(),category:'Película',status:'Pendiente',episodes:[{...episode,watched:false}]}),'Pendiente');
 assert.throws(()=>mergeCatalog({...series(),category:'Película'},{status:'Ended'},[]));
});

test('el nombre admite conversión de hiragana y katakana de anchura media',()=>{
 assert.equal(toKatakana('ろべると'),'ロベルト');
 assert.equal(toKatakana('ﾛﾍﾞﾙﾄ'),'ロベルト');
 assert.equal(toKatakana('ロベルト・アナ'),'ロベルト・アナ');
});
