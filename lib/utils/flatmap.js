import {
  DEFAULT_SEPARATOR,
  customizeDeepClone,
  flatObj, iterateObj, putFlatedObj, putEntireFlatedObj, patchFlatedObj
} from './flatobj';

/**
 * 概念解释
 * Query: 'a'，'a.b', 'a.b.c' 等属性访问路径
 */

export default class FlatMap {
  constructor(obj, separator=DEFAULT_SEPARATOR, prefix='') {
    this._flated = flatObj(obj, prefix, separator);
    this._src = null;
    this.separator = separator;
    this.prefix = prefix;
  }

  /**
   * 获取 FlatMap 中的数据
   * @param  {String}  query               `'a.b'` 格式字符串
   * @param  {Object}  shallowClonePropSet 当`isDeepClone = true`时，指定哪些 query 浅拷贝
   *                                       这在一些比较大的数据深拷贝时有用
   * @param  {Boolean} isDeepClone         默认 true，如果为 false 将进行浅拷贝
   * @return {All}
   */
  get(query, shallowClonePropSet, isDeepClone=true) {
    if (shallowClonePropSet === false) isDeepClone = false;
    if (query && typeof query === 'string') {
      return isDeepClone
        ? customizeDeepClone(this._flated[query], shallowClonePropSet, this.separator, query)
        : this._flated[query];
    } else {
      return this.getSrc(shallowClonePropSet, isDeepClone);
    }
  }

  getSrc(shallowClonePropSet, isDeepClone=true) {
    if (shallowClonePropSet === false) isDeepClone = false;
    let ret = {};
    iterateObj(ret, this._flated, (key, obj, src) => {
      if (key.indexOf(this.separator) === -1) {
        // 这里本身已经是浅拷贝，所以子属性不需要再浅拷贝
        obj[key] = isDeepClone
          ? customizeDeepClone(src[key], shallowClonePropSet, this.separator, key)
          : src[key];
      }
      return false;
    }, this.separator, this.prefix);
    return ret;
  }

  put(query, value, handleChanged) {
    if (!query) {
      this._flated = putEntireFlatedObj(
        this._flated, value, handleChanged, this.separator, this.prefix);
    } else {
      putFlatedObj(
        this._flated, query, value, handleChanged, this.separator, this.prefix);
    }
  }

  patch(changed, handleChanged) {
    patchFlatedObj(this._flated, changed, handleChanged, this.separator, this.prefix);
  }
}
