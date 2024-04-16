import jest from 'jest-mock';
import is from './is.js';

describe('#reset', () => {
    it('removes any prior validation messages from the prior checks.', () => {
        let z = is(123).string();
        z.reset();
        expect(z.message()).toBe('');
    });
    it('changes the value being evaluated.', () => {
        let z = is(123).string();
        expect(z.valid()).toBe(false);
        z.reset('hello');
        expect(z.valid()).toBe(true);
    });
    it('removes the "allowed" consideration', () => {
        let z = is(123).allowed(123).string();
        expect(z.valid()).toBe(true);
        z.reset();
        expect(z.string().valid()).toBe(false);
    });
    it('changes the name being evaluated.', () => {
        let z = is(123).string();
        expect(z.message()).toMatch(/^The value must/);
        z.reset(undefined, 'bob').string();
        expect(z.message()).toMatch(/^The value for "bob" must/);
    });
});

describe('#allowed', () => {
    it('allows explicit values to be marked as valid (even if they typically wouldn\'t be).', () => {
        let allowList = [true, 123, 'hiya'];
        expect(is(123).string().valid()).toBe(false);
        expect(is(123).allowed(...allowList).string().valid()).toBe(true);
        expect(is(123).string().message()).toMatch(/^The value/i);
        expect(is(123).allowed(...allowList).string().message()).toBe('');
    });
});

describe('#emailAddress', () => {
    it('generates an appropriate validation message.', () => {
        expect(is(123).emailAddress().message()).toBe('The value is not a valid e-mail address.');
        expect(is(123, 'zoo').emailAddress().message()).toBe('The value for "zoo" is not a valid e-mail address.');
    });
    it('checks if the value is a valid W3C e-mail address.', () => {
        expect(is(123).emailAddress().valid()).toBe(false);
        expect(is(true).emailAddress().valid()).toBe(false);
        expect(is(false).emailAddress().valid()).toBe(false);
        expect(is(new Date()).emailAddress().valid()).toBe(false);
        expect(is({}).emailAddress().valid()).toBe(false);
        expect(is([1, 2, 3]).emailAddress().valid()).toBe(false);
        expect(is('jjsmith_bob+123@appku.').emailAddress().valid()).toBe(false);
        expect(is('jjsmith_bob+123^appku.com').emailAddress().valid()).toBe(false);
        expect(is('jjsmith_bob+123@appku.com').emailAddress().valid()).toBe(true);
    });
});

describe('#phoneNumber', () => {
    it('generates an appropriate validation message.', () => {
        expect(is(123).phoneNumber().message()).toBe('The value is not a valid phone number.');
        expect(is(123, 'zoo').phoneNumber().message()).toBe('The value for "zoo" is not a valid phone number.');
    });
    it('checks if the value is a valid phone number without an extension.', () => {
        expect(is(123).phoneNumber().valid()).toBe(false);
        expect(is(true).phoneNumber().valid()).toBe(false);
        expect(is(false).phoneNumber().valid()).toBe(false);
        expect(is(new Date()).phoneNumber().valid()).toBe(false);
        expect(is({}).phoneNumber().valid()).toBe(false);
        expect(is([1, 2, 3]).phoneNumber().valid()).toBe(false);
        expect(is('50312345678').phoneNumber().valid()).toBe(false);
        expect(is('503=123^4567').phoneNumber().valid()).toBe(false);
        expect(is('5031234567x500').phoneNumber().valid()).toBe(false); //no extensions by default
        let validSeparators = ['', ' ', '-', '.'];
        let validCountryCodes = ['', '+1 ', '1 ', '1-', '1.', '+22 ', '22 ', '22-', '22.', '+333 ', '333 ', '333-', '333.',];
        for (let s of validSeparators) {
            for (let cc of validCountryCodes) {
                let pn = cc + '503^123^4567'.replaceAll('^', s);
                expect(is(pn).phoneNumber().valid()).toBe(true);
            }
        }
    });
    it('checks if the value is a valid phone number with an extension.', () => {
        expect(is('5031234567x500').phoneNumber().valid()).toBe(false); //no extensions by default
        let validSeparators = ['', ' ', '-', '.'];
        let validCountryCodes = ['', '+1 ', '1 ', '1-', '1.', '+22 ', '22 ', '22-', '22.', '+333 ', '333 ', '333-', '333.',];
        let validExtensions = ['x1', 'x12', 'x123', 'x1234', 'x12345'];
        for (let s of validSeparators) {
            for (let cc of validCountryCodes) {
                let pn = cc + '503^123^4567'.replaceAll('^', s);
                expect(is(pn).phoneNumber().valid()).toBe(true);
                for (let ex of validExtensions) {
                    expect(is(pn + ex).phoneNumber(true).valid()).toBe(true);
                }
            }
        }
        expect(is('5031234567 ext500').phoneNumber(true).valid()).toBe(false);
        expect(is('5031234567ex500').phoneNumber(true).valid()).toBe(false);
    });
});

describe('#postalCode', () => {
    it('generates an appropriate validation message.', () => {
        expect(is(123).postalCode().message()).toBe('The value is not a valid US postal code.');
        expect(is(123, 'zoo').postalCode().message()).toBe('The value for "zoo" is not a valid US postal code.');
    });
    it('checks if the value is a valid phone number without an extension.', () => {
        expect(is(123).postalCode().valid()).toBe(false);
        expect(is(true).postalCode().valid()).toBe(false);
        expect(is(false).postalCode().valid()).toBe(false);
        expect(is(new Date()).postalCode().valid()).toBe(false);
        expect(is({}).postalCode().valid()).toBe(false);
        expect(is([1, 2, 3]).postalCode().valid()).toBe(false);
        expect(is('50312345678').postalCode().valid()).toBe(false);
        expect(is('972221234').postalCode().valid()).toBe(false);
        expect(is('97222-34').postalCode().valid()).toBe(false);
        expect(is('97222').postalCode().valid()).toBe(true);
        expect(is('97222-1234').postalCode().valid()).toBe(true);
    });
});

describe('#length', () => {
    it('generates an appropriate validation message.', () => {
        expect(is(123).length(1, 100).message()).toBe('The value is invalid and the length cannot be verified.');
        expect(is(123, 'zoo').length(1, 100).message()).toBe('The value for "zoo" is invalid and the length cannot be verified.');
        expect(is([]).length(1, 100).message()).toBe('The value must be at least 1 (minimum) and up to 100 (maximum) items in length.');
        expect(is([], 'zoo').length(1, 100).message()).toBe('The value for "zoo" must be at least 1 (minimum) and up to 100 (maximum) items in length.');
        expect(is('').length(1, 100).message()).toBe('The value must be at least 1 (minimum) and up to 100 (maximum) characters in length.');
        expect(is('', 'zoo').length(1, 100).message()).toBe('The value for "zoo" must be at least 1 (minimum) and up to 100 (maximum) characters in length.');
        expect(is([1, 2, 3]).length(null, 2).message()).toBe('The value cannot exceed 2 items (maximum).');
        expect(is([1, 2, 3], 'zoo').length(null, 2).message()).toBe('The value for "zoo" cannot exceed 2 items (maximum).');
        expect(is('hello').length(null, 2).message()).toBe('The value cannot exceed 2 characters (maximum).');
        expect(is('hello', 'zoo').length(null, 2).message()).toBe('The value for "zoo" cannot exceed 2 characters (maximum).');
        expect(is([1, 2, 3]).length(9, null).message()).toBe('The value cannot be fewer than 9 items (minimum).');
        expect(is([1, 2, 3], 'zoo').length(9, null).message()).toBe('The value for "zoo" cannot be fewer than 9 items (minimum).');
        expect(is('hello').length(9, null).message()).toBe('The value cannot be fewer than 9 characters (minimum).');
        expect(is('hello', 'zoo').length(9, null).message()).toBe('The value for "zoo" cannot be fewer than 9 characters (minimum).');
    });
    it('checks if the value is within the min and max length.', () => {
        expect(is(123).length(1, 100).valid()).toBe(false);
        expect(is(true).length(1, 100).valid()).toBe(false);
        expect(is(false).length(1, 100).valid()).toBe(false);
        expect(is(new Date()).length(1, 100).valid()).toBe(false);
        expect(is({}).length().valid(1, 100)).toBe(false);
        expect(is([1, 2, 3]).length(5, 100).valid()).toBe(false);
        expect(is('jjsmith_bob+123@appku.').length(1, 4).valid()).toBe(false);
        expect(is([1, 2, 3]).length(2, 5).valid()).toBe(true);
        expect(is('jjsmith_bob+123@appku.').length(1, 45).valid()).toBe(true);
    });
});

describe('#range', () => {
    it('generates an appropriate validation message.', () => {
        expect(is(123).range(5, 67).message()).toBe('The value must be in range (min. 5, max. 67).');
        expect(is(123, 'zoo').range(5, 67).message()).toBe('The value for "zoo" must be in range (min. 5, max. 67).');
        expect(is(567).range(null, 67).message()).toBe('The value must be in a maximum of 67.');
        expect(is(567, 'zoo').range(null, 67).message()).toBe('The value for "zoo" must be in a maximum of 67.');
        expect(is(1).range(5, null).message()).toBe('The value must be in a minimum of 5.');
        expect(is(1, 'zoo').range(5, null).message()).toBe('The value for "zoo" must be in a minimum of 5.');
    });
    it('checks if the value is within range of the specified min and max.', () => {
        expect(is(123).range(1, 100).valid()).toBe(false);
        expect(is(true).range(1, 100).valid()).toBe(false);
        expect(is(false).range(1, 100).valid()).toBe(false);
        expect(is(new Date()).range(1, 100).valid()).toBe(false);
        expect(is({}).range().valid(1, 100)).toBe(false);
        expect(is([1, 2, 3]).range(1, 100).valid()).toBe(false);
        expect(is('jjsmith_bob+123@appku.').range(1, 100).valid()).toBe(false);
        expect(is(0).range(1, 100).valid()).toBe(false);
        expect(is(101).range(1, 100).valid()).toBe(false);
        expect(is(50).range(1, 100).valid()).toBe(true);
        expect(is(0).range(1, null).valid()).toBe(false);
        expect(is(-50).range(1, null).valid()).toBe(false);
        expect(is(50).range(1, null).valid()).toBe(true);
        expect(is(101).range(null, 100).valid()).toBe(false);
        expect(is(-50).range(null, 100).valid()).toBe(true);
        expect(is(50).range(null, 100).valid()).toBe(true);
        //check inclusivity
        expect(is(1).range(1, 100).valid()).toBe(true);
        expect(is(100).range(1, 100).valid()).toBe(true);
        expect(is(1).range(1, null).valid()).toBe(true);
        expect(is(100).range(null, 100).valid()).toBe(true);
    });
});

describe('#regexp', () => {
    it('generates an appropriate validation message.', () => {
        expect(is('zoggin').regexp(/123/i).message()).toBe('The value does not match the specified regular expression.');
        expect(is('zoggin', 'zoo').regexp(/123/i).message()).toBe('The value for "zoo" does not match the specified regular expression.');
    });
    it('checks if the value matches the specified the given regular expression.', () => {
        expect(is(123).regexp(/^hello/i).valid()).toBe(false);
        expect(is(true).regexp(/^hello/i).valid()).toBe(false);
        expect(is(false).regexp(/^hello/i).valid()).toBe(false);
        expect(is(new Date()).regexp(/^hello/i).valid()).toBe(false);
        expect(is({}).regexp(/^hello/i).valid()).toBe(false);
        expect(is([1, 2, 3]).regexp(/^hello/i).valid()).toBe(false);
        expect(is('jjsmith_bob+123@appku.').regexp(/^hello/i).valid()).toBe(false);
        expect(is('world hello').regexp(/^hello/i).valid()).toBe(false);
        expect(is('hello world').regexp(/^hello/i).valid()).toBe(true);
    });
});

describe('#required', () => {
    it('generates an appropriate validation message.', () => {
        expect(is('').required().message()).toBe('The value is required.');
        expect(is('', 'zoo').required().message()).toBe('The value for "zoo" is required.');
    });
    it('checks if the value has been included or not.', () => {
        expect(is(123).required().valid()).toBe(true);
        expect(is(true).required().valid()).toBe(true);
        expect(is(false).required().valid()).toBe(true);
        expect(is(new Date()).required().valid()).toBe(true);
        expect(is({}).required().valid()).toBe(true);
        expect(is([1, 2, 3]).required().valid()).toBe(true);
        expect(is('jjsmith_bob+123@appku.').required().valid()).toBe(true);
        for (let v of [null, undefined, [], '', ' ', '\n', '\r\n', '\t', ' \r\t \n']) {
            expect(is(v).required().valid()).toBe(false);
        }
    });
});

describe('#array', () => {
    it('generates an appropriate validation message.', () => {
        expect(is('zoggin').array().message()).toBe('The value must be an collection of items (array).');
        expect(is('zoggin', 'zoo').array().message()).toBe('The value for "zoo" must be an collection of items (array).');
    });
    it('checks if the value is an array.', () => {
        const expectedInvalid = [123, true, false, 'hello', new Date(), {}];
        for (let v of expectedInvalid) {
            expect(is(v).array().valid()).toBe(false);
        }
        const expectedValid = [[], [12, 4, 5, 'hello']];
        for (let v of expectedValid) {
            expect(is(v).array().valid()).toBe(true);
        }
    });
});

describe('#boolean', () => {
    it('generates an appropriate validation message.', () => {
        expect(is('yes').boolean().message()).toBe('The value must be a true/false value (boolean).');
        expect(is('yes', 'zoo').boolean().message()).toBe('The value for "zoo" must be a true/false value (boolean).');
    });
    it('checks if the value is a boolean.', () => {
        const expectedInvalid = [123, [], [123, 4, 5, 'hello'], 'hello', new Date(), {}];
        for (let v of expectedInvalid) {
            expect(is(v).boolean().valid()).toBe(false);
        }
        const expectedValid = [true, false];
        for (let v of expectedValid) {
            expect(is(v).boolean().valid()).toBe(true);
        }
    });
});

describe('#number', () => {
    it('generates an appropriate validation message.', () => {
        expect(is('dragon').number().message()).toBe('The value must be a number.');
        expect(is('dragon', 'zoo').number().message()).toBe('The value for "zoo" must be a number.');
    });
    it('checks if the value is a number.', () => {
        const expectedInvalid = [true, false, [], [123, 4, 5, 'hello'], 'hello', new Date(), {}];
        for (let v of expectedInvalid) {
            expect(is(v).number().valid()).toBe(false);
        }
        const expectedValid = [0, 1, 999999, 123456.7890];
        for (let v of expectedValid) {
            expect(is(v).number().valid()).toBe(true);
        }
    });
});

describe('#integer', () => {
    it('generates an appropriate validation message.', () => {
        expect(is('dragon').integer().message()).toBe('The value must be an integer.');
        expect(is('dragon', 'zoo').integer().message()).toBe('The value for "zoo" must be an integer.');
    });
    it('checks if the value is an integer.', () => {
        const expectedInvalid = [12.45, 1.000000005, -5.2, true, false, [], [123, 4, 5, 'hello'], 'hello', new Date(), {}];
        for (let v of expectedInvalid) {
            expect(is(v).integer().valid()).toBe(false);
        }
        const expectedValid = [0, 1, 999999, -123456];
        for (let v of expectedValid) {
            expect(is(v).integer().valid()).toBe(true);
        }
    });
});

describe('#string', () => {
    it('generates an appropriate validation message.', () => {
        expect(is(456).string().message()).toBe('The value must be a string.');
        expect(is(456, 'zoo').string().message()).toBe('The value for "zoo" must be a string.');
    });
    it('checks if the value is a string.', () => {
        const expectedInvalid = [12.45, 0, -5.2, true, false, [], [123, 4, 5, 'hello'], new Date(), {}];
        for (let v of expectedInvalid) {
            expect(is(v).string().valid()).toBe(false);
        }
        const expectedValid = ['', ' ', 'test'];
        for (let v of expectedValid) {
            expect(is(v).string().valid()).toBe(true);
        }
    });
});

describe('#object', () => {
    it('generates an appropriate validation message.', () => {
        expect(is(456).object().message()).toBe('The value must be an object.');
        expect(is(456, 'zoo').object().message()).toBe('The value for "zoo" must be an object.');
    });
    it('checks if the value is an object with a constructor.', () => {
        const expectedInvalid = [12.45, 0, -5.2, true, false, [], [123, 4, 5, 'hello']];
        for (let v of expectedInvalid) {
            expect(is(v).object().valid()).toBe(false);
        }
        const expectedValid = [{}, new Date()];
        for (let v of expectedValid) {
            expect(is(v).object().valid()).toBe(true);
        }
    });
});

describe('#custom', () => {
    it('generates an appropriate validation message.', () => {
        expect(is(456).custom(() => 'must be a horse.').message()).toBe('The value must be a horse.');
        expect(is(456, 'zoo').custom(() => 'must be a horse.').message()).toBe('The value for "zoo" must be a horse.');
    });
    it('runs the custom validator function and uses the result.', () => {
        let func = (v) => {
            expect(v).toBeTruthy();
            if (v > 100) {
                return 'fail i guess';
            }
        };
        expect(is(123).custom(func).message()).toBe('The value fail i guess');
        expect(is(99).custom(func).message()).toBe('');
        expect.assertions(4);
    });
});

describe('#instanceOf', () => {
    it('generates an appropriate validation message.', () => {
        expect(is(456).instanceOf(Date, Map).message()).toBe('The value must be an instance of one of the following: Date, Map.');
        expect(is(456, 'zoo').instanceOf(Date, Map).message()).toBe('The value for "zoo" must be an instance of one of the following: Date, Map.');
    });
    it('throws on invalid type string.', () => {
        expect(() => is(123).instanceOf('moose').valid()).toThrowError();
    });
    it('throws on invalid type undefined.', () => {
        expect(() => is(123).instanceOf(undefined).valid()).toThrowError();
    });
    describe('ensures that type options are checked.', () => {
        let data = [
            [123, 'number'],
            [-1.5, 'number'],
            [true, 'boolean'],
            [false, 'boolean'],
            ['yoyo', 'string'],
            ['', 'string'],
            [[], ['object', 'array']],
            [[1, 2, 3], ['object', 'array']],
            [{}, 'object'],
            [{ hi: 'yo' }, 'object'],
            [new Date(), ['object', Date]],
            [new Map(), 'object'],
        ];
        let typeTests = ['number', 'string', 'boolean', 'array', 'object', Date];
        for (let tt of typeTests) {
            it(`${tt}`, () => {
                for (let d of data) {
                    let shouldBeValid = [d[1]].flat(1).some(a => a == tt);
                    expect(is(d[0]).instanceOf(tt).valid()).toBe(shouldBeValid);
                }
            });
        }
    });

    it('Supports allowing null values in the list.', () => {
        expect(is(null).instanceOf(null).valid()).toBe(true);
        expect(is(0).instanceOf(null).valid()).toBe(false);
        expect(is(false).instanceOf(null).valid()).toBe(false);
    });
});

describe('#message', () => {
    it('outputs false if validation succeeds.', () => {
        expect(is(123).message()).toBe('');
        expect(is(123).number().message()).toBe('');
    });
    it('outputs a string message if validation fails.', () => {
        expect(typeof is(123).string().message()).toBe('string');
    });
    it('replaces the message with one specified.', () => {
        expect(is(123).string().message('fail!')).toBe('fail!');
        expect(is(123, 'taco').string().message('fail!')).toBe('fail!');
    });
    it('appends a specified message using the "append" flag.', () => {
        expect(is(123).string().message('fail!', true)).toBe('The value must be a string: fail!');
        expect(is(123, 'taco').string().message('fail!', true)).toBe('The value for "taco" must be a string: fail!');
    });
});

describe('#throw', () => {
    it('does not throw if validation succeeds.', () => {
        expect(() => is(123).throw()).not.toThrowError();
        expect(() => is(123).number().throw()).not.toThrowError();
    });
    it('throws an error if validation fails.', () => {
        expect(() => is(123).string().throw()).toThrowError();
    });
    it('replaces the message with one specified.', () => {
        expect(() => is(123).string().throw('fail!')).toThrow('fail!');
        expect(() => is(123, 'taco').string().throw('fail!')).toThrow('fail!');
    });
    it('appends a specified message using the "append" flag.', () => {
        expect(() => is(123).string().throw('fail!', true)).toThrow('The value must be a string: fail!');
        expect(() => is(123, 'taco').string().throw('fail!', true)).toThrow('The value for "taco" must be a string: fail!');
    });
});

describe('supports chaining validations.', () => {
    it('reports failure on the first validation result in the chain.', () => {
        expect(is(123).number().integer().custom((v) => '').range(200, 300).instanceOf('number').valid()).toBe(false);
        expect(is(true).boolean().custom((v) => '').instanceOf('object').valid()).toBe(false);
        expect(is('yoyo').string().custom((v) => '').instanceOf('string').regexp(/.+/i).length(9, 23).valid()).toBe(false);
        expect(is([1, 2, true]).array().custom((v) => '').instanceOf('array').length(44).valid()).toBe(false);
        expect(is(new Date()).array().instanceOf(Function).valid()).toBe(false);
        expect(is(new Map()).object().instanceOf(TypeError).valid()).toBe(false);
        //everything (should follow no-validate path after fails).
        expect(is(true)
            .custom(v => 'fail')
            .allowed()
            .array()
            .boolean()
            .custom(v => '')
            .emailAddress()
            .instanceOf()
            .integer()
            .length(1, 100)
            .number()
            .object()
            .phoneNumber()
            .postalCode()
            .range(1,100)
            .regexp(/.*/i)
            .required()
            .string()
            .valid()
        ).toBe(false);
    });
    it('reports success if all chained validations succeed.', () => {
        expect(is(123).number().integer().custom((v) => '').range(100, 200).instanceOf('number').valid()).toBe(true);
        expect(is(true).boolean().custom((v) => '').instanceOf('boolean').valid()).toBe(true);
        expect(is('yoyo').string().custom((v) => '').instanceOf('string').regexp(/.+/i).length(1, 5).valid()).toBe(true);
        expect(is([1, 2, true]).array().custom((v) => '').instanceOf('array').length(2).valid()).toBe(true);
        expect(is(new Date()).object().instanceOf(Date).valid()).toBe(true);
        expect(is(new Map()).object().instanceOf(Map).valid()).toBe(true);
    });
});