import { useRef, useEffect, useState } from 'react';
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

function CrossSectionView({ parameters, soilLayers, lang }) {
    const canvasRef = useRef(null);
    const [groundSurface, setGroundSurface] = useState(0);   // Zemin yüzeyi derinliği (m) - 0 = yüzeyde
    const [waterTable, setWaterTable] = useState(3);          // Yeraltı su seviyesi derinliği (m)

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const D = parseFloat(parameters.D) || 0.6;
        const s = parseFloat(parameters.s) || 1.6;
        const H = parseFloat(parameters.H) || 12;
        const gwDepth = parseFloat(waterTable) || 0;
        const surfaceDepth = parseFloat(groundSurface) || 0;

        // Toplam zemin derinliği
        const totalSoilDepth = soilLayers.reduce((sum, l) => sum + (parseFloat(l.thickness) || 0), 0);
        const totalDepth = Math.max(totalSoilDepth, H) * 1.08; // %8 margin

        // Görünür genişlik: en az 4 kolon göster
        const numCols = 4;
        const totalWidth = s * numCols;

        // High-DPI
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);

        const W = rect.width;
        const HH = rect.height;

        // Padding — geniş tutuldu: boyut okları ve etiketler için
        const pad = { top: 60, right: 90, bottom: 55, left: 95 };
        const availW = W - pad.left - pad.right;
        const availH = HH - pad.top - pad.bottom;

        // Uniform (proportional) scale — same pixels/m for both axes
        const ppmX = availW / totalWidth;   // pixels per meter based on width
        const ppmY = availH / totalDepth;   // pixels per meter based on height
        const ppm = Math.min(ppmX, ppmY);   // use the constraining one

        // Actual chart dims (may be smaller than available)
        const chartW = ppm * totalWidth;
        const chartH = ppm * totalDepth;

        // Center the drawing within the available space
        const offsetX = pad.left + (availW - chartW) / 2;
        const offsetY = pad.top + (availH - chartH) / 2;

        // Scale functions (uniform)
        const xScale = (m) => offsetX + m * ppm;
        const yScale = (m) => offsetY + m * ppm;
        const wScale = (m) => m * ppm;
        const hScale = (m) => m * ppm;

        // Temizle
        ctx.clearRect(0, 0, W, HH);

        // ── YÜZEY ÇİZGİSİ ──
        ctx.strokeStyle = '#66bb6a';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(offsetX - 10, offsetY);
        ctx.lineTo(offsetX + chartW + 10, offsetY);
        ctx.stroke();

        // Yüzey deseni (çim)
        ctx.fillStyle = '#66bb6a';
        ctx.font = '10px sans-serif';
        for (let x = offsetX; x < offsetX + chartW; x += 12) {
            ctx.fillText('⌃', x, offsetY - 2);
        }
        // Yüzey deseni (çim) - already drawn above

        // ── ZEMİN TABAKALARI ──
        let cumulativeDepth = 0;
        soilLayers.forEach((layer) => {
            const thickness = parseFloat(layer.thickness) || 0;
            const y1 = yScale(cumulativeDepth);
            const y2 = yScale(cumulativeDepth + thickness);
            const layerH = y2 - y1;
            const colors = soilColors[layer.soilType] || soilColors.kil;

            // Ana dolgu
            ctx.fillStyle = colors.fill;
            ctx.globalAlpha = 0.35;
            ctx.fillRect(offsetX, y1, chartW, layerH);
            ctx.globalAlpha = 1.0;

            // Desen çiz
            drawPattern(ctx, layer.soilType, offsetX, y1, chartW, layerH, colors.fill);

            // Katman sınır çizgisi
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

            // Katman etiketi (sağda)
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
        for (let i = 0; i < numCols; i++) {
            const colCenterX = s / 2 + i * s; // metre cinsinden merkez
            const colLeft = xScale(colCenterX - D / 2);
            const colWidth = wScale(D);
            const colTop = offsetY;
            const colHeight = hScale(H);

            // Kolon gölgesi
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.fillRect(colLeft + 3, colTop + 3, colWidth, colHeight);

            // Kolon gradient
            const grad = ctx.createLinearGradient(colLeft, colTop, colLeft + colWidth, colTop);
            grad.addColorStop(0, 'rgba(100, 181, 246, 0.7)');
            grad.addColorStop(0.3, 'rgba(144, 202, 249, 0.85)');
            grad.addColorStop(0.7, 'rgba(144, 202, 249, 0.85)');
            grad.addColorStop(1, 'rgba(100, 181, 246, 0.7)');

            ctx.fillStyle = grad;
            ctx.fillRect(colLeft, colTop, colWidth, colHeight);

            // Kolon kenar çizgisi
            ctx.strokeStyle = '#42a5f5';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(colLeft, colTop, colWidth, colHeight);

            // Kolon alt çizgisi (uç)
            ctx.strokeStyle = '#1e88e5';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(colLeft, colTop + colHeight);
            ctx.lineTo(colLeft + colWidth, colTop + colHeight);
            ctx.stroke();

            // Çapraz çizgi deseni (beton)
            ctx.strokeStyle = 'rgba(255,255,255,0.12)';
            ctx.lineWidth = 0.5;
            const step = 8;
            for (let y = colTop; y < colTop + colHeight; y += step) {
                ctx.beginPath();
                ctx.moveTo(colLeft, y);
                ctx.lineTo(colLeft + colWidth, y + step);
                ctx.stroke();
            }
        }

        // ── YERALTI SU SEVİYESİ ──
        if (gwDepth > 0 && gwDepth < totalDepth) {
            const gwY = yScale(gwDepth);

            // Su seviyesi dolgu (yarı saydam mavi)
            const waterGrad = ctx.createLinearGradient(0, gwY, 0, offsetY + chartH);
            waterGrad.addColorStop(0, 'rgba(33, 150, 243, 0.08)');
            waterGrad.addColorStop(1, 'rgba(33, 150, 243, 0.15)');
            ctx.fillStyle = waterGrad;
            ctx.fillRect(offsetX, gwY, chartW, offsetY + chartH - gwY);

            // Su seviyesi çizgisi (kesikli mavi)
            ctx.strokeStyle = '#2196f3';
            ctx.lineWidth = 2;
            ctx.setLineDash([8, 4]);
            ctx.beginPath();
            ctx.moveTo(offsetX, gwY);
            ctx.lineTo(offsetX + chartW, gwY);
            ctx.stroke();
            ctx.setLineDash([]);

            // Ters üçgen sembolü (standart yeraltı suyu sembolü)
            const triSize = 8;
            const triX = offsetX + chartW + 12;
            ctx.fillStyle = '#2196f3';
            ctx.beginPath();
            ctx.moveTo(triX - triSize, gwY - 2);
            ctx.lineTo(triX + triSize, gwY - 2);
            ctx.lineTo(triX, gwY + triSize + 2);
            ctx.closePath();
            ctx.fill();

            // Etiket
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

        // 0m
        ctx.fillText('0', offsetX - 30, offsetY);

        // Her katman sınırı
        let cumD = 0;
        soilLayers.forEach((layer) => {
            cumD += parseFloat(layer.thickness) || 0;
            const y = yScale(cumD);
            ctx.fillText(cumD.toFixed(1) + 'm', offsetX - 30, y);

            // Tick
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(offsetX - 4, y);
            ctx.lineTo(offsetX, y);
            ctx.stroke();
        });

        // H derinliği (eğer katman sınırıyla çakışmıyorsa)
        const hY = yScale(H);
        const hMatchesLayer = soilLayers.some(() => {
            let d = 0;
            for (const l of soilLayers) {
                d += parseFloat(l.thickness) || 0;
                if (Math.abs(d - H) < 0.1) return true;
            }
            return false;
        });
        if (!hMatchesLayer) {
            ctx.fillStyle = '#42a5f5';
            ctx.fillText(H.toFixed(1) + 'm', offsetX - 30, hY);
        }

        // Derinlik tick'leri yeterli — Y eksen başlığı kaldırıldı (H oku ile çakışıyordu)

        // ── LEJAND ──
        const legendY = offsetY + chartH + 15;
        ctx.font = '11px Inter, system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';

        // Jet Grout lejandı
        ctx.fillStyle = 'rgba(144, 202, 249, 0.7)';
        ctx.fillRect(offsetX, legendY, 16, 12);
        ctx.strokeStyle = '#42a5f5';
        ctx.lineWidth = 1;
        ctx.strokeRect(offsetX, legendY, 16, 12);
        ctx.fillStyle = '#e0e0e0';
        ctx.fillText('Jet Grout', offsetX + 22, legendY + 6);

        // Improvement ratio
        const Ar = (Math.PI * (D / 2) ** 2) / (s ** 2);
        const arText = lang === 'tr'
            ? `İyileştirme Oranı (Ar) = ${(Ar * 100).toFixed(1)}%`
            : `Improvement Ratio (Ar) = ${(Ar * 100).toFixed(1)}%`;
        ctx.fillStyle = '#90caf9';
        ctx.fillText(arText, offsetX + 100, legendY + 6);

    }, [parameters, soilLayers, lang, waterTable, groundSurface]);

    const tr = lang === 'tr';

    return (
        <div className="cross-section-wrapper">
            <h3>{tr ? 'Jet Grout Kesit Görünümü' : 'Jet Grout Cross-Section View'}</h3>

            <div className="cross-section-controls">
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
                <div className="cs-control-group">
                    <label>
                        <span className="cs-water-icon">▼</span>
                        {tr ? 'Yeraltı Suyu Seviyesi (YASS)' : 'Groundwater Table (GW)'}
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
        // Yatay boyut çizgisi
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        // Sol ok
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x1 + arrowSize, y1 - arrowSize);
        ctx.lineTo(x1 + arrowSize, y1 + arrowSize);
        ctx.closePath();
        ctx.fill();

        // Sağ ok
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - arrowSize, y2 - arrowSize);
        ctx.lineTo(x2 - arrowSize, y2 + arrowSize);
        ctx.closePath();
        ctx.fill();

        // Etiket
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(label, (x1 + x2) / 2, y1 - 3);
    } else if (side === 'left') {
        // Dikey boyut çizgisi
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        // Üst ok
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x1 - arrowSize, y1 + arrowSize);
        ctx.lineTo(x1 + arrowSize, y1 + arrowSize);
        ctx.closePath();
        ctx.fill();

        // Alt ok
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - arrowSize, y2 - arrowSize);
        ctx.lineTo(x2 + arrowSize, y2 - arrowSize);
        ctx.closePath();
        ctx.fill();

        // Etiket
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
        case 'kum': // Nokta deseni
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

        case 'kil': // Yatay çizgi deseni
            for (let py = y; py < y + h; py += 8) {
                ctx.beginPath();
                ctx.moveTo(x, py);
                ctx.lineTo(x + w, py);
                ctx.stroke();
            }
            break;

        case 'silt': // Kısa tire deseni
            for (let px = x; px < x + w; px += 14) {
                for (let py = y; py < y + h; py += 10) {
                    ctx.beginPath();
                    ctx.moveTo(px, py);
                    ctx.lineTo(px + 6, py);
                    ctx.stroke();
                }
            }
            break;

        case 'kaya': // Çapraz çizgi
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

        case 'cakil': // Daire deseni
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
