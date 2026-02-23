import { useRef, useEffect } from 'react';
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

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const D = parseFloat(parameters.D) || 0.6;
        const s = parseFloat(parameters.s) || 1.6;
        const H = parseFloat(parameters.H) || 12;

        // Toplam zemin derinliği
        const totalSoilDepth = soilLayers.reduce((sum, l) => sum + (parseFloat(l.thickness) || 0), 0);
        const totalDepth = Math.max(totalSoilDepth, H) * 1.08; // %8 margin

        // Görünür genişlik: en az 3 kolon göster
        const numCols = 3;
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
        const chartW = W - pad.left - pad.right;
        const chartH = HH - pad.top - pad.bottom;

        // Scale
        const xScale = (m) => pad.left + (m / totalWidth) * chartW;
        const yScale = (m) => pad.top + (m / totalDepth) * chartH;
        const wScale = (m) => (m / totalWidth) * chartW;
        const hScale = (m) => (m / totalDepth) * chartH;

        // Temizle
        ctx.clearRect(0, 0, W, HH);

        // ── YÜZEY ÇİZGİSİ ──
        ctx.strokeStyle = '#66bb6a';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(pad.left - 10, pad.top);
        ctx.lineTo(pad.left + chartW + 10, pad.top);
        ctx.stroke();

        // Yüzey deseni (çim)
        ctx.fillStyle = '#66bb6a';
        ctx.font = '10px sans-serif';
        for (let x = pad.left; x < pad.left + chartW; x += 12) {
            ctx.fillText('⌃', x, pad.top - 2);
        }

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
            ctx.fillRect(pad.left, y1, chartW, layerH);
            ctx.globalAlpha = 1.0;

            // Desen çiz
            drawPattern(ctx, layer.soilType, pad.left, y1, chartW, layerH, colors.fill);

            // Katman sınır çizgisi
            if (cumulativeDepth > 0) {
                ctx.strokeStyle = 'rgba(255,255,255,0.3)';
                ctx.lineWidth = 1;
                ctx.setLineDash([6, 4]);
                ctx.beginPath();
                ctx.moveTo(pad.left, y1);
                ctx.lineTo(pad.left + chartW, y1);
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
                ctx.fillText(`${name} (${thickness}m)`, pad.left + chartW + 8, midY);
            }

            cumulativeDepth += thickness;
        });

        // Alt sınır
        const bottomY = yScale(totalSoilDepth);
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 1;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(pad.left, bottomY);
        ctx.lineTo(pad.left + chartW, bottomY);
        ctx.stroke();
        ctx.setLineDash([]);

        // ── JET GROUT KOLONLARI ──
        for (let i = 0; i < numCols; i++) {
            const colCenterX = s / 2 + i * s; // metre cinsinden merkez
            const colLeft = xScale(colCenterX - D / 2);
            const colWidth = wScale(D);
            const colTop = pad.top;
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

        // ── BOYUT OKUVLARI ──

        // D (çap) oku — ilk kolonun üstünde
        const firstColCenter = s / 2;
        const dLeft = xScale(firstColCenter - D / 2);
        const dRight = xScale(firstColCenter + D / 2);
        const dArrowY = pad.top - 15;

        drawDimensionLine(ctx, dLeft, dArrowY, dRight, dArrowY, `D = ${D}m`, 'top');

        // s (aralık) oku — ilk ve ikinci kolon arası (daha yukarıda)
        const col1Center = xScale(s / 2);
        const col2Center = xScale(s / 2 + s);
        const sArrowY = pad.top - 40;

        drawDimensionLine(ctx, col1Center, sArrowY, col2Center, sArrowY, `s = ${s}m`, 'top');

        // H (derinlik) oku — solda, derinlik etiketlerinden ayrı
        const hArrowX = pad.left - 45;
        drawDimensionLine(ctx, hArrowX, pad.top, hArrowX, pad.top + hScale(H), `H = ${H}m`, 'left');

        // ── DERINLIK ÖLÇEĞI (Y ekseni) ──
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '11px Inter, system-ui, sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';

        // 0m
        ctx.fillText('0', pad.left - 30, pad.top);

        // Her katman sınırı
        let cumD = 0;
        soilLayers.forEach((layer) => {
            cumD += parseFloat(layer.thickness) || 0;
            const y = yScale(cumD);
            ctx.fillText(cumD.toFixed(1) + 'm', pad.left - 30, y);

            // Tick
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(pad.left - 4, y);
            ctx.lineTo(pad.left, y);
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
            ctx.fillText(H.toFixed(1) + 'm', pad.left - 30, hY);
        }

        // Derinlik tick'leri yeterli — Y eksen başlığı kaldırıldı (H oku ile çakışıyordu)

        // ── LEJAND ──
        const legendY = pad.top + chartH + 25;
        ctx.font = '11px Inter, system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';

        // Jet Grout lejandı
        ctx.fillStyle = 'rgba(144, 202, 249, 0.7)';
        ctx.fillRect(pad.left, legendY, 16, 12);
        ctx.strokeStyle = '#42a5f5';
        ctx.lineWidth = 1;
        ctx.strokeRect(pad.left, legendY, 16, 12);
        ctx.fillStyle = '#e0e0e0';
        ctx.fillText('Jet Grout', pad.left + 22, legendY + 6);

        // Improvement ratio
        const Ar = (Math.PI * (D / 2) ** 2) / (s ** 2);
        const arText = lang === 'tr'
            ? `İyileştirme Oranı (Ar) = ${(Ar * 100).toFixed(1)}%`
            : `Improvement Ratio (Ar) = ${(Ar * 100).toFixed(1)}%`;
        ctx.fillStyle = '#90caf9';
        ctx.fillText(arText, pad.left + 100, legendY + 6);

    }, [parameters, soilLayers, lang]);

    return (
        <div className="cross-section-wrapper">
            <h3>{lang === 'tr' ? 'Jet Grout Kesit Görünümü' : 'Jet Grout Cross-Section View'}</h3>
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
