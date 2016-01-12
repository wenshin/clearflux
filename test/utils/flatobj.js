import {assert} from 'chai';
import {
  iterateObj, flatObj,
  patchFlatedObj, putFlatedObj, putEntireFlatedObj
} from '../../lib/utils/flatobj';

describe('iterateObj', function () {
  it('should raise TypeError when iterObj parameter is not plain object!', function () {
    assert.throws(() => iterateObj({}, 1), TypeError);
  });
});

describe('faltmap.flatObj', function () {
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

describe('faltmap.patchFlatedObj', function () {
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

describe('faltmap.putFlatedObj', function () {
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

describe('faltmap.putEntireFlatedObj', function () {
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
