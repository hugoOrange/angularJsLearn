'use strict';

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
        })

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

            setTimeout(() => {
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
        /* $evalAsync $applyAsync $postDiges : are all used to execute in relation to the digest loop
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
    });
});