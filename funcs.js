import is from './is.js';

let _cache = {};

/**
 * Funcs are special calls with optional arguments within a CalKu expression to evaluate to a resulting value.
 * @module
 */
const funcs = {
    //Alphabetical order of functions. 
    //!!! If modifying this list, please try to maintain this order for readability, this will be a long list!
    ABS: {
        symbols: ['ABS'],
        args: 1,
        func: (v) => Math.abs(v)
    },
    CEIL: {
        symbols: ['CEIL'],
        args: 1,
        func: (v) => Math.ceil(v)
    },
    COUNT: {
        symbols: ['COUNT'],
        args: true, //true = any number of args
        func: (...values) => {
            return values.flat().reduce((pv, cv) => {
                if (isNaN(cv) === false && typeof cv === 'number') { //match google sheets, only count numbers.
                    return ++pv;
                }
                return pv;
            }, 0);
        }
    },
    FLOOR: {
        symbols: ['FLOOR'],
        args: 1,
        func: (v) => Math.floor(v)
    },
    HELLOWORLD: {
        symbols: ['HELLOWORLD'],
        args: 0,
        func: () => 'Hello world.'
    },
    ISEMPTY: {
        symbols: ['isempty'],
        args: 1,
        func: (v) => typeof v === 'undefined' || v === null || v === ''
    },
    ISNOTEMPTY: {
        symbols: ['isnotempty'],
        args: 1,
        func: (v) => typeof v !== 'undefined' && v != null && v !== ''
    },
    ISNOTNULL: {
        symbols: ['isnotnull'],
        args: 1,
        func: (v) => v !== null
    },
    ISNULL: {
        symbols: ['isnull'],
        args: 1,
        func: (v) => v === null
    },
    LEFT: {
        symbols: ['LEFT'],
        args: [
            (v) => typeof v === 'string',
            (v) => isNaN(v) === false && typeof v === 'number'
        ],
        func: (a, b) => a.substring(0, b)
    },
    LEN: {
        symbols: ['LEN'],
        args: 1,
        func: (v) => v ? v.toString().length : 0
    },
    MID: {
        symbols: ['MID'],
        args: [
            (v) => typeof v === 'string',
            (v) => isNaN(v) === false && typeof v === 'number',
            (v) => isNaN(v) === false && typeof v === 'number'
        ],
        func: (a, b, c) => a.substring(b, b + c)
    },
    RIGHT: {
        symbols: ['RIGHT'],
        args: [
            (v) => typeof v === 'string',
            (v) => isNaN(v) === false && typeof v === 'number'
        ],
        func: (a, b) => a.substring(a.length - b, a.length)
    },
    SQRT: {
        symbols: ['SQRT'],
        args: 1,
        func: (v) => Math.sqrt(v)
    },
    SUM: {
        symbols: ['SUM'],
        args: true, //true = any number of args
        func: (...values) => {
            return values.flat().reduce((pv, cv) => {
                if (isNaN(cv) === false && typeof cv === 'number') { //match google sheets, only sum numbers.
                    return pv + cv;
                }
                return pv;
            }, 0);
        }
    },
    TRUNCATE: {
        symbols: ['TRUNCATE'],
        args: 1,
        func: (v) => Math.trunc(v)
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
            if (this[o] && this[o].symbols && this[o].type) {
                if (types.length === 0 || types.indexOf(this[o].type) >= 0) {
                    r.set(o, new RegExp(
                        '^(' + this[o].symbols
                            .map(v => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
                            .join('|') +
                        ')(?:\\s|\\(|\\)|$)', 'i')
                    );
                }
            }
        }
        _cache.regexp = r;
        return r;
    }
};

export default funcs;