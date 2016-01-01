/**
 * 生成一个处理数据的 Pipeline 包装
 *
 * @param  {AnyType} value 待处理的值
 * @return {Object}        一个包含 flow 和 finish 属性的对象。 两个属性均为函数。
 *                         两个属性均接受一个函数作为，该函数接受一个数据，并返回一个新的数据
 */
export function pipelineWrap(value) {
  return {
    flow(pipe) {
      if ( !(pipe instanceof Function) ) {
        throw new Error('[pipelineWrap.flow] accept function only!');
      }
      return pipelineWrap(pipe(value));
    },
    finish(pipe) {
      return pipe instanceof Function ? pipe(value) : value;
    }
  };
}

export default class Pipeline {
  static inheritProps = [
    'push', 'pop', 'shift', 'unshift', 'concat',
    'slice', 'splice', 'filter', 'map', 'reduce'
  ];

  constructor() {
    this._pipes = Array.from(arguments);
    let delegate = prop => this._pipes[prop].bind(this._pipes);
    for (let prop of Pipeline.inheritProps) {
      this[prop] = delegate(prop);
    }
  }

  flow(data) {
    let pipelined = pipelineWrap(data);
    pipelined = this.reduce((_pipelined, curPipe) => {
      return _pipelined.flow(curPipe);
    }, pipelined);
    return pipelined.finish();
  }
}
