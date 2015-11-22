import assert from 'assert';
import {flatObj} from '../lib/util';

describe('util.flatObj', function () {
  it('should return the value with no nested plain object!', function () {
    let srcs = [1, '2', 'b', true, false, null, undefined, 1.23];
    for ( let src of srcs ) {
      assert.deepEqual(flatObj(src), src);
    }
  });

  it('should flat a object with primary types!', function () {
    let src = {a: 1, b: {c: true, d: {b: 1, c: '1'}}};
    let expected = {
      a: 1, b: {c: true, d: {b: 1, c: '1'}},
      'b.c': true, 'b.d': {b: 1, c: '1'}, 'b.d.b': 1, 'b.d.c': '1'};
    assert.deepEqual(flatObj(src), expected);
  });
});
