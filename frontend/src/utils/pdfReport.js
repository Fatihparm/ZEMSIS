// --- Hidden JSON magic marker ---
const MAGIC_MARKER = "___JGC_PROJECT_DATA___";

/**
 * Utility to read the hidden JSON from an uploaded PDF
 */
export async function parsePdfReport(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const textDecoder = new TextDecoder('utf-8');
        const text = textDecoder.decode(e.target.result);

        const markerIndex = text.lastIndexOf(MAGIC_MARKER);
        if (markerIndex === -1) {
          throw new Error('No JGC Project Data found in this PDF. Or file is corrupted.');
        }

        // Extract JSON string after marker
        const jsonString = text.substring(markerIndex + MAGIC_MARKER.length).trim();
        const projectData = JSON.parse(jsonString);

        resolve(projectData);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('File read failed'));
    reader.readAsArrayBuffer(file);
  });
}
