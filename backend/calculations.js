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
 * Qkolon = qtemel·Ajet / [a + (Es/Ejg)·(1-a)]
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
function calculateAll(input) {
    const {
        D,           // Column diameter (m)
        s,           // Column spacing (m)
        cu,          // Undrained cohesion (kPa)
        sigmaJet,    // Jet grout strength (kPa)
        Es,          // Soil elastic modulus (kPa)
        H,           // Column height (m)
        qtemel,      // Foundation pressure (kPa)
        FS,          // Factor of safety
        alpha = 0.5, // Adhesion factor
        Nc = 9,      // Bearing capacity factor
        gammaRsb = 1.4,
        gammaRu = 1.4
    } = input;

    // 1. Geometry
    const Ajet = calculateColumnArea(D);
    const a = calculateAreaRatio(Ajet, s);

    // 2. Material Parameters
    const sigmaJetDesign = calculateDesignStrength(sigmaJet, FS);
    const Ejg = calculateJetGroutModulus(sigmaJetDesign);
    const cjet = calculateJetGroutCohesion(sigmaJetDesign);

    // 3. Single Column Capacity
    const Qs = calculateShaftCapacity(alpha, cu, D, H);
    const Qu = calculateEndBearing(Nc, cu, Ajet);
    const Qemn = calculateSafeCapacity(Qu, Qs, gammaRsb, gammaRu);
    const Qbasınc = calculateCompressiveCapacity(sigmaJetDesign, Ajet);

    // 4. Column Load
    const Qkolon = calculateColumnLoad(qtemel, Ajet, a, Es, Ejg);

    // 5. Improved Soil Parameters
    const cuImproved = calculateImprovedCohesion(a, cjet, cu);
    const qemnImproved = calculateImprovedBearingCapacity(cuImproved, Nc, FS);
    const Eimproved = calculateImprovedModulus(Ejg, a, Es);

    // 6. Settlement
    const settlement = calculateSettlement(qtemel, H, Eimproved);
    const settlementMm = settlement * 1000; // Convert to mm

    return {
        // Input Echo
        input: {
            D, s, cu, sigmaJet, Es, H, qtemel, FS, alpha, Nc
        },

        // Geometry Results
        geometry: {
            Ajet: { value: Ajet, unit: 'm²', description: 'Column Area' },
            a: { value: a, unit: '-', description: 'Area Replacement Ratio' },
            aPercent: { value: a * 100, unit: '%', description: 'Area Replacement Ratio' }
        },

        // Material Parameters
        material: {
            sigmaJetDesign: { value: sigmaJetDesign, unit: 'kPa', description: 'Design Compressive Strength' },
            Ejg: { value: Ejg, unit: 'kPa', description: 'Jet Grout Elastic Modulus' },
            cjet: { value: cjet, unit: 'kPa', description: 'Jet Grout Cohesion' }
        },

        // Bearing Capacity
        capacity: {
            Qs: { value: Qs, unit: 'kN', description: 'Shaft Friction Capacity' },
            Qu: { value: Qu, unit: 'kN', description: 'End Bearing Capacity' },
            Qemn: { value: Qemn, unit: 'kN', description: 'Safe Bearing Capacity' },
            Qbasınc: { value: Qbasınc, unit: 'kN', description: 'Compressive Capacity' },
            Qkolon: { value: Qkolon, unit: 'kN', description: 'Max Column Load' }
        },

        // Improved Soil
        improvedSoil: {
            cuImproved: { value: cuImproved, unit: 'kPa', description: 'Improved Cohesion' },
            qemnImproved: { value: qemnImproved, unit: 'kPa', description: 'Improved Bearing Capacity' },
            Eimproved: { value: Eimproved, unit: 'kPa', description: 'Improved Elastic Modulus' }
        },

        // Settlement
        settlement: {
            delta: { value: settlement, unit: 'm', description: 'Settlement' },
            deltaMm: { value: settlementMm, unit: 'mm', description: 'Settlement' }
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
    calculateImprovedCohesion,
    calculateImprovedBearingCapacity,
    calculateImprovedModulus,
    calculateSettlement,
    calculateSubgradeModulus,
    calculateFrictionResistance,
    calculateAll
};
