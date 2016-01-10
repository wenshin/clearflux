import pipelineWrap from './pipelineWrap';
/**
 * @Usage:
 *   ```
 *   let pipeline = new Pipeline(
 *     {
 *       name: 'pipe1',
 *       pipe: v => v,
 *       type: 'flowAsync',
 *       // pipe 运行前执行
 *       preMiddlewares: [
 *         ({value, name, pipe}) => {
 *           console.log(name + value);
 *           return {value, name, pipe};
 *         },
 *         ({value, name, pipe}) => {
 *           return {value: Number(value), name, pipe};
 *         }
 *        ],
 *       // pipe 运行后执行
 *       postMiddlewares: []
 *     },
 *     {name: 'pipe2', pipe: () => {}});
 *   ```
 */
export default class Pipeline {
  static inheritProps = [
    'push', 'pop', 'shift', 'unshift', 'concat',
    'slice', 'splice', 'filter', 'map', 'reduce'
  ];

  // pipeline 运行前执行
  static prePipelineMiddlewares = [];

  // pipeline 运行后执行
  static postPipelineMiddlewares = [];

  // 所有 pipe 运行前执行
  static commonPreMiddlewares = [];

  // 所有 pipe 运行后执行
  static commonPostMiddlewares = [];

  static concatPrePipelineMiddlewares(middlewares=[]) {
    Pipeline.prePipelineMiddlewares.concat(middlewares);
  }

  static concatPostPipelineMiddlewares(middlewares=[]) {
    Pipeline.postPipelineMiddlewares.concat(middlewares);
  }
  /**
   * 添加在所有 pipe 运行之前执行的 Middleware 函数。函数执行顺序为数组顺序。
   *
   * @param  {Array Function|Function}  middlewares
   *     一个函数或者函数数组，函数的参数为一个对象：
   *     ```
   *     {
   *       value: '', // 当前数据流中的数据
   *       pipe: '', // 当前执行的 pipe 函数
   *       name: '' // 当前执行的 pipe 名称
   *     }
   *     ```
   *     函数也必须返回一个和参数同样结构的数组
   *
   * @return {undefined}
   */
  static concatCommonPreMiddlewares(middlewares=[]) {
    Pipeline.commonPreMiddlewares.concat(middlewares);
  }

  static concatCommonPostMiddlewares(middlewares=[]) {
    Pipeline.commonPostMiddlewares.concat(middlewares);
  }

  constructor() {
    this._pipes = Array.from(arguments);
    let delegate = prop => this._pipes[prop].bind(this._pipes);
    for (let prop of Pipeline.inheritProps) {
      this[prop] = delegate(prop);
    }
  }

  flow(data) {
    let pipelined = pipelineWrap(data);
    pipelined = this.reduce((_pipelined, {name, pipe, type='flow'}) => {
      if (pipe && pipe instanceof Function) {
        return _pipelined[type](pipe, name);
      } else {
        throw Error(`
          new Pipeline(arg1, arg2) 的参数必须是
          {name: [String|optional], pipe: [Function], type: [String|optional]}
        `);
      }
    }, pipelined);
    return pipelined.finish();
  }
}
