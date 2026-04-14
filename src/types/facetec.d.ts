/**
 * Global type declarations for the FaceTec Browser SDK
 * loaded via script tag from /facetec-sdk/
 */

interface FaceTecSessionRequestProcessorCallback {
  processResponse(responseBlob: string): void;
  updateProgress(uploadPercent: number): void;
  abortOnCatastrophicError(): void;
}

interface FaceTecSessionResult {
  status: number;
}

interface FaceTecSessionRequestProcessor {
  onSessionRequest(requestBlob: string, requestCallback: FaceTecSessionRequestProcessorCallback): void;
  onFaceTecExit(result: FaceTecSessionResult): void;
}

interface FaceTecInitializeCallback {
  onSuccess(sdkInstance: FaceTecSDKInstance): void;
  onError(error: number): void;
}

interface FaceTecSDKInstance {
  start3DLiveness(sessionRequestProcessor: FaceTecSessionRequestProcessor): void;
  start3DLivenessThen3DFaceMatch(sessionRequestProcessor: FaceTecSessionRequestProcessor): void;
  startIDScanOnly(sessionRequestProcessor: FaceTecSessionRequestProcessor): void;
  startIDScanThen3D2DMatch(sessionRequestProcessor: FaceTecSessionRequestProcessor): void;
  start3DLivenessThen3D2DPhotoIDMatch(sessionRequestProcessor: FaceTecSessionRequestProcessor): void;
  startSecureOfficialIDPhotoCapture(sessionRequestProcessor: FaceTecSessionRequestProcessor): void;
}

interface FaceTecSDKType {
  initializeWithSessionRequest(
    deviceKeyIdentifier: string,
    sessionRequestProcessor: FaceTecSessionRequestProcessor,
    callback: FaceTecInitializeCallback
  ): void;
  setResourceDirectory(resourceDirectory: string): void;
  setImagesDirectory(directory: string): void;
  setCustomization(customization: any): void;
  setLowLightCustomization(customization: any | null): void;
  setDynamicDimmingCustomization(customization: any | null): void;
  deinitialize(callback: () => void): void;
  version(): string;
  isLockedOut(): boolean;
  getLockoutEndTime: number | null;
  FaceTecCustomization: new () => any;
  FaceTecSessionStatus: {
    SessionCompleted: 0;
    RequestAborted: 1;
    UserCancelledFaceScan: 2;
    UserCancelledIDScan: 3;
    LockedOut: 4;
    CameraError: 5;
    CameraPermissionsDenied: 6;
    UnknownInternalError: 7;
    IFrameNotAllowedWithoutPermission: 8;
  };
  FaceTecInitializationError: {
    RejectedByServer: 0;
    RequestAborted: 1;
    DeviceNotSupported: 2;
    UnknownInternalError: 3;
    ResourcesCouldNotBeLoadedOnLastInit: 4;
    GetUserMediaRemoteHTTPNotSupported: 5;
  };
  FaceTecCancelButtonLocation: {
    TopLeft: any;
    TopRight: any;
    Disabled: any;
  };
  FaceTecSecurityWatermarkImage: {
    FaceTec: any;
  };
  FaceTecLoggingMode: {
    Default: any;
    LocalhostOnly: any;
  };
  setFaceTecLoggingMode(mode: any): void;
  configureLocalization(json: Record<string, string>): void;
  getTestingAPIHeader(): string;
}

declare global {
  interface Window {
    FaceTecSDK: FaceTecSDKType;
  }
  var FaceTecSDK: FaceTecSDKType;
}

export {};
