/* jshint globalstrict: true  */
/* global filter: false, register: false */
"use strict";

function filterFilter () {
    return function (array, filterExpr) {
        return _.filter(array, filterExpr);
    };
}

register('filter', filterFilter);