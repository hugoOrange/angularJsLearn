/* jshint globalstrict: true  */
"use strict";

function setupModuleLoader(window) {
    var ensure = function (obj, name, factory) {
        return obj[name] || (obj[name] = factory());
    };

    var angular = ensure(window, 'angular', Object);

    var createModule = function (name, requires, modules) {
        var moduleInstance = {
            name: name,
            requires: requires
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
            if (name === 'hasOwnProperty') {
                throw "hasOwnProperty is not a valid module name";
            }
            if (requires) {
                return createModule(name, requires, modules);
            } else {
                return gotModule(name, modules);
            }
        };
    });
}