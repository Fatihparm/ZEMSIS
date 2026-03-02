/**
 * Tüm Excel Senaryolarını Test Eden Script
 * =========================================
 * 5 farklı Excel tablosu/senaryosu test ediliyor.
 */

const calc = require('./calculations');

let totalPass = 0;
let totalFail = 0;

function compare(name, calculated, expected, unit = '', tolerance = 0.5) {
    const diff = Math.abs(calculated - expected);
    const pctDiff = expected !== 0 ? (diff / Math.abs(expected)) * 100 : (diff === 0 ? 0 : 100);
    const pass = pctDiff < tolerance;
    if (pass) {
        totalPass++;
        console.log(`  ✅ ${name}: ${calculated.toFixed(4)} ${unit} (Beklenen: ${expected}) [${pctDiff.toFixed(3)}%]`);
    } else {
        totalFail++;
        console.log(`  ❌ ${name}: ${calculated.toFixed(4)} ${unit} (Beklenen: ${expected}) [Fark: ${pctDiff.toFixed(3)}%]`);
    }
    return pass;
}

function compareBool(name, calculated, expected) {
    const pass = calculated === expected;
    if (pass) {
        totalPass++;
        console.log(`  ✅ ${name}: ${calculated} (Beklenen: ${expected})`);
    } else {
        totalFail++;
        console.log(`  ❌ ${name}: ${calculated} (Beklenen: ${expected})`);
    }
}

// ╔═══════════════════════════════════════════════════════════╗
// ║  SENARYO 1: Temel Senaryo (Tablo 1)                      ║
// ║  Cu=60, H=15, α=0.45, D=0.8, σjet=3MPa                  ║
// ╚═══════════════════════════════════════════════════════════╝
console.log('\n' + '═'.repeat(60));
console.log('  SENARYO 1: Temel Senaryo (Tablo 1)');
console.log('═'.repeat(60));

const scenario1 = calc.calculateAll({
    D: 0.8,
    s: 2.4,
    cu: 60,
    sigmaJet: 3000,     // 3 MPa = 3000 kPa
    Es: 12000,
    H: 15,
    qtemel: 160,
    Fs: 2,              // σjet / Fs = tasarım dayanımı
    FS_shaft: 1.5,
    FS_endbearing: 2,
    FS_improved: 2.5,
    alpha: 0.45,
    Nc: 5.70,
    EjgMultiplier: 300,
});

console.log('\n  Geometri:');
compare('Ajet', scenario1.geometry.Ajet.value, 0.5027, 'm²');
compare('a', scenario1.geometry.a.value, 0.0873, '-');

console.log('\n  Malzeme:');
compare('σjet_tasarım', scenario1.material.sigmaJetDesign.value / 1000, 1.5, 'MPa');
compare('Ejg', scenario1.material.Ejg.value, 450000, 'kPa');
compare('cjet', scenario1.material.cjet.value, 600, 'kPa');

console.log('\n  Sürtünme & Uç Taşıma:');
compare('Qs', scenario1.capacity.Qs_raw.value, 1017.88, 'kN');
compare('Qsemn', scenario1.capacity.Qs_safe.value, 678.58, 'kN');
compare('Qu', scenario1.capacity.Qu_raw.value, 171.908, 'kN');
compare('Quemn', scenario1.capacity.Qu_safe.value, 85.954, 'kN');
compare('Qemn_yapısal', scenario1.capacity.Qcrush.value, 753.98, 'kN');

console.log('\n  Kolon Yükü:');
compare('Qkolon_limit', scenario1.capacity.Qkolon_limit.value, 764.54, 'kN');
compareBool('Qkolon < Limit', scenario1.capacity.kolonSafe.value, true);

console.log('\n  İyileştirilmiş Zemin:');
compare('Cu_iyileştirilmiş', scenario1.improvedSoil.cuImproved.value, 107.12, 'kPa');
compare('qemn_iyileştirilmiş', scenario1.improvedSoil.qemnImproved.value, 244.2425, 'kPa');
compareBool('qemn > qtemel', scenario1.improvedSoil.improvedSafe.value, true);


// ╔═══════════════════════════════════════════════════════════╗
// ║  SENARYO 2: Uzun Hesap (Tablo 2)                          ║
// ║  α=1.0, H=20, σjet=25MPa, Es=20000, Ejg×400             ║
// ╚═══════════════════════════════════════════════════════════╝
console.log('\n\n' + '═'.repeat(60));
console.log('  SENARYO 2: Uzun Hesap Tablosu (Tablo 2)');
console.log('═'.repeat(60));

// Qs = α·cu·π·D·H = 1·60·π·0.8·20 = 3015.93
// σjet=25MPa, Fs=1.5 → σjet_tasarım = 25/1.5 = 16.667 MPa
// Ejg = 400 × 16666.67 = 6,666,667 kPa
const scenario2 = calc.calculateAll({
    D: 0.8,
    s: 2.4,
    cu: 60,
    sigmaJet: 25000,     // 25 MPa
    Es: 20000,
    H: 20,
    qtemel: 200,
    Fs: 1.5,             // σjet / Fs
    FS_shaft: 1.5,
    FS_endbearing: 2,
    FS_improved: 1.4,
    alpha: 1.0,          // α = 1.0 (farklı!)
    Nc: 5.70,
    EjgMultiplier: 400,  // 400 (farklı!)
});

console.log('\n  Sürtünme & Uç Taşıma:');
compare('Qs', scenario2.capacity.Qs_raw.value, 3015.93, 'kN');
compare('Qsemn', scenario2.capacity.Qs_safe.value, 2010.62, 'kN');
compare('Qu', scenario2.capacity.Qu_raw.value, 171.908, 'kN');
compare('Quemn', scenario2.capacity.Qu_safe.value, 85.954, 'kN');

console.log('\n  Malzeme:');
compare('σjet_tasarım', scenario2.material.sigmaJetDesign.value / 1000, 16.6667, 'MPa');
compare('Ejg', scenario2.material.Ejg.value, 6666667, 'kPa', 1.0);
compare('cjet', scenario2.material.cjet.value, 6666.67, 'kPa');
compare('Qemn_yapısal', scenario2.capacity.Qcrush.value, 8377.58, 'kN');

console.log('\n  Kolon Yükü:');
compare('Qkolon', scenario2.capacity.Qkolon.value, 1134.206, 'kN', 2.0);
compare('Qkolon_limit', scenario2.capacity.Qkolon_limit.value, 2096.57, 'kN');
compareBool('Qkolon < Limit', scenario2.capacity.kolonSafe.value, true);

console.log('\n  İyileştirilmiş Zemin:');
compare('Cu_iyileştirilmiş', scenario2.improvedSoil.cuImproved.value, 636.54, 'kPa', 1.0);
compare('qemn_iyileştirilmiş', scenario2.improvedSoil.qemnImproved.value, 2591.629, 'kPa', 1.0);
compareBool('qemn > qtemel', scenario2.improvedSoil.improvedSafe.value, true);


// ╔═══════════════════════════════════════════════════════════╗
// ║  SENARYO 3: Oturma Hesabı - Varyasyon 1                   ║
// ║  Hkazı=5.5m, γ=19, L=15m, qtemel_statik=130              ║
// ╚═══════════════════════════════════════════════════════════╝
console.log('\n\n' + '═'.repeat(60));
console.log('  SENARYO 3: Oturma - Varyasyon 1 (Hkazı=5.5m)');
console.log('═'.repeat(60));

// E_improved = Ejg·a + Es·(1-a) = 6666667·a + 20000·(1-a)
// Excel: 600.03 MPa = 600030 kPa
// qkazı = γ·Hkazı = 19·5.5 = 104.5
// qnet = 130 - 104.5 = 25.5
// δ = qnet·L / E_improved = 25.5·15 / 600030 = 0.06 cm
const scenario3_Ejg = 6666667;
const scenario3_a = calc.calculateAreaRatio(calc.calculateColumnArea(0.8), 2.4);
const scenario3_Eimproved = calc.calculateImprovedModulus(scenario3_Ejg, scenario3_a, 20000);

console.log('\n  İyileştirilmiş E Modülü:');
compare('E_iyileştirilmiş', scenario3_Eimproved / 1000, 600.03, 'MPa', 2.0);

const scenario3_qkazi = 19 * 5.5;
compare('qkazı', scenario3_qkazi, 104.5, 'kPa');

const scenario3_qnet = 130 - scenario3_qkazi;
compare('qnet', scenario3_qnet, 25.5, 'kPa');

const scenario3_settlement = calc.calculateSettlement(scenario3_qnet, 15, scenario3_Eimproved);
compare('δ_iyileştirilmiş', scenario3_settlement * 100, 0.06, 'cm', 10);


// ╔═══════════════════════════════════════════════════════════╗
// ║  SENARYO 4: Oturma Hesabı - Varyasyon 2                   ║
// ║  Hkazı=4m, γ=18, L=20m, qtemel_statik=200                ║
// ╚═══════════════════════════════════════════════════════════╝
console.log('\n\n' + '═'.repeat(60));
console.log('  SENARYO 4: Oturma - Varyasyon 2 (Hkazı=4m)');
console.log('═'.repeat(60));

const scenario4_qkazi = 18 * 4;
compare('qkazı', scenario4_qkazi, 72, 'kPa');

const scenario4_qnet = 200 - scenario4_qkazi;
compare('qnet', scenario4_qnet, 128, 'kPa');

// Same E_improved as scenario 3 (same Ejg, Es, D, s)
const scenario4_settlement = calc.calculateSettlement(scenario4_qnet, 20, scenario3_Eimproved);
compare('δ_iyileştirilmiş', scenario4_settlement * 100, 0.43, 'cm', 5);


// ╔═══════════════════════════════════════════════════════════╗
// ║  SENARYO 5: calculateAll entegrasyonu (Oturma dahil)      ║
// ╚═══════════════════════════════════════════════════════════╝
console.log('\n\n' + '═'.repeat(60));
console.log('  SENARYO 5: calculateAll ile Tam Oturma Hesabı');
console.log('═'.repeat(60));

const scenario5 = calc.calculateAll({
    D: 0.8,
    s: 2.4,
    cu: 60,
    sigmaJet: 25000,
    Es: 20000,
    H: 20,               // L = H = 20m
    qtemel: 200,
    Fs: 1.5,
    FS_shaft: 1.5,
    FS_endbearing: 2,
    FS_improved: 1.4,
    alpha: 1.0,
    Nc: 5.70,
    EjgMultiplier: 400,
    Hkazi: 4,             // Hkazı = 4m
    gamma: 18,            // γ = 18 kN/m³
});

console.log('\n  Oturma Parametreleri:');
compare('qkazı', scenario5.settlement.qkazi.value, 72, 'kPa');
compare('qnet', scenario5.settlement.qnet.value, 128, 'kPa');
compare('E_improved', scenario5.settlement.Eimproved.value / 1000, 600, 'MPa', 2.0);
compare('δ_iyileştirilmiş', scenario5.settlement.deltaCm.value, 0.43, 'cm', 5.0);


// ═══════════════════════════════════════════════════════════
//  SONUÇ
// ═══════════════════════════════════════════════════════════
console.log('\n\n' + '═'.repeat(60));
console.log(`  📋 TOPLAM SONUÇ: ${totalPass} test GEÇTI ✅, ${totalFail} test BAŞARISIZ ❌`);
console.log('═'.repeat(60));

if (totalFail === 0) {
    console.log('  🎉 Tüm hesaplamalar Excel ile uyumlu!\n');
} else {
    console.log(`  ⚠️  ${totalFail} hesaplamada tolerans dışı fark var.\n`);
}

process.exit(totalFail > 0 ? 1 : 0);
