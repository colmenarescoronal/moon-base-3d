# Historial de cambios

Los cambios terminados se registran aquí para facilitar la evolución del proyecto. Las nuevas entradas van primero en `Sin publicar` hasta que se decida crear una versión.

## Sin publicar

### 2026-09-20

- Se añadió `netlify.toml` y se documentaron los despliegues manual y continuo en Netlify, incluyendo los recursos GLB y Draco que deben publicarse.
- Se añadió un registro al iniciar la misión que solicita el nombre del astronauta, normaliza espacios y limita la entrada a 18 caracteres.
- El nombre aparece en una etiqueta sobre el jugador, recibe un color aleatorio de alto contraste y sigue su posición en las distintas vistas de cámara.
- La entrada de movimiento ahora ignora las teclas escritas en campos editables. Se añadieron pruebas del formulario, color, proyección y bloqueo de controles durante la escritura.
- Se añadieron pisadas sintetizadas para el astronauta, con textura de regolito, golpe grave y variación alternada entre ambos pies.
- La cadencia usa la distancia real después de resolver colisiones: cambia al correr y se detiene durante saltos o cuando el personaje no avanza.
- Se añadieron pruebas del desbloqueo de Web Audio, la generación de cada pisada y la integración con el controlador del jugador.
- El rover ahora recorre destinos aleatorios del mapa con aceleración, giro gradual, frenado y límite de pendiente; sigue la altura e inclinación del terreno.
- Las cuatro ruedas giran según la distancia recorrida y la vista **Rover** sigue la posición móvil del vehículo.
- El colisionador del rover se actualiza en el índice espacial en cada cuadro; el vehículo evita instalaciones, límites del mundo y al astronauta. Se añadieron pruebas específicas para estos comportamientos.
- Se reforzó el sonido ambiental con ruido de ventilación, vibración grave y zumbido de sistemas; también se aumentó su volumen y se añadió un limitador para evitar picos molestos.
- Se aumentó la marcha de 4.1 a 5.2 unidades por segundo y la carrera con `Shift` de 7.2 a 9 para recorrer con más agilidad el mapa ampliado.
- Los parámetros físicos del astronauta se centralizaron en `src/player/movement-config.js`; el controlador y la animación ahora comparten las velocidades de marcha y carrera.
- Se amplió el mapa transitable de aproximadamente 90×76 a 224×212 unidades para permitir expediciones lejos de la base.
- Cinco formaciones montañosas visibles se convirtieron en terreno físico transitable; las siluetas decorativas se movieron fuera de los límites jugables.
- El terreno creció a 280×280 unidades y ahora distribuye 2,600 rocas mediante `InstancedMesh`. El perfil de colisiones ampliado registra 205 sólidos, 5,325 muestras y un máximo de 2 candidatos por consulta.
- Los límites de exploración se centralizaron en `WORLD_BOUNDS` y el controlador del jugador dejó de usar coordenadas fijas.
- Se amplió la superficie lunar con 12 cráteres configurables: dos dentro del área de exploración y diez alrededor del perímetro.
- Los cráteres tienen fondo hundido, paredes transitables, borde elevado irregular, dispersión exterior y variación de color en el regolito.
- Se añadieron validaciones y pruebas para las definiciones y el perfil físico de cada cráter.
- Se implementó la quinta etapa de arquitectura para colisiones: un índice espacial divide los sólidos en celdas y el jugador consulta solo candidatos cercanos.
- Se añadió `npm run profile:collisions` para medir el índice sobre el contenido real; con 133 colisionadores y 806 muestras registró 0.08 candidatos de media, 2 como máximo y una reducción del 99.9% frente al recorrido completo.
- El índice admite añadir y retirar colisionadores dinámicos y mantiene compatibilidad con arreglos simples.
- Se implementó la cuarta etapa de arquitectura: la distribución de hábitats, antenas, tuberías, cajas, rover, balizas y marcadores se centralizó en `src/world/content.js`.
- Se añadieron validaciones de ids, coordenadas, escalas, materiales y declaración de solidez; la creación falla si un objeto sólido no genera colisionadores.
- Se añadieron pruebas que comprueban la configuración y la cobertura de colisiones de cada objeto sólido.
- Se implementó la tercera etapa de arquitectura: modos, seguimiento y tamaño de cámara se movieron a `src/camera/`; botones, atajos, avisos y sonido se movieron a `src/ui/`.
- Se añadieron pruebas del contrato de vistas y de la coordinación entre interfaz, cámara y estado del sonido.
- Se implementó la segunda etapa de arquitectura: entrada, movimiento y animación del jugador se separaron en `src/player/`, dejando el ciclo principal centrado en componer y renderizar la escena.
- Se añadieron pruebas de teclado, carrera, bloqueo por sólidos y salto para proteger el comportamiento durante futuras ampliaciones.
- Se implementó la primera etapa de arquitectura: terreno, cielo, materiales, geometría y construcciones se extrajeron a `src/world/` para reducir las responsabilidades de `main.js`.
- `createWorld` reúne los colisionadores devueltos por terreno y base; esto permite ampliar cada zona sin registrar sólidos desde el ciclo principal.
- Se documentó la arquitectura actual, los pasos para ampliar la escena y una ruta de crecimiento gradual.
- Se añadió una instrucción de proyecto para registrar y documentar cada futura petición.

## Estado inicial documentado

- Escena lunar interactiva con terreno, hábitats, antenas, tuberías, rover y Tierra.
- Astronauta con traje EVA detallado, movimiento al caminar y correr, salto y colisiones con objetos sólidos.
