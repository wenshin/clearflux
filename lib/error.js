/**
 * NOTE ES6 extends Error run test error
 */

export function StoreWritePermissionError(message) {
  this.name = 'StoreWritePermissionError';
  this.message = message || '';
}
StoreWritePermissionError.prototype = Error.prototype;
