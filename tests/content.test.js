import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { BASE_CONTENT, validateBaseContent } from '../src/world/content.js';
import { createBase } from '../src/world/base.js';
import { createMaterials } from '../src/world/materials.js';

const cloneContent = () => structuredClone(BASE_CONTENT);

test('base content has valid unique ids, coordinates, and solidity declarations', () => {
  assert.equal(validateBaseContent(BASE_CONTENT), true);
  const ids = Object.values(BASE_CONTENT).flat().map(item => item.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('base content validation rejects duplicate ids and incomplete solid declarations', () => {
  const duplicate = cloneContent();
  duplicate.dishes[0].id = duplicate.habitats[0].id;
  assert.throws(() => validateBaseContent(duplicate), /duplicado/);

  const incomplete = cloneContent();
  delete incomplete.beacons[0].solid;
  assert.throws(() => validateBaseContent(incomplete), /solid/);
});

test('every configured object is created and every solid object produces colliders', () => {
  const base = createBase(new THREE.Scene(), () => 0, createMaterials());
  const definitions = Object.values(BASE_CONTENT).flat();
  assert.equal(base.objectsById.size, definitions.length);
  for (const definition of definitions) {
    assert.ok(base.objectsById.has(definition.id), `Falta el objeto ${definition.id}`);
    const colliders = base.collidersById.get(definition.id);
    assert.ok(Array.isArray(colliders), `Falta el registro de colisión de ${definition.id}`);
    if (definition.solid) assert.ok(colliders.length > 0, `${definition.id} debe generar colisionadores`);
  }
});
