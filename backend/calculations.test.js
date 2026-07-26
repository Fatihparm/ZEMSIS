const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
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
} = require('./calculations');

function assertCloseTo(actual, expected, precision = 4, message = '') {
    const diff = Math.abs(actual - expected);
    const tolerance = Math.pow(10, -precision);
    assert.ok(
        diff <= tolerance,
        `${message} Expected ${actual} to be close to ${expected} within precision ${precision} (diff: ${diff})`
    );
}

describe('Jet Grout Calculations - Geotechnical Formulas', () => {

    describe('1. Column Geometry and Area Ratio', () => {
        it('should calculate column area correctly (Ajet = π·D²/4)', () => {
            const D = 0.6;
            const expectedArea = (Math.PI * 0.6 * 0.6) / 4;
            assertCloseTo(calculateColumnArea(D), expectedArea, 5);
        });

        it('should calculate area replacement ratio correctly (a = Ajet/s²)', () => {
            const Ajet = 0.2827433388230814;
            const s = 1.6;
            const expectedRatio = Ajet / (1.6 * 1.6);
            assertCloseTo(calculateAreaRatio(Ajet, s), expectedRatio, 5);
        });
    });

    describe('2. Single Column Capacity', () => {
        it('should calculate shaft friction capacity correctly (Qs = α · cu · π · D · H)', () => {
            const alpha = 0.5;
            const cu = 45;
            const D = 0.6;
            const H = 12;
            const Qs = calculateShaftCapacity(alpha, cu, D, H);
            assertCloseTo(Qs, 0.5 * 45 * Math.PI * 0.6 * 12, 4);
        });

        it('should calculate end bearing capacity correctly (Qu = Nc · cu · Ap)', () => {
            const Nc = 5.14;
            const cu = 45;
            const Ap = 0.282743;
            const Qu = calculateEndBearing(Nc, cu, Ap);
            assertCloseTo(Qu, 5.14 * 45 * 0.282743, 4);
        });

        it('should calculate safe capacity correctly', () => {
            const Qu = 140;
            const Qs = 500;
            const Qsafe = calculateSafeCapacity(Qu, Qs, 1.4, 1.4);
            assertCloseTo(Qsafe, (140 / 1.4) + (500 / 1.4), 4);
        });

        it('should calculate compressive capacity (Qcrush = σjet_design * Ab)', () => {
            const sigmaDesign = 2000;
            const Ab = 0.282743;
            assertCloseTo(calculateCompressiveCapacity(sigmaDesign, Ab), 2000 * 0.282743, 4);
        });
    });

    describe('3. Jet Grout Material Parameters', () => {
        it('should calculate design compressive strength (σjet/Fs)', () => {
            assert.strictEqual(calculateDesignStrength(3000, 1.5), 2000);
        });

        it('should calculate elastic modulus (Ejg = 300 * σjet_design)', () => {
            assert.strictEqual(calculateJetGroutModulus(2000), 600000);
        });

        it('should calculate jet grout cohesion (cjet = σjet_design * 0.4)', () => {
            assert.strictEqual(calculateJetGroutCohesion(2000), 800);
        });
    });

    describe('4. Column Load and Stress Share', () => {
        it('should calculate column load correctly', () => {
            const qtemel = 120;
            const Ajet = 0.282743;
            const a = 0.110446;
            const Es = 10000;
            const Ejg = 450000;

            const Qkolon = calculateColumnLoad(qtemel, Ajet, a, Es, Ejg);
            const expectedDenom = a + (Es / Ejg) * (1 - a);
            const expectedLoad = (qtemel * Ajet) / expectedDenom;
            assertCloseTo(Qkolon, expectedLoad, 4);
        });

        it('should calculate soil stress share correctly', () => {
            const qtemel = 120;
            const a = 0.11;
            const Es = 10000;
            const Ejg = 450000;
            const qzemin = calculateSoilStress(qtemel, a, Es, Ejg);
            const expected = 120 * (1 - a) * Es / (a * Ejg + (1 - a) * Es);
            assertCloseTo(qzemin, expected, 4);
        });
    });

    describe('5. Improved Soil Parameters', () => {
        it('should calculate improved cohesion', () => {
            const a = 0.11;
            const cjet = 800;
            const cu = 45;
            assertCloseTo(calculateImprovedCohesion(a, cjet, cu), 0.11 * 800 + 0.89 * 45, 4);
        });

        it('should calculate improved bearing capacity', () => {
            const cuImproved = 128.05;
            const Nc = 5.14;
            const FS = 2.5;
            assertCloseTo(calculateImprovedBearingCapacity(cuImproved, Nc, FS), (128.05 * 5.14) / 2.5, 4);
        });

        it('should calculate improved elastic modulus', () => {
            const Ejg = 450000;
            const a = 0.11;
            const Es = 10000;
            assertCloseTo(calculateImprovedModulus(Ejg, a, Es), 450000 * 0.11 + 10000 * 0.89, 4);
        });
    });

    describe('6. Settlement Analysis', () => {
        it('should calculate settlement correctly (δ = qnet * L / Eimproved)', () => {
            const qnet = 60;
            const L = 12;
            const Eimproved = 58400;
            const settlement = calculateSettlement(qnet, L, Eimproved);
            assertCloseTo(settlement, (60 * 12) / 58400, 6);
        });

        it('should calculate subgrade modulus and friction resistance', () => {
            assert.strictEqual(calculateSubgradeModulus(1.5, 500), 30000);
            assertCloseTo(calculateFrictionResistance(0.5, 40, 18, 1.2), (0.5 * 40) / (18 * 1.2), 4);
        });
    });

    describe('7. Full Calculation Pipeline (calculateAll)', () => {
        const defaultInput = {
            D: 0.6,
            s: 1.6,
            cu: 45,
            sigmaJet: 3000,
            Es: 10000,
            H: 12,
            qtemel: 120,
            Fs: 2.0,
            FS_shaft: 1.5,
            FS_endbearing: 2.0,
            FS_improved: 2.5,
            alpha: 0.5,
            Nc: 5.14
        };

        it('should return complete structured results object for Turkish language', () => {
            const res = calculateAll(defaultInput, 'tr');
            assert.ok(res.geometry);
            assert.ok(res.material);
            assert.ok(res.capacity);
            assert.ok(res.improvedSoil);
            assert.ok(res.settlement);

            assert.ok(res.geometry.Ajet.value > 0);
            assert.notStrictEqual(res.capacity.kolonSafe.value, undefined);
            assert.notStrictEqual(res.improvedSoil.improvedSafe.value, undefined);
            assert.strictEqual(res.material.Ejg.isAuto, true);
        });

        it('should return English descriptions when lang = "en"', () => {
            const res = calculateAll(defaultInput, 'en');
            assert.strictEqual(res.geometry.Ajet.description, 'Column Area');
            assert.strictEqual(res.capacity.Qs_raw.description, 'Skin Friction Capacity (Qs)');
        });

        it('should respect settlement limits if provided in input', () => {
            const inputWithLimit = { ...defaultInput, maxSettlementMm: 25 };
            const res = calculateAll(inputWithLimit, 'tr');
            assert.strictEqual(res.settlement.deltaMm.limit, 25);
        });
    });

    describe('8. Soil Profile & Layers Calculations', () => {
        const sampleLayers = [
            { soilType: 'kum', thickness: 3, gamma: 17, phi: 35, cohesion: 5, elasticity: 30000, poisson: 0.25 },
            { soilType: 'kil', thickness: 5, gamma: 18, phi: 15, cohesion: 80, elasticity: 25000, poisson: 0.3 }
        ];

        it('should calculate layer cumulative stresses', () => {
            const layerRes = calculateLayerStress(sampleLayers);
            assert.strictEqual(layerRes.length, 2);
            assert.strictEqual(layerRes[0].startDepth, 0);
            assert.strictEqual(layerRes[0].endDepth, 3);
            assert.strictEqual(layerRes[0].stressAtBottom, 51); // 17 * 3 = 51

            assert.strictEqual(layerRes[1].startDepth, 3);
            assert.strictEqual(layerRes[1].endDepth, 8);
            assert.strictEqual(layerRes[1].stressAtBottom, 141); // 51 + 18 * 5 = 141
        });

        it('should calculate weighted average parameters', () => {
            const averages = calculateWeightedAverages(sampleLayers);
            assert.strictEqual(averages.totalThickness, 8);
            assert.strictEqual(averages.gammaAvg, 17.63);
        });

        it('should calculate full soil profile summary', () => {
            const profile = calculateSoilProfile(sampleLayers);
            assert.strictEqual(profile.summary.totalDepth.value, 8);
            assert.strictEqual(profile.summary.totalStress.value, 141);
        });
    });
});
