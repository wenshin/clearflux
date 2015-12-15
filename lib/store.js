import {EventEmitter} from 'events';
import _clone from 'lodash/internal/baseClone';

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
    this._loadingQueries = new Set();
    this._queryErrors = {};
    this._queryEventMapping = {
      // 'change?a.b.c': new Set(['change?a.b.c&b.c.d']),
      // 'change?b.c.d': new Set(['change?a.b.c&b.c.d'])
    };
    this._eventMapping = new Map();
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

  /**
   * 递归新增或更新数据
   * @param  {Object} value  Plain Object 格式的更新数据，如：{a: {b: c}}。
   * @param  {Object} writer [description]
   * @return {undefined}
   */
  patch(value, writer) {
    this.permit(writer);
    this._data.patch(value, q => this.trigger(CHANGE_EVENT, q));
  }

  setErrors(query, errors, writer) {
    this.permit(writer);
    this._queryErrors[query] = [].concat(errors);
    this.trigger(CHANGE_EVENT, query);
  }

  removeErrors(query, writer) {
    this.permit(writer);
    delete this._queryErrors[query];
    this.trigger(CHANGE_EVENT, query);
  }

  startLoading(query, writer) {
    this.permit(writer);
    this._loadingQueries.add(query);
    this.trigger(CHANGE_EVENT, query);
  }

  stopLoading(query, writer) {
    this.permit(writer);
    this._loadingQueries.delete(query);
    this.trigger(CHANGE_EVENT, query);
  }

  get(queries=[], isDeepClone=true) {
    queries = typeof queries === 'string' ? [queries] : queries;
    if (!queries.length) return this.wrapData('', isDeepClone);
    let values = [];
    for (let q of queries) {
      values.push(this.wrapData(q, isDeepClone));
    }
    return values;
  }

  wrapData(query, isDeepClone) {
    return {
      value: this._data.get(query, this._shallowClonePropSet, isDeepClone),
      loading: this._loadingQueries.has(query),
      errors: this._queryErrors[query]
    };
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
    let queries;
    if ( typeof queriesStr === 'function' ) {
      callback = queriesStr;
      queriesStr = '';
    } else {
      queries = queriesStr.split('&');
    }
    this.bind(CHANGE_EVENT, queriesStr, callback);
    callback.apply(null, this.get(queries));
  }

  offChange(queriesStr, callback) {
    this.removeListener(
      this.fmtEventName(CHANGE_EVENT, queriesStr),
      this._eventMapping.get(callback));
    this._eventMapping.delete(callback);
  }

  bind(type, queriesStr, callback) {
    this.addQueryEventMapping(type, queriesStr);
    let queries = this.queryStr2Array(queriesStr);
    let eventName = this.fmtEventName(type, queriesStr);
    let wrapperCb = () => callback.apply(this, this.get(queries));
    this._eventMapping.set(callback, wrapperCb);
    this.on(eventName, wrapperCb);
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

  combineLoadings(selfQuery, configs) {
    let writer = {name: 'combineLoadings'};
    this.registerWriter(writer);
    this.combineStores(selfQuery, configs, storeMap => {
      let loading = false;
      // 如果组合的 store 有一个是在 loading 状态，则为 loading 状态。
      // 如果组合的 store 都不是 loading 状态，则为非 loading 状态。
      storeMap.forEach(value => loading = value.loading || loading );
      if (loading && !this._loadingQueries.has(selfQuery)) this.startLoading(selfQuery, writer);
      if (!loading && this._loadingQueries.has(selfQuery)) this.stopLoading(selfQuery, writer);
    });
  }

  combineStores(selfQuery, configs, handle) {
    let storeMap = new Map();
    let getOnChange = store => value => {
      storeMap.set(store, value);
      handle.call(this, storeMap);
    };
    for (let config of configs) {
      let query = config[0];
      let store = config[1];
      storeMap.set(store, false);
      store.onChange(query, getOnChange(store));
    }
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
