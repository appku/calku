import jest from 'jest-mock';
import CalcKu, { TokenType } from './calku.js';
import fs from 'fs/promises';

describe('#constructor', () => {
    it('sets the expression property.', () => {
        expect(new CalcKu().expression).toBeNull();
        expect(new CalcKu('yo').expression).toBe('yo');
        expect(new CalcKu('COUNT({detail.mix}) EQ 2 AND NOT(false)').expression).toBe('COUNT({detail.mix}) EQ 2 AND NOT(false)');
    });
    it('sets the timezone property of all supported timezones.', () => {
        expect(new CalcKu().timeZone).toBeNull();
        expect(new CalcKu(null, null).timeZone).toBeNull();
        for (let tz of Intl.supportedValuesOf('timeZone')) {
            expect(new CalcKu(null, tz).timeZone).toBe(tz);
        }
    });
    it('throws on an invalid timezone.', () => {
        expect(() => new CalcKu(null, 'Bogus/Bugos').timeZone).toThrow();
    });
});

describe('#lexer', () => {
    it('throws on an unknown function name.', () => {
        expect(()=>new CalcKu('BOGUS(1,2)').lexer()).toThrow(/unknown/i);
    });
    it('extracts grouping tokens', () => {
        let results = new CalcKu('((10 + 10) / 4)').lexer();
        expect(Array.isArray(results)).toBe(true);
        expect(results.length).toBe(1);
        expect(results[0].type).toBe('group');
        expect(results[0].tokens[0].type).toBe('group');
        expect(results[0].tokens[0].tokens.map(t => t.type)).toEqual(['literal', 'op', 'literal']);
        expect(results[0].tokens[1].type).toBe('op');
        expect(results[0].tokens[1].op).toBe('DIVISION');
        expect(results[0].tokens[2].type).toBe('literal');
        expect(results[0].tokens[2].value).toBe(4);
    });
    it('extracts naked literals', () => {
        let tests = ['hellothere', 'true', 'false', '2023-09-09', '123'];
        for (let t of tests) {
            let tokens = new CalcKu(t).lexer();
            expect(Array.isArray(tokens)).toBe(true);
            expect(tokens.length).toBe(1);
            expect(tokens[0].style).toBe('naked');
            expect(tokens[0].type).toBe(TokenType.Literal);
        }
    });
    it('extracts quoted literals', () => {
        let tests = ['"things\\""', '"hellothere"', '"true"', '"false"', '"2023-09-09"', '"123"'];
        for (let t of tests) {
            let tokens = new CalcKu(t).lexer();
            expect(Array.isArray(tokens)).toBe(true);
            expect(tokens.length).toBe(1);
            expect(tokens[0].style).toBe('quoted');
            expect(tokens[0].type).toBe(TokenType.Literal);
        }
    });
    it('extracts functions and args', () => {
        expect(new CalcKu('COUNT()').lexer().map(t => t.type)).toEqual(['func']);
        expect(new CalcKu('COUNT(10, 20)').lexer().map(t => t.type)).toEqual(['func']);
        expect(new CalcKu('COUNT(10, 20)').lexer()[0].tokens.map(t => t.type)).toEqual([
            'literal', 'func-arg-sep', 'literal'
        ]);
        expect(new CalcKu('COUNT(10, (10 + 20 / (4+4)))').lexer().map(t => t.type)).toEqual(['func']);
        expect(new CalcKu('COUNT(10, (10 + 20 / (4+4)))').lexer()[0].tokens.map(t => t.type)).toEqual([
            'literal', 'func-arg-sep', 'group'
        ]);
    });
    it('extracts line comments', () => {
        expect(new CalcKu('100 + 22 //makes 123\n + 1').lexer().map(t => t.type)).toEqual([
            'literal', 'op', 'literal', 'comment', 'op', 'literal'
        ]);
    });
    it('extracts tokens for a complicated, nested expression.', async () => {
        let test = '3 + (10 + 2 / {person.age:4} + ({qty} * ((8 + {sales}) / {profit}) - COUNT({gnomes}, {horses}, {apples} + 6, ({apes} + 1))';
        let content = await fs.readFile('./test/lexer-complicated.json', 'utf-8');
        // fs.writeFile('./test/lexer-complicated.json', JSON.stringify(new CalcKu(test).lexer(), null, 4), 'utf-8');
        expect(new CalcKu(test).lexer()).toEqual(JSON.parse(content));
    });
});

describe('#valueParse', () => {
    it('values with a "quoted" hint are always strings and returned as-is.', () => {
        let tests = ['test', '123', '4.5', 'true', 'false', '2023-09-09T00:12'];
        for (let t of tests) {
            expect(new CalcKu().valueParse(t, 'quoted')).toBe(t.toString());
        }
    });
    describe('parses numbers from a string value.', () => {
        let tests = [
            ['123', 123],
            ['129879789783', 129879789783],
            ['12.3', 12.3],
            ['-123.123456789', -123.123456789]
        ];
        for (let t of tests) {
            it(`value of "${t[0]}"`, () => {
                expect(new CalcKu().valueParse(t[0])).toBe(t[1]);
            });
        }
    });
    describe('parses booleans from a string value.', () => {
        let tests = [
            ['TRUE', true],
            ['true', true],
            ['TrUe', true],
            ['FALSE', false],
            ['false', false],
            ['FalSe', false],
        ];
        for (let t of tests) {
            it(`value of "${t[0]}"`, () => {
                expect(new CalcKu().valueParse(t[0])).toBe(t[1]);
            });
        }
    });
    describe('parses null and undefined from a string value.', () => {
        let tests = [
            ['NULL', null],
            ['nULl', null],
            ['null', null],
            ['UNDEFINED', undefined],
            ['unDEfined', undefined],
            ['undefined', undefined],
        ];
        for (let t of tests) {
            it(`value of "${t[0]}"`, () => {
                expect(new CalcKu().valueParse(t[0])).toBe(t[1]);
            });
        }
    });
    describe('parses valid dates with a default GMT timezone offset.', () => {
        let tests = [
            //utc, no timezone
            ['2023-09-09', '2023-09-09T00:00:00.000Z'],
            ['2023-09-09T12:34', '2023-09-09T12:34:00.000Z'],
            ['2023-09-09T12:34:56', '2023-09-09T12:34:56.000Z'],
            ['2023-09-09T12:34:56.7', '2023-09-09T12:34:56.700Z'],
            //utc, negative timezone
            ['2023-09-09 GMT-08:00', '2023-09-09T08:00:00.000Z'],
            ['2023-09-09T12:34-08:00', '2023-09-09T20:34:00.000Z'],
            ['2023-09-09T12:34:56-08:00', '2023-09-09T20:34:56.000Z'],
            ['2023-09-09T12:34:56.789-06:30', '2023-09-09T19:04:56.789Z'],
            //utc, positive timezone
            ['2023-09-09 GMT+02:00', '2023-09-08T22:00:00.000Z'],
            ['2023-09-09T12:34+02:00', '2023-09-09T10:34:00.000Z'],
            ['2023-09-09T12:34:56+02:00', '2023-09-09T10:34:56.000Z'],
            ['2023-09-09T12:34:56.789+06:30', '2023-09-09T06:04:56.789Z'],
            //us appku-standard, no timezone
            ['9/9/2023', '2023-09-09T00:00:00.000Z'],
            ['9/9/2023 12:34 PM', '2023-09-09T12:34:00.000Z'],
            ['9/9/2023 12:34:56 PM', '2023-09-09T12:34:56.000Z'],
            ['9/9/2023 12:34:56.7 PM', '2023-09-09T12:34:56.700Z'],
            //us appku-standard, negative timezone
            ['9/9/2023 GMT-08:00', '2023-09-09T08:00:00.000Z'],
            ['9/9/2023 12:34 PM GMT-08:00', '2023-09-09T20:34:00.000Z'],
            ['9/9/2023 12:34:56 PM GMT-08:00', '2023-09-09T20:34:56.000Z'],
            ['9/9/2023 12:34:56.789 PM GMT-06:30', '2023-09-09T19:04:56.789Z'],
            //us appku-standard, positive timezone
            ['9/9/2023 GMT+02:00', '2023-09-08T22:00:00.000Z'],
            ['9/9/2023 12:34 PM GMT+02:00', '2023-09-09T10:34:00.000Z'],
            ['9/9/2023 12:34:56 PM GMT+02:00', '2023-09-09T10:34:56.000Z'],
            ['9/9/2023 12:34:56.789 PM GMT+06:30', '2023-09-09T06:04:56.789Z']
        ];
        for (let t of tests) {
            it(`value of "${t[0]}"`, () => {
                expect(new CalcKu().valueParse(t[0])).toBeInstanceOf(Date);
                expect(new CalcKu().valueParse(t[0]).toISOString()).toBe(t[1]);
            });
        }
    });
    describe('parses dates without timezones with a configured expression timezone.', () => {
        let tests = [
            ['Pacific/Honolulu', '2023-09-09', '2023-09-09T10:00:00.000Z'],
            ['Pacific/Honolulu', '2023-09-09T12:34', '2023-09-09T22:34:00.000Z'],
            ['Pacific/Honolulu', '2023-09-09T12:34:56', '2023-09-09T22:34:56.000Z'],
            ['Pacific/Honolulu', '2023-09-09T12:34:56.7', '2023-09-09T22:34:56.700Z'],
            ['Pacific/Honolulu', '2023-09-09T12:34', '2023-09-09T22:34:00.000Z'],
            ['Pacific/Honolulu', '9/9/2023', '2023-09-09T10:00:00.000Z'],
            ['Pacific/Honolulu', '9/9/2023 12:34 PM', '2023-09-09T22:34:00.000Z'],
            ['Pacific/Honolulu', '9/9/2023 12:34:56 PM', '2023-09-09T22:34:56.000Z'],
            ['Pacific/Honolulu', '9/9/2023 12:34:56.7 PM', '2023-09-09T22:34:56.700Z'],
            ['Africa/Bissau', '2023-09-09', '2023-09-09T00:00:00.000Z'],
            ['Africa/Bissau', '2023-09-09T12:34', '2023-09-09T12:34:00.000Z'],
            ['Africa/Bissau', '2023-09-09T12:34:56', '2023-09-09T12:34:56.000Z'],
            ['Africa/Bissau', '2023-09-09T12:34:56.7', '2023-09-09T12:34:56.700Z'],
            ['Africa/Bissau', '2023-09-09T12:34', '2023-09-09T12:34:00.000Z'],
            ['Africa/Bissau', '9/9/2023', '2023-09-09T00:00:00.000Z'],
            ['Africa/Bissau', '9/9/2023 12:34 PM', '2023-09-09T12:34:00.000Z'],
            ['Africa/Bissau', '9/9/2023 12:34:56 PM', '2023-09-09T12:34:56.000Z'],
            ['Africa/Bissau', '9/9/2023 12:34:56.7 PM', '2023-09-09T12:34:56.700Z'],
        ];
        for (let t of tests) {
            it(`value of "${t[1]}" in timezone "${t[0]}"`, () => {
                expect(new CalcKu(null, t[0]).valueParse(t[1])).toBeInstanceOf(Date);
                expect(new CalcKu(null, t[0]).valueParse(t[1]).toISOString()).toBe(t[2]);
            });
        }
    });
    describe('parses dates with timezones using their specified timezone- not the configured expression timezone.', () => {
        let tests = [
            //utc, zero timezone
            ['2023-09-09 GMT-00:00', '2023-09-09T00:00:00.000Z'],
            ['2023-09-09T12:34:56.789-00:00', '2023-09-09T12:34:56.789Z'],
            ['2023-09-09 GMT+00:00', '2023-09-09T00:00:00.000Z'],
            ['2023-09-09T12:34:56.789+00:00', '2023-09-09T12:34:56.789Z'],
            //utc, negative timezone
            ['2023-09-09 GMT-08:00', '2023-09-09T08:00:00.000Z'],
            ['2023-09-09T12:34-08:00', '2023-09-09T20:34:00.000Z'],
            ['2023-09-09T12:34:56-08:00', '2023-09-09T20:34:56.000Z'],
            ['2023-09-09T12:34:56.789-06:30', '2023-09-09T19:04:56.789Z'],
            //utc, positive timezone
            ['2023-09-09 GMT+02:00', '2023-09-08T22:00:00.000Z'],
            ['2023-09-09T12:34+02:00', '2023-09-09T10:34:00.000Z'],
            ['2023-09-09T12:34:56+02:00', '2023-09-09T10:34:56.000Z'],
            ['2023-09-09T12:34:56.789+06:30', '2023-09-09T06:04:56.789Z'],
            //us appku-standard, zero timezone
            ['9/9/2023 GMT-00:00', '2023-09-09T00:00:00.000Z'],
            ['9/9/2023 12:34:56.789 PM GMT-00:00', '2023-09-09T12:34:56.789Z'],
            ['9/9/2023 GMT+00:00', '2023-09-09T00:00:00.000Z'],
            ['9/9/2023 12:34:56.789 PM GMT+00:00', '2023-09-09T12:34:56.789Z'],
            //us appku-standard, negative timezone
            ['9/9/2023 GMT-08:00', '2023-09-09T08:00:00.000Z'],
            ['9/9/2023 12:34 PM GMT-08:00', '2023-09-09T20:34:00.000Z'],
            ['9/9/2023 12:34:56 PM GMT-08:00', '2023-09-09T20:34:56.000Z'],
            ['9/9/2023 12:34:56.789 PM GMT-06:30', '2023-09-09T19:04:56.789Z'],
            //us appku-standard, positive timezone
            ['9/9/2023 GMT+02:00', '2023-09-08T22:00:00.000Z'],
            ['9/9/2023 12:34 PM GMT+02:00', '2023-09-09T10:34:00.000Z'],
            ['9/9/2023 12:34:56 PM GMT+02:00', '2023-09-09T10:34:56.000Z'],
            ['9/9/2023 12:34:56.789 PM GMT+06:30', '2023-09-09T06:04:56.789Z']
        ];
        for (let t of tests) {
            it(`value of "${t[0]}"`, () => {
                expect(new CalcKu(null, 'Pacific/Honolulu').valueParse(t[0])).toBeInstanceOf(Date);
                expect(new CalcKu(null, 'Pacific/Honolulu').valueParse(t[0]).toISOString()).toBe(t[1]);
            });
        }
    });
    it('leaves all other unknown/undetectable values as-is.', () => {
        let tests = [
            'truthy',
            {},
            () => { }
        ];
        for (let t of tests) {
            expect(new CalcKu(null, 'Pacific/Honolulu').valueParse(t)).toBe(t);
        }
    });
});

describe('#properties', () => {
    it('returns an empty array if no property references are present.', () => {
        let tests = [
            ['10 + 3', []],
            ['COUNT(10, 5, 6, 8)', []]
        ];
        for (let t of tests) {
            expect(Array.isArray(new CalcKu(t[0]).properties())).toBe(true);
            expect(new CalcKu(t[0]).properties()).toEqual(t[1]);
        }
    });
    it('returns a distinct list of property reference names from the expression.', () => {
        let tests = [
            ['10 + 3 + {age} / {person.songs}', ['age', 'person.songs']],
            [
                '10 + 3 + {age} / {person.songs} + (SUM({age})) && true && ISEMPTY({person.horses})',
                ['age', 'person.songs', 'person.horses']
            ],
            [
                '10 + 3 + {age} / {person.songs} + (SUM({age})) && true && ISEMPTY({person.horses} || (3 + COUNT({toggles.two})))',
                ['age', 'person.songs', 'person.horses', 'toggles.two']
            ],
        ];
        for (let t of tests) {
            expect(Array.isArray(new CalcKu(t[0]).properties())).toBe(true);
            expect(new CalcKu(t[0]).properties()).toEqual(t[1]);
        }
    });
});

describe('.valueAt', () => {
    it('throws on an invalid path type.', () => {
        let tests = [undefined, null, true, false, new Date(), 1234];
        for (let t of tests) {
            expect(() => CalcKu.valueAt({}, t)).toThrowError(/A text string path is required./i);
        }
    });
    it('throws on an empty path segment.', () => {
        expect(() => CalcKu.valueAt({ abc: { test: [1, 2, 3] } }, 'abc..test')).toThrowError(/The path contains an empty segment at position/i);
        expect(() => CalcKu.valueAt({ abc: { test: [1, 2, 3] } }, 'abc.test:')).toThrowError(/The path contains an empty segment at position/i);
    });
    it('throws on illegal segment.', () => {
        expect(() => CalcKu.valueAt({}, 'prototype')).toThrowError(/invalid segment/i);
        expect(() => CalcKu.valueAt({}, 'constructor')).toThrowError(/invalid segment/i);
        expect(() => CalcKu.valueAt({}, '__proto__')).toThrowError(/invalid segment/i);
        expect(() => CalcKu.valueAt({ x: {} }, 'x.prototype')).toThrowError(/invalid segment/i);
        expect(() => CalcKu.valueAt({ x: {} }, 'x.constructor')).toThrowError(/invalid segment/i);
        expect(() => CalcKu.valueAt({ x: {} }, 'x.__proto__')).toThrowError(/invalid segment/i);
        expect(() => CalcKu.valueAt({ x: [{}] }, 'x:0.prototype')).toThrowError(/invalid segment/i);
        expect(() => CalcKu.valueAt({ x: [{}] }, 'x:0.constructor')).toThrowError(/invalid segment/i);
        expect(() => CalcKu.valueAt({ x: [{}] }, 'x:0.__proto__')).toThrowError(/invalid segment/i);
    });
    it('returns undefined if any part of the path results in a undefined property.', () => {
        expect(CalcKu.valueAt(null, 'abc')).toBeUndefined();
        expect(CalcKu.valueAt(undefined, 'abc')).toBeUndefined();
        expect(CalcKu.valueAt({}, 'abc')).toBeUndefined();
        expect(CalcKu.valueAt({ hello: { mars: 123 } }, 'hello.toast')).toBeUndefined();
        expect(CalcKu.valueAt({ hello: { mars: 123 } }, 'hello.toast:2')).toBeUndefined();
    });
    it('returns undefined if a mid-segment results in a null property value.', () => {
        expect(CalcKu.valueAt({ hello: { mars: null } }, 'hello.mars.land')).toBeUndefined();
        expect(CalcKu.valueAt({ hello: { mars: null } }, 'hello.mars:3')).toBeUndefined();
        expect(CalcKu.valueAt({ hello: { mars: null } }, 'hello.mars')).toBeNull();
    });
    it('returns undefined if any part of the path results in a value that is a function.', () => {
        expect(CalcKu.valueAt({ abc: () => 1 + 1 }, 'abc')).toBeUndefined();
        expect(CalcKu.valueAt({ abc: ['hi', () => 1 + 1] }, 'abc:1')).toBeUndefined();
        expect(CalcKu.valueAt({ abc: { test: () => 1 + 1 } }, 'abc.test')).toBeUndefined();
        expect(CalcKu.valueAt({ abc: { test: () => 1 + 1 } }, 'abc.test:1')).toBeUndefined();
        expect(CalcKu.valueAt({ abc: { test: () => 1 + 1 } }, 'abc.test.name')).toBeUndefined();
    });
    it('finds a value by dot path and index.', () => {
        let tests = [
            ['abc', 123],
            ['test.cool', true],
            ['test.moose:0.hello', 'mars'],
            ['test.moose:1.moons:1', 'europa'],
            ['test.moose:2.meta', { a: 1, b: 2 }],
            ['test.moose:1.moons:1:2', 'r'], //substring
            ['test.arrPirates:0', null],
            ['test.arrPirates:1', undefined],
            ['test.arrPirates:2', false],
            ['test.arrPirates:3', 0]
        ];
        let sample = {
            abc: 123,
            test: {
                moose: [
                    { hello: 'mars' },
                    { hello: 'jupiter', moons: ['io', 'europa'] },
                    { hello: 'neptune', meta: { a: 1, b: 2 } }
                ],
                arrPirates: [null, undefined, false, 0],
                cool: true
            }
        };
        for (let t of tests) {
            expect(CalcKu.valueAt(sample, t[0])).toEqual(t[1]);
        }
    });
});

describe('#value', () => {
    const sample = {
        alpha: 'abc',
        hello: 'yo',
        world: 'mars',
        num: 334455,
        yes: true,
        no: false,
        dateStr: '2023-03-11',
        dateObj: new Date(),
        detail: {
            other: 'thing',
            more: 10,
            less: 2,
            args: ['a', 'b', 'c'],
            others: [1, 2, 3],
            mix: [1, true, new Date(), { test: 123 }, 'yep']
        }
    };
    let tests = [
        // ['10 + 5 - 1', 14],
        // //grouping
        // ['(10 + (5 * 2))', 20],
        // //numeric/boolean mix
        // ['true + 3', 4],
        // ['false + 3', 3],
        // //order of operations
        // ['10 + 5 - 12 / 3 * 2', 7],
        // ['(15 - 2 * 4) + (1 + 1 / 4)', 8.25],
        // ['10 + 5 - 12 / 3 * 2 + true', 8],
        // ['false + (15 - 2 * 4) + (1 + 1 / 4) - true', 7.25],
        // //functions
        // ['HELLOWORLD()', 'Hello world.'],
        // ['SUM(1, 2, 3)', 6],
        // ['6 / SUM(1, 2, 3) + 3', 4],
        ['SUM(SUM(1, 3), 4, 8, 5)', 21],
        // //property references
        // ['{num} + 3', 334458],
        // ['{detail.more} + -4 / {detail.less}', 8],
        // ['{detail.others:0}', 1],
        // //comments
        // [`(15 - 2 * 4) 
        // //test comment
        // //and again
        // + (1 + 1 / 4)`, 8.25],
        // //consolidate
        // ['"hi" & " there x" & 3 & true', 'hi there x3true'],
        // //logical
        // ['1 and true', true],
        // ['0 and true', false],
        // ['1 and false', false],
        // ['0 and false', false],
        // ['1 or true', true],
        // ['0 or true', true],
        // ['1 or false', true],
        // ['0 or false', false],
        // ['false AND true OR (true AND false)', false]
    ];
    for (let t of tests) {
        it.only(`expression "${t[0]}" should evaluate to ${typeof t[1] === 'string' ? `"${t[1]}"` : t[1]} on sample.`, () => {
            // console.log(JSON.stringify(new CalcKu(t[0]).lexer(), null, 4));
            expect(new CalcKu(t[0]).value(sample)).toBe(t[1]);
        });
    }
    it('handles recursively referenced objects.', () => {
        let sample = {
            abc: 123
        };
        sample.zed = sample;
        expect(new CalcKu('{zed.zed.zed.zed.zed.zed.zed.abc} * 2').value(sample)).toBe(246);
    });
});