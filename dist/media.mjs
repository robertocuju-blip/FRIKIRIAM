export const isMovie = item => item.category === 'Película';

export function mediaStatus(item) {
  if (isMovie(item)) {
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
    } else {
      episodes.push({id, season:data.season, number:data.number, title:data.name || `Capítulo ${data.number}`, airdate:data.airdate || '', watched:false, rating:0, notes:''});
      added++;
    }
  }
  episodes.sort((a,b) => a.season - b.season || a.number - b.number);
  const updated = {...item, episodes, airStatus:show.status === 'Running' ? 'En emisión' : show.status === 'Ended' ? 'Finalizada' : 'Sin confirmar', checked:now};
  updated.status = mediaStatus(updated);
  return {item:updated, added};
}

export function toKatakana(value) {
  return value.normalize('NFKC').replace(/[\u3041-\u3096]/g, char => String.fromCharCode(char.charCodeAt(0) + 0x60));
}
