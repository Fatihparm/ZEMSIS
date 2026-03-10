import { useRef, useEffect, useState } from 'react';
import './PlanView.css';

function PlanView({ parameters, lang, onParameterChange }) {
    const canvasRef = useRef(null);

    // Plan view inputs: building dimensions
    const [buildingWidth, setBuildingWidth] = useState(20);   // m (en)
    const [buildingLength, setBuildingLength] = useState(30);  // m (boy)

    const D = parseFloat(parameters.D) || 0.6;
    const s = parseFloat(parameters.s) || 1.6;

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const bW = parseFloat(buildingWidth) || 10;
        const bL = parseFloat(buildingLength) || 10;

        // High-DPI
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);

        const W = rect.width;
        const H = rect.height;

        // Padding
        const pad = { top: 50, right: 50, bottom: 50, left: 50 };
        const availW = W - pad.left - pad.right;
        const availH = H - pad.top - pad.bottom;

        // Uniform scale (same pixels/m for both axes)
        const ppmX = availW / bW;
        const ppmY = availH / bL;
        const ppm = Math.min(ppmX, ppmY);

        // Actual drawing size
        const drawW = bW * ppm;
        const drawH = bL * ppm;

        // Center in canvas
        const offsetX = pad.left + (availW - drawW) / 2;
        const offsetY = pad.top + (availH - drawH) / 2;

        // Clear
        ctx.clearRect(0, 0, W, H);

        // Background grid (AutoCAD style)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.lineWidth = 0.5;
        const gridStep = ppm; // 1m grid
        for (let gx = offsetX; gx <= offsetX + drawW; gx += gridStep) {
            ctx.beginPath();
            ctx.moveTo(gx, offsetY);
            ctx.lineTo(gx, offsetY + drawH);
            ctx.stroke();
        }
        for (let gy = offsetY; gy <= offsetY + drawH; gy += gridStep) {
            ctx.beginPath();
            ctx.moveTo(offsetX, gy);
            ctx.lineTo(offsetX + drawW, gy);
            ctx.stroke();
        }

        // ── Building rectangle ──
        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(offsetX + 3, offsetY + 3, drawW, drawH);

        // Fill
        ctx.fillStyle = 'rgba(100, 100, 120, 0.15)';
        ctx.fillRect(offsetX, offsetY, drawW, drawH);

        // Border
        ctx.strokeStyle = '#ff9800';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(offsetX, offsetY, drawW, drawH);

        // Corner marks (AutoCAD style)
        const markLen = Math.min(15, ppm * 0.5);
        ctx.strokeStyle = '#ff9800';
        ctx.lineWidth = 2;
        const corners = [
            [offsetX, offsetY],
            [offsetX + drawW, offsetY],
            [offsetX, offsetY + drawH],
            [offsetX + drawW, offsetY + drawH]
        ];
        corners.forEach(([cx, cy], i) => {
            const dx = (i % 2 === 0) ? 1 : -1;
            const dy = (i < 2) ? 1 : -1;
            ctx.beginPath();
            ctx.moveTo(cx + dx * markLen, cy);
            ctx.lineTo(cx, cy);
            ctx.lineTo(cx, cy + dy * markLen);
            ctx.stroke();
        });

        // ── Place jet grout columns ──
        // Compute column positions: start at s/2 from each edge
        const colR = (D / 2) * ppm; // radius in pixels
        const startX_m = s / 2;
        const startY_m = s / 2;

        const cols = [];
        for (let mx = startX_m; mx <= bW - s / 2 + 0.001; mx += s) {
            for (let my = startY_m; my <= bL - s / 2 + 0.001; my += s) {
                cols.push({ x: mx, y: my });
            }
        }

        // Draw columns
        cols.forEach(({ x, y }) => {
            const px = offsetX + x * ppm;
            const py = offsetY + y * ppm;

            // Column shadow
            ctx.beginPath();
            ctx.arc(px + 1.5, py + 1.5, colR, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.fill();

            // Column fill (gradient)
            const grad = ctx.createRadialGradient(px - colR * 0.3, py - colR * 0.3, colR * 0.1, px, py, colR);
            grad.addColorStop(0, 'rgba(200, 50, 50, 0.9)');
            grad.addColorStop(0.5, 'rgba(180, 40, 40, 0.8)');
            grad.addColorStop(1, 'rgba(140, 30, 30, 0.7)');

            ctx.beginPath();
            ctx.arc(px, py, colR, 0, Math.PI * 2);
            ctx.fillStyle = grad;
            ctx.fill();

            // Column border
            ctx.strokeStyle = 'rgba(255, 80, 80, 0.9)';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Center dot
            ctx.beginPath();
            ctx.arc(px, py, 1.5, 0, Math.PI * 2);
            ctx.fillStyle = '#fff';
            ctx.fill();
        });

        // ── Axis labels (A-B, 1-2-3...) ──
        ctx.font = 'bold 14px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ff9800';

        // Get unique X positions (columns)
        const uniqueX = [...new Set(cols.map(c => c.x.toFixed(3)))].map(Number).sort((a, b) => a - b);
        const uniqueY = [...new Set(cols.map(c => c.y.toFixed(3)))].map(Number).sort((a, b) => a - b);

        // Column numbers at bottom
        uniqueX.forEach((mx, i) => {
            const px = offsetX + mx * ppm;
            ctx.fillStyle = 'rgba(255, 152, 0, 0.7)';
            ctx.beginPath();
            ctx.arc(px, offsetY + drawH + 25, 11, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#1a1a2e';
            ctx.fillText(String(i + 1), px, offsetY + drawH + 26);
        });

        // Row letters at left
        uniqueY.forEach((my, i) => {
            const py = offsetY + my * ppm;
            ctx.fillStyle = 'rgba(255, 152, 0, 0.7)';
            ctx.beginPath();
            ctx.arc(offsetX - 25, py, 11, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#1a1a2e';
            ctx.fillText(String.fromCharCode(65 + i), offsetX - 25, py + 1);
        });



    }, [buildingWidth, buildingLength, D, s, lang]);

    // Calculate column count
    const bW = parseFloat(buildingWidth) || 10;
    const bL = parseFloat(buildingLength) || 10;
    const nX = Math.floor((bW - s / 2) / s) + 1;
    const nY = Math.floor((bL - s / 2) / s) + 1;
    const totalColumns = Math.max(0, nX) * Math.max(0, nY);
    const Ajet = Math.PI * (D / 2) ** 2;
    const Ar = (Ajet / (s * s)) * 100;

    const tr = lang === 'tr';

    return (
        <div className="plan-view-wrapper">
            <h3>{tr ? 'Jet Grout Yerleşim Planı (Kuş Bakışı)' : 'Jet Grout Layout Plan (Plan View)'}</h3>

            <div className="plan-view-controls">
                <div className="plan-control-group">
                    <label>{tr ? 'Bina Eni' : 'Width'}</label>
                    <input
                        type="number"
                        value={buildingWidth}
                        onChange={(e) => setBuildingWidth(e.target.value)}
                        min={2}
                        max={200}
                        step={0.5}
                    />
                    <span className="unit-label">m</span>
                </div>
                <div className="plan-control-group">
                    <label>{tr ? 'Bina Boyu' : 'Length'}</label>
                    <input
                        type="number"
                        value={buildingLength}
                        onChange={(e) => setBuildingLength(e.target.value)}
                        min={2}
                        max={200}
                        step={0.5}
                    />
                    <span className="unit-label">m</span>
                </div>
                <div className="plan-control-group">
                    <label>{tr ? 'Çap (D)' : 'Dia (D)'}</label>
                    <input
                        type="number"
                        value={D}
                        onChange={(e) => onParameterChange && onParameterChange({ target: { name: 'D', value: e.target.value } })}
                        min={0.3}
                        max={3.0}
                        step={0.1}
                    />
                    <span className="unit-label">m</span>
                </div>
                <div className="plan-control-group">
                    <label>{tr ? 'Aralık (s)' : 'Spacing (s)'}</label>
                    <input
                        type="number"
                        value={s}
                        onChange={(e) => onParameterChange && onParameterChange({ target: { name: 's', value: e.target.value } })}
                        min={0.5}
                        max={10.0}
                        step={0.1}
                    />
                    <span className="unit-label">m</span>
                </div>
            </div>

            <div className="plan-view-info">
                <div className="plan-info-item">
                    <span className="info-label">{tr ? 'Kolon Sayısı:' : 'Columns:'}</span>
                    <span className="info-value">{totalColumns} ({nX} × {nY})</span>
                </div>
                <div className="plan-info-item">
                    <span className="info-label">{tr ? 'İyileştirme Oranı:' : 'Ar:'}</span>
                    <span className="info-value">{Ar.toFixed(1)}%</span>
                </div>
                <div className="plan-info-item">
                    <span className="info-label">{tr ? 'Kolon Alanı:' : 'Ajet:'}</span>
                    <span className="info-value">{Ajet.toFixed(3)} m²</span>
                </div>
            </div>

            <div className="plan-view-container">
                <canvas ref={canvasRef} className="plan-view-canvas" />
            </div>
        </div>
    );
}

export default PlanView;
