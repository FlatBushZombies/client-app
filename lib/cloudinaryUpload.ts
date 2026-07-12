const CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

export type UploadedFile = {
  url: string;
  name: string;
};

function guessFileName(uri: string, fallback: string) {
  const segment = uri.split("/").pop();
  return segment && segment.length > 0 ? segment : fallback;
}

/**
 * Uploads a local file (photo or document) straight to Cloudinary from the
 * device using an unsigned upload preset — no backend involvement needed.
 * Requires EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME / EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET
 * in .env (see Cloudinary dashboard: Settings -> Upload -> Upload presets,
 * signing mode "Unsigned").
 */
export async function uploadToCloudinary(
  fileUri: string,
  options: { mimeType?: string; fileName?: string; resourceType?: "image" | "auto" } = {}
): Promise<UploadedFile> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error(
      "Cloudinary is not configured. Set EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME and EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET in .env."
    );
  }

  const resourceType = options.resourceType || "auto";
  const fileName = options.fileName || guessFileName(fileUri, "upload");

  const formData = new FormData();
  formData.append("file", {
    uri: fileUri,
    name: fileName,
    type: options.mimeType || "application/octet-stream",
  } as unknown as Blob);
  formData.append("upload_preset", UPLOAD_PRESET);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`,
    {
      method: "POST",
      body: formData,
    }
  );

  const data = await response.json();
  if (!response.ok || !data.secure_url) {
    throw new Error(data?.error?.message || "Failed to upload file");
  }

  return { url: data.secure_url as string, name: fileName };
}
