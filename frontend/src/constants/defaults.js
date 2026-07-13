/**
 * ZEMSIS — Varsayılan uygulama değerleri
 * Daha önce App.jsx içindeydi, ayrı modüle taşındı.
 */

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
