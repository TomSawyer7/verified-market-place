import { FaceTecCustomization } from "../../../../core-sdk/FaceTecSDK.js/FaceTecCustomization";

// Load custom sound files
import FACESCAN_SUCCESSFUL_SOUND_FILE from "../../../../sample-app-resources/Vocal_Guidance_Audio_Files/facescan_successful_sound_file.mp3";
import PLEASE_FRAME_YOUR_FACE_SOUND_FILE from "../../../../sample-app-resources/Vocal_Guidance_Audio_Files/please_frame_your_face_sound_file.mp3";
import PLEASE_MOVE_CLOSER_SOUND_FILE from "../../../../sample-app-resources/Vocal_Guidance_Audio_Files/please_move_closer_sound_file.mp3";
import PLEASE_PRESS_BUTTON_SOUND_FILE from "../../../../sample-app-resources/Vocal_Guidance_Audio_Files/please_press_button_sound_file.mp3";
import PLEASE_RETRY_SOUND_FILE from "../../../../sample-app-resources/Vocal_Guidance_Audio_Files/please_retry_sound_file.mp3";
import UPLOADING_SOUND_FILE from "../../../../sample-app-resources/Vocal_Guidance_Audio_Files/uploading_sound_file.mp3";

export class SoundFileUtilities {
  // Return the customization object updated with custom sound files
  public setVocalGuidanceSoundFiles = (currentCustomization: FaceTecCustomization): FaceTecCustomization => {
    currentCustomization.vocalGuidanceCustomization.pleaseFrameYourFaceInTheOvalSoundFile = PLEASE_FRAME_YOUR_FACE_SOUND_FILE as string;
    currentCustomization.vocalGuidanceCustomization.pleaseMoveCloserSoundFile = PLEASE_MOVE_CLOSER_SOUND_FILE as string;
    currentCustomization.vocalGuidanceCustomization.pleaseRetrySoundFile = PLEASE_RETRY_SOUND_FILE as string;
    currentCustomization.vocalGuidanceCustomization.uploadingSoundFile = UPLOADING_SOUND_FILE as string;
    currentCustomization.vocalGuidanceCustomization.facescanSuccessfulSoundFile = FACESCAN_SUCCESSFUL_SOUND_FILE as string;
    currentCustomization.vocalGuidanceCustomization.pleasePressTheButtonToStartSoundFile = PLEASE_PRESS_BUTTON_SOUND_FILE as string;
    return currentCustomization;
  };
}
