/** cameraFocus — a one-shot imperative channel from the "see my pet" button (DOM,
 *  outside the Canvas) to the CameraRig (inside it). The button sets `request` to a
 *  desired camera distance; the rig eases toward it on the next frame and clears it.
 *  Kept outside React/zustand — like petPos/lure, it's a transient signal, not state.
 *  0 = nothing requested; >0 = ease the zoom to that distance. */
export const cameraFocus = { request: 0 };

export const SEE_PET_DIST = 8; // close-up of the companion (with a little world around it)
export const GROVE_DIST = 90; // pull back to survey a swath of the big island
