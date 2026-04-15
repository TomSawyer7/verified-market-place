// Helper class to log and or display SampleApp messages.
// This classes sole purpose is to help developers learn about the FaceTecSDK response statuses.
var DeveloperStatusMessages = /** @class */ (function () {
    function DeveloperStatusMessages() {
    }
    var _a;
    _a = DeveloperStatusMessages;
    DeveloperStatusMessages.LOG_PREFIX = "FaceTec SampleApp:";
    // Display the message on the screen for the user
    DeveloperStatusMessages.displayMessage = function (message) {
        document.getElementById("status").innerHTML = message;
    };
    // Log the message to the console for the developer. Prefix with FaceTec SampleApp: so the messages can be filtered
    DeveloperStatusMessages.logMessage = function (message) {
        console.log("".concat(_a.LOG_PREFIX, " ").concat(message));
    };
    // Log the message and display on screen for the user
    DeveloperStatusMessages.logAndDisplayMessage = function (message) {
        _a.displayMessage(message);
        _a.logMessage(message);
    };
    // Log FaceTecSDK Initialization Error result for the user
    DeveloperStatusMessages.logInitializationErrorResult = function (enumValue) {
        // User message to display
        var displayMessage = FaceTecStatusEnumFriendlyText.descriptionForInitializationError(enumValue);
        // Message to log for developer
        var logMessage = "FaceTecInitializationError: ".concat(enumValue, " \"").concat(displayMessage, "\"");
        _a.displayMessage(displayMessage);
        _a.logMessage(logMessage);
    };
    // Process onFaceTecExit status from FaceTecSessionResult or FaceTecIDScanResult
    DeveloperStatusMessages.logSessionStatusOnFaceTecExit = function (sessionStatus) {
        // User message to display
        var displayMessage = "See logs for details";
        // Message to log for developer
        var logMessage = "Unable to parse status message";
        if (sessionStatus != null) {
            // Special case message for user when the device is locked out
            if (sessionStatus === FaceTecSDK.FaceTecSessionStatus.LockedOut) {
                displayMessage = "The device is locked out of FaceTec Browser SDK.";
            }
            logMessage = "FaceTecSessionResult.status: ".concat(sessionStatus, " - \"").concat(FaceTecStatusEnumFriendlyText.descriptionForSessionStatus(sessionStatus), "\"");
        }
        _a.displayMessage(displayMessage);
        _a.logMessage(logMessage);
    };
    return DeveloperStatusMessages;
}());
var DeveloperStatusMessages = DeveloperStatusMessages;
