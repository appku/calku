import ops from './ops.js';

/**
 * A regular expression to check for a reasonable ISO8601 format date.
 * YYYY-MM-DDThh:mm
 * YYYY-MM-DDThh:mmTZD
 * YYYY-MM-DDThh:mm:ss
 * YYYY-MM-DDThh:mm:ssTZD
 * YYYY-MM-DDThh:mm:ss.s
 * YYYY-MM-DDThh:mm:ss.sTZD
 * @see: https://www.w3.org/TR/NOTE-datetime
 * @type {RegExp}
 */
const ISO8601Date = /^\d{4}-\d\d-\d\d((T\d\d:\d\d(:\d\d(\.\d+)?)?(([+-]\d\d:\d\d)|Z)?)?|(( GMT[+-]\d\d:\d\d)|Z)?)$/i;
const USAppKuStandardDate = /^\d{1,2}\/\d{1,2}\/(\d{4}|\d\d)( \d{1,2}:\d{1,2}(:\d{1,2}(\.\d{1,3})?)?( ?(AM|PM)))?(( GMT[+-]\d\d:\d\d)|Z)?$/i;

/**
 * @enum {String}
 */
const TokenType = {
    Group: 'group', //nested tokens (post-processing)
    GroupStart: 'group-start', //(
    GroupEnd: 'group-end', //)
    Operator: 'op',
    Literal: 'literal', //1, "hello", 'mars', true
    PropertyRef: 'prop-ref', //{First_Name}
    Func: 'func', //COUNT, AVG, etc.
    FuncArgumentsStart: 'func-arg-start', //(
    FuncArgumentsEnd: 'func-arg-end', //)
    FuncArgumentsSeparator: 'func-arg-sep', //,
    Comment: 'comment' //// a note for my fellow CalKuers.
};

/**
 * @typedef Token
 * @property {TokenType} type
 * @property {Number} startIndex
 * @property {Number} endIndex
 * @property {String} [style]
 * @property {String} [value]
 */

/**
 * CalKu is an expression engine that gives users the ability to write textual operations, comparisons, and function
 * calls that can evaluate against any 0..N-number of object(s).
 * 
 * The expression is evaluated upon call to the `.value` or `.values` functions.
 * 
 * Expressions can reference properties and sub-object properties through a dot-style notation, or can
 * omit object-specific references entirely and then evaluate without an object.
 * 
 * @example
 * "10 + (6 / 2)" //evaluates to 13 whether an object was targetted or not.
 * "10 + {person.age}" //references an object property and will error out if no object is specified.
 */
class CalKu {
    /**
     * Creates a new CalKu instance representing a target and expression.
     * @param {String} expression - The CalKu expression to be parsed.
     * @param {String} [timeZone] - The timezone to apply for dates in the expression (if they don't specify a 
     * timezone). If not specified, dates will be assumed to be in GMT time. The value must be an internationally
     * recognized timezone string. See [this list on wikipedia](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones).
     */
    constructor(expression, timeZone) {

        /**
         * @type {Intl.ResolvedDateTimeFormatOptions & {offset:String}}
         * @private
         */
        this._timeZone = null;

        /**
         * @type {String}
         * @private
         */
        this._expression = null;

        /**
         * @type {Array.<Token>}
         * @private
         */
        this._tokenCache = null;

        //init
        this.timeZone = timeZone;
        this.expression = expression;
    }

    /**
     * The CalKu expression to be parsed.
     * @type {String}
     */
    get expression() {
        return this._expression ?? null;
    }

    /**
     * @param {String} value - The value to be set on the `expression` property.
     */
    set expression(value) {
        this._expression = value;
        this._tokenCache = null; //expression changed, store cache next time.
    }

    /**
     * The timezone setting for dates found in the expression (that don't already have a timezone specified).
     * Must be an internationally recognized timezone string. If unknown or not specified, the default UTC
     * interpolation will be used.
     * @see `Intl.supportedValuesOf('timeZone')`
     * @see https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
     * @type {String}
     */
    get timeZone() {
        return this._timeZone?.timeZone ?? null;
    }

    /**
     * @param {String} value -  The value to be set on the `timeZone` property.
     */
    set timeZone(value) {
        let opts = null;
        if (value) {
            let fmt = Intl.DateTimeFormat([], { timeZone: value, timeZoneName: 'longOffset' });
            let val = fmt.format(new Date());
            let result = val.match(/GMT([+-].+)?/i);
            opts = fmt.resolvedOptions();
            if (!result || result.length === 0 || !result[1]) {
                opts.offset = '+00:00';
            } else {
                opts.offset = result[1];
            }
        }
        this._timeZone = opts;
    }

    /**
     * Parses the expression text into lexical tokens. If the syntax of the expression cannot be parsed, an error will
     * be thrown. The tokens are sequential, as ordered from the expression text. 
     * These tokens are not evaluated, so they may express a valid or invalid expression.
     * @throws Error when the expression syntax is invalid.
     * @returns {Array.<Token>}
     * @protected
     */
    lexer() {
        /** @type {Array.<Token>} */
        let tokens = [];
        if (this.expression) {
            let input = this.expression;
            let opMap = ops.toRegExp('logic', 'compare', 'math');
            let openToken = null; //if this is present, it's a token that is building up it's context over multiple chars
            let openGroupingStack = []; //stores the "starting" token types discovered and still unclosed.
            //evaluate the expression one char at a time to build a sequential list of tokens
            //which can then be further evaluated, parsed, and executed.
            for (let i = 0; i < input.length; i++) {
                let newToken = null;
                let sub = input.substring(i);
                if (openToken && openToken.type === TokenType.PropertyRef) {
                    openToken.value += input[i];
                    openToken.endIndex = i + 1;
                    if (input[i] === '}' && input[i - 1] !== '\\') { //close property ref
                        openToken.prop = openToken.value.substring(1, openToken.value.length - 1);
                        openToken = null;
                    }
                } else if (openToken && openToken.type === TokenType.Comment) {
                    if (input[i] === '\n') {
                        openToken = null;
                    } else {
                        openToken.value += input[i];
                        openToken.endIndex = i + 1;
                    }
                } else if (openToken && openToken.type === TokenType.Literal) {
                    if (input[i] === '\\' && input[i + 1] === '"') { //double-escaped quote
                        openToken.value += input[i + 1];
                        i++; //skip next char
                    } else if (openToken.style === 'naked' && /^\s*\(/.test(sub)) { //looks like a function call
                        //convert from literal to function token
                        openToken.type = TokenType.Func;
                        openToken.endIndex = i;
                        delete openToken.style;
                        //indicate start of args
                        let argStartIndex = sub.indexOf('(');
                        newToken = {
                            type: TokenType.FuncArgumentsStart,
                            startIndex: i + argStartIndex,
                            endIndex: i + argStartIndex + 1
                        };
                        i += argStartIndex; //skip past any whitespace
                        openToken = null;
                        openGroupingStack.push(TokenType.FuncArgumentsStart);
                    } else if (openToken.style === 'naked' && /\s|\(|\)|\{|\}/i.test(input[i])) {
                        openToken.endIndex = i;
                        openToken = null;
                        i--; //need to walk back (-1) on this after closing as it may be a actionable char
                    } else if (
                        openToken.style === 'naked'
                        && input[i - 1] !== '\\'
                        && input[i] === ','
                        && openGroupingStack.length
                        && openGroupingStack[openGroupingStack.length - 1] === TokenType.FuncArgumentsStart) {
                        openToken.endIndex = i;
                        openToken = null;
                        newToken = {
                            type: TokenType.FuncArgumentsSeparator,
                            startIndex: i,
                            endIndex: i + 1
                        };
                    } else if (openToken.style === 'quoted' && input[i - 1] !== '\\' && input[i] === '"') { //terminate string
                        openToken.endIndex = i;
                        openToken = null;
                    } else {
                        openToken.value += input[i];
                        openToken.endIndex = i + 1;
                    }
                } else if (input[i] === '(') { //new group detected
                    newToken = {
                        type: TokenType.GroupStart,
                        startIndex: i,
                        endIndex: i + 1
                    };
                    openGroupingStack.push(TokenType.GroupStart);
                } else if (input[i] === ')') { //end of group (or function args) detected
                    let expectedTokenType = null;
                    let lastGroupingToken = openGroupingStack.pop();
                    if (lastGroupingToken === TokenType.GroupStart) {
                        expectedTokenType = TokenType.GroupEnd;
                    } else {
                        expectedTokenType = TokenType.FuncArgumentsEnd;
                    }
                    newToken = {
                        type: expectedTokenType,
                        startIndex: i,
                        endIndex: i + 1
                    };
                } else if (input[i] === '{') { //start of a property reference
                    newToken = {
                        type: TokenType.PropertyRef,
                        startIndex: i,
                        endIndex: i + 1,
                        value: input[i]
                    };
                    openToken = newToken;
                } else if (input[i] === '/' && input[i + 1] === '/') { //line comment
                    newToken = {
                        type: TokenType.Comment,
                        startIndex: i + 2,
                        endIndex: i + 3,
                        value: ''
                    };
                    openToken = newToken;
                } else if (
                    input[i - 1] !== '\\'
                    && input[i] === ','
                    && openGroupingStack.length
                    && openGroupingStack[openGroupingStack.length - 1] === TokenType.FuncArgumentsStart) {
                    newToken = {
                        type: TokenType.FuncArgumentsSeparator,
                        startIndex: i,
                        endIndex: i + 1
                    };
                } else if (/\s/.test(input[i]) === false) { //anything else that isn't whitespace.
                    //determine if op
                    for (let [k, r] of opMap) {
                        let m = input.substring(i).match(r);
                        if (m && m[1]) {
                            newToken = {
                                type: TokenType.Operator,
                                startIndex: i,
                                endIndex: i + m[1].length,
                                op: k,
                                value: {
                                    type: ops[k].type,
                                    symbols: ops[k].symbols
                                }
                            };
                            i += m[1].length - 1;
                            break;
                        }
                    }
                    //determine literal value
                    if (!newToken) {
                        newToken = {
                            type: TokenType.Literal,
                            startIndex: i,
                            value: input[i]
                        };
                        if (input[i] === '"') {
                            newToken.style = 'quoted';
                            newToken.startIndex = i + 1; //we skip over the quote
                            newToken.value = '';
                        } else {
                            newToken.style = 'naked';
                        }
                        openToken = newToken;
                    }
                }
                //push new token to array
                if (newToken) {
                    tokens.push(newToken);
                }
            }
        }
        //post lexing value parse
        for (let token of tokens) {
            if (token.type === TokenType.Literal) {
                token.value = this.valueParse(token.value, token.style);
            }
        }
        //nest sequential tokens under group(ed) tokens.
        let root = []; //the root array of the token tree
        let groupStack = []; //the stack of ongoing groups in the tree.
        for (let i = 0; i < tokens.length; i++) {
            let token = tokens[i];
            if (token.type === TokenType.GroupStart) {
                let newGroup = {
                    type: TokenType.Group,
                    startIndex: token.startIndex,
                    value: []
                };
                if (groupStack.length) {
                    //add to existing group
                    groupStack[groupStack.length - 1].value.push(newGroup);
                } else {
                    root.push(newGroup);
                }
                //add to the end of the stack
                groupStack.push(newGroup);

            } else if (groupStack.length && token.type === TokenType.GroupEnd) {
                groupStack[groupStack.length - 1].endIndex = token.endIndex; //set the proper endIndex for the group
                groupStack.pop(); //all done
                // throw new Error(`Invalid expression: A group (using parenthesis) was terminated ")" but was never opened.`);
            } else if (groupStack.length) { //we're in a group
                let g = groupStack[groupStack.length - 1].value;
                g.push(token);
            } else { //we're at root.
                root.push(token);
            }
        }
        //all done
        return root;
    }

    /**
     * Parses a singlular supported string representation of a value into a typed value, either a Number, String, 
     * Date (from ISO8601, full), Boolean, or Array of those values. This method will remove outermost double or 
     * single quotes if found on a String value.
     * @throws SyntaxError if there is an outermost starting or ending single or double quote without the opposite.
     * @param {String} value - the value to be parsed.
     * @param {String} [hint] - a hint helping the parser better understand the value. Can be "quoted", "array", or 
     * "naked" (which is essentially an unknown type of value)
     * @returns {Number|String|Date|Boolean|Array}
     * @protected
     */
    valueParse(value, hint) {
        if (value && typeof value === 'string') {
            if (hint === 'quoted') {
                return value; //stop processing if a quoted string.
            } else if (/^-?\d*(\.\d+)?$/.test(value)) {
                let tryValue = parseFloat(value);
                if (isNaN(tryValue) === false) {
                    return tryValue;
                }
            } else if (/^true$/i.test(value)) {
                return true;
            } else if (/^false$/i.test(value)) {
                return false;
            } else if (/^null$/i.test(value)) {
                return null;
            } else if (/^undefined$/i.test(value)) {
                return undefined;
            } else if (ISO8601Date.test(value) || USAppKuStandardDate.test(value)) {
                if (/([+-]\d\d:\d\d)|Z$/.test(value) === false) { //no timezone, so adjust if needed.
                    if (value.indexOf('T') === -1) {
                        value += (this._timeZone ? ' GMT' : ' ');
                    }
                    if (this._timeZone?.offset) {
                        value += this._timeZone.offset;
                    } else {
                        value += 'Z';
                    }
                }
                return new Date(value);
            }
        }
        return value;
    }

    /**
     * Returns an array of the distinct dot-notated object properties used within the expression (if any).
     * @returns {Array.<String>}
     */
    properties() {
        //lazy load cached tokens (lexing is expensive!)
        if (!this._tokenCache) {
            this._tokenCache = this.lexer();
        }
        let props = [];
        let tokens = this._tokenCache;
        for (let t of tokens) {
            if (t.type === TokenType.PropertyRef
                && t.prop
                && props.some(v => v === t.prop) === false) {
                props.push(t.prop);
            }
        }
        return props;
    }

    /**
     * Expresses a series of tokens to resolve them into a single resulting value from the target. 
     * @param {*} target - The target object containing properties and values used in the expression.
     * @param {Array.<Token>} tokens - The tokens to be expressed into a resulting value.
     * @returns {*}
     * @protected
     */
    express(target, tokens) {
        let value;
        //loop tokens to discover any operators in order...
        //resolve them into a value...
        //and continue scanning.
        for (let token of tokens) {
            if (token.type === TokenType.Group) {
                this.express(target, token.value);
            }
        }
        return value;
    }

    /**
     * Retrieve the evaluated value from the CalKu expression. If there is an error processing the expression, it
     * will be returned (*not* thrown).
     * @param {Object} target - The target object containing properties and values used in the expression.
     * @returns {String | Number | Date | Boolean | Error}
     */
    value(target) {
        //lazy load cached tokens (lexing is expensive!)
        if (!this._tokenCache) {
            try {
                this._tokenCache = this.lexer();
            } catch (err) {
                return err;
            }
        }
        //evaluate expression
        return this.express(target, this._tokenCache);
    }

    /**
     * Retrieve the evaluated values for each target from the CalKu expression. If there is an error processing
     * the expression, it will be returned (*not* thrown).
     * @param {Array} targets - The target objects containing properties and values used in the expression.
     * @returns {Array.<String | Number | Date | Boolean | Object | Error>}
     */
    values(targets) {
        let output = [];
        for (let t of targets) {
            output.push(this.value(t));
        }
        return output;
    }

    /**
     * Retrieve the calculated value from the given expression as applied to the specified target.
     * @param {String} expression - The CalKu expression text.
     * @param {Object} target - The target object containing properties and values used in the expression.
     * @param {String} [timeZone] - The timezone to apply for dates in the expression (if they don't specify a 
     * timezone). If not specified, dates will be assumed to be in GMT time. The value must be an internationally
     * recognized timezone string. See [this list on wikipedia](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones).
     * @returns {String | Number | Date | Boolean}
     */
    static value(expression, target, timeZone) {
        return new CalKu(expression, timeZone).value(target);
    }

    /**
     * Retrieve the calculated value from the given expression as applied to the specified target.
     * @param {String} expression - The CalKu expression text.
     * @param {Array.<Object>} targets - The target objects containing properties and values used in the expression.
     * @param {String} [timeZone] - The timezone to apply for dates in the expression (if they don't specify a 
     * timezone). If not specified, dates will be assumed to be in GMT time. The value must be an internationally
     * recognized timezone string. See [this list on wikipedia](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones).
     * @returns {String | Number | Date | Boolean}
     */
    static values(expression, targets, timeZone) {
        return new CalKu(expression, timeZone).values(targets);
    }

    /**
     * Extracts value from the `target` object by traversing the dot-notated and indexed `path` to locate the 
     * appropriate value in a complex object.
     * 
     * - A dot "." indicates traversal into a (sub-)object property.
     * - A colon ":" followed by a 0...n number indicates an array index.
     * 
     * If the path cannot be fully traversed, an `undefined` value is returned.
     * 
     * Function property values are not returned, called, or traversed by this method, though they may be included
     * as part of a returned object. Instead of a function value, a value of `undefined` will be returned.
     * 
     * @example
     * ```
     * let value = CalKu.valueAt('person.horses:1.age', {
     *     person: {
     *         horses: [
     *             { age: 22, name: 'professor' },
     *             { age: 18, name: 'margles' },
     *             { age: 4, name: 'whinny' },
     *         ]
     *     }
     * });
     * //value = 18
     * ```
     * @throws Error if the path is not specified or not a string.
     * @throws Error if the path contains an empty segment.
     * @throws Error if any segment in the path contains restricted keywords: "prototype", "constructor", "__proto__".
     * @param {String} path - The dot-notated and indexed path to the value (property).
     * @param {Object} target - The object to traverse. If the target is not specified, `undefined` is returned.
     * @returns {*}
     */
    static valueAt(path, target) {
        if (!path || typeof path !== 'string') {
            throw new Error('Invalid path to property. A text string path is required.');
        }
        if (typeof target !== 'undefined' && target != null) {
            let parts = path.split(/\.|:/);
            let val = target;
            for (let i = 0; i < parts.length; i++) {
                let segment = parts[i];
                if (segment === 'prototype' || segment === 'constructor' || segment === '__proto__') {
                    throw new Error(`Invalid path to property. The path contains an invalid segment at position ${i} ("${segment}").`);
                } else if (segment.length) {
                    let vtype = typeof val[segment];
                    if (vtype !== 'undefined' && vtype !== 'function') {
                        val = val[segment];
                        if (i < parts.length - 1 && val === null) {
                            return undefined; //found a null value before the path completes.
                        }
                    } else {
                        return undefined;
                    }
                } else {
                    throw new Error(`Invalid path to property. The path contains an empty segment at position ${i}.`);
                }
            }
            return val;
        }
        return undefined;
    }
}

export {
    CalKu as default,
    TokenType,
    ops as Operations,
    //funcs as Funcs
};