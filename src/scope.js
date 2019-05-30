"use strict";

/*
 * using tip:
 * 1. avoid using 'valueEq'(deep copy)
 * 2. using $applyAsync to coalsecing the $digest
 */

function Scope() {
    this.$$watchers = [];
    this.$$lastDirtyWatch = null;
    this.$$asyncQueue = [];
    this.$$applyAsyncQueue = [];
    this.$$applyAsyncId = null;
    this.$$postDigestQueue = [];
    this.$$phase = null;
}

function initWatchVal() {}

Scope.prototype.$new = function () {
    var ChildScope = function () { };
    ChildScope.prototype = this;
    var child = new ChildScope();
    child.$$watchers = [];
    return child;
}

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
    this.$$lastDirtyWatch = null;
    return function () {
        var index = self.$$watchers.indexOf(watcher);
        if (index >= 0) {
            self.$$watchers.splice(index, 1);
            self.$$lastDirtyWatch = null;
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
    }
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
    this.$$applyAsyncId = null;
};

Scope.prototype.$$digestOnce = function () {
    var self = this;
    var newVal, oldVal, dirty;
    _.forEachRight(this.$$watchers, function (watcher) {
        try {
            if (watcher) {
                newVal = watcher.watchFn(self);
                oldVal = watcher.last;
                if (!self.$$areEqual(newVal, oldVal, watcher.valueEq)) {
                    self.$$lastDirtyWatch = watcher;
                    watcher.last = (watcher.valueEq ? _.cloneDeep(newVal) : newVal);
                    watcher.listenerFn(newVal, 
                        (oldVal === initWatchVal ? newVal : oldVal),
                        self);

                    dirty = true;
                } else if (self.$$lastDirtyWatch === watcher) {
                    return false;
                }
            }
        } catch (e) {
            // In angular, there is a specific service to deal with exceptions: $exceptionHandler
            console.log(e);
        }
    });
    return dirty;
};

Scope.prototype.$digest = function () {
    var dirty = true;
    // "TTL" -- "Time To Live"
    var TTL = 10;
    this.$$lastDirtyWatch = null;
    this.$beginPhase('$digest');
    
    if (this.$$applyAsyncId) {
        clearTimeout(this.$$applyAsyncId);
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
                self.$digest();
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
        this.$digest();
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
    if (self.$$applyAsyncId === null) {
        self.$$applyAsyncId = setTimeout(function () {
            self.$apply(_.bind(self.$$flushApplyAsync, self));
        }, 0);
    }
};

Scope.prototype.$$postDigest = function (fn) {
    this.$$postDigestQueue.push(fn);
};