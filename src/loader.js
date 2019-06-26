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

    var createModule = function (name, requires, modules, configFn) {
        if (name === 'hasOwnProperty') {
            throw "hasOwnProperty is not a valid module name";
        }

        var invokeQueue = [];
        var configBlocks = [];

        // ensure that constant inject first
        var invokeLater = function (service, method, arrayMethod, queue) {
            return function () {
                queue = queue || invokeQueue;
                queue[arrayMethod || 'push']([service, method, arguments]);
                return moduleInstance;
            };
        };

        var moduleInstance = {
            name: name,
            requires: requires,
            constant: invokeLater('$provide', 'constant', 'unshift'),
            provider: invokeLater('$provide', 'provider'),
            factory: invokeLater('$provide', 'factory'),
            value: invokeLater('$provide', 'value'),
            service: invokeLater('$provide', 'service'),
            // config -- run during module loading, is often used to config the 
            // provide function instead of writing another provider to do it
            config: invokeLater('$injector', 'invoke', 'push', configBlocks),
            // run -- is not for injecting, but is used to run some arbitary code
            // you want to hook on to the Angular startup process
            run: function (fn) {
                moduleInstance._runBlocks.push(fn);
                return moduleInstance;
            },
            _invokeQueue: invokeQueue,
            _configBlocks: configBlocks,
            _runBlocks: []
        };

        if (configFn) {
            moduleInstance.config(configFn);
        }

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
        return function (name, requires, configFn) {
            if (requires) {
                return createModule(name, requires, modules, configFn);
            } else {
                return gotModule(name, modules);
            }
        };
    });
}