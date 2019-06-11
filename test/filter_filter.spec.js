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
});