import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { staffStorage } from './firebase';

// Upload a (compressed) data-URL image to Firebase Storage and return its
// public download URL. Pass-through if it's already a URL. Keeps large Base64
// blobs OUT of Firestore documents.
export async function uploadDataUrl(dataUrl, folder = 'products') {
  if (!dataUrl) return null;
  if (!dataUrl.startsWith('data:')) return dataUrl; // already a hosted URL
  try {
    const mime = dataUrl.substring(dataUrl.indexOf(':') + 1, dataUrl.indexOf(';')) || 'image/webp';
    const ext = (mime.split('/')[1] || 'webp').replace('+xml', '');
    const name = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 9)}.${ext}`;
    const storageRef = ref(staffStorage, name);
    await uploadString(storageRef, dataUrl, 'data_url');
    return await getDownloadURL(storageRef);
  } catch (e) {
    // Storage not enabled yet (or upload failed) — fall back to the inline
    // data URL so product/CMS editing keeps working. Once Firebase Storage is
    // enabled in the console, uploads automatically switch to hosted URLs.
    console.warn('Storage upload failed; using inline image as fallback.', e?.message || e);
    return dataUrl;
  }
}
