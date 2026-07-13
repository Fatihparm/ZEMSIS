/**
 * ZEMSIS — Uygulama çevirileri (TR / EN)
 * Daha önce App.jsx içindeydi, ayrı modüle taşındı.
 */
const translations = {
  en: {
    title: 'ZEMSIS',
    subtitle: 'Ground Systems Design & Analysis Tool',
    geometry: {
      title: 'Column Geometry',
      diameter: 'Column Diameter',
      spacing: 'Column Spacing',
      height: 'Column Height',
      diameterTip: 'Jet grout column diameter',
      spacingTip: 'Grid spacing between columns',
      heightTip: 'Treatment depth / column length'
    },
    soil: {
      title: 'Soil Properties',
      cu: 'Undrained Cohesion (cu)',
      cuTip: 'Soil undrained shear strength',
      Es: 'Soil Elastic Modulus (Es)',
      EsTip: 'Soil elastic modulus',
      alpha: 'Adhesion Factor (a)',
      alphaTip: 'Shaft adhesion factor',
      Nc: 'Bearing Capacity Coefficient (Nc)',
      NcTip: 'Nc coefficient (typically 9 for clay)'
    },
    soilLayers: {
      title: 'Soil Layers',
      layer: 'Layer',
      thickness: 'Thickness',
      soilType: 'Soil Type',
      gamma: 'Unit Weight',
      phi: 'Friction Angle',
      cohesion: 'Cohesion',
      elasticity: 'Elastic Modulus',
      poisson: 'Poisson Ratio',
      addLayer: 'Add Layer',
      removeLayer: 'Remove Layer',
      totalDepth: 'Total Depth',
      depthWarning: 'Total depth exceeds 30m limit!',
      layerTable: 'Layer Analysis',
      depthRange: 'Depth Range',
      summary: 'Weighted Averages'
    },
    jetgrout: {
      title: 'Jet Grout Properties',
      strength: 'Jet Grout Strength (sjet)',
      strengthTip: 'Unconfined compressive strength of jet grout',
      modulus: 'Elastic Modulus (Ejg)',
      modulusTip: 'Jet grout elastic modulus (typically 150-500 MPa)',
      materialFs: 'Material Safety Factor (Fs)',
      materialFsTip: 'Safety factor for material design strength (typically 2.0)',
      bearingFS: 'Bearing Capacity Safety Factor (FS)',
      bearingFSTip: 'Safety factor for bearing capacity (typically 1.5)'
    },
    loading: {
      title: 'Loading Conditions',
      pressure: 'Foundation Pressure (qtemel)',
      pressureTip: 'Applied foundation pressure',
      netPressure: 'Net Pressure (qnet)',
      netPressureTip: 'Net pressure for settlement (leave empty to auto-calculate)'
    },
    results: {
      title: 'Calculation Results',
      geometry: 'Geometry',
      material: 'Material Parameters',
      capacity: 'Bearing Capacity',
      improvedSoil: 'Improved Soil',
      settlement: 'Settlement',
      noResults: 'No results yet.',
      enterParams: 'Enter parameters and click "Calculate".'
    },
    calculate: 'Calculate',
    calculating: 'Calculating...',
    apiError: 'Cannot connect to API. Is the backend running?',
    calcFailed: 'Calculation failed',
    footer: 'ZEMSIS v1.0 © 2026'
  },
  tr: {
    title: 'ZEMSIS',
    subtitle: 'Zemin Sistemleri Tasarım ve Analiz Aracı',
    geometry: {
      title: 'Kolon Geometrisi',
      diameter: 'Kolon Capi',
      spacing: 'Kolon Araligi',
      height: 'Kolon Yuksekligi',
      diameterTip: 'Jet grout kolon capi',
      spacingTip: 'Kolonlar arasi mesafe',
      heightTip: 'Iyilestirme derinligi / kolon boyu'
    },
    soil: {
      title: 'Zemin Ozellikleri',
      cu: 'Drenajsiz Kohezyon (cu)',
      cuTip: 'Zeminin drenajsiz kayma dayanimi',
      Es: 'Zemin Elastisite Modulu (Es)',
      EsTip: 'Zemin elastisite modulu',
      alpha: 'Aderans Faktoru (a)',
      alphaTip: 'Cevre surtunme faktoru',
      Nc: 'Tasima Kapasitesi Katsayisi (Nc)',
      NcTip: 'Nc katsayisi (kil icin genellikle 9)'
    },
    soilLayers: {
      title: 'Zemin Tabakalari',
      layer: 'Tabaka',
      thickness: 'Kalinlik',
      soilType: 'Zemin Tipi',
      gamma: 'Birim Hacim Agirlik',
      phi: 'Icsel Surtunme Acisi',
      cohesion: 'Kohezyon',
      elasticity: 'Elastisite Modulu',
      poisson: 'Poisson Orani',
      addLayer: 'Tabaka Ekle',
      removeLayer: 'Tabakayi Sil',
      totalDepth: 'Toplam Derinlik',
      depthWarning: 'Toplam derinlik 30m limitini asiyor!',
      layerTable: 'Katman Analizi',
      depthRange: 'Derinlik Araligi',
      summary: 'Agirlikli Ortalama Degerler'
    },
    jetgrout: {
      title: 'Jet Grout Ozellikleri',
      strength: 'Jet Grout Dayanimi (sjet)',
      strengthTip: 'Jet grout tek eksenli basinc dayanimi',
      modulus: 'Elastisite Modulu (Ejg)',
      modulusTip: 'Jet grout elastisite modulu (tipik 150-500 MPa)',
      materialFs: 'Malzeme Guvenlik Faktoru (Fs)',
      materialFsTip: 'Malzeme tasarim dayanimi icin guvenlik faktoru (genellikle 2.0)',
      bearingFS: 'Tasima Kapasitesi Guv. Fak. (FS)',
      bearingFSTip: 'Tasima kapasitesi icin guvenlik faktoru (genellikle 1.5)'
    },
    loading: {
      title: 'Yukleme Kosullari',
      pressure: 'Temel Basinci (qtemel)',
      pressureTip: 'Uygulanan temel basinci',
      netPressure: 'Net Basinc (qnet)',
      netPressureTip: 'Oturma hesabi icin net basinc (bos birakilirsa otomatik hesaplanir)'
    },
    results: {
      title: 'Hesap Sonuclari',
      geometry: 'Geometri',
      material: 'Malzeme Parametreleri',
      capacity: 'Tasima Kapasitesi',
      improvedSoil: 'Iyilestirilmis Zemin',
      settlement: 'Oturma',
      noResults: 'Henuz sonuc yok.',
      enterParams: 'Parametreleri girin ve "Hesapla" butonuna tiklayin.'
    },
    calculate: 'Hesapla',
    calculating: 'Hesaplaniyor...',
    apiError: "API'ye baglanilamiyor. Backend calisiyor mu?",
    calcFailed: 'Hesaplama basarisiz',
    footer: 'ZEMSIS v1.0 © 2026'
  }
};

export default translations;
