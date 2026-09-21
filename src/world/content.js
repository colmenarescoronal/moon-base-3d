const supplyCrates = Array.from({ length: 12 }, (_, index) => ({
  id: `supply-${index + 1}`,
  x: -22 + index * 4.5,
  z: -8 - 1.7 * Math.sin(index * .8),
  material: index % 3 ? 'metal' : 'gold',
  solid: true,
}));

const surfaceMarkers = Array.from({ length: 14 }, (_, index) => ({
  id: `marker-${index + 1}`,
  x: -16 + index * 2.5,
  z: 12 + Math.sin(index * .45) * .6,
  rotation: -.28,
  solid: false,
}));

export const BASE_CONTENT = Object.freeze({
  habitats: [
    { id: 'habitat-west', x: -15, z: -21, scale: .82, solid: true },
    { id: 'habitat-main', x: -2, z: -24, scale: 1.05, solid: true },
    { id: 'habitat-east', x: 13, z: -21, scale: .9, solid: true },
  ],
  dishes: [
    { id: 'dish-west', x: -19, z: -16, scale: 1.12, solid: true },
    { id: 'dish-main', x: 2, z: -17, scale: .95, solid: true },
    { id: 'dish-east', x: 16, z: -15, scale: .83, solid: true },
  ],
  hoses: [
    { id: 'hose-west', radius: .17, solid: false, points: [[-15, -17], [-14, -13], [-10, -10, .37], [-4, -11], [-2, -19]] },
    { id: 'hose-main', radius: .17, solid: false, points: [[-2, -19], [0, -13], [5, -10, .3], [10, -12], [13, -17]] },
    { id: 'hose-east', radius: .22, solid: false, points: [[13, -17], [15, -12], [19, -7, .5], [24, -3], [28, 2]] },
  ],
  supplyCrates,
  rovers: [
    { id: 'rover-1', x: 11, z: 4, rotation: -.38, solid: true },
  ],
  beacons: [
    { id: 'beacon-west-far', x: -27, z: -8, solid: true },
    { id: 'beacon-west-near', x: -23, z: 1, solid: true },
    { id: 'beacon-east-far', x: 27, z: -12, solid: true },
    { id: 'beacon-east-near', x: 30, z: 8, solid: true },
  ],
  surfaceMarkers,
});

const finite = value => typeof value === 'number' && Number.isFinite(value);

export function validateBaseContent(content) {
  if (!content || typeof content !== 'object') throw new TypeError('La configuración de la base debe ser un objeto');
  const ids = new Set();
  const sections = ['habitats', 'dishes', 'hoses', 'supplyCrates', 'rovers', 'beacons', 'surfaceMarkers'];
  for (const section of sections) {
    if (!Array.isArray(content[section])) throw new TypeError(`La sección ${section} debe ser una lista`);
    for (const item of content[section]) {
      if (typeof item.id !== 'string' || !item.id.trim()) throw new TypeError(`Cada elemento de ${section} necesita un id`);
      if (ids.has(item.id)) throw new Error(`Id de contenido duplicado: ${item.id}`);
      ids.add(item.id);
      if (typeof item.solid !== 'boolean') throw new TypeError(`${item.id} debe declarar solid como true o false`);
      if (section === 'hoses') {
        if (!finite(item.radius) || item.radius <= 0) throw new RangeError(`${item.id} necesita un radio positivo`);
        if (!Array.isArray(item.points) || item.points.length < 2 ||
          item.points.some(point => !Array.isArray(point) || point.length < 2 || point.some(value => !finite(value)))) {
          throw new TypeError(`${item.id} necesita al menos dos puntos válidos`);
        }
      } else if (!finite(item.x) || !finite(item.z)) {
        throw new TypeError(`${item.id} necesita coordenadas x y z finitas`);
      }
      if ('scale' in item && (!finite(item.scale) || item.scale <= 0)) throw new RangeError(`${item.id} necesita una escala positiva`);
      if ('rotation' in item && !finite(item.rotation)) throw new TypeError(`${item.id} necesita una rotación finita`);
      if ('material' in item && !['metal', 'gold'].includes(item.material)) throw new Error(`Material desconocido en ${item.id}: ${item.material}`);
    }
  }
  return true;
}
