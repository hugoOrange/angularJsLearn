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
});