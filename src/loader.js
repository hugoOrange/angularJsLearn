/* jshint globalstrict: true  */
"use strict";

/**
 * difference between `module` and `injector`:
 * `module`   -- stores the factory method making up value
 * `injector` -- stores the extract value
 */
function setupModuleLoader(window) {
    var ensure = function (obj, name, factory) {
        return obj[name] || (obj[name] = factory());
    };

    var angular = ensure(window, 'angular', Object);

    var createModule = function (name, requires, modules) {
        if (name === 'hasOwnProperty') {
            throw "hasOwnProperty is not a valid module name";
        }
        var invokeQueue = [];
        var moduleInstance = {
            name: name,
            requires: requires,
            constant: function (key, value) {
                invokeQueue.push(['constant', [key, value]]);
            },
            _invokeQueue: invokeQueue
        };
        modules[name] = moduleInstance;
        return moduleInstance;
    };

    var gotModule = function (name, modules) {
        if (modules.hasOwnProperty(name)) {
            return modules[name];
        } else {
            throw "Module " + name + " is not available!";
        }
    };

    var module = ensure(window.angular, 'module', function () {
        var modules = {};
        return function (name, requires) {
            if (requires) {
                return createModule(name, requires, modules);
            } else {
                return gotModule(name, modules);
            }
        };
    });
}