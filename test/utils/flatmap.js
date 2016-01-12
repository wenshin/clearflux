import {assert} from 'chai';
import FlatMap from '../../lib/utils/flatmap';

describe('faltmap.FlatMap', function () {
  let src = {a: 1, b: {c: {d: 1}, e: {g: 1}}};

  it('should get value deep cloned default, shallow clone with isDeepClone is false', function () {
    let flated = new FlatMap(src);
    let deepB = flated.get('b');
    let shallowB = flated.get('b', false);
    assert.notEqual(src.b, deepB);
    assert.deepEqual(src.b, deepB);
    assert.equal(src.b.c, shallowB.c);
    let deepBC = flated.get('b', new Set(['b.c']));
    // 浅拷贝指定的属性
    assert.equal(src.b.c, deepBC.c);
    // 深拷贝其他属性
    assert.notEqual(src.b.e, deepBC.e);
    assert.deepEqual(src.b.e, deepBC.e);
  });

  it('should FlatMap.getSrc() deep cloned default, shallow clone with shallowClonePropSet', function () {
    let flated = new FlatMap(src);
    let deepSrc = flated.getSrc();
    let shallowB = flated.get('b', false);
    let shallowSrc = flated.getSrc(false);
    assert.notEqual(deepSrc.b.c, shallowB.c);
    assert.deepEqual(deepSrc.b, shallowB);
    assert.equal(shallowSrc.b.c, shallowB.c);

    let deepBC = flated.get('b', new Set(['b.c']));
    // 浅拷贝指定的属性
    assert.equal(shallowSrc.b.c, deepBC.c);
    assert.notEqual(shallowSrc.b.e, deepBC.e);
    assert.deepEqual(shallowSrc.b.e, deepBC.e);
  });

  it('should change FlatMap.getSrc() value when patch or put', function () {
    let triggered = [];
    let shallowSet = new Set('b');
    let flated = new FlatMap({a: 1, b: {c: 2}});
    flated.patch({b: {d: 1}}, (query, value) => {
      triggered.push([query, value]);
    });
    assert.ok(triggered.length);
    assert.deepEqual([['b.d', 1], ['b', {c: 2, d: 1}]], triggered);
    assert.deepEqual(flated.getSrc(shallowSet).b, flated.get('b', shallowSet));
    assert.deepEqual(flated.getSrc().b, flated.get('b', shallowSet));

    triggered = [];
    flated.put('b', {e: 1}, (query, value) => {
      triggered.push([query, value]);
    });
    assert.ok(triggered.length);
    assert.deepEqual([
      ['b', {e: 1}],
      ['b.c', undefined],
      ['b.d', undefined],
      ['b.e', 1]], triggered);
    assert.deepEqual(flated.getSrc(shallowSet).b, flated.get('b', shallowSet));
  });

  it('should change all when put entirely', function () {
    let triggered = [];
    let flated = new FlatMap({a: 1, b: {c: 2}});
    let cover = {a: 1, b: {e: 1}};
    flated.put('', cover, (query, value) => {
      triggered.push([query, value]);
    });
    assert.ok(triggered.length);
    assert.deepEqual([
      ['', cover],
      ['b.c', undefined],
      ['b.e', 1],
      ['b', cover.b]], triggered);
    assert.deepEqual(flated.getSrc(null, false), flated.get('', null, false));
  });
});
