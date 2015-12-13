import { EventEmitter } from 'events';
import _clone from 'lodash._baseclone';

import {FlatMap} from './util';
import {StoreWritePermissionError} from './error';

let CHANGE_EVENT = 'change';

export default class Store extends EventEmitter {
  constructor(data, shallowCloneProps) {
    super();
    this._default = _clone(data, true);
    this._data = new FlatMap(data);
    this._shallowClonePropSet = new Set(shallowCloneProps || []);
    this._writer = new Set();
    this._queryEventMapping = {
      // 'change?a.b.c': new Set(['change?a.b.c&b.c.d']),
      // 'change?b.c.d': new Set(['change?a.b.c&b.c.d'])
    };
    this._waitTriggerEvents = new Set();
    this._timer = null;
  }

  /**
   * 替换数据 query 路径指定的数据
   * @param  {String} query  'a.b'格式属性路径。如果是 '' 则替换所有数据
   * @param  {[All]}  value  任何值
   * @param  {Object} writer 写入者，可以是任何对象
   * @return {undefined}
   */
  put(query, value, writer) {
    this.permit(writer);
    this._data.put(query, value, q => this.trigger(CHANGE_EVENT, q));
  }

  patch(value, writer) {
    this.permit(writer);
    this._data.patch(value, q => this.trigger(CHANGE_EVENT, q));
  }

  get(queries=[], isDeepClone=true) {
    queries = typeof queries === 'string' ? [queries] : queries;
    if (!queries.length) return this._data.get('', this._shallowClonePropSet, isDeepClone);
    let values = [];
    for (let q of queries) {
      values.push(this._data.get(q, this._shallowClonePropSet, isDeepClone));
    }
    return values;
  }

  getDefault() {
    return _clone(this._default, true);
  }

  permit(writer) {
    if ( !this._writer.has(writer) ) throw new StoreWritePermissionError();
  }

  registerWriter(writer) {
    this._writer.add(writer);
  }

  getSnapshot() {
    return this._data.get('', false);
  }

  restore(snapshot, writer) {
    this.permit(writer);
    this._data = new FlatMap(snapshot);
  }

  onChange(queriesStr, callback) {
    let events = [];
    let queries;
    if ( typeof queriesStr === 'function' ) {
      callback = queriesStr;
      queriesStr = '';
      events.push(CHANGE_EVENT);
    } else {
      queries = queriesStr.split('&');
      events = queries.map(query => this.fmtEventName(CHANGE_EVENT, query));
      events = events.length ? events : events.push(CHANGE_EVENT);
    }
    this.bind(CHANGE_EVENT, queriesStr, callback);
    callback.apply(null, this.get(queries));
  }

  offChange(queriesStr, callback) {
    let queries = this.queryStr2Array(queriesStr);
    for (let query of queries) {
      this.removeListener(this.fmtEventName(CHANGE_EVENT, query), callback);
    }
  }

  bind(type, queriesStr, callback) {
    this.addQueryEventMapping(type, queriesStr);
    let queries = this.queryStr2Array(queriesStr);
    let eventName = this.fmtEventName(type, queriesStr);
    this.on(eventName, () => callback.apply(null, this.get(queries)));
  }

  addQueryEventMapping(type, queriesStr) {
    // 如果是监听所有数据事件，则不需要缓存 Mapping
    if (!queriesStr) return;
    let queries = this.queryStr2Array(queriesStr);
    let eventName = this.fmtEventName(type, queriesStr);
    for (let query of queries) {
      let key = this.fmtEventName(type, query);
      let eventSet = this._queryEventMapping[key] || new Set();
      eventSet.add(eventName);
      this._queryEventMapping[key] = eventSet;
    }
  }

  trigger(type, query) {
    let queryEventMapping = this._queryEventMapping;
    let eventSet = queryEventMapping[this.fmtEventName(type, query)];
    if (eventSet) {
      for (let e of eventSet) {
        this._waitTriggerEvents.add(e);
      }
    }

    if (this._timer) clearTimeout(this._timer);
    this._timer = setTimeout(() => {
      for (let event of this._waitTriggerEvents) {
        let queries = this.getQueriesOfEventName(event);
        this.emit(event, this._data.get(queries));
      }
      this.timer = null;
      this._waitTriggerEvents.clear();
    }, 20);
  }

  fmtEventName(type, query) {
    return query ? `${type}?${query}` : type;
  }

  getQueriesOfEventName(eventName) {
    let splited = eventName.split('?');
    if (splited.length === 1) return [];
    else if (splited.length === 2) return this.queryStr2Array(splited[1]);
  }

  queryStr2Array(queriesStr) {
    return queriesStr.split('&');
  }
}
