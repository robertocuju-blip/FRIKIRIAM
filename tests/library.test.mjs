import test from 'node:test';
import assert from 'node:assert/strict';
import {changeSeason,completionCount,suggestItem,libraryStats,validRating,groupNames} from '../dist/library.mjs';
import {mediaStatus,mergeCatalog,normalizeLibrary} from '../dist/media.mjs';
import {searchBooks,bookEditions} from '../dist/books.mjs';

test('marcar una temporada conserva el progreso de otras temporadas, notas y futuros episodios',()=>{
 const original={id:'1',status:'En pausa',category:'Anime',episodes:[
  {id:'a',season:1,number:1,watched:false,notes:'Mi nota',rating:4.5,airdate:'2026-01-01'},
  {id:'b',season:1,number:2,watched:false,airdate:'2027-01-01'},
  {id:'c',season:2,number:1,watched:false,airdate:''}
 ]};
 const {item,affected}=changeSeason(original,1,true,'2026-11-07');
 assert.equal(affected,1);
 assert.deepEqual(item.episodes.map(x=>x.watched),[true,false,false]);
 assert.equal(item.episodes[0].rating,4.5);
 assert.equal(item.episodes[0].notes,'Mi nota');
 assert.equal(original.episodes[0].watched,false);
 assert.equal(mediaStatus(mergeCatalog(item,{status:'Running'},[]).item),'En pausa');
 assert.deepEqual(changeSeason(item,1,false,'2026-11-07').item.episodes.map(x=>x.watched),[false,false,false]);
});

test('las sugerencias excluyen pausados y juegos ajenos, pendientes o incompatibles',()=>{
 const games=[
  {id:'wanted',owned:true,status:'Pendiente',minPlayers:2,maxPlayers:5},
  {id:'played elsewhere',owned:false,status:'Jugado',minPlayers:2,maxPlayers:5},
  {id:'too few',owned:true,status:'Jugado',minPlayers:1,maxPlayers:2},
  {id:'works',owned:true,status:'Jugado',minPlayers:3,maxPlayers:5},
  {id:'unknown',owned:true,status:'Jugado'}
 ];
 assert.equal(suggestItem(games,'game',{players:3}).id,'works');
 assert.equal(suggestItem(games,'game',{players:6}),null);
 assert.equal(suggestItem([{id:'paused',status:'En pausa'},{id:'abandoned',status:'Abandonado'},{id:'next',status:'Pendiente'}],'book').id,'next');
});

test('los recuentos antiguos migran de forma implícita y las estadísticas suman duraciones conocidas',()=>{
 const data={version:2,profile:{name:'Ana'},groups:['Saga'],books:[{status:'Leído',sessions:[{duration:1800000}]}],shows:[
  {category:'Película',status:'Vista',runtime:120,episodes:[]},
  {category:'Película',status:'Abandonado',runtime:90,episodes:[],completions:2,groups:['Saga']},
  {category:'Película',status:'Vista',episodes:[]},
  {category:'Serie',runtime:30,episodes:[{watched:true,runtime:20},{watched:true},{watched:false,runtime:30}]}
 ],games:[{status:'Jugado'}],activeSession:null};
 const normalized=normalizeLibrary(data),stats=libraryStats(normalized);
 assert.equal(completionCount(normalized.books[0],'book'),1);
 assert.equal(stats.reading,1800000);
 assert.equal(stats.films,4);
 assert.equal(stats.filmMinutes,300);
 assert.equal(stats.filmUnknown,1);
 assert.equal(stats.episodeMinutes,50);
 assert.deepEqual(normalized.shows[1].groups,['Saga']);
 assert.deepEqual(groupNames([' Saga ','saga','Reto']),['Saga','Reto']);
 assert.ok(validRating(4.5));
 assert.ok(!validRating(4.6));
});

test('el buscador combina fuentes y el selector mantiene el ISBN de la edición elegida',async()=>{
 const fetchJson=async endpoint=>{
  const u=new URL(endpoint);
  if(u.hostname==='www.googleapis.com')throw Error('límite de Google');
  if(u.hostname==='archive.org')return {response:{docs:[{identifier:'abc',title:'Libro',publisher:'Otra editorial',date:'2010'}]}};
  if(u.pathname.includes('editions.json'))return {size:24,entries:[{key:'/books/OL9M',title:'Libro en papel',publish_date:'1999',publishers:['Editorial A'],isbn_13:['9781473226814']}]};
  return {docs:[{key:'/works/OL1W',title:'Libro',first_publish_year:1985,editions:{docs:[{key:'/books/OL2M',publish_year:[2000],publisher:['Editorial B']}]}}]};
 };
 const rows=await searchBooks('Libro','', 'Libros',fetchJson);
 assert.deepEqual(rows.map(x=>x.provider),['Open Library','Internet Archive']);
 assert.equal(rows[0].year,2000);
 const edition=await bookEditions(rows[0],0,fetchJson);
 assert.equal(edition.more,true);
 assert.equal(edition.results[0].isbn,'9781473226814');
 assert.equal(edition.results[0].publisher,'Editorial A');
 assert.equal(edition.results[0].year,1999);
});
