var VocalGuidanceMode;
(function (VocalGuidanceMode) {
    VocalGuidanceMode[VocalGuidanceMode["MINIMAL"] = 0] = "MINIMAL";
    VocalGuidanceMode[VocalGuidanceMode["FULL"] = 1] = "FULL";
    VocalGuidanceMode[VocalGuidanceMode["OFF"] = 2] = "OFF";
})(VocalGuidanceMode || (VocalGuidanceMode = {}));
var SampleAppUtilities = /** @class */ (function () {
    function SampleAppUtilities() {
    }
    SampleAppUtilities.setupAndFadeInMainUIOnInitializationSuccess = function () {
        _a.setupVocalGuidancePlayers();
        _a.fadeInMainUIContainer();
        _a.enableControlButtons();
        if (_a.isLikelyMobileDevice()) {
            _a.fadeInVocalIconContainer();
        }
    };
    SampleAppUtilities.setupVocalGuidancePlayers = function () {
        _a.vocalGuidanceOnPlayer.volume = 0.4;
        _a.vocalGuidanceOffPlayer.volume = 0.4;
        _a.vocalGuidanceOffPlayer.onended = function () {
            _a.enableVocalGuidanceButtons();
        };
        _a.vocalGuidanceOnPlayer.onended = function () {
            _a.enableVocalGuidanceButtons();
        };
    };
    SampleAppUtilities.setVocalGuidanceMode = function () {
        this.disableVocalGuidanceButtons();
        if (!this.vocalGuidanceOnPlayer.paused || !this.vocalGuidanceOffPlayer.paused) {
            return;
        }
        var playPromise;
        switch (_a.vocalGuidanceMode) {
            case VocalGuidanceMode.OFF:
                _a.vocalGuidanceMode = VocalGuidanceMode.MINIMAL;
                document.getElementById("vocal-guidance-icon-minimal").style.display = "block";
                document.getElementById("vocal-guidance-icon-full").style.display = "none";
                document.getElementById("vocal-guidance-icon-off").style.display = "none";
                playPromise = _a.vocalGuidanceOnPlayer.play();
                if (typeof playPromise !== "undefined") {
                    playPromise.catch(function (_event) {
                        // Play failed
                    });
                }
                Config.currentCustomization.vocalGuidanceCustomization.mode = VocalGuidanceMode.MINIMAL;
                break;
            case VocalGuidanceMode.MINIMAL:
                _a.vocalGuidanceMode = VocalGuidanceMode.FULL;
                document.getElementById("vocal-guidance-icon-minimal").style.display = "none";
                document.getElementById("vocal-guidance-icon-full").style.display = "block";
                document.getElementById("vocal-guidance-icon-off").style.display = "none";
                playPromise = _a.vocalGuidanceOnPlayer.play();
                if (typeof playPromise !== "undefined") {
                    playPromise.catch(function (_event) {
                        // Play failed
                    });
                }
                Config.currentCustomization.vocalGuidanceCustomization.mode = VocalGuidanceMode.FULL;
                break;
            case VocalGuidanceMode.FULL:
                _a.vocalGuidanceMode = VocalGuidanceMode.OFF;
                document.getElementById("vocal-guidance-icon-minimal").style.display = "none";
                document.getElementById("vocal-guidance-icon-full").style.display = "none";
                document.getElementById("vocal-guidance-icon-off").style.display = "block";
                playPromise = _a.vocalGuidanceOffPlayer.play();
                if (typeof playPromise !== "undefined") {
                    playPromise.catch(function (_event) {
                        // Play failed
                    });
                }
                Config.currentCustomization.vocalGuidanceCustomization.mode = VocalGuidanceMode.OFF;
                break;
        }
        FaceTecSDK.setCustomization(Config.currentCustomization);
    };
    SampleAppUtilities.setVocalGuidanceSoundFiles = function () {
        var soundFileUtilities = new SoundFileUtilities();
        Config.currentCustomization = soundFileUtilities.setVocalGuidanceSoundFiles(Config.currentCustomization);
        FaceTecSDK.setCustomization(Config.currentCustomization);
    };
    SampleAppUtilities.setOCRLocalization = function () {
        // Set the strings to be used for group names, field names, and placeholder texts for the FaceTec ID Scan User OCR Confirmation Screen.
        // DEVELOPER NOTE: For this demo, we are using the template json file, 'FaceTec_OCR_Customization.json,' as the parameter in calling the configureOCRLocalization API.
        // For the configureOCRLocalization API parameter, you may use any object that follows the same structure and key naming as the template json file, 'FaceTec_OCR_Customization.json'.
        FaceTecSDK.configureOCRLocalization(ocrLocalizationJSON);
    };
    SampleAppUtilities.fadeInMainUIContainer = function () {
        new SampleAppUIFunctions("#theme-transition-overlay").fadeOut(800);
        new SampleAppUIFunctions(".wrapping-box-container").fadeIn(800);
        new SampleAppUIFunctions("footer").fadeIn(800);
        this.changeFooterStyleBasedOnWindowHeight();
    };
    SampleAppUtilities.fadeInVocalIconContainer = function () {
        new SampleAppUIFunctions("#vocal-icon-container").fadeIn(800);
    };
    SampleAppUtilities.fadeInMainUIControls = function (callback) {
        if (_a.isLikelyMobileDevice()) {
            new SampleAppUIFunctions("#custom-logo-container").fadeIn(800);
            new SampleAppUIFunctions("#vocal-icon-container").fadeIn(800);
        }
        new SampleAppUIFunctions("footer").fadeIn(800);
        new SampleAppUIFunctions("#controls").fadeIn(800, function () {
            _a.enableControlButtons();
            _a.enableVocalGuidanceButtons();
            if (typeof callback !== "undefined") {
                callback();
            }
        });
    };
    // Calculate passed in element height (including margins) to allow for dynamic sizing of parent containers
    SampleAppUtilities.calculateElementHeightWithMargins = function (element) {
        var elementComputedStyle = window.getComputedStyle(element);
        var elementOffsetHeight = element.offsetHeight;
        var elementMarginTop = parseFloat(elementComputedStyle.marginTop);
        var elementMarginBottom = parseFloat(elementComputedStyle.marginBottom);
        return elementOffsetHeight + elementMarginTop + elementMarginBottom;
    };
    SampleAppUtilities.fadeOutMainUIControlsAndFadeInOfficialIDInstructionsUI = function () {
        var _this = this;
        new SampleAppUIFunctions("#main-interface, #controls, #status, #custom-logo-container, #vocal-icon-container, #official-id-photo-session-cancel-container, footer").fadeOut(600, function () {
            document.getElementById("official-id-photo-result-container").classList.add("display-none");
            document.getElementById("official-id-photo-intro-container").classList.remove("display-none");
            document.getElementById("official-id-photo-session-cancel-container").classList.remove("display-none");
            // Dynamically set the main interface container height based upon the height of the intro content
            var officialIDPhotoIntroContainerHeight = _this.calculateElementHeightWithMargins(document.getElementById("official-id-photo-intro-container"));
            document.getElementById("main-interface").style.height = "".concat(officialIDPhotoIntroContainerHeight, "px");
            // Dynamically set the cancel button position to the top left corner within the main interface border if on desktop
            if (!_this.isLikelyMobileDevice()) {
                document.getElementById("official-id-photo-session-cancel-container").style.left = "".concat(((window.innerWidth / 2)) - (document.getElementById("main-interface").offsetWidth / 2), "px");
            }
            _this.enableAllButtons();
            new SampleAppUIFunctions("#main-interface, #official-id-photo-session-cancel-container, #official-id-photo-container").fadeIn(600);
        });
    };
    SampleAppUtilities.fadeOutOfficialIDPhotoUIAndFadeInMainUIControls = function () {
        var _this = this;
        this.disableAllButtons();
        new SampleAppUIFunctions(".wrapping-box-container, #official-id-photo-session-cancel-container, #official-id-photo-container").fadeOut(600, function () {
            // Remove height property on main interface that was dynamically set for Official ID Photo content and revert to value defined by CSS
            document.getElementById("main-interface").style.removeProperty("height");
            document.getElementById("official-id-photo-intro-container").classList.add("display-none");
            document.getElementById("official-id-photo-result-container").classList.add("display-none");
            document.getElementById("official-id-photo-session-cancel-container").classList.add("display-none");
            _a.enableVocalGuidanceButtons();
            _this.enableAllButtons();
            new SampleAppUIFunctions(".wrapping-box-container, #controls, #status, #custom-logo-container, #vocal-icon-container, footer").fadeIn(600);
        });
    };
    SampleAppUtilities.fadeInOfficialIDPhotoResultsUI = function () {
        document.getElementById("official-id-photo-result-image").setAttribute("src", "data:image/jpeg;base64, ".concat(SampleAppController.latestOfficialIDPhoto));
        document.getElementById("official-id-photo-intro-container").classList.add("display-none");
        document.getElementById("official-id-photo-result-container").classList.remove("display-none");
        document.getElementById("official-id-photo-session-cancel-container").classList.remove("display-none");
        document.querySelector(".wrapping-box-container").style.display = "block";
        // Dynamically set the main interface container height based upon the height of the result content
        var officialIDPhotoResultContainerHeight = this.calculateElementHeightWithMargins(document.getElementById("official-id-photo-result-container"));
        document.getElementById("main-interface").style.height = "".concat(officialIDPhotoResultContainerHeight, "px");
        // Dynamically set the cancel button position to the top left corner within the main interface border if on desktop
        if (!this.isLikelyMobileDevice()) {
            document.getElementById("official-id-photo-session-cancel-container").style.left = "".concat(((window.innerWidth / 2)) - (document.getElementById("main-interface").offsetWidth / 2), "px");
        }
        setTimeout(function () {
            new SampleAppUIFunctions(".wrapping-box-container, #official-id-photo-session-cancel-container, #official-id-photo-container").fadeIn(400);
        }, 200);
    };
    SampleAppUtilities.hideOfficialIDPhotoUIAndShowMainUIControlsDueToUnsuccessfulSession = function () {
        // Remove height property on main interface that was dynamically set for Official ID Photo content and revert to value defined by CSS
        document.getElementById("main-interface").style.removeProperty("height");
        new SampleAppUIFunctions("#official-id-photo-container, #official-id-photo-session-cancel-container").fadeOut(0);
        new SampleAppUIFunctions("#controls, #status, #custom-logo-container, #vocal-icon-container").fadeIn(0);
    };
    // Disable buttons to prevent hammering, fade out main interface elements, and reset the Session Review Screen data.
    SampleAppUtilities.fadeOutMainUIAndPrepareForSession = function () {
        _a.disableControlButtons();
        if (_a.isLikelyMobileDevice()) {
            new SampleAppUIFunctions("#custom-logo-container").fadeOut(800);
            new SampleAppUIFunctions("#vocal-icon-container").fadeOut(800);
            _a.disableVocalGuidanceButtons();
        }
        new SampleAppUIFunctions("footer").fadeOut(800);
        new SampleAppUIFunctions("#controls").fadeOut(800);
        new SampleAppUIFunctions(".wrapping-box-container").fadeOut(800);
        new SampleAppUIFunctions("#official-id-photo-session-cancel-container").fadeOut(800);
        new SampleAppUIFunctions("#theme-transition-overlay").fadeIn(800);
    };
    SampleAppUtilities.disableControlButtons = function () {
        document.querySelectorAll("#controls > button").forEach(function (button) {
            button.setAttribute("disabled", "true");
        });
    };
    SampleAppUtilities.enableControlButtons = function () {
        document.querySelectorAll("#controls > button").forEach(function (button) {
            button.removeAttribute("disabled");
        });
        this.enableVocalGuidanceButtons();
    };
    SampleAppUtilities.showMainUI = function () {
        _a.fadeInMainUIContainer();
        _a.fadeInMainUIControls();
    };
    SampleAppUtilities.handleErrorGettingServerSessionToken = function () {
        _a.showMainUI();
        DeveloperStatusMessages.logAndDisplayMessage("Session could not be started due to an unexpected issue during the network request.");
    };
    SampleAppUtilities.generateUUId = function () {
        // @ts-ignore
        return ("" + [1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, function (c) { return (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16); });
    };
    SampleAppUtilities.formatUIForDevice = function () {
        var _this = this;
        window.addEventListener("keydown", _a.onKeyDown);
        if (_a.isLikelyMobileDevice()) {
            var windowWidth = window.innerWidth;
            // Adjust button sizing
            document.querySelectorAll("button").forEach(function (element) {
                if (element.className === "big-button") {
                    element.style.height = "40px";
                    if (windowWidth <= 320) {
                        element.style.fontSize = "16px";
                    }
                    else {
                        element.style.fontSize = "18px";
                    }
                }
                else if (element.className === "medium-button") {
                    element.style.height = "30px";
                    element.style.fontSize = "14px";
                }
                // Set specific button properties
                if (element.id === "official-id-photo-intro-continue-button" || element.id === "official-id-photo-result-download-button") {
                    element.style.width = "80%";
                }
                else if (element.id === "official-id-photo-session-cancel-button") {
                    element.style.width = "20px";
                }
                else {
                    element.style.width = "60%";
                }
            });
            // Adjust main interface display
            document.getElementById("main-interface").style.display = "contents";
            document.getElementById("main-interface").style.backgroundColor = "transparent";
            document.getElementById("main-interface").style.borderColor = "transparent";
            document.getElementById("main-interface").style.width = "unset";
            // Hide border around control panel and adjust height
            document.getElementById("controls").style.height = "auto";
            document.getElementById("controls").style.backgroundColor = "transparent";
            // Hide status label text background and decrease label font size
            document.getElementById("status").style.backgroundColor = "transparent";
            document.getElementById("status").style.fontSize = "12px";
            document.getElementById("status").style.position = "inherit";
            document.getElementById("status").style.width = "90%";
            document.getElementById("status").style.margin = "0 auto";
            document.getElementById("status").style.bottom = "unset";
            // Move and update vocal guidance icon
            document.getElementById("vocal-icon-container").parentNode.parentNode.parentNode.parentNode.insertBefore(document.getElementById("vocal-icon-container"), document.getElementById("vocal-icon-container").parentNode.parentNode.parentNode.parentNode.firstChild);
            document.querySelectorAll(".vocal-icon").forEach(function (icon) {
                icon.style.height = "30px";
                icon.style.margin = "20px";
                icon.style.transform = "translateX(calc(-100% - 40px))";
            });
            new SampleAppUIFunctions("#vocal-icon-container").fadeOut(1);
            // Move logo above buttons
            document.getElementById("custom-logo-container").parentNode.insertBefore(document.getElementById("custom-logo-container"), document.getElementById("custom-logo-container").parentNode.firstChild);
            document.getElementById("custom-logo-container").style.margin = "0px 0px 20px 0px";
            document.querySelector("#custom-logo-container img").style.height = "40px";
            // Center control interface on screen
            document.getElementsByClassName("wrapping-box-container")[0].style.top = "50%";
            document.getElementsByClassName("wrapping-box-container")[0].style.left = "50%";
            document.getElementsByClassName("wrapping-box-container")[0].style.transform = "translate(-50%, -50%)";
            // Adjust button margins
            document.getElementById("liveness-button").style.marginTop = "unset";
            document.getElementById("design-showcase-button").style.marginBottom = "unset";
            // Setup footer sizing
            var footerFontSize = "100%";
            if (windowWidth < 768) {
                footerFontSize = "9px";
            }
            if (windowWidth < 415) {
                footerFontSize = "8px";
            }
            if (windowWidth <= 360) {
                footerFontSize = "7px";
            }
            new SampleAppUIFunctions("footer").css({
                "font-size": footerFontSize,
                "line-height": "9px"
            });
            new SampleAppUIFunctions("footer span p").css({ "font-size": "inherit" });
            new SampleAppUIFunctions("footer span, footer span p").css({ margin: 0 });
            document.querySelector("hr").classList.remove("display-none");
            var computedFooterFontSize = window.getComputedStyle(document.querySelector("footer span p")).fontSize;
            new SampleAppUIFunctions("#copy-right-length").css({ "font-size": computedFooterFontSize });
            var copyRightStringLength = document.getElementById("copy-right-length").clientWidth;
            new SampleAppUIFunctions("hr").css({ width: copyRightStringLength + "px" });
            // Allow time for the UI to fully load before fading in the body
            requestAnimationFrame(function () {
                requestAnimationFrame(function () {
                    _a.displayElementsAfterStyling();
                });
            });
        }
        else {
            window.onresize = function () {
                _this.changeFooterStyleBasedOnWindowHeight();
            };
            _a.displayElementsAfterStyling();
        }
        // Setup Official ID Photo sizing
        this.formatOfficialIDPhotoUIForDevice();
    };
    // When the footer element gets close to the bottom of the content, change its style to set the position to prevent overlap
    SampleAppUtilities.changeFooterStyleBasedOnWindowHeight = function () {
        // This helper function is only needed on desktop
        if (this.isLikelyMobileDevice()) {
            return;
        }
        var wrappingBoxContainerElementRect = document.querySelector(".wrapping-box-container").getBoundingClientRect();
        var footerElement = document.querySelector("footer");
        var footerElementTopOffset = wrappingBoxContainerElementRect.top + wrappingBoxContainerElementRect.height;
        if (window.innerHeight - 53 <= wrappingBoxContainerElementRect.height) {
            footerElement.style.removeProperty("bottom");
            new SampleAppUIFunctions("footer").css({
                top: footerElementTopOffset + "px"
            });
        }
        else {
            footerElement.style.removeProperty("top");
            // CSS bottom property value coincides with the value defined in the style sheet
            new SampleAppUIFunctions("footer").css({
                bottom: "4px"
            });
        }
    };
    SampleAppUtilities.formatOfficialIDPhotoUIForDevice = function () {
        var windowHeight = window.innerHeight;
        var scalingFactor = 1;
        var elementSizeMap = {
            containerVerticalMargin: 20,
            headerFontSize: 28,
            headerMarginBottom: 20,
            subheaderFontSize: 16,
            subheaderMarginBottom: 20,
            fontSize: 16,
            margin: 14,
            instructionImageHeight: 36,
            resultImageHeight: 240,
            resultImageMarginBottom: 28,
            buttonHeight: 50,
            buttonFontSize: 18,
            cancelButtonSize: 18,
            cancelButtonSizeMobile: 20,
            cancelContainerTop: 10,
            cancelContainerLeft: 5
        };
        // For mobile devices - determine if scaling is required based upon vertical resolution (respecting the minimum height as set by CSS)
        if (this.isLikelyMobileDevice()) {
            if (windowHeight < 600) {
                scalingFactor = Math.max(360, windowHeight) / 600;
                // Official ID Photo container CSS min-height property set to 360px
                Object.keys(elementSizeMap).forEach(function (key) {
                    elementSizeMap[key] *= scalingFactor;
                });
            }
        }
        // Set styling to scale Official ID Photo UI Elements
        new SampleAppUIFunctions("#official-id-photo-intro-container").css({
            "margin-top": elementSizeMap.containerVerticalMargin + "px",
            "margin-bottom": elementSizeMap.containerVerticalMargin + "px"
        });
        new SampleAppUIFunctions("#official-id-photo-intro-header-text, #official-id-photo-result-header-text").css({
            "font-size": elementSizeMap.headerFontSize + "px",
            "margin-bottom": elementSizeMap.headerMarginBottom + "px"
        });
        new SampleAppUIFunctions(".official-id-photo-intro-span, .official-id-photo-result-span").css({
            "font-size": elementSizeMap.subheaderFontSize + "px",
            "margin-bottom": elementSizeMap.subheaderMarginBottom + "px"
        });
        new SampleAppUIFunctions("#official-id-photo-intro-container-instructions").css({
            "margin-bottom": elementSizeMap.margin + "px"
        });
        new SampleAppUIFunctions(".official-id-photo-intro-instruction-item-container").css({
            "font-size": elementSizeMap.fontSize + "px",
            "margin-bottom": elementSizeMap.margin + "px"
        });
        new SampleAppUIFunctions(".official-id-photo-intro-instruction-item-img").css({
            "height": elementSizeMap.instructionImageHeight + "px",
            "margin-right": elementSizeMap.margin + "px"
        });
        new SampleAppUIFunctions("#official-id-photo-result-image").css({
            height: elementSizeMap.resultImageHeight + "px",
            "margin-bottom": elementSizeMap.subheaderMarginBottom + "px"
        });
        new SampleAppUIFunctions("#official-id-photo-intro-continue-button, #official-id-photo-result-download-button").css({
            "height": elementSizeMap.buttonHeight + "px",
            "font-size": elementSizeMap.buttonFontSize + "px"
        });
        // Set styling for Official ID Photo Cancel Button
        if (this.isLikelyMobileDevice()) {
            new SampleAppUIFunctions("#official-id-photo-session-cancel-button").css({
                // Setting width for the cancel button to ensure proper aspect ratio and sizing for some browsers and platforms
                "height": elementSizeMap.cancelButtonSizeMobile + "px",
                "width": elementSizeMap.cancelButtonSizeMobile + "px"
            });
            new SampleAppUIFunctions("#official-id-photo-session-cancel-container").css({
                "top": elementSizeMap.cancelContainerTop + "px",
                "left": elementSizeMap.cancelContainerLeft + "px"
            });
        }
        else {
            new SampleAppUIFunctions("#official-id-photo-session-cancel-button").css({
                "height": elementSizeMap.cancelButtonSize + "px"
            });
        }
    };
    SampleAppUtilities.onKeyDown = function (e) {
        if (e.key === "Tab") {
            _a.enableKeyboardAccessibilityStyling(true);
        }
    };
    SampleAppUtilities.enableKeyboardAccessibilityStyling = function (enable) {
        // Mobile not supported
        if (_a.isLikelyMobileDevice() || _a.keyboardAccessibilityStylingOn) {
            return;
        }
        _a.keyboardAccessibilityStylingOn = true;
        var buttons = document.getElementsByClassName("ft-button");
        for (var i = 0; i < buttons.length; i++) {
            var element = buttons[i];
            if (enable) {
                element.style.outline = "revert";
            }
            else {
                element.style.outline = "none";
            }
        }
    };
    SampleAppUtilities.displayElementsAfterStyling = function () {
        document.querySelectorAll("button").forEach(function (element) {
            element.classList.add("button-transitions");
        });
        new SampleAppUIFunctions("body").fadeIn(800);
    };
    SampleAppUtilities.disableVocalGuidanceButtons = function () {
        document.querySelectorAll(".vocal-icon").forEach(function (button) {
            button.setAttribute("disabled", "true");
        });
    };
    SampleAppUtilities.enableVocalGuidanceButtons = function () {
        document.querySelectorAll(".vocal-icon").forEach(function (button) {
            button.removeAttribute("disabled");
        });
    };
    SampleAppUtilities.isLikelyMobileDevice = function () {
        var isMobileDeviceUA = !!(/Android|iPhone|iPad|iPod|IEMobile|Mobile|mobile/i.test(navigator.userAgent || ""));
        // ChromeOS/Chromebook detection.
        if (isMobileDeviceUA && ((navigator.userAgent.indexOf("CrOS") !== -1) || (navigator.userAgent.indexOf("Chromebook") !== -1))) {
            isMobileDeviceUA = false;
        }
        // Mobile device determination based on portrait / landscape and user agent.
        if (screen.width < screen.height || isMobileDeviceUA) {
            // Assume mobile device when in portrait mode or when determined by the user agent.
            return true;
        }
        else {
            return false;
        }
    };
    SampleAppUtilities.disableAllButtons = function () {
        document.getElementById("enroll-button").setAttribute("disabled", "true");
        document.getElementById("id-scan-button").setAttribute("disabled", "true");
        document.getElementById("photo-id-scan-button").setAttribute("disabled", "true");
        document.getElementById("liveness-button").setAttribute("disabled", "true");
        document.getElementById("verify-button").setAttribute("disabled", "true");
        document.getElementById("design-showcase-button").setAttribute("disabled", "true");
        document.getElementById("official-id-photo-button").setAttribute("disabled", "true");
        document.getElementById("official-id-photo-session-cancel-button").setAttribute("disabled", "true");
        document.getElementById("official-id-photo-intro-continue-button").setAttribute("disabled", "true");
        document.getElementById("official-id-photo-result-download-button").setAttribute("disabled", "true");
    };
    SampleAppUtilities.enableAllButtons = function () {
        document.getElementById("enroll-button").removeAttribute("disabled");
        document.getElementById("id-scan-button").removeAttribute("disabled");
        document.getElementById("photo-id-scan-button").removeAttribute("disabled");
        document.getElementById("liveness-button").removeAttribute("disabled");
        document.getElementById("verify-button").removeAttribute("disabled");
        document.getElementById("design-showcase-button").removeAttribute("disabled");
        document.getElementById("official-id-photo-button").removeAttribute("disabled");
        document.getElementById("official-id-photo-session-cancel-button").removeAttribute("disabled");
        document.getElementById("official-id-photo-intro-continue-button").removeAttribute("disabled");
        document.getElementById("official-id-photo-result-download-button").removeAttribute("disabled");
    };
    SampleAppUtilities.fadeInBlurOverlay = function () {
        document.getElementById("controls").classList.add("blur-content");
    };
    SampleAppUtilities.fadeOutBlurOverlay = function () {
        if (document.getElementById("controls").classList.contains("blur-content")) {
            document.getElementById("controls").classList.remove("blur-content");
        }
    };
    var _a;
    _a = SampleAppUtilities;
    SampleAppUtilities.vocalGuidanceSoundFilesDirectory = "../../sample-app-resources/Vocal_Guidance_Audio_Files/";
    SampleAppUtilities.vocalGuidanceOnPlayer = new Audio(_a.vocalGuidanceSoundFilesDirectory + "vocal_guidance_on.mp3");
    SampleAppUtilities.vocalGuidanceOffPlayer = new Audio(_a.vocalGuidanceSoundFilesDirectory + "vocal_guidance_off.mp3");
    SampleAppUtilities.vocalGuidanceMode = VocalGuidanceMode.MINIMAL;
    SampleAppUtilities.keyboardAccessibilityStylingOn = false;
    return SampleAppUtilities;
}());
SampleAppUtilities = SampleAppUtilities;
