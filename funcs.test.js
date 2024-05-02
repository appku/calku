import jest from 'jest-mock';
import funcs from './funcs.js';
import is from './is.js';
import utilities from './test/utilities.js';

describe('#toRegExp', () => {
    it('ignore properties on funcs that are missing symbols.', () => {
        let map = funcs.toRegExp();
        expect(map.has('toRegExp')).toBe(false);
        expect(map.has('recycle')).toBe(false);
        for (let [k, _] of map) {
            expect(Array.isArray(funcs[k].symbols)).toBe(true);
        }
    });
    it('provides matching regular expressions for symbols that may be encountered.', () => {
        let map = funcs.toRegExp();
        for (let [k, r] of map) {
            for (let s of funcs[k].symbols) {
                expect(r.test(s)).toBe(true);
                expect(r.test(s + ' ')).toBe(true);
            }
        }
    });
    it('calls are cached until recycled', () => {
        let clone = utilities.structuredClone(funcs);
        let original = clone.toRegExp();
        clone.NEWTHING = { type: 'function', symbols: ['NEWTHING'], params: true, func: () => { } };
        expect(clone.toRegExp().size).toBe(original.size);
        clone.recycle();
        expect(clone.toRegExp().size).not.toBe(original.size);
    });
});

describe('#argsValid', () => {
    it('throws when the func argument is invalid object.', () => {
        expect(() => funcs.argsValid(null, [], false)).toThrow();
        expect(() => funcs.argsValid('hello', [], false)).toThrow();
        expect(() => funcs.argsValid({}, [], true)).toThrow();
    });
    it('throws when the func argument is an invalid key.', () => {
        expect(() => funcs.argsValid('TACO', [], false)).toThrow();
        expect(() => funcs.argsValid('abc123', [], true)).toThrow();
    });
    it('throws when the func definition has multiple spread parameters.', () => {
        expect(() => funcs.argsValid('TACO', [], false)).toThrow();
    });
    it('throws when a func parameter list contains multiple spreads.', () => {
        let testFuncs = utilities.structuredClone(funcs);
        testFuncs.BOGUS = {
            symbols: ['BOGUS'],
            params: [
                {
                    spread: true,
                    validator: (v) => is(v).anything()
                },
                {
                    spread: true,
                    validator: (v) => is(v).anything()
                }
            ],
            func: (v) => v
        };
        expect(() => testFuncs.argsValid('BOGUS', [], false)).toThrow();
    });
    it('throws when a func parameter is an invalid type.', () => {
        let testFuncs = utilities.structuredClone(funcs);
        testFuncs.BOGUS = {
            symbols: ['BOGUS'],
            params: [
                {
                    spread: true,
                    validator: (v) => is(v).anything()
                },
                new Date()
            ],
            func: (v) => v
        };
        expect(() => testFuncs.argsValid('BOGUS', [], false)).toThrow();
    });
    it('throws when a func parameter validator is an invalid type.', () => {
        let testFuncs = utilities.structuredClone(funcs);
        testFuncs.BOGUS = {
            symbols: ['BOGUS'],
            params: [
                {
                    spread: true,
                    validator: 'taco'
                }
            ],
            func: (v) => v
        };
        expect(() => testFuncs.argsValid('BOGUS', ['hi'], true)).toThrow(/A parameter validator used/);
    });
    it('throws or returns based on throwError argument for failed validation checks.', () => {
        expect(() => funcs.argsValid('SUM', [1, new Date()], false)).not.toThrow();
        expect(funcs.argsValid('SUM', [1, new Date()], false)).toBe(false);
    });
    it('throws or returns if the minimum number of parameter arguments are not present.', () => {
        expect(funcs.argsValid('SUM', [], false)).toBe(false);
        expect(funcs.argsValid('TEXTJOIN', [','], false)).toBe(false);
        expect(funcs.argsValid('TEXTJOIN', [',', true], false)).toBe(false);
        expect(() => funcs.argsValid('TEXTJOIN', [','], true)).toThrow();
        expect(() => funcs.argsValid('TEXTJOIN', [',', true], true)).toThrow();
    });
    it('checks the number of arguments are valid.', () => {
        let samples = [
            {
                symbols: ['TEST'],
                params: 1,
                func: () => true
            },
            {
                symbols: ['TEST'],
                params: {
                    validator: () => is().anything()
                },
                func: () => true
            },
            {
                symbols: ['TEST'],
                params: [{
                    validator: () => is().anything()
                }],
                func: () => true
            }
        ];
        for (let sample of samples) {
            expect(funcs.argsValid(sample, [], false)).toBe(false);
            expect(funcs.argsValid(sample, [1], false)).toBe(true);
            expect(() => funcs.argsValid(sample, [], true)).toThrow();
            expect(() => funcs.argsValid(sample, [1], true)).not.toThrow();
        }
    });
});

it('has no duplicate symbols.', () => {
    let symbols = [];
    for (let p in funcs) { //build list of only funcs defining objects
        if (p !== '_cache' && typeof funcs[p] === 'object' && funcs[p].symbols) {
            for (let s of funcs[p].symbols) {
                expect(symbols.indexOf(s)).toBeLessThan(0);
                symbols.push(s);
            }
        }
    }
});

describe('funcs validate arguments and funcs execute with expected results.', () => {
    let tests = [
        //keep alphabetical by func please!
        {
            func: funcs.ABS,
            samples: [
                [true, 1],
                [false, 0],
                [null, 0],
                ['', Error],
                [123, 123],
                [-14214, 14214],
                [1.2554, 1.2554],
                [-1.2554, 1.2554],
                [1, 2, 3, Error],
                [1, 2.5, -1.5, Error],
                [3, [4, 5], 6, Error],
                [3, [4, 5, [true, 2.4]], 6, Error],
                ['hello', Error],
                [new Date(), Error],
                [{ lit: 'eral' }, Error]
            ]
        },
        {
            func: funcs.AVERAGE,
            samples: [
                [[], 0],
                [true, 1],
                [false, 0],
                [null, 0],
                ['', Error],
                [123, 123],
                [-14214, -14214],
                [1.2554, 1.2554],
                [-1.2554, -1.2554],
                [1, 2, 3, 2],
                [1, 2.5, -1.5, 0.66666666],
                [3, [4, 5], 6, 4.5],
                [3, [4, 5, [true, 2.4]], 6, 3.5666],
                ['hello', Error],
                [new Date(), Error],
                [{ lit: 'eral' }, Error]
            ]
        },
        {
            func: funcs.CEIL,
            samples: [
                [true, 1],
                [false, 0],
                [null, 0],
                ['', Error],
                [123, 123],
                [-14214, -14214],
                [1.2554, 2],
                [-1.2554, -1],
                [1, 2, 3, Error],
                [1, 2.5, -1.5, Error],
                [3, [4, 5], 6, Error],
                [3, [4, 5, [true, 2.4]], 6, Error],
                ['hello', Error],
                [new Date(), Error],
                [{ lit: 'eral' }, Error]
            ]
        },
        {
            func: funcs.COUNT,
            samples: [
                [true, 1],
                [false, 1],
                [null, 0],
                ['', Error],
                [123, 1],
                [-14214, 1],
                [1.2554, 1],
                [-1.2554, 1],
                [1, 2, 3, 3],
                [1, 2.5, -1.5, 3],
                [3, [4, 5], 6, 4],
                [3, [4, 5, [true, 2.4]], 6, 6],
                ['hello', Error],
                [new Date(), Error],
                [{ lit: 'eral' }, Error]
            ]
        },
        {
            func: funcs.FLOOR,
            samples: [
                [true, 1],
                [false, 0],
                [null, 0],
                ['', Error],
                [123, 123],
                [-14214, -14214],
                [1.2554, 1],
                [-1.2554, -2],
                [1, 2, 3, Error],
                [1, 2.5, -1.5, Error],
                [3, [4, 5], 6, Error],
                [3, [4, 5, [true, 2.4]], 6, Error],
                ['hello', Error],
                [new Date(), Error],
                [{ lit: 'eral' }, Error]
            ]
        },
        {
            func: funcs.HELLOWORLD,
            samples: [
                ['Hello world.'],
                [true, Error],
                [false, Error],
                [null, Error],
                ['', Error],
                [123, Error],
                [-14214, Error],
                [1.2554, Error],
                [-1.2554, Error],
                [1, 2, 3, Error],
                [1, 2.5, -1.5, Error],
                [3, [4, 5], 6, Error],
                [3, [4, 5, [true, 2.4]], 6, Error],
                ['hello', Error],
                [new Date(), Error],
                [{ lit: 'eral' }, Error]
            ]
        },
        {
            func: funcs.IF,
            samples: [
                [true, 1, 2, 1],
                [false, 1, 2, 2],
                [true, 'abc', 123, 'abc'],
                [false, 'abc', 123, 123],
                [null, Error],
                ['', Error],
                [123, Error],
                [-14214, Error],
                [1.2554, Error],
                [-1.2554, Error],
                [1, 2, 3, Error],
                [1, 2.5, -1.5, Error],
                [3, [4, 5], 6, Error],
                [3, [4, 5, [true, 2.4]], 6, Error],
                ['hello', Error],
                [new Date(), Error],
                [{ lit: 'eral' }, Error]
            ]
        },
        {
            func: funcs.ISARRAY,
            samples: [
                [true, false],
                [false, false],
                [null, false],
                ['', false],
                [123, false],
                [-14214, false],
                [1.2554, false],
                [-1.2554, false],
                [1, 2, 3, Error],
                [1, 2.5, -1.5, Error],
                [3, [4, 5], 6, Error],
                [3, [4, 5, [true, 2.4]], 6, Error],
                ['hello', false],
                [new Date(), false],
                [[1, true, 'hi'], true],
                [{ lit: 'eral' }, false]
            ]
        },
        {
            func: funcs.ISBOOLEAN,
            samples: [
                [true, true],
                [false, true],
                [null, false],
                ['', false],
                [123, false],
                [-14214, false],
                [1.2554, false],
                [-1.2554, false],
                [1, 2, 3, Error],
                [1, 2.5, -1.5, Error],
                [3, [4, 5], 6, Error],
                [3, [4, 5, [true, 2.4]], 6, Error],
                ['hello', false],
                [new Date(), false],
                [[1, true, 'hi'], false],
                [{ lit: 'eral' }, false]
            ]
        },
        {
            func: funcs.ISDATE,
            samples: [
                [true, false],
                [false, false],
                [null, false],
                ['', false],
                [123, false],
                [-14214, false],
                [1.2554, false],
                [-1.2554, false],
                [1, 2, 3, Error],
                [1, 2.5, -1.5, Error],
                [3, [4, 5], 6, Error],
                [3, [4, 5, [true, 2.4]], 6, Error],
                ['hello', false],
                [new Date(), true],
                [[1, true, 'hi'], false],
                [{ lit: 'eral' }, false]
            ]
        },
        {
            func: funcs.ISEMPTY,
            samples: [
                ['      ', true],
                ['\t\t', true],
                [true, Error],
                [false, Error],
                [null, true],
                ['', true],
                [123, Error],
                [-14214, Error],
                [1.2554, Error],
                [-1.2554, Error],
                [1, 2, 3, Error],
                [1, 2.5, -1.5, Error],
                [3, [4, 5], 6, Error],
                [3, [4, 5, [true, 2.4]], 6, Error],
                ['hello', false],
                [new Date(), Error],
                [{ lit: 'eral' }, Error]
            ]
        },
        {
            func: funcs.ISNOTEMPTY,
            samples: [
                ['      ', false],
                ['\t\t', false],
                [true, Error],
                [false, Error],
                [null, false],
                ['', false],
                [123, Error],
                [-14214, Error],
                [1.2554, Error],
                [-1.2554, Error],
                [1, 2, 3, Error],
                [1, 2.5, -1.5, Error],
                [3, [4, 5], 6, Error],
                [3, [4, 5, [true, 2.4]], 6, Error],
                ['hello', true],
                [new Date(), Error],
                [{ lit: 'eral' }, Error]
            ]
        },
        {
            func: funcs.ISNOTNULL,
            samples: [
                [true, true],
                [false, true],
                [null, false],
                ['', true],
                [123, true],
                [-14214, true],
                [1.2554, true],
                [-1.2554, true],
                [1, 2, 3, Error],
                [1, 2.5, -1.5, Error],
                [3, [4, 5], 6, Error],
                [3, [4, 5, [true, 2.4]], 6, Error],
                ['hello', true],
                [new Date(), true],
                [{ lit: 'eral' }, true]
            ]
        },
        {
            func: funcs.ISNULL,
            samples: [
                [true, false],
                [false, false],
                [null, true],
                ['', false],
                [123, false],
                [-14214, false],
                [1.2554, false],
                [-1.2554, false],
                [1, 2, 3, Error],
                [1, 2.5, -1.5, Error],
                [3, [4, 5], 6, Error],
                [3, [4, 5, [true, 2.4]], 6, Error],
                ['hello', false],
                [new Date(), false],
                [{ lit: 'eral' }, false]
            ]
        },
        {
            func: funcs.ISOBJECT,
            samples: [
                [true, false],
                [false, false],
                [null, false],
                ['', false],
                [123, false],
                [-14214, false],
                [1.2554, false],
                [-1.2554, false],
                [1, 2, 3, Error],
                [1, 2.5, -1.5, Error],
                [3, [4, 5], 6, Error],
                [3, [4, 5, [true, 2.4]], 6, Error],
                ['hello', false],
                [new Date(), false],
                [[1, true, 'hi'], false],
                [{ lit: 'eral' }, true]
            ]
        },
        {
            func: funcs.LEFT,
            samples: [
                [true, 1, Error],
                [false, 1, Error],
                [null, 0, ''],
                ['', 1, ''],
                [123, 2, '12'],
                [-14214, 3, '-14'],
                [1.2554, 2, '1.'],
                [-1.2554, 1000, '-1.2554'],
                [1, 2, 3, Error],
                [1, 2.5, -1.5, Error],
                [3, [4, 5], 6, Error],
                [3, [4, 5, [true, 2.4]], 6, Error],
                ['hello', 5, 'hello'],
                [new Date('2000-01-01'), 100, Error],
                [[1, true, 'hi'], 3, Error],
                [{ lit: 'eral' }, 1, Error]
            ]
        },
        {
            func: funcs.LEN,
            samples: [
                [undefined, 0],
                [true, 1],
                [false, 1],
                [null, 0],
                ['', 0],
                [123, 3],
                [-14214, 6],
                [1.2554, 6],
                [-1.2554, 7],
                [1, 2, 3, Error],
                [1, 2.5, -1.5, Error],
                [3, [4, 5], 6, Error],
                [3, [4, 5, [true, 2.4]], 6, Error],
                ['hello', 5],
                [new Date('2000-01-01'), 946684800000],
                [[1, true, 'hi'], 3],
                [{ lit: 'eral' }, 1]
            ]
        },
        {
            func: funcs.MID,
            samples: [
                [true, 1, 0, Error],
                [false, 1, 1, Error],
                [null, 0, 1, ''],
                ['', 1, 1, ''],
                [123, 1, 2, '23'],
                [-14214, 1, 3, '142'],
                [1.2554, 2, 2, '25'],
                [-1.2554, 1000, 11, ''],
                [1, 2, 3, ''],
                [1, 2.5, -1.5, Error],
                [3, [4, 5], 6, Error],
                [3, [4, 5, [true, 2.4]], 6, Error],
                ['hello', 0, 5, 'hello'],
                [new Date('2000-01-01'), 100, Error],
                [[1, true, 'hi'], 3, Error],
                [{ lit: 'eral' }, 1, Error]
            ]
        },
        {
            func: funcs.RIGHT,
            samples: [
                [true, 1, Error],
                [false, 1, Error],
                [null, 0, ''],
                ['', 1, ''],
                [123, 2, '23'],
                [-14214, 3, '214'],
                [1.2554, 2, '54'],
                [-1.2554, 1000, '-1.2554'],
                [1, 2, 3, Error],
                [1, 2.5, -1.5, Error],
                [3, [4, 5], 6, Error],
                [3, [4, 5, [true, 2.4]], 6, Error],
                ['hello', 5, 'hello'],
                [new Date('2000-01-01'), 100, Error],
                [[1, true, 'hi'], 3, Error],
                [{ lit: 'eral' }, 1, Error]
            ]
        },
        {
            func: funcs.SQRT,
            samples: [
                [true, 1],
                [false, 0],
                [null, 0],
                ['', Error],
                [123, 11.090536506],
                [-14214, NaN],
                [1.2554, 1.12044634],
                [-1.2554, NaN],
                [1, 2, 3, Error],
                [1, 2.5, -1.5, Error],
                [3, [4, 5], 6, Error],
                [3, [4, 5, [true, 2.4]], 6, Error],
                ['hello', Error],
                [new Date(), Error],
                [{ lit: 'eral' }, Error]
            ]
        },
        {
            func: funcs.SUM,
            samples: [
                [[1, [2, [3, [4, [5]]]]], 6],
                [true, 1],
                [false, 0],
                [null, 0],
                ['', Error],
                [123, 123],
                [-14214, -14214],
                [1.2554, 1.2554],
                [-1.2554, -1.2554],
                [1, 2, 3, 6],
                [1, 2.5, -1.5, 2],
                [3, [4, 5], 6, 18],
                [3, [4, 5, [true, 2.4]], 6, 21.4],
                ['hello', Error],
                [new Date(), Error],
                [{ lit: 'eral' }, Error]
            ]
        },
        {
            func: funcs.TEXTJOIN,
            samples: [
                ['.', false, [1, 2, 3], '1.2.3'],
                ['.', false, [1, ['hi', null, true], 3], '1.hi..true.3'],
                ['.', true, [1, ['hi', null, true], 3], '1.hi.true.3'],
                ['yo-', false, [null, [null, [null]], null], 'yo-yo-yo-'],
                ['yo-', true, [null, [null, [null]], null], ''],
                ['.', false, Error],
                [true, Error],
                [false, Error],
                [null, Error],
                ['', Error],
                [123, Error],
                [-14214, Error],
                [1.2554, Error],
                [-1.2554, Error],
                [1, 2, 3, Error],
                [1, 2.5, -1.5, Error],
                [3, [4, 5], 6, Error],
                [3, [4, 5, [true, 2.4]], 6, Error],
                ['hello', Error],
                [new Date(), Error],
                [{ lit: 'eral' }, Error]
            ]
        },
        {
            func: funcs.TRUNCATE,
            samples: [
                [true, 1],
                [false, 0],
                [null, 0],
                ['', Error],
                [123, 123],
                [-14214, -14214],
                [1.2554, 1],
                [-1.2554, -1],
                [1, 2, 3, Error],
                [1, 2.5, -1.5, Error],
                [3, [4, 5], 6, Error],
                [3, [4, 5, [true, 2.4]], 6, Error],
                ['hello', Error],
                [new Date(), Error],
                [{ lit: 'eral' }, Error]
            ]
        },
    ];
    for (let p in funcs) {
        if (typeof funcs[p] === 'object' && Array.isArray(funcs[p].symbols)) {
            describe(p, () => {
                let t = tests.find(v => v.func == funcs[p]);
                // it('has unit tests', () => expect(t).toBeTruthy());
                if (t && t.samples) {
                    for (let s of t.samples) {
                        let args = s.slice(0, s.length - 1);
                        let expected = s[s.length - 1];
                        it(`${p}(${args.map(v => utilities.prettyPrint(v)).join(', ')}) = ${utilities.prettyPrint(expected)}`, () => {
                            let go = () => {
                                funcs.argsValid(p, args, true);
                                return funcs[p].func.apply(funcs[p], args);
                            };
                            if (expected === Error) {
                                expect(go).toThrow(expected);
                            } else if (Number.isNaN(expected)) {
                                expect(go()).toBe(NaN);
                            } else if (typeof expected === 'number') {
                                expect(go()).toBeCloseTo(expected);
                            } else {
                                expect(go()).toBe(expected);
                            }
                        });
                    }
                }
            });
        }
    }
});