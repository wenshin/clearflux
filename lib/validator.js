/**
 * 测试用例：
 * 1. validate config is Object. Msg is es6 type string formator
 *     a. `{require: true, message: '${value}'}`
 *     b. `{require: false}`
 *     c. `{regexp: /abc/i, message: ''}`
 *     h. `{valid: [Function], message: ''}`
 *     h. `{async: [asyncFunction|spawnGenerator], message: ''}`
 *     d. `{type: Number, max: 10, min: 1, message: '${name} is ${value} less than ${max}, great than ${min}'}`
 *     e. `{type: String, maxLength: 10, minLength: 1, message: '${name} is ${value} length less than ${maxLength}, great than ${minLength}'}`
 *     f. `{type: String, unicode: true, maxLength: 10, minLength: 1, message: '${name} is ${value} length less than ${maxLength}, great than ${minLength}'}`
 *     g. `{type: 'mail', message: ''}`
 *     f. `{type: 'url', message: ''}`
 * 2. validate config is Function
 * 3. validate config is Array of Object or Funciton
 *
 * @Usage
 * ```
 * let validator = new Validate(config);
 * let error = validator.validate(value);
 * // error is a Object like {error: '', loading: true}
 * ```
 */

import _template from 'lodash/string/template';

function getUnicodeLength(str) {
  let len = 0;
  let getCharLength = (char, index=2) => {
    if (char.codePointAt(0) < Math.pow(2, index*4) - 1) return index/2;
    else return getCharLength(char, index + 2);
  };
  for (let char of str) {
    len += getCharLength(char);
  }
  return len;
}

class ValidateResult {
  constructor(value, error, loading=false) {
    this.value = value;
    this.error = error;
    this.loading = loading;
  }
}

export default class Validator {
  // alias
  static require = (isRequire=true, msg) => new Validator({require: isRequire, message: msg});
  static number = c => new Validator({type: Number, ...c});
  static string = c => new Validator({type: String, ...c});
  static regexp = c => new Validator({type: 'regexp', ...c});
  static async = (fn, msg) => new Validator({async: fn, msg});

  static defaultMsgMap = new Map([
    ['require', '${name || "该值"}不能为空'],
    ['regexp', '${name || "该值"}格式不匹配'],
    ['valid', '${name || "该值"}验证失败'],
    ['async', '${name || "该值"}验证失败'],
    [Number, '${name || "该值"}应为${max === min ? "等于" + min : "介于" + min + "到" + max + "之间"}的数字'],
    [String, '${name || "该值"}长度应为${maxLength === minLength ? "等于" + minLength : "介于" + (minLength || 0) + "到" + maxLength + "之间"}'],
    [Boolean, '${name || "该值"}应输入 false 或 true'],
    ['mail', '${name || "该值"}应输入正确的邮箱格式: abc@domain.com'],
    ['url', '${name || "该值"}应输入正确的链接格式: http://www.example.com?a=1&b=2#id']
  ]);

  static transFailFlag = {};

  static defaultConfigs = new Map([
    [Number, {max: null, min: null}],
    [String, {unicode: false, maxLength: null, minLength: null}]
  ]);

  static typeTransformerMap = new Map([
    [Number, transformNumber]
  ]);

  static directValidatorObj = {
    require: validateRequire,
    regexp: validateRegexp
  };

  static typeValidatorMap = new Map([
    ['instance', validateInstance],
    [Number, validateNumber],
    [String, validateString],
    ['mail', validateMail],
    ['url', validateUrl]
  ]);

  static typeOfMap = new Map([[Number, 'number'], [String, 'string'], [Boolean, 'boolean']]);;

  static addTypeValidator(name, validate, defaultMsg) {
    Validator.typeValidatorMap.set(name, validate);
    Validator.setDefaultMsg(name, defaultMsg);
  }

  static addDirectValidator(name, validate, defaultMsg) {
    Validator.directValidatorObj[name] = validate;
    Validator.setDefaultMsg(name, defaultMsg);
  }

  static setDefaultMsg(name, defaultMsg) {
    return defaultMsg && Validator.defaultMsgMap.set(name, defaultMsg);
  }

  constructor(configs) {
    // 默认`require`为`true`;
    let requireConfig = {require: true};
    configs = configs || requireConfig;

    if (configs instanceof Array) {
      configs.unshift(requireConfig);
    } else if (!('require' in configs)) {
      configs = [requireConfig, configs];
    } else {
      configs = [configs];
    }
    this.configs = configs;
  }

  validate({name, value}) {
    let transValue;
    for (let config of this.configs) {
      let {transformType, validate, msgKey} = this.parseConfig(config);
      let compile = _template(config.message || Validator.defaultMsgMap.get(msgKey));
      config = Object.assign({}, Validator.defaultConfigs.get(config.type), config);
      transValue = transformType(value);
      if (transValue === Validator.transFailFlag) {
        // 类型转换失败
        return new ValidateResult(value, compile({name, value, ...config}));
      } else {
        // 异步类型判断
        if (msgKey === 'async') {
          return new ValidateResult(value, '', true);
        }
        // 其它判断
        let isPass = validate({name, value: transValue, config});
        if (!isPass) {
          return new ValidateResult(transValue, compile({name, value, ...config}));
        }
      }
    }
    return new ValidateResult(transValue, '');
  }

  parseConfig(config) {
    let transformType = v => v;
    let validate = () => true;
    let msgKey;

    if ('type' in config) {
      msgKey = config.type;
      // Lodash template 使用 with(obj) 语法，如果模板中的属性在 obj 中不存在会报错；
      // 这里用默认配置来补充缺失的属性
      transformType = Validator.typeTransformerMap.get(config.type) || transformType;
      validate = Validator.typeValidatorMap.get(config.type);
      if (!validate) validate = Validator.typeValidatorMap.get('instance');
    } else if ('valid' in config) {
      msgKey = 'valid';
      validate = config.valid;
    } else if ('async' in config) {
      msgKey = 'async';
      config.async();
    } else {
      for (let key of Object.keys(Validator.directValidatorObj)) {
        if (key in config) {
          msgKey = key;
          validate = Validator.directValidatorObj[key];
          break;
        }
      }
    }
    return {transformType, validate, msgKey};
  }
}

function transformNumber(value) {
  if (!value && value !== 0) value = NaN;
  value = Number(value);
  let res = Object.is(value, NaN) ? Validator.transFailFlag : value;
  return res;
}

function validateRequire({value}) {
  return value instanceof Array
    ? value.length
    : (typeof value === 'object' ? Object.keys(value).length : value);
}

function validateInstance({value, config}) {
  if (Validator.typeOfMap.has(config.type) && typeof value !== 'object') {
    return typeof value === Validator.typeOfMap.get(config.type);
  }
  return value instanceof config.type;
}

function validateNumber({value, config}) {
  return (!config.min || value >= config.min)
    && (!config.max || value <= config.max);
}

function validateString({value, config}) {
  let getLength = config.unicode ? getUnicodeLength : v => v.length;
  return (config.minLength ? getLength(value) >= config.minLength : true)
    && (config.maxLength ? getLength(value) <= config.maxLength : true);
}

function validateRegexp({value, config}) {
  return config.regexp.test(value);
}

function validateMail() {
  // TODO
  return true;
}

function validateUrl() {
  // TODO
  return true;
}
