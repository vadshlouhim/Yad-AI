export type PhotoCaptionSource = {
  id: string;
  caption?: string;
  captionGroup?: string;
  groupCaption?: string;
};

export function individualPhotoCaptions(images: PhotoCaptionSource[]) {
  return images.flatMap((image) => image.caption?.trim()
    ? [{ imageId: image.id, text: image.caption }]
    : []);
}

export function endingPhotoGroupCaption(images: PhotoCaptionSource[], following?: PhotoCaptionSource) {
  const last = images.at(-1);
  if (!last?.captionGroup || following?.captionGroup === last.captionGroup || !last.groupCaption?.trim()) return null;
  return { groupId: last.captionGroup, text: last.groupCaption };
}
