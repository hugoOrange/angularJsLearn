/* jshint globalstrict: true */
'use strict';

function $CompileProvider($provide) {

    var PREFIX_REGEXP = /(x[\:\-_]|data[\:\-_])/i;
    var BOOLEAN_ATTRS = {
        multiple: true,
        selected: true,
        checked: true,
        disabled: true,
        readOnly: true,
        required: true,
        open: true
    };
    var BOOLEAN_ELEMENTS = {
        INPUT: true,
        SELECT: true,
        OPTION: true,
        TEXTAREA: true,
        BUTTON: true,
        FORM: true,
        DETAILS: true
    };

    var hasDirectives = {};

    function parseIsolateBindings (scope) {
        var bindings = {};
        _.forEach(scope, function (definition, scopeName) {
            var match = definition.match(/\s*([@&]|=(\*?))(\??)\s*(\w*)\s*/);
            bindings[scopeName] = {
                mode: match[1][0],
                collection: match[2] === '*',
                optional: match[3],
                attrName: match[4] || scopeName
            };
        });
        return bindings;
    }
    function parseDirectiveBindings (directive) {
        var bindings = {};
        if (_.isObject(directive.scope)) {
            if (directive.bindToController) {
                bindings.bindToController = parseIsolateBindings(directive.scope);
            } else {
                bindings.isolateScope = parseIsolateBindings(directive.scope);
            }
        }
        if (_.isObject(directive.bindToController)) {
            bindings.bindToController = parseIsolateBindings(directive.bindToController);
        }
        return bindings;
    }

    this.directive = function (name, directiveFactory) {
        if (_.isString(name)) {
            if (name === 'hasOwnProperty') {
                throw "hasOwnProperty is not a valid directive name";
            }
            if (!hasDirectives.hasOwnProperty(name)) {
                hasDirectives[name] = [];
                $provide.factory(name + 'Directive', ['$injector', function ($injector) {
                    var factories = hasDirectives[name];
                    return _.map(factories, function (factory, i) {
                        var directive = $injector.invoke(factory);
                        directive.restrict = directive.restrict || 'EA';
                        directive.priority = directive.priority || 0;
                        if (directive.link && !directive.compile) {
                            directive.compile = _.constant(directive.link);
                        }
                        directive.$$bindings = parseDirectiveBindings(directive);
                        directive.name = directive.name || name;
                        directive.index = i;
                        directive.require = directive.require || (directive.controller && name);
                        return directive;
                    });
                }]);
            }
            hasDirectives[name].push(directiveFactory);
        } else {
            _.forEach(name, function (directiveFactory, name) {
                this.directive(name, directiveFactory);
            }, this);
        }
    };
    
    this.$get = ['$injector', '$rootScope', '$parse', '$controller', '$http',
        function ($injector, $rootScope, $parse, $controller, $http) {

        function Attributes(element) {
            this.$$element = element;
            this.$attr = {};
            this.$$observers = {};
        }
        Attributes.prototype.$set = function (key, value, writeArr, attrName) {
            this[key] = value;
            if (isBooleanAttribute(this.$$element[0], key)) {
                this.$$element.prop(key, value);
            }
            
            if (!attrName) {
                if (this.$attr[key]) {
                    attrName = this.$attr[key];
                } else {
                    attrName = this.$attr[key] = _.kebabCase(key, '-');
                }
            } else {
                this.$attr[key] = attrName;
            }

            if (writeArr !== false) {
                this.$$element.attr(attrName, value);
            }

            if (this.$$observers[key]) {
                _.forEach(this.$$observers[key], function (observer) {
                    try {
                        observer(value);
                    } catch (e) {
                    }
                });
            }
        };
        Attributes.prototype.$observe = function (key, fn) {
            var self = this;
            this.$$observers = this.$$observers || Object.create(null);
            this.$$observers[key] = this.$$observers[key] || [];
            this.$$observers[key].push(fn);
            $rootScope.$evalAsync(function () {
                fn(self[key]);
            });

            return function () {
                var index = self.$$observers[key].indexOf(fn);
                if (index >= 0) {
                    self.$$observers[key].splice(index, 1);
                }
            };
        };
        Attributes.prototype.$addClass = function (classVal) {
            this.$$element.addClass(classVal);
        };
        Attributes.prototype.$removeClass = function (classVal) {
            this.$$element.removeClass(classVal);
        };
        Attributes.prototype.$updateClass = function (newClassVal, oldClassVal) {
            var newClasses = newClassVal.split(/\s+/);
            var oldClasses = oldClassVal.split(/\s+/);
            var addedClasses = _.difference(newClasses, oldClasses);
            var removedClasses = _.difference(oldClasses, newClasses);
            if (addedClasses.length) {
                this.$addClass(addedClasses.join(" "));
            }
            if (removedClasses.length) {
                this.$removeClass(removedClasses.join(" "));
            }
        };

        /**
         *       Compilation                       Linking
         *           \ Calls                          \ Calls
         *            ∨                               ∨
         *          compile        --returns-->  publicLinkFn
         *           \ Calls                          \ Calls
         *            ∨                               ∨
         *       compileNodes      --returns--> compositeLinkFn
         *           \ Calls                          \ Calls
         *            ∨                               ∨
         *  applyDirectivesToNodes --returns-->   nodeLinkFn
         *           \ Calls                          \ Calls
         *            ∨                               ∨
         *   directives.compile    --returns--> directives.link
         */
        function compile($compileNodes, maxPriority) {
            var compositeLinkFn = compileNodes($compileNodes, maxPriority);

            return function publicLinkFn(scope, cloneAttachFn, options) {
                options = options || {};
                var parentBoundTranscludeFn = options.parentBoundTranscludeFn;
                if (parentBoundTranscludeFn && parentBoundTranscludeFn.$$boundTransclude) {
                    parentBoundTranscludeFn = parentBoundTranscludeFn.$$boundTransclude;
                }
                var $linkNodes;
                $compileNodes.data("$scope", scope);
                if (cloneAttachFn) {
                    $linkNodes = $compileNodes.clone();
                    cloneAttachFn($linkNodes, scope);
                } else {
                    $linkNodes = $compileNodes;
                }
                compositeLinkFn(scope, $linkNodes, parentBoundTranscludeFn);
                return $linkNodes;
            };
        }

        // iterates over each node and repeat: collect directives, apply directives to nodes
        function compileNodes($compileNodes, maxPriority) {
            var linkFns = [];
            // compilation
            _.times($compileNodes.length, function(i) {
                var attrs = new Attributes($($compileNodes[i]));
                var directives = collectDirectives($compileNodes[i], attrs, maxPriority);
                var nodeLinkFn;
                if (directives.length) {
                    nodeLinkFn = applyDirectivesToNode(directives, $compileNodes[i], attrs);
                }
                var childLinkFn;
                if ((!nodeLinkFn || !nodeLinkFn.terminal) &&
                    $compileNodes[i].childNodes && $compileNodes[i].childNodes.length) {
                    childLinkFn = compileNodes($compileNodes[i].childNodes);
                }
                if (nodeLinkFn && nodeLinkFn.scope) {
                    attrs.$$element.addClass("ng-scope");
                }
                if (nodeLinkFn || childLinkFn) {
                    linkFns.push({
                        nodeLinkFn: nodeLinkFn,
                        childLinkFn: childLinkFn,
                        idx: i
                    });
                }
            });

            // linking
            function compositeLinkFn(scope, linkNodes, parentBoundTranscludeFn) {
                var stableNodeList = [];
                _.forEach(linkFns, function (linkFn) {
                    var nodeIdx = linkFn.idx;
                    stableNodeList[nodeIdx] = linkNodes[nodeIdx];
                });
                
                _.forEach(linkFns, function (linkFn) {
                    var node = stableNodeList[linkFn.idx];
                    if (linkFn.nodeLinkFn) {
                        var childScope;
                        if (linkFn.nodeLinkFn.scope) {
                            childScope = scope.$new();
                            $(node).data("$scope", childScope);
                        } else {
                            childScope = scope;
                        }
                        var boundTranscludeFn;
                        if (linkFn.nodeLinkFn.transcludeOnThisElement) {
                            boundTranscludeFn = function (transcludedScope, cloneAttachFn, containingScope) {
                                if (!transcludedScope) {
                                    transcludedScope = scope.$new(false, containingScope);
                                }
                                return linkFn.nodeLinkFn.transclude(transcludedScope, cloneAttachFn);
                            };
                        } else if (parentBoundTranscludeFn) {
                            boundTranscludeFn = parentBoundTranscludeFn;
                        }

                        linkFn.nodeLinkFn(
                            linkFn.childLinkFn,
                            childScope,
                            node,
                            boundTranscludeFn
                        );
                    } else {
                        linkFn.childLinkFn(
                            scope,
                            node.childNodes,
                            parentBoundTranscludeFn
                        );
                    }
                });
            }

            return compositeLinkFn;
        }

        function applyDirectivesToNode(
            directives, compileNode, attrs, previousCompileContext) {
            // collect previous compile context to continue last compliation
            // when the compilation is stopped by the templateUrl requests.
            previousCompileContext = previousCompileContext || {};
            var $compileNode = $(compileNode);
            var terminalPriority = -Number.MAX_VALUE;
            var terminal = false;
            var preLinkFns  = previousCompileContext.preLinkFns  || [],
                postLinkFns = previousCompileContext.postLinkFns || [],
                controllers = previousCompileContext.controllers || {};
            var newScopeDirective,
                newIsolateScopeDirective = previousCompileContext.newIsolateScopeDirective;
            var templateDirective = previousCompileContext.templateDirective;
            var controllerDirectives = previousCompileContext.controllerDirectives;
            var childTranscludeFn,
                hasTranscludeDirective = previousCompileContext.hasTranscludeDirective;

            function addLinkFns(preLinkFn, postLinkFn, attrStart, attrEnd, isolateScope, require) {
                if (preLinkFn) {
                    if (attrStart) {
                        preLinkFn = groupElementsLinkFnWrapper(preLinkFn, attrStart, attrEnd);
                    }
                    preLinkFn.isolateScope = isolateScope;
                    preLinkFn.require = require;
                    preLinkFns.push(preLinkFn);
                }
                if (postLinkFn) {
                    if (attrStart) {
                        postLinkFn = groupElementsLinkFnWrapper(postLinkFn, attrStart, attrEnd);
                    }
                    postLinkFn.isolateScope = isolateScope;
                    postLinkFn.require = require;
                    postLinkFns.push(postLinkFn);
                }
            }
            
            function getControllers(require, $element) {
                if (_.isArray(require)) {
                    return _.map(require, getControllers);
                } else {
                    var value;
                    var match = require.match(/^(\^\^?)?(\?)?(\^\^?)?/);
                    var optional = match[2];
                    require = require.substring(match[0].length);
                    if (match[1] || match[3]) {
                        if (match[3] && !match[1]) {
                            match[1] = match[3];
                        }
                        if (match[1] === '^^') {
                            $element = $element.parent();
                        }
                        while ($element.length) {
                            value = $element.data('$' + require + 'Controller');
                            if (value) {
                                break;
                            } else {
                                $element = $element.parent();
                            }
                        }
                    } else {
                        if (controllers[require]) {
                            value = controllers[require].instance;
                        }
                    }
                    if (!value && !optional) {
                        throw "Controller " + require + " required by directive, cannot be found!";
                    }
                    return value || null;
                }
            }

            function compileTemplateUrl(directives, $compileNode, attrs, previousCompileContext) {
                var origAsyncDirective = directives.shift();
                var derivedSycDirectives = _.extend(
                    {},
                    origAsyncDirective,
                    {
                        templateUrl: null,
                        transclude: null
                    }
                );
                var templateUrl = _.isFunction(origAsyncDirective.templateUrl) ?
                                    origAsyncDirective.templateUrl($compileNode, attrs) :
                                    origAsyncDirective.templateUrl;
                var afterTemplateNodeLinkFn, afterTemplateChildLinkFn;
                var linkQueue = [];
                $compileNode.empty();
                $http.get(templateUrl).success(function (template) {
                    directives.unshift(derivedSycDirectives);
                    $compileNode.html(template);
                    afterTemplateNodeLinkFn = applyDirectivesToNode(
                        directives, $compileNode, attrs, previousCompileContext);
                    afterTemplateChildLinkFn = compileNodes($compileNode[0].childNodes);
                    _.forEach(linkQueue, function (linkCall) {
                        afterTemplateNodeLinkFn(
                            afterTemplateChildLinkFn,
                            linkCall.scope,
                            linkCall.linkNode,
                            linkCall.boundTranscludeFn
                        );
                    });
                    linkQueue = null;
                });

                return function delayedNodeLinkFn(
                    _ignoreChildLinkFn, scope, linkNode, boundTranscludeFn) {
                    if (linkQueue) {
                        linkQueue.push(
                            {scope: scope, linkNode: linkNode, boundTranscludeFn: boundTranscludeFn});
                    } else {
                        afterTemplateNodeLinkFn(
                            afterTemplateChildLinkFn, scope, linkNode, boundTranscludeFn);
                    }
                };
            }

            _.forEach(directives, function (directive, i) {
                if (directive.$$start) { // apply multiple elements
                    $compileNode = groupScan(compileNode, directive.$$start, directive.$$end);
                }

                if (directive.priority < terminalPriority) {
                    return false;
                }

                if (directive.scope) {
                    if (_.isObject(directive.scope)) {
                        if (newIsolateScopeDirective || newScopeDirective) {
                            throw 'Multiple directives asking for new/inherited scope';
                        }
                        newIsolateScopeDirective = directive;
                    } else {
                        if (newIsolateScopeDirective) {
                            throw 'Multiple directives asking for new/inherited scope';
                        }
                        newScopeDirective = newScopeDirective || directive;
                    }
                }

                if (directive.controller) {
                    controllerDirectives = controllerDirectives || {};
                    controllerDirectives[directive.name] = directive;
                }

                if (directive.transclude) {
                    if (hasTranscludeDirective) {
                        throw "Multiple directives asking for translucde";
                    }
                    hasTranscludeDirective = true;
                    if (directive.transclude === 'element') {
                        var $originalCompiledNode = $compileNode;
                        $compileNode = $(document.createComment(
                            ' ' + directive.name + ': ' + attrs[directive.name] + ' '
                        ));
                        $originalCompiledNode.replaceWith($compileNode);
                        terminalPriority = directive.priority;
                        compile($originalCompiledNode, terminalPriority);
                    } else {
                        var $transcludedNodes = $compileNode.clone().contents();
                        childTranscludeFn = compile($transcludedNodes);
                        $compileNode.empty();
                    }
                }

                if (directive.template) {
                    if (templateDirective) {
                        throw "Multiple directives asking for template";
                    }
                    templateDirective = directive;
                    $compileNode.html(
                        _.isFunction(directive.template) ?
                            directive.template($compileNode, attrs) :
                            directive.template);
                }
                if (directive.templateUrl) {
                    if (templateDirective) {
                        throw "Myltiple directives asking for template";
                    }
                    templateDirective = directive;
                    nodeLinkFn = compileTemplateUrl(
                        _.drop(directives, i),
                        $compileNode,
                        attrs,
                        {
                            templateDirective: templateDirective,
                            newIsolateScopeDirective: newIsolateScopeDirective,
                            controllerDirectives: controllerDirectives,
                            hasTranscludeDirective: hasTranscludeDirective,
                            preLinkFns: preLinkFns,
                            postLinkFns: postLinkFns
                        }
                    );
                    return false;
                } else if (directive.compile) {
                    var linkFn = directive.compile($compileNode, attrs);
                    var isolateScope = (directive === newIsolateScopeDirective);
                    var attrStart = directive.$$start;
                    var attrEnd = directive.$$end;
                    var require = directive.require;
                    if (_.isFunction(linkFn)) {
                        addLinkFns(null, linkFn, attrStart, attrEnd, isolateScope, require);
                    } else if (linkFn) {
                        addLinkFns(linkFn.pre, linkFn.post, attrStart, attrEnd, isolateScope, require);
                    }
                }

                if (directive.terminal) {
                    terminal = true;
                    terminalPriority = directive.priority;
                }
            });

            function nodeLinkFn(childLinkFn, scope, linkNode, boundTranscludeFn) {
                var $element = $(linkNode);

                var isolateScope;
                if (newIsolateScopeDirective) {
                    isolateScope = scope.$new(true);
                    $element.addClass("ng-isolate-scope");
                    $element.data("$isolateScope", isolateScope);
                }

                if (controllerDirectives) {
                    _.forEach(controllerDirectives, function (directive) {
                        var locals = {
                            $scope: directive === newIsolateScopeDirective ? isolateScope : scope,
                            $attrs: attrs,
                            $transclude: scopeBoundTranscludeFn,
                            $element: $element
                        };
                        var controllerName = directive.controller;
                        if (controllerName === '@') {
                            controllerName = attrs[directive.name];
                        }
                        var controller =
                            $controller(controllerName, locals, true, directive.controllerAs);
                        controllers[directive.name] = controller;
                        $element.data('$' + directive.name + 'Controller', controller.instance);
                    });
                }

                if (newIsolateScopeDirective) {
                    initializeDirectiveBindings(
                        scope,
                        attrs,
                        isolateScope,
                        newIsolateScopeDirective.$$bindings.isolateScope,
                        isolateScope
                    );
                }

                function initializeDirectiveBindings(scope, attrs, destination, bindings, newScope) {
                    _.forEach(bindings, function (definition, scopeName) {
                        var attrName = definition.attrName;
                        switch (definition.mode) {
                            case '@':
                                attrs.$observe(attrName, function (newAttrValue) {
                                    destination[scopeName] = newAttrValue;
                                });
                                if (attrs[attrName]) {
                                    destination[scopeName] = attrs[attrName];
                                }
                                break;
                            case '=':
                                if (definition.optional && !attrs[attrName]) {
                                    break;
                                }
                                var parentGet = $parse(attrs[attrName]);
                                var lastValue = destination[scopeName] = parentGet(scope);
                                var parentValueWatch = function () {
                                    var parentValue = parentGet(scope);
                                    if (destination[scopeName] !== parentValue) {
                                        // directive scope is not equal to parent scope,
                                        // means one of them must be changed
                                        if (parentValue !== lastValue) {
                                            // parent scope change,
                                            // whatever the directive scope should be changed
                                            // [which means the parent scope has more priority]
                                            // DOING: parent scope -> directive scope
                                            destination[scopeName] = parentValue;
                                        } else {
                                            // parent scope no change,
                                            // means directive scope changing
                                            // DOING: directive scope -> parent scope
                                            parentValue = destination[scopeName];
                                            parentGet.assign(scope, parentValue);
                                        }
                                    }
                                    lastValue = parentValue;
                                    return lastValue;
                                };
                                var unwatch;
                                if (definition.collection) {
                                    unwatch = scope.$watchCollection(attrs[attrName], parentValueWatch);
                                } else {
                                    unwatch = scope.$watch(parentValueWatch);
                                }
                                newScope.$on("destroy", unwatch);
                                break;
                            case '&':
                                var parentExpr = $parse(attrs[attrName]);
                                if (parentExpr === _.noop && definition.optional) {
                                    break;
                                }
                                destination[scopeName] = function (locals) {
                                    return parentExpr(scope, locals);
                                };
                                break;
                        }
                    });
                }

                var scopeDirective = newIsolateScopeDirective || newScopeDirective;
                if (scopeDirective && controllers[scopeDirective.name]) {
                    initializeDirectiveBindings(
                        scope,
                        attrs,
                        controllers[scopeDirective.name].instance,
                        scopeDirective.$$bindings.bindToController,
                        isolateScope
                    );
                }

                _.forEach(controllers, function (controller) {
                    controller();
                });

                // Called the transclusion function in three different ways:
                // 1. With a transclusion scope and a clone attach function
                // 2. With a transclusion scope
                // 3. With a clone attach function
                function scopeBoundTranscludeFn(transcludedScope, cloneAttachFn) {
                    if (!transcludedScope || !transcludedScope.$watch ||
                        !transcludedScope.$evalAsync) {
                        cloneAttachFn = transcludedScope;
                        transcludedScope = undefined;
                    }
                    return boundTranscludeFn(transcludedScope, cloneAttachFn, scope);
                }
                scopeBoundTranscludeFn.$$boundTransclude = boundTranscludeFn;

                _.forEach(preLinkFns, function (linkFn) {
                    linkFn(
                        linkFn.isolateScope ? isolateScope : scope,
                        $element,
                        attrs,
                        linkFn.require && getControllers(linkFn.require, $element),
                        scopeBoundTranscludeFn
                    );
                });
                if (childLinkFn) {
                    var scopeToChild = scope;
                    if (newIsolateScopeDirective && newIsolateScopeDirective.template) {
                        scopeToChild = isolateScope;
                    }
                    childLinkFn(scopeToChild, linkNode.childNodes, boundTranscludeFn);
                }
                _.forEachRight(postLinkFns, function (linkFn) {
                    linkFn(
                        linkFn.isolateScope ? isolateScope : scope,
                        $element,
                        attrs,
                        linkFn.require && getControllers(linkFn.require, $element),
                        scopeBoundTranscludeFn
                    );
                });
            }
            nodeLinkFn.terminal = terminal;
            nodeLinkFn.scope = newScopeDirective && newScopeDirective.scope;
            // move the transcluding linking to the compile for getting compiling scope
            nodeLinkFn.transcludeOnThisElement = hasTranscludeDirective;
            nodeLinkFn.transclude = childTranscludeFn;
            
            return nodeLinkFn;
        }

        function groupScan(node, startAttr, endAttr) {
            var nodes = [];
            if (startAttr && node && node.hasAttribute(startAttr)) {
                var depth = 0;
                do {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        if (node.hasAttribute(startAttr)) {
                            depth++;
                        } else if (node.hasAttribute(endAttr)) {
                            depth--;
                        }
                    }
                    nodes.push(node);
                    node = node.nextSibling;
                } while (depth > 0);
            } else {
                nodes.push(node);
            }
            return $(nodes);
        }
        function groupElementsLinkFnWrapper(linkFn, attrStart, attrEnd) {
            return function (scope, element, attrs, ctrl, transclude) {
                var group = groupScan(element[0], attrStart, attrEnd);
                return linkFn(scope, group, attrs, ctrl, transclude);
            };
        }

        function collectDirectives(node, attrs, maxPriority) {
            var directives = [];
            var match;
            if (node.nodeType === Node.ELEMENT_NODE) {
                // get directives by elements
                var normalizedNodeName = directiveNormalize(nodeName(node).toLowerCase());
                addDirective(directives, normalizedNodeName, 'E', maxPriority);
                // get directives by attributes
                _.forEach(node.attributes, function (attr) {
                    var attrStartName, attrEndName;
                    var name = attr.name;
                    var normalizedAttrName = directiveNormalize(name.toLowerCase());
                    // use kebab-case to compare, but the camel-case name to return
                    var isNgAttr = /^ngAttr[A-Z]/.test(normalizedAttrName);
                    if (isNgAttr) {
                        name = _.kebabCase(
                            normalizedAttrName[6].toLowerCase() + 
                            normalizedAttrName.substring(7)
                        );
                        normalizedAttrName = directiveNormalize(name.toLowerCase());
                    }
                    attrs.$attr[normalizedAttrName] = name;

                    // multiple elements
                    var directiveNName = normalizedAttrName.replace(/(Start|End)$/, '');
                    if (directiveIsMultiElement(directiveNName)) {
                        if (/Start$/.test(normalizedAttrName)) {
                            attrStartName = name;
                            attrEndName = name.substring(0, name.length - 5) + 'End';
                            name = name.substring(0, name.length - 6);
                        }
                    }
                    normalizedAttrName = directiveNormalize(name.toLowerCase());
                    addDirective(
                        directives, normalizedAttrName, 'A', maxPriority,
                        attrStartName, attrEndName);
                    // override normal attribute with 'ng-attr-' prefix
                    if (isNgAttr || !attrs.hasOwnProperty(normalizedAttrName)) {
                        attrs[normalizedAttrName] = attr.value.trim();
                        if (isBooleanAttribute(node, normalizedAttrName)) {
                            attrs[normalizedAttrName] = true;
                        }
                    }
                });
                // get directives by className
                var className = node.className;
                if (_.isString(className) && !_.isEmpty(className)) {
                    while ((match = /([\d\w\-_]+)(?:\:([^;]+))?;?/.exec(className))) {
                        var normalizedClassName = directiveNormalize(match[1]);
                        if (addDirective(directives, normalizedClassName, 'C', maxPriority)) {
                            attrs[normalizedClassName] = match[2] ? match[2].trim() : undefined;
                        }
                        className = className.substring(match.index + match[0].length);
                    }
                }
            } else if (node.nodeType === Node.COMMENT_NODE) {
                // get directives by comment
                match = /^\s*directive\:\s*([\d\w\-_]+)\s*(.*)$/.exec(node.nodeValue);
                if (match) {
                    var normalizedName = directiveNormalize(match[1]);
                    if (addDirective(directives, normalizedName, 'M', maxPriority)) {
                        attrs[normalizedName] = match[2] ? match[2].trim() : undefined;
                    }
                }
            }

            directives.sort(byPriority);
            return directives;
        }

        function directiveNormalize(name) {
            return _.camelCase(name.replace(PREFIX_REGEXP, ''));
        }

        function nodeName(element) {
            return element.nodeName ? element.nodeName : element[0].nodeName;
        }

        function directiveIsMultiElement(name) {
            if (hasDirectives.hasOwnProperty(name)) {
                var directives = $injector.get(name + 'Directive');
                return _.any(directives, {multiElement: true});
            }
            return false;
        }

        function addDirective(directives, name, mode, maxPriority, attrStartName, attrEndName) {
            var match;
            if (hasDirectives.hasOwnProperty(name)) {
                var foundDirectives = $injector.get(name + 'Directive');
                var applicableDirectives = _.filter(foundDirectives, function (dir) {
                    // stop transclude with element mode
                    return (maxPriority === undefined || maxPriority > dir.priority) &&
                            dir.restrict.indexOf(mode) !== -1;
                });
                _.forEach(applicableDirectives, function (directive) {
                    if (attrStartName) {
                        directive = _.create(directive, {
                            $$start: attrStartName,
                            $$end: attrEndName
                        });
                    }
                    directives.push(directive);
                    match = directive;
                });
            }
            return match;
        }

        function byPriority(a, b) {
            var diff = b.priority - a.priority;
            if (diff !== 0) {
                return diff;
            } else {
                if (a.name !== b.name) {
                    return (a.name < b.name ? -1 : 1);
                } else {
                    return a.index - b.index;
                }
            }
        }

        function isBooleanAttribute(node, attrName) {
            return BOOLEAN_ATTRS[attrName] && BOOLEAN_ELEMENTS[node.nodeName];
        }

        return compile;
    }];

}
$CompileProvider.$inject = ['$provide'];