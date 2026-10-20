"use client";
/**
 * Prepares a photo in the browser before upload: fixes orientation, scales so
 * the long side is at most `maxSide`, and re-encodes as JPEG (YouCam's
 * Fitzpatrick analysis only accepts JPEG; skin analysis needs short side >= 480).
 */
export interface PreparedImage {
  blob: Blob;
  width: number;
  height: number;
  dataUrl: string;
}

export async function prepareImage(file: File, maxSide = 2048, quality = 0.9): Promise<PreparedImage> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unavailable");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode failed"))), "image/jpeg", quality),
  );
  return { blob, width, height, dataUrl: canvas.toDataURL("image/jpeg", 0.7) };
}

export const MIN_SHORT_SIDE = 480;
