/**
 * useAutoSave — localStorage auto-save hook
 *
 * Verilen veriyi 1.5 saniye debounce ile localStorage'a kaydeder.
 * Daha önce App.jsx içindeki AUTOSAVE_KEY, loadAutosave, saveAutosave
 * ve useEffect burada toplanmıştır.
 */
import { useEffect, useRef } from 'react';

export const AUTOSAVE_KEY = 'zemsis_autosave';

export function loadAutosave() {
  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearAutosave() {
  try {
    localStorage.removeItem(AUTOSAVE_KEY);
  } catch {
    // sessizce geç
  }
}

function saveAutosave(data) {
  try {
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(data));
  } catch {
    // localStorage dolu veya erişilemez — sessizce geç
  }
}

/**
 * @param {{ parameters, soilLayers, units, extraParams }} data — kaydedilecek veri
 * @param {number} [delay=1500] — debounce süresi (ms)
 */
export function useAutoSave(data, delay = 1500) {
  const timerRef = useRef(null);
  const { parameters, soilLayers, units, extraParams } = data;

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      saveAutosave({ parameters, soilLayers, units, extraParams });
    }, delay);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [parameters, soilLayers, units, extraParams, delay]);
}
