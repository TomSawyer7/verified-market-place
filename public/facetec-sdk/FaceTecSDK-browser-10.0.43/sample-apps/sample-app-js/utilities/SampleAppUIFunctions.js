// UI Convenience Methods
var SampleAppUIFunctions = /** @class */ (function () {
    function SampleAppUIFunctions(elementString) {
        var _this = this;
        // Save the original display property of the element before hiding it
        this.saveDisplayForElement = function (el) {
            var display = window.getComputedStyle(el).display;
            if (typeof display !== "undefined" && display !== "none") {
                el.setAttribute("displaytype", display);
            }
        };
        // Set the display of the element to either block or restore it's original value
        this.setDisplayForElement = function (el) {
            var display = "block";
            if (el.getAttribute("displaytype") !== null) {
                display = el.getAttribute("displaytype");
            }
            el.style.display = display;
        };
        // Fade in the element to opacity over duration ms with an optional callback
        this._fadeIn = function (el, opacity, duration, callback) {
            if (!el) {
                return;
            }
            opacity = opacity || "1";
            duration = duration || 1;
            var computedStyle = window.getComputedStyle(el);
            if (computedStyle.display === "none" && computedStyle.opacity === "1") {
                el.style.opacity = "0";
            }
            el.style.visibility = "visible";
            _this.saveDisplayForElement(el);
            _this.setDisplayForElement(el);
            // @ts-ignore
            el.style["-webkit-transition"] = "opacity " + duration + "ms";
            // @ts-ignore
            el.style["-moz-transition"] = "opacity " + duration + "ms";
            // @ts-ignore
            el.style["-o-transition"] = "opacity " + duration + "ms";
            el.style.transition = "opacity " + duration + "ms";
            // Allow JS to clear execution stack
            window.setTimeout(function () {
                requestAnimationFrame(function () {
                    el.style.opacity = opacity;
                });
            });
            window.setTimeout(function () {
                _this.setDisplayForElement(el);
                if (callback != null) {
                    callback();
                }
            }, duration);
        };
        // Fade out the element to opacity over duration ms with an optional callback
        this._fadeOut = function (el, opacity, duration, callback) {
            if (!el) {
                return;
            }
            _this.saveDisplayForElement(el);
            opacity = opacity || "0";
            duration = duration || 1;
            // @ts-ignore
            el.style["-webkit-transition"] = "opacity " + duration + "ms";
            // @ts-ignore
            el.style["-moz-transition"] = "opacity " + duration + "ms";
            // @ts-ignore
            el.style["-o-transition"] = "opacity " + duration + "ms";
            el.style.transition = "opacity " + duration + "ms";
            // Allow JS to clear execution stack
            window.setTimeout(function () {
                requestAnimationFrame(function () {
                    el.style.opacity = opacity;
                });
            });
            window.setTimeout(function () {
                el.style.display = "none";
                if (callback != null) {
                    callback();
                }
            }, duration);
        };
        this.fadeOut = function (duration, callback) {
            _this.currentElements.forEach(function (element) {
                _this._fadeOut(element, "0", duration, callback);
            });
        };
        this.fadeIn = function (duration, callback) {
            _this.currentElements.forEach(function (element) {
                _this._fadeIn(element, "1", duration, callback);
            });
        };
        this.show = function () {
            _this.currentElements.forEach(function (element) {
                element.style.opacity = "1";
                _this.setDisplayForElement(element);
            });
        };
        this.hide = function () {
            _this.currentElements.forEach(function (element) {
                element.style.opacity = "0";
                element.style.visibility = "visible";
                _this.saveDisplayForElement(element);
                _this.setDisplayForElement(element);
            });
        };
        this.scrollTop = function (value) {
            _this.currentElements.forEach(function (element) {
                element.scrollTop = value;
            });
        };
        this.css = function (styleProperTies) {
            if (typeof styleProperTies !== "object") {
                throw new Error("UI.css must be called with an object");
                return;
            }
            _this.currentElements.forEach(function (element) {
                Object.keys(styleProperTies).forEach(function (style) {
                    // @ts-ignore
                    element.style[style] = styleProperTies[style];
                });
            });
        };
        // Get the element(s) for ui operations from the elementString;
        this.currentElements = document.querySelectorAll(elementString);
    }
    return SampleAppUIFunctions;
}());
SampleAppUIFunctions = SampleAppUIFunctions;
