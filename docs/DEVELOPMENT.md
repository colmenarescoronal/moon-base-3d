# Guía para seguir desarrollando Moon Base

## Preparar y comprobar

Se necesita Node.js y npm instalados. Desde la carpeta del proyecto:

```powershell
npm install
npm run dev
```

Abrir `http://127.0.0.1:5173/`. Para verificar los cambios:

```powershell
npm test
npm run build
npm run profile:collisions
```

`npm test` comprueba colisiones y reglas del jugador. `npm run build` verifica que la aplicación pueda empaquetarse. `npm run profile:collisions` mide cuántos sólidos candidatos examina el índice espacial en el área jugable. Después de cambiar animación, cámara, materiales o interfaz, comprobar también el resultado en el navegador: las pruebas no cubren esos aspectos visuales.

## Publicar en Netlify

Hay dos formas admitidas:

1. **Despliegue manual:** ejecutar `npm run build` y arrastrar la carpeta `dist` completa a Netlify Drop. Vite copia allí los recursos de `public`, incluidos `models/astronaut-emu.glb` y el decodificador de `draco`.
2. **Repositorio conectado:** subir el código fuente, `package.json`, `package-lock.json`, `public`, `src`, `index.html` y `netlify.toml`. No incluir `node_modules` ni `dist`, que ya están ignorados. Netlify instalará las dependencias, ejecutará `npm run build` con Node.js 22 y publicará `dist`.

Después del despliegue, abrir la URL pública y comprobar el modelo del astronauta, el formulario de nombre, el movimiento y la consola del navegador. Un modelo ausente suele indicar que no se subió la carpeta `dist/models` en un despliegue manual.

## Añadir un objeto a la Luna

1. Para añadir otra instancia de un tipo existente, agregar una entrada en la sección adecuada de `src/world/content.js`: `habitats`, `dishes`, `hoses`, `supplyCrates`, `rovers`, `beacons` o `surfaceMarkers`.
2. Asignar un `id` único, coordenadas y `solid: true` o `false`. Las antenas y hábitats aceptan `scale`; el rover y los marcadores aceptan `rotation`; las cajas aceptan los materiales `metal` o `gold`.
3. Para crear un tipo nuevo, implementar su constructor en `src/world/base.js` con las utilidades de `src/world/geometry.js` (`box`, `sphere`, `cyl`, `rod`, `lineTube`). Colocarlo respecto a `heightAt(x, z)`.
4. Registrar el resultado mediante `register(definition, object, colliders)`. Si la definición es sólida y la lista está vacía, la creación fallará. Un `boxCollider` recibe centro X/Z, semiancho X/Z, altura mínima/máxima y rotación opcional; un `circleCollider`, centro, radio y alturas.
5. Verificar al caminar, correr y saltar: aproximación frontal, lateral, bordes y aterrizaje encima si corresponde. Ampliar `tests/content.test.js` para el nuevo tipo y `tests/collision.test.js` cuando cambie una regla física.
6. Registrar el cambio en `CHANGELOG.md` y actualizar la documentación afectada.

Los colisionadores son aproximaciones del volumen visible. Para una forma compleja, usar varios colisionadores simples.

`validateBaseContent` detecta secciones ausentes, ids repetidos, coordenadas no finitas, escalas o radios inválidos, materiales desconocidos y entradas sin declaración de solidez. `createBase` devuelve `objectsById` y `collidersById` para localizar objetos durante futuras interacciones o herramientas de depuración.

## Añadir o modificar cráteres

Los cráteres se definen en `src/world/terrain-content.js`. Cada entrada necesita:

- `id`: identificador único.
- `x`, `z`: centro sobre el terreno.
- `radius`: radio aproximado; el contorno añade variación angular.
- `depth`: profundidad del fondo.
- `rimHeight`: altura del borde levantado.
- `phase`: cambia el patrón de irregularidad para evitar círculos idénticos.

`src/world/terrain.js` aplica el perfil a `heightAt` y usa el mismo cálculo para oscurecer el fondo y aclarar el borde. No se necesita un colisionador independiente: el jugador consulta la altura del terreno. Evitar colocar un cráter profundo debajo de una instalación, salvo que esa ubicación sea intencional. Después de modificar la lista, ejecutar `npm test` y revisar las vistas de exploración y general.

## Ampliar el terreno y las montañas

`TERRAIN_SIZE` define el tamaño de la malla y `WORLD_BOUNDS` define hasta dónde puede caminar el jugador. Ambos están en `src/world/terrain-content.js`. Los límites deben permanecer dentro de la mitad de `TERRAIN_SIZE` para evitar que el astronauta alcance el borde sin geometría.

Las montañas se definen en `MOUNTAIN_CONTENT` con `x`, `z`, `radiusX`, `radiusZ`, `height` y `phase`. Son parte de `heightAt`, por lo que se pueden recorrer sin colisionadores adicionales. Las siluetas creadas por `makeRidge` sirven únicamente como horizonte y deben permanecer fuera de `WORLD_BOUNDS`.

Al ampliar el mapa, mantener una densidad razonable de rocas, comprobar el costo de la geometría y ejecutar `npm run profile:collisions`. También se debe añadir o actualizar una prueba que confirme que los nuevos límites están dentro de la malla.

## Medir y ampliar las colisiones

`createWorld` conserva `solidColliders` y construye `collisionIndex`. El jugador utiliza el índice; `moveWithCollisions` y `floorHeight` siguen aceptando arreglos para pruebas o sistemas pequeños.

Cuando se añada o retire un sólido durante la partida, llamar a `world.collisionIndex.add(collider)` o `world.collisionIndex.remove(collider)`. Si se modifica la posición o el tamaño de un colisionador existente, retirarlo, cambiarlo y añadirlo otra vez para actualizar sus celdas.

Ejecutar `npm run profile:collisions` después de ampliar el mapa. Registrar el total, promedio y máximo en el historial cuando cambien de forma relevante. Considerar carga por sectores si el arranque o la memoria se vuelven problemáticos; el número actual de candidatos de colisión ya es bajo.

## Ajustar el rover autónomo

`src/world/rover-controller.js` contiene la velocidad máxima, aceleración, giro, radio físico, pendiente permitida y distancia de llegada. El controlador escoge puntos aleatorios dentro de `WORLD_BOUNDS`, reduce la velocidad al girar o acercarse al destino y busca otro punto si permanece bloqueado.

El rover usa una huella circular conservadora para desplazarse entre los colisionadores estáticos. En cada cuadro retira su caja del índice espacial, resuelve el movimiento y vuelve a insertarla en la posición actual. No debe omitirse este paso: el astronauta consulta el mismo índice. `world.update(dt, astronaut.position)` también evita que el vehículo avance sobre el jugador.

Las ruedas están disponibles en `rover.userData.wheels` y giran según la distancia recorrida. La inclinación del cuerpo se calcula con muestras de `heightAt` delante, detrás y a ambos lados. Después de ajustar el comportamiento, ejecutar `tests/rover.test.js` mediante `npm test` y comprobar en el navegador la vista **3 / Rover**, pendientes, obstáculos y encuentros con el astronauta.

## Cambiar el astronauta

`src/player/astronaut.js` crea la figura de respaldo y solicita el modelo detallado. `src/player/model.js` carga `public/models/astronaut-emu.glb` con Draco. El modelo original no incluye un esqueleto útil para esta animación: el archivo crea huesos y asigna pesos según la posición de los vértices. La pose de caminar, correr y saltar está en `src/player/animation.js`.

Para cambiar los controles, editar `src/player/input.js`. Su método `sample()` entrega los ejes X/Z, carrera y una solicitud de salto consumible. Los parámetros de movimiento están centralizados en `src/player/movement-config.js`: la marcha usa 5.2 unidades por segundo y la carrera con `Shift` usa 9. El mismo archivo contiene aceleración, frenado, giro, salto y gravedad. Los límites del terreno y la aplicación de esas reglas permanecen en `src/player/controller.js`.

Después de cambiar estos valores, ampliar `tests/player.test.js` y probar en el navegador que la animación cambia de marcha a carrera, la cámara sigue al personaje y los sólidos continúan bloqueándolo a máxima velocidad.

Las pisadas se sintetizan en `src/player/footstep-sound.js`. `WALK_STEP_DISTANCE` y `RUN_STEP_DISTANCE` controlan la cadencia por distancia; los filtros, envolventes y ganancias definen la textura del regolito. El contexto de audio se desbloquea con la primera pulsación de teclado o puntero. Al ajustar el sonido, comprobar marcha, carrera, salto, bloqueo contra una pared y volumen junto al ambiente.

## Añadir una vista o cambiar la interfaz

Las posiciones y objetivos de cámara están en `src/camera/controller.js`. Para añadir una vista, incorporarla a `viewDefinitions`; su nombre pasará a `CAMERA_VIEW_NAMES`. Después, añadir el botón correspondiente con `data-view` en `index.html` y su mensaje en `src/ui/interface.js`.

`src/ui/interface.js` concentra las interacciones del DOM: botones, teclas 1–3, panel inicial y avisos. `src/ui/ambient-sound.js` contiene Web Audio. Mantener estos módulos separados del renderizador y de la geometría permite probar las decisiones de interfaz con dependencias simuladas en `tests/ui.test.js`.

El ambiente combina ruido marrón filtrado, una vibración grave y un zumbido de sistemas. Las ganancias de cada capa y el volumen maestro están en `src/ui/ambient-sound.js`. Tras modificarlos, comprobar con altavoces y audífonos que el sonido sea perceptible sin saturar y que el encendido y apagado conserven su transición suave.

El registro inicial y la etiqueta del astronauta están en `src/ui/astronaut-identity.js`; su estructura HTML y apariencia están en `index.html` y `src/style.css`. `ASTRONAUT_COLORS` define la paleta disponible. La posición se actualiza proyectando un punto sobre el casco con la cámara activa, por lo que cualquier cambio de altura o escala del modelo debe comprobarse en las tres vistas. `src/player/input.js` ignora teclado procedente de `input`, `textarea`, `select` o contenido editable para permitir escribir sin mover al personaje.

Si se reemplaza el GLB, revisar escala, orientación, materiales, pesos de piel y posición de los huesos. Probar el personaje de frente, de espalda, caminando, corriendo y saltando. Mantener la figura de respaldo mientras se carga el recurso y registrar la procedencia del nuevo asset.

El traje actual procede de [NASA, Extravehicular Mobility Unit](https://science.nasa.gov/3d-resources/extravehicular-mobility-unit/), atribuido a Michael D. Carbajal.

## Convención de documentación para cada petición

- Registrar una entrada corta en `CHANGELOG.md` indicando **qué** se hizo y **por qué**.
- Ajustar `README.md` cuando cambie la experiencia o la forma de ejecutar el proyecto.
- Ajustar `docs/ARCHITECTURE.md` o esta guía cuando cambien responsabilidades, contratos o el proceso de desarrollo.
- Indicar en la entrega qué se probó y qué queda pendiente, si corresponde.

Esta convención también está en `AGENTS.md` para que se aplique en futuras sesiones de trabajo.
