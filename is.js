
/**
 * @see [W3C HTML5 E-mail Specification](https://html.spec.whatwg.org/multipage/input.html#valid-e-mail-address)
 */
const EmailAddressRegExp = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

/**
 * Evaluate the value and output the failure message, or, if everything succeeded a `false` value.
 * @callback IsCheckCallback
 * @param {*} value
 * @returns {Boolean | String} Success = `false`. Failure = String message. 
 */

/**
 * Constuct validation logic through a series of chained function calls for common validations.
 * 
 * @example
 * ```
 * let result = is(123)
 *               .required()
 *               .string()
 *               .regexp(/^Hello.+/i);
 * ```
 */
class IsValidator {
    /**
     * @param {*} value - The value to be validated.
     * @param {String} [name] - Specify the name of the value to be used in any returned failure message.
     */
    constructor(value, name) {

        /** @private */
        this._value = {
            value: value,
            type: typeof value
        };

        /** @private */
        this._name = name;

        /** @private */
        this._message;
    }

    /**
     * Reset the validation state of the validator back to un-validated.
     */
    reset() {
        this._message = null;
    }

    /**
     * Checks if the value matches the regular expression.
     * @param {RegExp} r - The regular expression that tests agains the value.
     * @returns {IsValidator}
     */
    emailAddress(r) {
        //only check and set a message if no message is already set.
        if (!this._message && !EmailAddressRegExp.test(this._value.value)) {
            this._message = 'is not a valid e-mail address.';
        }
        return this;
    }

    /**
     * Checks if the number value is in range (inclusive); that is, is the value greater than or equal to the `min` 
     * value and less or equal to the `max` value.
     * @param {Number} min - The minimum value.
     * @param {Number} max - The maximum value.
     * @returns {IsValidator}
     */
    range(min, max) {
        //only check and set a message if no message is already set.
        if (!this._message && (this._value.value < min || this._value.value > max)) {
            this._message = `must be in range (min. ${min}, max. ${max}).`;
        }
        return this;
    }

    /**
     * Checks if the value matches the regular expression.
     * @param {RegExp} r - The regular expression that tests agains the value.
     * @returns {IsValidator}
     */
    regexp(r) {
        //only check and set a message if no message is already set.
        if (!this._message && !r.test(this._value.value)) {
            this._message = 'is required.';
        }
        return this;
    }

    /**
     * Checks if the value is truthy.
     * @returns {IsValidator}
     */
    required() {
        //only check and set a message if no message is already set.
        if (!this._message && !this._value.value) {
            this._message = 'is required.';
        }
        return this;
    }

    /**
     * Checks if the value is a boolean.
     * @returns {IsValidator}
     */
    boolean() {
        if (!this._message && this._value.type === 'boolean') {
            this._message = 'must be a boolean.';
        }
        return this;
    }

    /**
     * Checks if the value is a number.
     * @returns {IsValidator}
     */
    number() {
        if (!this._message && this._value.type === 'number') {
            this._message = 'must be a number.';
        }
        return this;
    }

    /**
     * Checks if the value is a string.
     * @returns {IsValidator}
     */
    string() {
        if (!this._message && this._value.type === 'string') {
            this._message = 'must be a string.';
        }
        return this;
    }

    /**
     * Checks if the value is an object.
     * @returns {IsValidator}
     */
    object() {
        if (!this._message && this._value.type === 'object' && this._value.value.constructor) {
            this._message = 'must be an object.';
        }
        return this;
    }

    /**
     * Run a custom validation function (callback). The callback will receive a `value` argument which can be evaluated
     * and then return a failure message, or, if everything succeeded a `false` value.
     * @param {IsCheckCallback} cb - The callback function that returns `true` or `false`.
     * @returns {IsValidator}
     */
    check(cb) {
        if (!this._message) {
            let result = cb(this._value.value);
            if (result) {
                this._message = result;
            }
        }
        return this;
    }

    /**
     * Checks if the value is a type or instance of any of those specified. If the value matches any of the specified
     * types, it succeeds in validating.
     * @param  {...any} types - Any number of types to be checked. You can also specify simplified type checking 
     * by specifying a value of `'boolean'`, `'number'`, `'string'`, or `'object'` instead of a type.
     * @returns {IsValidator}
     */
    instanceOf(...types) {
        if (!this._message) {
            let ok = false;
            for (let t of types) {
                if ((t === 'boolean' || t === 'number' || t === 'string') && this._value.type === t) {
                    ok = true;
                    break;
                } else if (t === 'object '
                    && this._value.type === 'object'
                    && this._value.value.constructor) {
                    ok = true;
                    break;
                } else if (this._value.value instanceof t) {
                    ok = true;
                    break;
                }
            }
            if (ok === false) {
                this._message = `must be an instance of one of the following: ${types.map(t => t.name).join(', ')}`;
            }
        }
        return this;
    }

    /**
     * Evaluate the results and output the failure message, or, if everything succeeded a `false` value.
     * @param {String} [text] - Optional text to use for a failure message.
     * @param {Boolean} [append=false] - Optional flag to append the custom `text` message to the auto-generated one
     * instead of overriding it.
     * @returns {Boolean | String} Success = `false`. Failure = String message.
     */
    message(text, append) {
        return false;
    }

    /**
     * Provides a validation input function with chainable rules that can varying in error message.
     * @example
     * is(v)
     *      .oneOf().boolean().number().special( c => c > 2)
     *      .always().required();
     * 
     * @param {*} value - The value to be validated.
     * @param {String} [name] - Specify the name of the value to be used in any returned failure message.
     * @returns {IsValidator}
     */
    static is(value, name) {
        return new IsValidator(value, name);
    }
}

export default IsValidator.is;
