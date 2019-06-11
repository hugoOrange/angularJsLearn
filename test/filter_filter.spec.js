/* jshint globalstrict: true  */
/* global parse: false, filter: false */
"use strict";

describe("filter filter", function () {
    
    it("is available", function () {
        expect(filter('filter')).toBeDefined();
    });

    // Use Function For Filtering
    it("can filter an array with a predicate function", function () {
        var fn = parse('[1, 2, 3, 4] | filter:isOdd');
        var scope = {
            isOdd: function (n) {
                return n % 2 !== 0;
            }
        };
        expect(fn(scope)).toEqual([1, 3]);
    });

    // Filtering With Strings
    it("can filter an array of strings with a string", function () {
        var fn = parse('arr | filter: "a"');
        expect(fn({arr: ["a", "b", "a"]})).toEqual(['a', 'a']);
    });
    it("filters an array of strings with substring matching", function () {
        var fn = parse('arr | filter: "o"');
        expect(fn({arr: ["quick", "brown", "fox"]})).toEqual(['brown', 'fox']);
    });
    it("filters an array of strings ignoring case", function () {
        var fn = parse('arr | filter: "o"');
        expect(fn({arr: ["quick", "BROWN", "fox"]})).toEqual(['BROWN', 'fox']);
    });
    it("filters an array of objects where any value matches", function () {
        var fn = parse('arr | filter: "o"');
        expect(fn({
            arr: [
                {firstName: 'John', lastName: 'Brown'},
                {firstName: 'Jane', lastName: 'Fox'},
                {firstName: 'Mary', lastName: 'Quick'}
            ]
        })).toEqual([
            {firstName: 'John', lastName: 'Brown'},
            {firstName: 'Jane', lastName: 'Fox'}
        ]);
    });
    it("filters an array of objects where a nested value matches", function () {
        var fn = parse('arr | filter: "o"');
        expect(fn({
            arr: [
                {name: {firstName: 'John', lastName: 'Brown'}},
                {name: {firstName: 'Jane', lastName: 'Fox'}},
                {name: {firstName: 'Mary', lastName: 'Quick'}}
            ]
        })).toEqual([
            {name: {firstName: 'John', lastName: 'Brown'}},
            {name: {firstName: 'Jane', lastName: 'Fox'}}
        ]);
    });
    it("filters an array of arrays where a nested value matches", function () {
        var fn = parse('arr | filter: "o"');
        expect(fn({
            arr: [
                [{name: 'John'}, {name: 'Mary'}],
                [{name: 'Jane'}]
            ]
        })).toEqual([
            [{name: 'John'}, {name: 'Mary'}],
        ]);
    });

    // Filtering With Other Primitives
    it("filters with a number", function () {
        var fn = parse ('arr | filter: 42');
        expect(fn({
            arr: [
                {name: 'John', age: 42},
                {name: 'Jane', age: 43},
                {name: 'Mary', age: 44}
            ]
        })).toEqual([
            {name: 'John', age: 42}
        ]);
    });
    it("filters with a number", function () {
        var fn = parse ('arr | filter: true');
        expect(fn({
            arr: [
                {name: 'John', admin: true},
                {name: 'Jane', admin: true},
                {name: 'Mary', admin: false}
            ]
        })).toEqual([
            {name: 'John', admin: true},
            {name: 'Jane', admin: true}
        ]);
    });
    it("filters with a substring numberic value", function () {
        var fn = parse('arr | filter: 42');
        expect(fn({
            arr: ['containers 42']
        })).toEqual(['containers 42']);
    });
    it("filters matching null", function () {
        var fn = parse('arr | filter: null');
        expect(fn({
            arr: [null, 'not null']
        })).toEqual([null]);
    });
    it("does not match undefined values", function () {
        var fn = parse('arr | filter: "undefined"');
        expect(fn({
            arr: [undefined, 'undefined']
        })).toEqual(["undefined"]);
    });

    // Negated Filtering With Strings
    it("allows negating string filter", function () {
        var fn = parse('arr | filter: "!o"');
        expect(fn({
            arr: ['quick', 'brown', 'fox']
        })).toEqual(['quick']);
    });

    // Filtering With Object Criteria
    it("filters with an object", function () {
        var fn = parse('arr | filter: {name: "o"}');
        expect(fn({arr: [
            {name: 'Joe', role: 'admin'},
            {name: 'Jane', role: 'moderator'}
        ]})).toEqual([
            {name: 'Joe', role: 'admin'}
        ]);
    });
    it("must match all criteria in an object", function () {
        var fn = parse('arr | filter: {name: "o", role: "m"}');
        expect(fn({arr: [
            {name: 'Joe', role: 'admin'},
            {name: 'Jane', role: 'moderator'}
        ]})).toEqual([
            {name: 'Joe', role: 'admin'}
        ]);
    });
    it("matches everything when filtered with an empty object", function () {
        var fn = parse('arr | filter: {}');
        expect(fn({arr: [
            {name: 'Joe', role: 'admin'},
            {name: 'Jane', role: 'moderator'}
        ]})).toEqual([
            {name: 'Joe', role: 'admin'},
            {name: 'Jane', role: 'moderator'}
        ]);
    });
    it("filter with a nested object", function () {
        var fn = parse('arr | filter: {name: {first: "o"}}');
        expect(fn({arr: [
            {name: {first: 'Joe'}, role: 'admin'},
            {name: {first: 'Jane'}, role: 'moderator'}
        ]})).toEqual([
            {name: {first: 'Joe'}, role: 'admin'},
        ]);
    });
    it("allows negation when filtering with an object", function () {
        var fn = parse('arr | filter: {name: {first: "!o"}}');
        expect(fn({arr: [
            {name: {first: 'Joe'}, role: 'admin'},
            {name: {first: 'Jane'}, role: 'moderator'}
        ]})).toEqual([
            {name: {first: 'Jane'}, role: 'moderator'}
        ]);
    });
    it("ignores undefined values in expectation object", function () {
        var fn = parse('arr | filter: {name: thisIsUndefined}');
        expect(fn({arr: [
            {name: {first: 'Joe'}, role: 'admin'},
            {name: {first: 'Jane'}, role: 'moderator'}
        ]})).toEqual([
            {name: {first: 'Joe'}, role: 'admin'},
            {name: {first: 'Jane'}, role: 'moderator'}
        ]);
    });
    it("filters with a nested object in array", function () {
        var fn = parse('arr | filter: {users: {name: {first: "o"}}}');
        expect(fn({arr: [
            {users: [{name: {first: 'Joe'}, role: 'admin'},
                {name: {first: 'Jane'}, role: 'moderator'}]},
            {users: [{name: {first: 'Mary'}, role: 'admin'}]}
        ]})).toEqual([
            {users: [{name: {first: 'Joe'}, role: 'admin'},
                {name: {first: 'Jane'}, role: 'moderator'}]}
        ]);
    });
    it("filters with nested objects on the same level only", function () {
        var items = [
            { user: 'Bob', },
            { user: { name: 'Bob' } },
            { user: { name: { first: 'Bob' }, last: 'Fox' }
        }];
        var fn = parse('arr | filter: {user: {name: "Bob"}}');
        expect(fn({arr: items})).toEqual([
            { user: { name: 'Bob' } }
        ]);
    });

    // Filtering With Object Wildcards
    it("filters with a wildcard property", function () {
        var fn = parse('arr | filter:{$: "o"}');
        expect(fn({
            arr: [
                {name: 'Joe', role: 'admin'},
                {name: 'Jane', role: 'moderator'},
                {name: 'Mary', role: 'admin'}
            ]
        })).toEqual([
            {name: 'Joe', role: 'admin'},
            {name: 'Jane', role: 'moderator'},
        ]);
    });
    it("filters with a wildcard property", function () {
        var fn = parse('arr | filter:{$: "o"}');
        expect(fn({
            arr: [
                {name: {first: 'Joe'}, role: 'admin'},
                {name: {first: 'Jane'}, role: 'moderator'},
                {name: {first: 'Mary'}, role: 'admin'}
            ]
        })).toEqual([
            {name: {first: 'Joe'}, role: 'admin'},
            {name: {first: 'Jane'}, role: 'moderator'},
        ]);
    });
    it("filters wildcard properties scoped to parent", function () {
        var fn = parse('arr | filter:{name: {$: "o"}}');
        expect(fn({
            arr: [
                {name: {first: 'Joe', last: 'Fox'}, role: 'admin'},
                {name: {first: 'Jane', last: 'Quick'}, role: 'moderator'},
                {name: {first: 'Mary', last: 'Brown'}, role: 'admin'}
            ]
        })).toEqual([
            {name: {first: 'Joe', last: 'Fox'}, role: 'admin'},
            {name: {first: 'Mary', last: 'Brown'}, role: 'admin'}
        ]);
    });
    it("filters primitives with a wildcard property", function () {
        var fn = parse('arr | filter:{$: "o"}');
        expect(fn({arr: ['Joe', 'Jane', 'Mary']})).toEqual(['Joe']);
    });
    it("filters with a nested wildcard property", function () {
        var fn = parse('arr | filter:{$: {$: "o"}}');
        expect(fn({arr: [
            {name: {first: 'Joe'}, role: 'admin'},
            {name: {first: 'Jane'}, role: 'moderator'},
            {name: {first: 'Mary'}, role: 'admin'}
        ]})).toEqual([
            {name: {first: 'Joe'}, role: 'admin'}
        ]);
    });
});