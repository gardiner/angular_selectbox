angular.module('angular-selectbox', [])
.directive('selectbox', [function() {
    "use strict";

    return {
        template: "<div class='selectbox'><div class='inputframe' ng-click='activate($event)' ng-focus='activate($event)' tabindex='0'><span class='value' ng-repeat='item in value' tabindex='-1'><div class='icon clear active' ng-click='unset_value(item, $event)'></div>{{ pretty(item) }}</span><span class='placeholder' ng-show='!value.length'>{{ is_open ? '&nbsp;' : placeholder }}</span></div><div class='candidates' ng-show='is_open'><div class='input'><input autocomplete='off' ng-keydown='keydown($event)' ng-model='input' type='text'></div><div class='icon add' ng-class='{active: is_add_visible &amp;&amp; input}' ng-click='add_candidate()'></div><div class='icon clear' ng-class='{active: input}' ng-click='close()'></div><ul ng-show='filtered_candidates.length &gt; 0'><li ng-class='{selected: is_selected(c), active: (current === $index)}' ng-click='select()' ng-mouseenter='set_current($index)' ng-repeat='c in filtered_candidates' title='{{pretty(c)}}'>{{ pretty(c) }}</li></ul></div></div>",
        scope: {
            placeholder: '@',
            multiple: '@',
            label: '@',
            add: '&',
            candidates: '=?',
            model: '=?'
        },
        link: function(scope, element, attrs, ngModel) {
            var self = scope;

            $(document)
            .on('click close_selectboxes', function(evt, except) {
                if (!$(element).has(evt.target).length && (!except || except.element != element)) {
                    scope.close();
                    if (evt.type == 'click') {
                        scope.$apply();
                    }
                }
            });


            scope.is_add_visible = attrs['add'];
            scope.is_open = false;
            scope.current = false;
            scope.value = [];
            scope.filtered_candidates = [];


            function focus() {
                window.setTimeout(function() { $(element).find('input').focus(); });
            }

            function check_scroll() {
                var $candidates = $(element).find('.candidates ul'),
                    $current = $candidates.children().eq(self.current),
                    height = $candidates.outerHeight(),
                    min = $candidates.scrollTop(),
                    max = min + height,
                    current_min = min + $current.position().top,
                    current_max = current_min + $current.outerHeight();

                if (current_max > max) {
                    $candidates.scrollTop(current_max - height);
                } else if (current_min < min) {
                    $candidates.scrollTop(current_min);
                }
            }

            function get_by_index(index) {
                var num = self.filtered_candidates.length;
                return self.filtered_candidates[(index + num) % num];
            }

            function find_next(direction) {
                var num = self.filtered_candidates.length,
                    next_index;

                if (scope.current === false) {
                    next_index = (direction > 0) ? 0 : -1;
                } else {
                    next_index = scope.current + direction;
                }
                //skip selected values, but limited tries to avoid endless loop
                while (scope.is_selected(get_by_index(next_index)) && next_index < (2 * num) && next_index > (-2 * num)) {
                    next_index += direction;
                }

                return next_index;
            }


            scope.activate = function(evt) {
                if (!scope.is_open) {
                    $(document).trigger('close_selectboxes', {element: element});
                    if (!evt || (evt.keyCode !== 13 && evt.keyCode !== 27)) {
                        scope.is_open = true;
                        focus();
                        return false;
                    }
                }
            };

            scope.close = function() {
                if (scope.is_open) {
                    scope.is_open = false;
                    scope.current = false;
                    scope.input = null;
                }
            };

            /**
             * Highlights the value with the specified index.
             */
            scope.set_current = function(index) {
                var num = self.filtered_candidates.length;
                if (index === false || scope.is_selected(get_by_index(index))) {
                    self.current === false;
                } else {
                    self.current = (index + num) % num;
                }
                if (num > 1) {
                    check_scroll();
                }
            };

            scope.keydown = function(evt) {
                if (evt.which == 13) {
                    //enter
                    scope.select();
                } else if (evt.which == 38) {
                    //up
                    scope.set_current(find_next(-1));
                } else if (evt.which == 40) {
                    //down
                    scope.set_current(find_next(+1));
                } else if (evt.which == 27) {
                    //esc
                    scope.close();
                }
            };

            /**
             * Selects the currently highlighted value.
             */
            scope.select = function() {
                var selected;
                if (self.current !== false) {
                    selected = self.filtered_candidates[self.current];
                    if (!self.is_selected(selected)) {
                        self.set_value(selected);

                        if (!scope.multiple) {
                            scope.close();
                        } else {
                            focus();
                        }
                    }
                }
            };

            /**
             * Updates the value and emits event.
             */
            scope.set_value = function(value) {
                self.input = "";
                if (scope.multiple) {
                    self.value.push(value);
                    self.model = self.value;
                } else {
                    self.value = value ? [value] : [];
                    self.model = value;
                }
                scope.current = false;
            };

            scope.unset_value = function(value, $event) {
                var result = [];
                if (scope.multiple) {
                    angular.forEach(self.value, function(i) {
                        if (i != value) {
                            result.push(i);
                        }
                    });
                    self.value = result;
                    self.model = result;
                } else {
                    self.value = [];
                    self.model = null;
                }
                if (!self.value.length) {
                    self.close();
                } else {
                    focus();
                }
                $event.stopPropagation();
            };

            scope.pretty = function(item) {
                return scope.label ? item[scope.label] : item;
            };

            scope.is_selected = function(item) {
                return scope.value.indexOf(item) > -1;
            };

            scope.add_candidate = function() {
                if (scope.input && scope.add) {
                    scope.add({'$value': scope.input});
                    self.close();
                }
            };


            scope.$watchGroup(['candidates', 'input'], function() {
                scope.filtered_candidates = [];
                if (scope.input) {
                    angular.forEach(scope.candidates, function(c) {
                        var label = scope.pretty(c);
                        if (label.toLowerCase().match(new RegExp(scope.input.toLowerCase()))) {
                            scope.filtered_candidates.push(c);
                        }
                    });
                } else {
                    scope.filtered_candidates = scope.candidates;
                }
            });

            scope.$watch('model', function() {
                if (scope.multiple) {
                    scope.value = scope.model ? scope.model : [];
                } else {
                    scope.value = scope.model ? [scope.model] : [];
                }
            });
        }
    };
}]);