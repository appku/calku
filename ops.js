import is from './is.js';

let _cache = {};

/**
 * Ops are operations that may be performed within a CalKu expression between two values (to the left and right of the
 * operation), such as logical comparisons, value comparisons, and math.
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
            (v) => is(v).instanceOf('array', 'string', null),
            (v) => is(v).instanceOf('string', 'number', 'boolean', Date, null),
        ],
        func: (a, b) => {
            if (a === null && b === null) {
                return true;
            }
            if (!a?.indexOf) {
                a = a?.toString() ?? '';
            }
            return (a.indexOf(b) > -1);
        }
    },
    DOESNOTCONTAIN: {
        type: 'compare',
        symbols: ['doesnotcontain', '!~~'],
        order: 330,
        args: [
            (v) => is(v).instanceOf('array', 'string', null),
            (v) => is(v).instanceOf('string', 'number', 'boolean', Date, null),
        ],
        func: (a, b) => {
            if (a === null && b === null) {
                return false;
            }
            if (!a?.indexOf) {
                a = a?.toString() ?? '';
            }
            return (a.indexOf(b) < 0);
        }
    },
    ENDSWITH: {
        type: 'compare',
        symbols: ['endswith'],
        order: 330,
        args: [
            (v) => is(v).instanceOf('array', 'string', null),
            (v) => is(v).instanceOf('string', 'number', 'boolean', Date, null),
        ],
        func: (a, b) => {
            if (a === null && b === null) {
                return true;
            }
            if (Array.isArray(a)) {
                return (!!a.length && a[a.length - 1] === b);
            } else if (!a?.endsWith) {
                a = a?.toString() ?? '';
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
        func: (a, b) => {
            if (typeof a !== typeof b) {
                return false;
            }
            return a > b;
        }
    },
    GREATERTHANOREQUAL: {
        type: 'compare',
        symbols: ['gte', '>='],
        order: 315,
        func: (a, b) => {
            if (typeof a !== typeof b) {
                return false;
            }
            return a >= b;
        }
    },
    LESSTHAN: {
        type: 'compare',
        symbols: ['lt', '<'],
        order: 300,
        func: (a, b) => {
            if (typeof a !== typeof b) {
                return false;
            }
            return a < b;
        }
    },
    LESSTHANOREQUAL: {
        type: 'compare',
        symbols: ['lte', '<='],
        order: 305,
        func: (a, b) => {
            if (typeof a !== typeof b) {
                return false;
            }
            return a <= b;
        }
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
            (v) => is(v).instanceOf('array', 'string', null),
            (v) => is(v).instanceOf('string', 'number', 'boolean', Date, null),
        ],
        func: (a, b) => {
            if (a === null && b === null) {
                return true;
            }
            if (Array.isArray(a)) {
                return (!!a.length && a[0] === b);
            } else if (!a?.startsWith) {
                a = a?.toString() ?? '';
            }
            return a.startsWith(b);
        }
    },
    //#endregion
    //#region math operators
    ADDITION: {
        type: 'math',
        symbols: ['+'],
        order: 120,
        args: [
            (v) => is(v).instanceOf('number', 'boolean', null),
            (v) => is(v).instanceOf('number', 'boolean', null)
        ],
        func: (a, b) => {
            return a + b;
        }
    },
    DIVISION: {
        type: 'math',
        symbols: ['/'],
        order: 100,
        args: [
            (v) => is(v).instanceOf('number', 'boolean', null),
            (v) => is(v).instanceOf('number', 'boolean', null)
        ],
        func: (a, b) => a / b
    },
    EXPONENTIATION: {
        type: 'math',
        symbols: ['^'],
        order: 50,
        args: [
            (v) => is(v).instanceOf('number', 'boolean', null),
            (v) => is(v).instanceOf('number', 'boolean', null)
        ],
        func: (a, b) => a ** b
    },
    MODULO: {
        type: 'math',
        symbols: ['%'],
        order: 100,
        args: [
            (v) => is(v).instanceOf('number', 'boolean', null),
            (v) => is(v).instanceOf('number', 'boolean', null)
        ],
        func: (a, b) => a % b
    },
    MULTIPLICATION: {
        type: 'math',
        symbols: ['*'],
        order: 100,
        args: [
            (v) => is(v).instanceOf('number', 'boolean', null),
            (v) => is(v).instanceOf('number', 'boolean', null)
        ],
        func: (a, b) => (a ?? 0) * (b ?? 0)
    },
    SUBTRACTION: {
        type: 'math',
        symbols: ['-'],
        order: 120,
        args: [
            (v) => is(v).instanceOf('number', 'boolean', null),
            (v) => is(v).instanceOf('number', 'boolean', null)
        ],
        func: (a, b) => (a ?? 0) - (b ?? 0)
    },
    //#endregion
    //#region consolidate operations
    CONCATENATE: {
        type: 'consolidate',
        symbols: ['&'],
        args: [
            (v) => is(v).instanceOf('string', 'number', 'boolean', Date, null),
            (v) => is(v).instanceOf('string', 'number', 'boolean', Date, null),
        ],
        func: (a, b) => {
            return (a != null ? a : '').toString() + (b != null ? b : '').toString();
        }
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
     * Returns an array of all op keys in their declared order (if specified). If keys have orders that are the same,
     * an Array is returned.
     * @returns {Array.<String> | Array.<Array.<String>>}
     */
    ordered() {
        if (!_cache.orderedKeys) {
            let list = [];
            for (let p in this) { //build list of only ops defining objects
                if (this[p] && this[p].symbols && this[p].type) {
                    let existing = list.find(v => v.order === this[p].order);
                    if (existing) {
                        if (Array.isArray(existing.key) === false) {
                            existing.key = [existing.key];
                        }
                        existing.key.push(p);
                    } else {
                        list.push({ key: p, order: this[p].order ?? 99999 });
                    }
                }
            }
            _cache.orderedKeys = list.sort((a, b) => a.order - b.order).map(i => i.key);
        }
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
        let r = _cache.regexp;
        if (!_cache.regexp) {
            //build map of all
            r = new Map();
            for (let o in this) {
                if (this[o] && this[o].symbols && this[o].type) {
                    r.set(o, new RegExp(
                        '^(' + this[o].symbols
                            .map(v => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
                            .join('|') +
                        ')(?:\\s|\\(|\\)|$)', 'i')
                    );
                }
            }
            _cache.regexp = r;
        }
        //prep type constrained map
        if (types.length > 0) {
            r = new Map();
            for (let [k, v] of _cache.regexp) {
                if (types.indexOf(this[k].type) >= 0) {
                    r.set(k, v);
                }
            }
        }
        return r;
    }
};

export default ops;