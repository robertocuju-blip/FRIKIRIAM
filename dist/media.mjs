import {normalizeRecommendations} from './recommendations.mjs?v=20261107-5';
import {isPaused} from './library.mjs?v=20261107-1';

export const isMovie = item => item.category === 'Película';

export function mediaStatus(item) {
  if (isPaused(item)) return item.status;
  if (isMovie(item)) {
    if (Number.isInteger(item.completions)) return item.completions>0?'Vista':'Pendiente';
    if (item.status === 'Vista' || item.status === 'Visto') return 'Vista';
    return item.episodes.some(episode => episode.watched) ? 'Vista' : 'Pendiente';
  }
  const seen = item.episodes.filter(episode => episode.watched).length;
  return seen === 0 ? 'Pendiente' : seen === item.episodes.length ? 'Visto' : 'Viendo';
}

// Merge catalogue metadata without removing manual episodes or personal notes.
export function mergeCatalog(item, show, incoming, now = Date.now()) {
  if (isMovie(item)) throw new Error('Las películas no tienen catálogo de episodios.');
  const episodes = item.episodes.map(episode => ({...episode}));
  let added = 0;
  for (const data of incoming.filter(e => Number.isInteger(e.number))) {
    const id = `tvmaze-${data.id}`;
    const existing = episodes.find(e => e.id === id) || episodes.find(e => !e.id.startsWith('tvmaze-') && e.season === data.season && e.number === data.number);
    if (existing) {
      existing.title = data.name || `Capítulo ${data.number}`;
      existing.airdate = data.airdate || '';
      if(data.runtime>0)existing.runtime=data.runtime;
    } else {
      episodes.push({id, season:data.season, number:data.number, title:data.name || `Capítulo ${data.number}`, airdate:data.airdate || '', watched:false, rating:0, notes:'', ...(data.runtime>0?{runtime:data.runtime}:{})});
      added++;
    }
  }
  episodes.sort((a,b) => a.season - b.season || a.number - b.number);
  const updated = {...item, episodes, airStatus:show.status === 'Running' ? 'En emisión' : show.status === 'Ended' ? 'Finalizada' : 'Sin confirmar', checked:now};
  updated.status = mediaStatus(updated);
  return {item:updated, added};
}

// Array position is the only reliable creation order in older backups.
export function normalizeLibrary(data) {
  const collection = items => items.map((item,index) => ({...item,addedAt:Number.isFinite(item.addedAt) && item.addedAt > 0 ? item.addedAt : index + 1}));
  return {version:2,profile:{name:data.profile.name},books:collection(data.books),shows:collection(data.shows),games:collection(data.games),activeSession:data.activeSession,...(Array.isArray(data.groups)?{groups:data.groups}:{}),...(Array.isArray(data.recommendations)||Array.isArray(data.exchange?.messages)?{recommendations:normalizeRecommendations(data.recommendations??data.exchange.messages)}:{})};
}

export function newestFirst(items) {
  return items.map((item,index)=>({item,index})).sort((a,b)=>(b.item.addedAt||0)-(a.item.addedAt||0)||b.index-a.index).map(entry=>entry.item);
}
