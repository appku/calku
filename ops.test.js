import jest from 'jest-mock';
import ops from './ops.js';
import utilities from './test/utilities.js';

describe('#ordered', () => {
    it('operators are the first in the proper order-of-operations.', () => {
        expect(ops.ordered()).toEqual([
            'EXPONENTIATION',
            ['DIVISION', 'MODULO', 'MULTIPLICATION'],
            ['ADDITION', 'SUBTRACTION'],
            'AND', 'OR',
            'LESSTHAN', 'LESSTHANOREQUAL',
            'GREATERTHAN', 'GREATERTHANOREQUAL',
            'EQUALS', 'NOTEQUALS',
            ['CONTAINS', 'DOESNOTCONTAIN', 'ENDSWITH', 'STARTSWITH'],
            'CONCATENATE'
        ]);
    });
    it('functions occur after operations (math, logic, compares).', () => {
        let o = ops.ordered().slice(18);
        for (let f of o) {
            expect(ops[f].type).toBe('function');
        }
    });
    it('calls are cached until recycled', () => {
        let clone = utilities.structuredClone(ops);
        let original = clone.ordered();
        clone.NEWTHING = { type: 'function', symbols: ['NEWTHING'], args: true, func: () => { } };
        expect(clone.ordered()).toEqual(original);
        clone.recycle();
        expect(clone.ordered()).not.toEqual(original);
        original.push('NEWTHING');
        expect(clone.ordered()).toEqual(original);
        clone.recycle();
    });
});

describe('#toRegExp', () => {
    it('ignore properties on ops that are missing symbols and type props.', () => {
        let map = ops.toRegExp();
        expect(map.has('toRegExp')).toBe(false);
        expect(map.has('ordered')).toBe(false);
        expect(map.has('recycle')).toBe(false);
        for (let [k, _] of map) {
            expect(ops[k].type).toBeTruthy();
            expect(typeof ops[k].type).toBe('string');
            expect(Array.isArray(ops[k].symbols)).toBe(true);
        }
    });
    it('provides matching regular expressions for symbols that may be encountered.', () => {
        let map = ops.toRegExp();
        for (let [k, r] of map) {
            for (let s of ops[k].symbols) {
                expect(r.test(s)).toBe(true);
                expect(r.test(s + ' ')).toBe(true);
            }
        }
    });
    it('calls are cached until recycled', () => {
        let clone = utilities.structuredClone(ops);
        let original = clone.toRegExp();
        clone.NEWTHING = { type: 'function', symbols: ['NEWTHING'], args: true, func: () => { } };
        expect(clone.toRegExp().size).toBe(original.size);
        clone.recycle();
        expect(clone.toRegExp().size).not.toBe(original.size);
        clone.recycle();
    });
    it('matches on provided types', () => {
        let tests = ['compare', 'consolidate', 'math', 'logic'];
        for (let t of tests) {
            let map = ops.toRegExp(t);
            for (let [k, r] of map) {
                expect(ops[k].type).toBe(t);
            }
        }
    });
});

it('has no duplicate symbols.', () => {
    let symbols = [];
    for (let p in ops) { //build list of only ops defining objects
        if (p !== '_cache' && typeof ops[p] === 'object' && ops[p].symbols) {
            for (let s of ops[p].symbols) {
                expect(symbols.indexOf(s)).toBeLessThan(0);
                symbols.push(s);
            }
        }
    }
});

describe('ops have valid types, symbols, and funcs.', () => {
    let validTypes = ['compare', 'consolidate', 'math', 'logic'];
    for (let p in ops) { //build list of only ops defining objects
        if (p !== '_cache' && typeof ops[p] === 'object') {
            it(`${p}`, () => {
                expect(validTypes.indexOf(ops[p].type)).toBeGreaterThanOrEqual(0);
                expect(Array.isArray(ops[p].symbols)).toBe(true);
                expect(ops[p].symbols.length).toBeGreaterThan(0);
                expect(typeof ops[p].func).toBe('function');
            });
        }
    }
});

describe('ops validate arguments and funcs execute with expected results.', () => {
    let tests = [
        //logic
        {
            op: ops.AND,
            samples: [
                [true, true, true],
                [true, false, false],
                [false, true, false],
                [false, false, false],
                [1, 0, false],
                [0, 0, false],
                [1, 1, true],
                [123, 0, false],
                ['truthy', 'yes', true],
                ['truthy', '', false],
                [false, {}, false],
                [false, [], false]
            ]
        },
        {
            op: ops.OR,
            samples: [
                [true, true, true],
                [true, false, true],
                [false, true, true],
                [false, false, false],
                [1, 0, true],
                [0, 0, false],
                [1, 1, true],
                [123, 0, true],
                ['truthy', 'yes', true],
                ['truthy', '', true],
                [false, {}, true],
                [false, [], true]
            ]
        },
        //compares
        {
            op: ops.CONTAINS,
            samples: [
                ['hello', null, false],
                [null, null, true],
                [null, 'ok', false],
                [0, 'o', Error],
                ['ok', null, false],
                ['o', 0, false],
                ['012334', 3, true],
                ['hello', 'o', true],
                [[1, 2, 3], 3, true],
                [['a', 'b', 'c'], 'c', true],
                ['hello', 'zzz', false],
                [[], 3, false],
                [['hello'], 'o', false]
            ]
        },
        {
            op: ops.DOESNOTCONTAIN,
            samples: [
                ['hello', null, true],
                [null, null, false],
                [null, 'ok', true],
                [0, 'o', Error],
                ['ok', null, true],
                ['o', 0, true],
                ['012334', 3, false],
                ['hello', 'o', false],
                [[1, 2, 3], 3, false],
                [['a', 'b', 'c'], 'c', false],
                ['hello', 'zzz', true],
                [[], 3, true],
                [['hello'], 'o', true]
            ]
        },
        {
            op: ops.ENDSWITH,
            samples: [
                ['hello', null, false],
                [null, null, true],
                [null, 'ok', false],
                [3, 'o', Error],
                ['hello', 'o', true],
                ['hello', 'h', false],
                [[1, 2, 3], 3, true],
                [['a', 'b', 'c'], 'c', true],
                ['hello', 'e', false],
                [[1, 2, 3], 1, false],
                ['hello', 'zzz', false],
                [[], 3, false],
                [['hello'], 'o', false],
                [['hello'], 'h', false]
            ]
        },
        {
            op: ops.EQUALS,
            samples: [
                ['hello', null, false],
                [null, null, true],
                [3, 'o', false],
                [55, '55', false],
                ['hello', 'o', false],
                ['hello', 'hello', true],
                [1.444, 1.443, false],
                [-1, 1, false],
                [2.432534, 2.432534, true],
                [true, false, false],
                [true, true, true],
                [false, false, true],
                [[1, 2], [1], false],
                [[1, 2, 'c'], [1, 2, 'c'], false]
            ]
        },
        {
            op: ops.GREATERTHAN,
            samples: [
                ['hello', null, false],
                [null, null, false],
                [3, 'o', false],
                [55, '1', false],
                ['hello', 'o', false],
                ['hello', 'hello', false],
                [1.444, 1.443, true],
                [-1, 1, false],
                [2.432534, 2.432534, false],
                [true, false, true],
                [true, true, false],
                [false, false, false],
                [[1, 2], [1], true],
                [[1, 2, 'c'], [1, 2, 'c'], false]
            ]
        },
        {
            op: ops.GREATERTHANOREQUAL,
            samples: [
                ['hello', null, false],
                [null, null, true],
                [3, 'o', false],
                [55, '1', false],
                ['hello', 'o', false],
                ['hello', 'hello', true],
                [1.444, 1.443, true],
                [-1, 1, false],
                [2.432534, 2.432534, true],
                [true, false, true],
                [true, true, true],
                [false, false, true],
                [[1, 2], [1], true],
                [[1, 2, 'c'], [1, 2, 'c'], true]
            ]
        },
        {
            op: ops.LESSTHAN,
            samples: [
                ['hello', null, false],
                [null, null, false],
                [3, 'o', false],
                [55, '1', false],
                ['hello', 'o', true],
                ['hello', 'hello', false],
                [1.444, 1.443, false],
                [-1, 1, true],
                [2.432534, 2.432534, false],
                [true, false, false],
                [true, true, false],
                [false, false, false],
                [[1, 2], [1], false],
                [[1, 2, 'c'], [1, 2, 'c'], false]
            ]
        },
        {
            op: ops.LESSTHANOREQUAL,
            samples: [
                ['hello', null, false],
                [null, null, true],
                [3, 'o', false],
                [55, '1', false],
                ['hello', 'o', true],
                ['hello', 'hello', true],
                [1.444, 1.443, false],
                [-1, 1, true],
                [2.432534, 2.432534, true],
                [true, false, false],
                [true, true, true],
                [false, false, true],
                [[1, 2], [1], false],
                [[1, 2, 'c'], [1, 2, 'c'], true]
            ]
        },
        {
            op: ops.NOTEQUALS,
            samples: [
                ['hello', null, true],
                [null, null, false],
                [3, 'o', true],
                [55, '1', true],
                ['hello', 'o', true],
                ['hello', 'hello', false],
                [1.444, 1.443, true],
                [-1, 1, true],
                [2.432534, 2.432534, false],
                [true, false, true],
                [true, true, false],
                [false, false, false],
                [[1, 2], [1], true],
                [[1, 2, 'c'], [1, 2, 'c'], true]
            ]
        },
        {
            op: ops.STARTSWITH,
            samples: [
                ['hello', null, false],
                [null, null, true],
                [null, 'ok', false],
                [3, 'o', Error],
                ['hello', 'o', false],
                ['hello', 'h', true],
                [[1, 2, 3], 3, false],
                [['a', 'b', 'c'], 'c', false],
                ['hello', 'e', false],
                [[1, 2, 3], 1, true],
                ['hello', 'zzz', false],
                [[], 3, false],
                [['hello'], 'o', false],
                [['hello'], 'h', false]
            ]
        },
        //math
        {
            op: ops.ADDITION,
            samples: [
                [null, null, 0],
                [0, null, 0],
                [null, 0, 0],
                [0, 0, 0],
                [1, 2, 3],
                [-5.2, 4, -1.2],
                [4, -4, 0],
                [-4, -4, -8],
                [-1.223424234, 2.0000001, 0.776575866]
            ]
        },
        {
            op: ops.DIVISION,
            samples: [
                [null, null, NaN],
                [0, null, NaN],
                [null, 0, NaN],
                [0, 0, NaN],
                [1, 2, 0.5],
                [-5.2, 4, -1.3],
                [4, -4, -1],
                [-4, -4, 1],
                [-1.223424234, 2.0000001, -0.611712086]
            ]
        },
        {
            op: ops.EXPONENTIATION,
            samples: [
                [null, null, 1],
                [0, null, 1],
                [null, 0, 1],
                [0, 0, 1],
                [1, 2, 1],
                [-5.2, 4, 731.1616],
                [4, -4, 0.00390625],
                [-4, -4, 0.00390625],
                [-1.223424234, 2, 1.4968]
            ]
        },
        {
            op: ops.MODULO,
            samples: [
                [null, null, NaN],
                [0, null, NaN],
                [null, 0, NaN],
                [0, 0, NaN],
                [1, 2, 1],
                [-5, 4, -1],
                [4, -4, 0],
                [-4, -4, 0],
            ]
        },
        {
            op: ops.MULTIPLICATION,
            samples: [
                [null, null, 0],
                [0, null, 0],
                [null, 0, 0],
                [0, 0, 0],
                [1, 2, 2],
                [-5.2, 4, -20.8],
                [4, -4, -16],
                [-4, -4, 16],
                [-1.223424234, 2, -2.446848468]
            ]
        },
        {
            op: ops.SUBTRACTION,
            samples: [
                [null, null, 0],
                [0, null, 0],
                [null, 0, 0],
                [0, 0, 0],
                [1, 2, -1],
                [-5.2, 4, -9.2],
                [4, -4, 8],
                [-4, -4, 0],
                [-1.223424234, 2, -3.223424234]
            ]
        },
        //consolidate
        {
            op: ops.CONCATENATE,
            samples: [
                [null, null, ''],
                [null, 'test', 'test'],
                ['test', null, 'test'],
            ]
        },
    ];
    for (let p in ops) {
        if (typeof ops[p] === 'object' && typeof ops[p].type === 'string') {
            describe(p, () => {
                let t = tests.find(v => v.op == ops[p]);
                it('has unit tests', () => expect(t).toBeTruthy());
                if (t && t.samples) {
                    for (let s of t.samples) {
                        let opArgs = s.slice(0, s.length - 1);
                        let expected = s[s.length - 1];
                        it(`${p}(${opArgs.map(v => utilities.prettyPrint(v)).join(', ')}) = ${utilities.prettyPrint(expected)}`, () => {
                            let go = () => {
                                if (Array.isArray(ops[p].args)) {
                                    if (ops[p].args.length != opArgs.length) {
                                        throw new Error(`Invalid argument length. Expected ${ops[p].args.length} but found ${opArgs.length}.`);
                                    }
                                    for (let i = 0; i < ops[p].args.length; i++) {
                                        ops[p].args[i](opArgs[i]).throw(); //run validation on each arg
                                    }
                                }
                                return ops[p].func.apply(ops[p], opArgs);
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