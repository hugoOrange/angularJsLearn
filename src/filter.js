/* jshint globalstrict: true  */
"use strict";

var filters = {};

function register(name, factory) {
    if (_.isObject(name)) {
        return _.map(name, function (factory, name) {
            register(name, factory);
        });
    } else {
        var filter = factory();
        filters[name] = filter;
        return filter;
    }
}

function filter(name) {
    return filters[name];
}