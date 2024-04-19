
/**
 * @see [W3C HTML5 E-mail Specification](https://html.spec.whatwg.org/multipage/input.html#valid-e-mail-address)
 */
const EmailAddressRegExp = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
const PhoneNumberRegExp = /^((\+[0-9]{1,3} )|([0-9]{1,3}[-. ]))?\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/;
const PhoneNumberWithExtRegExp = /^((\+[0-9]{1,3} )|([0-9]{1,3}[-. ]))?\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})(\s?x[0-9]{1,5})?$/;
const PostalCodeRegExp = /(^\d{5}$)|(^\d{5}-\d{4}$)/;

/**
 * Evaluate the value and output the failure message, or, if everything succeeded a `false` value.
 * @callback IsCustomValidationCallback
 * @param {*} value
 * @returns {String} Upon success, an empty string. If there is a failure, the message is returned.
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
            type: typeof value,
            allowed: false
        };

        /** @private */
        this._name = name;

        /** @private */
        this._message = null;
    }

    /**
     * Reset the validation state of the validator back to un-validated.
     * @param {*} [value] - Optional, change the value to be validated.
     * @param {String} [name] - Optional, specify the name of the value to be used in any returned failure message.
     * @returns {IsValidator}
     */
    reset(value, name) {
        if (typeof value !== 'undefined') {
            this._value.value = value;
            this._value.type = typeof value;
        }
        if (typeof name !== 'undefined') {
            this._name = name;
        }
        this._message = null;
        this._value.allowed = false;
        return this;
    }

    /**
     * Specify explicit values that are allowed to bypass all validations and report as valid.
     * 
     * @example
     * ```
     * is(123).allowed(123).string().valid();
     * //valid=true, even though 123 is a number, it's allowed through
     * ```
     * @param  {...any} values - Specify any number of values that are allowed and will not be validated.
     * @returns {IsValidator}
     */
    allowed(...values) {
        if (values.some(v => v === this._value.value)) {
            this._message = null;
            this._value.allowed = true;
        }
        return this;
    }

    /**
     * Checks if the value appears to be a W3C-valid e-mail address.
     * @see [W3C HTML5 E-mail Specification](https://html.spec.whatwg.org/multipage/input.html#valid-e-mail-address)
     * @returns {IsValidator}
     */
    emailAddress() {
        //only check and set a message if no message is already set.
        if (!this._message && (this._value.type !== 'string' || !EmailAddressRegExp.test(this._value.value))) {
            this._message = 'is not a valid e-mail address.';
        }
        return this;
    }

    /**
     * Checks if the value appears to be a valid ITU U.S. format phone number. This allows for an optional country-
     * code and separators of dashes, spaces, or periods.
     * 
     * By default, extensions are *not* allowed, but you can specify a `true` to the optional `allowExtension` flag
     * to allow an optional extension up to 5 numbers following an "x".
     * @param {Boolean} [allowExtension] - Optionally allow the user to specify an extension of up to 5 numbers.
     * @returns {IsValidator}
     */
    phoneNumber(allowExtension) {
        if (allowExtension) {
            if (!this._message && (this._value.type !== 'string' || !PhoneNumberWithExtRegExp.test(this._value.value))) {
                this._message = 'is not a valid phone number.';
            }
        } else {
            if (!this._message && (this._value.type !== 'string' || !PhoneNumberRegExp.test(this._value.value))) {
                this._message = 'is not a valid phone number.';
            }
        }
        return this;
    }

    /**
     * Checks if the value appears to be a valid U.S. postal code.
     * @returns {IsValidator}
     */
    postalCode() {
        if (!this._message && (this._value.type !== 'string' || !PostalCodeRegExp.test(this._value.value))) {
            this._message = 'is not a valid US postal code.';
        }
        return this;
    }

    /**
     * Checks if the array or string is  (inclusively) within the specified length; that is, that the length is greater 
     * than or equal to the `min` and less than or equal to the `max` value.
     * 
     * Either `min` or `max` values may be `null` to indicate a minimum or maximum is not checked.
     * 
     * To check numbers, use the `.range()` validation.
     * @param {Number} [min] - The minimum value.
     * @param {Number} [max] - The maximum value.
     * @returns {IsValidator}
     */
    length(min, max) {
        if (!this._message) {
            if (Array.isArray(this._value.value) || this._value.type === 'string') {
                let itemLabel = (this._value.type === 'string' ? 'characters' : 'items');
                if (min !== null && max !== null && (this._value.value.length < min || this._value.value.length > max)) {
                    this._message = `must be at least ${min} (minimum) and up to ${max} (maximum) ${itemLabel} in length.`;
                } else if (min === null && max !== null && this._value.value.length > max) {
                    this._message = `cannot exceed ${max} ${itemLabel} (maximum).`;
                } else if (min !== null && max === null && this._value.value.length < min) {
                    this._message = `cannot be fewer than ${min} ${itemLabel} (minimum).`;
                }
            } else {
                this._message = 'is invalid and the length cannot be verified.';
            }
        }
        return this;
    }

    /**
     * Checks if the number value is in range (inclusive); that is, that the value greater than or equal to the `min` 
     * value and less than or equal to the `max` value.
     * 
     * Either `min` or `max` values may be `null` to indicate a minimum or maximum is not checked.
     * @param {Number} [min] - The minimum value.
     * @param {Number} [max] - The maximum value.
     * @returns {IsValidator}
     */
    range(min, max) {
        if (!this._message) {
            if (min !== null && max !== null && (this._value.type !== 'number' || this._value.value < min || this._value.value > max)) {
                this._message = `must be in range (min. ${min}, max. ${max}).`;
            } else if (min === null && max !== null && (this._value.type !== 'number' || this._value.value > max)) {
                this._message = `must be in a maximum of ${max}.`;
            } else if (min !== null && max === null && (this._value.type !== 'number' || this._value.value < min)) {
                this._message = `must be in a minimum of ${min}.`;
            }
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
        if (!this._message && (this._value.type !== 'string' || !r.test(this._value.value))) {
            this._message = 'does not match the specified regular expression.';
        }
        return this;
    }

    /**
     * Validates that the value is **not**: null, undefined, an empty array, or a string containing only whitespace.
     * @returns {IsValidator}
     */
    required() {
        //only check and set a message if no message is already set.
        if (!this._message && (
            this._value.type === 'undefined'
            || this._value.value === null
            || (this._value.type === 'string' && !/\S/.test(this._value.value))
            || (Array.isArray(this._value.value) && this._value.value.length === 0)
        )) {
            this._message = 'is required.';
        }
        return this;
    }

    /**
     * Placeholder which performs no checks.
     * @returns {IsValidator}
     */
    anything() {
        return this;
    }

    /**
     * Checks if the value is an array.
     * @returns {IsValidator}
     */
    array() {
        if (!this._message && !Array.isArray(this._value.value)) {
            this._message = 'must be an collection of items (array).';
        }
        return this;
    }

    /**
     * Checks if the value is a boolean.
     * @returns {IsValidator}
     */
    boolean() {
        if (!this._message && this._value.type !== 'boolean') {
            this._message = 'must be a true/false value (boolean).';
        }
        return this;
    }

    /**
     * Checks if the value is a number.
     * @returns {IsValidator}
     */
    number() {
        if (!this._message && this._value.type !== 'number') {
            this._message = 'must be a number.';
        }
        return this;
    }

    /**
     * Checks if the value is an integer (no decimals).
     * @returns {IsValidator}
     */
    integer() {
        if (!this._message && (this._value.type !== 'number' || this._value.value !== Math.floor(this._value.value))) {
            this._message = 'must be an integer.';
        }
        return this;
    }

    /**
     * Checks if the value is a string.
     * @returns {IsValidator}
     */
    string() {
        if (!this._message && this._value.type !== 'string') {
            this._message = 'must be a string.';
        }
        return this;
    }

    /**
     * Checks if the value is an object.
     * @returns {IsValidator}
     */
    object() {
        if (!this._message && (
            Array.isArray(this._value.value)
            || this._value.type !== 'object'
            || !this._value.value?.constructor
        )) {
            this._message = 'must be an object.';
        }
        return this;
    }

    /**
     * Run a custom validation function (callback). The callback will receive a `value` argument which can be evaluated
     * and then return a failure message.
     * @param {IsCustomValidationCallback} cb - The callback function that returns `true` or `false`.
     * @returns {IsValidator}
     */
    custom(cb) {
        if (!this._message) {
            let result = cb(this._value.value);
            if (result && typeof result === 'string') {
                this._message = result;
            }
        }
        return this;
    }

    /**
     * Checks if the value is a type or instance of any of those specified. If the value matches any of the specified
     * types, it succeeds in validating.
     * 
     * @throws Error if a type is an unsupported string value: a string type specification must be either "string", 
     * "number", "boolean", "object" or "array".
     * @throws Error if any type is `undefined` (literal).
     * @param  {...any} types - Any number of types to be checked. You can also specify simplified type checking 
     * by specifying a value of `'array'`, `'boolean'`, `'number'`, `'string'`, or `'object'` instead of a type.
     * 
     * If `'array'` or `Array` is specified among other types, the array items will be checked as well (recursively).
     * @returns {IsValidator}
     */
    instanceOf(...types) {
        if (!this._message) {
            let ok = false;
            for (let t of types) {
                let typeIsString = (typeof t === 'string');
                if (typeIsString && t !== 'string' && t !== 'boolean' && t !== 'number' && t !== 'object' && t !== 'array') {
                    throw new Error(`Invalid type value. "${t}" is not a valid type string. Use a constructor object or specify "string", "boolean", "number", "object", or "array".`)
                } else if (t === undefined) {
                    throw new Error('The type "undefined" is not supported.');
                }
                if (
                    ((t === 'boolean' || t === Boolean) && this._value.type === 'boolean')
                    || ((t === 'number' || t === Number) && this._value.type === 'number')
                    || ((t === 'string' || t === String) && this._value.type === 'string')
                ) {
                    ok = true;
                    break;
                } else if ((t === 'object' || t === Object)
                    && this._value.type === 'object'
                    && this._value.value.constructor) {
                    ok = true;
                    break;
                } else if ((t === 'array' || t === Array) && Array.isArray(this._value.value)) {
                    ok = true;
                    //recursive value check only if other types specified
                    if (types.length > 1) {
                        for (let i of this._value.value) {
                            ok &= IsValidator.is(i).instanceOf(...types).valid();
                        }
                        ok = !!ok;
                    } 
                    break;
                } else if (t === null && this._value.value === null) {
                    ok = true;
                    break;
                } else if (t != null && !typeIsString && this._value.value instanceof t) {
                    ok = true;
                    break;
                }
            }
            if (ok === false) {
                this._message = `must be an instance of one of the following: ${types.map(t => typeof t === 'string' ? t : t?.name ?? 'null').join(', ')}.`;
            }
        }
        return this;
    }

    /**
     * Evaluate the results and output the failure message, or, if validations succeeded an empty string value.
     * @param {String} [text] - Optional text to use for a failure message.
     * @param {Boolean} [append=false] - Optional flag to append the custom `text` message to the auto-generated one
     * instead of overriding it.
     * @returns {String} Upon success, an empty string. If there is a failure, the message is returned.
     */
    message(text, append) {
        if (!this._value.allowed && this._message) {
            if (text && !append) {
                return text;
            } else {
                let m = 'The value ';
                if (this._name) {
                    m += `for "${this._name}" `;
                }
                m += this._message;
                if (text && append) {
                    m = m.substring(0, m.length - 1) + ': ' + text;
                }
                return m;
            }
        }
        return '';
    }

    /**
     * Evaluate the results and throw an error with the failure message, or, if validations succeeded nothing will be
     * thrown.
     * @param {String} [text] - Optional text to use for a failure message.
     * @param {Boolean} [append=false] - Optional flag to append the custom `text` message to the auto-generated one
     * instead of overriding it.
     */
    throw(text, append) {
        let result = this.message(text, append);
        if (result) {
            throw new Error(result);
        }
    }

    /**
     * Returns `true` or `false` if validation succeeded or not.
     * @returns {Boolean}
     */
    valid() {
        return (this._value.allowed || !this._message);
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
