# FRIKIRIAM

Aplicación web personal en español para organizar lecturas, animes y series, películas y juegos de mesa. Conserva una estética japonesa mediante el paisaje, los colores y la composición, con una interfaz en español y traducciones breves al japonés.

- Inicio con cuatro bloques del mismo tamaño: lecturas, animes y series, películas y juegos. Cada bloque conserva su contador y abre su colección.
- Lecturas agrupadas en Cómics, Mangas, Libros y Novelas gráficas. Dentro de cada categoría se filtra por Pendiente, Leyendo o Leído. Sin pestaña agregada; al entrar se abre la categoría de la lectura más reciente (Cómics si aún no hay lecturas).
- Sesiones de lectura con pantalla de concentración, cronómetro, pausa, página actual, histórico y tiempo acumulado. Notas y estrellas al terminar.
- Animes y series con capítulos, valoraciones y comentarios. Categorías directas Animes / Series y filtros de estado: Pendiente, Viendo y Visto. Al entrar se abre el tipo del título más reciente (Animes si aún no hay títulos). La fecha indica «Catálogo actualizado a…».
- Actualización conjunta de todos los títulos vinculados a TVmaze, con progreso, gestión de errores y conservación de capítulos vistos y notas. Los registros manuales pueden vincularse desde Detalles.
- Películas separadas, con Pendiente o Vista y valoración de la película completa.
- Juegos con Pendiente o Jugado, notas, estrellas y precio de referencia opcional y rango de jugadores importado automáticamente, y la casilla «Tengo este juego». El precio se importa del catálogo o se escribe manualmente, y aparece tanto en lista como en tarjetas.
- Selector Lista / Tarjetas en todas las colecciones, con portada visible y títulos recientes primero en ambas vistas. La preferencia se recuerda por sección en este dispositivo. Editar un registro no cambia su fecha de alta.
- Perfil con nombre en español o el que elija la persona y estadísticas de actividad. Lectura suma el cronómetro; vídeo estima el tiempo a partir de duraciones conocidas y recuentos. Las fichas sin duración se contabilizan aparte.
- Filtros por género, año, grupo y, para lecturas, formato. En juegos de mesa se filtra por grupo. El tipo de lectura o de serie se selecciona en su propia pestaña. Los datos se pueden completar o corregir en la ficha.
- Estados En pausa y Abandonado, valoraciones en pasos de media estrella y recuentos editables de lecturas y visionados. Para las series, cada temporada se puede desplegar y marcar o desmarcar en bloque. Marcar una temporada omite los capítulos con fecha futura.
- Fichas accesibles al pulsar la portada. Las películas muestran sinopsis de su catálogo y permiten guardar varias selecciones de una vez, incluso combinando búsquedas.
- Grupos con nombre propio que pueden reunir títulos de distintas colecciones. «Sugerir» busca entre los pendientes; en juegos busca entre los propios y jugados que admiten el número indicado de jugadores.
- Copias JSON exportables e importables, instalación como aplicación web y caché para usar el cuaderno sin conexión después de la primera visita.

## Uso

Aplicación pública: https://robertocuju-blip.github.io/FRIKIRIAM/

En iPhone: abrir en Safari, pulsar Compartir → Añadir a pantalla de inicio → Añadir. El diseño se verifica en navegador de escritorio y viewport móvil; la instalación física debe probarse en un iPhone.

Los datos se guardan en este navegador y dispositivo, bajo la clave histórica `frikiriam.v1` de localStorage. Borrar los datos del navegador elimina el cuaderno; hacer copias desde Mi perfil con frecuencia. No hay cuentas ni sincronización entre dispositivos. El formato de vista se guarda aparte, en `frikiriam.views.v1`; la copia JSON contiene el cuaderno, no las preferencias de presentación. Los distintos orígenes web, incluida la vista de Sites, tienen almacenamientos separados: para trasladar datos hay que exportar e importar la copia.

## Compatibilidad de datos

El formato actual de copia es la versión 2. Se aceptan copias de la versión 1 y se conserva el nombre, lecturas, sesiones, series, episodios, películas, juegos, notas y valoraciones. La migración retira los datos personales y las colecciones de las funciones eliminadas. Los registros antiguos reciben un orden de alta a partir de su posición original en el array; así los añadidos más recientemente aparecen primero. Los registros nuevos guardan `addedAt`, que se mantiene al editar.

El contenido introducido por cada persona, incluidos títulos en otros idiomas, se conserva tal como fue guardado. Compartir la dirección no comparte el cuaderno.

## Recomendaciones

Desde la ficha de un título, pulsa «Recomendar» y comparte su enlace por WhatsApp o por el medio que prefieras. Al abrirlo en el navegador, la otra persona pulsa «Copiar código». Luego abre FRIKIRIAM donde guarda su biblioteca y pulsa «Pegar código» en Recomendaciones. En iPhone y iPad, el navegador y la app de la pantalla de inicio guardan los datos por separado. Cada código identifica una recomendación; no hay códigos de usuario.

Quien tenga el enlace o el código puede leer el título, el nombre del remitente y el mensaje. El historial se guarda en cada dispositivo y se incluye en las copias del cuaderno. Los enlaces cifrados de la versión anterior deben volver a compartirse; las recomendaciones guardadas se conservan. GitHub Pages sirve los archivos de la aplicación.

## Catálogos

- [Google Books](https://developers.google.com/books/docs/v1/reference/volumes), [Open Library](https://openlibrary.org/dev/docs/api/search) e [Internet Archive](https://archive.org/advancedsearch.php): búsqueda bibliográfica, portadas y datos de edición. Busca por título, autor o ISBN; elige una fuente o combina sus resultados. En Open Library, «Ver ediciones» abre la lista de ediciones de la obra con idioma, editorial e ISBN cuando figuran. Los precios son opcionales.
- [Kitsu](https://kitsu.docs.apiary.io/): catálogo adicional de mangas. Sus resultados identifican la obra; usa un catálogo bibliográfico o añade el ISBN a mano cuando quieras registrar una edición concreta.
- [TVmaze](https://www.tvmaze.com/api): portadas, episodios y emisión. Datos bajo [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/); la interfaz enlaza a la fuente. La actualización conjunta espacia peticiones y reintenta respuestas 429. Es necesario mantener abierta la aplicación hasta finalizar.
- [BoardGamePrices](https://boardgameprices.co.uk/api/plugin): portadas de juegos, ediciones y precios, con preferencia por el español. Se muestra el menor precio del producto entre ofertas en stock, en la moneda devuelta por el catálogo (EUR solicitado), sin sumar envío ni posibles tasas. No es una cotización de entrega en España. El enlace permite comprobar las ofertas. El precio conserva la fecha de consulta y forma parte de las copias JSON. Al editar un juego, elegir otra portada conserva el precio existente; «Usar este precio» aplica expresamente el del catálogo. La búsqueda usa identificadores y, cuando se publican, rangos de jugadores de [Wikidata](https://www.wikidata.org/wiki/Property:P2339). Después consulta las imágenes en BoardGamePrices. En los juegos añadidos a mano o ya guardados, busca el rango por el identificador de la edición o por un título inequívoco. Si el catálogo no lo indica, el dato queda vacío. Solo aparecen juegos vinculados a ambos catálogos; si no hay coincidencia se mantiene la entrada manual. No requiere cuenta, clave ni aprobación. Las consultas se guardan en caché durante una hora (persistente si el navegador permite almacenamiento), con logo y enlace a la fuente. No se utiliza la API de BoardGameGeek ni un proxy externo.
- [Cinemeta](https://github.com/Stremio/stremio-addon-sdk/blob/master/docs/advanced.md#understanding-cinemeta): búsqueda específica de películas con cartel, año, géneros, duración y sinopsis en el idioma disponible. Incluye enlace a la ficha de IMDb. Sin cuenta ni clave. Algunos títulos se muestran con su nombre internacional; se puede personalizar el título. Las búsquedas se guardan en caché durante una hora. Las portadas guardadas anteriormente se conservan hasta que el usuario elija otra.

Los títulos buscados se envían al catálogo seleccionado. Las portadas y las fuentes tipográficas externas necesitan conexión. Los catálogos pueden fallar por cobertura o límites: se conserva la entrada manual. Elegir otra portada para un registro existente conserva su título, notas y progreso. Para las series manuales, vincular el catálogo de capítulos es una opción explícita e independiente.

## Desarrollo

Sin dependencias de ejecución ni compilación. `dist/` contiene la aplicación y `docs/` es su copia exacta para GitHub Pages, desplegada desde `main`. Mantener sincronizadas ambas carpetas. Al actualizar los archivos, incrementar la versión de recursos de index.html, app.js y sw.js.

```sh
python -m http.server 4173 --directory dist
node --check dist/app.js
node --check dist/sw.js
node --test tests/*.test.mjs
```

Las pruebas verifican la conservación de progreso y notas al actualizar el catálogo, la compatibilidad de las copias, los estados, el orden por alta y la búsqueda de juegos con caché de una hora, selección de ediciones y recuperación tras errores. La aplicación usa rutas relativas para funcionar bajo `/FRIKIRIAM/` y requiere HTTPS para la instalación y el service worker.

El paisaje y los iconos se incluyen en el repositorio. DM Sans se carga desde Google Fonts, con alternativas locales. Las portadas conservan los derechos de sus titulares.
