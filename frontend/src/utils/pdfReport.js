import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { robotoBase64 } from './roboto-font.js';

// --- Hidden JSON magic marker ---
const MAGIC_MARKER = "___JGC_PROJECT_DATA___";

// Coordinate geometry helpers adapted for rendering
function polygonBounds(verts) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  verts.forEach(v => {
    if (v.x < minX) minX = v.x;
    if (v.y < minY) minY = v.y;
    if (v.x > maxX) maxX = v.x;
    if (v.y > maxY) maxY = v.y;
  });
  return { minX, minY, maxX, maxY };
}

// Function to draw the plan view into an offscreen canvas and return DataURL
function renderDrawingToDataURL(drawingData, D) {
  if (!drawingData || (!drawingData.polygons && !drawingData.columnPositions)) return null;

  const polys = drawingData.polygons || [];
  const columns = drawingData.columnPositions || [];

  if (polys.length === 0 && columns.length === 0) return null;

  // 1. Calculate bounds
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  polys.forEach(poly => {
    if (!poly.vertices || poly.vertices.length === 0) return;
    const b = polygonBounds(poly.vertices);
    minX = Math.min(minX, b.minX);
    minY = Math.min(minY, b.minY);
    maxX = Math.max(maxX, b.maxX);
    maxY = Math.max(maxY, b.maxY);
  });

  columns.forEach(c => {
    minX = Math.min(minX, c.x - D / 2);
    minY = Math.min(minY, c.y - D / 2);
    maxX = Math.max(maxX, c.x + D / 2);
    maxY = Math.max(maxY, c.y + D / 2);
  });

  // Fallback for valid rendering if no valid bounds found
  if (!isFinite(minX)) {
    minX = -10; minY = -10; maxX = 10; maxY = 10;
  }

  // Padding
  const pad = Math.max((maxX - minX) * 0.1, (maxY - minY) * 0.1, 5);
  minX -= pad; maxX += pad;
  minY -= pad; maxY += pad;

  const wWorld = maxX - minX;
  const hWorld = maxY - minY;

  // Map world size to canvas, maximum 2000px
  const maxPx = 1500;
  const ppm = Math.min(maxPx / wWorld, maxPx / hWorld);

  const W = wWorld * ppm;
  const H = hWorld * ppm;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  if (!ctx) return null;

  // Background
  ctx.fillStyle = '#1e1e24';
  ctx.fillRect(0, 0, W, H);

  // Helper mappings
  const w2s = (wx, wy) => ({
    x: (wx - minX) * ppm,
    y: H - ((wy - minY) * ppm)
  });

  // Grid lines
  const gridStep = 5;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 1;
  const cxMin = Math.floor(minX / gridStep) * gridStep;
  for (let x = cxMin; x <= maxX; x += gridStep) {
    const p1 = w2s(x, minY);
    const p2 = w2s(x, maxY);
    ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
  }
  const cyMin = Math.floor(minY / gridStep) * gridStep;
  for (let y = cyMin; y <= maxY; y += gridStep) {
    const p1 = w2s(minX, y);
    const p2 = w2s(maxX, y);
    ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
  }

  // Polygons
  polys.forEach(poly => {
    if (!poly.vertices || poly.vertices.length < 2) return;
    const verts = poly.vertices;

    ctx.beginPath();
    const p0 = w2s(verts[0].x, verts[0].y);
    ctx.moveTo(p0.x, p0.y);
    for (let i = 1; i < verts.length; i++) {
      const p = w2s(verts[i].x, verts[i].y);
      ctx.lineTo(p.x, p.y);
    }
    if (poly.isClosed) ctx.closePath();

    if (poly.isClosed) {
      ctx.fillStyle = 'rgba(255, 152, 0, 0.15)';
      ctx.fill();
    }
    ctx.strokeStyle = '#ff9800';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Add length text
    ctx.fillStyle = '#fff';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';

    const edgeCount = poly.isClosed ? verts.length : verts.length - 1;
    for (let i = 0; i < edgeCount; i++) {
      const j = (i + 1) % verts.length;
      const v1 = verts[i], v2 = verts[j];
      const len = Math.hypot(v2.x - v1.x, v2.y - v1.y);
      const midScreen = w2s((v1.x + v2.x) / 2, (v1.y + v2.y) / 2);
      ctx.fillText(`${len.toFixed(1)}m`, midScreen.x, midScreen.y - 5);
    }
  });

  // Jet columns
  if (columns && columns.length > 0) {
    const colR = (D / 2) * ppm;
    columns.forEach(col => {
      const p = w2s(col.x, col.y);
      ctx.beginPath();
      ctx.arc(p.x, p.y, colR, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(76, 175, 80, 0.7)';
      ctx.fill();
      ctx.strokeStyle = '#2e7d32';
      ctx.lineWidth = 1;
      ctx.stroke();
    });
  }

  // Info label
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('ZEMSIS Plan View', 20, 30);
  if (columns) {
    ctx.fillText(`Columns: ${columns.length} | Diameter: ${D}m`, 20, 50);
  }

  return { imgData: canvas.toDataURL('image/png'), width: W, height: H };
}

/**
 * Main export function
 */
export async function generatePdfReport(projectData, lang) {
  const tr = lang === 'tr';
  const doc = new jsPDF();

  doc.addFileToVFS('Roboto-Regular.ttf', robotoBase64);
  doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
  doc.setFont('Roboto');

  const title = projectData.name || (tr ? 'İsimsiz Proje' : 'Untitled Project');
  const dateStr = new Date().toLocaleString(tr ? 'tr-TR' : 'en-US');

  // Load logos
  const getImgDataUrl = (src) => new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = src;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(null);
  });

  const btuLogoData = await getImgDataUrl('/btu-logo.png');
  const zemsisLogoData = await getImgDataUrl('/zemsis-logo.png');

  // --- Header ---
  if (btuLogoData) {
    doc.addImage(btuLogoData, 'PNG', 14, 10, 24, 24);
  }
  if (zemsisLogoData) {
    doc.addImage(zemsisLogoData, 'PNG', doc.internal.pageSize.getWidth() - 38, 10, 24, 24);
  }

  doc.setFontSize(22);
  doc.setTextColor(40, 40, 40);
  doc.text('ZEMSIS Proje Raporu', 45, 22);

  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.text(`${tr ? 'Proje' : 'Project'}: ${title}`, 45, 30);
  doc.text(`${tr ? 'Tarih' : 'Date'}: ${dateStr}`, 45, 36);

  let currentY = 46;

  // --- Parameters Table ---
  doc.setFontSize(14);
  doc.setTextColor(60, 60, 60);
  doc.text(tr ? 'Proje Parametreleri' : 'Project Parameters', 14, currentY);
  currentY += 4;

  const params = projectData.parameters || {};
  const units = projectData.units || {};

  // Format params
  const paramRows = [
    [tr ? 'Kolon Çapı (D)' : 'Column Diameter (D)', `${params.D || '-'} m`],
    [tr ? 'Kolon Aralığı (s)' : 'Column Spacing (s)', `${params.s || '-'} m`],
    [tr ? 'Kolon Boyu (H)' : 'Column Height (H)', `${params.H || '-'} m`],
    [tr ? 'Jet Grout Dayanımı (σjet)' : 'Jet Grout Strength (sjet)', `${params.sigmaJet || '-'} ${units.sigmaJet || 'MPa'}`],
    [tr ? 'Jet Grout Elastisite Modülü (Ejg)' : 'Jet Grout Elastic Modulus (Ejg)', `${params.Ejg || '-'} ${units.Ejg || 'MPa'}`],
    [tr ? 'Temel Basıncı (qtemel)' : 'Foundation Pressure (qtemel)', `${params.qtemel || '-'} ${units.qtemel || 'kPa'}`],
    [tr ? 'Zemin Drenajsız Kohezyon (cu)' : 'Soil Undrained Cohesion (cu)', `${params.cu || '-'} ${units.cu || 'kPa'}`],
  ];

  autoTable(doc, {
    startY: currentY,
    head: [[tr ? 'Parametre' : 'Parameter', tr ? 'Değer' : 'Value']],
    body: paramRows,
    theme: 'striped',
    styles: { font: 'Roboto' },
    headStyles: { fillColor: [41, 128, 185], font: 'Roboto', fontStyle: 'normal' },
    margin: { left: 14 }
  });

  currentY = doc.lastAutoTable.finalY + 15;

  // --- Soil Layers Table ---
  const layers = projectData.soilLayers || [];
  if (layers.length > 0) {
    doc.setFontSize(14);
    doc.text(tr ? 'Zemin Tabakaları' : 'Soil Layers', 14, currentY);
    currentY += 4;

    const layerRows = layers.map((l, i) => [
      i + 1, l.soilType, l.thickness, l.gamma, l.cohesion, l.phi, l.elasticity, l.poisson
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [[tr ? 'No' : 'No', tr ? 'Tip' : 'Type', tr ? 'Kalınlık (m)' : 'Thickness (m)', 'γ (kN/m3)', 'c (kPa)', 'φ (°)', 'E (kPa)', 'v']],
      body: layerRows,
      theme: 'grid',
      headStyles: { fillColor: [39, 174, 96], font: 'Roboto', fontStyle: 'normal' },
      styles: { fontSize: 9, font: 'Roboto' }
    });

    currentY = doc.lastAutoTable.finalY + 15;
  }

  // --- Results Summary ---
  if (projectData.results) {
    if (currentY > 250) { doc.addPage(); currentY = 20; }

    doc.setFontSize(14);
    doc.text(tr ? 'Analiz Sonuçları' : 'Analysis Results', 14, currentY);
    currentY += 4;

    const r = projectData.results;
    const resRows = [];
    if (r.capacity) {
      if (r.capacity.Qs_safe) resRows.push([tr ? 'Tek Kolon Çevre Sürtünmesi' : 'Single Column Skin Friction', `${r.capacity.Qs_safe.value.toFixed(2)} ${r.capacity.Qs_safe.unit}`]);
      if (r.capacity.Qu_safe) resRows.push([tr ? 'Tek Kolon Uç Taşıma' : 'Single Column End Bearing', `${r.capacity.Qu_safe.value.toFixed(2)} ${r.capacity.Qu_safe.unit}`]);
      if (r.capacity.Qkolon) resRows.push([tr ? 'Maksimum Kolon Yükü' : 'Max Column Load', `${r.capacity.Qkolon.value.toFixed(2)} ${r.capacity.Qkolon.unit}`]);
      if (r.capacity.kolonSafe) resRows.push([tr ? 'Kolon Güvenliği' : 'Column Safety', r.capacity.kolonSafe.value ? (tr ? 'Güvenli' : 'Safe') : (tr ? 'Yetersiz' : 'Unsafe')]);
    }
    if (r.improvedSoil) {
      if (r.improvedSoil.Eimproved) resRows.push([tr ? 'Eşdeğer Elastisite Modülü (Eeq)' : 'Equivalent Elasticity (Eeq)', `${r.improvedSoil.Eimproved.value.toFixed(2)} ${r.improvedSoil.Eimproved.unit}`]);
      if (r.improvedSoil.qemnImproved) resRows.push([tr ? 'İyileştirilmiş Taşıma Kapasitesi' : 'Improved Bearing Capacity', `${r.improvedSoil.qemnImproved.value.toFixed(2)} ${r.improvedSoil.qemnImproved.unit}`]);
      if (r.improvedSoil.qzemin) resRows.push([tr ? 'Zemin Gerilme Payı' : 'Soil Stress Share', `${r.improvedSoil.qzemin.value.toFixed(2)} ${r.improvedSoil.qzemin.unit}`]);
    }
    if (r.settlement) {
      if (r.settlement.deltaMm) resRows.push([tr ? 'Toplam Oturma' : 'Total Settlement', `${r.settlement.deltaMm.value.toFixed(2)} ${r.settlement.deltaMm.unit}`]);
    }

    if (resRows.length > 0) {
      autoTable(doc, {
        startY: currentY,
        head: [[tr ? 'Sonuç' : 'Result', tr ? 'Değer' : 'Value']],
        body: resRows,
        theme: 'striped',
        styles: { font: 'Roboto' },
        headStyles: { fillColor: [142, 68, 173], font: 'Roboto', fontStyle: 'normal' }
      });
      currentY = doc.lastAutoTable.finalY + 15;
    }
  }

  // --- Plan View Drawing ---
  const drawingData = projectData.drawingData;
  if (drawingData) {
    const D = parseFloat(params.D) || 0.6;
    const canvasRes = renderDrawingToDataURL(drawingData, D);

    if (canvasRes) {
      doc.addPage();
      currentY = 20;
      doc.setFontSize(14);
      doc.text(tr ? 'Yerleşim Planı' : 'Drawing Plan', 14, currentY);
      currentY += 5;

      const pageWidth = doc.internal.pageSize.getWidth() - 28;
      // Calculate aspect ratio
      const aspect = canvasRes.height / canvasRes.width;
      const imgHeight = pageWidth * aspect;

      let finalImgHeight = imgHeight;
      if (imgHeight > 150) finalImgHeight = 150; // clamp height
      const finalImgWidth = finalImgHeight / aspect;

      // Center image
      const xOff = 14 + (pageWidth - finalImgWidth) / 2;

      doc.addImage(canvasRes.imgData, 'PNG', xOff, currentY, finalImgWidth, finalImgHeight);
      currentY += finalImgHeight + 15;
    }

    // --- Jet Columns Coordinates Table (Compact) ---
    const columns = drawingData.columnPositions || [];
    if (columns.length > 0) {
      if (currentY > 230) { doc.addPage(); currentY = 20; }

      doc.setFontSize(14);
      doc.text(tr ? `Jet Kolonları Koordinatları (Toplam: ${columns.length})` : `Jet Column Coordinates (Total: ${columns.length})`, 14, currentY);
      currentY += 4;

      const columnRows = [];
      const COLS_PER_ROW = 5; // e.g. 5 columns (10 cells: X, Y per column)
      let currentRow = [];

      columns.forEach((col, i) => {
        currentRow.push(`C${i + 1}`);
        currentRow.push(`X:${col.x.toFixed(2)}, Y:${col.y.toFixed(2)}`);

        if (currentRow.length === COLS_PER_ROW * 2) {
          columnRows.push(currentRow);
          currentRow = [];
        }
      });

      if (currentRow.length > 0) {
        while (currentRow.length < COLS_PER_ROW * 2) {
          currentRow.push(''); // fill empty
        }
        columnRows.push(currentRow);
      }

      const head = [];
      for (let k = 0; k < COLS_PER_ROW; k++) {
        head.push('ID', 'Coord (m)');
      }

      autoTable(doc, {
        startY: currentY,
        head: [head],
        body: columnRows,
        theme: 'grid',
        styles: { fontSize: 7, cellPadding: 1, overflow: 'linebreak', font: 'Roboto' },
        headStyles: { fillColor: [52, 73, 94], fontSize: 8, font: 'Roboto', fontStyle: 'normal' }
      });
    }
  }

  // --- The Secret Magic: Appending JSON ---
  const pdfBlob = doc.output('blob');

  // We read the Blob as ArrayBuffer, then append our string
  const arrayBuffer = await pdfBlob.arrayBuffer();

  const payloadString = JSON.stringify(projectData);
  const hiddenDataStr = `\n${MAGIC_MARKER}\n${payloadString}`;

  // Convert hiddenDataStr to Uint8Array
  const encoder = new TextEncoder();
  const hiddenDataBytes = encoder.encode(hiddenDataStr);

  // Create final byte array
  const finalBytes = new Uint8Array(arrayBuffer.byteLength + hiddenDataBytes.byteLength);
  finalBytes.set(new Uint8Array(arrayBuffer), 0);
  finalBytes.set(hiddenDataBytes, arrayBuffer.byteLength);

  // Create final Blob
  const finalBlob = new Blob([finalBytes], { type: 'application/pdf' });

  // Download automatically
  const filename = `${title.replace(/\s+/g, '_')}_Report.pdf`;
  const url = URL.createObjectURL(finalBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Utility to read the hidden JSON from an uploaded PDF
 */
export async function parsePdfReport(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const textDecoder = new TextDecoder('utf-8');
        const text = textDecoder.decode(e.target.result);

        const markerIndex = text.lastIndexOf(MAGIC_MARKER);
        if (markerIndex === -1) {
          throw new Error('No JGC Project Data found in this PDF. Or file is corrupted.');
        }

        // Extract JSON string after marker
        const jsonString = text.substring(markerIndex + MAGIC_MARKER.length).trim();
        const projectData = JSON.parse(jsonString);

        resolve(projectData);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('File read failed'));
    reader.readAsArrayBuffer(file);
  });
}
