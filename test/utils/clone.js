import {assert} from 'chai';
import customizeClone from '../../lib/utils/clone';

describe('clone.customizeClone', function () {
  it('should clone first Level object', function () {
    let targets = [{a: 1}, [1, 2]];
    for (let target of targets) {
      let cloned = customizeClone(target, true);
      assert.notEqual(cloned, target);
      assert.deepEqual(cloned, target);
    }
  });

  it('should deep clone props of plain object and array', function () {
    let cloned;
    let target;
    function Abc() {}

    let targets = [{a: {b: 1}}, [{a: 1}], {a: new Abc()}];
    for (target of targets) {
      cloned = customizeClone(target, true);
      assert.notEqual(cloned, target);
      assert.deepEqual(cloned, target);
    }

    target = {a: new Abc(), b: {c: 1}};
    cloned = customizeClone(target, true);
    assert.notEqual(cloned, target);
    assert.equal(cloned.a, target.a);
    assert.notEqual(cloned.b, target.b);
    assert.deepEqual(cloned, target);

    target = [new Abc(), {a: 1}];
    cloned = customizeClone(target, true);
    assert.notEqual(cloned, target);
    assert.equal(cloned[0], target[0]);
    assert.notEqual(cloned[1], target[1]);
    assert.deepEqual(cloned, target);
  });
});
