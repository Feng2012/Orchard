angular.module("LayoutEditor", ["ngSanitize", "ngResource", "ui.sortable"]);
var LayoutEditor;
(function(LayoutEditor) {

    var Clipboard = function () {
        var self = this;
        this._clipboardData = {};
        this._isDisabled = false;
        this._wasInvoked = false;

        this.setData = function(contentType, data) {
            self._clipboardData[contentType] = data;
            self._wasInvoked = true;
        };
        this.getData = function (contentType) {
            return self._clipboardData[contentType];
            self._wasInvoked = true;
        };
        this.disable = function() {
            self._isDisabled = true;
            self._wasInvoked = false;
            self._clipboardData = {};
        };
        this.isDisabled = function () {
            return self._isDisabled;
        }
        this.wasInvoked = function () {
            return self._wasInvoked;
        }
    }

    LayoutEditor.Clipboard = new Clipboard();

    angular
        .module("LayoutEditor")
        .factory("clipboard", [
            function() {
                return {
                    setData: LayoutEditor.Clipboard.setData,
                    getData: LayoutEditor.Clipboard.getData,
                    disable: LayoutEditor.Clipboard.disable,
                    isDisabled: LayoutEditor.Clipboard.isDisabled,
                    wasInvoked: LayoutEditor.Clipboard.wasInvoked
                };
            }
        ]);
})(LayoutEditor || (LayoutEditor = {}));
angular
    .module("LayoutEditor")
    .factory("scopeConfigurator", ["$timeout", "clipboard",
        function ($timeout, clipboard) {
            return {

                configureForElement: function ($scope, $element) {
                
                    $element.find(".layout-panel").click(function (e) {
                        e.stopPropagation();
                    });

                    $element.parent().keydown(function (e) {
                        var handled = false;
                        var resetFocus = false;
                        var element = $scope.element;
                    
                        if (element.editor.isDragging)
                            return;

                        // If native clipboard support exists, the pseudo-clipboard will have been disabled.
                        if (!clipboard.isDisabled()) {
                            var focusedElement = element.editor.focusedElement;
                            if (!!focusedElement) {
                                // Pseudo clipboard handling for browsers not allowing real clipboard operations.
                                if (e.ctrlKey) {
                                    switch (e.which) {
                                    case 67: // C
                                        focusedElement.copy(clipboard);
                                        break;
                                    case 88: // X
                                        focusedElement.cut(clipboard);
                                        break;
                                    case 86: // V
                                        focusedElement.paste(clipboard);
                                        break;
                                    }
                                }
                            }
                        }

                        if (!e.ctrlKey && !e.shiftKey && !e.altKey && e.which == 46) { // Del
                            $scope.delete(element);
                            handled = true;
                        } else if (!e.ctrlKey && !e.shiftKey && !e.altKey && (e.which == 32 || e.which == 27)) { // Space or Esc
                            $element.find(".layout-panel-action-properties").first().click();
                            handled = true;
                        }

                        if (element.type == "Content") { // This is a content element.
                            if (!e.ctrlKey && !e.shiftKey && !e.altKey && e.which == 13) { // Enter
                                $element.find(".layout-panel-action-edit").first().click();
                                handled = true;
                            }
                        }

                        if (!!element.children) { // This is a container.
                            if (!e.ctrlKey && !e.shiftKey && e.altKey && e.which == 40) { // Alt+Down
                                if (element.children.length > 0)
                                    element.children[0].setIsFocused();
                                handled = true;
                            }

                            if (element.type == "Column") { // This is a column.
                                var connectAdjacent = !e.ctrlKey;
                                if (e.which == 37) { // Left
                                    if (e.altKey)
                                        element.expandLeft(connectAdjacent);
                                    if (e.shiftKey)
                                        element.contractRight(connectAdjacent);
                                    handled = true;
                                } else if (e.which == 39) { // Right
                                    if (e.altKey)
                                        element.contractLeft(connectAdjacent);
                                    if (e.shiftKey)
                                        element.expandRight(connectAdjacent);
                                    handled = true;
                                }
                            }
                        }

                        if (!!element.parent) { // This is a child.
                            if (e.altKey && e.which == 38) { // Alt+Up
                                element.parent.setIsFocused();
                                handled = true;
                            }

                            if (element.parent.type == "Row") { // Parent is a horizontal container.
                                if (!e.ctrlKey && !e.shiftKey && !e.altKey && e.which == 37) { // Left
                                    element.parent.moveFocusPrevChild(element);
                                    handled = true;
                                }
                                else if (!e.ctrlKey && !e.shiftKey && !e.altKey && e.which == 39) { // Right
                                    element.parent.moveFocusNextChild(element);
                                    handled = true;
                                }
                                else if (e.ctrlKey && !e.shiftKey && !e.altKey && e.which == 37) { // Ctrl+Left
                                    element.moveUp();
                                    resetFocus = true;
                                    handled = true;
                                }
                                else if (e.ctrlKey && !e.shiftKey && !e.altKey && e.which == 39) { // Ctrl+Right
                                    element.moveDown();
                                    handled = true;
                                }
                            }
                            else { // Parent is a vertical container.
                                if (!e.ctrlKey && !e.shiftKey && !e.altKey && e.which == 38) { // Up
                                    element.parent.moveFocusPrevChild(element);
                                    handled = true;
                                }
                                else if (!e.ctrlKey && !e.shiftKey && !e.altKey && e.which == 40) { // Down
                                    element.parent.moveFocusNextChild(element);
                                    handled = true;
                                }
                                else if (e.ctrlKey && !e.shiftKey && !e.altKey && e.which == 38) { // Ctrl+Up
                                    element.moveUp();
                                    resetFocus = true;
                                    handled = true;
                                }
                                else if (e.ctrlKey && !e.shiftKey && !e.altKey && e.which == 40) { // Ctrl+Down
                                    element.moveDown();
                                    handled = true;
                                }
                            }
                        }

                        if (handled) {
                            e.preventDefault();
                        }

                        e.stopPropagation();

                        $scope.$apply(); // Event is not triggered by Angular directive but raw event handler on element.

                        // HACK: Workaround because of how Angular treats the DOM when elements are shifted around - input focus is sometimes lost.
                        if (resetFocus) {
                            window.setTimeout(function () {
                                $scope.$apply(function () {
                                    element.editor.focusedElement.setIsFocused();
                                });
                            }, 100);
                        }
                    });

                    $scope.element.setIsFocusedEventHandlers.push(function () {
                        $element.parent().focus();
                    });

                    $scope.delete = function (element) {
                        element.delete();
                    }
                },

                configureForContainer: function ($scope, $element) {
                    var element = $scope.element;

                    //$scope.isReceiving = false; // True when container is receiving an external element via drag/drop.
                    $scope.getShowChildrenPlaceholder = function () {
                        return $scope.element.children.length === 0 && !$scope.element.getIsDropTarget();
                    };

                    $scope.sortableOptions = {
                        cursor: "move",
                        delay: 150,
                        disabled: element.getIsSealed(),
                        distance: 5,
                        //handle: element.children.length < 2 ? ".imaginary-class" : false, // For some reason doesn't get re-evaluated after adding more children.
                        start: function (e, ui) {
                            $scope.$apply(function () {
                                element.setIsDropTarget(true);
                                element.editor.isDragging = true;
                            });
                            // Make the drop target placeholder as high as the item being dragged.
                            ui.placeholder.height(ui.item.height() - 4);
                            ui.placeholder.css("min-height", 0);
                        },
                        stop: function (e, ui) {
                            $scope.$apply(function () {
                                element.editor.isDragging = false;
                                element.setIsDropTarget(false);
                            });
                        },
                        over: function (e, ui) {
                            if (!!ui.sender && !!ui.sender[0].isToolbox) {
                                if (!!ui.sender[0].dropTargetTimeout) {
                                    $timeout.cancel(ui.sender[0].dropTargetTimeout);
                                    ui.sender[0].dropTargetTimeout = null;
                                }
                                $timeout(function () {
                                    if (element.type == "Row") {
                                        // If there was a previous drop target and it was a row, roll back any pending column adds to it.
                                        var previousDropTarget = element.editor.dropTargetElement;
                                        if (!!previousDropTarget && previousDropTarget.type == "Row")
                                            previousDropTarget.rollbackAddColumn();
                                    }
                                    element.setIsDropTarget(false);
                                });
                                ui.sender[0].dropTargetTimeout = $timeout(function () {
                                    if (element.type == "Row") {
                                        var receivedColumn = ui.item.sortable.model;
                                        var receivedColumnWidth = Math.floor(12 / (element.children.length + 1));
                                        receivedColumn.width = receivedColumnWidth;
                                        receivedColumn.offset = 0;
                                        element.beginAddColumn(receivedColumnWidth);
                                        // Make the drop target placeholder the correct width and as high as the highest existing column in the row.
                                        var maxHeight = _.max(_($element.find("> .layout-children > .layout-column:not(.ui-sortable-placeholder)")).map(function (e) {
                                            return $(e).height();
                                        }));
                                        for (i = 1; i <= 12; i++)
                                            ui.placeholder.removeClass("col-xs-" + i);
                                        ui.placeholder.addClass("col-xs-" + receivedColumn.width);
                                        if (maxHeight > 0) {
                                            ui.placeholder.height(maxHeight);
                                            ui.placeholder.css("min-height", 0);
                                        }
                                        else {
                                            ui.placeholder.height(0);
                                            ui.placeholder.css("min-height", "");
                                        }
                                    }
                                    element.setIsDropTarget(true);
                                }, 150);
                            }
                        },
                        receive: function (e, ui) {
                            if (!!ui.sender && !!ui.sender[0].isToolbox) {
                                $scope.$apply(function () {
                                    var receivedElement = ui.item.sortable.model;
                                    if (!!receivedElement) {
                                        if (element.type == "Row")
                                            element.commitAddColumn();
                                        // Should ideally call LayoutEditor.Container.addChild() instead, but since this handler
                                        // is run *before* the ui-sortable directive's handler, if we try to add the child to the
                                        // array that handler will get an exception when trying to do the same.
                                        // Because of this, we need to invoke "setParent" so that specific container types can perform element speficic initialization.
                                        receivedElement.setEditor(element.editor);
                                        receivedElement.setParent(element);

                                        if (!!receivedElement.hasEditor) {
                                            $scope.$root.editElement(receivedElement).then(function (args) {
                                                if (!args.cancel) {
                                                    receivedElement.data = args.element.data;
                                                    receivedElement.applyElementEditorModel(args.elementEditorModel);

                                                    if (!!receivedElement.setHtml)
                                                        receivedElement.setHtml(args.element.html);
                                                }
                                                $timeout(function () {
                                                    if (!!args.cancel)
                                                        receivedElement.delete();
                                                    else
                                                        receivedElement.setIsFocused();
                                                    //$scope.isReceiving = false;
                                                    element.setIsDropTarget(false);

                                                });
                                                return;
                                            });
                                        }
                                    }
                                    $timeout(function () {
                                        //$scope.isReceiving = false;
                                        element.setIsDropTarget(false);
                                        if (!!receivedElement)
                                            receivedElement.setIsFocused();
                                    });
                                });
                            }
                        }
                    };

                    $scope.click = function (child, e) {
                        if (!child.editor.isDragging)
                            child.setIsFocused();
                        e.stopPropagation();
                    };

                    $scope.getClasses = function (child) {
                        var result = ["layout-element"];

                        if (!!child.children) {
                            result.push("layout-container");
                            if (child.getIsSealed())
                                result.push("layout-container-sealed");
                        }

                        result.push("layout-" + child.type.toLowerCase());

                        if (!!child.dropTargetClass)
                            result.push(child.dropTargetClass);

                        // TODO: Move these to either the Column directive or the Column model class.
                        if (child.type == "Row") {
                            result.push("row");
                            if (!child.canAddColumn())
                                result.push("layout-row-full");
                        }
                        if (child.type == "Column") {
                            result.push("col-xs-" + child.width);
                            result.push("col-xs-offset-" + child.offset);
                        }
                        if (child.type == "Content")
                            result.push("layout-content-" + child.contentTypeClass);

                        if (child.getIsActive())
                            result.push("layout-element-active");
                        if (child.getIsFocused())
                            result.push("layout-element-focused");
                        if (child.getIsSelected())
                            result.push("layout-element-selected");
                        if (child.getIsDropTarget())
                            result.push("layout-element-droptarget");
                        if (child.isTemplated)
                            result.push("layout-element-templated");

                        return result;
                    };
                }
            };
        }
    ]);
angular
    .module("LayoutEditor")
    .directive("orcLayoutEditor", ["environment",
        function (environment) {
            return {
                restrict: "E",
                scope: {},
                controller: ["$scope", "$element", "$attrs", "$compile", "clipboard",
                    function ($scope, $element, $attrs, $compile, clipboard) {
                        if (!!$attrs.model)
                            $scope.element = eval($attrs.model);
                        else
                            throw new Error("The 'model' attribute must evaluate to a LayoutEditor.Editor object.");

                        $scope.click = function (canvas, e) {
                            if (!canvas.editor.isDragging)
                                canvas.setIsFocused();
                            e.stopPropagation();
                        };

                        $scope.getClasses = function (canvas) {
                            var result = ["layout-element", "layout-container", "layout-canvas"];

                            if (canvas.getIsActive())
                                result.push("layout-element-active");
                            if (canvas.getIsFocused())
                                result.push("layout-element-focused");
                            if (canvas.getIsSelected())
                                result.push("layout-element-selected");
                            if (canvas.getIsDropTarget())
                                result.push("layout-element-droptarget");
                            if (canvas.isTemplated)
                                result.push("layout-element-templated");

                            return result;
                        };

                        // An unfortunate side-effect of the next hack on line 54 is that the created elements aren't added to the DOM yet, so we can't use it to get to the parent ".layout-desiger" element.
                        // Work around: access that element directly (which efectively turns multiple layout editors on a single page impossible). 
                        // //var layoutDesignerHost = $element.closest(".layout-designer").data("layout-designer-host");
                        var layoutDesignerHost = $(".layout-designer").data("layout-designer-host");

                        $scope.$root.layoutDesignerHost = layoutDesignerHost;

                        layoutDesignerHost.element.on("replacecanvas", function (e, args) {
                            var editor = $scope.element;
                            var canvasData = {
                                data: args.canvas.data,
                                htmlId: args.canvas.htmlId,
                                htmlClass: args.canvas.htmlClass,
                                htmlStyle: args.canvas.htmlStyle,
                                isTemplated: args.canvas.isTemplated,
                                children: args.canvas.children
                            };

                            // HACK: Instead of simply updating the $scope.element with a new instance, we need to replace the entire orc-layout-editor markup
                            // in order for angular to rebind starting with the Canvas element. Otherwise, for some reason, it will rebind starting with the first child of Canvas.
                            // You can see this happening when setting a breakpoint in ScopeConfigurator where containers are initialized with drag & drop: on page load, the first element
                            // is a Canvas (good), but after having selected another template, the first element is (typically) a Grid (bad).
                            // Simply recompiling the orc-layout-editor directive will cause the entire thing to be generated, which works just fine as well (even though not is nice as simply leveraging model binding).
                            layoutDesignerHost.editor = window.layoutEditor = new LayoutEditor.Editor(editor.config, canvasData);
                            var template = "<orc-layout-editor" + " model='window.layoutEditor' />";
                            var html = $compile(template)($scope);
                            $(".layout-editor-holder").html(html);
                        });

                        $scope.$root.editElement = function (element) {
                            var host = $scope.$root.layoutDesignerHost;
                            return host.editElement(element);
                        };

                        $scope.$root.addElement = function (contentType) {
                            var host = $scope.$root.layoutDesignerHost;
                            return host.addElement(contentType);
                        };

                        $(document).on("cut copy paste", function (e) {
                            // If the pseudo clipboard was already invoked (which happens on the first clipboard
                            // operation after page load even if native clipboard support exists) then sit this
                            // one operation out, but make sure whatever is on the pseudo clipboard gets migrated
                            // to the native clipboard for subsequent operations.
                            if (clipboard.wasInvoked()) {
                                e.originalEvent.clipboardData.setData("text/plain", clipboard.getData("text/plain"));
                                e.originalEvent.clipboardData.setData("text/json", clipboard.getData("text/json"));
                                e.preventDefault();
                            }
                            else {
                                var focusedElement = $scope.element.focusedElement;
                                if (!!focusedElement) {
                                    $scope.$apply(function () {
                                        switch (e.type) {
                                            case "copy":
                                                focusedElement.copy(e.originalEvent.clipboardData);
                                                break;
                                            case "cut":
                                                focusedElement.cut(e.originalEvent.clipboardData);
                                                break;
                                            case "paste":
                                                focusedElement.paste(e.originalEvent.clipboardData);
                                                break;
                                        }
                                    });

                                    // HACK: Workaround because of how Angular treats the DOM when elements are shifted around - input focus is sometimes lost.
                                    window.setTimeout(function () {
                                        $scope.$apply(function () {
                                            if (!!$scope.element.focusedElement)
                                                $scope.element.focusedElement.setIsFocused();
                                        });
                                    }, 100);

                                    e.preventDefault();
                                }
                            }

                            // Native clipboard support obviously exists, so disable the peudo clipboard from now on.
                            clipboard.disable();
                        });
                    }
                ],
                templateUrl: environment.templateUrl("Editor"),
                replace: true,
                link: function (scope, element) {
                    // No clicks should propagate from the TinyMCE toolbars.
                    element.find(".layout-toolbar-container").click(function (e) {
                        e.stopPropagation();
                    });
                    // Unfocus and unselect everything on click outside of canvas.
                    $(window).click(function (e) {
                        scope.$apply(function () {
                            scope.element.activeElement = null;
                            scope.element.focusedElement = null;
                        });
                    });
                }
            };
        }
    ]);
angular
    .module("LayoutEditor")
    .directive("orcLayoutCanvas", ["scopeConfigurator", "environment",
        function (scopeConfigurator, environment) {
            return {
                restrict: "E",
                scope: { element: "=" },
                controller: ["$scope", "$element", "$attrs",
                    function ($scope, $element, $attrs) {
                        scopeConfigurator.configureForElement($scope, $element);
                        scopeConfigurator.configureForContainer($scope, $element);
                        $scope.sortableOptions["axis"] = "y";
                    }
                ],
                templateUrl: environment.templateUrl("Canvas"),
                replace: true
            };
        }
    ]);
angular
    .module("LayoutEditor")
    .directive("orcLayoutChild", ["$compile",
        function ($compile) {
            return {
                restrict: "E",
                scope: { element: "=" },
                link: function (scope, element) {
                    var template = "<orc-layout-" + scope.element.type.toLowerCase() + " element='element' />";
                    var html = $compile(template)(scope);
                    $(element).replaceWith(html);
                }
            };
        }
    ]);
angular
    .module("LayoutEditor")
    .directive("orcLayoutColumn", ["$compile", "scopeConfigurator", "environment",
        function ($compile, scopeConfigurator, environment) {
            return {
                restrict: "E",
                scope: { element: "=" },
                controller: ["$scope", "$element",
                    function ($scope, $element) {
                        scopeConfigurator.configureForElement($scope, $element);
                        scopeConfigurator.configureForContainer($scope, $element);
                        $scope.sortableOptions["axis"] = "y";
                    }
                ],
                templateUrl: environment.templateUrl("Column"),
                replace: true,
                link: function (scope, element, attrs) {
                    element.find(".layout-column-resize-bar").draggable({
                        axis: "x",
                        helper: "clone",
                        revert: true,
                        start: function (e, ui) {
                            scope.$apply(function () {
                                scope.element.editor.isResizing = true;
                            });
                        },
                        drag: function (e, ui) {
                            var columnElement = element.parent();
                            var columnSize = columnElement.width() / scope.element.width;
                            var connectAdjacent = !e.ctrlKey;
                            if ($(e.target).hasClass("layout-column-resize-bar-left")) {
                                var delta = ui.offset.left - columnElement.offset().left;
                                if (delta < -columnSize && scope.element.canExpandLeft(connectAdjacent)) {
                                    scope.$apply(function () {
                                        scope.element.expandLeft(connectAdjacent);
                                    });
                                }
                                else if (delta > columnSize && scope.element.canContractLeft(connectAdjacent)) {
                                    scope.$apply(function () {
                                        scope.element.contractLeft(connectAdjacent);
                                    });
                                }
                            }
                            else if ($(e.target).hasClass("layout-column-resize-bar-right")) {
                                var delta = ui.offset.left - columnElement.width() - columnElement.offset().left;
                                if (delta > columnSize && scope.element.canExpandRight(connectAdjacent)) {
                                    scope.$apply(function () {
                                        scope.element.expandRight(connectAdjacent);
                                    });
                                }
                                else if (delta < -columnSize && scope.element.canContractRight(connectAdjacent)) {
                                    scope.$apply(function () {
                                        scope.element.contractRight(connectAdjacent);
                                    });
                                }
                            }

                        },
                        stop: function (e, ui) {
                            scope.$apply(function () {
                              scope.element.editor.isResizing = false;
                            });
                        }
                    });
                }
            };
        }
    ]);
angular
    .module("LayoutEditor")
    .directive("orcLayoutContent", ["$sce", "scopeConfigurator", "environment",
        function ($sce, scopeConfigurator, environment) {
            return {
                restrict: "E",
                scope: { element: "=" },
                controller: ["$scope", "$element",
                    function ($scope, $element) {
                        scopeConfigurator.configureForElement($scope, $element);
                        $scope.edit = function () {
                            $scope.$root.editElement($scope.element).then(function (args) {
                                $scope.$apply(function () {
                                    if (args.cancel)
                                        return;

                                    $scope.element.data = args.element.data;
                                    $scope.element.setHtml(args.element.html);
                                });
                            });
                        };

                        // Overwrite the setHtml function so that we can use the $sce service to trust the html (and not have the html binding strip certain tags).
                        $scope.element.setHtml = function (html) {
                            $scope.element.html = html;
                            $scope.element.htmlUnsafe = $sce.trustAsHtml(html);
                        };

                        $scope.element.setHtml($scope.element.html);
                    }
                ],
                templateUrl: environment.templateUrl("Content"),
                replace: true
            };
        }
    ]);
angular
    .module("LayoutEditor")
    .directive("orcLayoutHtml", ["$sce", "scopeConfigurator", "environment",
        function ($sce, scopeConfigurator, environment) {
            return {
                restrict: "E",
                scope: { element: "=" },
                controller: ["$scope", "$element",
                    function ($scope, $element) {
                        scopeConfigurator.configureForElement($scope, $element);
                        $scope.edit = function () {
                            $scope.$root.editElement($scope.element).then(function (args) {
                                $scope.$apply(function () {
                                    if (args.cancel)
                                        return;

                                    $scope.element.data = args.element.data;
                                    $scope.element.setHtml(args.element.html);
                                });
                            });
                        };
                        $scope.updateContent = function (e) {
                            $scope.element.setHtml(e.target.innerHTML);
                        };

                        // Overwrite the setHtml function so that we can use the $sce service to trust the html (and not have the html binding strip certain tags).
                        $scope.element.setHtml = function (html) {
                            $scope.element.html = html;
                            $scope.element.htmlUnsafe = $sce.trustAsHtml(html);
                        };

                        $scope.element.setHtml($scope.element.html);
                    }
                ],
                templateUrl: environment.templateUrl("Html"),
                replace: true,
                link: function (scope, element) {
                }
            };
        }
    ]);
angular
    .module("LayoutEditor")
    .directive("orcLayoutGrid", ["$compile", "scopeConfigurator", "environment",
        function ($compile, scopeConfigurator, environment) {
            return {
                restrict: "E",
                scope: { element: "=" },
                controller: ["$scope", "$element",
                    function ($scope, $element) {
                        scopeConfigurator.configureForElement($scope, $element);
                        scopeConfigurator.configureForContainer($scope, $element);
                        $scope.sortableOptions["axis"] = "y";
                    }
                ],
                templateUrl: environment.templateUrl("Grid"),
                replace: true
            };
        }
    ]);
angular
    .module("LayoutEditor")
    .directive("orcLayoutRow", ["$compile", "scopeConfigurator", "environment",
        function ($compile, scopeConfigurator, environment) {
            return {
                restrict: "E",
                scope: { element: "=" },
                controller: ["$scope", "$element",
                    function ($scope, $element) {
                        scopeConfigurator.configureForElement($scope, $element);
                        scopeConfigurator.configureForContainer($scope, $element);
                        $scope.sortableOptions["axis"] = "x";
                        $scope.sortableOptions["ui-floating"] = true;
                    }
                ],
                templateUrl: environment.templateUrl("Row"),
                replace: true
            };
        }
    ]);
angular
    .module("LayoutEditor")
    .directive("orcLayoutPopup", [
        function () {
            return {
                restrict: "A",
                link: function (scope, element, attrs) {
                    var popup = $(element);
                    var trigger = popup.closest(".layout-popup-trigger");
                    var parentElement = popup.closest(".layout-element");
                    trigger.click(function () {
                        popup.toggle();
                        if (popup.is(":visible")) {
                            popup.position({
                                my: attrs.orcLayoutPopupMy || "left top",
                                at: attrs.orcLayoutPopupAt || "left bottom+4px",
                                of: trigger
                            });
                            popup.find("input").first().focus();
                        }
                    });
                    popup.click(function (e) {
                        e.stopPropagation();
                    });
                    parentElement.click(function (e) {
                        popup.hide();
                    });
                    popup.keydown(function (e) {
                        if (!e.ctrlKey && !e.shiftKey && !e.altKey && e.which == 27) // Esc
                            popup.hide();
                        e.stopPropagation();
                    });
                    popup.on("cut copy paste", function (e) {
                        // Allow clipboard operations in popup without invoking clipboard event handlers on parent element.
                        e.stopPropagation();
                    });
                }
            };
        }
    ]);
angular
    .module("LayoutEditor")
    .directive("orcLayoutToolbox", ["$compile", "environment",
        function ($compile, environment) {
            return {
                restrict: "E",
                controller: ["$scope", "$element",
                    function ($scope, $element) {

                        $scope.resetElements = function () {

                            $scope.gridElements = [
                                LayoutEditor.Grid.from({
                                    toolboxIcon: "\uf00a",
                                    toolboxLabel: "Grid",
                                    toolboxDescription: "Empty grid.",
                                    children: []
                                })
                            ];

                            $scope.rowElements = [
                                LayoutEditor.Row.from({
                                    toolboxIcon: "\uf0c9",
                                    toolboxLabel: "Row (1 column)",
                                    toolboxDescription: "Row with 1 column.",
                                    children: LayoutEditor.Column.times(1)
                                }),
                                LayoutEditor.Row.from({
                                    toolboxIcon: "\uf0c9",
                                    toolboxLabel: "Row (2 columns)",
                                    toolboxDescription: "Row with 2 columns.",
                                    children: LayoutEditor.Column.times(2)
                                }),
                                LayoutEditor.Row.from({
                                    toolboxIcon: "\uf0c9",
                                    toolboxLabel: "Row (3 columns)",
                                    toolboxDescription: "Row with 3 columns.",
                                    children: LayoutEditor.Column.times(3)
                                }),
                                LayoutEditor.Row.from({
                                    toolboxIcon: "\uf0c9",
                                    toolboxLabel: "Row (4 columns)",
                                    toolboxDescription: "Row with 4 columns.",
                                    children: LayoutEditor.Column.times(4)
                                }),
                                LayoutEditor.Row.from({
                                    toolboxIcon: "\uf0c9",
                                    toolboxLabel: "Row (6 columns)",
                                    toolboxDescription: "Row with 6 columns.",
                                    children: LayoutEditor.Column.times(6)
                                }),
                                LayoutEditor.Row.from({
                                    toolboxIcon: "\uf0c9",
                                    toolboxLabel: "Row (12 columns)",
                                    toolboxDescription: "Row with 12 columns.",
                                    children: LayoutEditor.Column.times(12)
                                }), LayoutEditor.Row.from({
                                    toolboxIcon: "\uf0c9",
                                    toolboxLabel: "Row (empty)",
                                    toolboxDescription: "Empty row.",
                                    children: []
                                })
                            ];

                            $scope.columnElements = [
                                LayoutEditor.Column.from({
                                    toolboxIcon: "\uf0db",
                                    toolboxLabel: "Column",
                                    toolboxDescription: "Empty column.",
                                    width: 1,
                                    offset: 0,
                                    children: []
                                })
                            ];

                            $scope.canvasElements = [
                                LayoutEditor.Canvas.from({
                                    toolboxIcon: "\uf044",
                                    toolboxLabel: "Canvas",
                                    toolboxDescription: "Empty canvas.",
                                    children: []
                                })
                            ];

                            $scope.contentElementCategories = _($scope.element.config.categories).map(function (category) {
                                return {
                                    name: category.name,
                                    elements: _(category.contentTypes).map(function (contentType) {
                                        var type = contentType.type;
                                        var factory = LayoutEditor.factories[type] || LayoutEditor.factories["Content"];
                                        var item = {
                                            isTemplated: false,
                                            contentType: contentType.id,
                                            contentTypeLabel: contentType.label,
                                            contentTypeClass: contentType.typeClass,
                                            data: null,
                                            hasEditor: contentType.hasEditor,
                                            html: contentType.html
                                        };
                                        var element = factory(item);
                                        element.toolboxIcon = contentType.icon || "\uf1c9";
                                        element.toolboxLabel = contentType.label;
                                        element.toolboxDescription = contentType.description;
                                        return element;
                                    })
                                };
                            });

                        };

                        $scope.resetElements();

                        $scope.getSortableOptions = function (type) {
                            var editorId = $element.closest(".layout-editor").attr("id");
                            var parentClasses;
                            var placeholderClasses;
                            var floating = false;

                            switch (type) {
                                case "Grid":
                                    parentClasses = [".layout-canvas", ".layout-column", ".layout-common-holder"];
                                    placeholderClasses = "layout-element layout-container layout-grid ui-sortable-placeholder";
                                    break;
                                case "Row":
                                    parentClasses = [".layout-grid"];
                                    placeholderClasses = "layout-element layout-container layout-row row ui-sortable-placeholder";
                                    break;
                                case "Column":
                                    parentClasses = [".layout-row:not(.layout-row-full)"];
                                    placeholderClasses = "layout-element layout-container layout-column ui-sortable-placeholder";
                                    floating = true; // To ensure a smooth horizontal-list reordering. https://github.com/angular-ui/ui-sortable#floating
                                    break;
                                case "Content":
                                    parentClasses = [".layout-canvas", ".layout-column", ".layout-common-holder"];
                                    placeholderClasses = "layout-element layout-content ui-sortable-placeholder";
                                    break;
                                case "Canvas":
                                    parentClasses = [".layout-canvas", ".layout-column", ".layout-common-holder"];
                                    placeholderClasses = "layout-element layout-container layout-grid ui-sortable-placeholder";
                                    break;
                            }

                            return {
                                cursor: "move",
                                connectWith: _(parentClasses).map(function (e) { return "#" + editorId + " " + e + ":not(.layout-container-sealed) > .layout-element-wrapper > .layout-children"; }).join(", "),
                                placeholder: placeholderClasses,
                                "ui-floating": floating,
                                create: function (e, ui) {
                                    e.target.isToolbox = true; // Will indicate to connected sortables that dropped items were sent from toolbox.
                                },
                                start: function (e, ui) {
                                    $scope.$apply(function () {
                                        $scope.element.isDragging = true;
                                    });
                                },
                                stop: function (e, ui) {
                                    $scope.$apply(function () {
                                        $scope.element.isDragging = false;
                                        $scope.resetElements();
                                    });
                                },
                                over: function (e, ui) {
                                    $scope.$apply(function () {
                                        $scope.element.canvas.setIsDropTarget(false);
                                    });
                                },
                            }
                        };

                        var layoutIsCollapsedCookieName = "layoutToolboxCategory_Layout_IsCollapsed";
                        $scope.layoutIsCollapsed = $.cookie(layoutIsCollapsedCookieName) === "true";

                        $scope.toggleLayoutIsCollapsed = function (e) {
                            $scope.layoutIsCollapsed = !$scope.layoutIsCollapsed;
                            $.cookie(layoutIsCollapsedCookieName, $scope.layoutIsCollapsed, { expires: 365 }); // Remember collapsed state for a year.
                            e.preventDefault();
                            e.stopPropagation();
                        };
                    }
                ],
                templateUrl: environment.templateUrl("Toolbox"),
                replace: true,
                link: function (scope, element) {
                    var toolbox = element.find(".layout-toolbox");
                    $(window).on("resize scroll", function (e) {
                        var canvas = element.parent().find(".layout-canvas");
                        // If the canvas is taller than the toolbox, make the toolbox sticky-positioned within the editor
                        // to help the user avoid excessive vertical scrolling.
                        var canvasIsTaller = !!canvas && canvas.height() > toolbox.height();
                        var windowPos = $(window).scrollTop();
                        if (canvasIsTaller && windowPos > element.offset().top + element.height() - toolbox.height()) {
                            toolbox.addClass("sticky-bottom");
                            toolbox.removeClass("sticky-top");
                        }
                        else if (canvasIsTaller && windowPos > element.offset().top) {
                            toolbox.addClass("sticky-top");
                            toolbox.removeClass("sticky-bottom");
                        }
                        else {
                            toolbox.removeClass("sticky-top");
                            toolbox.removeClass("sticky-bottom");
                        }
                    });
                }
            };
        }
    ]);
angular
    .module("LayoutEditor")
    .directive("orcLayoutToolboxGroup", ["$compile", "environment",
        function ($compile, environment) {
            return {
                restrict: "E",
                scope: { category: "=" },
                controller: ["$scope", "$element",
                    function ($scope, $element) {
                        var isCollapsedCookieName = "layoutToolboxCategory_" + $scope.category.name + "_IsCollapsed";
                        $scope.isCollapsed = $.cookie(isCollapsedCookieName) === "true";
                        $scope.toggleIsCollapsed = function (e) {
                            $scope.isCollapsed = !$scope.isCollapsed;
                            $.cookie(isCollapsedCookieName, $scope.isCollapsed, { expires: 365 }); // Remember collapsed state for a year.
                            e.preventDefault();
                            e.stopPropagation();
                        };
                    }
                ],
                templateUrl: environment.templateUrl("ToolboxGroup"),
                replace: true
            };
        }
    ]);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIk1vZHVsZS5qcyIsIkNsaXBib2FyZC5qcyIsIlNjb3BlQ29uZmlndXJhdG9yLmpzIiwiRWRpdG9yLmpzIiwiQ2FudmFzLmpzIiwiQ2hpbGQuanMiLCJDb2x1bW4uanMiLCJDb250ZW50LmpzIiwiSHRtbC5qcyIsIkdyaWQuanMiLCJSb3cuanMiLCJQb3B1cC5qcyIsIlRvb2xib3guanMiLCJUb29sYm94R3JvdXAuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzdDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2pVQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN6SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ25FQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNuQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDbkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDdkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzlNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiTGF5b3V0RWRpdG9yLmpzIiwic291cmNlc0NvbnRlbnQiOlsiYW5ndWxhci5tb2R1bGUoXCJMYXlvdXRFZGl0b3JcIiwgW1wibmdTYW5pdGl6ZVwiLCBcIm5nUmVzb3VyY2VcIiwgXCJ1aS5zb3J0YWJsZVwiXSk7IiwidmFyIExheW91dEVkaXRvcjtcclxuKGZ1bmN0aW9uKExheW91dEVkaXRvcikge1xyXG5cclxuICAgIHZhciBDbGlwYm9hcmQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xyXG4gICAgICAgIHRoaXMuX2NsaXBib2FyZERhdGEgPSB7fTtcclxuICAgICAgICB0aGlzLl9pc0Rpc2FibGVkID0gZmFsc2U7XHJcbiAgICAgICAgdGhpcy5fd2FzSW52b2tlZCA9IGZhbHNlO1xyXG5cclxuICAgICAgICB0aGlzLnNldERhdGEgPSBmdW5jdGlvbihjb250ZW50VHlwZSwgZGF0YSkge1xyXG4gICAgICAgICAgICBzZWxmLl9jbGlwYm9hcmREYXRhW2NvbnRlbnRUeXBlXSA9IGRhdGE7XHJcbiAgICAgICAgICAgIHNlbGYuX3dhc0ludm9rZWQgPSB0cnVlO1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgdGhpcy5nZXREYXRhID0gZnVuY3Rpb24gKGNvbnRlbnRUeXBlKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBzZWxmLl9jbGlwYm9hcmREYXRhW2NvbnRlbnRUeXBlXTtcclxuICAgICAgICAgICAgc2VsZi5fd2FzSW52b2tlZCA9IHRydWU7XHJcbiAgICAgICAgfTtcclxuICAgICAgICB0aGlzLmRpc2FibGUgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgc2VsZi5faXNEaXNhYmxlZCA9IHRydWU7XHJcbiAgICAgICAgICAgIHNlbGYuX3dhc0ludm9rZWQgPSBmYWxzZTtcclxuICAgICAgICAgICAgc2VsZi5fY2xpcGJvYXJkRGF0YSA9IHt9O1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgdGhpcy5pc0Rpc2FibGVkID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICByZXR1cm4gc2VsZi5faXNEaXNhYmxlZDtcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy53YXNJbnZva2VkID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICByZXR1cm4gc2VsZi5fd2FzSW52b2tlZDtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgTGF5b3V0RWRpdG9yLkNsaXBib2FyZCA9IG5ldyBDbGlwYm9hcmQoKTtcclxuXHJcbiAgICBhbmd1bGFyXHJcbiAgICAgICAgLm1vZHVsZShcIkxheW91dEVkaXRvclwiKVxyXG4gICAgICAgIC5mYWN0b3J5KFwiY2xpcGJvYXJkXCIsIFtcclxuICAgICAgICAgICAgZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgICAgIHNldERhdGE6IExheW91dEVkaXRvci5DbGlwYm9hcmQuc2V0RGF0YSxcclxuICAgICAgICAgICAgICAgICAgICBnZXREYXRhOiBMYXlvdXRFZGl0b3IuQ2xpcGJvYXJkLmdldERhdGEsXHJcbiAgICAgICAgICAgICAgICAgICAgZGlzYWJsZTogTGF5b3V0RWRpdG9yLkNsaXBib2FyZC5kaXNhYmxlLFxyXG4gICAgICAgICAgICAgICAgICAgIGlzRGlzYWJsZWQ6IExheW91dEVkaXRvci5DbGlwYm9hcmQuaXNEaXNhYmxlZCxcclxuICAgICAgICAgICAgICAgICAgICB3YXNJbnZva2VkOiBMYXlvdXRFZGl0b3IuQ2xpcGJvYXJkLndhc0ludm9rZWRcclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICBdKTtcclxufSkoTGF5b3V0RWRpdG9yIHx8IChMYXlvdXRFZGl0b3IgPSB7fSkpOyIsImFuZ3VsYXJcclxuICAgIC5tb2R1bGUoXCJMYXlvdXRFZGl0b3JcIilcclxuICAgIC5mYWN0b3J5KFwic2NvcGVDb25maWd1cmF0b3JcIiwgW1wiJHRpbWVvdXRcIiwgXCJjbGlwYm9hcmRcIixcclxuICAgICAgICBmdW5jdGlvbiAoJHRpbWVvdXQsIGNsaXBib2FyZCkge1xyXG4gICAgICAgICAgICByZXR1cm4ge1xyXG5cclxuICAgICAgICAgICAgICAgIGNvbmZpZ3VyZUZvckVsZW1lbnQ6IGZ1bmN0aW9uICgkc2NvcGUsICRlbGVtZW50KSB7XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICAkZWxlbWVudC5maW5kKFwiLmxheW91dC1wYW5lbFwiKS5jbGljayhmdW5jdGlvbiAoZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAkZWxlbWVudC5wYXJlbnQoKS5rZXlkb3duKGZ1bmN0aW9uIChlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBoYW5kbGVkID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciByZXNldEZvY3VzID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBlbGVtZW50ID0gJHNjb3BlLmVsZW1lbnQ7XHJcbiAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlbGVtZW50LmVkaXRvci5pc0RyYWdnaW5nKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gSWYgbmF0aXZlIGNsaXBib2FyZCBzdXBwb3J0IGV4aXN0cywgdGhlIHBzZXVkby1jbGlwYm9hcmQgd2lsbCBoYXZlIGJlZW4gZGlzYWJsZWQuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghY2xpcGJvYXJkLmlzRGlzYWJsZWQoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGZvY3VzZWRFbGVtZW50ID0gZWxlbWVudC5lZGl0b3IuZm9jdXNlZEVsZW1lbnQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoISFmb2N1c2VkRWxlbWVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFBzZXVkbyBjbGlwYm9hcmQgaGFuZGxpbmcgZm9yIGJyb3dzZXJzIG5vdCBhbGxvd2luZyByZWFsIGNsaXBib2FyZCBvcGVyYXRpb25zLlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlLmN0cmxLZXkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3dpdGNoIChlLndoaWNoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgNjc6IC8vIENcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvY3VzZWRFbGVtZW50LmNvcHkoY2xpcGJvYXJkKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIDg4OiAvLyBYXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb2N1c2VkRWxlbWVudC5jdXQoY2xpcGJvYXJkKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIDg2OiAvLyBWXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb2N1c2VkRWxlbWVudC5wYXN0ZShjbGlwYm9hcmQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghZS5jdHJsS2V5ICYmICFlLnNoaWZ0S2V5ICYmICFlLmFsdEtleSAmJiBlLndoaWNoID09IDQ2KSB7IC8vIERlbFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmRlbGV0ZShlbGVtZW50KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhhbmRsZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKCFlLmN0cmxLZXkgJiYgIWUuc2hpZnRLZXkgJiYgIWUuYWx0S2V5ICYmIChlLndoaWNoID09IDMyIHx8IGUud2hpY2ggPT0gMjcpKSB7IC8vIFNwYWNlIG9yIEVzY1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJGVsZW1lbnQuZmluZChcIi5sYXlvdXQtcGFuZWwtYWN0aW9uLXByb3BlcnRpZXNcIikuZmlyc3QoKS5jbGljaygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaGFuZGxlZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlbGVtZW50LnR5cGUgPT0gXCJDb250ZW50XCIpIHsgLy8gVGhpcyBpcyBhIGNvbnRlbnQgZWxlbWVudC5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghZS5jdHJsS2V5ICYmICFlLnNoaWZ0S2V5ICYmICFlLmFsdEtleSAmJiBlLndoaWNoID09IDEzKSB7IC8vIEVudGVyXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJGVsZW1lbnQuZmluZChcIi5sYXlvdXQtcGFuZWwtYWN0aW9uLWVkaXRcIikuZmlyc3QoKS5jbGljaygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhhbmRsZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoISFlbGVtZW50LmNoaWxkcmVuKSB7IC8vIFRoaXMgaXMgYSBjb250YWluZXIuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWUuY3RybEtleSAmJiAhZS5zaGlmdEtleSAmJiBlLmFsdEtleSAmJiBlLndoaWNoID09IDQwKSB7IC8vIEFsdCtEb3duXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVsZW1lbnQuY2hpbGRyZW4ubGVuZ3RoID4gMClcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5jaGlsZHJlblswXS5zZXRJc0ZvY3VzZWQoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoYW5kbGVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZWxlbWVudC50eXBlID09IFwiQ29sdW1uXCIpIHsgLy8gVGhpcyBpcyBhIGNvbHVtbi5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgY29ubmVjdEFkamFjZW50ID0gIWUuY3RybEtleTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZS53aGljaCA9PSAzNykgeyAvLyBMZWZ0XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlLmFsdEtleSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuZXhwYW5kTGVmdChjb25uZWN0QWRqYWNlbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZS5zaGlmdEtleSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuY29udHJhY3RSaWdodChjb25uZWN0QWRqYWNlbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoYW5kbGVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGUud2hpY2ggPT0gMzkpIHsgLy8gUmlnaHRcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGUuYWx0S2V5KVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5jb250cmFjdExlZnQoY29ubmVjdEFkamFjZW50KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGUuc2hpZnRLZXkpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50LmV4cGFuZFJpZ2h0KGNvbm5lY3RBZGphY2VudCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhhbmRsZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCEhZWxlbWVudC5wYXJlbnQpIHsgLy8gVGhpcyBpcyBhIGNoaWxkLlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGUuYWx0S2V5ICYmIGUud2hpY2ggPT0gMzgpIHsgLy8gQWx0K1VwXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5wYXJlbnQuc2V0SXNGb2N1c2VkKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaGFuZGxlZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVsZW1lbnQucGFyZW50LnR5cGUgPT0gXCJSb3dcIikgeyAvLyBQYXJlbnQgaXMgYSBob3Jpem9udGFsIGNvbnRhaW5lci5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWUuY3RybEtleSAmJiAhZS5zaGlmdEtleSAmJiAhZS5hbHRLZXkgJiYgZS53aGljaCA9PSAzNykgeyAvLyBMZWZ0XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQucGFyZW50Lm1vdmVGb2N1c1ByZXZDaGlsZChlbGVtZW50KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaGFuZGxlZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKCFlLmN0cmxLZXkgJiYgIWUuc2hpZnRLZXkgJiYgIWUuYWx0S2V5ICYmIGUud2hpY2ggPT0gMzkpIHsgLy8gUmlnaHRcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5wYXJlbnQubW92ZUZvY3VzTmV4dENoaWxkKGVsZW1lbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoYW5kbGVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiAoZS5jdHJsS2V5ICYmICFlLnNoaWZ0S2V5ICYmICFlLmFsdEtleSAmJiBlLndoaWNoID09IDM3KSB7IC8vIEN0cmwrTGVmdFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50Lm1vdmVVcCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNldEZvY3VzID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaGFuZGxlZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKGUuY3RybEtleSAmJiAhZS5zaGlmdEtleSAmJiAhZS5hbHRLZXkgJiYgZS53aGljaCA9PSAzOSkgeyAvLyBDdHJsK1JpZ2h0XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQubW92ZURvd24oKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaGFuZGxlZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7IC8vIFBhcmVudCBpcyBhIHZlcnRpY2FsIGNvbnRhaW5lci5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWUuY3RybEtleSAmJiAhZS5zaGlmdEtleSAmJiAhZS5hbHRLZXkgJiYgZS53aGljaCA9PSAzOCkgeyAvLyBVcFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50LnBhcmVudC5tb3ZlRm9jdXNQcmV2Q2hpbGQoZWxlbWVudCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhhbmRsZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIGlmICghZS5jdHJsS2V5ICYmICFlLnNoaWZ0S2V5ICYmICFlLmFsdEtleSAmJiBlLndoaWNoID09IDQwKSB7IC8vIERvd25cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5wYXJlbnQubW92ZUZvY3VzTmV4dENoaWxkKGVsZW1lbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoYW5kbGVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiAoZS5jdHJsS2V5ICYmICFlLnNoaWZ0S2V5ICYmICFlLmFsdEtleSAmJiBlLndoaWNoID09IDM4KSB7IC8vIEN0cmwrVXBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5tb3ZlVXAoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzZXRGb2N1cyA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhhbmRsZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIGlmIChlLmN0cmxLZXkgJiYgIWUuc2hpZnRLZXkgJiYgIWUuYWx0S2V5ICYmIGUud2hpY2ggPT0gNDApIHsgLy8gQ3RybCtEb3duXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQubW92ZURvd24oKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaGFuZGxlZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaGFuZGxlZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLiRhcHBseSgpOyAvLyBFdmVudCBpcyBub3QgdHJpZ2dlcmVkIGJ5IEFuZ3VsYXIgZGlyZWN0aXZlIGJ1dCByYXcgZXZlbnQgaGFuZGxlciBvbiBlbGVtZW50LlxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gSEFDSzogV29ya2Fyb3VuZCBiZWNhdXNlIG9mIGhvdyBBbmd1bGFyIHRyZWF0cyB0aGUgRE9NIHdoZW4gZWxlbWVudHMgYXJlIHNoaWZ0ZWQgYXJvdW5kIC0gaW5wdXQgZm9jdXMgaXMgc29tZXRpbWVzIGxvc3QuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZXNldEZvY3VzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aW5kb3cuc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLiRhcHBseShmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuZWRpdG9yLmZvY3VzZWRFbGVtZW50LnNldElzRm9jdXNlZCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSwgMTAwKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuZWxlbWVudC5zZXRJc0ZvY3VzZWRFdmVudEhhbmRsZXJzLnB1c2goZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAkZWxlbWVudC5wYXJlbnQoKS5mb2N1cygpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuZGVsZXRlID0gZnVuY3Rpb24gKGVsZW1lbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5kZWxldGUoKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9LFxyXG5cclxuICAgICAgICAgICAgICAgIGNvbmZpZ3VyZUZvckNvbnRhaW5lcjogZnVuY3Rpb24gKCRzY29wZSwgJGVsZW1lbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgZWxlbWVudCA9ICRzY29wZS5lbGVtZW50O1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAvLyRzY29wZS5pc1JlY2VpdmluZyA9IGZhbHNlOyAvLyBUcnVlIHdoZW4gY29udGFpbmVyIGlzIHJlY2VpdmluZyBhbiBleHRlcm5hbCBlbGVtZW50IHZpYSBkcmFnL2Ryb3AuXHJcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmdldFNob3dDaGlsZHJlblBsYWNlaG9sZGVyID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gJHNjb3BlLmVsZW1lbnQuY2hpbGRyZW4ubGVuZ3RoID09PSAwICYmICEkc2NvcGUuZWxlbWVudC5nZXRJc0Ryb3BUYXJnZXQoKTtcclxuICAgICAgICAgICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuc29ydGFibGVPcHRpb25zID0ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjdXJzb3I6IFwibW92ZVwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWxheTogMTUwLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBkaXNhYmxlZDogZWxlbWVudC5nZXRJc1NlYWxlZCgpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBkaXN0YW5jZTogNSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy9oYW5kbGU6IGVsZW1lbnQuY2hpbGRyZW4ubGVuZ3RoIDwgMiA/IFwiLmltYWdpbmFyeS1jbGFzc1wiIDogZmFsc2UsIC8vIEZvciBzb21lIHJlYXNvbiBkb2Vzbid0IGdldCByZS1ldmFsdWF0ZWQgYWZ0ZXIgYWRkaW5nIG1vcmUgY2hpbGRyZW4uXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0OiBmdW5jdGlvbiAoZSwgdWkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS4kYXBwbHkoZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuc2V0SXNEcm9wVGFyZ2V0KHRydWUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuZWRpdG9yLmlzRHJhZ2dpbmcgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBNYWtlIHRoZSBkcm9wIHRhcmdldCBwbGFjZWhvbGRlciBhcyBoaWdoIGFzIHRoZSBpdGVtIGJlaW5nIGRyYWdnZWQuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1aS5wbGFjZWhvbGRlci5oZWlnaHQodWkuaXRlbS5oZWlnaHQoKSAtIDQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdWkucGxhY2Vob2xkZXIuY3NzKFwibWluLWhlaWdodFwiLCAwKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3RvcDogZnVuY3Rpb24gKGUsIHVpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuJGFwcGx5KGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50LmVkaXRvci5pc0RyYWdnaW5nID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5zZXRJc0Ryb3BUYXJnZXQoZmFsc2UpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG92ZXI6IGZ1bmN0aW9uIChlLCB1aSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCEhdWkuc2VuZGVyICYmICEhdWkuc2VuZGVyWzBdLmlzVG9vbGJveCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghIXVpLnNlbmRlclswXS5kcm9wVGFyZ2V0VGltZW91dCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkdGltZW91dC5jYW5jZWwodWkuc2VuZGVyWzBdLmRyb3BUYXJnZXRUaW1lb3V0KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdWkuc2VuZGVyWzBdLmRyb3BUYXJnZXRUaW1lb3V0ID0gbnVsbDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHRpbWVvdXQoZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZWxlbWVudC50eXBlID09IFwiUm93XCIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIElmIHRoZXJlIHdhcyBhIHByZXZpb3VzIGRyb3AgdGFyZ2V0IGFuZCBpdCB3YXMgYSByb3csIHJvbGwgYmFjayBhbnkgcGVuZGluZyBjb2x1bW4gYWRkcyB0byBpdC5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBwcmV2aW91c0Ryb3BUYXJnZXQgPSBlbGVtZW50LmVkaXRvci5kcm9wVGFyZ2V0RWxlbWVudDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghIXByZXZpb3VzRHJvcFRhcmdldCAmJiBwcmV2aW91c0Ryb3BUYXJnZXQudHlwZSA9PSBcIlJvd1wiKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByZXZpb3VzRHJvcFRhcmdldC5yb2xsYmFja0FkZENvbHVtbigpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuc2V0SXNEcm9wVGFyZ2V0KGZhbHNlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1aS5zZW5kZXJbMF0uZHJvcFRhcmdldFRpbWVvdXQgPSAkdGltZW91dChmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlbGVtZW50LnR5cGUgPT0gXCJSb3dcIikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHJlY2VpdmVkQ29sdW1uID0gdWkuaXRlbS5zb3J0YWJsZS5tb2RlbDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciByZWNlaXZlZENvbHVtbldpZHRoID0gTWF0aC5mbG9vcigxMiAvIChlbGVtZW50LmNoaWxkcmVuLmxlbmd0aCArIDEpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlY2VpdmVkQ29sdW1uLndpZHRoID0gcmVjZWl2ZWRDb2x1bW5XaWR0aDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlY2VpdmVkQ29sdW1uLm9mZnNldCA9IDA7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50LmJlZ2luQWRkQ29sdW1uKHJlY2VpdmVkQ29sdW1uV2lkdGgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gTWFrZSB0aGUgZHJvcCB0YXJnZXQgcGxhY2Vob2xkZXIgdGhlIGNvcnJlY3Qgd2lkdGggYW5kIGFzIGhpZ2ggYXMgdGhlIGhpZ2hlc3QgZXhpc3RpbmcgY29sdW1uIGluIHRoZSByb3cuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgbWF4SGVpZ2h0ID0gXy5tYXgoXygkZWxlbWVudC5maW5kKFwiPiAubGF5b3V0LWNoaWxkcmVuID4gLmxheW91dC1jb2x1bW46bm90KC51aS1zb3J0YWJsZS1wbGFjZWhvbGRlcilcIikpLm1hcChmdW5jdGlvbiAoZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAkKGUpLmhlaWdodCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChpID0gMTsgaSA8PSAxMjsgaSsrKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVpLnBsYWNlaG9sZGVyLnJlbW92ZUNsYXNzKFwiY29sLXhzLVwiICsgaSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1aS5wbGFjZWhvbGRlci5hZGRDbGFzcyhcImNvbC14cy1cIiArIHJlY2VpdmVkQ29sdW1uLndpZHRoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtYXhIZWlnaHQgPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdWkucGxhY2Vob2xkZXIuaGVpZ2h0KG1heEhlaWdodCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdWkucGxhY2Vob2xkZXIuY3NzKFwibWluLWhlaWdodFwiLCAwKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVpLnBsYWNlaG9sZGVyLmhlaWdodCgwKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1aS5wbGFjZWhvbGRlci5jc3MoXCJtaW4taGVpZ2h0XCIsIFwiXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuc2V0SXNEcm9wVGFyZ2V0KHRydWUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sIDE1MCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlY2VpdmU6IGZ1bmN0aW9uIChlLCB1aSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCEhdWkuc2VuZGVyICYmICEhdWkuc2VuZGVyWzBdLmlzVG9vbGJveCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS4kYXBwbHkoZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgcmVjZWl2ZWRFbGVtZW50ID0gdWkuaXRlbS5zb3J0YWJsZS5tb2RlbDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCEhcmVjZWl2ZWRFbGVtZW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZWxlbWVudC50eXBlID09IFwiUm93XCIpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5jb21taXRBZGRDb2x1bW4oKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNob3VsZCBpZGVhbGx5IGNhbGwgTGF5b3V0RWRpdG9yLkNvbnRhaW5lci5hZGRDaGlsZCgpIGluc3RlYWQsIGJ1dCBzaW5jZSB0aGlzIGhhbmRsZXJcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGlzIHJ1biAqYmVmb3JlKiB0aGUgdWktc29ydGFibGUgZGlyZWN0aXZlJ3MgaGFuZGxlciwgaWYgd2UgdHJ5IHRvIGFkZCB0aGUgY2hpbGQgdG8gdGhlXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBhcnJheSB0aGF0IGhhbmRsZXIgd2lsbCBnZXQgYW4gZXhjZXB0aW9uIHdoZW4gdHJ5aW5nIHRvIGRvIHRoZSBzYW1lLlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gQmVjYXVzZSBvZiB0aGlzLCB3ZSBuZWVkIHRvIGludm9rZSBcInNldFBhcmVudFwiIHNvIHRoYXQgc3BlY2lmaWMgY29udGFpbmVyIHR5cGVzIGNhbiBwZXJmb3JtIGVsZW1lbnQgc3BlZmljaWMgaW5pdGlhbGl6YXRpb24uXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWNlaXZlZEVsZW1lbnQuc2V0RWRpdG9yKGVsZW1lbnQuZWRpdG9yKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlY2VpdmVkRWxlbWVudC5zZXRQYXJlbnQoZWxlbWVudCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCEhcmVjZWl2ZWRFbGVtZW50Lmhhc0VkaXRvcikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS4kcm9vdC5lZGl0RWxlbWVudChyZWNlaXZlZEVsZW1lbnQpLnRoZW4oZnVuY3Rpb24gKGFyZ3MpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFhcmdzLmNhbmNlbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVjZWl2ZWRFbGVtZW50LmRhdGEgPSBhcmdzLmVsZW1lbnQuZGF0YTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlY2VpdmVkRWxlbWVudC5hcHBseUVsZW1lbnRFZGl0b3JNb2RlbChhcmdzLmVsZW1lbnRFZGl0b3JNb2RlbCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCEhcmVjZWl2ZWRFbGVtZW50LnNldEh0bWwpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVjZWl2ZWRFbGVtZW50LnNldEh0bWwoYXJncy5lbGVtZW50Lmh0bWwpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICR0aW1lb3V0KGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghIWFyZ3MuY2FuY2VsKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlY2VpdmVkRWxlbWVudC5kZWxldGUoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2VcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWNlaXZlZEVsZW1lbnQuc2V0SXNGb2N1c2VkKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyRzY29wZS5pc1JlY2VpdmluZyA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5zZXRJc0Ryb3BUYXJnZXQoZmFsc2UpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkdGltZW91dChmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyRzY29wZS5pc1JlY2VpdmluZyA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5zZXRJc0Ryb3BUYXJnZXQoZmFsc2UpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCEhcmVjZWl2ZWRFbGVtZW50KVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlY2VpdmVkRWxlbWVudC5zZXRJc0ZvY3VzZWQoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuY2xpY2sgPSBmdW5jdGlvbiAoY2hpbGQsIGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFjaGlsZC5lZGl0b3IuaXNEcmFnZ2luZylcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNoaWxkLnNldElzRm9jdXNlZCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xyXG4gICAgICAgICAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5nZXRDbGFzc2VzID0gZnVuY3Rpb24gKGNoaWxkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciByZXN1bHQgPSBbXCJsYXlvdXQtZWxlbWVudFwiXTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghIWNoaWxkLmNoaWxkcmVuKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQucHVzaChcImxheW91dC1jb250YWluZXJcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY2hpbGQuZ2V0SXNTZWFsZWQoKSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQucHVzaChcImxheW91dC1jb250YWluZXItc2VhbGVkXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQucHVzaChcImxheW91dC1cIiArIGNoaWxkLnR5cGUudG9Mb3dlckNhc2UoKSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoISFjaGlsZC5kcm9wVGFyZ2V0Q2xhc3MpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQucHVzaChjaGlsZC5kcm9wVGFyZ2V0Q2xhc3MpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gVE9ETzogTW92ZSB0aGVzZSB0byBlaXRoZXIgdGhlIENvbHVtbiBkaXJlY3RpdmUgb3IgdGhlIENvbHVtbiBtb2RlbCBjbGFzcy5cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNoaWxkLnR5cGUgPT0gXCJSb3dcIikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0LnB1c2goXCJyb3dcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWNoaWxkLmNhbkFkZENvbHVtbigpKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdC5wdXNoKFwibGF5b3V0LXJvdy1mdWxsXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjaGlsZC50eXBlID09IFwiQ29sdW1uXCIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdC5wdXNoKFwiY29sLXhzLVwiICsgY2hpbGQud2lkdGgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0LnB1c2goXCJjb2wteHMtb2Zmc2V0LVwiICsgY2hpbGQub2Zmc2V0KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoY2hpbGQudHlwZSA9PSBcIkNvbnRlbnRcIilcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdC5wdXNoKFwibGF5b3V0LWNvbnRlbnQtXCIgKyBjaGlsZC5jb250ZW50VHlwZUNsYXNzKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjaGlsZC5nZXRJc0FjdGl2ZSgpKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0LnB1c2goXCJsYXlvdXQtZWxlbWVudC1hY3RpdmVcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjaGlsZC5nZXRJc0ZvY3VzZWQoKSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdC5wdXNoKFwibGF5b3V0LWVsZW1lbnQtZm9jdXNlZFwiKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNoaWxkLmdldElzU2VsZWN0ZWQoKSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdC5wdXNoKFwibGF5b3V0LWVsZW1lbnQtc2VsZWN0ZWRcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjaGlsZC5nZXRJc0Ryb3BUYXJnZXQoKSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdC5wdXNoKFwibGF5b3V0LWVsZW1lbnQtZHJvcHRhcmdldFwiKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNoaWxkLmlzVGVtcGxhdGVkKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0LnB1c2goXCJsYXlvdXQtZWxlbWVudC10ZW1wbGF0ZWRcIik7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xyXG4gICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfVxyXG4gICAgXSk7IiwiYW5ndWxhclxyXG4gICAgLm1vZHVsZShcIkxheW91dEVkaXRvclwiKVxyXG4gICAgLmRpcmVjdGl2ZShcIm9yY0xheW91dEVkaXRvclwiLCBbXCJlbnZpcm9ubWVudFwiLFxyXG4gICAgICAgIGZ1bmN0aW9uIChlbnZpcm9ubWVudCkge1xyXG4gICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgcmVzdHJpY3Q6IFwiRVwiLFxyXG4gICAgICAgICAgICAgICAgc2NvcGU6IHt9LFxyXG4gICAgICAgICAgICAgICAgY29udHJvbGxlcjogW1wiJHNjb3BlXCIsIFwiJGVsZW1lbnRcIiwgXCIkYXR0cnNcIiwgXCIkY29tcGlsZVwiLCBcImNsaXBib2FyZFwiLFxyXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uICgkc2NvcGUsICRlbGVtZW50LCAkYXR0cnMsICRjb21waWxlLCBjbGlwYm9hcmQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCEhJGF0dHJzLm1vZGVsKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmVsZW1lbnQgPSBldmFsKCRhdHRycy5tb2RlbCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2VcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlRoZSAnbW9kZWwnIGF0dHJpYnV0ZSBtdXN0IGV2YWx1YXRlIHRvIGEgTGF5b3V0RWRpdG9yLkVkaXRvciBvYmplY3QuXCIpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmNsaWNrID0gZnVuY3Rpb24gKGNhbnZhcywgZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFjYW52YXMuZWRpdG9yLmlzRHJhZ2dpbmcpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FudmFzLnNldElzRm9jdXNlZCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5nZXRDbGFzc2VzID0gZnVuY3Rpb24gKGNhbnZhcykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHJlc3VsdCA9IFtcImxheW91dC1lbGVtZW50XCIsIFwibGF5b3V0LWNvbnRhaW5lclwiLCBcImxheW91dC1jYW52YXNcIl07XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNhbnZhcy5nZXRJc0FjdGl2ZSgpKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdC5wdXNoKFwibGF5b3V0LWVsZW1lbnQtYWN0aXZlXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNhbnZhcy5nZXRJc0ZvY3VzZWQoKSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQucHVzaChcImxheW91dC1lbGVtZW50LWZvY3VzZWRcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY2FudmFzLmdldElzU2VsZWN0ZWQoKSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQucHVzaChcImxheW91dC1lbGVtZW50LXNlbGVjdGVkXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNhbnZhcy5nZXRJc0Ryb3BUYXJnZXQoKSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQucHVzaChcImxheW91dC1lbGVtZW50LWRyb3B0YXJnZXRcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY2FudmFzLmlzVGVtcGxhdGVkKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdC5wdXNoKFwibGF5b3V0LWVsZW1lbnQtdGVtcGxhdGVkXCIpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBBbiB1bmZvcnR1bmF0ZSBzaWRlLWVmZmVjdCBvZiB0aGUgbmV4dCBoYWNrIG9uIGxpbmUgNTQgaXMgdGhhdCB0aGUgY3JlYXRlZCBlbGVtZW50cyBhcmVuJ3QgYWRkZWQgdG8gdGhlIERPTSB5ZXQsIHNvIHdlIGNhbid0IHVzZSBpdCB0byBnZXQgdG8gdGhlIHBhcmVudCBcIi5sYXlvdXQtZGVzaWdlclwiIGVsZW1lbnQuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFdvcmsgYXJvdW5kOiBhY2Nlc3MgdGhhdCBlbGVtZW50IGRpcmVjdGx5ICh3aGljaCBlZmVjdGl2ZWx5IHR1cm5zIG11bHRpcGxlIGxheW91dCBlZGl0b3JzIG9uIGEgc2luZ2xlIHBhZ2UgaW1wb3NzaWJsZSkuIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyAvL3ZhciBsYXlvdXREZXNpZ25lckhvc3QgPSAkZWxlbWVudC5jbG9zZXN0KFwiLmxheW91dC1kZXNpZ25lclwiKS5kYXRhKFwibGF5b3V0LWRlc2lnbmVyLWhvc3RcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBsYXlvdXREZXNpZ25lckhvc3QgPSAkKFwiLmxheW91dC1kZXNpZ25lclwiKS5kYXRhKFwibGF5b3V0LWRlc2lnbmVyLWhvc3RcIik7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuJHJvb3QubGF5b3V0RGVzaWduZXJIb3N0ID0gbGF5b3V0RGVzaWduZXJIb3N0O1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgbGF5b3V0RGVzaWduZXJIb3N0LmVsZW1lbnQub24oXCJyZXBsYWNlY2FudmFzXCIsIGZ1bmN0aW9uIChlLCBhcmdzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgZWRpdG9yID0gJHNjb3BlLmVsZW1lbnQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgY2FudmFzRGF0YSA9IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhOiBhcmdzLmNhbnZhcy5kYXRhLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGh0bWxJZDogYXJncy5jYW52YXMuaHRtbElkLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGh0bWxDbGFzczogYXJncy5jYW52YXMuaHRtbENsYXNzLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGh0bWxTdHlsZTogYXJncy5jYW52YXMuaHRtbFN0eWxlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlzVGVtcGxhdGVkOiBhcmdzLmNhbnZhcy5pc1RlbXBsYXRlZCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjaGlsZHJlbjogYXJncy5jYW52YXMuY2hpbGRyZW5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gSEFDSzogSW5zdGVhZCBvZiBzaW1wbHkgdXBkYXRpbmcgdGhlICRzY29wZS5lbGVtZW50IHdpdGggYSBuZXcgaW5zdGFuY2UsIHdlIG5lZWQgdG8gcmVwbGFjZSB0aGUgZW50aXJlIG9yYy1sYXlvdXQtZWRpdG9yIG1hcmt1cFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gaW4gb3JkZXIgZm9yIGFuZ3VsYXIgdG8gcmViaW5kIHN0YXJ0aW5nIHdpdGggdGhlIENhbnZhcyBlbGVtZW50LiBPdGhlcndpc2UsIGZvciBzb21lIHJlYXNvbiwgaXQgd2lsbCByZWJpbmQgc3RhcnRpbmcgd2l0aCB0aGUgZmlyc3QgY2hpbGQgb2YgQ2FudmFzLlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gWW91IGNhbiBzZWUgdGhpcyBoYXBwZW5pbmcgd2hlbiBzZXR0aW5nIGEgYnJlYWtwb2ludCBpbiBTY29wZUNvbmZpZ3VyYXRvciB3aGVyZSBjb250YWluZXJzIGFyZSBpbml0aWFsaXplZCB3aXRoIGRyYWcgJiBkcm9wOiBvbiBwYWdlIGxvYWQsIHRoZSBmaXJzdCBlbGVtZW50XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBpcyBhIENhbnZhcyAoZ29vZCksIGJ1dCBhZnRlciBoYXZpbmcgc2VsZWN0ZWQgYW5vdGhlciB0ZW1wbGF0ZSwgdGhlIGZpcnN0IGVsZW1lbnQgaXMgKHR5cGljYWxseSkgYSBHcmlkIChiYWQpLlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2ltcGx5IHJlY29tcGlsaW5nIHRoZSBvcmMtbGF5b3V0LWVkaXRvciBkaXJlY3RpdmUgd2lsbCBjYXVzZSB0aGUgZW50aXJlIHRoaW5nIHRvIGJlIGdlbmVyYXRlZCwgd2hpY2ggd29ya3MganVzdCBmaW5lIGFzIHdlbGwgKGV2ZW4gdGhvdWdoIG5vdCBpcyBuaWNlIGFzIHNpbXBseSBsZXZlcmFnaW5nIG1vZGVsIGJpbmRpbmcpLlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGF5b3V0RGVzaWduZXJIb3N0LmVkaXRvciA9IHdpbmRvdy5sYXlvdXRFZGl0b3IgPSBuZXcgTGF5b3V0RWRpdG9yLkVkaXRvcihlZGl0b3IuY29uZmlnLCBjYW52YXNEYXRhKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciB0ZW1wbGF0ZSA9IFwiPG9yYy1sYXlvdXQtZWRpdG9yXCIgKyBcIiBtb2RlbD0nd2luZG93LmxheW91dEVkaXRvcicgLz5cIjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBodG1sID0gJGNvbXBpbGUodGVtcGxhdGUpKCRzY29wZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKFwiLmxheW91dC1lZGl0b3ItaG9sZGVyXCIpLmh0bWwoaHRtbCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLiRyb290LmVkaXRFbGVtZW50ID0gZnVuY3Rpb24gKGVsZW1lbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBob3N0ID0gJHNjb3BlLiRyb290LmxheW91dERlc2lnbmVySG9zdDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBob3N0LmVkaXRFbGVtZW50KGVsZW1lbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLiRyb290LmFkZEVsZW1lbnQgPSBmdW5jdGlvbiAoY29udGVudFR5cGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBob3N0ID0gJHNjb3BlLiRyb290LmxheW91dERlc2lnbmVySG9zdDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBob3N0LmFkZEVsZW1lbnQoY29udGVudFR5cGUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgJChkb2N1bWVudCkub24oXCJjdXQgY29weSBwYXN0ZVwiLCBmdW5jdGlvbiAoZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gSWYgdGhlIHBzZXVkbyBjbGlwYm9hcmQgd2FzIGFscmVhZHkgaW52b2tlZCAod2hpY2ggaGFwcGVucyBvbiB0aGUgZmlyc3QgY2xpcGJvYXJkXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBvcGVyYXRpb24gYWZ0ZXIgcGFnZSBsb2FkIGV2ZW4gaWYgbmF0aXZlIGNsaXBib2FyZCBzdXBwb3J0IGV4aXN0cykgdGhlbiBzaXQgdGhpc1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gb25lIG9wZXJhdGlvbiBvdXQsIGJ1dCBtYWtlIHN1cmUgd2hhdGV2ZXIgaXMgb24gdGhlIHBzZXVkbyBjbGlwYm9hcmQgZ2V0cyBtaWdyYXRlZFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gdG8gdGhlIG5hdGl2ZSBjbGlwYm9hcmQgZm9yIHN1YnNlcXVlbnQgb3BlcmF0aW9ucy5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjbGlwYm9hcmQud2FzSW52b2tlZCgpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZS5vcmlnaW5hbEV2ZW50LmNsaXBib2FyZERhdGEuc2V0RGF0YShcInRleHQvcGxhaW5cIiwgY2xpcGJvYXJkLmdldERhdGEoXCJ0ZXh0L3BsYWluXCIpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlLm9yaWdpbmFsRXZlbnQuY2xpcGJvYXJkRGF0YS5zZXREYXRhKFwidGV4dC9qc29uXCIsIGNsaXBib2FyZC5nZXREYXRhKFwidGV4dC9qc29uXCIpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgZm9jdXNlZEVsZW1lbnQgPSAkc2NvcGUuZWxlbWVudC5mb2N1c2VkRWxlbWVudDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoISFmb2N1c2VkRWxlbWVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuJGFwcGx5KGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN3aXRjaCAoZS50eXBlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBcImNvcHlcIjpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9jdXNlZEVsZW1lbnQuY29weShlLm9yaWdpbmFsRXZlbnQuY2xpcGJvYXJkRGF0YSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgXCJjdXRcIjpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9jdXNlZEVsZW1lbnQuY3V0KGUub3JpZ2luYWxFdmVudC5jbGlwYm9hcmREYXRhKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBcInBhc3RlXCI6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvY3VzZWRFbGVtZW50LnBhc3RlKGUub3JpZ2luYWxFdmVudC5jbGlwYm9hcmREYXRhKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gSEFDSzogV29ya2Fyb3VuZCBiZWNhdXNlIG9mIGhvdyBBbmd1bGFyIHRyZWF0cyB0aGUgRE9NIHdoZW4gZWxlbWVudHMgYXJlIHNoaWZ0ZWQgYXJvdW5kIC0gaW5wdXQgZm9jdXMgaXMgc29tZXRpbWVzIGxvc3QuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdpbmRvdy5zZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS4kYXBwbHkoZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghISRzY29wZS5lbGVtZW50LmZvY3VzZWRFbGVtZW50KVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuZWxlbWVudC5mb2N1c2VkRWxlbWVudC5zZXRJc0ZvY3VzZWQoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LCAxMDApO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBOYXRpdmUgY2xpcGJvYXJkIHN1cHBvcnQgb2J2aW91c2x5IGV4aXN0cywgc28gZGlzYWJsZSB0aGUgcGV1ZG8gY2xpcGJvYXJkIGZyb20gbm93IG9uLlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xpcGJvYXJkLmRpc2FibGUoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgXSxcclxuICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiBlbnZpcm9ubWVudC50ZW1wbGF0ZVVybChcIkVkaXRvclwiKSxcclxuICAgICAgICAgICAgICAgIHJlcGxhY2U6IHRydWUsXHJcbiAgICAgICAgICAgICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUsIGVsZW1lbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyBObyBjbGlja3Mgc2hvdWxkIHByb3BhZ2F0ZSBmcm9tIHRoZSBUaW55TUNFIHRvb2xiYXJzLlxyXG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuZmluZChcIi5sYXlvdXQtdG9vbGJhci1jb250YWluZXJcIikuY2xpY2soZnVuY3Rpb24gKGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAvLyBVbmZvY3VzIGFuZCB1bnNlbGVjdCBldmVyeXRoaW5nIG9uIGNsaWNrIG91dHNpZGUgb2YgY2FudmFzLlxyXG4gICAgICAgICAgICAgICAgICAgICQod2luZG93KS5jbGljayhmdW5jdGlvbiAoZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzY29wZS4kYXBwbHkoZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGUuZWxlbWVudC5hY3RpdmVFbGVtZW50ID0gbnVsbDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLmVsZW1lbnQuZm9jdXNlZEVsZW1lbnQgPSBudWxsO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9XHJcbiAgICBdKTsiLCJhbmd1bGFyXHJcbiAgICAubW9kdWxlKFwiTGF5b3V0RWRpdG9yXCIpXHJcbiAgICAuZGlyZWN0aXZlKFwib3JjTGF5b3V0Q2FudmFzXCIsIFtcInNjb3BlQ29uZmlndXJhdG9yXCIsIFwiZW52aXJvbm1lbnRcIixcclxuICAgICAgICBmdW5jdGlvbiAoc2NvcGVDb25maWd1cmF0b3IsIGVudmlyb25tZW50KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICByZXN0cmljdDogXCJFXCIsXHJcbiAgICAgICAgICAgICAgICBzY29wZTogeyBlbGVtZW50OiBcIj1cIiB9LFxyXG4gICAgICAgICAgICAgICAgY29udHJvbGxlcjogW1wiJHNjb3BlXCIsIFwiJGVsZW1lbnRcIiwgXCIkYXR0cnNcIixcclxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiAoJHNjb3BlLCAkZWxlbWVudCwgJGF0dHJzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlQ29uZmlndXJhdG9yLmNvbmZpZ3VyZUZvckVsZW1lbnQoJHNjb3BlLCAkZWxlbWVudCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlQ29uZmlndXJhdG9yLmNvbmZpZ3VyZUZvckNvbnRhaW5lcigkc2NvcGUsICRlbGVtZW50KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnNvcnRhYmxlT3B0aW9uc1tcImF4aXNcIl0gPSBcInlcIjtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBdLFxyXG4gICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6IGVudmlyb25tZW50LnRlbXBsYXRlVXJsKFwiQ2FudmFzXCIpLFxyXG4gICAgICAgICAgICAgICAgcmVwbGFjZTogdHJ1ZVxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH1cclxuICAgIF0pOyIsImFuZ3VsYXJcclxuICAgIC5tb2R1bGUoXCJMYXlvdXRFZGl0b3JcIilcclxuICAgIC5kaXJlY3RpdmUoXCJvcmNMYXlvdXRDaGlsZFwiLCBbXCIkY29tcGlsZVwiLFxyXG4gICAgICAgIGZ1bmN0aW9uICgkY29tcGlsZSkge1xyXG4gICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgcmVzdHJpY3Q6IFwiRVwiLFxyXG4gICAgICAgICAgICAgICAgc2NvcGU6IHsgZWxlbWVudDogXCI9XCIgfSxcclxuICAgICAgICAgICAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSwgZWxlbWVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciB0ZW1wbGF0ZSA9IFwiPG9yYy1sYXlvdXQtXCIgKyBzY29wZS5lbGVtZW50LnR5cGUudG9Mb3dlckNhc2UoKSArIFwiIGVsZW1lbnQ9J2VsZW1lbnQnIC8+XCI7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIGh0bWwgPSAkY29tcGlsZSh0ZW1wbGF0ZSkoc2NvcGUpO1xyXG4gICAgICAgICAgICAgICAgICAgICQoZWxlbWVudCkucmVwbGFjZVdpdGgoaHRtbCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfVxyXG4gICAgXSk7IiwiYW5ndWxhclxyXG4gICAgLm1vZHVsZShcIkxheW91dEVkaXRvclwiKVxyXG4gICAgLmRpcmVjdGl2ZShcIm9yY0xheW91dENvbHVtblwiLCBbXCIkY29tcGlsZVwiLCBcInNjb3BlQ29uZmlndXJhdG9yXCIsIFwiZW52aXJvbm1lbnRcIixcclxuICAgICAgICBmdW5jdGlvbiAoJGNvbXBpbGUsIHNjb3BlQ29uZmlndXJhdG9yLCBlbnZpcm9ubWVudCkge1xyXG4gICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgcmVzdHJpY3Q6IFwiRVwiLFxyXG4gICAgICAgICAgICAgICAgc2NvcGU6IHsgZWxlbWVudDogXCI9XCIgfSxcclxuICAgICAgICAgICAgICAgIGNvbnRyb2xsZXI6IFtcIiRzY29wZVwiLCBcIiRlbGVtZW50XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gKCRzY29wZSwgJGVsZW1lbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGVDb25maWd1cmF0b3IuY29uZmlndXJlRm9yRWxlbWVudCgkc2NvcGUsICRlbGVtZW50KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGVDb25maWd1cmF0b3IuY29uZmlndXJlRm9yQ29udGFpbmVyKCRzY29wZSwgJGVsZW1lbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuc29ydGFibGVPcHRpb25zW1wiYXhpc1wiXSA9IFwieVwiO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIF0sXHJcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogZW52aXJvbm1lbnQudGVtcGxhdGVVcmwoXCJDb2x1bW5cIiksXHJcbiAgICAgICAgICAgICAgICByZXBsYWNlOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlLCBlbGVtZW50LCBhdHRycykge1xyXG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuZmluZChcIi5sYXlvdXQtY29sdW1uLXJlc2l6ZS1iYXJcIikuZHJhZ2dhYmxlKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYXhpczogXCJ4XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGhlbHBlcjogXCJjbG9uZVwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXZlcnQ6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0OiBmdW5jdGlvbiAoZSwgdWkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLiRhcHBseShmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGUuZWxlbWVudC5lZGl0b3IuaXNSZXNpemluZyA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZHJhZzogZnVuY3Rpb24gKGUsIHVpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgY29sdW1uRWxlbWVudCA9IGVsZW1lbnQucGFyZW50KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgY29sdW1uU2l6ZSA9IGNvbHVtbkVsZW1lbnQud2lkdGgoKSAvIHNjb3BlLmVsZW1lbnQud2lkdGg7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgY29ubmVjdEFkamFjZW50ID0gIWUuY3RybEtleTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICgkKGUudGFyZ2V0KS5oYXNDbGFzcyhcImxheW91dC1jb2x1bW4tcmVzaXplLWJhci1sZWZ0XCIpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGRlbHRhID0gdWkub2Zmc2V0LmxlZnQgLSBjb2x1bW5FbGVtZW50Lm9mZnNldCgpLmxlZnQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRlbHRhIDwgLWNvbHVtblNpemUgJiYgc2NvcGUuZWxlbWVudC5jYW5FeHBhbmRMZWZ0KGNvbm5lY3RBZGphY2VudCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGUuJGFwcGx5KGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLmVsZW1lbnQuZXhwYW5kTGVmdChjb25uZWN0QWRqYWNlbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiAoZGVsdGEgPiBjb2x1bW5TaXplICYmIHNjb3BlLmVsZW1lbnQuY2FuQ29udHJhY3RMZWZ0KGNvbm5lY3RBZGphY2VudCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGUuJGFwcGx5KGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLmVsZW1lbnQuY29udHJhY3RMZWZ0KGNvbm5lY3RBZGphY2VudCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKCQoZS50YXJnZXQpLmhhc0NsYXNzKFwibGF5b3V0LWNvbHVtbi1yZXNpemUtYmFyLXJpZ2h0XCIpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGRlbHRhID0gdWkub2Zmc2V0LmxlZnQgLSBjb2x1bW5FbGVtZW50LndpZHRoKCkgLSBjb2x1bW5FbGVtZW50Lm9mZnNldCgpLmxlZnQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRlbHRhID4gY29sdW1uU2l6ZSAmJiBzY29wZS5lbGVtZW50LmNhbkV4cGFuZFJpZ2h0KGNvbm5lY3RBZGphY2VudCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGUuJGFwcGx5KGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLmVsZW1lbnQuZXhwYW5kUmlnaHQoY29ubmVjdEFkamFjZW50KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKGRlbHRhIDwgLWNvbHVtblNpemUgJiYgc2NvcGUuZWxlbWVudC5jYW5Db250cmFjdFJpZ2h0KGNvbm5lY3RBZGphY2VudCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGUuJGFwcGx5KGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLmVsZW1lbnQuY29udHJhY3RSaWdodChjb25uZWN0QWRqYWNlbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdG9wOiBmdW5jdGlvbiAoZSwgdWkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLiRhcHBseShmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLmVsZW1lbnQuZWRpdG9yLmlzUmVzaXppbmcgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfVxyXG4gICAgXSk7IiwiYW5ndWxhclxyXG4gICAgLm1vZHVsZShcIkxheW91dEVkaXRvclwiKVxyXG4gICAgLmRpcmVjdGl2ZShcIm9yY0xheW91dENvbnRlbnRcIiwgW1wiJHNjZVwiLCBcInNjb3BlQ29uZmlndXJhdG9yXCIsIFwiZW52aXJvbm1lbnRcIixcclxuICAgICAgICBmdW5jdGlvbiAoJHNjZSwgc2NvcGVDb25maWd1cmF0b3IsIGVudmlyb25tZW50KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICByZXN0cmljdDogXCJFXCIsXHJcbiAgICAgICAgICAgICAgICBzY29wZTogeyBlbGVtZW50OiBcIj1cIiB9LFxyXG4gICAgICAgICAgICAgICAgY29udHJvbGxlcjogW1wiJHNjb3BlXCIsIFwiJGVsZW1lbnRcIixcclxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiAoJHNjb3BlLCAkZWxlbWVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzY29wZUNvbmZpZ3VyYXRvci5jb25maWd1cmVGb3JFbGVtZW50KCRzY29wZSwgJGVsZW1lbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuZWRpdCA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS4kcm9vdC5lZGl0RWxlbWVudCgkc2NvcGUuZWxlbWVudCkudGhlbihmdW5jdGlvbiAoYXJncykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS4kYXBwbHkoZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoYXJncy5jYW5jZWwpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuZWxlbWVudC5kYXRhID0gYXJncy5lbGVtZW50LmRhdGE7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5lbGVtZW50LnNldEh0bWwoYXJncy5lbGVtZW50Lmh0bWwpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBPdmVyd3JpdGUgdGhlIHNldEh0bWwgZnVuY3Rpb24gc28gdGhhdCB3ZSBjYW4gdXNlIHRoZSAkc2NlIHNlcnZpY2UgdG8gdHJ1c3QgdGhlIGh0bWwgKGFuZCBub3QgaGF2ZSB0aGUgaHRtbCBiaW5kaW5nIHN0cmlwIGNlcnRhaW4gdGFncykuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5lbGVtZW50LnNldEh0bWwgPSBmdW5jdGlvbiAoaHRtbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmVsZW1lbnQuaHRtbCA9IGh0bWw7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuZWxlbWVudC5odG1sVW5zYWZlID0gJHNjZS50cnVzdEFzSHRtbChodG1sKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5lbGVtZW50LnNldEh0bWwoJHNjb3BlLmVsZW1lbnQuaHRtbCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgXSxcclxuICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiBlbnZpcm9ubWVudC50ZW1wbGF0ZVVybChcIkNvbnRlbnRcIiksXHJcbiAgICAgICAgICAgICAgICByZXBsYWNlOiB0cnVlXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfVxyXG4gICAgXSk7IiwiYW5ndWxhclxyXG4gICAgLm1vZHVsZShcIkxheW91dEVkaXRvclwiKVxyXG4gICAgLmRpcmVjdGl2ZShcIm9yY0xheW91dEh0bWxcIiwgW1wiJHNjZVwiLCBcInNjb3BlQ29uZmlndXJhdG9yXCIsIFwiZW52aXJvbm1lbnRcIixcclxuICAgICAgICBmdW5jdGlvbiAoJHNjZSwgc2NvcGVDb25maWd1cmF0b3IsIGVudmlyb25tZW50KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICByZXN0cmljdDogXCJFXCIsXHJcbiAgICAgICAgICAgICAgICBzY29wZTogeyBlbGVtZW50OiBcIj1cIiB9LFxyXG4gICAgICAgICAgICAgICAgY29udHJvbGxlcjogW1wiJHNjb3BlXCIsIFwiJGVsZW1lbnRcIixcclxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiAoJHNjb3BlLCAkZWxlbWVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzY29wZUNvbmZpZ3VyYXRvci5jb25maWd1cmVGb3JFbGVtZW50KCRzY29wZSwgJGVsZW1lbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuZWRpdCA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS4kcm9vdC5lZGl0RWxlbWVudCgkc2NvcGUuZWxlbWVudCkudGhlbihmdW5jdGlvbiAoYXJncykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS4kYXBwbHkoZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoYXJncy5jYW5jZWwpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuZWxlbWVudC5kYXRhID0gYXJncy5lbGVtZW50LmRhdGE7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5lbGVtZW50LnNldEh0bWwoYXJncy5lbGVtZW50Lmh0bWwpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS51cGRhdGVDb250ZW50ID0gZnVuY3Rpb24gKGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5lbGVtZW50LnNldEh0bWwoZS50YXJnZXQuaW5uZXJIVE1MKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIE92ZXJ3cml0ZSB0aGUgc2V0SHRtbCBmdW5jdGlvbiBzbyB0aGF0IHdlIGNhbiB1c2UgdGhlICRzY2Ugc2VydmljZSB0byB0cnVzdCB0aGUgaHRtbCAoYW5kIG5vdCBoYXZlIHRoZSBodG1sIGJpbmRpbmcgc3RyaXAgY2VydGFpbiB0YWdzKS5cclxuICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmVsZW1lbnQuc2V0SHRtbCA9IGZ1bmN0aW9uIChodG1sKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuZWxlbWVudC5odG1sID0gaHRtbDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5lbGVtZW50Lmh0bWxVbnNhZmUgPSAkc2NlLnRydXN0QXNIdG1sKGh0bWwpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmVsZW1lbnQuc2V0SHRtbCgkc2NvcGUuZWxlbWVudC5odG1sKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBdLFxyXG4gICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6IGVudmlyb25tZW50LnRlbXBsYXRlVXJsKFwiSHRtbFwiKSxcclxuICAgICAgICAgICAgICAgIHJlcGxhY2U6IHRydWUsXHJcbiAgICAgICAgICAgICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUsIGVsZW1lbnQpIHtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9XHJcbiAgICBdKTsiLCJhbmd1bGFyXHJcbiAgICAubW9kdWxlKFwiTGF5b3V0RWRpdG9yXCIpXHJcbiAgICAuZGlyZWN0aXZlKFwib3JjTGF5b3V0R3JpZFwiLCBbXCIkY29tcGlsZVwiLCBcInNjb3BlQ29uZmlndXJhdG9yXCIsIFwiZW52aXJvbm1lbnRcIixcclxuICAgICAgICBmdW5jdGlvbiAoJGNvbXBpbGUsIHNjb3BlQ29uZmlndXJhdG9yLCBlbnZpcm9ubWVudCkge1xyXG4gICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgcmVzdHJpY3Q6IFwiRVwiLFxyXG4gICAgICAgICAgICAgICAgc2NvcGU6IHsgZWxlbWVudDogXCI9XCIgfSxcclxuICAgICAgICAgICAgICAgIGNvbnRyb2xsZXI6IFtcIiRzY29wZVwiLCBcIiRlbGVtZW50XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gKCRzY29wZSwgJGVsZW1lbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGVDb25maWd1cmF0b3IuY29uZmlndXJlRm9yRWxlbWVudCgkc2NvcGUsICRlbGVtZW50KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGVDb25maWd1cmF0b3IuY29uZmlndXJlRm9yQ29udGFpbmVyKCRzY29wZSwgJGVsZW1lbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuc29ydGFibGVPcHRpb25zW1wiYXhpc1wiXSA9IFwieVwiO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIF0sXHJcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogZW52aXJvbm1lbnQudGVtcGxhdGVVcmwoXCJHcmlkXCIpLFxyXG4gICAgICAgICAgICAgICAgcmVwbGFjZTogdHJ1ZVxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH1cclxuICAgIF0pOyIsImFuZ3VsYXJcclxuICAgIC5tb2R1bGUoXCJMYXlvdXRFZGl0b3JcIilcclxuICAgIC5kaXJlY3RpdmUoXCJvcmNMYXlvdXRSb3dcIiwgW1wiJGNvbXBpbGVcIiwgXCJzY29wZUNvbmZpZ3VyYXRvclwiLCBcImVudmlyb25tZW50XCIsXHJcbiAgICAgICAgZnVuY3Rpb24gKCRjb21waWxlLCBzY29wZUNvbmZpZ3VyYXRvciwgZW52aXJvbm1lbnQpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgIHJlc3RyaWN0OiBcIkVcIixcclxuICAgICAgICAgICAgICAgIHNjb3BlOiB7IGVsZW1lbnQ6IFwiPVwiIH0sXHJcbiAgICAgICAgICAgICAgICBjb250cm9sbGVyOiBbXCIkc2NvcGVcIiwgXCIkZWxlbWVudFwiLFxyXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uICgkc2NvcGUsICRlbGVtZW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlQ29uZmlndXJhdG9yLmNvbmZpZ3VyZUZvckVsZW1lbnQoJHNjb3BlLCAkZWxlbWVudCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlQ29uZmlndXJhdG9yLmNvbmZpZ3VyZUZvckNvbnRhaW5lcigkc2NvcGUsICRlbGVtZW50KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnNvcnRhYmxlT3B0aW9uc1tcImF4aXNcIl0gPSBcInhcIjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnNvcnRhYmxlT3B0aW9uc1tcInVpLWZsb2F0aW5nXCJdID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBdLFxyXG4gICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6IGVudmlyb25tZW50LnRlbXBsYXRlVXJsKFwiUm93XCIpLFxyXG4gICAgICAgICAgICAgICAgcmVwbGFjZTogdHJ1ZVxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH1cclxuICAgIF0pOyIsImFuZ3VsYXJcclxuICAgIC5tb2R1bGUoXCJMYXlvdXRFZGl0b3JcIilcclxuICAgIC5kaXJlY3RpdmUoXCJvcmNMYXlvdXRQb3B1cFwiLCBbXHJcbiAgICAgICAgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgcmVzdHJpY3Q6IFwiQVwiLFxyXG4gICAgICAgICAgICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlLCBlbGVtZW50LCBhdHRycykge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBwb3B1cCA9ICQoZWxlbWVudCk7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIHRyaWdnZXIgPSBwb3B1cC5jbG9zZXN0KFwiLmxheW91dC1wb3B1cC10cmlnZ2VyXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBwYXJlbnRFbGVtZW50ID0gcG9wdXAuY2xvc2VzdChcIi5sYXlvdXQtZWxlbWVudFwiKTtcclxuICAgICAgICAgICAgICAgICAgICB0cmlnZ2VyLmNsaWNrKGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcG9wdXAudG9nZ2xlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwb3B1cC5pcyhcIjp2aXNpYmxlXCIpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwb3B1cC5wb3NpdGlvbih7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbXk6IGF0dHJzLm9yY0xheW91dFBvcHVwTXkgfHwgXCJsZWZ0IHRvcFwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF0OiBhdHRycy5vcmNMYXlvdXRQb3B1cEF0IHx8IFwibGVmdCBib3R0b20rNHB4XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb2Y6IHRyaWdnZXJcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcG9wdXAuZmluZChcImlucHV0XCIpLmZpcnN0KCkuZm9jdXMoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIHBvcHVwLmNsaWNrKGZ1bmN0aW9uIChlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgcGFyZW50RWxlbWVudC5jbGljayhmdW5jdGlvbiAoZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBwb3B1cC5oaWRlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgcG9wdXAua2V5ZG93bihmdW5jdGlvbiAoZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWUuY3RybEtleSAmJiAhZS5zaGlmdEtleSAmJiAhZS5hbHRLZXkgJiYgZS53aGljaCA9PSAyNykgLy8gRXNjXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwb3B1cC5oaWRlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgcG9wdXAub24oXCJjdXQgY29weSBwYXN0ZVwiLCBmdW5jdGlvbiAoZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBBbGxvdyBjbGlwYm9hcmQgb3BlcmF0aW9ucyBpbiBwb3B1cCB3aXRob3V0IGludm9raW5nIGNsaXBib2FyZCBldmVudCBoYW5kbGVycyBvbiBwYXJlbnQgZWxlbWVudC5cclxuICAgICAgICAgICAgICAgICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9XHJcbiAgICBdKTsiLCJhbmd1bGFyXHJcbiAgICAubW9kdWxlKFwiTGF5b3V0RWRpdG9yXCIpXHJcbiAgICAuZGlyZWN0aXZlKFwib3JjTGF5b3V0VG9vbGJveFwiLCBbXCIkY29tcGlsZVwiLCBcImVudmlyb25tZW50XCIsXHJcbiAgICAgICAgZnVuY3Rpb24gKCRjb21waWxlLCBlbnZpcm9ubWVudCkge1xyXG4gICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgcmVzdHJpY3Q6IFwiRVwiLFxyXG4gICAgICAgICAgICAgICAgY29udHJvbGxlcjogW1wiJHNjb3BlXCIsIFwiJGVsZW1lbnRcIixcclxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiAoJHNjb3BlLCAkZWxlbWVudCkge1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnJlc2V0RWxlbWVudHMgPSBmdW5jdGlvbiAoKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmdyaWRFbGVtZW50cyA9IFtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBMYXlvdXRFZGl0b3IuR3JpZC5mcm9tKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdG9vbGJveEljb246IFwiXFx1ZjAwYVwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0b29sYm94TGFiZWw6IFwiR3JpZFwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0b29sYm94RGVzY3JpcHRpb246IFwiRW1wdHkgZ3JpZC5cIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hpbGRyZW46IFtdXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF07XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnJvd0VsZW1lbnRzID0gW1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIExheW91dEVkaXRvci5Sb3cuZnJvbSh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRvb2xib3hJY29uOiBcIlxcdWYwYzlcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdG9vbGJveExhYmVsOiBcIlJvdyAoMSBjb2x1bW4pXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRvb2xib3hEZXNjcmlwdGlvbjogXCJSb3cgd2l0aCAxIGNvbHVtbi5cIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hpbGRyZW46IExheW91dEVkaXRvci5Db2x1bW4udGltZXMoMSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBMYXlvdXRFZGl0b3IuUm93LmZyb20oe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0b29sYm94SWNvbjogXCJcXHVmMGM5XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRvb2xib3hMYWJlbDogXCJSb3cgKDIgY29sdW1ucylcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdG9vbGJveERlc2NyaXB0aW9uOiBcIlJvdyB3aXRoIDIgY29sdW1ucy5cIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hpbGRyZW46IExheW91dEVkaXRvci5Db2x1bW4udGltZXMoMilcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBMYXlvdXRFZGl0b3IuUm93LmZyb20oe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0b29sYm94SWNvbjogXCJcXHVmMGM5XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRvb2xib3hMYWJlbDogXCJSb3cgKDMgY29sdW1ucylcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdG9vbGJveERlc2NyaXB0aW9uOiBcIlJvdyB3aXRoIDMgY29sdW1ucy5cIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hpbGRyZW46IExheW91dEVkaXRvci5Db2x1bW4udGltZXMoMylcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBMYXlvdXRFZGl0b3IuUm93LmZyb20oe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0b29sYm94SWNvbjogXCJcXHVmMGM5XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRvb2xib3hMYWJlbDogXCJSb3cgKDQgY29sdW1ucylcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdG9vbGJveERlc2NyaXB0aW9uOiBcIlJvdyB3aXRoIDQgY29sdW1ucy5cIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hpbGRyZW46IExheW91dEVkaXRvci5Db2x1bW4udGltZXMoNClcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBMYXlvdXRFZGl0b3IuUm93LmZyb20oe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0b29sYm94SWNvbjogXCJcXHVmMGM5XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRvb2xib3hMYWJlbDogXCJSb3cgKDYgY29sdW1ucylcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdG9vbGJveERlc2NyaXB0aW9uOiBcIlJvdyB3aXRoIDYgY29sdW1ucy5cIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hpbGRyZW46IExheW91dEVkaXRvci5Db2x1bW4udGltZXMoNilcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBMYXlvdXRFZGl0b3IuUm93LmZyb20oe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0b29sYm94SWNvbjogXCJcXHVmMGM5XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRvb2xib3hMYWJlbDogXCJSb3cgKDEyIGNvbHVtbnMpXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRvb2xib3hEZXNjcmlwdGlvbjogXCJSb3cgd2l0aCAxMiBjb2x1bW5zLlwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjaGlsZHJlbjogTGF5b3V0RWRpdG9yLkNvbHVtbi50aW1lcygxMilcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KSwgTGF5b3V0RWRpdG9yLlJvdy5mcm9tKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdG9vbGJveEljb246IFwiXFx1ZjBjOVwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0b29sYm94TGFiZWw6IFwiUm93IChlbXB0eSlcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdG9vbGJveERlc2NyaXB0aW9uOiBcIkVtcHR5IHJvdy5cIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hpbGRyZW46IFtdXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF07XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmNvbHVtbkVsZW1lbnRzID0gW1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIExheW91dEVkaXRvci5Db2x1bW4uZnJvbSh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRvb2xib3hJY29uOiBcIlxcdWYwZGJcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdG9vbGJveExhYmVsOiBcIkNvbHVtblwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0b29sYm94RGVzY3JpcHRpb246IFwiRW1wdHkgY29sdW1uLlwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aWR0aDogMSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb2Zmc2V0OiAwLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjaGlsZHJlbjogW11cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuY2FudmFzRWxlbWVudHMgPSBbXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgTGF5b3V0RWRpdG9yLkNhbnZhcy5mcm9tKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdG9vbGJveEljb246IFwiXFx1ZjA0NFwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0b29sYm94TGFiZWw6IFwiQ2FudmFzXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRvb2xib3hEZXNjcmlwdGlvbjogXCJFbXB0eSBjYW52YXMuXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNoaWxkcmVuOiBbXVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBdO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5jb250ZW50RWxlbWVudENhdGVnb3JpZXMgPSBfKCRzY29wZS5lbGVtZW50LmNvbmZpZy5jYXRlZ29yaWVzKS5tYXAoZnVuY3Rpb24gKGNhdGVnb3J5KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogY2F0ZWdvcnkubmFtZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudHM6IF8oY2F0ZWdvcnkuY29udGVudFR5cGVzKS5tYXAoZnVuY3Rpb24gKGNvbnRlbnRUeXBlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgdHlwZSA9IGNvbnRlbnRUeXBlLnR5cGU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgZmFjdG9yeSA9IExheW91dEVkaXRvci5mYWN0b3JpZXNbdHlwZV0gfHwgTGF5b3V0RWRpdG9yLmZhY3Rvcmllc1tcIkNvbnRlbnRcIl07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgaXRlbSA9IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpc1RlbXBsYXRlZDogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGVudFR5cGU6IGNvbnRlbnRUeXBlLmlkLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRlbnRUeXBlTGFiZWw6IGNvbnRlbnRUeXBlLmxhYmVsLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRlbnRUeXBlQ2xhc3M6IGNvbnRlbnRUeXBlLnR5cGVDbGFzcyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhOiBudWxsLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhhc0VkaXRvcjogY29udGVudFR5cGUuaGFzRWRpdG9yLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGh0bWw6IGNvbnRlbnRUeXBlLmh0bWxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgZWxlbWVudCA9IGZhY3RvcnkoaXRlbSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50LnRvb2xib3hJY29uID0gY29udGVudFR5cGUuaWNvbiB8fCBcIlxcdWYxYzlcIjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQudG9vbGJveExhYmVsID0gY29udGVudFR5cGUubGFiZWw7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50LnRvb2xib3hEZXNjcmlwdGlvbiA9IGNvbnRlbnRUeXBlLmRlc2NyaXB0aW9uO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGVsZW1lbnQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5yZXNldEVsZW1lbnRzKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuZ2V0U29ydGFibGVPcHRpb25zID0gZnVuY3Rpb24gKHR5cGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBlZGl0b3JJZCA9ICRlbGVtZW50LmNsb3Nlc3QoXCIubGF5b3V0LWVkaXRvclwiKS5hdHRyKFwiaWRcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgcGFyZW50Q2xhc3NlcztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBwbGFjZWhvbGRlckNsYXNzZXM7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgZmxvYXRpbmcgPSBmYWxzZTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggKHR5cGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFwiR3JpZFwiOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJlbnRDbGFzc2VzID0gW1wiLmxheW91dC1jYW52YXNcIiwgXCIubGF5b3V0LWNvbHVtblwiLCBcIi5sYXlvdXQtY29tbW9uLWhvbGRlclwiXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGxhY2Vob2xkZXJDbGFzc2VzID0gXCJsYXlvdXQtZWxlbWVudCBsYXlvdXQtY29udGFpbmVyIGxheW91dC1ncmlkIHVpLXNvcnRhYmxlLXBsYWNlaG9sZGVyXCI7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgXCJSb3dcIjpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyZW50Q2xhc3NlcyA9IFtcIi5sYXlvdXQtZ3JpZFwiXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGxhY2Vob2xkZXJDbGFzc2VzID0gXCJsYXlvdXQtZWxlbWVudCBsYXlvdXQtY29udGFpbmVyIGxheW91dC1yb3cgcm93IHVpLXNvcnRhYmxlLXBsYWNlaG9sZGVyXCI7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgXCJDb2x1bW5cIjpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyZW50Q2xhc3NlcyA9IFtcIi5sYXlvdXQtcm93Om5vdCgubGF5b3V0LXJvdy1mdWxsKVwiXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGxhY2Vob2xkZXJDbGFzc2VzID0gXCJsYXlvdXQtZWxlbWVudCBsYXlvdXQtY29udGFpbmVyIGxheW91dC1jb2x1bW4gdWktc29ydGFibGUtcGxhY2Vob2xkZXJcIjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmxvYXRpbmcgPSB0cnVlOyAvLyBUbyBlbnN1cmUgYSBzbW9vdGggaG9yaXpvbnRhbC1saXN0IHJlb3JkZXJpbmcuIGh0dHBzOi8vZ2l0aHViLmNvbS9hbmd1bGFyLXVpL3VpLXNvcnRhYmxlI2Zsb2F0aW5nXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgXCJDb250ZW50XCI6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcmVudENsYXNzZXMgPSBbXCIubGF5b3V0LWNhbnZhc1wiLCBcIi5sYXlvdXQtY29sdW1uXCIsIFwiLmxheW91dC1jb21tb24taG9sZGVyXCJdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwbGFjZWhvbGRlckNsYXNzZXMgPSBcImxheW91dC1lbGVtZW50IGxheW91dC1jb250ZW50IHVpLXNvcnRhYmxlLXBsYWNlaG9sZGVyXCI7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgXCJDYW52YXNcIjpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyZW50Q2xhc3NlcyA9IFtcIi5sYXlvdXQtY2FudmFzXCIsIFwiLmxheW91dC1jb2x1bW5cIiwgXCIubGF5b3V0LWNvbW1vbi1ob2xkZXJcIl07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBsYWNlaG9sZGVyQ2xhc3NlcyA9IFwibGF5b3V0LWVsZW1lbnQgbGF5b3V0LWNvbnRhaW5lciBsYXlvdXQtZ3JpZCB1aS1zb3J0YWJsZS1wbGFjZWhvbGRlclwiO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN1cnNvcjogXCJtb3ZlXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29ubmVjdFdpdGg6IF8ocGFyZW50Q2xhc3NlcykubWFwKGZ1bmN0aW9uIChlKSB7IHJldHVybiBcIiNcIiArIGVkaXRvcklkICsgXCIgXCIgKyBlICsgXCI6bm90KC5sYXlvdXQtY29udGFpbmVyLXNlYWxlZCkgPiAubGF5b3V0LWVsZW1lbnQtd3JhcHBlciA+IC5sYXlvdXQtY2hpbGRyZW5cIjsgfSkuam9pbihcIiwgXCIpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBsYWNlaG9sZGVyOiBwbGFjZWhvbGRlckNsYXNzZXMsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJ1aS1mbG9hdGluZ1wiOiBmbG9hdGluZyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjcmVhdGU6IGZ1bmN0aW9uIChlLCB1aSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlLnRhcmdldC5pc1Rvb2xib3ggPSB0cnVlOyAvLyBXaWxsIGluZGljYXRlIHRvIGNvbm5lY3RlZCBzb3J0YWJsZXMgdGhhdCBkcm9wcGVkIGl0ZW1zIHdlcmUgc2VudCBmcm9tIHRvb2xib3guXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGFydDogZnVuY3Rpb24gKGUsIHVpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS4kYXBwbHkoZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmVsZW1lbnQuaXNEcmFnZ2luZyA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RvcDogZnVuY3Rpb24gKGUsIHVpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS4kYXBwbHkoZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmVsZW1lbnQuaXNEcmFnZ2luZyA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnJlc2V0RWxlbWVudHMoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvdmVyOiBmdW5jdGlvbiAoZSwgdWkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLiRhcHBseShmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuZWxlbWVudC5jYW52YXMuc2V0SXNEcm9wVGFyZ2V0KGZhbHNlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBsYXlvdXRJc0NvbGxhcHNlZENvb2tpZU5hbWUgPSBcImxheW91dFRvb2xib3hDYXRlZ29yeV9MYXlvdXRfSXNDb2xsYXBzZWRcIjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmxheW91dElzQ29sbGFwc2VkID0gJC5jb29raWUobGF5b3V0SXNDb2xsYXBzZWRDb29raWVOYW1lKSA9PT0gXCJ0cnVlXCI7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUudG9nZ2xlTGF5b3V0SXNDb2xsYXBzZWQgPSBmdW5jdGlvbiAoZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmxheW91dElzQ29sbGFwc2VkID0gISRzY29wZS5sYXlvdXRJc0NvbGxhcHNlZDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICQuY29va2llKGxheW91dElzQ29sbGFwc2VkQ29va2llTmFtZSwgJHNjb3BlLmxheW91dElzQ29sbGFwc2VkLCB7IGV4cGlyZXM6IDM2NSB9KTsgLy8gUmVtZW1iZXIgY29sbGFwc2VkIHN0YXRlIGZvciBhIHllYXIuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIF0sXHJcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogZW52aXJvbm1lbnQudGVtcGxhdGVVcmwoXCJUb29sYm94XCIpLFxyXG4gICAgICAgICAgICAgICAgcmVwbGFjZTogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSwgZWxlbWVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciB0b29sYm94ID0gZWxlbWVudC5maW5kKFwiLmxheW91dC10b29sYm94XCIpO1xyXG4gICAgICAgICAgICAgICAgICAgICQod2luZG93KS5vbihcInJlc2l6ZSBzY3JvbGxcIiwgZnVuY3Rpb24gKGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGNhbnZhcyA9IGVsZW1lbnQucGFyZW50KCkuZmluZChcIi5sYXlvdXQtY2FudmFzXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBJZiB0aGUgY2FudmFzIGlzIHRhbGxlciB0aGFuIHRoZSB0b29sYm94LCBtYWtlIHRoZSB0b29sYm94IHN0aWNreS1wb3NpdGlvbmVkIHdpdGhpbiB0aGUgZWRpdG9yXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHRvIGhlbHAgdGhlIHVzZXIgYXZvaWQgZXhjZXNzaXZlIHZlcnRpY2FsIHNjcm9sbGluZy5cclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGNhbnZhc0lzVGFsbGVyID0gISFjYW52YXMgJiYgY2FudmFzLmhlaWdodCgpID4gdG9vbGJveC5oZWlnaHQoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHdpbmRvd1BvcyA9ICQod2luZG93KS5zY3JvbGxUb3AoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNhbnZhc0lzVGFsbGVyICYmIHdpbmRvd1BvcyA+IGVsZW1lbnQub2Zmc2V0KCkudG9wICsgZWxlbWVudC5oZWlnaHQoKSAtIHRvb2xib3guaGVpZ2h0KCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRvb2xib3guYWRkQ2xhc3MoXCJzdGlja3ktYm90dG9tXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdG9vbGJveC5yZW1vdmVDbGFzcyhcInN0aWNreS10b3BcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiAoY2FudmFzSXNUYWxsZXIgJiYgd2luZG93UG9zID4gZWxlbWVudC5vZmZzZXQoKS50b3ApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRvb2xib3guYWRkQ2xhc3MoXCJzdGlja3ktdG9wXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdG9vbGJveC5yZW1vdmVDbGFzcyhcInN0aWNreS1ib3R0b21cIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0b29sYm94LnJlbW92ZUNsYXNzKFwic3RpY2t5LXRvcFwiKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRvb2xib3gucmVtb3ZlQ2xhc3MoXCJzdGlja3ktYm90dG9tXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfVxyXG4gICAgXSk7IiwiYW5ndWxhclxyXG4gICAgLm1vZHVsZShcIkxheW91dEVkaXRvclwiKVxyXG4gICAgLmRpcmVjdGl2ZShcIm9yY0xheW91dFRvb2xib3hHcm91cFwiLCBbXCIkY29tcGlsZVwiLCBcImVudmlyb25tZW50XCIsXHJcbiAgICAgICAgZnVuY3Rpb24gKCRjb21waWxlLCBlbnZpcm9ubWVudCkge1xyXG4gICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgcmVzdHJpY3Q6IFwiRVwiLFxyXG4gICAgICAgICAgICAgICAgc2NvcGU6IHsgY2F0ZWdvcnk6IFwiPVwiIH0sXHJcbiAgICAgICAgICAgICAgICBjb250cm9sbGVyOiBbXCIkc2NvcGVcIiwgXCIkZWxlbWVudFwiLFxyXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uICgkc2NvcGUsICRlbGVtZW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBpc0NvbGxhcHNlZENvb2tpZU5hbWUgPSBcImxheW91dFRvb2xib3hDYXRlZ29yeV9cIiArICRzY29wZS5jYXRlZ29yeS5uYW1lICsgXCJfSXNDb2xsYXBzZWRcIjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmlzQ29sbGFwc2VkID0gJC5jb29raWUoaXNDb2xsYXBzZWRDb29raWVOYW1lKSA9PT0gXCJ0cnVlXCI7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS50b2dnbGVJc0NvbGxhcHNlZCA9IGZ1bmN0aW9uIChlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuaXNDb2xsYXBzZWQgPSAhJHNjb3BlLmlzQ29sbGFwc2VkO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJC5jb29raWUoaXNDb2xsYXBzZWRDb29raWVOYW1lLCAkc2NvcGUuaXNDb2xsYXBzZWQsIHsgZXhwaXJlczogMzY1IH0pOyAvLyBSZW1lbWJlciBjb2xsYXBzZWQgc3RhdGUgZm9yIGEgeWVhci5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgXSxcclxuICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiBlbnZpcm9ubWVudC50ZW1wbGF0ZVVybChcIlRvb2xib3hHcm91cFwiKSxcclxuICAgICAgICAgICAgICAgIHJlcGxhY2U6IHRydWVcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9XHJcbiAgICBdKTsiXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=