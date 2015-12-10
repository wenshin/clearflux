import _isPlainObject from 'lodash.isplainobject';
import _clone from 'lodash._baseclone';

/**
 * 概念解释
 * Query: 'a'，'a.b', 'a.b.c' 等属性访问路径
 */

let DEFAULT_SEPARATOR = '.';

export class FlatMap {
  constructor(obj, separator=DEFAULT_SEPARATOR, prefix='') {
    this._flated = flatObj(obj, separator, prefix);
    this.separator = separator;
    this.prefix = prefix;
  }

  get(query, isDeepClone=true) {
    return _clone(this._flated[query], isDeepClone);
  }

  put(query, value, handleChanged) {
    putFlatedObj(this._flated, query, value, handleChanged, this.separator, this.prefix);
  }

  patch(changed, handleChanged) {
    patchFlatedObj(this._flated, changed, handleChanged, this.separator, this.prefix);
  }
}

/**
 * 已 iterObj 为遍历对象，按层次比较 target 参数
 * @param  {Object}   target    目标对象
 * @param  {Object}   iterObj   遍历对象
 * @param  {Function} compare   [description]
 * @param  {String}   separator [description]
 * @param  {String}   prefix    [description]
 * @param  {Array}    queries   [description]
 * @return {[type]}             [description]
 */
export function iterateObj(target, iterObj, compare, separator=DEFAULT_SEPARATOR, prefix='', queries=[]) {
  if ( !_isPlainObject(iterObj) || !_isPlainObject(target) ) {
    throw new TypeError('[target, iterObj] arguments of iterateObj should be a plain object.');
  }
  for ( let key of Object.keys(iterObj) ) {
    let prop = prefix + (prefix ? separator : '') + key;

    if ( prop.split(separator).length === 1 ) queries = [prop];
    else queries.push(prop);

    if ( compare(key, target, iterObj, queries, separator) ) {
      if ( _isPlainObject(iterObj[key]) ) {
        iterateObj(target[key] || {}, iterObj[key], compare, separator, prop, queries);
      }
    }
  }
}

export function flatObj(obj, prefix, separator) {
  let flated = {};
  if ( !_isPlainObject(obj) ) return flated;

  iterateObj({}, obj, (key, target, iterObj, queries) => {
    let prop = queries.slice(-1);
    flated[prop] = iterObj[key];
    return true;
  }, separator, prefix);
  return flated;
}

export function patchFlatedObj(srcFlated, changed, handleChanged, separator, prefix) {
  if ( !_isPlainObject(changed) ) return srcFlated;

  iterateObj(srcFlated, changed, (key, target, iterObj, queries) => {
    let targ = target[key];
    let iter = iterObj[key];
    let prop = queries.slice(-1);
    let next = true;
    if (targ !== iter) {
      if ( _isPlainObject(targ) && _isPlainObject(iter) ) {
        next = true;
      } else {
        target[key] = iter;
        srcFlated[prop] = target[key];
        triggerChangeEvents(srcFlated, queries, handleChanged);
        next = false;
      }
    } else {
      next = false;
    }
    return next;
  }, separator, prefix);
}

function triggerChangeEvents(flated, queries, handleChanged) {
  for ( let query of queries ) {
    handleChanged(query, flated[query]);
  }
}

export function putFlatedObj(srcFlated, query, value, handleChanged, separator=DEFAULT_SEPARATOR) {
  if ( typeof query !== 'string' ) return srcFlated;
  let old = srcFlated[query];
  // 覆盖属性
  bubbleQuery(null, query, (key, q) => {
    if (!key) {
      if (srcFlated[query] !== value) {
        srcFlated[query] = value;
        handleChanged(query, value);
        return true;
      }
    } else {
      let prop = q + separator + key;
      srcFlated[q][key] = srcFlated[prop];
      handleChanged(q, srcFlated[prop]);
      return true;
    }
  }, separator);

  if (_isPlainObject(old)) {
    // 删除属性
    iterateObj(value, old, (key, target, oldObj, queries) => {
      let prop = query + separator + queries.slice(-1);
      if (key in oldObj && !(key in target)) {
        delete srcFlated[prop];
        handleChanged(prop);
      }
      return true;
    }, separator, '');
  }

  if (_isPlainObject(value)) {
    // 新增属性
    iterateObj({}, value, (key, target, iterObj, queries) => {
      let prop = query + separator + queries.slice(-1);
      if ( !(prop in srcFlated) ) {
        srcFlated[prop] = iterObj[key];
        handleChanged(prop, iterObj[key]);
      }
      target[key] = target[key] || {};
      return true;
    }, separator, '');
  }

}

function bubbleQuery(key, query, next, separator) {
  key = key || '';
  if (!next(key, query)) return;
  let re = new RegExp(`^(.+)[${separator}]([^${separator}]+)$`, 'i');
  let matched = query.match(re);
  if (matched) bubbleQuery(matched[2], matched[1], next, separator);
}
