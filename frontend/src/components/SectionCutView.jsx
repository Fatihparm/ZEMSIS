import { useRef, useEffect } from 'react';
import './SectionCutView.css';

// Zemin tipi renkleri (CrossSectionView ile aynı)
const soilColors = {
    kum: { fill: '#d4b87a', pattern: 'dots' },
    kil: { fill: '#a98467', pattern: 'lines' },
    silt: { fill: '#b8b89a', pattern: 'dashes' },
    kaya: { fill: '#8a8a8a', pattern: 'cross' },
    cakil: { fill: '#c4a96a', pattern: 'circles' }
};

const soilNames = {
    en: { kum: 'Sand', kil: 'Clay', silt: 'Silt', kaya: 'Rock', cakil: 'Gravel' },
    tr: { kum: 'Kum', kil: 'Kil', silt: 'Silt', kaya: 'Kaya', cakil: 'Çakıl' }
};

/**
 * Compute which columns are visible from the section's view direction.
 * Returns all columns on the viewSide of the line, sorted by projection distance (t).
 * Each result: { x, y, t, perpDist, intersects }
 *   t          = projection along line from start (metres) — used as X axis
 *   perpDist   = signed perpendicular offset (positive = left of start→end)
 *   intersects = true when |perpDist| <= D/2 + tolerance (drawn red)
 *
 * viewSide: +1 = left side of travel (perpDist > 0),
 *           -1 = right side (perpDist < 0)
 */
function computeSectionColumns(sectionLine, allColumns, D, viewSide = 1) {
    const { start, end } = sectionLine;
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 0.01) return [];

    const ux = dx / len;
    const uy = dy / len;
    const nx = -uy;   // left normal (+1 side)
    const ny = ux;
    const halfD = D / 2;

    const result = [];
    allColumns.forEach(col => {
        const cx = col.x - start.x;
        const cy = col.y - start.y;
        const t = cx * ux + cy * uy;           // projection along line
        const perpDist = cx * nx + cy * ny;     // signed perpendicular distance
        // Show columns on the viewSide (perpDist * viewSide >= 0)
        // Also include those very close to the line (intersect zone)
        if (perpDist * viewSide >= -(halfD + 0.01)) {
            result.push({
                x: col.x,
                y: col.y,
                t,
                perpDist,
                intersects: Math.abs(perpDist) <= halfD + 0.01
            });
        }
    });

    result.sort((a, b) => a.t - b.t);
    return result;
}

// ── Pattern drawing (same as CrossSectionView) ──
function drawPattern(ctx, soilType, x, y, w, h, color) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.25;
    ctx.lineWidth = 0.5;

    switch (soilType) {
        case 'kum':
            for (let px = x; px < x + w; px += 10)
                for (let py = y; py < y + h; py += 10) {
                    const ox = Math.sin(px * 13.7 + py * 7.3) * 3;
                    const oy = Math.cos(px * 11.3 + py * 5.7) * 3;
                    ctx.beginPath();
                    ctx.arc(px + ox, py + oy, 1, 0, Math.PI * 2);
                    ctx.fill();
                }
            break;
        case 'kil':
            for (let py = y; py < y + h; py += 8) {
                ctx.beginPath(); ctx.moveTo(x, py); ctx.lineTo(x + w, py); ctx.stroke();
            }
            break;
        case 'silt':
            for (let px = x; px < x + w; px += 14)
                for (let py = y; py < y + h; py += 10) {
                    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + 6, py); ctx.stroke();
                }
            break;
        case 'kaya':
            for (let px = x - h; px < x + w; px += 12) {
                ctx.beginPath(); ctx.moveTo(px, y); ctx.lineTo(px + h, y + h); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(px + h, y); ctx.lineTo(px, y + h); ctx.stroke();
            }
            break;
        case 'cakil':
            for (let px = x + 8; px < x + w; px += 16)
                for (let py = y + 6; py < y + h; py += 14) {
                    ctx.beginPath(); ctx.arc(px, py, 3, 0, Math.PI * 2); ctx.stroke();
                }
            break;
    }
    ctx.restore();
}

function drawDimensionLine(ctx, x1, y1, x2, y2, label, side) {
    const arrowSize = 5;
    ctx.strokeStyle = '#ffab40';
    ctx.fillStyle = '#ffab40';
    ctx.lineWidth = 1;
    ctx.font = 'bold 11px Inter, system-ui, sans-serif';

    if (side === 'top') {
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        // Left arrow
        ctx.beginPath();
        ctx.moveTo(x1, y1); ctx.lineTo(x1 + arrowSize, y1 - arrowSize); ctx.lineTo(x1 + arrowSize, y1 + arrowSize);
        ctx.closePath(); ctx.fill();
        // Right arrow
        ctx.beginPath();
        ctx.moveTo(x2, y2); ctx.lineTo(x2 - arrowSize, y2 - arrowSize); ctx.lineTo(x2 - arrowSize, y2 + arrowSize);
        ctx.closePath(); ctx.fill();
        // Label
        ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
        ctx.fillText(label, (x1 + x2) / 2, y1 - 3);
    } else if (side === 'left') {
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        // Top arrow
        ctx.beginPath();
        ctx.moveTo(x1, y1); ctx.lineTo(x1 - arrowSize, y1 + arrowSize); ctx.lineTo(x1 + arrowSize, y1 + arrowSize);
        ctx.closePath(); ctx.fill();
        // Bottom arrow
        ctx.beginPath();
        ctx.moveTo(x2, y2); ctx.lineTo(x2 - arrowSize, y2 - arrowSize); ctx.lineTo(x2 + arrowSize, y2 - arrowSize);
        ctx.closePath(); ctx.fill();
        // Label
        ctx.save();
        ctx.translate(x1 - 8, (y1 + y2) / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
        ctx.fillText(label, 0, 0);
        ctx.restore();
    }
}

function SectionCutView({ sectionLine, columns, parameters, soilLayers, lang, sectionColor, onClose, extraParams }) {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);

    const D = parseFloat(parameters.D) || 0.6;
    const H = parseFloat(parameters.H) || 12;
    const foundationT = parseFloat(extraParams?.foundationThickness) || 0;
    const fillH = parseFloat(extraParams?.fillHeight) || 0;
    const tr = lang === 'tr';
    const viewSide = sectionLine?.viewSide ?? 1;

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !sectionLine) return;

        // Compute section columns (viewSide-aware)
        const sectionCols = computeSectionColumns(sectionLine, columns, D, viewSide);

        // Total section length
        const lineLen = Math.sqrt(
            (sectionLine.end.x - sectionLine.start.x) ** 2 +
            (sectionLine.end.y - sectionLine.start.y) ** 2
        );

        // Total soil depth
        const totalSoilDepth = soilLayers.reduce((sum, l) => sum + (parseFloat(l.thickness) || 0), 0);
        const totalAbove = foundationT + fillH; // above surface
        const totalBelow = Math.max(totalSoilDepth, H) * 1.08;
        const totalDepthRange = totalAbove + totalBelow;

        // Canvas setup (high-DPI)
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);

        const W = rect.width;
        const HH = rect.height;

        // Padding
        const pad = { top: 40, right: 80, bottom: 35, left: 60 };
        const availW = W - pad.left - pad.right;
        const availH = HH - pad.top - pad.bottom;

        // Scale (independent axes for section view)
        const ppmX = availW / lineLen;
        const ppmY = availH / totalDepthRange;

        // Chart dims
        const chartW = availW;
        const chartH = ppmY * totalDepthRange;

        const offsetX = pad.left;
        const offsetY = pad.top + (availH - chartH) / 2;

        // Scalers
        const xScale = (t) => offsetX + t * ppmX;              // t = dist along section line (m)
        const yScale = (d) => offsetY + (totalAbove + d) * ppmY; // d=0 is ground surface
        const wScale = (m) => m * ppmX;
        const hScale = (m) => m * ppmY;

        // Clear
        ctx.clearRect(0, 0, W, HH);

        const surfaceY = yScale(0);

        // ── TEMEL (Foundation slab) — EN ÜSTTE ──
        if (foundationT > 0) {
            const foundTop = yScale(-fillH - foundationT); // temel en yukarıda
            const foundBot = yScale(-fillH);               // dolgunun üstü
            const fHpx = foundBot - foundTop;

            const concGrad = ctx.createLinearGradient(offsetX, foundTop, offsetX, foundBot);
            concGrad.addColorStop(0, 'rgba(180, 180, 190, 0.65)');
            concGrad.addColorStop(1, 'rgba(140, 140, 155, 0.50)');
            ctx.fillStyle = concGrad;
            ctx.fillRect(offsetX, foundTop, chartW, fHpx);

            ctx.save();
            ctx.beginPath(); ctx.rect(offsetX, foundTop, chartW, fHpx); ctx.clip();
            ctx.strokeStyle = 'rgba(80, 80, 100, 0.35)'; ctx.lineWidth = 0.5;
            const step = 10;
            for (let px = offsetX - fHpx; px < offsetX + chartW; px += step) {
                ctx.beginPath(); ctx.moveTo(px, foundTop); ctx.lineTo(px + fHpx, foundBot); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(px + fHpx, foundTop); ctx.lineTo(px, foundBot); ctx.stroke();
            }
            ctx.restore();

            ctx.strokeStyle = 'rgba(200, 200, 220, 0.7)'; ctx.lineWidth = 1.5;
            ctx.strokeRect(offsetX, foundTop, chartW, fHpx);

            ctx.fillStyle = '#b0bec5';
            ctx.font = '10px Inter, system-ui, sans-serif';
            ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
            ctx.fillText(`${tr ? 'Temel' : 'Foundation'} (${foundationT}m)`, offsetX + chartW + 6, (foundTop + foundBot) / 2);
        }

        // ── DOLGU (Fill) — ALTTA, ZEMİN YÜZEYİNE BİTİŞİK ──
        if (fillH > 0) {
            const fillTop = yScale(-fillH);  // dolgu zeminin hemen üstünde
            const fillBot = yScale(0);       // zemin yüzeyi
            const fHpx = fillBot - fillTop;

            const fillGrad = ctx.createLinearGradient(offsetX, fillTop, offsetX, fillBot);
            fillGrad.addColorStop(0, 'rgba(139, 90, 43, 0.55)');
            fillGrad.addColorStop(1, 'rgba(160, 110, 60, 0.35)');
            ctx.fillStyle = fillGrad;
            ctx.fillRect(offsetX, fillTop, chartW, fHpx);

            ctx.save();
            ctx.beginPath(); ctx.rect(offsetX, fillTop, chartW, fHpx); ctx.clip();
            ctx.strokeStyle = 'rgba(139, 90, 43, 0.4)'; ctx.lineWidth = 0.5;
            for (let py = fillTop; py < fillTop + fHpx; py += 10) {
                ctx.beginPath(); ctx.moveTo(offsetX, py); ctx.lineTo(offsetX + fHpx, py + fHpx); ctx.stroke();
            }
            ctx.restore();

            ctx.fillStyle = '#cd7f32';
            ctx.font = '10px Inter, system-ui, sans-serif';
            ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
            ctx.fillText(`${tr ? 'Dolgu' : 'Fill'} (${fillH}m)`, offsetX + chartW + 6, (fillTop + fillBot) / 2);

            ctx.strokeStyle = 'rgba(180, 120, 60, 0.6)'; ctx.lineWidth = 1;
            ctx.setLineDash([5, 3]);
            ctx.beginPath(); ctx.moveTo(offsetX, fillTop); ctx.lineTo(offsetX + chartW, fillTop); ctx.stroke();
            ctx.setLineDash([]);
        }

        // ── Surface line ──
        ctx.strokeStyle = '#66bb6a';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(offsetX - 10, surfaceY);
        ctx.lineTo(offsetX + chartW + 10, surfaceY);
        ctx.stroke();

        // Grass pattern
        ctx.fillStyle = '#66bb6a';
        ctx.font = '10px sans-serif';
        for (let x = offsetX; x < offsetX + chartW; x += 12) {
            ctx.fillText('⌃', x, surfaceY - 2);
        }

        // ── Soil layers ──
        let cumulativeDepth = 0;
        soilLayers.forEach((layer) => {
            const thickness = parseFloat(layer.thickness) || 0;
            const y1 = yScale(cumulativeDepth);
            const y2 = yScale(cumulativeDepth + thickness);
            const layerH = y2 - y1;
            const colors = soilColors[layer.soilType] || soilColors.kil;

            // Fill
            ctx.fillStyle = colors.fill;
            ctx.globalAlpha = 0.35;
            ctx.fillRect(offsetX, y1, chartW, layerH);
            ctx.globalAlpha = 1.0;

            // Pattern
            drawPattern(ctx, layer.soilType, offsetX, y1, chartW, layerH, colors.fill);

            // Layer boundary
            if (cumulativeDepth > 0) {
                ctx.strokeStyle = 'rgba(255,255,255,0.3)';
                ctx.lineWidth = 1;
                ctx.setLineDash([6, 4]);
                ctx.beginPath();
                ctx.moveTo(offsetX, y1);
                ctx.lineTo(offsetX + chartW, y1);
                ctx.stroke();
                ctx.setLineDash([]);
            }

            // Layer label (right side)
            const midY = (y1 + y2) / 2;
            const name = soilNames[lang]?.[layer.soilType] || layer.soilType;
            if (layerH > 18) {
                ctx.fillStyle = '#e0e0e0';
                ctx.font = '11px Inter, system-ui, sans-serif';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                ctx.fillText(`${name} (${thickness}m)`, offsetX + chartW + 8, midY);
            }

            cumulativeDepth += thickness;
        });

        // Bottom boundary
        const bottomY = yScale(totalSoilDepth);
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 1;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(offsetX, bottomY);
        ctx.lineTo(offsetX + chartW, bottomY);
        ctx.stroke();
        ctx.setLineDash([]);

        // ── Jet Grout Columns along section ──
        // Kolon tepesi: temel varsa temel tabanından (zemin yüzeyinde), yoksa tam zemin yüzeyinden başlar.
        // Her halükarda kolonlar zemin yüzeyinin ÜSTÜNE taşamaz — clipping ile sınırlandırılır.
        const colTopY = surfaceY;  // kolonlar zemin yüzeyinden başlar
        const colHeight = hScale(H);

        // Kolonları zemin yüzeyi altıyla sınırlandır (taşmayı önle)
        ctx.save();
        ctx.beginPath();
        ctx.rect(offsetX, surfaceY, chartW, offsetY + chartH - surfaceY);
        ctx.clip();

        sectionCols.forEach((col) => {
            const colCenterX = xScale(col.t);
            const colHalfW = wScale(D) / 2;
            const colLeft = colCenterX - colHalfW;
            const colW = colHalfW * 2;
            const isIntersect = col.intersects;

            // Shadow
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.fillRect(colLeft + 2, colTopY + 2, colW, colHeight);

            // Column gradient
            const grad = ctx.createLinearGradient(colLeft, colTopY, colLeft + colW, colTopY);
            if (isIntersect) {
                // Red: column directly cut by the section plane
                grad.addColorStop(0, 'rgba(239, 83, 80, 0.75)');
                grad.addColorStop(0.3, 'rgba(255, 120, 118, 0.90)');
                grad.addColorStop(0.7, 'rgba(255, 120, 118, 0.90)');
                grad.addColorStop(1, 'rgba(239, 83, 80, 0.75)');
            } else {
                // Blue: column visible but not cut
                grad.addColorStop(0, 'rgba(100, 181, 246, 0.55)');
                grad.addColorStop(0.3, 'rgba(144, 202, 249, 0.70)');
                grad.addColorStop(0.7, 'rgba(144, 202, 249, 0.70)');
                grad.addColorStop(1, 'rgba(100, 181, 246, 0.55)');
            }

            ctx.fillStyle = grad;
            ctx.fillRect(colLeft, colTopY, colW, colHeight);

            // Column border
            ctx.strokeStyle = isIntersect ? '#ef5350' : '#42a5f5';
            ctx.lineWidth = isIntersect ? 2 : 1.5;
            ctx.strokeRect(colLeft, colTopY, colW, colHeight);

            // Column bottom line
            ctx.strokeStyle = isIntersect ? '#c62828' : '#1e88e5';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(colLeft, colTopY + colHeight);
            ctx.lineTo(colLeft + colW, colTopY + colHeight);
            ctx.stroke();

            // Cross-hatch pattern (concrete)
            ctx.strokeStyle = isIntersect ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.12)';
            ctx.lineWidth = 0.5;
            const step = 8;
            for (let py = colTopY; py < colTopY + colHeight; py += step) {
                ctx.beginPath();
                ctx.moveTo(colLeft, py);
                ctx.lineTo(colLeft + colW, py + step);
                ctx.stroke();
            }
        });

        // Clipping bölgesini geri al
        ctx.restore();

        // ── Dimension line: D on first column ──
        if (sectionCols.length > 0) {
            const firstCol = sectionCols[0];
            const fc = xScale(firstCol.t);
            const fcL = fc - wScale(D) / 2;
            const fcR = fc + wScale(D) / 2;
            const dimYD = colTopY - 12;
            drawDimensionLine(ctx, fcL, dimYD, fcR, dimYD, `D = ${D}m`, 'top');

            // Extension lines
            ctx.strokeStyle = 'rgba(255, 171, 64, 0.4)';
            ctx.lineWidth = 0.5;
            ctx.setLineDash([3, 3]);
            ctx.beginPath(); ctx.moveTo(fcL, colTopY); ctx.lineTo(fcL, dimYD - 5); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(fcR, colTopY); ctx.lineTo(fcR, dimYD - 5); ctx.stroke();
            ctx.setLineDash([]);
        }

        // ── H dimension line (left side) ──
        const hDimX = offsetX - 15;
        drawDimensionLine(ctx, hDimX, colTopY, hDimX, colTopY + colHeight, `H = ${H}m`, 'left');

        // Extension lines for H
        ctx.strokeStyle = 'rgba(255, 171, 64, 0.4)';
        ctx.lineWidth = 0.5;
        ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.moveTo(offsetX, colTopY); ctx.lineTo(hDimX - 5, colTopY); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(offsetX, colTopY + colHeight); ctx.lineTo(hDimX - 5, colTopY + colHeight); ctx.stroke();
        ctx.setLineDash([]);

        // ── Foundation + Fill height labels (left axis) ──
        if (foundationT > 0) {
            const foundTop = yScale(-fillH - foundationT);
            const foundBot = yScale(-fillH);
            ctx.fillStyle = '#b0bec5'; ctx.font = '9px Inter, system-ui, sans-serif';
            ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
            ctx.fillText(`-${(fillH + foundationT).toFixed(1)}m`, offsetX - 6, (foundTop + foundBot) / 2);
        }
        if (fillH > 0) {
            const fillTop = yScale(-fillH);
            const fillBot = yScale(0);
            ctx.fillStyle = '#cd7f32'; ctx.font = '9px Inter, system-ui, sans-serif';
            ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
            ctx.fillText(`-${fillH.toFixed(1)}m`, offsetX - 6, (fillTop + fillBot) / 2);
        }

        // ── Depth scale (Y axis) ──
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '10px Inter, system-ui, sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';

        // 0m = ground surface
        ctx.fillText('0', offsetX - 6, surfaceY);

        // Layer boundaries
        let cumD = 0;
        soilLayers.forEach((layer) => {
            cumD += parseFloat(layer.thickness) || 0;
            const y = yScale(cumD);
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.fillText(cumD.toFixed(1) + 'm', offsetX - 6, y);
            // Tick
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(offsetX - 4, y); ctx.lineTo(offsetX, y); ctx.stroke();
        });

        // H depth if doesn't match a layer boundary
        const hY = yScale(H);
        let hMatchesLayer = false;
        let checkD = 0;
        for (const l of soilLayers) {
            checkD += parseFloat(l.thickness) || 0;
            if (Math.abs(checkD - H) < 0.1) { hMatchesLayer = true; break; }
        }
        if (!hMatchesLayer) {
            ctx.fillStyle = '#42a5f5';
            ctx.fillText(H.toFixed(1) + 'm', offsetX - 6, hY);
        }

        // ── Section length scale (X axis, bottom) ──
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.font = '10px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        const xLabelStep = lineLen > 20 ? 5 : (lineLen > 10 ? 2 : 1);
        for (let t = 0; t <= lineLen; t += xLabelStep) {
            const x = xScale(t);
            ctx.fillText(t.toFixed(0) + 'm', x, offsetY + chartH + 6);
            // Tick
            ctx.strokeStyle = 'rgba(255,255,255,0.2)';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(x, offsetY + chartH); ctx.lineTo(x, offsetY + chartH + 4); ctx.stroke();
        }

        // ── Legend ──
        const legendY = offsetY + chartH + 20;
        if (legendY + 12 < HH) {
            ctx.font = '10px Inter, system-ui, sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';

            // Legend
            ctx.fillStyle = 'rgba(100, 181, 246, 0.55)';
            ctx.fillRect(offsetX, legendY, 14, 10);
            ctx.strokeStyle = '#42a5f5';
            ctx.lineWidth = 1;
            ctx.strokeRect(offsetX, legendY, 14, 10);
            ctx.fillStyle = '#e0e0e0';
            ctx.fillText(tr ? 'Jet Grout (görünür)' : 'Jet Grout (visible)', offsetX + 20, legendY + 5);

            // Intersect legend
            ctx.fillStyle = 'rgba(239, 83, 80, 0.75)';
            ctx.fillRect(offsetX + 130, legendY, 14, 10);
            ctx.strokeStyle = '#ef5350';
            ctx.lineWidth = 1;
            ctx.strokeRect(offsetX + 130, legendY, 14, 10);
            ctx.fillStyle = '#ef9a9a';
            ctx.fillText(tr ? 'Kesit üzerinde' : 'On section plane', offsetX + 150, legendY + 5);

            // Column count
            const intersectCount = sectionCols.filter(c => c.intersects).length;
            const colText = tr
                ? `${sectionCols.length} görünür kolon (${intersectCount} kesitte)`
                : `${sectionCols.length} visible (${intersectCount} on section)`;
            ctx.fillStyle = '#90caf9';
            ctx.fillText(colText, offsetX + 290, legendY + 5);
        }

    }, [sectionLine, columns, parameters, soilLayers, lang, D, H, tr, foundationT, fillH, viewSide]);

    // Resize observer
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        const ro = new ResizeObserver(() => {
            // Trigger re-render by updating canvas
            const canvas = canvasRef.current;
            if (canvas) canvas.dispatchEvent(new Event('resize'));
        });
        ro.observe(container);
        return () => ro.disconnect();
    }, []);

    if (!sectionLine) {
        return (
            <div className="section-cut-wrapper">
                <div className="section-cut-empty">
                    {tr ? '✂️ Bir kesit çizgisi seçin' : '✂️ Select a section line'}
                </div>
            </div>
        );
    }

    const sectionCols = computeSectionColumns(sectionLine, columns, D, viewSide);
    const lineLen = Math.sqrt(
        (sectionLine.end.x - sectionLine.start.x) ** 2 +
        (sectionLine.end.y - sectionLine.start.y) ** 2
    );

    return (
        <div className="section-cut-wrapper">
            <div className="section-cut-header">
                <div className="section-cut-header-left">
                    <span className="section-cut-label">
                        {tr ? 'Kesit Görünümü' : 'Section View'}
                    </span>
                    <span className="section-cut-badge"
                        style={{ background: sectionColor + '22', color: sectionColor, border: `1px solid ${sectionColor}55` }}>
                        {sectionLine.label}
                    </span>
                </div>
                <div className="section-cut-info">
                    <span>📏 {lineLen.toFixed(1)}m</span>
                    <span>🔵 {sectionCols.length} {tr ? 'kolon' : 'col'}</span>
                </div>
                {onClose && (
                    <button className="section-cut-close-btn" onClick={onClose} title={tr ? 'Kapat' : 'Close'}>✕</button>
                )}
            </div>
            <div className="section-cut-canvas-container" ref={containerRef}>
                <canvas ref={canvasRef} className="section-cut-canvas" />
            </div>
        </div>
    );
}

export { computeSectionColumns };
export default SectionCutView;
