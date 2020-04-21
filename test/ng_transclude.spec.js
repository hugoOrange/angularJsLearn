
describe("ngTransclude", function () {
    
    beforeEach(function () {
        delete window.angular;
        publishExternalAPI();
    });

    function createInjectorWithTranscluderTemplate(template) {
        return createInjector(['ng', function ($compileProvider) {
            $compileProvider.directive('myTranscluder', function () {
                return {
                    transclude: true,
                    template: template
                };
            });
        }]);
    }

    it("transcludes the parent directive transclusion", function () {
        var injector = createInjectorWithTranscluderTemplate(
            '<div ng-transclude><div>'
        );
        injector.invoke(function ($compile, $rootScope) {
            var el = $('<div my-transcluder>Hello</div>');
            $compile(el)($rootScope);
            expect(el.find('> [ng-transclude]').html()).toEqual("Hello");
        });
    });
    it("empties existing contents", function () {
        var injector = createInjectorWithTranscluderTemplate(
            '<div ng-transclude>Existing Contents</div>'
        );
        injector.invoke(function ($compile, $rootScope) {
            var el = $('<div my-transcluder>Hello</div>');
            $compile(el)($rootScope);
            expect(el.find('> [ng-transclude]').html()).toEqual("Hello");
        });
    });
    it("may be uesd as element", function () {
        var injector = createInjectorWithTranscluderTemplate(
            '<ng-transclude>Existing contents</ng-transclude>'
        );
        injector.invoke(function ($compile, $rootScope) {
            var el = $('<div my-transcluder>Hello</div>');
            $compile(el)($rootScope);
            expect(el.find('> ng-transclude').html()).toEqual("Hello");
        });
    });
    it("may be uesd as class", function () {
        var injector = createInjectorWithTranscluderTemplate(
            '<div class="ng-transclude"></div>'
        );
        injector.invoke(function ($compile, $rootScope) {
            var el = $('<div my-transcluder>Hello</div>');
            $compile(el)($rootScope);
            expect(el.find('> .ng-transclude').html()).toEqual("Hello");
        });
    });
});