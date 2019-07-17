/* jshint globalstrict: true */
/* global publishExternalAPI: false, createInjector: false */
'use strict';

describe("$q", function () {
    
    var $q, $rootScope;

    beforeEach(function () {
        publishExternalAPI();
        var injector = createInjector(['ng']);
        $q = injector.get('$q');
        $rootScope = injector.get('$rootScope');
    });

    it("can create a Deferred", function () {
        var d = $q.defer();
        expect(d).toBeDefined();
    });

    it("has a promise for each Deferred", function () {
        var d = $q.defer();
        expect(d.promise).toBeDefined();
    });

    it("can resolve a promise", function (done) {
        var deferred = $q.defer();
        var promise = deferred.promise;

        var promiseSpy = jasmine.createSpy();
        promise.then(promiseSpy);

        deferred.resolve('a-ok');

        setTimeout(function () {
            expect(promiseSpy).toHaveBeenCalledWith('a-ok');
            done();
        }, 1);
    });

    it("works when resolved before promise listener", function (done) {
        var d = $q.defer();
        d.resolve(42);

        var promiseSpy = jasmine.createSpy();
        d.promise.then(promiseSpy);

        setTimeout(function () {
            expect(promiseSpy).toHaveBeenCalledWith(42);
            done();
        }, 0);
    });

    it("does not reolve promise immediately", function () {
        var d = $q.defer();

        var promiseSpy = jasmine.createSpy();
        d.promise.then(promiseSpy);

        d.resolve(42);

        expect(promiseSpy).not.toHaveBeenCalled();
    });

    it("resolves promise at next digest", function () {
        var d = $q.defer();

        var promiseSpy = jasmine.createSpy();
        d.promise.then(promiseSpy);

        d.resolve(42);
        $rootScope.$apply();
        
        expect(promiseSpy).toHaveBeenCalledWith(42);
    });

    // Preventing Multiple Resolutions
    it("may only be resolved once", function () {
        var d = $q.defer();

        var promiseSpy = jasmine.createSpy();
        d.promise.then(promiseSpy);

        d.resolve(42);
        d.resolve(43);

        $rootScope.$apply();

        expect(promiseSpy.calls.count()).toEqual(1);
        expect(promiseSpy).toHaveBeenCalledWith(42);
    });
    it("may only ever be resolved once", function () {
        var d = $q.defer();

        var promiseSpy = jasmine.createSpy();
        d.promise.then(promiseSpy);

        d.resolve(42);
        $rootScope.$apply();
        expect(promiseSpy).toHaveBeenCalledWith(42);

        d.resolve(43);
        $rootScope.$apply();
        expect(promiseSpy.calls.count()).toEqual(1);
    });

    // Ensuring that Callbacks Get Invoked
    it("resolves a listener added after resolution", function () {
        var d = $q.defer();
        d.resolve(42);
        $rootScope.$apply();

        var promiseSpy = jasmine.createSpy();
        d.promise.then(promiseSpy);
        $rootScope.$apply();

        expect(promiseSpy).toHaveBeenCalledWith(42);
    });

    // Registering Multiple Promise Callbacks
    it("may have multiple callbacks", function () {
        var d = $q.defer();

        var firstSpy = jasmine.createSpy();
        var secondSpy = jasmine.createSpy();
        d.promise.then(firstSpy);
        d.promise.then(secondSpy);

        d.resolve(42);
        $rootScope.$apply();

        expect(firstSpy).toHaveBeenCalledWith(42);
        expect(secondSpy).toHaveBeenCalledWith(42);
    });
    it("invokes callbacks once", function () {
        var d = $q.defer();

        var firstSpy = jasmine.createSpy();
        var secondSpy = jasmine.createSpy();

        d.promise.then(firstSpy);
        d.resolve(42);
        $rootScope.$apply();
        expect(firstSpy.calls.count()).toBe(1);
        expect(secondSpy.calls.count()).toBe(0);

        d.promise.then(secondSpy);
        expect(firstSpy.calls.count()).toBe(1);
        expect(secondSpy.calls.count()).toBe(0);

        $rootScope.$apply();
        expect(firstSpy.calls.count()).toBe(1);
        expect(secondSpy.calls.count()).toBe(1);
    });

});