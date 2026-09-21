# Arquitectura actual y ruta de crecimiento

## Mapa del proyecto

| Ruta | Responsabilidad actual |
| --- | --- |
| `index.html` | Estructura de la interfaz y contenedor del canvas. |
| `netlify.toml` | Build y directorio de publicación para despliegues en Netlify. |
| `src/style.css` | Apariencia de la interfaz y diseño adaptable. |
| `src/main.js` | Inicialización de Three.js, composición de sistemas y ciclo de renderizado. |
| `src/world/index.js` | Crea el mundo y reúne altura de terreno, Tierra y colisionadores de los módulos. |
| `src/world/terrain.js` | Altura del terreno, cráteres, suelo, rocas y relieve lejano. |
| `src/world/terrain-content.js` | Tamaño y límites del mundo; configuración y validación de cráteres y montañas. |
| `src/world/sky.js` | Estrellas y Tierra. |
| `src/world/base.js` | Hábitats, antenas, tuberías, rover y equipo de la base. |
| `src/world/rover-controller.js` | Conducción autónoma del rover, destinos aleatorios, pendiente, ruedas y colisión dinámica. |
| `src/world/content.js` | Datos de posición, tamaño, material, id y solidez de las instalaciones. También valida su formato. |
| `src/world/geometry.js` | Utilidades para crear mallas geométricas compartidas. |
| `src/world/materials.js` | Paleta de materiales compartidos. |
| `src/player/astronaut.js` | Crea el astronauta de respaldo y carga el modelo detallado. |
| `src/player/model.js` | Carga del GLB, materiales y adaptación del modelo al rig animado. |
| `src/player/input.js` | Lectura de movimiento, carrera y solicitud de salto; limpia teclas al perder el foco. |
| `src/player/movement-config.js` | Valores compartidos de velocidad, aceleración, frenado, giro, salto y gravedad. |
| `src/player/controller.js` | Movimiento relativo a la cámara, salto, colisiones y orientación. |
| `src/player/animation.js` | Pose de caminar, correr, estar en el aire y aterrizar. |
| `src/player/footstep-sound.js` | Síntesis y cadencia de pisadas a partir del desplazamiento real del astronauta. |
| `src/camera/controller.js` | Cámara, OrbitControls, vistas predefinidas, seguimiento del jugador y actualización de proporción. |
| `src/ui/interface.js` | Botones, atajos de vistas, panel inicial, avisos y presentación del estado del sonido. |
| `src/ui/ambient-sound.js` | Creación y activación del ambiente sonoro con Web Audio. |
| `src/ui/astronaut-identity.js` | Registro del nombre, color aleatorio y proyección de la etiqueta sobre el astronauta. |
| `src/collision.js` | Colisionadores 2D con altura, resolución horizontal, cálculo del suelo e índice espacial por celdas. No depende del navegador. |
| `scripts/profile-collisions.js` | Mide candidatos del índice espacial sobre el contenido real de la escena. |
| `public/models/astronaut-emu.glb` | Modelo visual del traje EVA. |
| `public/draco/` | Decodificador necesario para el GLB comprimido. |
| `tests/collision.test.js` | Pruebas de las reglas de colisión. |
| `tests/player.test.js` | Pruebas del teclado, carrera, salto y movimiento frente a sólidos. |
| `tests/ui.test.js` | Pruebas de nombres de vista y coordinación entre interfaz, cámara y sonido. |
| `tests/content.test.js` | Validación de contenido, ids únicos y cobertura de colisiones para objetos sólidos. |
| `tests/terrain.test.js` | Validación de cráteres y comprobación de fondo, borde y altura finita. |
| `tests/rover.test.js` | Pruebas de desplazamiento, ruedas, obstáculos, astronauta e índice dinámico del rover. |

El punto de entrada es `src/main.js`, cargado desde `index.html`. Vite sirve la aplicación y genera la versión de producción.

## Flujo de una escena

1. `main.js` crea escena, cámara, renderizador y luces. Después llama a `createMaterials` y `createWorld`.
2. `createWorld` usa `heightAt(x, z)` para colocar suelo y construcciones. La altura combina relieve fino, `CRATER_CONTENT`, `MOUNTAIN_CONTENT` y elevación en el borde exterior. También entrega `WORLD_BOUNDS` al jugador. Comparte una secuencia de números aleatorios entre terreno y cielo para mantener la distribución actual.
3. `createBase` valida `BASE_CONTENT` y recorre sus secciones para construir cada instalación. Registra los objetos y colisionadores por id. `createTerrain` y `createBase` devuelven sus colisionadores; `createWorld` los reúne en `solidColliders` y crea `collisionIndex`.
4. `createAstronaut` crea un personaje sencillo que sirve mientras carga el GLB. `loadRealisticAstronaut` lo sustituye visualmente y proporciona un rig con los mismos puntos de animación.
5. `createPlayerInput` escucha el teclado y entrega una muestra `{x, z, run, jump}` por cuadro. La solicitud de salto se consume una vez por pulsación. El controlador entrega a `footstepSound` la distancia recorrida, velocidad, carrera y contacto con el suelo.
6. `createCameraController` administra OrbitControls y las vistas `explore`, `overview` y `rover`. `createUserInterface` conecta botones y teclas 1–3 con ese controlador y administra avisos y sonido. `createAstronautIdentity` presenta el registro inicial y proyecta en cada cuadro la posición 3D del jugador a coordenadas de pantalla.
7. En cada cuadro, `main.js` llama primero a `world.update(dt, astronaut.position)`, que conduce el rover y actualiza su colisionador, y después a `player.update(dt)`. El controlador mueve al astronauta y devuelve `{dx, dz, active, grounded}`; la cámara sigue al jugador o al rover según la vista activa, actualiza OrbitControls y `main.js` renderiza.

Las coordenadas usan **Y hacia arriba**; X y Z forman el plano del suelo. Las dimensiones de los colisionadores y las posiciones están en unidades de escena. El terreno no usa física de malla: el suelo se consulta mediante `heightAt` y `floorHeight`.

## Contratos que conviene mantener

- Todo objeto que deba bloquear al astronauta debe incluir un `boxCollider` o `circleCollider` con `minY` y `maxY` correctos en la lista que devuelve su módulo del mundo. Dibujar una malla por sí solo no crea colisión.
- Cada entrada de `BASE_CONTENT` necesita un `id` único y debe declarar `solid`. Durante la creación, una entrada con `solid: true` debe producir al menos un colisionador o se lanza un error.
- `createBase` devuelve `objectsById` y `collidersById`. Estos mapas permiten localizar una instalación y auditar sus colisiones sin recorrer toda la escena.
- El movimiento utiliza `moveWithCollisions`; `floorHeight` permite subir escalones de hasta `STEP_HEIGHT`. Ambas funciones aceptan un arreglo o un índice espacial. `PLAYER_RADIUS` y `PLAYER_HEIGHT` definen el volumen del personaje.
- `PLAYER_MOVEMENT` centraliza los parámetros físicos del astronauta. El controlador y la animación consumen la misma velocidad de marcha y carrera para mantener sincronizada la pose con el desplazamiento.
- Las pisadas se calculan con distancia horizontal resuelta después de las colisiones. `footstepSound.update` no debe recibir la intención de movimiento porque produciría sonido cuando una pared bloquea al jugador o mientras está en el aire.
- La animación espera `astronaut.userData.rig` con `torso`, `head`, `arms`, `elbows`, `legs`, `knees` y `feet`. Si se cambia el modelo, debe conservarse ese contrato o actualizarse la animación.
- `createPlayerController` usa `world.collisionIndex` y conserva `world.solidColliders` como respaldo. También recibe `world.heightAt`, una cámara y una entrada con método `sample()`. No accede al DOM ni al renderizador.
- `createCollisionIndex` divide el plano X/Z en celdas de 8 unidades. Conserva el orden de inserción para producir la misma resolución que un arreglo, permite altas y bajas y expone mediciones en `stats`.
- El rover retira temporalmente su propio colisionador del índice al calcular cada avance, comprueba los demás sólidos y vuelve a insertarlo con su posición, giro y altura actuales. También trata la posición del astronauta como un obstáculo móvil.
- Los nombres admitidos por la cámara están definidos en `CAMERA_VIEW_NAMES`. La interfaz valida cada nombre antes de solicitar el cambio de vista. `cameraController.track` mantiene la vista del rover ligada a su posición actual.
- El controlador de cámara no modifica la interfaz. La interfaz recibe el controlador como dependencia y decide qué botón, panel y aviso mostrar.
- El nombre se limita a 18 caracteres, se normalizan los espacios y se representa como una etiqueta HTML. La etiqueta se oculta cuando su punto 3D queda fuera de la cámara. Las teclas pulsadas dentro de campos editables no llegan al movimiento del jugador.
- El modelo GLB se carga de forma asíncrona. Si falla la carga, el personaje sencillo debe seguir visible y controlable.
- La semilla fija de `rand()` en `src/world/index.js` hace reproducible la distribución inicial de rocas y estrellas. Una función nueva que consuma números aleatorios antes de esas creaciones puede cambiar la escena.
- Los cráteres forman parte de `heightAt`: la malla visible, el movimiento del astronauta y la colocación de objetos consultan la misma superficie. `craterProfile` devuelve altura y tono para evitar una geometría visual desconectada de la navegación.
- Las montañas también forman parte de `heightAt`. `mountainProfile` produce cimas, laderas y variación radial; el límite jugable se mantiene dentro de la malla mediante `WORLD_BOUNDS`.

## Límites actuales

`main.js` conserva la configuración del renderizador, las luces y el ciclo principal. `src/world/base.js` concentra los constructores visuales de varias clases de instalación, que se podrán separar cuando aumente su complejidad. La escena construye todo el contenido al iniciar y no tiene carga por sectores ni guardado de estado. Tras ampliar el terreno, el perfil registra 205 colisionadores y mantiene un máximo de 2 candidatos en 5,325 muestras. El rig del traje se calcula a partir de su geometría y conviene revisarlo si se cambia el modelo.

## Ruta propuesta, por etapas

Las cinco etapas iniciales están implementadas. La carga por sectores queda condicionada a que crezcan el contenido, el tiempo de arranque o el uso de memoria.

1. **Separar la escena — realizado:** `heightAt`, terreno, cielo, base y utilidades geométricas están en `src/world/`. Terreno y base devuelven sus objetos y listas de colisionadores; `main.js` compone el mundo.
2. **Separar el jugador — realizado:** entrada, movimiento, pose y carga del astronauta están en `src/player/`. `createPlayerController(...).update(dt)` usa entrada y mundo inyectados, y se prueba sin renderizar.
3. **Separar cámara e interfaz — realizado:** los modos y OrbitControls están en `src/camera/`; los eventos del DOM, mensajes y sonido están en `src/ui/`.
4. **Definir contenido como datos — realizado:** posiciones, tamaños, materiales y solidez están en `src/world/content.js`. La configuración y la cobertura de colisiones se validan con pruebas y al crear la escena.
5. **Escalar rendimiento — realizado para el tamaño actual:** las colisiones usan celdas y existe un perfil reproducible. Las rocas ya usan `InstancedMesh`. La carga de zonas cercanas se pospone porque las mediciones actuales no muestran esa necesidad.

No hace falta aplicar todo a la vez. La mejor oportunidad es extraer un sistema cuando se vaya a ampliar o modificar.
