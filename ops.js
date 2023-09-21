let _cache = {};

/**
 * Ops are operations that may be performed within a CalKu expression, such as comparison, math, or logic using a 
 * shorthand syntax.
 * @module
 */
const ops = {
    //Alphabetical order of operations by type. 
    //!!! If modifying this list, please try to maintain this order for readability, this will be a long list!

    //#region logic operators
    AND: {
        type: 'logic',
        symbols: ['and', '&&'],
        order: 200,
        func: (a, b) => !!(a && b)
    },
    OR: {
        type: 'logic',
        symbols: ['or', '||'],
        order: 205,
        func: (a, b) => !!(a || b)
    },
    //#endregion
    //#region comparison operators
    CONTAINS: {
        type: 'compare',
        symbols: ['contains', '~~'],
        order: 330,
        args: [
            (v) => Array.isArray(v) || typeof v === 'string' ? false : 'Must be array or text string.',
            (v) => typeof v === 'string'
                || typeof v === 'number'
                || typeof v === 'boolean' ? false : 'Must be a boolean, number, or text string.'
        ],
        func: (a, b) => {
            if (a && !a.indexOf) {
                a = a ? a.toString() : '';
            }
            return (a.indexOf(b) > -1);
        }
    },
    DOESNOTCONTAIN: {
        type: 'compare',
        symbols: ['doesnotcontain', '!~~'],
        order: 335,
        args: [
            (v) => Array.isArray(v) || typeof v === 'string' ? false : 'Must be array or text string.',
            (v) => typeof v === 'string'
                || typeof v === 'number'
                || typeof v === 'boolean' ? false : 'Must be a boolean, number, or text string.'
        ],
        func: (a, b) => {
            if (a && !a.indexOf) {
                a = a ? a.toString() : '';
            }
            return (a.indexOf(b) < 0);
        }
    },
    ENDSWITH: {
        type: 'compare',
        symbols: ['endswith'],
        order: 330,
        args: [
            (v) => Array.isArray(v) || typeof v === 'string' ? false : 'Must be array or text string.',
            (v) => typeof v === 'string'
                || typeof v === 'number'
                || typeof v === 'boolean' ? false : 'Must be a boolean, number, or text string.'
        ],
        func: (a, b) => {
            if (Array.isArray(a)) {
                return (!!a.length && a[a.length - 1] === b);
            } else if (a && !a.endsWith) {
                a = a ? a.toString() : '';
            }
            return a.endsWith(b);
        }
    },
    EQUALS: {
        type: 'compare',
        symbols: ['eq', '=='],
        order: 320,
        func: (a, b) => a === b
    },
    GREATERTHAN: {
        type: 'compare',
        symbols: ['gt', '>'],
        order: 310,
        func: (a, b) => a > b
    },
    GREATERTHANOREQUAL: {
        type: 'compare',
        symbols: ['gte', '>='],
        order: 315,
        func: (a, b) => a >= b
    },
    LESSTHAN: {
        type: 'compare',
        symbols: ['lt', '<'],
        order: 300,
        func: (a, b) => a < b
    },
    LESSTHANOREQUAL: {
        type: 'compare',
        symbols: ['lte', '<='],
        order: 305,
        func: (a, b) => a <= b
    },
    NOTEQUALS: {
        type: 'compare',
        symbols: ['neq', '<>', '!='],
        order: 325,
        func: (a, b) => a !== b
    },
    STARTSWITH: {
        type: 'compare',
        symbols: ['startswith'],
        order: 330,
        args: [
            (v) => Array.isArray(v) || typeof v === 'string' ? false : 'Must be array, text string.',
            (v) => typeof v === 'string'
                || typeof v === 'number'
                || typeof v === 'boolean' ? false : 'Must be a boolean, number, or text string.'
        ],
        func: (a, b) => {
            if (Array.isArray(a)) {
                return (!!a.length && a[0] === b);
            } else if (a && !a.startsWith) {
                a = a ? a.toString() : '';
            }
            return a.startsWith(b);
        }
    },
    //#endregion
    //#region math operators
    ADDITION: {
        type: 'math',
        symbols: ['+'],
        order: 115,
        func: (a, b) => a + b
    },
    DIVISION: {
        type: 'math',
        symbols: ['/'],
        order: 105,
        func: (a, b) => a / b
    },
    EXPONENTIATION: {
        type: 'math',
        symbols: ['^'],
        order: 10,
        func: (a, b) => a ^ b
    },
    MODULO: {
        type: 'math',
        symbols: ['%'],
        order: 110,
        func: (a, b) => a % b
    },
    MULTIPLICATION: {
        type: 'math',
        symbols: ['*'],
        order: 100,
        func: (a, b) => a * b
    },
    SUBTRACTION: {
        type: 'math',
        symbols: ['-'],
        order: 120,
        func: (a, b) => a - b
    },
    //#endregion
    //#region functions
    ABS: {
        type: 'function',
        symbols: ['ABS'],
        args: 1,
        func: (v) => Math.abs(v)
    },
    CEIL: {
        type: 'function',
        symbols: ['CEIL'],
        args: 1,
        func: (v) => Math.ceil(v)
    },
    COUNT: {
        type: 'function',
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
        type: 'function',
        symbols: ['FLOOR'],
        args: 1,
        func: (v) => Math.floor(v)
    },
    ISEMPTY: {
        type: 'function',
        symbols: ['isempty'],
        args: 1,
        func: (v) => typeof v === 'undefined' || v === null || v === ''
    },
    ISNOTEMPTY: {
        type: 'function',
        symbols: ['isnotempty'],
        args: 1,
        func: (v) => typeof v !== 'undefined' && v != null && v !== ''
    },
    ISNOTNULL: {
        type: 'function',
        symbols: ['isnotnull'],
        args: 1,
        func: (v) => v !== null
    },
    ISNULL: {
        type: 'function',
        symbols: ['isnull'],
        args: 1,
        func: (v) => v === null
    },
    LEFT: {
        type: 'function',
        symbols: ['LEFT'],
        args: [
            (v) => typeof v === 'string',
            (v) => isNaN(v) === false && typeof v === 'number'
        ],
        func: (a, b) => a.substring(0, b)
    },
    LEN: {
        type: 'function',
        symbols: ['LEN'],
        args: 1,
        func: (v) => v ? v.toString().length : 0
    },
    MID: {
        type: 'function',
        symbols: ['MID'],
        args: [
            (v) => typeof v === 'string',
            (v) => isNaN(v) === false && typeof v === 'number',
            (v) => isNaN(v) === false && typeof v === 'number'
        ],
        func: (a, b, c) => a.substring(b, b + c)
    },
    RIGHT: {
        type: 'function',
        symbols: ['RIGHT'],
        args: [
            (v) => typeof v === 'string',
            (v) => isNaN(v) === false && typeof v === 'number'
        ],
        func: (a, b) => a.substring(a.length - b, a.length)
    },
    SQRT: {
        type: 'function',
        symbols: ['SQRT'],
        args: 1,
        func: (v) => Math.sqrt(v)
    },
    SUM: {
        type: 'function',
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
        type: 'function',
        symbols: ['TRUNCATE'],
        args: 1,
        func: (v) => Math.trunc(v)
    },
    //#endregion

    /**
     * Removes cached information about ops.    
     * You should call this method if you modify the ops object (e.g. if you added, changed, or removed ops).
     */
    recycle() {
        _cache = {};
    },

    /**
     * Returns an array of all op keys in their declared order (if specified).
     * @param {...String} [types] - Optional selection of types to include in the returned array.
     * @returns {Array.<String>}
     */
    ordered(...types) {
        if (_cache && _cache.orderedKeys) {
            return _cache.orderedKeys;
        }
        let list = [];
        for (let p in this) { //build list of only ops defining objects
            if (p !== '_cache' && typeof this[p] === 'object') {
                if (types.length === 0 || types.indexOf(this[p].type) >= 0) {
                    list.push({ key: p, order: this[p].order ?? 99999 });
                }
            }
        }
        _cache.orderedKeys = list.sort((a, b) => a.order - b.order).map(i => i.key);
        return _cache.orderedKeys;
    },

    /**
     * Converts all ops into a `RegExp` matching object for token parsing with the property as the key.
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

export default ops;