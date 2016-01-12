import _isPlainObject from 'lodash.isplainobject';
import _isArray from 'lodash/lang/isArray';
import _clone from 'lodash/internal/baseClone';

export default function customizeClone() {
  let args = Array.from(arguments);
  let customize = arguments[2];
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
