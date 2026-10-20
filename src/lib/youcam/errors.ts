/** YouCam error codes mapped to plain words the user can act on. */
const MESSAGES: Record<string, string> = {
  error_no_face: "We could not find a face. Face the camera straight on, with your whole face in the picture.",
  error_src_face_too_small: "Your face is too small in the photo. Hold the phone closer so your face fills most of the frame.",
  error_face_position_too_small: "Your face is too small in the photo. Hold the phone closer so your face fills most of the frame.",
  error_src_face_out_of_bound: "Part of your face is cut off. Move back a little so your forehead, cheeks and chin all show.",
  error_face_position_out_of_boundary: "Part of your face is cut off. Move back a little so your forehead, cheeks and chin all show.",
  error_face_position_invalid: "Part of your face is cut off. Move back a little so your forehead, cheeks and chin all show.",
  error_lighting_dark: "The photo is too dark. Face a window or a bright, even light and try again.",
  error_insufficient_lighting: "The photo is too dark. Face a window or a bright, even light and try again.",
  error_below_min_image_size: "The photo is too small. Use your phone camera at normal quality.",
  error_exceed_max_image_size: "The photo is too large. Try again and we will shrink it first.",
  exceed_max_filesize: "The photo file is too big. Try again and we will shrink it first.",
  error_large_face_angle: "Your head is turned. Look straight at the camera.",
  error_face_angle_invalid: "Your head is turned. Look straight at the camera.",
  error_pose: "Your head is turned. Look straight at the camera.",
  error_multiple_people: "We see more than one face. Take the photo with only you in it.",
  error_nsfw_content_detected: "This photo cannot be analysed. Please use a plain face selfie.",
  error_decode_image: "We could not read that photo. Try a JPG or PNG.",
  CreditInsufficiency: "The skin check is out of analysis units right now. Please try again later.",
  rate_limited: "Too many checks in a short time. Please wait a few minutes.",
  daily_cap: "Today's free skin checks are used up. Please come back tomorrow.",
};

export class YouCamError extends Error {
  constructor(
    public code: string,
    public httpStatus = 502,
    detail?: string,
  ) {
    super(detail ? `${code}: ${detail}` : code);
    this.name = "YouCamError";
  }
  get userMessage(): string {
    return userMessageFor(this.code);
  }
}

export function userMessageFor(code: string | null | undefined): string {
  if (code && MESSAGES[code]) return MESSAGES[code];
  return "Something went wrong with the skin check. Please try again with a clear, well-lit selfie.";
}
