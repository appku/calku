import jest from 'jest-mock';
import ops from './ops.js';

const structuredClone = () => { //polyfill for jest stupidity.
    let clone = Object.assign({}, ops);
    return clone;
};

describe('#ordered', () => {
    it('operators are the first in the proper order-of-operations.', () => {
        expect(ops.ordered().slice(0, 18)).toEqual([
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
        let funcs = ops.ordered().slice(18);
        for (let f of funcs) {
            expect(ops[f].type).toBe('function');
        }
    });
    it('functions occur after operations (math, logic, compares).', () => {
        let funcs = ops.ordered().slice(18);
        for (let f of funcs) {
            expect(ops[f].type).toBe('function');
        }
    });
    it('calls are cached until recycled', () => {
        let clone = structuredClone(ops);
        let original = clone.ordered();
        clone.NEWTHING = { type: 'function', symbols: ['NEWTHING'], args: true, func: () => { } };
        expect(clone.ordered()).toEqual(original);
        clone.recycle();
        expect(clone.ordered()).not.toEqual(original);
        original.push('NEWTHING');
        expect(clone.ordered()).toEqual(original);
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
        let clone = structuredClone(ops);
        let original = clone.toRegExp();
        clone.NEWTHING = { type: 'function', symbols: ['NEWTHING'], args: true, func: () => { } };
        expect(clone.toRegExp().size).toBe(original.size);
        clone.recycle();
        expect(clone.toRegExp().size).not.toBe(original.size);
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
    let validTypes = ['compare', 'consolidating', 'math', 'logic'];
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

describe('logic ops work as expected and always return a boolean.', () => {
    it('AND', () => {
        let tests = [
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
        ];
        for (let t of tests) {
            expect(ops.AND.func(t[0], t[1])).toBe(t[2]);
        }
    });
    it('OR', () => {
        let tests = [
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
        ];
        for (let t of tests) {
            expect(ops.OR.func(t[0], t[1])).toBe(t[2]);
        }
    });
});

describe('compare ops work as expected and always return a boolean.', () => {
    //Alphabetical order please...
    it('CONTAINS', () => {
        let tests = [
            ['hello', 'o', true],
            [[1, 2, 3], 3, true],
            [['a', 'b', 'c'], 'c', true],
            ['hello', 'zzz', false],
            [[], 3, false],
            [['hello'], 'o', false]
        ];
        for (let t of tests) {
            expect(ops.CONTAINS.func(t[0], t[1])).toBe(t[2]);
        }
    });
    it('DOESNOTCONTAIN', () => {
        let tests = [
            ['hello', 'o', false],
            [[1, 2, 3], 3, false],
            [['a', 'b', 'c'], 'c', false],
            ['hello', 'zzz', true],
            [[], 3, true],
            [['hello'], 'o', true]
        ];
        for (let t of tests) {
            expect(ops.DOESNOTCONTAIN.func(t[0], t[1])).toBe(t[2]);
        }
    });
    it('ENDSWITH', () => {
        let tests = [
            ['hello', 'o', true],
            [[1, 2, 3], 3, true],
            [['a', 'b', 'c'], 'c', true],
            ['hello', 'e', false],
            [[1, 2, 3], 1, false],
            ['hello', 'zzz', false],
            [[], 3, false],
            [['hello'], 'o', false]
        ];
        for (let t of tests) {
            expect(ops.ENDSWITH.func(t[0], t[1])).toBe(t[2]);
        }
    });
    it('EQUALS', () => { });
    it('GREATERTHAN', () => { });
    it('GREATERTHANOREQUAL', () => { });
    it('LESSTHAN', () => { });
    it('LESSTHANOREQUAL', () => { });
    it('NOTEQUALS', () => { });
    it('STARTSWITH', () => {
        let tests = [
            ['hello', 'o', false],
            [[1, 2, 3], 3, false],
            [['a', 'b', 'c'], 'c', false],
            ['hello', 'h', true],
            [[1, 2, 3], 1, true],
            ['hello', 'zzz', false],
            [[], 3, false],
            [['hello'], 'o', false]
        ];
        for (let t of tests) {
            expect(ops.STARTSWITH.func(t[0], t[1])).toBe(t[2]);
        }
    });
});

describe('math ops work as expected and always return a number.', () => {
    //Alphabetical order please...
    it('ADDITION', () => {
        let tests = [
            [null, null, 0],
            [0, null, 0],
            [null, 0, 0],
            [0, 0, 0],
            [1, 2, 3],
            [-5.2, 4, -1.2],
            [4, -4, 0],
            [-4, -4, -8],
            [-1.223424234, 2.0000001, 0.776575866]
        ];
        for (let t of tests) {
            expect(ops.ADDITION.func(t[0], t[1])).toBeCloseTo(t[2], 14);
        }
    });
    it('DIVISION', () => { });
    it('EXPONENTIATION', () => { });
    it('MODULO', () => { });
    it('MULTIPLICATION', () => { });
    it('SUBTRACTION', () => { });
});