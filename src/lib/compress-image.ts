import { LIMITS } from "@/lib/constants";

function jpegName(name: string) {
  const base = name.replace(/\.[^.]+$/, "").trim() || "photo";
  return `${base}.jpg`;
}

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Could not process that image."));
      },
      "image/jpeg",
      quality,
    );
  });
}

async function decodeImage(file: File) {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    const url = URL.createObjectURL(file);
    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const element = new Image();
        element.onload = () => resolve(element);
        element.onerror = () => reject(new Error("Could not read that image."));
        element.src = url;
      });
      return await createImageBitmap(image);
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

export async function compressImage(file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error("Use a JPG, PNG, WebP, or GIF image.");
  }
  const bitmap = await decodeImage(file);
  try {
    const scale = Math.min(
      1,
      LIMITS.avatarMaxEdge / Math.max(bitmap.width, bitmap.height),
    );
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not process that image.");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(bitmap, 0, 0, width, height);

    let quality = 0.84;
    let blob = await canvasToJpeg(canvas, quality);
    while (blob.size > LIMITS.avatarTargetBytes && quality > 0.5) {
      quality -= 0.12;
      blob = await canvasToJpeg(canvas, quality);
    }
    if (
      blob.size >= file.size &&
      (file.type === "image/jpeg" || file.type === "image/jpg") &&
      scale === 1
    ) {
      return file;
    }
    return new File([blob], jpegName(file.name), {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } finally {
    bitmap.close();
  }
}
