import { useRef, useEffect } from 'react';
import './StressChart.css';

// Zemin tipi renkleri
const soilColors = {
    kum: { fill: 'rgba(237, 201, 126, 0.35)', border: '#edc97e' },
    kil: { fill: 'rgba(169, 132, 103, 0.35)', border: '#a98467' },
    silt: { fill: 'rgba(189, 189, 160, 0.35)', border: '#bdbda0' },
    kaya: { fill: 'rgba(158, 158, 158, 0.35)', border: '#9e9e9e' },
    cakil: { fill: 'rgba(188, 170, 134, 0.35)', border: '#bcaa86' }
};

/**
 * #6 — Efektif gerilme (σ'v = σv - u) hesabı
 * Yeraltı suyu seviyesinin altındaki katmanlar için u = γw × (depth - waterTable)
 */
function computeEffectiveStress(layers, waterTable) {
    const gammaw = 9.81; // kN/m³
    return layers.map(layer => {
        // Katmanın orta derinliği
        const bottomDepth = layer.endDepth;
        const u = waterTable > 0 && bottomDepth > waterTable
            ? gammaw * (bottomDepth - waterTable)
            : 0;
        const effectiveBottom = Math.max(0, layer.stressAtBottom - u);

        const topDepth = layer.startDepth;
        const uTop = waterTable > 0 && topDepth > waterTable
            ? gammaw * (topDepth - waterTable)
            : 0;
        const effectiveTop = Math.max(0, layer.stressAtTop - uTop);

        return {
            ...layer,
            effectiveStressAtTop: parseFloat(effectiveTop.toFixed(2)),
            effectiveStressAtBottom: parseFloat(effectiveBottom.toFixed(2))
        };
    });
}

function StressChart({ layers, lang, waterTable = 0 }) {
    const canvasRef = useRef(null);

    useEffect(() => {
        if (!layers || layers.length === 0) return;
        const canvas = canvasRef.current;
        if (!canvas) return;

        // High-DPI desteği
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);

        const W = rect.width;
        const H = rect.height;

        // Padding — legend için alt padding artırıldı
        const pad = { top: 30, right: 30, bottom: 70, left: 70 };
        const chartW = W - pad.left - pad.right;
        const chartH = H - pad.top - pad.bottom;

        // #6 — Efektif gerilme hesapla
        const layersWithEffective = computeEffectiveStress(layers, waterTable);

        // Max değerler — toplam ve efektif gerilmenin maksimumunu al
        const maxDepth = layers[layers.length - 1].endDepth;
        const maxStress = Math.max(
            ...layers.map(l => l.stressAtBottom),
            ...layersWithEffective.map(l => l.stressAtBottom)
        ) * 1.15;

        // Scale fonksiyonları
        const xScale = (stress) => pad.left + (stress / maxStress) * chartW;
        const yScale = (depth) => pad.top + (depth / maxDepth) * chartH;

        // Temizle
        ctx.clearRect(0, 0, W, H);

        // ── Katman bantları ──
        layers.forEach((layer) => {
            const y1 = yScale(layer.startDepth);
            const y2 = yScale(layer.endDepth);
            const colors = soilColors[layer.soilType] || soilColors.kil;

            ctx.fillStyle = colors.fill;
            ctx.fillRect(pad.left, y1, chartW, y2 - y1);

            // Katman sınır çizgisi
            ctx.strokeStyle = colors.border;
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 3]);
            ctx.beginPath();
            ctx.moveTo(pad.left, y2);
            ctx.lineTo(pad.left + chartW, y2);
            ctx.stroke();
            ctx.setLineDash([]);

            // Katman etiketi (sağda)
            const midY = (y1 + y2) / 2;
            const soilNames = {
                en: { kum: 'Sand', kil: 'Clay', silt: 'Silt', kaya: 'Rock', cakil: 'Gravel' },
                tr: { kum: 'Kum', kil: 'Kil', silt: 'Silt', kaya: 'Kaya', cakil: 'Çakıl' }
            };
            const name = soilNames[lang]?.[layer.soilType] || layer.soilType;

            if (y2 - y1 > 20) {
                ctx.fillStyle = colors.border;
                ctx.font = '11px Inter, system-ui, sans-serif';
                ctx.textAlign = 'right';
                ctx.textBaseline = 'middle';
                ctx.fillText(name, pad.left + chartW - 6, midY);
            }
        });

        // ── Yeraltı suyu çizgisi ──
        if (waterTable > 0 && waterTable < maxDepth) {
            const gwY = yScale(waterTable);
            ctx.strokeStyle = '#42a5f5';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([6, 4]);
            ctx.beginPath();
            ctx.moveTo(pad.left, gwY);
            ctx.lineTo(pad.left + chartW, gwY);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = '#42a5f5';
            ctx.font = '10px Inter, system-ui, sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(`GW ${waterTable.toFixed(1)}m`, pad.left + 4, gwY - 8);
        }

        // ── Eksenler ──
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 1;

        // Y ekseni (sol)
        ctx.beginPath();
        ctx.moveTo(pad.left, pad.top);
        ctx.lineTo(pad.left, pad.top + chartH);
        ctx.stroke();

        // X ekseni (üst)
        ctx.beginPath();
        ctx.moveTo(pad.left, pad.top);
        ctx.lineTo(pad.left + chartW, pad.top);
        ctx.stroke();

        // ── Grid + tick'ler ──
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '11px Inter, system-ui, sans-serif';

        // Y ticks (derinlik) — her katman sınırı
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';

        // 0m
        ctx.fillText('0', pad.left - 8, pad.top);

        layers.forEach((layer) => {
            const y = yScale(layer.endDepth);
            ctx.fillText(layer.endDepth.toFixed(1), pad.left - 8, y);

            // Grid
            ctx.strokeStyle = 'rgba(255,255,255,0.06)';
            ctx.beginPath();
            ctx.moveTo(pad.left + 1, y);
            ctx.lineTo(pad.left + chartW, y);
            ctx.stroke();
        });

        // X ticks (gerilme)
        const xTickCount = 5;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        for (let i = 0; i <= xTickCount; i++) {
            const val = (maxStress / xTickCount) * i;
            const x = xScale(val);

            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.fillText(val.toFixed(0), x, pad.top + chartH + 8);

            if (i > 0) {
                ctx.strokeStyle = 'rgba(255,255,255,0.06)';
                ctx.beginPath();
                ctx.moveTo(x, pad.top);
                ctx.lineTo(x, pad.top + chartH);
                ctx.stroke();
            }
        }

        // ── Eksen başlıkları ──
        ctx.fillStyle = '#90caf9';
        ctx.font = '12px Inter, system-ui, sans-serif';

        // X başlık (alt)
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText('σᵥ (kPa)', pad.left + chartW / 2, pad.top + chartH + 30);

        // Y başlık (sol, döndürülmüş)
        ctx.save();
        ctx.translate(16, pad.top + chartH / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const depthLabel = lang === 'tr' ? 'Derinlik (m)' : 'Depth (m)';
        ctx.fillText(depthLabel, 0, 0);
        ctx.restore();

        // ── Toplam gerilme çizgisi (σv) ──
        const totalPoints = [{ x: 0, y: 0 }];
        layers.forEach((layer) => {
            totalPoints.push({ x: layer.stressAtTop, y: layer.startDepth });
            totalPoints.push({ x: layer.stressAtBottom, y: layer.endDepth });
        });

        // Gradient dolgu — toplam gerilme
        const gradient = ctx.createLinearGradient(pad.left, pad.top, pad.left + chartW * 0.6, pad.top);
        gradient.addColorStop(0, 'rgba(79, 195, 247, 0.18)');
        gradient.addColorStop(1, 'rgba(79, 195, 247, 0.02)');

        ctx.beginPath();
        ctx.moveTo(xScale(0), yScale(0));
        totalPoints.forEach(p => ctx.lineTo(xScale(p.x), yScale(p.y)));
        ctx.lineTo(xScale(0), yScale(totalPoints[totalPoints.length - 1].y));
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();

        // Çizgi — toplam gerilme
        ctx.beginPath();
        ctx.moveTo(xScale(totalPoints[0].x), yScale(totalPoints[0].y));
        totalPoints.forEach(p => ctx.lineTo(xScale(p.x), yScale(p.y)));
        ctx.strokeStyle = '#4fc3f7';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // ── #6 Efektif gerilme çizgisi (σ'v) ──
        if (waterTable > 0) {
            const effPoints = [{ x: 0, y: 0 }];
            layersWithEffective.forEach((layer) => {
                effPoints.push({ x: layer.effectiveStressAtTop, y: layer.startDepth });
                effPoints.push({ x: layer.effectiveStressAtBottom, y: layer.endDepth });
            });

            // Gradient dolgu — efektif gerilme
            const effGradient = ctx.createLinearGradient(pad.left, pad.top, pad.left + chartW * 0.6, pad.top);
            effGradient.addColorStop(0, 'rgba(102, 187, 106, 0.12)');
            effGradient.addColorStop(1, 'rgba(102, 187, 106, 0.01)');

            ctx.beginPath();
            ctx.moveTo(xScale(0), yScale(0));
            effPoints.forEach(p => ctx.lineTo(xScale(p.x), yScale(p.y)));
            ctx.lineTo(xScale(0), yScale(effPoints[effPoints.length - 1].y));
            ctx.closePath();
            ctx.fillStyle = effGradient;
            ctx.fill();

            // Çizgi — efektif gerilme (kesikli)
            ctx.beginPath();
            ctx.moveTo(xScale(effPoints[0].x), yScale(effPoints[0].y));
            effPoints.forEach(p => ctx.lineTo(xScale(p.x), yScale(p.y)));
            ctx.strokeStyle = '#66bb6a';
            ctx.lineWidth = 2;
            ctx.setLineDash([6, 3]);
            ctx.stroke();
            ctx.setLineDash([]);

            // Efektif gerilme noktaları
            layersWithEffective.forEach((layer) => {
                const cx = xScale(layer.effectiveStressAtBottom);
                const cy = yScale(layer.endDepth);
                ctx.beginPath();
                ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
                ctx.fillStyle = '#66bb6a';
                ctx.fill();
                ctx.strokeStyle = '#0d1b2a';
                ctx.lineWidth = 1.5;
                ctx.stroke();
            });
        }

        // ── Toplam gerilme noktaları ──
        layers.forEach((layer) => {
            const cx = xScale(layer.stressAtBottom);
            const cy = yScale(layer.endDepth);

            ctx.beginPath();
            ctx.arc(cx, cy, 4, 0, Math.PI * 2);
            ctx.fillStyle = '#4fc3f7';
            ctx.fill();
            ctx.strokeStyle = '#0d1b2a';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Değer etiketi
            ctx.fillStyle = '#e0e0e0';
            ctx.font = 'bold 10px Inter, system-ui, sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'bottom';
            ctx.fillText(`${layer.stressAtBottom}`, cx + 7, cy - 2);
        });

        // ── #6 Legend ──
        const legendY = pad.top + chartH + 48;
        ctx.font = '10px Inter, system-ui, sans-serif';
        ctx.textBaseline = 'middle';

        // Toplam gerilme
        ctx.strokeStyle = '#4fc3f7';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(pad.left, legendY);
        ctx.lineTo(pad.left + 20, legendY);
        ctx.stroke();
        ctx.fillStyle = '#4fc3f7';
        ctx.textAlign = 'left';
        ctx.fillText(lang === 'tr' ? 'σv (Toplam)' : 'σv (Total)', pad.left + 26, legendY);

        // Efektif gerilme (yalnızca YASS > 0 ise)
        if (waterTable > 0) {
            const leg2x = pad.left + 110;
            ctx.strokeStyle = '#66bb6a';
            ctx.lineWidth = 2;
            ctx.setLineDash([6, 3]);
            ctx.beginPath();
            ctx.moveTo(leg2x, legendY);
            ctx.lineTo(leg2x + 20, legendY);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = '#66bb6a';
            ctx.fillText(lang === 'tr' ? "σ'v (Efektif)" : "σ'v (Effective)", leg2x + 26, legendY);
        }

    }, [layers, lang, waterTable]);

    if (!layers || layers.length === 0) return null;

    return (
        <div className="stress-chart-wrapper">
            <h3>{lang === 'tr' ? 'Gerilme – Derinlik Diyagramı' : 'Stress – Depth Diagram'}</h3>
            <div className="stress-chart-container">
                <canvas ref={canvasRef} className="stress-chart-canvas" />
            </div>
        </div>
    );
}

export default StressChart;
