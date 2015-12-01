import {parse as urlparse} from 'url';
import _clone from 'lodash._baseclone';

import {uniqueConcat, flatObj, updateFlatedObj} from './util';
import { StoreWritePermissionError } from './error';

let QUERY_SEPARATOR = '.';
// 需要 validate

function parsePath(path) {
  // 'change?abc.c#id'
  // 'change?abc.c&abc.b&abc.d#id'
  let parsed = urlparse(path);
  return {
    event: parsed.pathname,
    queries: parsed.query ? parsed.query.split('&') : [],
    hash: parsed.hash || '#'
  };
}

export default class Store {
  constructor(targets, shallowCloneProps) {
    this._targets = targets || {};
    this._shallowCloneProps = new Set(shallowCloneProps || []);
    this._writer = new Set();
    this._watchedProps = [];
    // 属性名为 `change?abc.ab#id` 格式字符串
    // this._events = {
    //   'change': {
    //     'abc': { '#': [], '#id': [] },
    //     'abc.a': { '#': [], '#id': [] },
    //     'abc.a.b': { '#': [], '#id': [] }
    //   }
    // };
    this._events = {};
  }

  get(query) {
    let queries = query.replace(QUERY_SEPARATOR, '_$_').split('_$_');
    let rootQuery = queries[0];
    let leftQuery = queries.length > 1 ? queries[1] : null;
    // 默认深拷贝，数据较大时将会导致内存增加，可以通过传递 shallowCloneProps 参数定义
    // this._targets 中的哪些参数进行浅拷贝
    let isDeep = !this._shallowCloneProps.has(query);
    if ( leftQuery ) {
      return _clone(this._targets[rootQuery][leftQuery], isDeep);
    } else {
      return _clone(this._targets[rootQuery], isDeep);
    }
  }

  set(name, value, writer) {
    if ( this._writer.has(writer) ) {
      this._set(name, value);
    } else {
      throw new StoreWritePermissionError();
    }
  }

  _set(name, value) {
    if ( !this._targets[name] ) {
      this._targets[name] = flatObj(value, QUERY_SEPARATOR);
      this.emit(`change?${name}`);
    } else {
      updateFlatedObj(this._targets[name], value, (old, changed) => this.emit(), QUERY_SEPARATOR);
    }
  }

  registerWriter(writer) {
    this._writer.add(writer);
  }

  onchange(path, changeHandle) {
    this.on(`change?${path}`, changeHandle);
  }

  on(path, changeHandle) {
    if (typeof changeHandle !== 'function') {
      throw new TypeError('[clearflux] handlers must be function');
    }
    let p = parsePath(path);
    let eventPool = this._events[p.event] || {};
    for (let prop of p.queries) {
      eventPool[prop] = eventPool[prop] || {};
      eventPool[prop][p.hash] = uniqueConcat(eventPool[prop][p.hash], changeHandle);
      this._watchedProps.push(`${p.event}?${prop}`);
      changeHandle(this.get(prop));
    }
    this._events[p.event] = eventPool;
  }

  emit(path) {
    let p = parsePath(path);
    let eventPool = this._events[p.event];
    let handlers;
    for (let prop of p.queries) {
      if ( eventPool[prop] && (handlers = eventPool[prop][p.hash]) ) {
        for (let handler of handlers) {
          handler(this.get(prop));
        }
      }
    }
  }

  off(path) {
    let p = parsePath(path);
    let eventPool = this._events[p.event];
    for (let prop of p.queries) {
      if ( eventPool[prop] ) {
        eventPool[prop][p.hash] = [];
      }
    }
  }
}
