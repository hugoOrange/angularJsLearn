/* jshint globalstrict: true  */
"use strict";

/*
* using tip:
* 1. avoid using 'valueEq'(deep copy)
* 2. using $applyAsync to coalsecing the $digest
* 3. sometimes we can use $digest instead of $apply, for the $apply would
*    $digest all the scope
* 4. watch level -- see detail in "../img/concepts-scope-watch-strategies.png"
*/

function Scope() {
    this.$root = this;
    this.$$watchers = [];
    this.$$lastDirtyWatch = null;
    this.$$asyncQueue = [];
    this.$$applyAsyncQueue = [];
    this.$$applyAsyncId = null;
    this.$$postDigestQueue = [];
    // In AngularJS, it uses $$nextSibling, $$prevSibling, etc. with better performance.
    this.$$children = [];
    this.$$phase = null;
}

function initWatchVal() {}

Scope.prototype.$new = function (isolated, parent) {
    var child;
    parent = parent || this;
    if (isolated) {
        child = new Scope();
        child.$root = parent.$root;
        child.$$asyncQueue = parent.$$asyncQueue;
        child.$$postDigestQueue = parent.$$postDigestQueue;
        child.$$applyAsyncQueue = parent.$$applyAsyncQueue;
    } else {
        var ChildScope = function () { };
        ChildScope.prototype = this;
        child = new ChildScope();
    }
    parent.$$children.push(child);
    child.$$watchers = [];
    child.$$children = [];
    child.$parent = parent;
    return child;
};

Scope.prototype.$destroy = function () {
    if (this.$parent) {
        var siblings = this.$parent.$$children;
        var indexOfThis = siblings.indexOf(this);
        if (indexOfThis >= 0) {
            siblings.splice(indexOfThis, 1);
        }
    }
    this.$$watchers = null;
};

Scope.prototype.$beginPhase = function (phase) {
    if (this.$$phase) {
        throw this.$$phase + ' already in progress.';
    }
    this.$$phase = phase;
};

Scope.prototype.$clearPhase = function () {
    this.$$phase = null;
};

Scope.prototype.$watch = function (watchFn, listenerFn, valueEq) {
    var self = this;
    var watcher = {
        watchFn: watchFn,
        listenerFn: listenerFn || function () { },
        valueEq: !!valueEq,
        last: initWatchVal
    };
    this.$$watchers.unshift(watcher);
    this.$root.$$lastDirtyWatch = null;
    return function () {
        var index = self.$$watchers.indexOf(watcher);
        if (index >= 0) {
            self.$$watchers.splice(index, 1);
            self.$root.$$lastDirtyWatch = null;
        }
    };
};

Scope.prototype.$watchGroup = function (watchFns, listenerFn) {
    var self = this;
    var newValues = new Array(watchFns.length);
    var oldValues = new Array(watchFns.length);
    var changeReactionScheduled = false;
    var firstRun = true;

    if (watchFns.length === 0) {
        var shouldCall = true;
        self.$evalAsync(function () {
            if (shouldCall) {
                listenerFn(newValues, oldValues, self);
            }
        });
        return function () {
            shouldCall = false;
        };
    }

    function watchGroupListener() {
        if (firstRun) {
            firstRun = false;
            listenerFn(newValues, newValues, self);
        } else {
            listenerFn(newValues, oldValues, self);
        }
        changeReactionScheduled = false;
    }

    var destroyFunctions = _.map(watchFns, function (watchFn, i) {
        return self.$watch(watchFn, function (newValue, oldValue) {
            newValues[i] = newValue;
            oldValues[i] = oldValue;
            if (!changeReactionScheduled) {
                changeReactionScheduled = true;
                self.$evalAsync(watchGroupListener);
            }
        });
    });

    return function () {
        _.forEach(destroyFunctions, function (destroyFunction) {
            destroyFunction();
        });
    };
};

Scope.prototype.$watchCollection = function (watchFn, listenerFn) {
    var self = this;
    var newValue;
    var oldValue;
    var changeCount = 0;
    
    var internalWatchFn = function (scope) {
        newValue = watchFn(scope);

        if (_.isObject(newValue)) {
            if (_.isArrayLike(newValue)) {
                if (!_.isArray(oldValue)) {
                    changeCount++;
                    oldValue = [];
                } 
                if (newValue.length !== oldValue.length) {
                    changeCount++;
                    oldValue.length = newValue.length;
                }
                _.forEach(newValue, function (newItem, i) {
                    var bothNaN = _.isNaN(newItem) && _.isNaN(oldValue[i]);
                    if (!bothNaN && newItem !== oldValue[i]) {
                        changeCount++;
                        oldValue[i] = newItem;
                    }
                });
            } else {
                
            }
        } else {
            if (!self.$$areEqual(newValue, oldValue, false)) {
                changeCount++;
            }
            oldValue = newValue;
        }

        return changeCount;
    };

    var internalListenerFn = function () {
        listenerFn(newValue, oldValue, self);
    };

    return this.$watch(internalWatchFn, internalListenerFn);
};

Scope.prototype.$$areEqual = function (newVal, oldVal, valueEq) {
    if (valueEq) {
        return _.isEqual(newVal, oldVal);
    } else {
        return newVal === oldVal ||
            (typeof newVal === 'number' && typeof oldVal === 'number' &&
                _.isNaN(newVal) && _.isNaN(oldVal));
    }
};

Scope.prototype.$$flushApplyAsync = function () {
    while (this.$$applyAsyncQueue.length) {
        try {
            this.$$applyAsyncQueue.shift()();
        } catch (e) {
            console.log(e);
        }
    }
    this.$root.$$applyAsyncId = null;
};

Scope.prototype.$$everyScope = function (fn) {
    if (fn(this)) {
        return this.$$children.every(function (child) {
            return child.$$everyScope(fn);
        });
    } else {
        return false;
    }
};

Scope.prototype.$$digestOnce = function () {
    var dirty;
    this.$$everyScope(function (scope) {
        var newVal, oldVal;
        _.forEachRight(scope.$$watchers, function (watcher) {
            try {
                if (watcher) {
                    newVal = watcher.watchFn(scope);
                    oldVal = watcher.last;
                    if (!scope.$$areEqual(newVal, oldVal, watcher.valueEq)) {
                        scope.$root.$$lastDirtyWatch = watcher;
                        watcher.last = (watcher.valueEq ? _.cloneDeep(newVal) : newVal);
                        watcher.listenerFn(newVal, 
                            (oldVal === initWatchVal ? newVal : oldVal),
                            scope);

                        dirty = true;
                    } else if (scope.$root.$$lastDirtyWatch === watcher) {
                        dirty = false;
                        return false;
                    }
                }
            } catch (e) {
                // In angular, there is a specific service to deal with exceptions: $exceptionHandler
                console.log(e);
            }
        });
        return dirty !== false;
    });
    return dirty;
};

Scope.prototype.$digest = function () {
    var dirty = true;
    var TTL = 10; // "TTL" -- "Time To Live"
    this.$root.$$lastDirtyWatch = null;
    this.$beginPhase('$digest');
    
    if (this.$root.$$applyAsyncId) {
        clearTimeout(this.$root.$$applyAsyncId);
        this.$$flushApplyAsync();
    }
    
    do {
        if (this.$$asyncQueue.length) {
            try {
                var asyncTask = this.$$asyncQueue.shift();
                asyncTask.scope.$eval(asyncTask.expression);
            } catch (e) {
                console.log(e);
            }
        }
        dirty = this.$$digestOnce();
        if ((dirty || this.$$asyncQueue.length) && !(TTL--)) {
            this.$clearPhase();
            throw "10 digest iterations reached";
        }
    } while (dirty || this.$$asyncQueue.length);
    this.$clearPhase();

    while (this.$$postDigestQueue.length) {
        try {
            this.$$postDigestQueue.shift()();
        } catch (e) {
            console.log(e);
        }
    }
};



// Execution with the context of the scope
// can be run inside or outside the $digest
Scope.prototype.$eval = function (expr, locals) {
    return expr(this, locals);
};

// Deferred execution('$eval') in listener
Scope.prototype.$evalAsync = function (expr, locals) {
    var self = this;
    if (!self.$$phase && !self.$$asyncQueue.length) {
        setTimeout(function () {
            if (self.$$asyncQueue.length) {
                self.$root.$digest();
            }
        }, 0);
    }
    this.$$asyncQueue.push({
        scope: this,
        expression: expr
    });
};

// Execution with the context of the scope and auto dirty-checking
Scope.prototype.$apply = function (expr) {
    try {
        this.$beginPhase('$apply');
        this.$eval(expr);
    } finally {
        this.$clearPhase();
        this.$root.$digest();
    }
};

// Deferred execution('$apply') in listener
Scope.prototype.$applyAsync = function (expr) {
    var self = this;
    self.$$applyAsyncQueue.push(function () {
        // invokes $apply later to guarantee that $digest() running after $eval()
        self.$eval(expr);
    });
    // avoid other $$applyAsync() running
    if (self.$root.$$applyAsyncId === null) {
        self.$root.$$applyAsyncId = setTimeout(function () {
            self.$apply(_.bind(self.$$flushApplyAsync, self));
        }, 0);
    }
};

Scope.prototype.$$postDigest = function (fn) {
    this.$$postDigestQueue.push(fn);
};