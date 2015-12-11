import {assert} from 'chai';
import {FlatMap, iterateObj, flatObj, patchFlatedObj, putFlatedObj} from '../lib/util';

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

describe('util.FlatMap', function () {
  it('should get value deep cloned default, shallow clone with isDeepClone is false', function () {
    let src = {a: 1, b: {c: {d: 1}}};
    let flated = new FlatMap(src);
    assert.notEqual(src.b, flated.get('b'));
    assert.deepEqual(src.b, flated.get('b'));
    assert.equal(src.b.c, flated.get('b', false).c);
  });

  it('should FlatMap.getSrc() deep cloned default, shallow clone with isDeepClone is false', function () {
    let src = {a: 1, b: {c: {d: 1}}};
    let flated = new FlatMap(src);
    let deepSrc = flated.getSrc();
    let shallowSrc = flated.getSrc(false);
    assert.notEqual(deepSrc.b.c, flated.get('b', false).c);
    assert.deepEqual(deepSrc.b, flated.get('b', false));
    assert.equal(shallowSrc.b.c, flated.get('b', false).c);
    assert.deepEqual(shallowSrc.b, flated.get('b', false));
  });

  it('should change FlatMap.getSrc() value when patch or put', function () {
    let triggered = [];
    let flated = new FlatMap({a: 1, b: {c: 2}});
    flated.patch({b: {d: 1}}, (query, value) => {
      triggered.push([query, value]);
    });
    assert.ok(triggered.length);
    assert.deepEqual([['b', {c: 2, d: 1}], ['b.d', 1]], triggered);
    assert.deepEqual(flated.getSrc(false).b, flated.get('b', false));
    assert.deepEqual(flated.getSrc().b, flated.get('b', false));

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
    assert.deepEqual(flated.getSrc(false).b, flated.get('b', false));
  });

});
