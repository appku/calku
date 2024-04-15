import ops from './ops.js';
import funcs from './funcs.js';
import is from './is.js';

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
 * @property {Number} [order]
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
 * "10 + 6 / 2 * 55 ^ (2 % 1)" //use mathmatical operators, evaluated with proper order-of-operations
 * "10 + {person.age}" //reference object properties and use their values in the expression when evaluated
 * "(10 / 2 + 3 * ({person.count} * 2)" //use grouping with parenthesis
 * "true OR false AND true AND 123 != 54321" //use logical conditions and comparisons
 * "{person.numbers} CONTAINS 44 OR {person.numbers} STARTSWITH 10" //use comparisons with array values
 * '"The" + MID("Developer", 0, 3) + "Expert"' //Use function calls
 * 
 * //build complex expressions that mix and combine all ^ these features! Awesome!
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
     * @throws Error when the function is unknown or not supported.
     * @returns {Array.<Token>}
     * @protected
     */
    lexer() {
        /** @type {Array.<Token>} */
        let tokens = [];
        if (this.expression) {
            let input = this.expression;
            let opMap = ops.toRegExp('consolidating', 'logic', 'compare', 'math');
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
                        let argStartIndex = sub.indexOf('(');
                        openToken.type = TokenType.FuncArgumentsStart;
                        openToken.endIndex = i + argStartIndex + 1;
                        openToken.func = openToken.value;
                        if (typeof funcs[openToken.func] === 'undefined') {
                            throw new SyntaxError(`Unknown or un-supported function "${openToken.func}" "${sub}" at index ${i}.`);
                        }
                        delete openToken.value;
                        delete openToken.style;
                        //indicate start of args
                        // newToken = openToken;
                        // openToken = null;
                        i += argStartIndex; //skip past any whitespace
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
                                op: k
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
            if (token.type === TokenType.GroupStart || token.type === TokenType.FuncArgumentsStart) {
                let newGroup = null;
                if (token.type === TokenType.GroupStart) {
                    newGroup = {
                        type: TokenType.Group,
                        startIndex: token.startIndex,
                        tokens: []
                    };
                } else {
                    newGroup = {
                        type: TokenType.Func,
                        startIndex: token.startIndex,
                        func: token.func,
                        tokens: []
                    };
                }
                if (groupStack.length) {
                    //add to existing group
                    groupStack[groupStack.length - 1].tokens.push(newGroup);
                } else {
                    root.push(newGroup);
                }
                //add to the end of the stack
                groupStack.push(newGroup);
            } else if (groupStack.length && (token.type === TokenType.GroupEnd || token.type === TokenType.FuncArgumentsEnd)) {
                groupStack[groupStack.length - 1].endIndex = token.endIndex; //set the proper endIndex for the group
                groupStack.pop(); //all done
            } else if (groupStack.length) { //we're in a group
                groupStack[groupStack.length - 1].tokens.push(token);
            } else { //we're at root.
                root.push(token);
            }
        }
        //nest function call arguments
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
     * Returns an array of the distinct dot-notated object properties used within the expression (if any) given
     * the array of `Token` objects.
     * @param {Array.<Token>} [tokens] - An array of tokens to evaluate. If `undefined`, the current expression's
     * tokens will be used.
     * @returns {Array.<String>}
     * @protected
     */
    propertiesOf(tokens) {
        let props = [];
        if (typeof tokens === 'undefined') {
            //lazy load cached tokens (lexing is expensive!)
            if (!this._tokenCache) {
                this._tokenCache = this.lexer();
            }
            tokens = this._tokenCache;
        }
        //gather distinct list of props from all tokens
        for (let t of tokens) {
            if ((t.type === TokenType.Group || t.type === TokenType.Func) && t.tokens?.length) {
                //nested array of tokens, recurse into...
                let resultProps = this.propertiesOf(t.tokens);
                for (let rp of resultProps) {
                    if (props.some(v => v === rp) === false) {
                        props.push(rp);
                    }
                }
            } else if (t.type === TokenType.PropertyRef
                && t.prop
                && props.some(v => v === t.prop) === false) {
                props.push(t.prop);
            }
        }
        return props;
    }

    /**
     * Returns an array of the distinct dot-notated object properties used within the expression (if any).
     * @returns {Array.<String>}
     */
    properties() {
        return this.propertiesOf();
    }

    /**
     * Expresses a series of tokens to resolve them into a single resulting value from the target. 
     * @param {*} target - The target object containing properties and values used in the expression.
     * @param {Array.<Token>} [tokens] - An array of tokens to evaluate. If `undefined`, the current expression's
     * tokens will be used.
     * @returns {*}
     * @protected
     */
    valueOf(target, tokens) {
        let value;
        if (typeof tokens === 'undefined') {
            //lazy load cached tokens (lexing is expensive!)
            if (!this._tokenCache) {
                this._tokenCache = this.lexer();
            }
            tokens = this._tokenCache;
        }
        //only process tokens if there are tokens!
        if (tokens?.length) {
            //1. Resolve values and recurse into groups and functions to obtain values (deepest to shallowest)
            for (let token of tokens) {
                if (token.type === TokenType.Group) {
                    token.value = this.valueOf(target, token.tokens);
                } else if (token.type === TokenType.Func && token.tokens?.length) {
                    for (let argToken of token.tokens) {
                        if (argToken.type === TokenType.Group) {
                            argToken.value = this.valueOf(target, argToken.tokens);
                        }
                    }
                } else if (token.type === TokenType.PropertyRef) {
                    token.value = CalKu.valueAt(target, token.prop);
                }
            }
            //2. Resolve function calls
            for (let token of tokens) {
                if (token.type === TokenType.Func) {
                    let f = funcs[token.func];
                    let argLen = 0;
                    if (typeof f.args === 'number') {
                        argLen = f.args;
                    } else if (Array.isArray(f.args)) {
                        argLen = f.args.length;
                    } else if (f.args === true) {
                        argLen = true; //any number of arguments
                    }
                    if ((argLen === 0 || argLen === true) && !token.tokens?.length) {
                        token.value = f.func.call(target);
                    } else {
                        let args = [];
                        //split tokens by the separator
                        for (let ft of token.tokens) {
                            if (ft.type !== TokenType.Comment) {
                                args.push(ft.value);
                            }
                        }
                        if (argLen !== true && args.length !== argLen) {
                            throw new SyntaxError(`Invalid number of function arguments. Function "${token.func}" expects ${argLen}, but ${args.length} ${args.length === 1 ? 'was' : 'were'} provided.`);
                        }
                        //make function call to resolve value.
                        token.value = f.func.call(target, ...args);
                    }
                }
            }
            //3. Perform operations ("ops") to resolve values
            if (tokens.length === 1) {
                //only one token, just return it's value.
                value = tokens[0].value;
            } else {
                //walk through all top-level tokens and perform operations (in order) to net a resulting value.
                let orderedOps = ops.ordered(); //gotta respect order-of-operations.
                let consolidator = [];
                for (let token of tokens) {
                    if (token.type === TokenType.Operator) {
                        consolidator.push(token);
                    } else if (token.type !== TokenType.Comment) {
                        consolidator.push(token.value);
                    }
                }
                // console.log(`exp: ${this.expression}`);
                // console.log(`consol start: ${consolidator.join(', ')}`);
                for (let opKey of orderedOps) {
                    for (let i = 0; i < consolidator.length; i++) {
                        if ((Array.isArray(opKey) && opKey.indexOf(consolidator[i].op) > -1) || consolidator[i].op === opKey) {
                            let opToken = consolidator[i];
                            let op = ops[opToken.op];
                            if (i === 0) {
                                throw new SyntaxError(`Evaluation of operator "${opToken.symbols.join(', ')}" failed to determine a value from the expression preceding it, beginning at index ${opToken.startIndex}. An operator cannot be the first symbol of an expression.`);
                            } else if (i === consolidator.length - 1) {
                                throw new SyntaxError(`Operator "${opToken.symbols.join(', ')}" has no subsequent expression following it, at index ${opToken.startIndex}.`);
                            } else if (typeof consolidator[i + 1] === 'undefined') {
                                throw new SyntaxError(`Evaluation of operator "${opToken.symbols.join(', ')}" failed to determine a value from the expression following it, beginning at index ${opToken.startIndex}.`);
                            }
                            let preceding = consolidator[i - 1];
                            let following = consolidator[i + 1];
                            //perform validations (if any)
                            if (op.args && Array.isArray(op.args)) {
                                if (op.args.length === 1) {
                                    op.args[0](preceding).throw(`Operator "${opToken.op}" has invalid arguments.`, true);
                                }
                                if (op.args.length === 2) {
                                    op.args[1](preceding).throw(`Operator "${opToken.op}" has invalid arguments.`, true);
                                }
                                if (op.args.length > 2) {
                                    throw new Error(`Invalid operation "${opToken.op}". The operation contains more than two (2) validation operations which is invalid.`);
                                }
                            }
                            let result = op.func.call(target, preceding, following);
                            // console.log(`consol [${consolidator[i].op}]: ${consolidator.join(', ')}`);
                            //consolidate into a single value.
                            consolidator.splice(i - 1, 3, result);
                            i = 0; //reset loop to rescan for op.
                        }
                    }
                }
                if (consolidator.length === 1) {
                    value = consolidator[0];
                } else {
                    throw new SyntaxError('Unable to consolidate value from expression. The expression may be malformed.');
                }
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
        return this.valueOf(target);
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
     * Function type property values are not returned, called, or traversed by this method, though they may be included
     * as part of a returned object. Instead of a function value, a value of `undefined` will be returned.
     * 
     * @example
     * ```
     * let value = CalKu.valueAt({
     *     person: {
     *         horses: [
     *             { age: 22, name: 'professor' },
     *             { age: 18, name: 'margles' },
     *             { age: 4, name: 'whinny' },
     *         ]
     *     }
     * }, 'person.horses:1.age');
     * //value = 18
     * ```
     * @throws Error if the path is not specified or not a string.
     * @throws Error if the path contains an empty segment.
     * @throws Error if any segment in the path contains restricted keywords: "prototype", "constructor", "__proto__".
     * @param {Object} target - The object to traverse. If the target is not specified, `undefined` is returned.
     * @param {String} path - The dot-notated and indexed path to the value (property).
     * @returns {*}
     */
    static valueAt(target, path) {
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
    is
};