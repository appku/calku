import is from './is.js';

const RECURSION_DEPTH = 3;
const STANDARD_SUPPORTED_TYPES = [Array, 'string', 'number', 'boolean', Date, null];
let _cache = {};

/**
 * @typedef FunctionParameter
 * @property {Boolean} [spread]
 * @property {String} [name="value"]
 * @property {String} [hint] 
 * @property {IsValidator} validator
 */

/**
 * @typedef CalKuFunction
 * @property {Array.<String>} symbols
 * @property {String} [hint] 
 * @property {Boolean | FunctionParameter | Array.<FunctionParameter>} [params]
 * @property {Function} func
 */

//FIXME need to add hints to funcs and params.

/**
 * Funcs are special calls with optional arguments within a CalKu expression to evaluate to a resulting value.
 * @module
 */
const funcs = {
    //Alphabetical order of functions. 
    //!!! If modifying this list, please try to maintain this order for readability, this will be a long list!
    /** @type {CalKuFunction} */
    ABS: {
        symbols: ['ABS'],
        params: [
            (v) => is(v).instanceOf('number', 'boolean', null),
        ],
        func: (v) => Math.abs(v)
    },
    /** @type {CalKuFunction} */
    AVERAGE: {
        symbols: ['AVERAGE'],
        params: {
            spread: true,
            name: 'numbers',
            validator: (v) => is(v).instanceOf(Array, 'number', 'boolean', null),
        },
        func: (...values) => {
            values = values.flat(RECURSION_DEPTH);
            if (values.length > 0) {
                let sum = values.reduce((pv, cv) => pv + (cv || 0), 0);
                return sum / values.length;
            }
            return 0;
        }
    },
    /** @type {CalKuFunction} */
    CEIL: {
        symbols: ['CEIL'],
        params: [
            (v) => is(v).instanceOf('number', 'boolean', null),
        ],
        func: (v) => Math.ceil(v)
    },
    /** @type {CalKuFunction} */
    COUNT: {
        symbols: ['COUNT'],
        params: {
            spread: true,
            name: 'numbers',
            validator: (v) => is(v).instanceOf(Array, 'number', 'boolean', null),
        },
        func: (...values) => {
            return values.flat(RECURSION_DEPTH).reduce((pv, cv) => {
                if (cv != null && isNaN(cv) === false) { //match google sheets, only count numbers.
                    return ++pv;
                }
                return pv;
            }, 0);
        }
    },
    /** @type {CalKuFunction} */
    FLOOR: {
        symbols: ['FLOOR'],
        params: [
            (v) => is(v).instanceOf('number', 'boolean', null),
        ],
        func: (v) => Math.floor(v)
    },
    /** @type {CalKuFunction} */
    HELLOWORLD: {
        symbols: ['HELLOWORLD'],
        func: () => 'Hello world.'
    },
    /** @type {CalKuFunction} */
    IF: {
        symbols: ['IF'],
        params: [
            {
                name: 'condition',
                validator: (v) => is(v).boolean().required()
            },
            {
                name: 'valueIfTrue',
                validator: (v) => is(v).anything()
            },
            {
                name: 'valueIfFalse',
                validator: (v) => is(v).anything()
            }
        ],
        func: (condition, valueIfTrue, valueIfFalse) => {
            if (condition === true) {
                return valueIfTrue;
            }
            return valueIfFalse;
        }
    },
    /** @type {CalKuFunction} */
    ISARRAY: {
        symbols: ['ISARRAY'],
        params: 1,
        func: (v) => is(v).array().valid()
    },
    /** @type {CalKuFunction} */
    ISBOOLEAN: {
        symbols: ['ISBOOLEAN'],
        params: 1,
        func: (v) => is(v).boolean().valid()
    },
    /** @type {CalKuFunction} */
    ISDATE: {
        symbols: ['ISDATE'],
        params: 1,
        func: (v) => is(v).instanceOf(Date).valid()
    },
    /** @type {CalKuFunction} */
    ISEMPTY: {
        symbols: ['ISEMPTY'],
        params: [
            (v) => is(v).instanceOf('string', null),
        ],
        func: (v) => typeof v === 'undefined' || v === null || v.trim() === ''
    },
    /** @type {CalKuFunction} */
    ISNOTEMPTY: {
        symbols: ['ISNOTEMPTY'],
        params: [
            (v) => is(v).instanceOf('string', null),
        ],
        func: (v) => typeof v !== 'undefined' && v != null && v.trim() !== ''
    },
    /** @type {CalKuFunction} */
    ISNOTNULL: {
        symbols: ['ISNOTNULL'],
        params: 1,
        func: (v) => v !== null
    },
    /** @type {CalKuFunction} */
    ISNULL: {
        symbols: ['ISNULL'],
        params: 1,
        func: (v) => v === null
    },
    /** @type {CalKuFunction} */
    ISOBJECT: {
        symbols: ['ISOBJECT'],
        params: 1,
        func: (v) => {
            if (is(v).instanceOf(Date).valid()) {
                return false; //CalKu treats dates and objects differently.
            }
            return is(v).object().valid();
        }
    },
    /** @type {CalKuFunction} */
    LEFT: {
        symbols: ['LEFT'],
        params: [
            (v) => is(v).instanceOf('string', 'number', null),
            (v) => is(v).integer().required()
        ],
        func: (a, b) => a != null ? a.toString().substring(0, b) : ''
    },
    /** @type {CalKuFunction} */
    LEN: {
        symbols: ['LEN'],
        params: 1,
        func: (v) => {
            if (v === null) {
                return 0;
            } else if (is(v).array().valid()) {
                return v.length;
            } else if (is(v).instanceOf('number', 'string').valid()) {
                return v.toString().length;
            } else if (is(v).boolean().valid()) {
                return 1;
            } else if (is(v).instanceOf(Date).valid()) {
                return v.getTime();
            } else if (is(v).object().valid()) {
                return 1;
            }
            return 0;
        }
    },
    /** @type {CalKuFunction} */
    MID: {
        symbols: ['MID'],
        params: [
            (v) => is(v).instanceOf('string', 'number', null),
            (v) => is(v).integer().required(),
            (v) => is(v).integer().required()
        ],
        func: (a, b, c) => a != null ? a.toString().substring(b, b + c) : ''
    },
    /** @type {CalKuFunction} */
    RIGHT: {
        symbols: ['RIGHT'],
        params: [
            (v) => is(v).instanceOf('string', 'number', null),
            (v) => is(v).integer().required()
        ],
        func: (a, b) => {
            if (a != null) {
                let v = a.toString();
                let startIndex = v.length - b;
                return v.substring(startIndex, a.length);
            }
            return '';
        }
    },
    /** @type {CalKuFunction} */
    SQRT: {
        symbols: ['SQRT'],
        params: [
            (v) => is(v).instanceOf('number', 'boolean', null),
        ],
        func: (v) => Math.sqrt(v)
    },
    /** @type {CalKuFunction} */
    SUM: {
        symbols: ['SUM'],
        params: {
            spread: true,
            name: 'numbers',
            validator: (v) => is(v).instanceOf(Array, 'number', 'boolean', null),
        },
        func: (...values) => {
            return values.flat(RECURSION_DEPTH).reduce((pv, cv) => {
                if (isNaN(cv) === false && is(cv).instanceOf('number', 'boolean')) { //match google sheets, only sum numbers.
                    return pv + cv;
                }
                return pv;
            }, 0);
        }
    },
    /** @type {CalKuFunction} */
    TEXTJOIN: {
        symbols: ['TEXTJOIN'],
        params: [
            (v) => is(v).string().required(),
            (v) => is(v).boolean().required(),
            {
                spread: true,
                name: 'values',
                validator: (v) => is(v).instanceOf(Array, 'string', 'number', 'boolean', Date, null),
            }
        ],
        func: (delim, ignoreEmpty, ...values) => {
            values = values.flat(RECURSION_DEPTH).filter(v => is(v).instanceOf('string', 'number', 'boolean', Date, null).valid());
            if (ignoreEmpty) {
                return values.filter(v => v != null && typeof v != 'undefined' && v.toString().length > 0).join(delim);
            }
            return values.join(delim);
        }
    },
    /** @type {CalKuFunction} */
    TRUNCATE: {
        symbols: ['TRUNCATE'],
        params: [
            (v) => is(v).instanceOf('number', 'boolean', null),
        ],
        func: (v) => Math.trunc(v)
    },

    /**
     * Validates a given array of argument values for a specified func(tion). Optionally throws an error instead of 
     * returning a boolean result.
     * @param {String | CalKuFunction} func - The key or instance of a CalKu function.
     * @param {Array} args - Array of arguments to be validated.
     * @param {Boolean} [throwError] - Optionally, if `true` throw an error if validation fails.
     * Errors caused by an invalid func definition do not use this argument and will still be thrown.
     * @returns {Boolean}
     */
    argsValid(func, args, throwError) {
        if (typeof func === 'string') {
            func = this[func];
        }
        if (!func || !func.symbols) {
            throw new Error('Argument "func" must be a valid function key or CalKu function object.');
        }
        //validate
        if (
            (typeof func.params === 'number' && func.params != args.length)
            || ((typeof func.params === 'undefined' || func.params === false) && args.length > 0)
        ) {
            if (throwError) {
                throw new Error(`Invalid number of arguments. Expected ${func?.params?.length ?? 0} but found ${args.length}.`);
            }
            return false;
        } else if (func.params && (Array.isArray(func.params) || func.params.validator)) {
            let arr = func.params;
            if (func.params && typeof func.params.validator === 'function') {
                //looks like params is an object literal, convert it to an array
                arr = [func.params];
            }
            let hasSpreadParam = arr.some(v => v.spread === true) ;
            if (hasSpreadParam) {
                //check spread param usage is valid.
                if (arr.reduce((pv, cv, ci) => pv + (arr[ci].spread === true ? 1 : 0), 0) > 1) {
                    throw new Error('Invalid function parameter definition: Found multiple spread arguments, and only one is allowed.');
                } else if (!arr[arr.length - 1].spread) {
                    throw new Error('Invalid function parameter definition: A spread is only allowed on the last parameter.');
                } else if (args.length <= arr.length - 1) {
                    if (throwError) {
                        throw new Error(`Invalid number of arguments. Expected at least ${arr.length} but found ${args.length}.`);
                    }
                    return false;
                }
            } else if (arr.length != args.length) { //no spread, so param & arg length must match.
                if (throwError) {
                    throw new Error(`Invalid number of arguments. Expected ${arr.length} but found ${args.length}.`);
                }
                return false;
            }
            //walk all arguments and validate
            for (let i = 0; i < args.length; i++) {
                let param = null;
                let paramType = null;
                let validatorFunc = null;
                if (i >= arr.length) {
                    param = arr[arr.length - 1]; //use the last parameter as we appear to be going into a spread
                } else {
                    param = arr[i]; //param and arg index should align (unless on a final spread)
                }
                paramType = typeof param;
                if (paramType === 'function') {
                    validatorFunc = param;
                } else if (paramType === 'object' && typeof param.validator === 'function') {
                    validatorFunc = param.validator;
                } else {
                    throw new Error(`Invalid function parameter definition: A parameter validator used for the argument at index ${i} appears to be invalid.`);
                }
                if (throwError) {
                    validatorFunc(args[i]).throw();
                } else if (validatorFunc(args[i]).valid() === false) {
                    return false;
                }
            }
        }
        return true;
    },

    /**
     * Removes cached information about functions.    
     * You should call this method if you modify the funcs object (e.g. if you added, changed, or removed ops).
     */
    recycle() {
        _cache = {};
    },

    /**
     * Converts all funcs into a `RegExp` matching object for token parsing with the property as the key.
     * The regex is looking for a valid match starting with any of the appropriate operation symbols, followed
     * by whitespace, a grouping token (parenthesis), or the end of input. The first match will be the symbol matched.
     * @param {...String} [types] - Optional selection of types to include in the returned map.
     * @returns {Map.<String, RegExp>}
     */
    toRegExp(...types) {
        if (_cache.regexp) {
            return _cache.regexp;
        }
        let r = new Map();
        for (let o in this) {
            if (this[o] && this[o].symbols) {
                r.set(o, new RegExp(
                    '^(' + this[o].symbols
                        .map(v => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
                        .join('|') +
                    ')(?:\\s|\\(|\\)|$)', 'i')
                );
            }
        }
        _cache.regexp = r;
        return r;
    }
};

export default funcs;