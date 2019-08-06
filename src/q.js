/* jshint globalstrict: true */
'use strict';

function $QProvider() {
    this.$get = ['$rootScope', function ($rootScope) {

        function Promise() {
            this.$$state = {};
        }
        // instead of making a array to store the promise chain,
        // we use an independent promise to implement the chain.
        Promise.prototype.then = function (onFulFilled, onRejected) {
            var result = new Deferred();
            this.$$state.pending = this.$$state.pending || [];
            this.$$state.pending.push([result, onFulFilled, onRejected]);
            if (this.$$state.status > 0) {
                scheduleProcessQueue(this.$$state);
            }
            return result.promise;
        };
        Promise.prototype.catch = function (onRejected) {
            return this.then(null, onRejected);
        };
        Promise.prototype.finally = function (callback) {
            return this.then(function () {
                callback();
            }, function () {
                callback();
            });
        };

        function Deferred() {
            this.promise = new Promise();
        }
        Deferred.prototype.resolve = function (value) {
            if (this.promise.$$state.status) {
                return;
            }
            if (value && _.isFunction(value.then)) { // promise nest
                value.then(
                    _.bind(this.resolve, this),
                    _.bind(this.reject, this)
                );
            } else {
                this.promise.$$state.value = value;
                this.promise.$$state.status = 1;
                scheduleProcessQueue(this.promise.$$state);
            }
        };
        Deferred.prototype.reject = function (reason) {
            if (this.promise.$$state.status) {
                return;
            }
            this.promise.$$state.value = reason;
            this.promise.$$state.status = 2;
            scheduleProcessQueue(this.promise.$$state);
        };

        function scheduleProcessQueue(state) {
            $rootScope.$evalAsync(function () {
                processQueue(state);
            });
        }

        function processQueue(state) {
            var pending = state.pending;
            delete state.pending;
            _.forEach(pending, function (handlers) {
                var deferred = handlers[0];
                var fn = handlers[state.status];
                try {
                    if (_.isFunction(fn)) {
                        // run current promise and pass the return value to
                        // the next chain
                        deferred.resolve(fn(state.value));
                    } else if (state.status === 1) {
                        deferred.resolve(state.value);
                    } else {
                        deferred.reject(state.value);
                    }
                } catch (e) {
                    deferred.reject(e);
                }
            });
        }

        function defer() {
            return new Deferred();
        }

        return {
            defer: defer
        };
    }];
}