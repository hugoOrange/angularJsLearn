/* jshint globalstrict: true  */
/* global Scope: false, parse: false, register: false */
"use strict";

describe("Scope", function () {

    // Scope Objects
    it("can be constuected and used as an object", function () {
        var scope = new Scope();
        scope.aProperty = 1;

        expect(scope.aProperty).toBe(1);
    });

    describe("digest", function () {
        var scope;

        beforeEach(function () {
            scope = new Scope();
        });

        // watching Object Properties
        it("calls the listener function if a watch on first $digest", function () {
            var watchFn = function () {
                return 'wat';
            };
            var listenerFn = jasmine.createSpy();
            scope.$watch(watchFn, listenerFn);

            scope.$digest();

            expect(listenerFn).toHaveBeenCalled();
        });

        // Checking for Dirty Values
        it("calls the watch function with the scope as the argument", function () {
            var watchFn = jasmine.createSpy();
            var listenerFn = function() {};
            scope.$watch(watchFn, listenerFn);

            scope.$digest();

            // 判断 `watchFn(scope)` 是否被执行过
            expect(watchFn).toHaveBeenCalledWith(scope);
        });

        // Checking for Dirty Values
        it("calls the listener function when the watched value changes", function () {
            scope.someValue = 'a';
            scope.counter = 0;

            scope.$watch(
                function (scope) { return scope.someValue; },
                function (newVal, oldVal, scope) { scope.counter++; }
            );

            expect(scope.counter).toBe(0);

            scope.$digest();
            expect(scope.counter).toBe(1);
            
            scope.$digest();
            expect(scope.counter).toBe(1);
            
            scope.someValue = 'b';
            expect(scope.counter).toBe(1);
            
            scope.$digest();
            expect(scope.counter).toBe(2);

        });

        // Initializing Watch Values
        it("calls listener when watch value is first undefined", function () {
            scope.counter = 0;

            scope.$watch(
                function (scope) {
                    return scope.someValue;
                },
                function (newVal, oldVal, scope) {
                    scope.counter++;
                }
            );
            
            scope.$digest();
            expect(scope.counter).toBe(1);
        });
        it("calls listener with new value as old value the first time", function () {
            scope.someValue = 123;
            var oldValueGiven;

            scope.$watch(
                function (scope) {
                    return scope.someValue;
                },
                function (newVal, oldVal, scope) {
                    oldValueGiven = oldVal;
                }
            );

            scope.$digest();
            expect(oldValueGiven).toBe(123);
        });

        // Getting Notified Of Digests
        it("may have watchers that omit the listener function", function () {
            var watchFn = jasmine.createSpy().and.returnValue('something');
            scope.$watch(watchFn);

            scope.$digest();

            expect(watchFn).toHaveBeenCalled();
        });

        // Keeping Digesting While Dirty
        it("triggers chained watchers in the same digest", function () {
            scope.name = 'Jane';

            scope.$watch(
                function (scope) {
                    return scope.nameUpper;
                },
                function (newVal, oldVal, scope) {
                    if (newVal) {
                        scope.initial = newVal.slice(0, 1) + '.';
                    }
                }
            );

            scope.$watch(
                function (scope) {
                    return scope.name;
                },
                function (newVal, oldVal, scope) {
                    if (newVal) {
                        scope.nameUpper = newVal.toUpperCase();
                    }
                }
            );

            scope.$digest();
            expect(scope.initial).toBe('J.');

            scope.name = 'Bob';
            scope.$digest();
            expect(scope.initial).toBe('B.');
        });

        // Giving Up On An Unstable Digest
        it("gives up on the watches after 10 iterations", function () {
            scope.counterA = 0;
            scope.counterB = 0;

            scope.$watch(
                function (scope) {
                    return scope.counterA;
                },
                function (newVal, oldVal, scope) {
                    scope.counterB++;
                }
            );

            scope.$watch(
                function (scope) {
                    return scope.counterB;
                },
                function (newVal, oldVal, scope) {
                    scope.counterA++;
                }
            );

            expect((function () {
                scope.$digest();
            })).toThrow();
        });

        // Short-Circuiting The Digest When The Last Watch Is Clean
        it("ends the digest when the last watch is clean", function () {
            scope.array = _.range(100);
            var watchExecutions = 0;

            _.times(100, function (i) {
                scope.$watch(
                    function (scope) {
                        watchExecutions++;
                        return scope.array[i];
                    },
                    function (newVal, oldVal, scope) {
                    }
                );
            });

            scope.$digest();
            expect(watchExecutions).toBe(200);

            scope.array[3] = 420;
            scope.$digest();
            expect(watchExecutions).toBe(304);
        });
        it("does not end digest so that new watches are not run", function () {
            scope.aValue = 'abc';
            scope.counter = 0;

            scope.$watch(
                function (scope) {
                    return scope.aValue;
                },
                function (newVal, oldVal, scope) {
                    scope.$watch(
                        function (scope) {
                            return scope.aValue;
                        },
                        function (newValue, oldValue, sco) {
                            sco.counter++;
                        }
                    );
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);
        });

        // Value-Based Dirty-Checking
        it("compares based on value if enabled", function () {
            scope.aValue = [1, 2, 3];
            scope.counter = 0;

            scope.$watch(
                function (scope) {
                    return scope.aValue;
                },
                function (newVal, oldVal, scope) {
                    scope.counter++;
                },
                // Turn on the value-based checking
                true
            );

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.aValue.push(4);
            scope.$digest();
            expect(scope.counter).toBe(2);
        });

        // NaNs
        it("correctly handle NaNs", function () {
            scope.number = 0/0;
            scope.counter = 0;

            scope.$watch(
                function (scope) {
                    return scope.number;
                },
                function (newVal, oldVal, scope) {
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.$digest();
            expect(scope.counter).toBe(1);
        });

        // add '$eval' - Evaluating Code In The Context of A Scope
        it("executes $eval'ed function and returns result", function () {
            scope.aValue = 42;

            var result = scope.$eval(function(scope) {
                return scope.aValue;
            });

            expect(result).toBe(42);
        });
        it("passes the second $eval argument straight through", function () {
            scope.aValue = 42;

            var result = scope.$eval(function (scope, arg) {
                return scope.aValue + arg;
            }, 2);

            expect(result).toBe(44);
        });

        // add '$apply' - Integrating External Code With The Digest Cycle
        it("executes $apply'ed function and starts the digest", function () {
            scope.aValue = 'someValue';
            scope.counter = 0;

            scope.$watch(
                function (scope) {
                    return scope.aValue;
                },
                function (newVal, oldVal, scope) {
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.$apply(function (scope) {
                scope.aValue = 'someOtherValue';
            });
            expect(scope.counter).toBe(2);
        });

        // add '$evalAsync' - Deferred Execution [[ after current digest, before next digest ]]
        it("executes $evalAsync'ed function later in the same cycle", function () {
            scope.aValue = [1, 2, 3];
            scope.asyncEvaluated = false;
            scope.asyncEvaluatedImmediately = false;

            scope.$watch(
                function (scope) {
                    return scope.aValue;
                },
                function (newVal, oldVal, scope) {
                    scope.$evalAsync(function (scope) {
                        scope.asyncEvaluated = true;
                    });
                    scope.asyncEvaluatedImmediately = scope.asyncEvaluated;
                }
            );

            scope.$digest();
            expect(scope.asyncEvaluated).toBe(true);
            expect(scope.asyncEvaluatedImmediately).toBe(false);
        });

        // Scheduling $evalAsync from Watch Functions
        it("executes $evalAsync'ed functions added by watch functions", function () {
            scope.aValue = [1, 2, 3];
            scope.asyncEvaluated = false;

            scope.$watch(
                function (scope) {
                    if (!scope.asyncEvaluated) {
                        scope.$evalAsync(function (scope) {
                            scope.asyncEvaluated = true;
                        });
                    }
                    return scope.aValue;
                },
                function (newVal, oldVal, scope) {
                }
            );

            scope.$digest();
            expect(scope.asyncEvaluated).toBe(true);
        });
        it("executes $evalAsync'ed functions even when not dirty", function () {
            scope.aValue = [1, 2, 3];
            scope.asyncEvaluatedTimes = 0;
            scope.asyncEvaluated = false;

            scope.$watch(
                function (scope) {
                    if (scope.asyncEvaluatedTimes < 2) {
                        scope.$evalAsync(function (scope) {
                            scope.asyncEvaluatedTimes++;
                        });
                    }
                    return scope.aValue;
                },
                function (newVal, oldVal, scope) {
                }
            );

            scope.$digest();
            expect(scope.asyncEvaluatedTimes).toBe(2);
        });
        it("eventually halts $evalAsyncs added by watches", function () {
            scope.aValue = [1, 2, 3];

            scope.$watch(
                function (scope) {
                    scope.$evalAsync(function (scope) { });
                    return scope.aValue;
                },
                function (newVal, oldVal, scope) {
                }
            );

            expect(function () {
                scope.$digest();
            }).toThrow();
        });

        // Scope Phase
        it("has a $$phase field whose value is the current digest phase", function () {
            scope.aValue = [1, 2, 3];
            scope.phaseInWatchFunction = undefined;
            scope.phaseInListenerFunction = undefined;
            scope.phaseInApplyFunction = undefined;

            scope.$watch(
                function (scope) {
                    scope.phaseInWatchFunction = scope.$$phase;
                    return scope.aValue;
                },
                function (newVal, oldVal, scope) {
                    scope.phaseInListenerFunction = scope.$$phase;
                }
            );

            scope.$apply(function (scope) {
                scope.phaseInApplyFunction = scope.$$phase;
            });

            expect(scope.phaseInWatchFunction).toBe('$digest');
            expect(scope.phaseInListenerFunction).toBe('$digest');
            expect(scope.phaseInApplyFunction).toBe('$apply');
        });
        it("schedules a digest in $evalAsync", function (done) {
            scope.aValue = 'abc';
            scope.counter = 0;

            scope.$watch(
                function (scope) {
                    return scope.aValue;
                },
                function (newVal, oldVal, scope) {
                    scope.counter++;
                }
            );

            scope.$evalAsync(function (scope) {
            });

            expect(scope.counter).toBe(0);
            setTimeout(function () {
                expect(scope.counter).toBe(1);
                // use done() function to specify that this callback is asynchronous
                // and Jasmine should wait until it has been called before moving on.
                done();
            }, 50);
        });

        // add '$applyAsync' - Coalescing $apply Invocations
        it("allows async $apply with $applyAsync", function (done) {
            scope.counter = 0;

            scope.$watch(
                function (scope) {
                    return scope.aValue;
                },
                function (newVal, oldVal, scope) {
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);
            
            scope.$applyAsync(function (scope) {
                scope.aValue = 'abc';
            });
            expect(scope.counter).toBe(1);

            setTimeout(function () {
                expect(scope.counter).toBe(2);
                done();
            }, 50);
        });
        it("never executes $applyAsync'ed function in the same cycle", function (done) {
            scope.aValue = [1, 2, 3];
            scope.asyncApplied = false;

            scope.$watch(
                function (scope) {
                    return scope.aValue;
                },
                function (newVal, oldVal, scope) {
                    scope.$applyAsync(function (scope) {
                        scope.asyncApplied = true;
                    });
                }
            );

            scope.$digest();
            expect(scope.asyncApplied).toBe(false);
            setTimeout(function () {
                expect(scope.asyncApplied).toBe(true);
                done();
            }, 50);
        });
        it("coalesces many calls to $applyAsync", function (done) {
            scope.counter = 0;

            scope.$watch(
                function (scope) {
                    scope.counter++;
                    return scope.aValue;
                },
                function (newVal, oldVal, scope) {
                }
            );

            scope.$applyAsync(function (scope) {
                scope.aValue = 'abc';
            });
            scope.$applyAsync(function (scope) {
                scope.aValue = 'def';
            });
            scope.$applyAsync(function (scope) {
                scope.aValue = 'ghi';
            });

            setTimeout(function () {
                expect(scope.counter).toBe(2);
                expect(scope.aValue).toBe('ghi');
                done();
            }, 50);
        });
        it("cancels and flushes $applyAsync if digested first", function (done) {
            scope.counter = 0;

            scope.$watch(
                function (scope) {
                    scope.counter++;
                    return scope.aValue;
                },
                function (newVal, oldVal, scope) {
                }
            );

            scope.$applyAsync(function (scope) {
                scope.aValue = 'abc';
            });
            scope.$applyAsync(function (scope) {
                scope.aValue = 'def';
            });

            scope.$digest();
            expect(scope.counter).toBe(2);
            expect(scope.aValue).toEqual('def');

            setTimeout(function () {
                expect(scope.counter).toBe(2);
                done();
            }, 50);
        });

        // add '$$postDigest' - Running Code After A Digest
        it("runs a $$postDigest function after each digest", function () {
            scope.counter = 0;

            scope.$$postDigest(function () {
                scope.counter++;
            });

            expect(scope.counter).toBe(0);

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.$digest();
            expect(scope.counter).toBe(1);
        });
        it("does not include $$postDigest in the digest", function () {
            scope.aValue = 'original value';

            scope.$$postDigest(function () {
                scope.aValue = 'changed value';
            });
            scope.$watch(
                function (scope) {
                    return scope.aValue;
                },
                function (newVal, oldVal, scope) {
                    scope.watchedValue = newVal;
                }
            );

            scope.$digest();
            expect(scope.watchedValue).toBe('original value');

            scope.$digest();
            expect(scope.watchedValue).toBe('changed value');

        });

        // Handling Exceptions
        /* In watches there are two points when exceptions can happen: 
        * In the watch functions and in the listener functions. 
        * In this case, we expect the program to continue. */ 
        it("catches exceptions in watch function and continues", function () {
            scope.aValue = 'abc';
            scope.counter = 0;

            scope.$watch(
                function (scope) {
                    throw 'Error';
                },
                function (newVal, oldVal, scope) {
                }
            );
            scope.$watch(
                function (scope) {
                    return scope.aValue;
                },
                function (newVal, oldVal, scope) {
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);
        });
        it("catches exceptions in listener function and continues", function () {
            scope.aValue = 'abc';
            scope.counter = 0;

            scope.$watch(
                function (scope) {
                    return scope.aValue;
                },
                function (newVal, oldVal, scope) {
                    throw 'Error';
                }
            );
            scope.$watch(
                function (scope) {
                    return scope.aValue;
                },
                function (newVal, oldVal, scope) {
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);
        });
        /* $evalAsync $applyAsync $postDigest : are all used to execute in relation to the digest loop
        * In none of them do we want an exception to cause the loop to end prematurely. */
        it("catches exceptions in $evalAsync", function (done) {
            scope.aValue = 'abc';
            scope.counter = 0;

            scope.$watch(
                function (scope) {
                    return scope.aValue;
                },
                function (newVal, oldVal, scope) {
                    scope.counter++;
                }
            );

            scope.$evalAsync(function (scope) {
                throw 'Error';
            });

            setTimeout(function () {
                expect(scope.counter).toBe(1);
                done();
            }, 50);
        });
        it("catches exceptions in $applyAsync", function (done) {
            scope.$applyAsync(function () {
                throw 'Error';
            });
            scope.$applyAsync(function () {
                throw 'Error';
            });
            scope.$applyAsync(function () {
                scope.applied = true;
            });

            setTimeout(function () {
                expect(scope.applied).toBe(true);
                done();
            }, 50);
        });
        it("catches exceptions in $$postDigest", function () {
            var didRun = false;

            scope.$$postDigest(function () {
                throw 'Error';
            });
            scope.$$postDigest(function () {
                didRun = true;
            });
            
            scope.$digest();
            expect(didRun).toBe(true);
        });

        // Destroy A Watch
        it("allows destroy a $watch with a removal function", function () {
            scope.aValue = 'abc';
            scope.counter = 0;

            var destroyWatch = scope.$watch(
                function (scope) {
                    return scope.aValue;
                },
                function (newVal, oldVal, scope) {
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);
            
            scope.aValue = 'def';
            scope.$digest();
            expect(scope.counter).toBe(2);
            
            scope.aValue = 'ghi';
            destroyWatch();
            scope.$digest();
            expect(scope.counter).toBe(2);
        });
        it("allows destorying a $watch during digest", function () {
            scope.aValue = 'abc';

            var watchCalls = [];

            scope.$watch(
                function (scope) {
                    watchCalls.push('first');
                    return scope.aValue;
                }
            );

            var destroyWatch = scope.$watch(
                function (scope) {
                    watchCalls.push('second');
                    destroyWatch();
                }
            );

            scope.$watch(
                function (scope) {
                    watchCalls.push('third');
                    return scope.aValue;
                }
            );

            scope.$digest();
            expect(watchCalls).toEqual(['first', 'second', 'third', 'first', 'third']);
        });
        it("allows a $watch to destroy another during a digest", function () {
            scope.aValue = 'abc';
            scope.counter = 0;

            scope.$watch(
                function (scope) {
                    return scope.aValue;
                },
                function (newVal, oldVal, scope) {
                    destroyWatch();
                }
            );

            var destroyWatch = scope.$watch(
                function (scope) {
                },
                function (newVal, oldVal, scope) {
                }
            );

            scope.$watch(
                function (scope) {
                    return scope.aValue;
                },
                function (newVal, oldVal, scope) {
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);
        });
        it("allows destory serveral $watches during digest", function () {
            scope.aValue = 'abc';
            scope.counter = 0;

            var destroyWatch1 = scope.$watch(
                function (scope) {
                    destroyWatch1();
                    destroyWatch2();
                }
            );

            var destroyWatch2 = scope.$watch(
                function (scope) {
                    return scope.aValue;
                },
                function (newVal, oldVal, scope) {
                    scope.counter++;
                }
            );

            scope.$watch(
                function (scope) {
                    return scope.aValue;
                },
                function (newVal, oldVal, scope) {
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);
        });

        // Intergrating Expressions to Scopes
        it("accepts expressions for watch functions", function () {
            var theValue;
    
            scope.aValue = 42;
            scope.$watch('aValue', function (newVal, oldVal, scope) {
                theValue = newVal;
            });
            scope.$digest();
    
            expect(theValue).toBe(42);
        });
        it("accepts expressions in $eval", function () {
            expect(scope.$eval('42')).toBe(42);
        });
        it("accepts expressions in $apply", function () {
            var theValue;
            scope.aFunction = function () {
                theValue = 42;
            };
            scope.$apply('aFunction()');
            expect(theValue).toBe(42);
        });
        it("accepts expressions in $evalAsync", function (done) {
            var called;
            scope.aFunction = function () {
                called = true;
            };

            scope.$evalAsync('aFunction()');

            scope.$$postDigest(function () {
                expect(called).toBe(true);
                done();
            });
        });

        // Optimizing Constant Expression Watching
        it("removes constant watches after first invocation", function () {
            scope.$watch('[1, 2, 3]', function () {});
            scope.$digest();

            expect(scope.$$watchers.length).toBe(0);
        });
        it("accepts one-time watches", function () {
            var theValue;

            scope.aValue = 42;
            scope.$watch('::aValue', function (newVal, oldVal, scope) {
                theValue = newVal;
            });
            scope.$digest();

            expect(theValue).toBe(42);
        });
        it("removes one-time watches after first invocation", function () {
            scope.aValue = 42;
            scope.$watch('::aValue', function (newVal, oldVal, scope) { });
            scope.$digest();

            expect(scope.$$watchers.length).toBe(0);
        });
        it("does not remove one-time-watches until value is defined", function () {
            scope.$watch('::aValue', function () { });

            scope.$digest();
            expect(scope.$$watchers.length).toBe(1);

            scope.aValue = 42;
            scope.$digest();
            expect(scope.$$watchers.length).toBe(0);
        });
        it("does not remove one-time-watches until value stays defined", function () {
            scope.aValue = 42;

            scope.$watch('::aValue', function () { });
            var unwatchDeleter = scope.$watch('aValue', function () {
                delete scope.aValue;
            });

            scope.$digest();
            expect(scope.$$watchers.length).toBe(2);

            scope.aValue = 42;
            unwatchDeleter();
            scope.$digest();
            expect(scope.$$watchers.length).toBe(0);
        });
        it("does not remove one-time-watches before all array items defined", function () {
            scope.$watch('::[1, 2, aValue]', function () { }, true);

            scope.$digest();
            expect(scope.$$watchers.length).toBe(1);

            scope.aValue = 3;
            scope.$digest();
            expect(scope.$$watchers.length).toBe(0);
        });
        it("does not remove one-time-watches before all object properties defined", function () {
            scope.$watch('::{a: 1, b: aValue}', function () { }, true);

            scope.$digest();
            expect(scope.$$watchers.length).toBe(1);

            scope.aValue = 3;
            scope.$digest();
            expect(scope.$$watchers.length).toBe(0);
        });

        // Input Tracking
        it("does not re-evaluate an array if its contents do not change", function () {
            var values = [];

            scope.a = 1;
            scope.b = 2;
            scope.c = 3;

            scope.$watch('[a, b, c]', function (value) {
                values.push(value);
            });

            scope.$digest();
            expect(values.length).toBe(1);
            expect(values[0]).toEqual([1, 2, 3]);

            scope.$digest();
            expect(values.length).toBe(1);

            scope.c = 4;
            scope.$digest();
            expect(values.length).toBe(2);
            expect(values[1]).toEqual([1, 2, 4]);
        });

        // Stateful Filters
        it("allows $stateful filter value to change over time", function (done) {
            register('withTime', function () {
                return _.extend(function (v) {
                    return new Date().toISOString() + ': ' + v;
                }, {
                    $stateful: true
                });
            });
            register('withTime2', function () {
                return _.extend(function (v) {
                    return new Date().toISOString() + ': ' + v;
                });
            });
            
            var listenerSpy = jasmine.createSpy();
            scope.$watch('42 | withTime', listenerSpy);
            scope.$digest();
            var firstValue = listenerSpy.calls.mostRecent().args[0];

            setTimeout(function () {
                scope.$digest();
                var secondValue = listenerSpy.calls.mostRecent().args[0];
                expect(secondValue).not.toEqual(firstValue);
                done();
            }, 100);
        });

        // External Assignment
        it("allows calling assign on identifier expressions", function () {
            var fn = parse('anAttribute');
            expect(fn.assign).toBeDefined();

            var scope = {};
            fn.assign(scope, 42);
            expect(scope.anAttribute).toBe(42);
        });
        it("allows calling assign on member expressions", function () {
            var fn = parse('anObject.anAttribute');
            expect(fn.assign).toBeDefined();

            var scope = {};
            fn.assign(scope, 42);
            expect(scope.anObject).toEqual({anAttribute: 42});
        });
    });

    // add '$watchGroup' Watching Serveral Changes With One Listener
    describe("$watchGroup", function () {

        var scope;
        beforeEach(function () {
            scope = new Scope();
        });

        // Base - watch many, and listen many
        it("takes watches as an array and calls listener with arrays", function () {
            var gotNewValues, gotOldValues;

            scope.aValue = 1;
            scope.anotherValue = 2;

            scope.$watchGroup([
                function (scope) {
                    return scope.aValue;
                },
                function (scope) {
                    return scope.anotherValue;
                }
            ], function (newValues, oldValues, scope) {
                gotNewValues = newValues;
                gotOldValues = oldValues;
            });

            scope.$digest();
            expect(gotNewValues).toEqual([1, 2]);
            expect(gotOldValues).toEqual([1, 2]);
        });

        it("only calls listener once per digest", function () {
            var counter = 0;

            scope.aValue = 1;
            scope.anotherValue = 2;

            scope.$watchGroup([
                function (scope) {
                    return scope.aValue;
                },
                function (scope) {
                    return scope.anotherValue;
                }
            ], function (newValues, oldValues, scope) {
                counter++;
            });

            scope.$digest();
            expect(counter).toEqual(1);
        });

        it("uses the same array of old and new values on first run", function () {
            var gotNewValues, gotOldValues;

            scope.aValue = 1;
            scope.anotherValue = 2;

            scope.$watchGroup([
                function (scope) {
                    return scope.aValue;
                },
                function (scope) {
                    return scope.anotherValue;
                }
            ], function (newValues, oldValues, scope) {
                gotNewValues = newValues;
                gotOldValues = oldValues;
            });

            scope.$digest();
            expect(gotNewValues).toBe(gotOldValues);
        });
        it("uses different arrays for old and new values on subsequent runs", function () {
            var gotNewValues, gotOldValues;

            scope.aValue = 1;
            scope.anotherValue = 2;

            scope.$watchGroup([
                function (scope) {
                    return scope.aValue;
                },
                function (scope) {
                    return scope.anotherValue;
                }
            ], function (newValues, oldValues, scope) {
                gotNewValues = newValues;
                gotOldValues = oldValues;
            });
            scope.$digest();

            scope.anotherValue = 3;
            scope.$digest();

            expect(gotNewValues).toEqual([1, 3]);
            expect(gotOldValues).toEqual([1, 2]);
        });

        it("calls the listener at least once when the watch array is empty", function () {
            var gotNewValues, gotOldValues;

            scope.$watchGroup([], function (newValues, oldValues, scope) {
                gotNewValues = newValues;
                gotOldValues = oldValues;
            });
            scope.$digest();

            expect(gotNewValues).toEqual([]);
            expect(gotOldValues).toEqual([]);
        });

        it("can be deregistered", function () {
            var counter = 0;

            scope.aValue = 1;
            scope.anotherValue = 2;

            var destoryGroup = scope.$watchGroup([
                function (scope) {
                    return scope.aValue;
                },
                function (scope) {
                    return scope.anotherValue;
                }
            ], function (newValues, oldValues, scope) {
                counter++;
            });
            scope.$digest();

            scope.anotherValue = 3;
            destoryGroup();
            scope.$digest();

            expect(counter).toBe(1);
        });
        it("does not call the zero-watch listener when deregistered first", function () {
            var counter = 0;

            var destroyGroup = scope.$watchGroup([], function (newValues, oldValues, scope) {
                counter++;
            });
            destroyGroup();
            scope.$digest();

            expect(counter).toBe(0);
        });
    });

    // Scope Inheritance
    describe("inheritance", function () {

        /**
         * Making A Child Scope
         **** difference between scope inheritance and JavaScript's native prototypal inheritance ***
        * 1. Child scope has the properties of its parent scope
        * 2. A property defined on the child doesn't exist on the paretnt.
        * 3. When a property is defined on a parent scope, all of the scope's existing child scopes
        *    also get the property.
        * 4. We can manipulate a parent scope's properties from the child scope, since both scopes
        *    actually point to the same value.
        * 5. We can watch a parent scope's properties from a child scope.
        */
        it("inherits the parent's a properties", function () {
            var parent = new Scope();
            parent.aValue = [1, 2, 3];

            var child = parent.$new();

            expect(child.aValue).toEqual([1, 2, 3]);
        });
        it("does not cause a parent to inherit its properties", function () {
            var parent = new Scope();

            var child = parent.$new();
            child.aValue = [1, 2, 3];

            expect(parent.aValue).toBeUndefined();
        });
        it("inherits the parents' properties whenever they are defined", function () {
            var parent = new Scope();
            var child = parent.$new();

            parent.aValue = [1, 2, 3];

            expect(child.aValue).toEqual([1, 2, 3]);
        });
        it("can manipulate a parent scope's property", function () {
            var parent = new Scope();
            var child = parent.$new();
            parent.aValue = [1, 2, 3];

            child.aValue.push(4);

            expect(parent.aValue).toEqual([1, 2, 3, 4]);
            expect(child.aValue).toEqual([1, 2, 3, 4]);
        });
        it("can watch a property in the parent", function () {
            var parent = new Scope();
            var child = parent.$new();
            parent.aValue = [1, 2, 3];
            child.counter = 0;

            child.$watch(
                function (scope) {
                    return scope.aValue;
                },
                function (newVal, oldVal, scope) {
                    scope.counter++;
                },
                true
            );

            child.$digest();
            expect(child.counter).toBe(1);

            parent.aValue.push(4);
            child.$digest();
            expect(child.counter).toBe(2);
        });
        it("can be nested at any depth", function () {
            var a = new Scope();
            var aa = a.$new();
            var aaa = aa.$new();
            var aab = aa.$new();
            var ab = a.$new();
            var abb = ab.$new();

            a.value = 1;

            expect(a.value).toBe(1);
            expect(aa.value).toBe(1);
            expect(aaa.value).toBe(1);
            expect(aab.value).toBe(1);
            expect(ab.value).toBe(1);
            expect(abb.value).toBe(1);

            ab.anotherValue = 2;

            expect(a.anotherValue).toBeUndefined();
            expect(aa.anotherValue).toBeUndefined();
            expect(aaa.anotherValue).toBeUndefined();
            expect(aab.anotherValue).toBeUndefined();
            expect(ab.anotherValue).toBe(2);
            expect(abb.anotherValue).toBe(2);
        });

        // Attributes Shadowing
        it("shadows a parent's property with the same name", function () {
            var parent = new Scope();
            var child = parent.$new();

            parent.name = 'Joe';
            child.name = 'Jane';

            expect(parent.name).toBe('Joe');
            expect(child.name).toBe('Jane');
        });
        it("does not shadow members of parent scope's attributes", function () {
            var parent = new Scope();
            var child = parent.$new();

            parent.user = {name: 'Joe'};
            child.user.name = 'Jane';

            expect(child.user.name).toBe('Jane');
            expect(parent.user.name).toBe('Jane');
        });

        // Separated Watches
        it("does not digest its parent(s)", function () {
            var parent = new Scope();
            var child = parent.$new();

            parent.aValue = 'abc';
            parent.$watch(
                function (scope) {
                    return scope.aValue;
                },
                function (newVal, oldVal,scope) {
                    scope.aValueWas = newVal;
                }
            );

            child.$digest();
            expect(child.aValueWas).toBeUndefined();
        });

        // Recursive Digestion
        it("keeps a record of its children", function () {
            var parent = new Scope();
            var child1 = parent.$new();
            var child2 = parent.$new();
            var child2_1 = child2.$new();

            expect(parent.$$children.length).toBe(2);
            expect(parent.$$children[0]).toBe(child1);
            expect(parent.$$children[1]).toBe(child2);

            expect(child1.$$children.length).toBe(0);
            expect(child2.$$children.length).toBe(1);
            expect(child2.$$children[0]).toBe(child2_1);
        });
        it("digests its children", function () {
            var parent = new Scope();
            var child = parent.$new();

            parent.aValue = 'abc';
            child.$watch(
                function (scope) {
                    return scope.aValue;
                },
                function (newVal, oldVal, scope) {
                    scope.aValueWas = newVal;
                }
            );

            parent.$digest();
            expect(child.aValueWas).toBe('abc');
        });

        // Digesting The Whole Tree from $apply, $evalAsync and $applyAsync
        it("digests from root on $apply", function () {
            var parent = new Scope();
            var child = parent.$new();
            var child2 = child.$new();

            parent.aValue = 'abc';
            parent.counter = 0;
            parent.$watch(
                function (scope) {
                    return scope.aValue;
                },
                function (newVal, oldVal, scope) {
                    scope.counter++;
                }
            );

            child2.$apply(function (scope) { });

            expect(parent.counter).toBe(1);
        });
        it("schedules a digest from root on $evalAsync", function (done) {
            var parent = new Scope();
            var child = parent.$new();
            var child2 = child.$new();

            parent.aValue = 'abc';
            parent.counter = 0;
            parent.$watch(
                function (scope) {
                    return scope.aValue;
                },
                function (newVal, oldVal, scope) {
                    scope.counter++;
                }
            );

            child2.$evalAsync(function (scope) { });

            setTimeout(function () {
                expect(parent.counter).toBe(1);
                done();
            }, 50);
        });

        // Isolated Scope: parent can $digest it but cannot access its attributes
        it("does not have access to parent attributes when isolated", function () {
            var parent = new Scope();
            var child = parent.$new(true);
            
            parent.value = 'abc';

            expect(child.aValue).toBeUndefined();
        });
        it("cannot watch parent attribute when isolated", function () {
            var parent = new Scope();
            var child = parent.$new(true);

            parent.aValue = 'abc';
            child.$watch(
                function (scope) {
                    return scope.aValue;
                },
                function (newVal, oldVal, scope) {
                    scope.aValueWas = newVal;
                }
            );

            child.$digest();
            expect(child.aValueWas).toBeUndefined();
        });
        it("digests its isolated children", function () {
            var parent = new Scope();
            var child = parent.$new(true);

            child.aValue = 'abc';
            child.$watch(
                function (scope) {
                    return scope.aValue;
                },
                function (newVal, oldVal, scope) {
                    scope.aValueWas = newVal;
                }
            );

            parent.$digest();
            expect(child.aValueWas).toBe('abc');
        });
        it("digest from root on $apply when isolated", function () {
            var parent = new Scope();
            var child = parent.$new(true);
            var child2 = child.$new();

            parent.aValue = 'abc';
            parent.counter = 0;
            parent.$watch(
                function (scope) {
                    return scope.aValue;
                },
                function (newVal, oldVal, scope) {
                    scope.counter++;
                }
            );

            child2.$apply(function (scope) { });

            expect(parent.counter).toBe(1);
        });
        it("schedules a digest from root on $evalAsync", function (done) {
            var parent = new Scope();
            var child = parent.$new(true);
            var child2 = parent.$new();

            parent.aValue = 'abc';
            parent.counter = 0;
            parent.$watch(
                function (scope) {
                    return scope.aValue;
                },
                function (newVal, oldVal, scope) {
                    scope.counter++;
                }
            );

            child2.$evalAsync(function (scope) { });

            setTimeout(function () {
                expect(parent.counter).toBe(1);
                done();
            }, 50);
        });
        it("exectutes $evalAsync functions on isolated scopes", function (done) {
            var parent = new Scope();
            var child = parent.$new(true);

            child.$evalAsync(function (scope) {
                scope.didEvalAsync = true;
            });

            setTimeout(function () {
                expect(child.didEvalAsync).toBe(true);
                done();
            }, 50);
        });
        it("exectutes $postDigest functions on isolated scopes", function () {
            var parent = new Scope();
            var child = parent.$new(true);

            child.$$postDigest(function () {
                child.didEvalAsync = true;
            });
            parent.$digest();

            expect(child.didEvalAsync).toBe(true);
        });

        // Substituting The Parent Scope
        it("can take some other scope as the parent", function () {
            var prototypeParent = new Scope();
            var hierarchyParent = new Scope();
            var child = prototypeParent.$new(false, hierarchyParent);

            prototypeParent.a = 42;
            expect(child.a).toBe(42);

            child.counter = 0;
            child.$watch(function (scope) {
                scope.counter++;
            });

            prototypeParent.$digest();
            expect(child.counter).toBe(0);

            hierarchyParent.$digest();
            expect(child.counter).toBe(2);
        });

        // Destroy a scope
        it("is no longer digested when $destory has been called", function () {
            var parent = new Scope();
            var child = parent.$new();

            child.aValue = [1, 2, 3];
            child.counter = 0;
            child.$watch(
                function (scope) {
                    return scope.aValue;
                },
                function (newVal, oldVal, scope) {
                    scope.counter++;
                },
                true
            );

            parent.$digest();
            expect(child.counter).toBe(1);
            
            child.aValue.push(4);
            parent.$digest();
            expect(child.counter).toBe(2);

            child.$destroy();
            child.aValue.push(5);
            parent.$digest();
            expect(child.counter).toBe(2);
        });
    });

    // add '$watchCollection' watch an array or object instead of value-based watching
    describe("$watchCollection", function () {
        
        var scope;

        beforeEach(function () {
            scope = new Scope();
        });

        // works with non-collections
        it("works like a normal watch for non-collections", function () {
            var valueProvided;

            scope.aValue = 42;
            scope.counter = 0;

            scope.$watchCollection(
                function (scope) {
                    return scope.aValue;
                },
                function (newVal, oldVal, scope) {
                    valueProvided = newVal;
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);
            expect(valueProvided).toBe(scope.aValue);

            scope.aValue = 43;
            scope.$digest();
            expect(scope.counter).toBe(2);

            scope.$digest();
            expect(scope.counter).toBe(2);
        });
        it("works like a normal watch for NaNs", function () {
            scope.aValue = 0/0;
            scope.counter = 0;

            scope.$watchCollection(
                function (scope) {
                    return scope.aValue;
                },
                function (newValue, oldValue, scope) {
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.$digest();
            expect(scope.counter).toBe(1);
        });

        // Detecting New Arrays
        it("notices when the value becomes an array", function () {
            scope.counter = 0;

            scope.$watchCollection(
                function (scope) {
                    return scope.arr;
                },
                function (newValue, oldValue, scope) {
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.arr = [1, 2, 3];
            scope.$digest();
            expect(scope.counter).toBe(2);

            scope.$digest();
            expect(scope.counter).toBe(2);
        });

        // Detecting New or Removed Items in Arrays
        it("notices an item added to an array", function () {
            scope.arr = [1, 2, 3];
            scope.counter = 0;

            scope.$watchCollection(
                function (scope) {
                    return scope.arr;
                },
                function (newVal, oldVal, scope) {
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.arr.push(4);
            scope.$digest();
            expect(scope.counter).toBe(2);

            scope.$digest();
            expect(scope.counter).toBe(2);
        });
        it("notices an item removed from an array", function () {
            scope.arr = [1, 2, 3];
            scope.counter = 0;

            scope.$watchCollection(
                function (scope) {
                    return scope.arr;
                },
                function (newVal, oldVal, scope) {
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.arr.shift();
            scope.$digest();
            expect(scope.counter).toBe(2);

            scope.$digest();
            expect(scope.counter).toBe(2);
        });

        // Detecting Replaced or Reordered Items in Arrays
        it("notices an item replaced in an array", function () {
            scope.arr = [1, 2, 3];
            scope.counter = 0;

            scope.$watchCollection(
                function (scope) {
                    return scope.arr;
                },
                function (newVal, oldVal, scope) {
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.arr[1] = 42;
            scope.$digest();
            expect(scope.counter).toBe(2);

            scope.$digest();
            expect(scope.counter).toBe(2);
        });
        it("notices an item reordered in an array", function () {
            scope.arr = [2, 1, 3];
            scope.counter = 0;

            scope.$watchCollection(
                function (scope) {
                    return scope.arr;
                },
                function (newVal, oldVal, scope) {
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.arr.sort();
            scope.$digest();
            expect(scope.counter).toBe(2);

            scope.$digest();
            expect(scope.counter).toBe(2);
        });
        it("does not fail on NaNs in arrays", function () {
            scope.arr = [2, NaN, 3];
            scope.counter = 0;

            scope.$watchCollection(
                function (scope) {
                    return scope.arr;
                },
                function (newVal, oldVal, scope) {
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);
        });

        // Array-like Objects
        it("notices an item replaced in an arguments object", function () {
            (function () {
                scope.arrayLike = arguments;
            })(1, 2, 3);
            scope.counter = 0;

            scope.$watchCollection(
                function (scope) {
                    return scope.arrayLike;
                },
                function (newVal, oldVal, scope) {
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);
            
            scope.arrayLike[1] = 42;
            scope.$digest();
            expect(scope.counter).toBe(2);
            
            scope.$digest();
            expect(scope.counter).toBe(2);
        });
        it("notices an item replaced in an NodeList object", function () {
            document.documentElement.appendChild(document.createElement("div"));
            scope.arrayLike = document.getElementsByTagName("div");
            scope.counter = 0;

            scope.$watchCollection(
                function (scope) {
                    return scope.arrayLike;
                },
                function (newVal, oldVal, scope) {
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);
            
            document.documentElement.appendChild(document.createElement("div"));
            scope.$digest();
            expect(scope.counter).toBe(2);
            
            scope.$digest();
            expect(scope.counter).toBe(2);
        });

        // Detecting New Objects
        it("notices when the value becomes an object", function () {
            scope.counter = 0;

            scope.$watchCollection(
                function (scope) {
                    return scope.obj;
                },
                function (newVal, oldVal, scope) {
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.obj = { a: 1 };
            scope.$digest();
            expect(scope.counter).toBe(2);
            
            scope.$digest();
            expect(scope.counter).toBe(2);
        });

        // Detecting New or Replaced Attributes in Objects
        it("notices when an attribute is added to an object", function () {
            scope.counter = 0;
            scope.obj = { a: 1 };

            scope.$watchCollection(
                function (scope) {
                    return scope.obj;
                },
                function (newVal, oldVal, scope) {
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.obj.b = 2;
            scope.$digest();
            expect(scope.counter).toBe(2);
            
            scope.$digest();
            expect(scope.counter).toBe(2);
        });
        it("notices when an attribute is changed to an object", function () {
            scope.counter = 0;
            scope.obj = { a: 1 };

            scope.$watchCollection(
                function (scope) {
                    return scope.obj;
                },
                function (newVal, oldVal, scope) {
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.obj.a = 2;
            scope.$digest();
            expect(scope.counter).toBe(2);
            
            scope.$digest();
            expect(scope.counter).toBe(2);
        });
        it("does not fail on NaNs attributes in objects", function () {
            scope.counter = 0;
            scope.obj = { a: NaN };

            scope.$watchCollection(
                function (scope) {
                    return scope.obj;
                },
                function (newVal, oldVal, scope) {
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);
        });
        it("notices when an attribute is removed to an object", function () {
            scope.counter = 0;
            scope.obj = { a: 1 };

            scope.$watchCollection(
                function (scope) {
                    return scope.obj;
                },
                function (newVal, oldVal, scope) {
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);

            delete scope.obj.a;
            scope.$digest();
            expect(scope.counter).toBe(2);
            
            scope.$digest();
            expect(scope.counter).toBe(2);
        });

        // Dealing with Objects that Have A Length
        it("does not consider any object with a length property an array", function () {
            scope.obj = {
                length: 42,
                otherKey: 'abc'
            };
            scope.counter = 0;

            scope.$watchCollection(
                function (scope) {
                    return scope.obj;
                },
                function (newVal, oldVal, scope) {
                    scope.counter++;
                }
            );
            
            scope.$digest();

            scope.obj.newKey = 'def';
            scope.$digest();

            expect(scope.counter).toBe(2);
        });

        // Handling the Old Collection Value to Listener
        it("gives the old non-collection vlaue to listeners", function () {
            scope.aValue = 42;
            var oldValueGiven;

            scope.$watchCollection(
                function (scope) {
                    return scope.aValue;
                },
                function (newVal, oldVal, scope) {
                    oldValueGiven = oldVal;
                }
            );

            scope.$digest();

            scope.aValue = 43;
            scope.$digest();

            expect(oldValueGiven).toBe(42);
        });
        it("gives the old array value to listeners", function () {
            scope.aValue = [1, 2, 3];
            var oldValueGiven;

            scope.$watchCollection(
                function (scope) {
                    return scope.aValue;
                },
                function (newVal, oldVal, scope) {
                    oldValueGiven = oldVal;
                }
            );

            scope.$digest();

            scope.aValue.push(4);
            scope.$digest();

            expect(oldValueGiven).toEqual([1, 2, 3]);
        });
        it("gives the old object value to listeners", function () {
            scope.aValue = { a: 1, b: 2 };
            var oldValueGiven;

            scope.$watchCollection(
                function (scope) {
                    return scope.aValue;
                },
                function (newVal, oldVal, scope) {
                    oldValueGiven = oldVal;
                }
            );

            scope.$digest();

            scope.aValue.c = 3;
            scope.$digest();

            expect(oldValueGiven).toEqual({ a: 1, b: 2 });
        });
        it("uses the new value as the old value on first digest", function () {
            scope.aValue = { a: 1, b: 2 };
            var oldValueGiven;

            scope.$watchCollection(
                function (scope) {
                    return scope.aValue;
                },
                function (newVal, oldVal, scope) {
                    oldValueGiven = oldVal;
                }
            );

            scope.$digest();

            expect(oldValueGiven).toEqual({ a: 1, b: 2 });
        });

        // Integrating Expressions to Scope
        it("accepts expressions for watch functions", function () {
            var theValue;

            scope.aColl = [1, 2, 3];
            scope.$watchCollection('aColl', function (newVal, oldVal, scope) {
                theValue = newVal;
            });
            scope.$digest();

            expect(theValue).toEqual([1, 2, 3]);
        });
    });

    // Scope Events
    describe("Events", function () {
        
        var parent;
        var scope;
        var child;
        var isolatedChild;

        beforeEach(function () {
            parent = new Scope();
            scope = parent.$new();
            child = scope.$new();
            isolatedChild = scope.$new(true);
        });

        // add $on - Register the event
        it("allows registering listeners", function () {
            var listener1 = function () { };
            var listener2 = function () { };
            var listener3 = function () { };

            scope.$on("someEvent", listener1);
            scope.$on("someEvent", listener2);
            scope.$on("someOtherEvent", listener3);

            expect(scope.$$listeners).toEqual({
                someEvent: [listener1, listener2],
                someOtherEvent: [listener3]
            });
        });
        it("registers different listeners for every scope", function () {
            var listener1 = function () { };
            var listener2 = function () { };
            var listener3 = function () { };

            scope.$on("someEvent", listener1);
            child.$on("someEvent", listener2);
            isolatedChild.$on("someEvent", listener3);

            expect(scope.$$listeners).toEqual({ someEvent: [listener1] });
            expect(child.$$listeners).toEqual({ someEvent: [listener2] });
            expect(isolatedChild.$$listeners).toEqual({ someEvent: [listener3] });
        });

        // add $emit and $broadcast - send event
        _.forEach(["$emit", "$broadcast"], function (method) {
            it("calls the listeners of the matching event on " + method, function () {
                var listener1 = jasmine.createSpy();
                var listener2 = jasmine.createSpy();
                scope.$on("someEvent", listener1);
                scope.$on("someOtherEvent", listener2);

                scope[method]("someEvent");

                expect(listener1).toHaveBeenCalled();
                expect(listener2).not.toHaveBeenCalled();
            });

            // Event Objects
            it("passes an event object with a name to listeners on " + method, function () {
                var listener = jasmine.createSpy();
                scope.$on("someEvent", listener);

                scope[method]("someEvent");

                expect(listener).toHaveBeenCalled();
                expect(listener.calls.mostRecent().args[0].name).toEqual("someEvent");
            });
            it("pass the same event object to each listener on " + method, function () {
                var listener1 = jasmine.createSpy();
                var listener2 = jasmine.createSpy();
                scope.$on("someEvent", listener1);
                scope.$on("someEvent", listener2);

                scope[method]("someEvent");

                var event1 = listener1.calls.mostRecent().args[0];
                var event2 = listener2.calls.mostRecent().args[0];
                
                expect(event1).toBe(event2);
            });

            // Additional Listener Arguments
            it("pass additional arguments to listener on " + method, function () {
                var listener = jasmine.createSpy();
                scope.$on("someEvent", listener);

                scope[method]("someEvent", "and", ["additional", "arguments"], "...");

                expect(listener.calls.mostRecent().args[1]).toEqual("and");
                expect(listener.calls.mostRecent().args[2]).toEqual(["additional", "arguments"]);
                expect(listener.calls.mostRecent().args[3]).toEqual("...");
            });

            // Returning The Event Object
            it("returns the event obejct on " + method, function () {
                var returnedEvent = scope[method]("someEvent");

                expect(returnedEvent).toBeDefined();
                expect(returnedEvent.name).toEqual("someEvent");
            });

            // Deregistering Event Listeners
            it("can be deregistered " + method, function () {
                var listener = jasmine.createSpy();
                var deregister = scope.$on("someEvent", listener);

                deregister();

                scope[method]("someEvent");

                expect(listener).not.toHaveBeenCalled();
            });
            it("does not skip the next listener when removed on " + method, function () {
                var deregister;
                
                var listener = function () {
                    deregister();
                };
                var nextListener = jasmine.createSpy();

                deregister = scope.$on("someEvent", listener);
                scope.$on("someEvent", nextListener);

                scope[method]("someEvent");

                expect(nextListener).toHaveBeenCalled();
            });

            // Handling Exceptions
            it("does not stop on exceptions on " + method, function () {
                var listener1 = function (event) {
                    throw "listener1 throwing an exception";
                };
                var listener2 = jasmine.createSpy();
                scope.$on("someEvent", listener1);
                scope.$on("someEvent", listener2);

                scope[method]("someEvent");

                expect(listener2).toHaveBeenCalled();
            });
        });

        // Emitting Up the Scope Hierarchy
        it("progagates up the scope hierarchy on $emit", function () {
            var parentListener = jasmine.createSpy();
            var scopeListener = jasmine.createSpy();

            parent.$on("someEvent", parentListener);
            scope.$on("someEvent", scopeListener);

            scope.$emit("someEvent");

            expect(parentListener).toHaveBeenCalled();
            expect(scopeListener).toHaveBeenCalled();
        });

        // Broadcasting down the Scope Hierarchy
        it("progagates down the scope hierarchy on $broadcast", function () {
            var scopeListener = jasmine.createSpy();
            var childListener = jasmine.createSpy();
            var isolatedChildListener = jasmine.createSpy();

            scope.$on("someEvent", scopeListener);
            child.$on("someEvent", childListener);
            isolatedChild.$on("someEvent", isolatedChildListener);

            scope.$broadcast("someEvent");

            expect(scopeListener).toHaveBeenCalled();
            expect(childListener).toHaveBeenCalled();
            expect(isolatedChildListener).toHaveBeenCalled();
        });
        it("porpagates the same event down on $broadcast", function () {
            var scopeListener = jasmine.createSpy();
            var childListener = jasmine.createSpy();

            scope.$on("someEvent", scopeListener);
            child.$on("someEvent", childListener);

            scope.$broadcast("someEvent");

            var scopeEvent = scopeListener.calls.mostRecent().args[0];
            var childEvent = childListener.calls.mostRecent().args[0];
            expect(scopeEvent).toBe(childEvent);
        });

        // Including the Current and Target Scopes in the Event Objects
        it("attaches targetScope on $emit", function () {
            var parentListener = jasmine.createSpy();
            var scopeListener = jasmine.createSpy();

            parent.$on("someEvent", parentListener);
            scope.$on("someEvent", scopeListener);

            scope.$emit("someEvent");

            expect(parentListener.calls.mostRecent().args[0].targetScope).toBe(scope);
            expect(scopeListener.calls.mostRecent().args[0].targetScope).toBe(scope);
        });
        it("attaches targetScope on $broadcast", function () {
            var scopeListener = jasmine.createSpy();
            var childListener = jasmine.createSpy();

            scope.$on("someEvent", scopeListener);
            child.$on("someEvent", childListener);

            scope.$broadcast("someEvent");

            expect(scopeListener.calls.mostRecent().args[0].targetScope).toBe(scope);
            expect(childListener.calls.mostRecent().args[0].targetScope).toBe(scope);
        });
        it("attaches currentScope on $emit", function () {
            var currentScopeOnScope, currentScopeOnParent;
            var scopeListener = function (event) {
                currentScopeOnScope = event.currentScope;
            };
            var parentListener = function (event) {
                currentScopeOnParent = event.currentScope;
            };

            scope.$on("someEvent", scopeListener);
            parent.$on("someEvent", parentListener);

            scope.$emit("someEvent");

            expect(currentScopeOnParent).toBe(parent);
            expect(currentScopeOnScope).toBe(scope);
        });
        it("attaches currentScope on $broadcast", function () {
            var currentScopeOnScope, currentScopeOnChild;
            var scopeListener = function (event) {
                currentScopeOnScope = event.currentScope;
            };
            var childListener = function (event) {
                currentScopeOnChild = event.currentScope;
            };

            scope.$on("someEvent", scopeListener);
            child.$on("someEvent", childListener);

            scope.$broadcast("someEvent");

            expect(currentScopeOnChild).toBe(child);
            expect(currentScopeOnScope).toBe(scope);
        });
        it("sets currentScope to null after propagation on $emit", function () {
            var event;
            var scopeListener = function (evt) {
                event = evt;
            };
            scope.$on("someEvent", scopeListener);

            scope.$emit("someEvent");

            expect(event.currentScope).toBe(null);
        });
        it("sets currentScope to null after propagation on $broadcast", function () {
            var event;
            var scopeListener = function (evt) {
                event = evt;
            };
            scope.$on("someEvent", scopeListener);

            scope.$broadcast("someEvent");

            expect(event.currentScope).toBe(null);
        });

        // Stopping Event Propagation
        it("does not propagate to parents when stopped", function () {
            var scopeListener = function (event) {
                event.stopPropagation();
            };
            var parentListener = jasmine.createSpy();

            scope.$on("someEvent", scopeListener);
            parent.$on("someEvent", parentListener);

            scope.$emit("someEvent");

            expect(parentListener).not.toHaveBeenCalled();
        });
        it("is received by listeners on current scope after being stopped", function () {
            var listener1 = function (event) {
                event.stopPropagation();
            };
            var listener2 = jasmine.createSpy();

            scope.$on("someEvent", listener1);
            scope.$on("someEvent", listener2);

            scope.$emit("someEvent");

            expect(listener2).toHaveBeenCalled();
        });

        // Preventing Default Event Behavior
        it("is sets defaultPrevented when preventDafault called on $emit", function () {
            var listener = function (event) {
                event.preventDefault();
            };
            scope.$on("someEvent", listener);

            var event = scope.$emit("someEvent");

            expect(event.defaultPrevented).toBe(true);
        });
        it("is sets defaultPrevented when preventDafault called on $broadcast", function () {
            var listener = function (event) {
                event.preventDefault();
            };
            scope.$on("someEvent", listener);

            var event = scope.$broadcast("someEvent");

            expect(event.defaultPrevented).toBe(true);
        });

        // Broadcasting Scope Removal
        it("fires $destroy when destroyed", function () {
            var listener = jasmine.createSpy();
            scope.$on("$destroy", listener);

            scope.$destroy();

            expect(listener).toHaveBeenCalled();
        });
        it("fires $destroy on children destroyed", function () {
            var listener = jasmine.createSpy();
            child.$on("$destroy", listener);

            scope.$destroy();

            expect(listener).toHaveBeenCalled();
        });

        // Disabling Listeners On Destroyed Scopes
        it("no longers calls listeners after destroyed", function () {
            var listener = jasmine.createSpy();
            scope.$on("myEvent", listener);

            scope.$destroy();

            scope.$emit("myEvent");
            expect(listener).not.toHaveBeenCalled();
        });
    });
});