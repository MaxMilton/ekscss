/* eslint-disable import/no-extraneous-dependencies */

import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { isObject } from '../src/helpers';

const isOldNode = +/^v(\d+)/.exec(process.version)[1] <= 8;

if (isOldNode) {
  // @ts-expect-error - stub for node v8 and bellow
  global.BigInt = function BigInt() {};
}

function Func() {}
class Cls {}

const objects = [
  [{}, '{}'],
  [{ a: 1, b: true }, '{ a: 1, b: true }'],
  [Object.create({}), 'Object.create({})'],
  [Object.create(Object.prototype), 'Object.create(Object.prototype)'],
  [Object.create(null), 'Object.create(null)'],
  [new Func(), 'new Func'],
  [new Func(), 'new Func()'],
  [new Cls(), 'new Cls'],
  [new Cls(), 'new Cls()'],
] as const;

const notObjects = [
  ['abc', "'abc'"],
  ['', "''"],
  [1, '1'],
  [0, '0'],
  [-1, '-1'],
  [Infinity, 'Infinity'],
  [-Infinity, '-Infinity'],
  [BigInt(Number.MAX_SAFE_INTEGER), 'BigInt(Number.MAX_SAFE_INTEGER)'],
  [true, 'true'],
  [false, 'false'],
  [[], '[]'],
  [['abc', 'def'], "['abc', 'def']"],
  [function named() {}, 'function named() {}'],
  // eslint-disable-next-line func-names
  [function () {}, 'function () {}'],
  [() => {}, '() => {}'],
  [async () => {}, 'async () => {}'],
  [/regex/, '/regex/'],
  [Object, 'Object'],
  [Symbol, 'Symbol'],
  [Symbol.toStringTag, 'Symbol.toStringTag'],
  [Symbol.prototype, 'Symbol.prototype'],
  [undefined, 'undefined'],
  [null, 'null'],
  // eslint-disable-next-line no-sparse-arrays
  [, '<no value>'],
  [global, 'global'],
] as const;

objects.forEach(([value, name]) => {
  test(`returns true for "${name}" object`, () => {
    assert.is(isObject(value), true);
  });
});

notObjects.forEach(([value, name]) => {
  test(`returns false for "${name}" non-object`, () => {
    assert.is(isObject(value), false);
  });
});

test.run();
