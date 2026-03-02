/**
 * Jet Grout Calculation Service
 * Contains all formulas for Jet Grouting calculations
 */

// ============================================
// 1. COLUMN GEOMETRY AND AREA RATIO
// ============================================

/**
 * Calculate Jet Grout Column Area
 * Ajet = π·D²/4
 * @param {number} D - Column diameter (m)
 * @returns {number} Column area (m²)
 */
function calculateColumnArea(D) {
    return (Math.PI * Math.pow(D, 2)) / 4;
}

/**
 * Calculate Area Replacement Ratio
 * a = Ajet/s²
 * @param {number} Ajet - Column area (m²)
 * @param {number} s - Column spacing (m)
 * @returns {number} Area replacement ratio (dimensionless)
 */
function calculateAreaRatio(Ajet, s) {
    return Ajet / Math.pow(s, 2);
}

// ============================================
// 2. SINGLE COLUMN BEARING CAPACITY
// ============================================

/**
 * Calculate Column Shaft Friction Capacity
 * Qs = α · cu · π · D · H
 * @param {number} alpha - Adhesion factor (typically 0.3-1.0)
 * @param {number} cu - Undrained cohesion (kPa)
 * @param {number} D - Column diameter (m)
 * @param {number} H - Column height/depth (m)
 * @returns {number} Shaft friction capacity (kN)
 */
function calculateShaftCapacity(alpha, cu, D, H) {
    return alpha * cu * Math.PI * D * H;
}

/**
 * Calculate Column End Bearing Capacity
 * Qu = Nc · cu · Ap
 * @param {number} Nc - Bearing capacity factor (typically 9 for clay)
 * @param {number} cu - Undrained cohesion (kPa)
 * @param {number} Ap - Column base area (m²)
 * @returns {number} End bearing capacity (kN)
 */
function calculateEndBearing(Nc, cu, Ap) {
    return Nc * cu * Ap;
}

/**
 * Calculate Jet Grout Column Safe Capacity
 * Qemn = Qu/(γRsb) + Qs/(γRu)
 * @param {number} Qu - End bearing capacity (kN)
 * @param {number} Qs - Shaft capacity (kN)
 * @param {number} gammaRsb - Partial factor for base resistance (typically 1.4)
 * @param {number} gammaRu - Partial factor for shaft resistance (typically 1.4)
 * @returns {number} Safe bearing capacity (kN)
 */
function calculateSafeCapacity(Qu, Qs, gammaRsb = 1.4, gammaRu = 1.4) {
    return (Qu / gammaRsb) + (Qs / gammaRu);
}

/**
 * Calculate Column Compressive Capacity
 * Qbasınç = σjet_tasarım · Ab
 * @param {number} sigmaJetDesign - Design compressive strength (kPa)
 * @param {number} Ab - Column base area (m²)
 * @returns {number} Compressive capacity (kN)
 */
function calculateCompressiveCapacity(sigmaJetDesign, Ab) {
    return sigmaJetDesign * Ab;
}

// ============================================
// 3. JET GROUT MATERIAL PARAMETERS
// ============================================

/**
 * Calculate Design Compressive Strength
 * σjet_tasarım = σjet/Fs
 * @param {number} sigmaJet - Jet grout compressive strength (kPa)
 * @param {number} Fs - Factor of safety
 * @returns {number} Design compressive strength (kPa)
 */
function calculateDesignStrength(sigmaJet, Fs) {
    return sigmaJet / Fs;
}

/**
 * Calculate Jet Grout Elastic Modulus
 * Ejg = 300 · σjet_tasarım
 * @param {number} sigmaJetDesign - Design compressive strength (kPa)
 * @returns {number} Elastic modulus (kPa)
 */
function calculateJetGroutModulus(sigmaJetDesign) {
    return 300 * sigmaJetDesign;
}

/**
 * Calculate Jet Grout Cohesion
 * cjet = σjet_tasarım · 0.4
 * @param {number} sigmaJetDesign - Design compressive strength (kPa)
 * @returns {number} Jet grout cohesion (kPa)
 */
function calculateJetGroutCohesion(sigmaJetDesign) {
    return sigmaJetDesign * 0.4;
}

// ============================================
// 4. SINGLE COLUMN LOAD
// ============================================

/**
 * Calculate Maximum Load on Single Column
 * Qkolon = qtemel·s² / [1 + (Es/Ejg)·(s²/Ajet - 1)]
 * or equivalently: qtemel·Ajet / [a + (Es/Ejg)·(1-a)]
 * @param {number} qtemel - Foundation pressure (kPa)
 * @param {number} Ajet - Column area (m²)
 * @param {number} a - Area replacement ratio
 * @param {number} Es - Soil elastic modulus (kPa)
 * @param {number} Ejg - Jet grout elastic modulus (kPa)
 * @returns {number} Maximum column load (kN)
 */
function calculateColumnLoad(qtemel, Ajet, a, Es, Ejg) {
    const denominator = a + (Es / Ejg) * (1 - a);
    return (qtemel * Ajet) / denominator;
}

/**
 * Calculate soil stress share
 * qzemin = qtemel·(1-a)·Es / (a·Ejg + (1-a)·Es)
 * @param {number} qtemel - Foundation pressure (kPa)
 * @param {number} a - Area replacement ratio
 * @param {number} Es - Soil elastic modulus (kPa)
 * @param {number} Ejg - Jet grout elastic modulus (kPa)
 * @returns {number} Soil stress share (kPa)
 */
function calculateSoilStress(qtemel, a, Es, Ejg) {
    return qtemel * (1 - a) * Es / (a * Ejg + (1 - a) * Es);
}

// ============================================
// 5. IMPROVED SOIL PARAMETERS
// ============================================

/**
 * Calculate Improved Soil Cohesion
 * cu_iyileştirilmiş = a·cjet + (1-a)·cu
 * @param {number} a - Area replacement ratio
 * @param {number} cjet - Jet grout cohesion (kPa)
 * @param {number} cu - Original soil undrained cohesion (kPa)
 * @returns {number} Improved soil cohesion (kPa)
 */
function calculateImprovedCohesion(a, cjet, cu) {
    return a * cjet + (1 - a) * cu;
}

/**
 * Calculate Improved Soil Safe Bearing Capacity
 * qemn_iyileştirilmiş = cu_iyileştirilmiş·Nc/FS
 * @param {number} cuImproved - Improved soil cohesion (kPa)
 * @param {number} Nc - Bearing capacity factor
 * @param {number} FS - Factor of safety
 * @returns {number} Safe bearing capacity (kPa)
 */
function calculateImprovedBearingCapacity(cuImproved, Nc, FS) {
    return (cuImproved * Nc) / FS;
}

/**
 * Calculate Improved Soil Elastic Modulus
 * E_iyileştirilmiş = Ejg·a + Es·(1-a)
 * @param {number} Ejg - Jet grout elastic modulus (kPa)
 * @param {number} a - Area replacement ratio
 * @param {number} Es - Soil elastic modulus (kPa)
 * @returns {number} Improved elastic modulus (kPa)
 */
function calculateImprovedModulus(Ejg, a, Es) {
    return Ejg * a + Es * (1 - a);
}

// ============================================
// 6. SETTLEMENT ANALYSIS
// ============================================

/**
 * Calculate Post-Improvement Settlement
 * δ_iyileştirilmiş = qnet·L_iyileştirilmiş / E_iyileştirilmiş
 * @param {number} qnet - Net foundation pressure (kPa)
 * @param {number} L - Improved layer thickness (m)
 * @param {number} Eimproved - Improved elastic modulus (kPa)
 * @returns {number} Settlement (m)
 */
function calculateSettlement(qnet, L, Eimproved) {
    return (qnet * L) / Eimproved;
}

// ============================================
// 7. OTHER GEOTECHNICAL PARAMETERS
// ============================================

/**
 * Calculate Subgrade Modulus (Bowles)
 * kv = G.S. × 40 × qt
 * @param {number} GS - Safety factor
 * @param {number} qt - Cone resistance (kPa)
 * @returns {number} Subgrade modulus (kN/m³)
 */
function calculateSubgradeModulus(GS, qt) {
    return GS * 40 * qt;
}

/**
 * Calculate Design Friction Resistance (Cohesive Soils)
 * Rth = Ac·Cu / (γ·Rh)
 * @param {number} Ac - Column area (m²)
 * @param {number} Cu - Undrained cohesion (kPa)
 * @param {number} gamma - Unit weight (kN/m³)
 * @param {number} Rh - Reduction factor
 * @returns {number} Design friction resistance (kN)
 */
function calculateFrictionResistance(Ac, Cu, gamma, Rh) {
    return (Ac * Cu) / (gamma * Rh);
}

// ============================================
// MAIN CALCULATION FUNCTION
// ============================================

/**
 * Perform all Jet Grout calculations
 * @param {Object} input - Input parameters
 * @returns {Object} All calculation results
 */
function calculateAll(input, lang = 'en') {
    const {
        D,           // Column diameter (m)
        s,           // Column spacing (m)
        cu,          // Undrained cohesion (kPa)
        sigmaJet,    // Jet grout strength (kPa) - σjet
        Es,          // Soil elastic modulus (kPa)
        H,           // Column height (m)
        qtemel,      // Foundation pressure (kPa)
        Fs = 2.0,    // Material Safety Factor (for design strength: σjet/Fs)
        FS_shaft = 1.5,     // Safety factor for shaft capacity (Qs/FS)
        FS_endbearing = 2.0, // Safety factor for end bearing (Qu/FS)
        FS_improved = 2.5,   // Safety factor for improved bearing capacity
        alpha = 0.5, // Adhesion factor
        Nc = 5.14,   // Bearing capacity factor (Skempton/Prandtl)
        EjgMultiplier = 300, // Ejg = EjgMultiplier × σjet_tasarım
        Hkazi = 0,   // Pile embedment depth for settlement (m)
        gamma = 18,  // Unit weight for settlement (kN/m³)
        qtemelStatik, // Static foundation pressure for settlement (kPa)
        // Legacy support
        FS,          // Old single FS parameter
        Ejg: EjgInput, // Direct Ejg input (legacy)
        qnet: qnetInput // Direct qnet input (legacy)
    } = input;

    // Legacy: if old single FS is provided, use it for all
    const fsShaft = input.FS_shaft || FS || 1.5;
    const fsEndbearing = input.FS_endbearing || FS || 2.0;
    const fsImproved = input.FS_improved || FS || 2.5;

    // 1. Geometry
    const Ajet = calculateColumnArea(D);
    const a = calculateAreaRatio(Ajet, s);

    // 2. Material Parameters (using Fs - Material Safety Factor)
    const sigmaJetDesign = calculateDesignStrength(sigmaJet, Fs);
    const cjet = calculateJetGroutCohesion(sigmaJetDesign);

    // Ejg: use direct input if provided, otherwise calculate
    const Ejg = EjgInput || (EjgMultiplier * sigmaJetDesign);

    // 3. Single Column Capacity
    const Qs_raw = calculateShaftCapacity(alpha, cu, D, H);
    const Qs_safe = Qs_raw / fsShaft;
    const Qu_raw = calculateEndBearing(Nc, cu, Ajet);
    const Qu_safe = Qu_raw / fsEndbearing;
    const Qcrush = calculateCompressiveCapacity(sigmaJetDesign, Ajet);

    // Qkolon limit = Qsemn + Quemn
    const Qkolon_limit = Qs_safe + Qu_safe;

    // 4. Column Load
    const Qkolon = calculateColumnLoad(qtemel, Ajet, a, Es, Ejg);
    const kolonSafe = Qkolon < Qkolon_limit;

    // 5. Soil stress share
    const qzemin = calculateSoilStress(qtemel, a, Es, Ejg);

    // 6. Improved Soil Parameters
    const cuImproved = calculateImprovedCohesion(a, cjet, cu);
    const qemnImproved = calculateImprovedBearingCapacity(cuImproved, Nc, fsImproved);
    const Eimproved = calculateImprovedModulus(Ejg, a, Es);
    const improvedSafe = qemnImproved > qtemel;

    // 7. Settlement
    // qnet = qtemel_statik - γ·Hkazı (or direct input)
    const qtemelForSettlement = qtemelStatik || qtemel;
    const qkazi = gamma * Hkazi;
    const qnetValue = qnetInput || (qtemelForSettlement - qkazi);
    const settlement = calculateSettlement(qnetValue, H, Eimproved);
    const settlementMm = settlement * 1000;
    const settlementCm = settlement * 100;

    // Dil desteği
    const tr = lang === 'tr';

    return {
        input: {
            D, s, cu, sigmaJet, Es, Ejg, H, qtemel, qnet: qnetValue,
            Fs, FS_shaft: fsShaft, FS_endbearing: fsEndbearing, FS_improved: fsImproved,
            alpha, Nc, EjgMultiplier, Hkazi, gamma
        },

        geometry: {
            Ajet: { value: Ajet, unit: 'm²', description: tr ? 'Kolon Alanı' : 'Column Area' },
            a: { value: a, unit: '-', description: tr ? 'Alan İyileştirme Oranı' : 'Area Replacement Ratio' },
            aPercent: { value: a * 100, unit: '%', description: tr ? 'Alan İyileştirme Oranı' : 'Area Replacement Ratio' }
        },

        material: {
            sigmaJetDesign: { value: sigmaJetDesign, unit: 'kPa', description: tr ? 'Tasarım Basınç Dayanımı' : 'Design Compressive Strength' },
            Ejg: { value: Ejg, unit: 'kPa', description: tr ? 'Jet Grout Elastisite Modülü' : 'Jet Grout Elastic Modulus' },
            cjet: { value: cjet, unit: 'kPa', description: tr ? 'Jet Grout Kohezyonu' : 'Jet Grout Cohesion' }
        },

        capacity: {
            Qs_raw: { value: Qs_raw, unit: 'kN', description: tr ? 'Çevre Sürtünme Kapasitesi (Qs)' : 'Skin Friction Capacity (Qs)' },
            Qs_safe: { value: Qs_safe, unit: 'kN', description: tr ? 'Emniyetli Sürtünme (Qs/FS)' : 'Safe Shaft (Qs/FS)' },
            Qu_raw: { value: Qu_raw, unit: 'kN', description: tr ? 'Uç Taşıma Kapasitesi (Qu)' : 'End Bearing Capacity (Qu)' },
            Qu_safe: { value: Qu_safe, unit: 'kN', description: tr ? 'Emniyetli Uç Taşıma (Qu/FS)' : 'Safe End Bearing (Qu/FS)' },
            Qcrush: { value: Qcrush, unit: 'kN', description: tr ? 'Yapısal Kapasite (Qcrush)' : 'Structural Capacity (Qcrush)' },
            Qkolon: { value: Qkolon, unit: 'kN', description: tr ? 'Maks. Kolon Yükü' : 'Max Column Load' },
            Qkolon_limit: { value: Qkolon_limit, unit: 'kN', description: tr ? 'Kolon Yük Limiti (Qsemn+Quemn)' : 'Column Load Limit (Qsemn+Quemn)' },
            kolonSafe: { value: kolonSafe, unit: '-', description: tr ? 'Kolon Güvenli mi? (Qkolon < Limit)' : 'Column Safe? (Qkolon < Limit)' }
        },

        improvedSoil: {
            qzemin: { value: qzemin, unit: 'kPa', description: tr ? 'Zemin Gerilme Payı' : 'Soil Stress Share' },
            cuImproved: { value: cuImproved, unit: 'kPa', description: tr ? 'İyileştirilmiş Kohezyon' : 'Improved Cohesion' },
            qemnImproved: { value: qemnImproved, unit: 'kPa', description: tr ? 'İyileştirilmiş Taşıma Kapasitesi' : 'Improved Bearing Capacity' },
            Eimproved: { value: Eimproved, unit: 'kPa', description: tr ? 'İyileştirilmiş Elastisite Modülü' : 'Improved Elastic Modulus' },
            improvedSafe: { value: improvedSafe, unit: '-', description: tr ? 'İyileştirilmiş Güvenli mi? (qemn > qtemel)' : 'Improved Safe? (qemn > qtemel)' }
        },

        settlement: {
            qkazi: { value: qkazi, unit: 'kPa', description: tr ? 'Kazık Gerilmesi (γ·Hkazı)' : 'Pile Stress (γ·Hkazı)' },
            qnet: { value: qnetValue, unit: 'kPa', description: tr ? 'Net Basınç' : 'Net Pressure' },
            Eimproved: { value: Eimproved, unit: 'kPa', description: tr ? 'İyileştirilmiş E Modülü' : 'Improved E Modulus' },
            deltaCm: { value: settlementCm, unit: 'cm', description: tr ? 'Oturma (cm)' : 'Settlement (cm)' },
            deltaMm: { value: settlementMm, unit: 'mm', description: tr ? 'Oturma (mm)' : 'Settlement (mm)' }
        }
    };
}

// ============================================
// 8. SOIL LAYER PROFILE CALCULATIONS
// ============================================

/**
 * Calculate cumulative vertical stress for each layer
 * σ_v = Σ(γᵢ × hᵢ) - cumulative from top
 * @param {Array} layers - Array of soil layers with gamma and thickness
 * @returns {Array} Layer results with depth ranges and stresses
 */
function calculateLayerStress(layers) {
    let cumulativeDepth = 0;
    let cumulativeStress = 0;

    return layers.map((layer, index) => {
        const thickness = parseFloat(layer.thickness) || 0;
        const gamma = parseFloat(layer.gamma) || 0;

        const startDepth = cumulativeDepth;
        const stressAtTop = cumulativeStress;

        // Stress contribution of this layer
        const layerStress = gamma * thickness;

        cumulativeDepth += thickness;
        cumulativeStress += layerStress;

        return {
            index: index + 1,
            soilType: layer.soilType,
            thickness,
            startDepth: parseFloat(startDepth.toFixed(2)),
            endDepth: parseFloat(cumulativeDepth.toFixed(2)),
            gamma,
            phi: parseFloat(layer.phi) || 0,
            cohesion: parseFloat(layer.cohesion) || 0,
            elasticity: parseFloat(layer.elasticity) || 0,
            poisson: parseFloat(layer.poisson) || 0,
            stressAtTop: parseFloat(stressAtTop.toFixed(2)),
            stressAtBottom: parseFloat(cumulativeStress.toFixed(2)),
            layerStress: parseFloat(layerStress.toFixed(2))
        };
    });
}

/**
 * Calculate thickness-weighted average parameters
 * X_avg = Σ(Xᵢ · hᵢ) / Σhᵢ
 * @param {Array} layers - Array of soil layers
 * @returns {Object} Weighted average parameters
 */
function calculateWeightedAverages(layers) {
    const totalThickness = layers.reduce((sum, l) => sum + (parseFloat(l.thickness) || 0), 0);

    if (totalThickness === 0) {
        return {
            totalThickness: 0,
            gammaAvg: 0,
            phiAvg: 0,
            cohesionAvg: 0,
            elasticityAvg: 0,
            poissonAvg: 0
        };
    }

    const weighted = (field) => {
        return layers.reduce((sum, l) => {
            return sum + (parseFloat(l[field]) || 0) * (parseFloat(l.thickness) || 0);
        }, 0) / totalThickness;
    };

    return {
        totalThickness: parseFloat(totalThickness.toFixed(2)),
        gammaAvg: parseFloat(weighted('gamma').toFixed(2)),
        phiAvg: parseFloat(weighted('phi').toFixed(2)),
        cohesionAvg: parseFloat(weighted('cohesion').toFixed(2)),
        elasticityAvg: parseFloat(weighted('elasticity').toFixed(2)),
        poissonAvg: parseFloat(weighted('poisson').toFixed(3))
    };
}

/**
 * Main soil profile analysis - combines layer stress and weighted averages
 * @param {Array} layers - Array of soil layer objects
 * @returns {Object} Complete soil profile analysis
 */
function calculateSoilProfile(layers) {
    const layerResults = calculateLayerStress(layers);
    const averages = calculateWeightedAverages(layers);

    // Total vertical stress at bottom
    const totalStress = layerResults.length > 0
        ? layerResults[layerResults.length - 1].stressAtBottom
        : 0;

    return {
        layers: layerResults,
        summary: {
            totalDepth: { value: averages.totalThickness, unit: 'm', description: 'Toplam Derinlik' },
            totalStress: { value: totalStress, unit: 'kPa', description: 'Toplam Dikey Gerilme (σv)' },
            gammaAvg: { value: averages.gammaAvg, unit: 'kN/m³', description: 'Ort. Birim Hacim Ağırlık (γ)' },
            phiAvg: { value: averages.phiAvg, unit: '°', description: 'Ort. Sürtünme Açısı (φ)' },
            cohesionAvg: { value: averages.cohesionAvg, unit: 'kPa', description: 'Ort. Kohezyon (c)' },
            elasticityAvg: { value: averages.elasticityAvg, unit: 'kN/m²', description: 'Ort. Elastisite Modülü (E)' },
            poissonAvg: { value: averages.poissonAvg, unit: '-', description: 'Ort. Poisson Oranı (ν)' }
        }
    };
}

module.exports = {
    calculateColumnArea,
    calculateAreaRatio,
    calculateShaftCapacity,
    calculateEndBearing,
    calculateSafeCapacity,
    calculateCompressiveCapacity,
    calculateDesignStrength,
    calculateJetGroutModulus,
    calculateJetGroutCohesion,
    calculateColumnLoad,
    calculateSoilStress,
    calculateImprovedCohesion,
    calculateImprovedBearingCapacity,
    calculateImprovedModulus,
    calculateSettlement,
    calculateSubgradeModulus,
    calculateFrictionResistance,
    calculateAll,
    calculateLayerStress,
    calculateWeightedAverages,
    calculateSoilProfile
};
