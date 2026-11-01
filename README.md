# FRIKIRIAM

Aplicación web personal, en español, con estética japonesa. Cada navegador conserva su propio cuaderno; no requiere cuenta ni servidor de datos.

## Funcionalidad

- Perfil con nombre, nombre opcional en katakana y grados de 6º Kyu a 10º Dan.
- Técnicas de aikido: Aprendiendo / Dominada, ataque o variante, y bloc de notas.
- Lecturas: Cómics, Mangas, Libros y Novelas gráficas. Portadas, autor, precio de referencia cuando existe, estados, notas y valoración de 1 a 5 estrellas.
- Sesiones de lectura con pantalla de concentración, pausa, reanudación, página actual, histórico y tiempo acumulado. Una sesión activa sobrevive a una recarga o al cierre del navegador; hay que pausarla para detener el reloj.
- Animes, series y películas: episodios agrupados por temporada, visto / pendiente, estrellas y comentarios por capítulo. Importación y actualización de TVmaze, conservando el progreso. Añadido manual de temporadas y capítulos.
- Juegos de mesa: pendiente / jugado, portada opcional, notas y estrellas.
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
- [TVmaze](https://www.tvmaze.com/api): portadas, temporadas, episodios y estado de emisión. Datos sujetos a [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/); la interfaz enlaza a la fuente de cada serie importada. No se redistribuye un catálogo precargado. Las películas se registran manualmente.

Los catálogos pueden fallar por conectividad, límites o cobertura. La aplicación mantiene el alta manual. El estado de emisión se refiere a la última consulta; **Actualizar catálogo** refresca la información. No se ejecutan consultas periódicas con la app cerrada. Las temporadas de TVmaze pueden diferir de la organización de una plataforma de streaming.

## Desarrollo y publicación

Sin dependencias de ejecución ni paso de compilación. El directorio `dist/` contiene la aplicación completa.

```sh
python -m http.server 4173 --directory dist
node --check dist/app.js
node --check dist/sw.js
```

La ruta relativa del manifiesto y del service worker permite alojarla bajo `/FRIKIRIAM/`. GitHub Pages se configura para desplegar `docs/` desde `main`; `docs/` es una copia exacta de `dist/`. Al editar, actualizar ambos directorios. El archivo `.nojekyll` evita procesado Jekyll. Para un despliegue en otro proveedor estático, publicar `dist/` por HTTPS.

El dibujo de paisaje y los iconos se incluyen en el código fuente. Las fuentes DM Sans y Noto Serif JP se cargan desde Google Fonts con alternativas locales. Las portadas conservan los derechos de sus respectivos titulares.
