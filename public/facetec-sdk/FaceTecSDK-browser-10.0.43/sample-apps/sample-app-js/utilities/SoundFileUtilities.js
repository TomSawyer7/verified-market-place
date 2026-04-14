// Load custom sound files
var SoundFileUtilities = /** @class */ (function () {
    function SoundFileUtilities() {
        // Return the customization object updated with custom sound files
        this.setVocalGuidanceSoundFiles = function (currentCustomization) {
            currentCustomization.vocalGuidanceCustomization.pleaseFrameYourFaceInTheOvalSoundFile = please_frame_your_face_sound_file_mp3;
            currentCustomization.vocalGuidanceCustomization.pleaseMoveCloserSoundFile = please_move_closer_sound_file_mp3;
            currentCustomization.vocalGuidanceCustomization.pleaseRetrySoundFile = please_retry_sound_file_mp3;
            currentCustomization.vocalGuidanceCustomization.uploadingSoundFile = uploading_sound_file_mp3;
            currentCustomization.vocalGuidanceCustomization.facescanSuccessfulSoundFile = facescan_successful_sound_file_mp3;
            currentCustomization.vocalGuidanceCustomization.pleasePressTheButtonToStartSoundFile = please_press_button_sound_file_mp3;
            return currentCustomization;
        };
    }
    return SoundFileUtilities;
}());
var SoundFileUtilities = SoundFileUtilities;
