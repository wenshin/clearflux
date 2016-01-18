import 'babel-polyfill';
import _isPlainObject from 'lodash.isplainobject';
import _isArray from 'lodash/lang/isArray';
import _clone from 'lodash/internal/baseClone';

export default function customizeClone(...args) {
  let customize = args[2];
  args[2] = (value, key, object) => {
    // 是子属性且不是纯粹 Object 或者通过实例化的，将不进行深度 Clone
    if (!isDeepCopyType(value)) return value;
    if (customize && customize instanceof Function) return customize(value, key, object);
    else return;
  };
  return _clone.apply(null, args);
}

export function isDeepCopyType(target) {
  return _isPlainObject(target) || _isArray(target);
}

export function customizeDeepClone(src, shallowClonePropSet, separator, prefix='') {
  shallowClonePropSet = shallowClonePropSet || new Set();
  // 有选择的深度拷贝
  if (shallowClonePropSet.size) {
    let queryMap = new Map();
    queryMap.set(src, prefix);
    return customizeClone(src, true, (value, key, object) => {
      let parentQuery = queryMap.get(object);
      let query = queryMap.get(value) || parentQuery + separator + key;
      if (_isPlainObject(value)) queryMap.set(value, query);
      if (shallowClonePropSet.has(query)) return value;
    });
  } else {
    return customizeClone(src, true);
  }
}
