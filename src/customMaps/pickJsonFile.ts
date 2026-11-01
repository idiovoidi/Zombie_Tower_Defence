/**
 * Open a native file picker for a JSON file and resolve with its text,
 * or null if the user cancels (or no DOM is available).
 */
export function pickJsonFileText(): Promise<string | null> {
  return new Promise((resolve, reject) => {
    if (typeof document === 'undefined') {
      resolve(null);
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.style.display = 'none';
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      document.body.removeChild(input);
      if (!file) {
        resolve(null);
        return;
      }
      file.text().then(resolve).catch(reject);
    });
    document.body.appendChild(input);
    input.click();
  });
}
