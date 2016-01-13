import _isPlainObject from 'lodash.isplainobject';

export let DEFAULT_SEPARATOR = '.';

/**
 * 以 iterObj 为遍历对象，按层次比较 target 参数
 * @param  {Object}   target    目标对象
 * @param  {Object}   iterObj   遍历对象
 * @param  {Function} compare   比较函数，参数为[key, target, iterObj, queries]
 * @param  {String}   separator query 的分隔符
 * @param  {String}   prefix    query 添加的前缀，默认为 ''
 * @param  {Array}    queries   query 链条上的所有查询。'a.b.c' -> ['a', 'a.b', 'a.b.c']
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
    let prop = getArrayLast(queries);
    flated[prop] = iterObj[key];
    return true;
  }, separator, prefix);
  return flated;
}

/**
 * 更新和新增值
 * @param  {Object}   srcFlated     修改的
 * @param  {Object}   updated       更新的值
 * @param  {Function} handleChanged 当有变更的属性时触发
 * @param  {String}   separator     query 分隔符
 * @param  {String}   prefix        query 前缀
 * @return {undefined}
 */
export function patchFlatedObj(srcFlated, updated, handleChanged, separator, prefix) {
  if ( !_isPlainObject(updated) ) return srcFlated;
  let parentQueries = [];

  iterateObj(srcFlated, updated, (key, target, iterObj, queries) => {
    let targ = target[key];
    let iter = iterObj[key];
    let prop = getArrayLast(queries);
    let next = true;
    if (targ !== iter) {
      if ( _isPlainObject(targ) && _isPlainObject(iter) ) {
        next = true;
      } else {
        target[key] = iter;
        srcFlated[prop] = target[key];
        handleChanged(prop, target[key]);
        parentQueries = parentQueries.concat(queries.slice(0, -1));
        next = false;
      }
    } else {
      next = false;
    }
    return next;
  }, separator, prefix);
  triggerChangeEvents(srcFlated, new Set(parentQueries), handleChanged);
}

function triggerChangeEvents(flated, queries, handleChanged) {
  for ( let query of queries ) {
    handleChanged(query, flated[query]);
  }
}

/**
 * 替换整个数据对象的值
 * @param  {FlatObject} flatedObj     需要被完整替换的扁平化对象
 * @param  {AnyType}    value         完整的对象
 * @param  {Function}   handleChanged 发现变化时触发的函数
 * @param  {String}     separator     属性分隔符
 * @param  {String}     prefix        默认前缀
 * @return {undefined}
 */
export function putEntireFlatedObj(flatedObj, value, handleChanged, separator=DEFAULT_SEPARATOR, prefix='') {
  if (!value) return flatedObj;
  let newFlated = flatObj(value, prefix, separator);
  let parentQueries = [];
  handleChanged(prefix, value);

  // 删除属性事件
  iterateObj(newFlated, flatedObj, (key, target, iterObj, queries) => {
    let prop = getArrayLast(queries);
    if (key in iterObj && !(key in target)) handleChanged(prop);
    parentQueries = parentQueries.concat(prop.split(separator).slice(0, -1));
    // 只遍历第一层属性
    return false;
  }, separator, prefix);

  // 新增属性事件
  iterateObj(flatedObj, value, (key, _src, iterObj, queries) => {
    let prop = getArrayLast(queries);
    if ( !(prop in flatedObj) ) {
      handleChanged(prop, iterObj[key]);
    }
    parentQueries = parentQueries.concat(queries.slice(0, -1));
    return true;
  }, separator, prefix);
  triggerChangeEvents(newFlated, new Set(parentQueries), handleChanged);
  return newFlated;
}

/**
 * 替换属性值
 * @param  {Object}   srcFlated     需要替换属性值的被扁平化的对象
 * @param  {String}   query         查找路径
 * @param  {Object}   value         新的值
 * @param  {Function} handleChanged 触发值改变的 query
 * @param  {String}   separator     query 分隔符，默认'.'
 * @return {undefined}
 */
export function putFlatedObj(srcFlated, query, value, handleChanged, separator=DEFAULT_SEPARATOR, prefix='') {
  if (typeof query !== 'string') return srcFlated;
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
  }, separator, prefix);

  if (_isPlainObject(old)) {
    // 删除属性
    iterateObj(value, old, (key, target, oldObj, queries) => {
      let prop = query + separator + getArrayLast(queries);
      if (key in oldObj && !(key in target)) {
        delete srcFlated[prop];
        handleChanged(prop);
      }
      return true;
    }, separator, prefix);
  }

  if (_isPlainObject(value)) {
    // 新增属性
    iterateObj({}, value, (key, target, iterObj, queries) => {
      let prop = query + separator + getArrayLast(queries);
      // 原始扁平对象中如果没有该属性，或者两个值不相等就更新值
      if ( !(prop in srcFlated) || srcFlated[prop] !== value ) {
        srcFlated[prop] = iterObj[key];
        handleChanged(prop, iterObj[key]);
      }
      target[key] = target[key] || {};
      return true;
    }, separator, prefix);
  }

}

function bubbleQuery(key, query, next, separator) {
  key = key || '';
  if (!next(key, query)) return;
  let re = new RegExp(`^(.+)[${separator}]([^${separator}]+)$`, 'i');
  let matched = query.match(re);
  if (matched) bubbleQuery(matched[2], matched[1], next, separator);
}

function getArrayLast(array) {
  return array.slice(-1)[0];
}
