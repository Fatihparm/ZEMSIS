const HTMLtoDOCX = require('html-to-docx');
const JSZip = require('jszip');
const fs = require('fs');
const { DOMParser } = require('xmldom');

const html = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 12pt;
      line-height: 1.6;
      color: #000;
      margin: 0;
      padding: 0;
    }
    h1 { text-align: center; font-size: 16pt; font-weight: bold; margin-bottom: 6pt; }
    h2 { font-size: 13pt; font-weight: bold; border-bottom: 2px solid #000; margin-top: 18pt; margin-bottom: 8pt; padding-bottom: 3pt; }
    h3 { font-size: 12pt; font-weight: bold; margin-top: 12pt; margin-bottom: 6pt; }
    p { text-align: justify; margin: 0 0 8pt 0; }
    table { width: 100%; border-collapse: collapse; margin: 10pt 0; font-size: 11pt; }
    th, td { border: 1px solid #333; padding: 5pt 8pt; vertical-align: middle; }
    th { background-color: #d9d9d9; text-align: center; font-weight: bold; }
    td.num { text-align: right; font-family: 'Courier New', monospace; }
    td.center { text-align: center; }
    .cover-block { margin: 20pt auto; width: 80%; }
    .cover-block table { border: 1px solid #000; }
    .cover-block td { padding: 6pt 10pt; border: 1px solid #ccc; }
    .cover-label { font-weight: bold; width: 40%; }
    .locked-notice {
      background: #fff8e1;
      border-left: 4px solid #f59e0b;
      padding: 6pt 10pt;
      font-size: 10pt;
      font-style: italic;
      margin: 8pt 0;
    }
    .divider { border: none; border-top: 1px solid #999; margin: 16pt 0; }
    .page-break { page-break-after: always; }
    .header-logo { text-align: right; font-size: 10pt; color: #555; margin-bottom: 10pt; }
    .title-block {
      text-align: center;
      border: 2px solid #000;
      padding: 20pt;
      margin-bottom: 20pt;
    }
    .subtitle { text-align: center; font-size: 13pt; margin-top: 4pt; }
    .doc-info { text-align: center; font-size: 10pt; color: #555; margin-top: 8pt; }
  </style>
</head>
<body>

<div class="title-block">
  <p style="font-size:11pt; margin:0; letter-spacing:2px;">ZEMİN MEKANİĞİ VE GEOTEKNİK</p>
  <h1>JET GROUT ZEMİN İYİLEŞTİRMESİ<br>GEOTEKNİK HESAP RAPORU</h1>
  <p class="subtitle">Test</p>
  <p class="doc-info">ZEMSIS Mühendislik Yazılımı ile Hazırlanmıştır</p>
</div>

<div class="cover-block">
  <table>
    <tr><td class="cover-label">Proje Adı</td><td>Test</td></tr>
  </table>
</div>

<div class="page-break"></div>

<h2>İÇİNDEKİLER</h2>
<table style="border:none;">
  <tr style="border:none;"><td style="border:none;">1. Giriş</td><td style="border:none; text-align:right;">3</td></tr>
</table>

<div class="page-break"></div>

<h2>1. GİRİŞ</h2>
<p>Test</p>

<h2>7. GEOTEKNİK TASARIM PARAMETRELERİNİN TESPİTİ</h2>
<div class="locked-notice">
  ⚠ Aşağıdaki değerler ZEMSIS yazılımı tarafından hesaplanmış ve veritabanına kilitlenmiştir.
  Bu değerler kullanıcı tarafından değiştirilemez.
</div>
<table>
  <tr>
    <th>Parametre</th>
    <th>Değer</th>
    <th>Birim</th>
  </tr>
  <tr>
    <td>D</td>
    <td class="num">0.6</td>
    <td class="center">m</td>
  </tr>
</table>

<hr class="divider">
<p style="font-size:9pt; text-align:center; color:#555; margin-top:20pt;">
  ZEMSIS © 2024 — Bu belge elektronik olarak üretilmiştir. —
  Proje ID: N/A — Tarih: 13 Mayıs 2024
</p>

</body>
</html>`;

async function test() {
  try {
    console.log("Generating DOCX...");
    const docxBuffer = await HTMLtoDOCX(html, null, {
      title: 'Geoteknik Rapor',
      orientation: 'portrait',
      pageSize: { width: 12240, height: 15840 },
      margins: { top: 1440, right: 1440, bottom: 1440, left: 1800 },
      font: 'Times New Roman',
      fontSize: 24,
      complexScriptFontSize: 24,
    });
    
    console.log("Unzipping DOCX...");
    const zip = await JSZip.loadAsync(docxBuffer);
    const xml = await zip.file('word/document.xml').async('string');
    
    console.log("Validating XML...");
    const parser = new DOMParser({
      errorHandler: {
        warning: (msg) => console.warn("WARNING: " + msg),
        error: (msg) => console.error("ERROR: " + msg),
        fatalError: (msg) => console.error("FATAL: " + msg)
      }
    });
    parser.parseFromString(xml, 'text/xml');
    
    // Test if MS Word might reject certain tags
    if (xml.includes('width:')) {
      console.log("WARNING: Found width CSS in generated XML!");
    }
    
    fs.writeFileSync('test_full.docx', docxBuffer);
    console.log("Saved to test_full.docx");
  } catch (err) {
    console.error("Caught error:", err.stack);
  }
}

test();
