/**
 * ZEMSIS — Varsayılan uygulama değerleri
 * Daha önce App.jsx içindeydi, ayrı modüle taşındı.
 *
 * getDefaultParameters(method) — seçilen iyileştirme yöntemine göre
 * ilgili varsayılan parametreleri döndürür.
 */

import { IMPROVEMENT_METHODS } from './improvementMethods';

/**
 * Seçilen yönteme özgü varsayılan hesap parametrelerini döndürür.
 * Parametre seti her yöntemin `defaultParams` bloğundan gelir.
 * Bilinmeyen key için jet_grout değerleri kullanılır.
 * @param {string} method - İyileştirme yöntemi key'i
 * @returns {Object} Varsayılan parametre seti
 */
export function getDefaultParameters(method) {
  const found = IMPROVEMENT_METHODS.find(m => m.key === method);
  const base = found?.defaultParams ?? IMPROVEMENT_METHODS[0].defaultParams;
  // Zemin parametreleri her yöntemde ortak; sadece yöntem parametreleri değişir
  return {
    ...base,
    cu: 45,      // Drenajsız kayma mukavemeti (kPa) — zemine bağlı, sabit bırakıldı
    Es: 10,      // Zemin elastisite modülü (MPa)  — zemine bağlı
    qtemel: 120, // Temel basıncı (kPa)            — projeye bağlı
    Hkazi: 0,    // Kazı derinliği (m)
    gamma: 18,   // Birim hacim ağırlık (kN/m³)
  };
}

/** Backward compat: jet_grout varsayılanları (eski kodlar için) */
export const defaultParameters = {
  D: 0.6, s: 1.6, cu: 45, sigmaJet: 3.0, Es: 10, Ejg: 450,
  H: 12, qtemel: 120, qnet: 60, Fs: 2.0, FS: 1.5, alpha: 0.5, Nc: 5.14
};

export const defaultUnits = {
  sigmaJet: 'MPa', Es: 'MPa', Ejg: 'MPa', cu: 'kPa', qtemel: 'kPa', qnet: 'kPa'
};

export const defaultSoilLayers = [
  { id: 'layer-1', thickness: 5, soilType: 'kil', gamma: 18, phi: 15, cohesion: 80, elasticity: 25000, poisson: 0.3 }
];

export const defaultExtraParams = {
  foundationThickness: 0.5, fillHeight: 0, waterTable: 3
};

