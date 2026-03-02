/**
 * Excel Doğrulama Testi
 * Excel dosyasındaki (kazık taşıma gücü ve oturma hesabı 2.2 karelaj-17m boy)
 * sarı (giriş) ve yeşil/mavi (hesaplanan) değerleri backend formülleriyle karşılaştırır.
 */

const calc = require('./calculations');

// ============================================================
// EXCEL GİRİŞ PARAMETRELERİ (SARI HÜCRELER)
// ============================================================
const EXCEL_INPUTS = {
    Cu: 60,           // kPa - Drenajsız kayma dayanımı
    H: 15,            // m   - Kazık boyu (not: 20m idi 16 yaptım diyor, ama hücrede 15 yazıyor)
    alpha: 0.45,      // -   - Azaltma faktörü
    D: 0.8,           // m   - Kazık çapı
    FS_shaft: 1.5,    // -   - Güvenlik katsayısı (sürtünme için)
    Es: 12000,        // kPa - Zemin elastisite modülü
    FS_endbearing: 2, // -   - Güvenlik katsayısı (uç taşıma için)

    sigmaJet: 3,      // MPa - Jet grout basınç dayanımı (3 MPa)
    FS_jet: 2,        // -   - Jet grout güvenlik katsayısı

    karelaj: 2.4,     // m   - Karelaj aralığı (2.4 x 2.4)
    Ejg_multiplier: 300, // Ejg = 300 × σjet_tasarım
    cjet_multiplier: 0.4, // cjet = 0.4 × σjet_tasarım
    qtemel: 160,      // kPa - Temel basıncı

    Nc: 5.70,         // -   - Taşıma gücü faktörü
    FS_improved: 2.5, // -   - İyileştirilmiş taşıma gücü güvenlik katsayısı
};

// ============================================================
// EXCEL BEKLENEN SONUÇLAR (YEŞİL/MAVİ HÜCRELER)
// ============================================================
const EXCEL_EXPECTED = {
    // Bölüm 1: Sürtünme Direnci
    Qs: 1017.88,         // kN  - α.cu.π.D.H
    Qsemn: 678.58,       // kN  - Qs / F.S (1.5)
    Qu: 171.908,          // kN  - Qu (uç taşıma - Nc*cu*Ap yapıyor olabilir, ama 171.9 değeri farklı)
    Quemn: 85.954,        // kN  - Qu / F.S (2)

    // Bölüm 2: Jet Grout Malzeme
    sigmaJet_design: 1.5, // MPa - σjet / F.S = 3 / 2
    Qemn_structural: 753.98, // kN - σjet_tasarım × Ajet

    // Bölüm 3: Karelaj / Kolon
    Ajet: 0.50,           // m²  - π·D²/4
    a_ratio: 0.09,        // -   - Ajet / s²
    Ejg: 450000,          // kPa - 300 × σjet_tasarım(kPa)
    cjet: 600,            // kPa - 0.4 × σjet_tasarım(kPa)
    Qkolon: 747.7936,     // kN  - Kolon yükü
    Qkolon_limit: 764.54, // kN  - Karşılaştırma değeri

    // Bölüm 4: İyileştirilmiş Zemin
    qzemin: 33.06,        // kPa
    Cu_improved: 107.12,  // kPa - a·cjet + (1-a)·cu
    qemn_improved: 244.2425, // kPa - Cu_improved·Nc/FS
};

// ============================================================
// HESAPLAMALARI ÇALIŞTIR VE KARŞILAŞTIR
// ============================================================

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║       EXCEL DOĞRULAMA TESTİ - Jet Grout Hesaplamaları       ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

let passCount = 0;
let failCount = 0;
const tolerance = 0.5; // %0.5 tolerans

function compare(name, calculated, expected, unit = '') {
    const diff = Math.abs(calculated - expected);
    const pctDiff = expected !== 0 ? (diff / Math.abs(expected)) * 100 : (diff === 0 ? 0 : 100);
    const pass = pctDiff < tolerance;

    if (pass) {
        passCount++;
        console.log(`  ✅ ${name}: ${calculated.toFixed(4)} ${unit} (Beklenen: ${expected} ${unit}) [Fark: ${pctDiff.toFixed(3)}%]`);
    } else {
        failCount++;
        console.log(`  ❌ ${name}: ${calculated.toFixed(4)} ${unit} (Beklenen: ${expected} ${unit}) [Fark: ${pctDiff.toFixed(3)}%]`);
    }
    return pass;
}

// ── Bölüm 1: Geometri ──────────────────────────────────────
console.log('\n📐 1. KOLon Geometrisi');
console.log('─'.repeat(50));

const Ajet = calc.calculateColumnArea(EXCEL_INPUTS.D);
compare('Ajet (Kolon Alanı)', Ajet, EXCEL_EXPECTED.Ajet, 'm²');

const a = calc.calculateAreaRatio(Ajet, EXCEL_INPUTS.karelaj);
compare('a (Alan Değ. Oranı)', a, EXCEL_EXPECTED.a_ratio, '-');

// ── Bölüm 2: Sürtünme Kapasitesi ───────────────────────────
console.log('\n🏗️  2. Sürtünme Kapasitesi');
console.log('─'.repeat(50));

const Qs = calc.calculateShaftCapacity(EXCEL_INPUTS.alpha, EXCEL_INPUTS.Cu, EXCEL_INPUTS.D, EXCEL_INPUTS.H);
compare('Qs (α·cu·π·D·H)', Qs, EXCEL_EXPECTED.Qs, 'kN');

const Qsemn = Qs / EXCEL_INPUTS.FS_shaft;
compare('Qsemn (Qs/FS)', Qsemn, EXCEL_EXPECTED.Qsemn, 'kN');

// ── Bölüm 3: Uç Taşıma (Endüstri Hesabı) ──────────────────
console.log('\n🔩 3. Uç Taşıma Kapasitesi');
console.log('─'.repeat(50));

// Excel'de Qu = 171.908 kN => Nc*cu*Ap ise: Nc=5.7, cu=60, Ap=Ajet=0.5027
// 5.7 * 60 * 0.5027 = 171.9 ✓
const Qu = calc.calculateEndBearing(EXCEL_INPUTS.Nc, EXCEL_INPUTS.Cu, Ajet);
compare('Qu (Nc·cu·Ap)', Qu, EXCEL_EXPECTED.Qu, 'kN');

const Quemn = Qu / EXCEL_INPUTS.FS_endbearing;
compare('Quemn (Qu/FS)', Quemn, EXCEL_EXPECTED.Quemn, 'kN');

// ── Bölüm 4: Jet Grout Malzeme ─────────────────────────────
console.log('\n💎 4. Jet Grout Malzeme Parametreleri');
console.log('─'.repeat(50));

const sigmaJet_kPa = EXCEL_INPUTS.sigmaJet * 1000; // 3 MPa = 3000 kPa
const sigmaJetDesign_kPa = calc.calculateDesignStrength(sigmaJet_kPa, EXCEL_INPUTS.FS_jet);
const sigmaJetDesign_MPa = sigmaJetDesign_kPa / 1000;
compare('σjet_tasarım', sigmaJetDesign_MPa, EXCEL_EXPECTED.sigmaJet_design, 'MPa');

const Ejg = calc.calculateJetGroutModulus(sigmaJetDesign_kPa);
compare('Ejg (300 × σjet_tasarım)', Ejg, EXCEL_EXPECTED.Ejg, 'kPa');

const cjet = calc.calculateJetGroutCohesion(sigmaJetDesign_kPa);
compare('cjet (0.4 × σjet_tasarım)', cjet, EXCEL_EXPECTED.cjet, 'kPa');

// Yapısal kapasite: Qemn = σjet_tasarım × Ajet
const Qemn_structural = calc.calculateCompressiveCapacity(sigmaJetDesign_kPa, Ajet);
compare('Qemn (σjet_tasarım × Ajet)', Qemn_structural, EXCEL_EXPECTED.Qemn_structural, 'kN');

// ── Bölüm 5: Kolon Yükü ────────────────────────────────────
console.log('\n📊 5. Kolon Yükü');
console.log('─'.repeat(50));

const Qkolon = calc.calculateColumnLoad(EXCEL_INPUTS.qtemel, Ajet, a, EXCEL_INPUTS.Es, Ejg);
compare('Qkolon', Qkolon, EXCEL_EXPECTED.Qkolon, 'kN');

// Excel'de karelaj alanı üzerinden kolon sınırı hesaplanıyor
// Qkolon_limit = Qsemn + Quemn = 678.58 + 85.954 = 764.53
const Qkolon_limit = Qsemn + Quemn;
compare('Qkolon_limit (Qsemn+Quemn)', Qkolon_limit, EXCEL_EXPECTED.Qkolon_limit, 'kN');

console.log(`\n  📝 Kontrol: Qkolon (${Qkolon.toFixed(2)}) ${Qkolon < Qkolon_limit ? '<' : '>'} Qkolon_limit (${Qkolon_limit.toFixed(2)}) → ${Qkolon < Qkolon_limit ? '✅ GÜVENLİ' : '❌ GÜVENLİ DEĞİL'}`);

// ── Bölüm 6: İyileştirilmiş Zemin ──────────────────────────
console.log('\n🌱 6. İyileştirilmiş Zemin Parametreleri');
console.log('─'.repeat(50));

// qzemin = qtemel * (1-a) * (Es / (a*Ejg + (1-a)*Es)) gibi bir formül olabilir
// ya da qzemin = qtemel * (Es/Ejg) * ((1-a) / (a + (Es/Ejg)*(1-a)))
// Excel'de qzemin = 33.06 kPa
const qzemin_calc = EXCEL_INPUTS.qtemel * (1 - a) * EXCEL_INPUTS.Es / (a * Ejg + (1 - a) * EXCEL_INPUTS.Es);
compare('qzemin', qzemin_calc, EXCEL_EXPECTED.qzemin, 'kPa');

const cuImproved = calc.calculateImprovedCohesion(a, cjet, EXCEL_INPUTS.Cu);
compare('Cu_iyileştirilmiş', cuImproved, EXCEL_EXPECTED.Cu_improved, 'kPa');

const qemnImproved = calc.calculateImprovedBearingCapacity(cuImproved, EXCEL_INPUTS.Nc, EXCEL_INPUTS.FS_improved);
compare('qemn_iyileştirilmiş', qemnImproved, EXCEL_EXPECTED.qemn_improved, 'kPa');

console.log(`\n  📝 Kontrol: qemn_iyileştirilmiş (${qemnImproved.toFixed(2)}) ${qemnImproved > EXCEL_INPUTS.qtemel ? '>' : '<'} qtemel (${EXCEL_INPUTS.qtemel}) → ${qemnImproved > EXCEL_INPUTS.qtemel ? '✅ GÜVENLİ' : '❌ GÜVENLİ DEĞİL'}`);

// ── Bölüm 7: Backend calculateAll ile tam karşılaştırma ────
console.log('\n\n🔄 7. Backend calculateAll() ile Tam Karşılaştırma');
console.log('═'.repeat(60));

// Backend'e gönderilecek parametreler
const backendParams = {
    D: EXCEL_INPUTS.D,
    s: EXCEL_INPUTS.karelaj,
    cu: EXCEL_INPUTS.Cu,
    sigmaJet: sigmaJet_kPa,   // 3000 kPa
    Es: EXCEL_INPUTS.Es,
    Ejg: Ejg,                  // 450000 kPa
    H: EXCEL_INPUTS.H,
    qtemel: EXCEL_INPUTS.qtemel,
    Fs: EXCEL_INPUTS.FS_jet,   // 2 (malzeme güvenlik katsayısı)
    FS: EXCEL_INPUTS.FS_shaft, // 1.5 (taşıma gücü güvenlik katsayısı)
    alpha: EXCEL_INPUTS.alpha,
    Nc: EXCEL_INPUTS.Nc,
};

const results = calc.calculateAll(backendParams);

console.log('\n  Backend Sonuçları:');
console.log('  ─'.padEnd(50, '─'));

// Geometri
console.log(`\n  Geometri:`);
console.log(`    Ajet     = ${results.geometry.Ajet.value.toFixed(4)} m²  (Excel: ${EXCEL_EXPECTED.Ajet})`);
console.log(`    a        = ${results.geometry.a.value.toFixed(4)}     (Excel: ${EXCEL_EXPECTED.a_ratio})`);

// Malzeme
console.log(`\n  Malzeme:`);
console.log(`    σjet_tas = ${results.material.sigmaJetDesign.value.toFixed(2)} kPa = ${(results.material.sigmaJetDesign.value / 1000).toFixed(2)} MPa  (Excel: ${EXCEL_EXPECTED.sigmaJet_design} MPa)`);
console.log(`    Ejg      = ${results.material.Ejg.value.toFixed(2)} kPa  (Excel: ${EXCEL_EXPECTED.Ejg})`);
console.log(`    cjet     = ${results.material.cjet.value.toFixed(2)} kPa  (Excel: ${EXCEL_EXPECTED.cjet})`);

// Kapasite
console.log(`\n  Kapasite:`);
console.log(`    Qs_raw   = ${results.capacity.Qs_raw.value.toFixed(2)} kN  (Excel: ${EXCEL_EXPECTED.Qs})`);
console.log(`    Qs_safe  = ${results.capacity.Qs_safe.value.toFixed(2)} kN  (Excel: ${EXCEL_EXPECTED.Qsemn})`);
console.log(`    Qu_raw   = ${results.capacity.Qu_raw.value.toFixed(2)} kN  (Excel: ${EXCEL_EXPECTED.Qu})`);
console.log(`    Qcrush   = ${results.capacity.Qcrush.value.toFixed(2)} kN  (Excel: ${EXCEL_EXPECTED.Qemn_structural})`);
console.log(`    Qkolon   = ${results.capacity.Qkolon.value.toFixed(2)} kN  (Excel: ${EXCEL_EXPECTED.Qkolon})`);

// İyileştirilmiş zemin
console.log(`\n  İyileştirilmiş Zemin:`);
console.log(`    Cu_imp   = ${results.improvedSoil.cuImproved.value.toFixed(2)} kPa  (Excel: ${EXCEL_EXPECTED.Cu_improved})`);
console.log(`    qemn_imp = ${results.improvedSoil.qemnImproved.value.toFixed(2)} kPa  (Excel: ${EXCEL_EXPECTED.qemn_improved})`);

// ── Önemli fark: Backend'de FS farklı kullanılıyor ──────────
console.log('\n\n⚠️  8. ÖNEMLİ FARKLAR - Backend vs Excel');
console.log('═'.repeat(60));

// Excel'de Qu/FS = 171.9/2 = 85.95 (FS=2 kullanıyor)
// Ama backend'de Qs_safe = Qs/FS kullanıyor (FS=1.5)
// Excel'de ise Qsemn = Qs/1.5; Quemn = Qu/2 (farklı FS'ler!)
console.log('\n  1. GÜVENLİK KATSAYILARI:');
console.log(`     Excel: Qs için FS=1.5, Qu için FS=2, İyileştirilmiş için FS=2.5`);
console.log(`     Backend: Tek FS değeri kullanıyor (FS=${backendParams.FS})`);
console.log(`     → Backend'de Qu için ayrı FS parametresi yok!`);

// Backend'de Qu_raw doğrudan Nc*cu*Ap hesaplıyor ama safe versiyonu yok
// Excel'de Quemn = Qu / 2
const backend_Qu_safe = results.capacity.Qu_raw.value / EXCEL_INPUTS.FS_endbearing;
console.log(`\n  2. UÇ TAŞIMA EMNİYETLİ DEĞERİ:`);
console.log(`     Backend Qu_raw = ${results.capacity.Qu_raw.value.toFixed(2)} kN`);
console.log(`     Backend'de Quemn hesaplanmıyor!`);
console.log(`     Excel Quemn = Qu/2 = ${(EXCEL_EXPECTED.Qu / 2).toFixed(2)} kN`);

// Backend'de qemnImproved FS=1.5 ile hesaplanıyor, Excel'de FS=2.5
console.log(`\n  3. İYİLEŞTİRİLMİŞ TAŞIMA KAPASİTESİ:`);
console.log(`     Backend FS = ${backendParams.FS} (tüm hesaplar için)`);
console.log(`     Excel FS = ${EXCEL_INPUTS.FS_improved} (iyileştirilmiş taşıma gücü için)`);
const backend_qemn_with_excel_FS = (results.improvedSoil.cuImproved.value * EXCEL_INPUTS.Nc) / EXCEL_INPUTS.FS_improved;
console.log(`     Backend (FS=2.5 ile): ${backend_qemn_with_excel_FS.toFixed(2)} kPa`);
console.log(`     Excel: ${EXCEL_EXPECTED.qemn_improved} kPa`);

// ── Özet ────────────────────────────────────────────────────
console.log('\n\n' + '═'.repeat(60));
console.log(`📋 SONUÇ: ${passCount} test geçti, ${failCount} test başarısız`);
console.log('═'.repeat(60));

if (failCount === 0) {
    console.log('🎉 Tüm hesaplamalar Excel ile uyumlu!');
} else {
    console.log(`⚠️  ${failCount} hesaplamada farklılık var - yukarıdaki detayları inceleyin.`);
}
