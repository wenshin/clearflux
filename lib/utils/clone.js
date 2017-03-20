import _isPlainObject from 'lodash/isPlainObject';
import _isArray from 'lodash/isArray';
import _clone from 'lodash/_baseClone';

export default function customizeClone(src, isDeep, customize) {
  const customizeWrapped = (value, key, object) => {
    // 是子属性且不是纯粹 Object 或者通过实例化的，将不进行深度 Clone
    if (!isDeepCopyType(value)) return value;
    if (customize && customize instanceof Function) return customize(value, key, object);
  };
  // 这里不用 _clone(...args)，有点小坑，但是验证不是 babel 的问题，很奇怪
  return _clone(src, isDeep, customizeWrapped);
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
