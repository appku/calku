import jest from 'jest-mock';
import funcs from './funcs.js';

const structuredClone = () => { //polyfill for jest stupidity.
    let clone = Object.assign({}, funcs);
    return clone;
};

describe('#toRegExp', () => {
    it('ignore properties on funcs that are missing symbols.', () => {
        let map = funcs.toRegExp();
        expect(map.has('toRegExp')).toBe(false);
        expect(map.has('recycle')).toBe(false);
        for (let [k, _] of map) {
            expect(funcs[k].type).toBeTruthy();
            expect(typeof funcs[k].type).toBe('string');
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
        let clone = structuredClone(funcs);
        let original = clone.toRegExp();
        clone.NEWTHING = { type: 'function', symbols: ['NEWTHING'], args: true, func: () => { } };
        expect(clone.toRegExp().size).toBe(original.size);
        clone.recycle();
        expect(clone.toRegExp().size).not.toBe(original.size);
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

describe('functions work as expected.', () => {
    //Alphabetical order please...
    it('ABS', () => { });
    it('CEIL', () => { });
    it('COUNT', () => { });
    it('FLOOR', () => { });
    it('ISEMPTY', () => { });
    it('ISNOTEMPTY', () => { });
    it('ISNOTNULL', () => { });
    it('ISNULL', () => { });
    it('LEFT', () => { });
    it('LEN', () => { });
    it('MID', () => { });
    it('RIGHT', () => { });
    it('SQRT', () => { });
    it('SUM', () => { });
    it('TRUNCATE', () => { });
});