let _cache = null;

/**
 * Ops are operations that may be performed within a CalKu expression, such as comparison, math, or logic using a 
 * shorthand syntax.
 * @module
 */
const ops = {
    //logic
    AND: { type: 'logic', symbols: ['and', '&&'] },
    OR: { type: 'logic', symbols: ['or', '||'] },
    //comparative
    EQUALS: { type: 'comparative', symbols: ['eq', '=='] },
    NOTEQUALS: { type: 'comparative', symbols: ['neq', '<>', '!='] },
    ISNULL: { type: 'comparative', symbols: ['isnull'] },
    ISNOTNULL: { type: 'comparative', symbols: ['isnotnull'] },
    LESSTHAN: { type: 'comparative', symbols: ['lt', '<'] },
    LESSTHANOREQUAL: { type: 'comparative', symbols: ['lte', '<='] },
    GREATERTHAN: { type: 'comparative', symbols: ['gt', '>'] },
    GREATERTHANOREQUAL: { type: 'comparative', symbols: ['gte', '>='] },
    STARTSWITH: { type: 'comparative', symbols: ['startswith'] },
    ENDSWITH: { type: 'comparative', symbols: ['endswith'] },
    CONTAINS: { type: 'comparative', symbols: ['contains', '~~'] },
    DOESNOTCONTAIN: { type: 'comparative', symbols: ['doesnotcontain', '!~~'] },
    ISEMPTY: { type: 'comparative', symbols: ['isempty'] },
    ISNOTEMPTY: { type: 'comparative', symbols: ['isnotempty'] },
    IN: { type: 'comparative', symbols: ['in'] },
    NOTIN: { type: 'comparative', symbols: ['nin'] },
    //math
    ADDITION: { type: 'math', symbols: ['+'] },
    SUBTRACTION: { type: 'math', symbols: ['-'] },
    MULTIPLICATION: { type: 'math', symbols: ['*'] },
    DIVISION: { type: 'math', symbols: ['/'] },
    MODULO: { type: 'math', symbols: ['%'] },
    EXPONENTIATION: { type: 'math', symbols: ['^'] },

    /**
     * Converts all ops into a `RegExp` matching object for token parsing with the property as the key.
     * The regex is looking for a valid match starting with any of the appropriate operation symbols, followed
     * by whitespace, a grouping token (parenthesis), or the end of input. The first match will be the symbol matched.
     * @param {Boolean} [useCache] - Optionally specify a truthy value to use a cache of the regexes if already 
     * constructed. Omitting or specifying a falsy value will rebuild the cache.
     * @returns {Map.<String, RegExp>}
     */
    toRegExp(useCache) {
        if (useCache && _cache) {
            return _cache;
        }
        let r = new Map();
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
        _cache = r;
        return r;
    }
};

export default ops;