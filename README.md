# FRIKIRIAM

Aplicación web personal, en español, con estética japonesa. Cada navegador conserva su propio cuaderno; no requiere cuenta ni servidor de datos.

## Funcionalidad

- Perfil con nombre, nombre opcional en katakana y grados de 6º Kyu a 10º Dan.
- Técnicas de aikido: Aprendiendo / Dominada, ataque o variante, y bloc de notas.
- Lecturas: Cómics, Mangas, Libros y Novelas gráficas. Portadas, autor, precio de referencia cuando existe, estados, notas y valoración de 1 a 5 estrellas.
- Sesiones de lectura con pantalla de concentración, pausa, reanudación, página actual, histórico y tiempo acumulado. Una sesión activa sobrevive a una recarga o al cierre del navegador; hay que pausarla para detener el reloj.
- Animes, series y películas: episodios agrupados por temporada, visto / pendiente, estrellas y comentarios por capítulo. Importación y actualización de TVmaze, conservando el progreso. Añadido manual de temporadas y capítulos.
- Juegos de mesa: pendiente / jugado, búsqueda de imagen en Wikipedia, notas y estrellas.
- Exportación e importación JSON con validación y confirmación antes de sustituir datos.
- Aplicación instalable, diseño móvil y caché del cuaderno para uso sin conexión tras la primera visita.

## Abrir e instalar

Publicación de GitHub Pages: https://robertocuju-blip.github.io/FRIKIRIAM/

En iPhone: abrir en **Safari → Compartir → Añadir a pantalla de inicio → Añadir**. La verificación de interfaz se realiza en navegador de escritorio y viewport móvil; probar también la instalación en un iPhone físico.

Cada instalación/navegador y cada origen web tienen su propio almacenamiento. La versión de Sites y la versión de GitHub Pages no comparten datos. Para cambiar de dirección o de dispositivo, exportar desde **Mi perfil** y restaurar en la nueva ubicación.

## Datos y copias

Todo el cuaderno se guarda en `localStorage`, bajo `frikiriam.v1`. No hay autenticación ni sincronización entre dispositivos. **Borrar los datos del navegador elimina el cuaderno**; en modo privado la persistencia puede ser temporal. Hacer copias de seguridad con frecuencia. Las copias incluyen el perfil, técnicas, lecturas, sesiones, series, capítulos y juegos. El archivo de copia contiene datos personales: guardarlo de forma privada y no subirlo al repositorio.

La aplicación vacía es la misma para todo el mundo; compartir el enlace no comparte el cuaderno. Los títulos que se buscan se envían al catálogo correspondiente. Las portadas y fuentes tipográficas externas requieren conexión y envían las solicitudes normales de un navegador a sus proveedores.

## Catálogos y atribución

- [Google Books](https://developers.google.com/books/docs/v1/reference/volumes): búsqueda bibliográfica y precios opcionales. Un precio no es una oferta garantizada ni necesariamente corresponde a una edición física o al mercado del lector.
- [Open Library](https://openlibrary.org/dev/docs/api/search): búsqueda alternativa y [portadas](https://openlibrary.org/dev/docs/api/covers). No ofrece precios de venta.
- [TVmaze](https://www.tvmaze.com/api): portadas, temporadas, episodios y estado de emisión. Datos sujetos a [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/); la interfaz enlaza a la fuente de cada serie importada. No se redistribuye un catálogo precargado. Las películas pueden importar título e imagen desde Wikipedia. Tienen una pestaña propia y solo dos estados: Pendiente y Vista, sin temporadas ni capítulos. Los registros antiguos permanecen en la misma colección de datos y conservan sus apuntes originales, accesibles desde Detalles.

Los catálogos pueden fallar por conectividad, límites o cobertura. La aplicación mantiene el alta manual. El estado de emisión se refiere a la última consulta; **Actualizar catálogo** refresca la información. No se ejecutan consultas periódicas con la app cerrada. Las temporadas de TVmaze pueden diferir de la organización de una plataforma de streaming.

## Desarrollo y publicación

Sin dependencias de ejecución ni paso de compilación. El directorio `dist/` contiene la aplicación completa.

```sh
python -m http.server 4173 --directory dist
node --check dist/app.js
node --check dist/sw.js
```

La ruta relativa del manifiesto y del service worker permite alojarla bajo `/FRIKIRIAM/`. GitHub Pages se configura para desplegar `docs/` desde `main`; `docs/` es una copia exacta de `dist/`. Al editar, actualizar ambos directorios. El archivo `.nojekyll` evita procesado Jekyll. Para un despliegue en otro proveedor estático, publicar `dist/` por HTTPS.

El dibujo de paisaje y los iconos se incluyen en el código fuente. Las fuentes DM Sans y Noto Serif JP se cargan desde Google Fonts con alternativas locales. Las portadas conservan los derechos de sus respectivos titulares. La búsqueda de imágenes de películas y juegos usa Wikipedia en español e inglés; se muestra la fuente de la imagen elegida, que puede ser un cartel, una caja o una imagen relacionada con el título. Hay que revisar la miniatura antes de seleccionarla.

## Mejoras de interfaz

La cabecera muestra el logo y el nombre de FRIKIRIAM a la izquierda y el nombre en katakana (o el nombre de perfil si falta) con su grado a la derecha. Los valores de grado guardados y las copias anteriores siguen siendo compatibles. Las expresiones japonesas de la interfaz tienen significado y muestran su traducción al pasar el cursor.

En pantallas móviles o con puntero táctil, los campos usan al menos 16 px para evitar el zoom de enfoque de Safari. `touch-action: manipulation` elimina el zoom accidental por doble toque y conserva el gesto de pellizcar. No se limita la escala máxima del viewport. La comprobación en iPhone físico sigue siendo necesaria.

La búsqueda de portadas está disponible tanto al añadir como al editar lecturas, animes, series, películas y juegos. Al editar, seleccionar un resultado cambia solo la portada y su fuente; conserva título, notas, valoración, catálogo de episodios y progreso. El paisaje del inicio ocupa un único fondo continuo para evitar una unión vertical en móvil.

## Catálogo conjunto, filtros y katakana

En Animes y series, **Actualizar todo el catálogo** actualiza episodios y estado de emisión de todos los títulos vinculados a TVmaze, sean finalizados o en emisión. Muestra progreso y resultados por título, permite detenerse tras el título en curso y continúa si un título falla. Se espacian las consultas y se reintenta un error 429. Hay que mantener abierta la aplicación durante el proceso. No se cambian portadas elegidas, títulos personales, valoraciones ni comentarios; los capítulos manuales también se conservan.

Para incluir un título añadido a mano: abrir Detalles, buscarlo, marcar **Vincular también el catálogo de episodios**, elegir el resultado correcto y guardar. Es una vinculación explícita; las actualizaciones posteriores se hacen con el botón conjunto. La búsqueda de portada por defecto continúa cambiando solo la imagen.

Los filtros de series son Pendiente, Viendo y Visto, combinables con Anime o Serie. Las películas se muestran por separado con Pendiente o Vista. Se conserva el formato de las copias anteriores y los identificadores de registros.

El campo katakana tiene `lang=ja`, admite el método de entrada del dispositivo y despliega un teclado japonés propio al enfocarlo. Las teclas insertan en la selección actual; incluye espacio, retroceso y conversión de hiragana. La web no puede cambiar forzosamente el idioma del teclado del sistema: en iPhone se puede cambiar con la tecla del globo si está instalado.

Verificación de lógica de catálogo y conservación de datos:

```sh
node --test tests/media.test.mjs
```
