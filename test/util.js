import {assert} from 'chai';
import {
  FlatMap, iterateObj, flatObj,
  patchFlatedObj, putFlatedObj, putEntireFlatedObj
} from '../lib/util';

describe('util.iterateObj', function () {
  it('should raise TypeError when iterObj parameter is not plain object!', function () {
    assert.throws(() => iterateObj({}, 1), TypeError);
  });
});

describe('util.flatObj', function () {
  it('should return the value with no nested plain object!', function () {
    let srcs = [1, '2', 'b', true, false, null, undefined, 1.23];
    for ( let src of srcs ) {
      assert.deepEqual(flatObj(src), {});
    }
  });

  it('should not flat a object if not plain object!', function () {
    let src = {a: 1, b: {c: true, d: {b: [1, 2, 3], c: '1'}}};
    let expected = {
      a: 1, b: {c: true, d: {b: [1, 2, 3], c: '1'}},
      'b.c': true, 'b.d': {b: [1, 2, 3], c: '1'}, 'b.d.b': [1, 2, 3], 'b.d.c': '1'
    };
    assert.deepEqual(flatObj(src), expected);
  });

  it('should flat a object with prefix right', function () {
    let src = {a: 1, b: {c: '1', d: [1, 2, 3]}};
    let expected = {
      'a.b.a': 1,
      'a.b.b': {c: '1', d: [1, 2, 3]},
      'a.b.b.c': '1',
      'a.b.b.d': [1, 2, 3]
    };
    assert.deepEqual(flatObj(src, 'a.b'), expected);
  });
});

describe('util.patchFlatedObj', function () {
  it('should update data and trigger change events ', function () {
    let triggerTypes = [];
    let flated = flatObj({a: 1, b: {c: 2}});
    patchFlatedObj(flated, {a: 10, b: {d: 1}}, (query) => {
      triggerTypes.push(query);
    });
    assert.ok(triggerTypes.length);
    assert.sameMembers(['a', 'b', 'b.d'], triggerTypes);
    assert.deepEqual(flated, {a: 10, b: {c: 2, d: 1}, 'b.c': 2, 'b.d': 1});
  });

  it('should replace array but not merge', function () {
    let flated = flatObj({a: 1, b: {c: [1, 2, 3]}});
    patchFlatedObj(flated, {b: {d: 1, c: [1, 2]}}, (query) => {
      assert.include(['b', 'b.d', 'b.c'], query);
    });
    assert.deepEqual(flated, {a: 1, b: {c: [1, 2], d: 1}, 'b.c': [1, 2], 'b.d': 1});
  });
});

describe('util.putFlatedObj', function () {
  it('should update object entirely and trigger change events ', function () {
    let triggerTypes = [];
    let flated = flatObj({a: 1, b: {c: 2}});
    putFlatedObj(flated, 'b.c', [1, 2], (query) => {
      triggerTypes.push(query);
    });
    assert.ok(triggerTypes.length);
    assert.sameMembers(['b', 'b.c'], triggerTypes);
    assert.deepEqual(flated, {a: 1, b: {c: [1, 2]}, 'b.c': [1, 2]});
  });

  it('should update object entirely and trigger change events ', function () {
    let triggerTypes = [];
    let flated = flatObj({a: 1, b: {c: 2, e: {f: 1}}});
    putFlatedObj(flated, 'b', {d: 1, f: {e: 1}}, (query) => {
      triggerTypes.push(query);
    });
    assert.ok(triggerTypes.length);
    assert.sameMembers(['b', 'b.c', 'b.d', 'b.e', 'b.e.f', 'b.f', 'b.f.e'], triggerTypes);
    assert.deepEqual(flated, {a: 1, b: {d: 1, f: {e: 1}}, 'b.d': 1, 'b.f': {e: 1}, 'b.f.e': 1});
  });
});

describe('util.putEntireFlatedObj', function () {
  it('should update object entirely and trigger change events ', function () {
    let triggerTypes = [];
    let flated = flatObj({a: 1, b: {c: 2}});
    flated = putEntireFlatedObj(flated, {a: 1, c: {d: [1, 2, 3], e: 1}}, (query) => {
      triggerTypes.push(query);
    });
    assert.ok(triggerTypes.length);
    assert.sameMembers(['', 'b', 'b.c', 'c', 'c.d', 'c.e'], triggerTypes);
    assert.deepEqual(flated, {a: 1, c: {d: [1, 2, 3], e: 1}, 'c.d': [1, 2, 3], 'c.e': 1});
  });
});

describe('util.FlatMap', function () {
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
