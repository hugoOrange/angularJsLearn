/* jshint globalstrict: true  */
/* global angular: false, HashMap: false */
"use strict";

function createInjector(modulesToLoad, strictDi) {

    var FN_ARGS = /^function\s*[^\(]*\(\s*([^\)]*)\)/m;
    var FN_ARG  = /^\s*(_?)(\S+)\1\s*$/m;
    var STRIP_COMMENTS = /(\/\/.*$)|(\/\*.*\*\/)/mg;
    var INSTANTIATING = {};

    /* difference between `provider` and `instance`:
     * The first can't be accessed externally, can be injected one(not instance) to another
     * The second can be accessed externally, can be injected whenever
     */
    /**
     * Two phases:
     * 1. `Provider` injection happens when providers are registered from a module's invoke
     *    queue. After that, there will be no more changes to providerCache.
     * 2. At runtime there's `instance injection`, which happens whenever someone calls the
     *    injector's external API. The instance cache is populated as dependencies are
     *    instantiated, which happens in the fallback function of instanceInjector.
     */
    /**
     * Other phases:
     * 1. module-constant
     * 2. module-provider
     * 3. module-config
     * 4. all-run
     */
    var providerCache = {};
    var providerInjector = providerCache.$injector =
        createInternalInjector(providerCache, function () {
        throw 'Unknown provider: ' + path.join(' <- ');
    });
    var instanceCache = {};
    var instanceInjector = instanceCache.$injector =
        createInternalInjector(instanceCache, function (name) {
        var provider = providerInjector.get(name + 'Provider');
        return instanceInjector.invoke(provider.$get, provider);
    });

    var loadedModules = new HashMap();
    var path = [];
    strictDi = (strictDi === true);

    function enforceReturnValue(factoryFn) {
        return function () {
            var value = instanceInjector.invoke(factoryFn);
            if (_.isUndefined(value)) {
                throw 'factory must return a value';
            }
            return value;
        };
    }

    // set the function in the injection
    providerCache.$provide = {
        constant: function (key, value) {
            if (key === 'hasOwnProperty') {
                throw 'hasOwnProperty is not a valid injector name';
            }
            providerCache[key] = value;
            instanceCache[key] = value;
        },
        provider: function (key, provider) {
            if (_.isFunction(provider)) {
                provider = providerInjector.instantiate(provider);
            }
            providerCache[key + "Provider"] = provider;
        },

        factory: function (key, factoryFn, enforce) {
            this.provider(key, {
                $get: enforce === false ? factoryFn : enforceReturnValue(factoryFn)
            });
        },
        value: function (key, value) {
            this.factory(key, _.constant(value), false);
        }
    };

    // return the function annotation(parameters)
    function annotate(fn) {
        if (_.isArray(fn)) {
            return fn.slice(0, fn.length - 1);
        } else if (fn.$inject) {
            return fn.$inject;
        } else if (!fn.length) {
            return [];
        } else {
            if (strictDi) {
                throw 'fn is not using explicit annotation and ' +
                    'cannot be invoked in strict mode';
            }
            var source = fn.toString().replace(STRIP_COMMENTS, '');
            var argDeclaration = source.match(FN_ARGS);
            return _.map(argDeclaration[1].split(','), function (argName) {
                return argName.match(FN_ARG)[2];
            });
        }
    }

    function createInternalInjector(cache, factoryFn) {
        
        // get the function injected (lazily initializing)
        function getService(name) {
            if (cache.hasOwnProperty(name)) {
                if (cache[name] === INSTANTIATING) {
                    throw new Error('Circular dependency found: ' +
                        name + ' <- ' + path.join(' <- '));
                } else {
                    return cache[name];
                }
            } else {
                path.unshift(name);
                cache[name] = INSTANTIATING;
                try {
                    return (cache[name] = factoryFn(name));
                } finally {
                    path.shift(name);
                    if (cache[name] === INSTANTIATING) {
                        delete cache[name];
                    }
                }
            }
        }
        
        // invoke function with the context of the injectors
        function invoke(fn, self, locals) {
            var args = _.map(annotate(fn), function (token) {
                if (_.isString(token)) {
                    // sington
                    return locals && locals.hasOwnProperty(token) ?
                        locals[token] :
                        getService(token);
                } else {
                    throw 'Incorrect injection token! Expected a string, got ' + token;
                }
            });
            if (_.isArray(fn)) {
                fn = _.last(fn);
            }
            return fn.apply(self, args);
        }
        
        // return an object instantiated by the function
        function instantiate(Type, locals) {
            var UnwrappedType = _.isArray(Type) ? _.last(Type) : Type;
            var instance = Object.create(UnwrappedType.prototype);
            invoke(Type, instance, locals);
            return instance;
        }

        return {
            has: function (name) {
                return cache.hasOwnProperty(name) ||
                    providerCache.hasOwnProperty(name + 'Provider');
            },
            get: getService,

            invoke: invoke,

            annotate: annotate,

            instantiate: instantiate
        };
    }

    function runInvokeQueue(queue) {
        _.forEach(queue, function (invokeArgs) {
            var service = providerInjector.get(invokeArgs[0]);
            var method = invokeArgs[1];
            var args = invokeArgs[2];
            service[method].apply(service, args);
        });
    }

    var runBlocks = [];
    _.forEach(modulesToLoad, function loadModule(module) {
        if (!loadedModules.get(module)) {
            loadedModules.put(module, true);
            if (_.isString(module)) {
                module = angular.module(module);
                _.forEach(module.requires, loadModule);
                runInvokeQueue(module._invokeQueue);
                runInvokeQueue(module._configBlocks);
                runBlocks = runBlocks.concat(module._runBlocks);
            } else if (_.isFunction(module) || _.isArray(module)) {
                runBlocks.push(providerInjector.invoke(module));
            }
        }
    });
    _.forEach(_.compact(runBlocks), function (runBlock) {
        instanceInjector.invoke(runBlock);
    });

    return instanceInjector;
}
