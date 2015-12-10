import {assert} from 'chai';
import {flatObj, patchFlatedObj, putFlatedObj} from '../lib/util';

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
    let triggeredChangeHandler = false;
    let flated = flatObj({a: 1, b: {c: 2}});
    patchFlatedObj(flated, {a: 10, b: {d: 1}}, (query) => {
      triggerTypes.push(query);
      triggeredChangeHandler = true;
    });
    assert.ok(triggeredChangeHandler);
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
    let triggeredChangeHandler = false;
    let flated = flatObj({a: 1, b: {c: 2}});
    putFlatedObj(flated, 'b.c', [1, 2], (query) => {
      triggerTypes.push(query);
      triggeredChangeHandler = true;
    });
    assert.ok(triggeredChangeHandler);
    assert.sameMembers(['b', 'b.c'], triggerTypes);
    assert.deepEqual(flated, {a: 1, b: {c: [1, 2]}, 'b.c': [1, 2]});
  });

  it('should update object entirely and trigger change events ', function () {
    let triggerTypes = [];
    let triggeredChangeHandler = false;
    let flated = flatObj({a: 1, b: {c: 2}});
    putFlatedObj(flated, 'b', {d: 1}, (query) => {
      triggerTypes.push(query);
      triggeredChangeHandler = true;
    });
    assert.ok(triggeredChangeHandler);
    assert.sameMembers(['b'], triggerTypes);
    assert.deepEqual(flated, {a: 1, b: {d: 1}, 'b.d': 1});
  });
});
