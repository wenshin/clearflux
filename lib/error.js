/**
 * NOTE ES6 extends Error run test error
 */

export function StoreParamNeedError(message) {
  this.name = 'StoreParamNeedError';
  this.message = message || '';
}
StoreParamNeedError.prototype = Error.prototype;
