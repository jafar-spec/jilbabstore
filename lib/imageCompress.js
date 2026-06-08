// Compress an image File to a webp data URL before upload, to keep payloads
// small. Browser-only (uses canvas/FileReader).
export const compressImage = (file, maxWidth = 1800, maxHeight = 1800, quality = 0.92) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; }
        } else {
          if (height > maxHeight) { width *= maxHeight / height; height = maxHeight; }
        }
        canvas.width = Math.round(width);
        canvas.height = Math.round(height);
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/webp', quality)); // high-quality webp
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });
};
