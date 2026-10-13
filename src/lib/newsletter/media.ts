export const NEWSLETTER_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif,image/avif,image/bmp,.jpg,.jpeg,.png,.webp,.gif,.avif,.bmp";
export const MAX_SOURCE_BYTES = 20 * 1024 * 1024;
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

/** Decode before uploading: unsupported/corrupt files must never become broken images. */
export async function prepareNewsletterImage(file: File): Promise<File> {
  if (!file.size) throw new Error("Ce fichier est vide.");
  if (file.size > MAX_SOURCE_BYTES) throw new Error("Image trop volumineuse : maximum 20 Mo.");
  if (!/\.(jpe?g|png|webp|gif|avif|bmp)$/i.test(file.name) && !/^image\/(jpeg|png|webp|gif|avif|bmp)$/.test(file.type)) {
    throw new Error("Utilisez une image JPG, PNG, WebP, GIF, AVIF ou BMP. Exportez les PDF et les photos HEIC en JPG ou PNG.");
  }
  const objectUrl = URL.createObjectURL(file);
  const image = new Image();
  try {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Lecture de l’image trop longue. Réessayez avec une image JPG ou PNG.")), 15_000);
      image.onload = () => { clearTimeout(timer); resolve(); };
      image.onerror = () => { clearTimeout(timer); reject(new Error("Image illisible. Exportez-la en JPG ou PNG puis réessayez.")); };
      image.src = objectUrl;
    });
    const scale = Math.min(1, 2400 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    try {
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Votre navigateur ne peut pas préparer cette image.");
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(
        (result) => result ? resolve(result) : reject(new Error("Conversion de l’image impossible.")),
        "image/jpeg", 0.9,
      ));
      if (blob.size > MAX_UPLOAD_BYTES) throw new Error("Cette image reste trop lourde. Réduisez sa résolution puis réessayez.");
      return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.jpg`, { type: "image/jpeg" });
    } finally {
      canvas.width = 0;
      canvas.height = 0;
    }
  } finally {
    image.onload = null;
    image.onerror = null;
    image.src = "";
    URL.revokeObjectURL(objectUrl);
  }
}

export async function uploadNewsletterImage(file: File) {
  const prepared = await prepareNewsletterImage(file);
  const form = new FormData();
  form.append("file", prepared);
  const response = await fetch("/api/uploads/attachment", {
    method: "POST", body: form, signal: AbortSignal.timeout(60_000),
  });
  const data = await response.json().catch(() => ({})) as { url?: string; error?: string };
  if (response.status === 401) throw new Error("Votre session a expiré. Reconnectez-vous pour ajouter des images.");
  if (response.status === 413) throw new Error("Image refusée car trop volumineuse. Réduisez sa résolution.");
  if (!response.ok || !data.url) throw new Error(data.error || "Envoi impossible. Vérifiez votre connexion puis réessayez.");
  return { id: crypto.randomUUID(), url: data.url, name: file.name };
}

/** Sequential uploads bound memory usage and preserve partial successes. */
export async function uploadNewsletterBatch<T>(
  files: File[],
  upload: (file: File) => Promise<T>,
  onSuccess: (result: T) => void,
  onProgress: (completed: number, total: number) => void,
) {
  const errors: string[] = [];
  for (const [index, file] of files.entries()) {
    onProgress(index, files.length);
    try {
      onSuccess(await upload(file));
    } catch (error) {
      errors.push(`${file.name} : ${error instanceof Error ? error.message : "Envoi impossible."}`);
    }
    onProgress(index + 1, files.length);
  }
  return errors;
}
