/**
 * ZEMSIS — İyileştirme Yöntemi Sabitleri
 *
 * Tüm desteklenen zemin iyileştirme yöntemlerinin merkezi tanımı.
 * Key, label (TR/EN), ikon, badge rengi ve yöntem bazlı varsayılan
 * hesap parametreleri burada tutulur.
 *
 * Parametre kaynakları:
 *  - Jet Grout : BS EN 12716:2018 / Shibazaki (1996) — Nc=5.14 (Prandtl), EjgMultiplier=300
 *  - Taş Kolon : Priebe (1995) / FHWA GEC-13 (2022) — Nc=5.14, Fs=3.0 (granüler dolgu)
 *  - Kazık     : FHWA NHI-16-009 (2016) — Nc=9.0 (derin temel), alpha=0.45 (Tomlinson)
 *  - DSM       : Bruce et al. (2013) / CDIT (2002) — EjgMultiplier=500, Fs=2.5
 */

export const IMPROVEMENT_METHODS = [
  {
    key: 'jet_grout',
    labelTR: 'Jet Grout',
    labelEN: 'Jet Grouting',
    icon: '💉',
    color: '#1565c0',       // Mavi
    bgColor: '#e3f2fd',
    borderColor: '#90caf9',
    /**
     * Varsayılan hesap parametreleri — Jet Grout
     * Kaynak: BS EN 12716:2018, Shibazaki (1996)
     */
    defaultParams: {
      D: 0.6,              // Kolon çapı (m)
      s: 1.6,              // Kolon aralığı (m)
      H: 12,               // Kolon boyu (m)
      sigmaJet: 3.0,       // Jet grout basınç dayanımı (MPa)
      Fs: 2.0,             // Malzeme güvenlik katsayısı (σjet/Fs)
      FS_shaft: 1.5,       // Çevre sürtünme güvenlik katsayısı
      FS_endbearing: 2.0,  // Uç taşıma güvenlik katsayısı
      FS_improved: 2.5,    // İyileştirilmiş zemin güvenlik katsayısı
      alpha: 0.5,          // Adezyon faktörü (Tomlinson — orta kil)
      Nc: 5.14,            // Taşıma kapasitesi faktörü (Prandtl/Skempton)
      EjgMultiplier: 300,  // Ejg = 300 × σjet_tasarım (Shibazaki 1996)
    },
  },
  {
    key: 'stone_column',
    labelTR: 'Taş Kolon',
    labelEN: 'Stone Column',
    icon: '🪨',
    color: '#2e7d32',       // Yeşil
    bgColor: '#e8f5e9',
    borderColor: '#a5d6a7',
    /**
     * Varsayılan hesap parametreleri — Taş Kolon
     * Kaynak: Priebe (1995), FHWA GEC-13 (2022)
     * Taş kolon dolgusu granüler: alpha daha düşük, Fs daha yüksek.
     * EjgMultiplier: kolon rijitliği (E_kolon ≈ 100×σ_tasarım tipik kum/çakıl dolgu)
     */
    defaultParams: {
      D: 0.8,              // Kolon çapı (m) — tipik: 0.6–1.2 m
      s: 2.0,              // Kolon aralığı (m)
      H: 10,               // Kolon boyu (m)
      sigmaJet: 0.5,       // Kolon malzeme dayanımı (MPa) — granüler dolgu
      Fs: 3.0,             // Malzeme güvenlik katsayısı (granüler dolgu)
      FS_shaft: 2.0,       // Çevre sürtünme güvenlik katsayısı
      FS_endbearing: 3.0,  // Uç taşıma güvenlik katsayısı
      FS_improved: 3.0,    // İyileştirilmiş zemin güvenlik katsayısı
      alpha: 0.3,          // Adezyon faktörü (düşük — granüler–kil arayüzü)
      Nc: 5.14,            // Taşıma kapasitesi faktörü (Prandtl)
      EjgMultiplier: 100,  // Esdeğer kolon rijitliği çarpanı (granüler dolgu)
    },
  },
  {
    key: 'pile',
    labelTR: 'Kazık',
    labelEN: 'Pile',
    icon: '🏗️',
    color: '#e65100',       // Turuncu
    bgColor: '#fff3e0',
    borderColor: '#ffcc80',
    /**
     * Varsayılan hesap parametreleri — Kazık (sürme/fore)
     * Kaynak: FHWA NHI-16-009 (2016), Tomlinson & Woodward (2014)
     * Derin temel: Nc=9.0 (clay, deep limit), alpha=0.45 (Tomlinson orta-yüksek Cu)
     */
    defaultParams: {
      D: 0.5,              // Kazık çapı (m)
      s: 2.5,              // Kazık aralığı (m)
      H: 15,               // Kazık boyu (m)
      sigmaJet: 25.0,      // Beton/kazık dayanımı (MPa) — C25/30
      Fs: 2.0,             // Malzeme güvenlik katsayısı
      FS_shaft: 1.5,       // Çevre sürtünme güvenlik katsayısı
      FS_endbearing: 2.5,  // Uç taşıma güvenlik katsayısı (derin temel)
      FS_improved: 2.5,    // İyileştirilmiş zemin güvenlik katsayısı
      alpha: 0.45,         // Adezyon faktörü (Tomlinson — fore kazık, orta-yüksek Cu)
      Nc: 9.0,             // Taşıma kapasitesi faktörü (derin temel limiti, FHWA)
      EjgMultiplier: 1000, // Beton E modülü çarpanı (E_beton ≈ 1000×σ_tasarım)
    },
  },
  {
    key: 'dsm',
    labelTR: 'DSM',
    labelEN: 'DSM',
    icon: '🧱',
    color: '#6a1b9a',       // Mor
    bgColor: '#f3e5f5',
    borderColor: '#ce93d8',
    /**
     * Varsayılan hesap parametreleri — DSM (Derin Zemin Karıştırma)
     * Kaynak: Bruce et al. (2013), CDIT (2002), EuroSoilStab (2002)
     * DSM soilcrete daha rijit: EjgMultiplier=500, Fs=2.5 (homojenlik belirsizliği)
     */
    defaultParams: {
      D: 0.6,              // Kolon çapı (m)
      s: 1.5,              // Kolon aralığı (m)
      H: 10,               // Kolon boyu (m)
      sigmaJet: 1.0,       // DSM dayanımı (MPa) — tipik UCS hedefi
      Fs: 2.5,             // Malzeme güvenlik katsayısı (DSM homojenliği)
      FS_shaft: 1.5,       // Çevre sürtünme güvenlik katsayısı
      FS_endbearing: 2.5,  // Uç taşıma güvenlik katsayısı
      FS_improved: 3.0,    // İyileştirilmiş zemin güvenlik katsayısı
      alpha: 0.5,          // Adezyon faktörü (jet grout ile benzer)
      Nc: 5.14,            // Taşıma kapasitesi faktörü (Prandtl)
      EjgMultiplier: 500,  // E = 500 × σ_tasarım (Bruce et al. 2013, DSM soilcrete)
    },
  },
];

/**
 * Key'e göre yöntem nesnesini döndürür. Bulunamazsa jet_grout döner.
 * @param {string} key
 * @returns {typeof IMPROVEMENT_METHODS[0]}
 */
export function getMethodByKey(key) {
  return IMPROVEMENT_METHODS.find(m => m.key === key) ?? IMPROVEMENT_METHODS[0];
}

/**
 * Key'e göre dile uygun etiketi döndürür.
 * @param {string} key
 * @param {boolean} tr
 * @returns {string}
 */
export function getMethodLabel(key, tr = true) {
  const method = getMethodByKey(key);
  return tr ? method.labelTR : method.labelEN;
}
