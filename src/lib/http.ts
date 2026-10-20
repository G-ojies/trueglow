import "server-only";
import { YouCamError } from "@/lib/youcam/errors";

export function jsonError(err: unknown) {
  if (err instanceof YouCamError) {
    console.warn("[youcam]", err.message);
    return Response.json({ error: err.code, message: err.userMessage }, { status: err.httpStatus });
  }
  console.error(err);
  return Response.json(
    { error: "internal", message: "Something went wrong on our side. Please try again." },
    { status: 500 },
  );
}

export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png"] as const;
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024 - 1;

/** Read and check an uploaded image from multipart form data. */
export async function readImage(form: FormData, field = "image") {
  const file = form.get(field);
  if (!(file instanceof File)) throw new YouCamError("invalid_parameter", 400, "image missing");
  if (!(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    throw new YouCamError("error_decode_image", 400, `type ${file.type}`);
  }
  if (file.size === 0 || file.size > MAX_IMAGE_BYTES) throw new YouCamError("exceed_max_filesize", 400);
  const bytes = new Uint8Array(await file.arrayBuffer());
  return { bytes, type: file.type, name: file.name || "selfie.jpg" };
}
