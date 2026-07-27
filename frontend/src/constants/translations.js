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
      title: 'Analysis Results',
      geometry: 'Geometry',
      material: 'Material Parameters',
      capacity: 'Bearing Capacity',
      improvedSoil: 'Improved Soil',
      settlement: 'Settlement',
      soilProfile: 'Soil Profile',
      noResults: 'No analysis yet.',
      enterParams: 'Go to the "Parameters" tab, fill in the values, then click "Run Analysis" here.',
      soilProfileUsed: 'Soil profile applied (cu, Es, γ from layers)',
      paramsSummary: 'Parameters Used in Analysis',
      soilProfileSection: 'Soil Profile Analysis'
    },
    calculate: 'Calculate',
    calculating: 'Calculating...',
    analyze: 'Run Analysis',
    analyzing: 'Analyzing...',
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
      title: 'Analiz Sonuclari',
      geometry: 'Geometri',
      material: 'Malzeme Parametreleri',
      capacity: 'Tasima Kapasitesi',
      improvedSoil: 'Iyilestirilmis Zemin',
      settlement: 'Oturma',
      soilProfile: 'Zemin Profili',
      noResults: 'Henuz analiz yapilmadi.',
      enterParams: '"Parametreler" tabindan degerleri girin, sonra buradan "Analiz Et" butonuna tiklayin.',
      soilProfileUsed: 'Zemin profili kullanildi (cu, Es, γ katmanlardan alindi)',
      paramsSummary: 'Analizde Kullanilan Parametreler',
      soilProfileSection: 'Zemin Profili Analizi'
    },
    calculate: 'Hesapla',
    calculating: 'Hesaplaniyor...',
    analyze: 'Analiz Et',
    analyzing: 'Analiz Ediliyor...',
    apiError: "API'ye baglanilamiyor. Backend calisiyor mu?",
    calcFailed: 'Hesaplama basarisiz',
    footer: 'ZEMSIS v1.0 © 2026'
  }
};

export default translations;
