/* jshint globalstrict: true */
'use strict';

function $QProvider() {
    this.$get = ['$rootScope', function ($rootScope) {

        function Promise() {
            this.$$state = {};
        }
        Promise.prototype.then = function (onFulFilled) {
            this.$$state.pending = onFulFilled;
        };

        function Deferred() {
            this.promise = new Promise();
        }
        Deferred.prototype.resolve = function (value) {
            this.promise.$$state.value = value;
            scheduleProcessQueue(this.promise.$$state);
            // this.promise.$$state.pending(value);
        };

        function scheduleProcessQueue(state) {
            $rootScope.$evalAsync(function () {
                processQueue(state);
            });
        }

        function processQueue(state) {
            state.pending(state.value);
        }

        function defer() {
            return new Deferred();
        }

        return {
            defer: defer
        };
    }];
}