import { useRef, useEffect, useState } from 'react';
import MobileWarning from './MobileWarning';
import './CrossSectionView.css';

// Zemin tipi renkleri
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

function CrossSectionView({ parameters, soilLayers, lang, onParameterChange, extraParams, onExtraParamsChange }) {
    const canvasRef = useRef(null);
    const [groundSurface, setGroundSurface] = useState(0);   // Zemin yüzeyi derinliği (m)
    const [waterTable, setWaterTable] = useState(3);           // Yeraltı su seviyesi derinliği (m)

    // Extra visual params (local, synced up via callback)
    const [localFoundation, setLocalFoundation] = useState(extraParams?.foundationThickness ?? 0.5);
    const [localFill, setLocalFill] = useState(extraParams?.fillHeight ?? 0);

    // Sync from parent if extraParams changes externally
    useEffect(() => {
        if (extraParams?.foundationThickness !== undefined) setLocalFoundation(extraParams.foundationThickness);
        if (extraParams?.fillHeight !== undefined) setLocalFill(extraParams.fillHeight);
    }, [extraParams]);

    const notifyExtra = (field, value) => {
        if (onExtraParamsChange) {
            onExtraParamsChange({ ...extraParams, foundationThickness: localFoundation, fillHeight: localFill, [field]: value });
        }
    };

    const handleFoundationChange = (val) => {
        setLocalFoundation(val);
        notifyExtra('foundationThickness', val);
    };

    const handleFillChange = (val) => {
        setLocalFill(val);
        notifyExtra('fillHeight', val);
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const D = parseFloat(parameters.D) || 0.6;
        const s = parseFloat(parameters.s) || 1.6;
        const H = parseFloat(parameters.H) || 12;
        const gwDepth = parseFloat(waterTable) || 0;
        const surfaceDepth = parseFloat(groundSurface) || 0;
        const foundationT = parseFloat(localFoundation) || 0;
        const fillH = parseFloat(localFill) || 0;

        // Total visible depth range
        const totalSoilDepth = soilLayers.reduce((sum, l) => sum + (parseFloat(l.thickness) || 0), 0);
        // We will show fill above zemin surface (negative depth direction)
        // totalAbove = fillH + foundationT displayed above zemin surface
        const totalAbove = fillH + foundationT; // how much we show above surface (m)
        const totalBelow = Math.max(totalSoilDepth, H) * 1.08;

        const numCols = 2;
        const totalWidth = s * numCols;

        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);

        const W = rect.width;
        const HH = rect.height;

        const pad = { top: 80, right: 90, bottom: 55, left: 95 };
        const availW = W - pad.left - pad.right;
        const availH = HH - pad.top - pad.bottom;

        const totalDepthRange = totalAbove + totalBelow;

        const ppmX = availW / totalWidth;
        const ppmY = availH / totalDepthRange;
        const ppm = Math.min(ppmX, ppmY);

        const chartW = ppm * totalWidth;
        const chartH = ppm * totalDepthRange;

        const offsetX = pad.left + (availW - chartW) / 2;
        const offsetY = pad.top + (availH - chartH) / 2;

        // 0 = zemin yüzeyi. Negatif = yukarı (dolgu/temel), pozitif = aşağı (zemin)
        // yScale: depth in metres from zemin surface → canvas Y
        const xScale = (m) => offsetX + m * ppm;
        const yScale = (d) => offsetY + (totalAbove + d) * ppm;   // d=0 is surface
        const wScale = (m) => m * ppm;
        const hScale = (m) => m * ppm;

        ctx.clearRect(0, 0, W, HH);

        const surfaceY = yScale(0);  // zemin yüzey Y konumu

        // ── TEMEL (Foundation slab) — EN ÜSTTE ──
        if (foundationT > 0) {
            const foundTop = yScale(-fillH - foundationT); // temel en yukarıda
            const foundBot = yScale(-fillH);               // dolgunun üstü
            const fH = foundBot - foundTop;

            const concGrad = ctx.createLinearGradient(offsetX, foundTop, offsetX, foundBot);
            concGrad.addColorStop(0, 'rgba(180, 180, 190, 0.65)');
            concGrad.addColorStop(1, 'rgba(140, 140, 155, 0.50)');
            ctx.fillStyle = concGrad;
            ctx.fillRect(offsetX, foundTop, chartW, fH);

            ctx.save();
            ctx.beginPath();
            ctx.rect(offsetX, foundTop, chartW, fH);
            ctx.clip();
            ctx.strokeStyle = 'rgba(80, 80, 100, 0.35)';
            ctx.lineWidth = 0.5;
            const stepF = 10;
            for (let px = offsetX - fH; px < offsetX + chartW; px += stepF) {
                ctx.beginPath(); ctx.moveTo(px, foundTop); ctx.lineTo(px + fH, foundBot); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(px + fH, foundTop); ctx.lineTo(px, foundBot); ctx.stroke();
            }
            ctx.restore();

            ctx.strokeStyle = 'rgba(200, 200, 220, 0.7)';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(offsetX, foundTop, chartW, fH);

            ctx.fillStyle = '#b0bec5';
            ctx.font = 'bold 10px Inter, system-ui, sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(`${lang === 'tr' ? 'Temel' : 'Foundation'} (${foundationT}m)`, offsetX + chartW + 8, (foundTop + foundBot) / 2);

            const dimX_f = offsetX - 30;
            drawDimensionLine(ctx, dimX_f, foundTop, dimX_f, foundBot, `${foundationT}m`, 'left');
        }

        // ── DOLGU (Fill) — ALTTA, ZEMİN YÜZEYİNE BİTİŞİK ──
        if (fillH > 0) {
            const fillTop = yScale(-fillH);  // dolgu zeminin hemen üstünde
            const fillBot = yScale(0);       // zemin yüzeyi
            const fillHeight_ = fillBot - fillTop;

            const fillGrad = ctx.createLinearGradient(offsetX, fillTop, offsetX, fillBot);
            fillGrad.addColorStop(0, 'rgba(139, 90, 43, 0.55)');
            fillGrad.addColorStop(1, 'rgba(160, 110, 60, 0.35)');
            ctx.fillStyle = fillGrad;
            ctx.fillRect(offsetX, fillTop, chartW, fillHeight_);

            ctx.strokeStyle = 'rgba(139, 90, 43, 0.4)';
            ctx.lineWidth = 0.5;
            ctx.save();
            ctx.beginPath();
            ctx.rect(offsetX, fillTop, chartW, fillHeight_);
            ctx.clip();
            for (let py = fillTop; py < fillTop + fillHeight_; py += 10) {
                ctx.beginPath(); ctx.moveTo(offsetX, py); ctx.lineTo(offsetX + fillHeight_, py + fillHeight_); ctx.stroke();
            }
            ctx.restore();

            ctx.fillStyle = '#cd7f32';
            ctx.font = 'bold 10px Inter, system-ui, sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(`${lang === 'tr' ? 'Dolgu' : 'Fill'} (${fillH}m)`, offsetX + chartW + 8, (fillTop + fillBot) / 2);

            ctx.strokeStyle = 'rgba(180, 120, 60, 0.6)';
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 3]);
            ctx.beginPath();
            ctx.moveTo(offsetX, fillTop);
            ctx.lineTo(offsetX + chartW, fillTop);
            ctx.stroke();
            ctx.setLineDash([]);

            const dimX_fill = offsetX - 52;
            drawDimensionLine(ctx, dimX_fill, fillTop, dimX_fill, fillBot, `${fillH}m`, 'left');
        }

        // ── YÜZEY ÇİZGİSİ ──
        ctx.strokeStyle = '#66bb6a';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(offsetX - 10, surfaceY);
        ctx.lineTo(offsetX + chartW + 10, surfaceY);
        ctx.stroke();

        // Çim deseni
        ctx.fillStyle = '#66bb6a';
        ctx.font = '10px sans-serif';
        for (let x = offsetX; x < offsetX + chartW; x += 12) {
            ctx.fillText('⌃', x, surfaceY - 2);
        }

        // ── ZEMİN TABAKALARI ──
        let cumulativeDepth = 0;
        soilLayers.forEach((layer) => {
            const thickness = parseFloat(layer.thickness) || 0;
            const y1 = yScale(cumulativeDepth);
            const y2 = yScale(cumulativeDepth + thickness);
            const layerH = y2 - y1;
            const colors = soilColors[layer.soilType] || soilColors.kil;

            ctx.fillStyle = colors.fill;
            ctx.globalAlpha = 0.35;
            ctx.fillRect(offsetX, y1, chartW, layerH);
            ctx.globalAlpha = 1.0;

            drawPattern(ctx, layer.soilType, offsetX, y1, chartW, layerH, colors.fill);

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

        // Alt sınır
        const bottomY = yScale(totalSoilDepth);
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 1;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(offsetX, bottomY);
        ctx.lineTo(offsetX + chartW, bottomY);
        ctx.stroke();
        ctx.setLineDash([]);

        // ── JET GROUT KOLONLARI ──
        // Kolonları zemin yüzeyi altıyla sınırlandır (taşmayı önle)
        ctx.save();
        ctx.beginPath();
        ctx.rect(offsetX, surfaceY, chartW, offsetY + chartH - surfaceY);
        ctx.clip();

        for (let i = 0; i < numCols; i++) {
            const colCenterX = s / 2 + i * s;
            const colLeft = xScale(colCenterX - D / 2);
            const colWidth = wScale(D);
            const colTop = surfaceY;  // kolonlar zemin yüzeyinden başlar
            const colHeight = hScale(H);

            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.fillRect(colLeft + 3, colTop + 3, colWidth, colHeight);

            const grad = ctx.createLinearGradient(colLeft, colTop, colLeft + colWidth, colTop);
            grad.addColorStop(0, 'rgba(100, 181, 246, 0.7)');
            grad.addColorStop(0.3, 'rgba(144, 202, 249, 0.85)');
            grad.addColorStop(0.7, 'rgba(144, 202, 249, 0.85)');
            grad.addColorStop(1, 'rgba(100, 181, 246, 0.7)');

            ctx.fillStyle = grad;
            ctx.fillRect(colLeft, colTop, colWidth, colHeight);

            ctx.strokeStyle = '#42a5f5';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(colLeft, colTop, colWidth, colHeight);

            ctx.strokeStyle = '#1e88e5';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(colLeft, colTop + colHeight);
            ctx.lineTo(colLeft + colWidth, colTop + colHeight);
            ctx.stroke();

            ctx.strokeStyle = 'rgba(255,255,255,0.12)';
            ctx.lineWidth = 0.5;
            const step2 = 8;
            for (let y = colTop; y < colTop + colHeight; y += step2) {
                ctx.beginPath();
                ctx.moveTo(colLeft, y);
                ctx.lineTo(colLeft + colWidth, y + step2);
                ctx.stroke();
            }
        }

        // Clipping bölgesini geri al
        ctx.restore();

        // ── BOYUT ÇİZGİLERİ (D ve s) ──
        const col1CenterX = s / 2;
        const col1Left = xScale(col1CenterX - D / 2);
        const col1Right = xScale(col1CenterX + D / 2);
        const colTopY = yScale(0);
        const dimY_D = colTopY - 18;
        drawDimensionLine(ctx, col1Left, dimY_D, col1Right, dimY_D, `D = ${D}m`, 'top');

        const col2CenterX = s / 2 + s;
        const cx1 = xScale(col1CenterX);
        const cx2 = xScale(col2CenterX);
        const dimY_s = offsetY - 38;
        drawDimensionLine(ctx, cx1, dimY_s, cx2, dimY_s, `s = ${s}m`, 'top');

        ctx.strokeStyle = 'rgba(255, 171, 64, 0.4)';
        ctx.lineWidth = 0.5;
        ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.moveTo(col1Left, colTopY); ctx.lineTo(col1Left, dimY_D - 5); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(col1Right, colTopY); ctx.lineTo(col1Right, dimY_D - 5); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx1, dimY_D - 8); ctx.lineTo(cx1, dimY_s - 5); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx2, dimY_D - 8); ctx.lineTo(cx2, dimY_s - 5); ctx.stroke();
        ctx.setLineDash([]);

        // ── YERALTI SU SEVİYESİ ──
        if (gwDepth > 0 && gwDepth < totalSoilDepth) {
            const gwY = yScale(gwDepth);

            const waterGrad = ctx.createLinearGradient(0, gwY, 0, offsetY + chartH);
            waterGrad.addColorStop(0, 'rgba(33, 150, 243, 0.08)');
            waterGrad.addColorStop(1, 'rgba(33, 150, 243, 0.15)');
            ctx.fillStyle = waterGrad;
            ctx.fillRect(offsetX, gwY, chartW, offsetY + chartH - gwY);

            ctx.strokeStyle = '#2196f3';
            ctx.lineWidth = 2;
            ctx.setLineDash([8, 4]);
            ctx.beginPath();
            ctx.moveTo(offsetX, gwY);
            ctx.lineTo(offsetX + chartW, gwY);
            ctx.stroke();
            ctx.setLineDash([]);

            const triSize = 8;
            const triX = offsetX + chartW + 12;
            ctx.fillStyle = '#2196f3';
            ctx.beginPath();
            ctx.moveTo(triX - triSize, gwY - 2);
            ctx.lineTo(triX + triSize, gwY - 2);
            ctx.lineTo(triX, gwY + triSize + 2);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = '#2196f3';
            ctx.font = '10px Inter, system-ui, sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            const gwLabel = lang === 'tr' ? 'YASS' : 'GW';
            ctx.fillText(`${gwLabel} ${gwDepth.toFixed(1)}m`, triX + triSize + 4, gwY);
        }

        // ── DERINLIK ÖLÇEĞI (Y ekseni) ──
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '11px Inter, system-ui, sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';

        // 0m = zemin yüzeyi
        ctx.fillText('0', offsetX - 30, surfaceY);

        let cumD = 0;
        soilLayers.forEach((layer) => {
            cumD += parseFloat(layer.thickness) || 0;
            const y = yScale(cumD);
            ctx.fillText(cumD.toFixed(1) + 'm', offsetX - 30, y);
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(offsetX - 4, y);
            ctx.lineTo(offsetX, y);
            ctx.stroke();
        });

        const hY = yScale(H);
        let hMatchesLayer = false;
        let checkD = 0;
        for (const l of soilLayers) {
            checkD += parseFloat(l.thickness) || 0;
            if (Math.abs(checkD - H) < 0.1) { hMatchesLayer = true; break; }
        }
        if (!hMatchesLayer) {
            ctx.fillStyle = '#42a5f5';
            ctx.fillText(H.toFixed(1) + 'm', offsetX - 30, hY);
        }

        // ── LEJAND ──
        const legendY = offsetY + chartH + 15;
        ctx.font = '11px Inter, system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';

        ctx.fillStyle = 'rgba(144, 202, 249, 0.7)';
        ctx.fillRect(offsetX, legendY, 16, 12);
        ctx.strokeStyle = '#42a5f5';
        ctx.lineWidth = 1;
        ctx.strokeRect(offsetX, legendY, 16, 12);
        ctx.fillStyle = '#e0e0e0';
        ctx.fillText('Jet Grout', offsetX + 22, legendY + 6);

        const Ar = (Math.PI * (D / 2) ** 2) / (s ** 2);
        const arText = lang === 'tr'
            ? `İyileştirme Oranı (Ar) = ${(Ar * 100).toFixed(1)}%`
            : `Improvement Ratio (Ar) = ${(Ar * 100).toFixed(1)}%`;
        ctx.fillStyle = '#90caf9';
        ctx.fillText(arText, offsetX + 100, legendY + 6);

    }, [parameters, soilLayers, lang, waterTable, groundSurface, localFoundation, localFill]);

    // ── ResizeObserver: redraw on container/orientation change ──
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ro = new ResizeObserver(() => {
            setGroundSurface(v => v); // trigger redraw
        });
        ro.observe(canvas.parentElement || canvas);
        return () => ro.disconnect();
    }, []);

    const tr = lang === 'tr';

    return (
        <MobileWarning
            lang={lang}
            type="crossSection"
            summaryData={{ D: parameters.D, s: parameters.s, H: parameters.H }}
        >
        <div className="cross-section-wrapper">
            <h3>{tr ? 'Jet Grout Kesit Görünümü' : 'Jet Grout Cross-Section View'}</h3>

            <div className="cross-section-controls">
                {/* D — Çap */}
                <div className="cs-control-group">
                    <label>{tr ? 'Kolon Çapı (D)' : 'Column Diameter (D)'}</label>
                    <div className="cs-input-row">
                        <input
                            type="number"
                            value={parameters.D || 0.6}
                            onChange={(e) => onParameterChange && onParameterChange({ target: { name: 'D', value: e.target.value } })}
                            min={0.3}
                            max={3.0}
                            step={0.1}
                        />
                        <span className="cs-unit">m</span>
                    </div>
                </div>

                {/* s — Aralık */}
                <div className="cs-control-group">
                    <label>{tr ? 'Kolon Aralığı (s)' : 'Column Spacing (s)'}</label>
                    <div className="cs-input-row">
                        <input
                            type="number"
                            value={parameters.s || 1.6}
                            onChange={(e) => onParameterChange && onParameterChange({ target: { name: 's', value: e.target.value } })}
                            min={0.5}
                            max={10.0}
                            step={0.1}
                        />
                        <span className="cs-unit">m</span>
                    </div>
                </div>

                {/* H — Kolon Yüksekliği */}
                <div className="cs-control-group">
                    <label>{tr ? 'Kolon Yüksekliği (H)' : 'Column Height (H)'}</label>
                    <div className="cs-input-row">
                        <input
                            type="number"
                            value={parameters.H || 12}
                            onChange={(e) => onParameterChange && onParameterChange({ target: { name: 'H', value: e.target.value } })}
                            min={1}
                            max={50}
                            step={0.5}
                        />
                        <span className="cs-unit">m</span>
                    </div>
                </div>

                <div className="cs-divider" />

                {/* Temel Kalınlığı */}
                <div className="cs-control-group">
                    <label className="cs-label-foundation">
                        <span className="cs-badge-icon">▭</span>
                        {tr ? 'Temel Kalınlığı' : 'Foundation Thickness'}
                    </label>
                    <div className="cs-input-row">
                        <input
                            type="number"
                            value={localFoundation}
                            onChange={(e) => handleFoundationChange(parseFloat(e.target.value) || 0)}
                            min={0}
                            max={5}
                            step={0.1}
                        />
                        <span className="cs-unit">m</span>
                    </div>
                </div>

                {/* Dolgu */}
                <div className="cs-control-group">
                    <label className="cs-label-fill">
                        <span className="cs-badge-icon">▤</span>
                        {tr ? 'Dolgu Yüksekliği' : 'Fill Height'}
                    </label>
                    <div className="cs-input-row">
                        <input
                            type="number"
                            value={localFill}
                            onChange={(e) => handleFillChange(parseFloat(e.target.value) || 0)}
                            min={0}
                            max={10}
                            step={0.1}
                        />
                        <span className="cs-unit">m</span>
                    </div>
                </div>

                <div className="cs-divider" />

                {/* Zemin Yüzeyi */}
                <div className="cs-control-group">
                    <label>{tr ? 'Zemin Yüzeyi Derinliği' : 'Ground Surface Depth'}</label>
                    <div className="cs-input-row">
                        <input
                            type="number"
                            value={groundSurface}
                            onChange={(e) => setGroundSurface(e.target.value)}
                            min={0}
                            max={20}
                            step={0.5}
                        />
                        <span className="cs-unit">m</span>
                    </div>
                </div>

                {/* Yeraltı Suyu */}
                <div className="cs-control-group">
                    <label>
                        <span className="cs-water-icon">▼</span>
                        {tr ? 'Yeraltı Suyu Seviyesi' : 'Groundwater Table'}
                    </label>
                    <div className="cs-input-row">
                        <input
                            type="number"
                            value={waterTable}
                            onChange={(e) => setWaterTable(e.target.value)}
                            min={0}
                            max={50}
                            step={0.5}
                        />
                        <span className="cs-unit">m</span>
                    </div>
                </div>
            </div>

            <div className="cross-section-container">
                <canvas ref={canvasRef} className="cross-section-canvas" />
            </div>
        </div>
        </MobileWarning>
    );
}

// ── YARDIMCI FONKSİYONLAR ──

function drawDimensionLine(ctx, x1, y1, x2, y2, label, side) {
    const arrowSize = 5;
    ctx.strokeStyle = '#ffab40';
    ctx.fillStyle = '#ffab40';
    ctx.lineWidth = 1;
    ctx.font = 'bold 11px Inter, system-ui, sans-serif';

    if (side === 'top') {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x1 + arrowSize, y1 - arrowSize);
        ctx.lineTo(x1 + arrowSize, y1 + arrowSize);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - arrowSize, y2 - arrowSize);
        ctx.lineTo(x2 - arrowSize, y2 + arrowSize);
        ctx.closePath();
        ctx.fill();

        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(label, (x1 + x2) / 2, y1 - 3);
    } else if (side === 'left') {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x1 - arrowSize, y1 + arrowSize);
        ctx.lineTo(x1 + arrowSize, y1 + arrowSize);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - arrowSize, y2 - arrowSize);
        ctx.lineTo(x2 + arrowSize, y2 - arrowSize);
        ctx.closePath();
        ctx.fill();

        ctx.save();
        ctx.translate(x1 - 8, (y1 + y2) / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(label, 0, 0);
        ctx.restore();
    }
}

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
            for (let px = x; px < x + w; px += 10) {
                for (let py = y; py < y + h; py += 10) {
                    const ox = (Math.sin(px * 13.7 + py * 7.3) * 3);
                    const oy = (Math.cos(px * 11.3 + py * 5.7) * 3);
                    ctx.beginPath();
                    ctx.arc(px + ox, py + oy, 1, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            break;

        case 'kil':
            for (let py = y; py < y + h; py += 8) {
                ctx.beginPath();
                ctx.moveTo(x, py);
                ctx.lineTo(x + w, py);
                ctx.stroke();
            }
            break;

        case 'silt':
            for (let px = x; px < x + w; px += 14) {
                for (let py = y; py < y + h; py += 10) {
                    ctx.beginPath();
                    ctx.moveTo(px, py);
                    ctx.lineTo(px + 6, py);
                    ctx.stroke();
                }
            }
            break;

        case 'kaya':
            for (let px = x - h; px < x + w; px += 12) {
                ctx.beginPath();
                ctx.moveTo(px, y);
                ctx.lineTo(px + h, y + h);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(px + h, y);
                ctx.lineTo(px, y + h);
                ctx.stroke();
            }
            break;

        case 'cakil':
            for (let px = x + 8; px < x + w; px += 16) {
                for (let py = y + 6; py < y + h; py += 14) {
                    ctx.beginPath();
                    ctx.arc(px, py, 3, 0, Math.PI * 2);
                    ctx.stroke();
                }
            }
            break;
    }

    ctx.restore();
}

export default CrossSectionView;
