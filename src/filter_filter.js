/* jshint globalstrict: true  */
/* global filter: false, register: false */
"use strict";

function filterFilter () {
    return function (array, filterExpr) {
        var predicateFn;
        if (_.isFunction(filterExpr)) {
            predicateFn = filterExpr;
        } else if (_.isString(filterExpr)) {
            predicateFn = createPredicateFn(filterExpr);
        } else {
            return array;
        }
        return _.filter(array, predicateFn);
    };
}

function createPredicateFn(expression) {
    // compare two primitive values
    function comparator(actual, expected) {
        actual = actual.toLowerCase();
        expected = expected.toLowerCase();
        return actual.indexOf(expected) !== -1;
    }
    
    return function predicateFn (item) {
        return deepCompare(item, expression, comparator);
    };
}

// compare two primitive values or an object of primitives to a primitive
function deepCompare(actual, expected, comparator) {
    if (_.isObject(actual)) {
        return _.some(actual, function (value) {
            return deepCompare(value, expected, comparator);
        });
    } else {
        return comparator(actual, expected);
    }
}

register('filter', filterFilter);