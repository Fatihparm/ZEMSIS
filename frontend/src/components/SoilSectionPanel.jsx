import { useState, useRef, useEffect } from 'react';
import './SoilSectionPanel.css';

// ── Soil constants ──────────────────────────────────────────────────────────────
const SOIL_DEFAULTS = {
    kum: { gamma: 17, phi: 35, cohesion: 5, elasticity: 30000, poisson: 0.25 },
    kil: { gamma: 18, phi: 15, cohesion: 80, elasticity: 25000, poisson: 0.3 },
    silt: { gamma: 19, phi: 28, cohesion: 10, elasticity: 35000, poisson: 0.25 },
    kaya: { gamma: 22, phi: 15, cohesion: 3000, elasticity: 300000, poisson: 0.2 },
    cakil: { gamma: 20, phi: 40, cohesion: 0, elasticity: 50000, poisson: 0.2 }
};

const SOIL_TYPES = ['kum', 'kil', 'silt', 'kaya', 'cakil'];

const SOIL_COLORS_VISUAL = {
    kum: { bg: 'linear-gradient(135deg, #f4d03f 0%, #c9a227 100%)', border: '#b8860b', accent: '#f4d03f' },
    kil: { bg: 'linear-gradient(135deg, #a0522d 0%, #8b4513 100%)', border: '#6b3410', accent: '#a0522d' },
    silt: { bg: 'linear-gradient(135deg, #9e9e9e 0%, #757575 100%)', border: '#616161', accent: '#9e9e9e' },
    kaya: { bg: 'linear-gradient(135deg, #607d8b 0%, #455a64 100%)', border: '#37474f', accent: '#607d8b' },
    cakil: { bg: 'linear-gradient(135deg, #78909c 0%, #546e7a 100%)', border: '#455a64', accent: '#78909c' }
};

const soilColorsCanvas = {
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

// ═══════════════════════════════════════════════════════════════════════════════
//  SoilSectionPanel — Unified Soil Layers + Cross-Section View
// ═══════════════════════════════════════════════════════════════════════════════
function SoilSectionPanel({
    layers, onChange, parameters, lang,
    onParameterChange, extraParams, onExtraParamsChange,
    translations
}) {
    const tr = lang === 'tr';
    const t = translations;
    const canvasRef = useRef(null);

    // Popup state
    const [popupLayerId, setPopupLayerId] = useState(null);
    const [popupPos, setPopupPos] = useState({ x: 0, y: 0 });
    const popupRef = useRef(null);

    // Extra visual params (local, synced)
    const [localFoundation, setLocalFoundation] = useState(extraParams?.foundationThickness ?? 0.5);
    const [localFill, setLocalFill] = useState(extraParams?.fillHeight ?? 0);
    const [waterTable, setWaterTable] = useState(3);
    const [groundSurface, setGroundSurface] = useState(0);

    // Drag & Drop refs
    const dragItem = useRef(null);
    const dragOverItem = useRef(null);

    // Sync from parent
    useEffect(() => {
        if (extraParams?.foundationThickness !== undefined) setLocalFoundation(extraParams.foundationThickness);
        if (extraParams?.fillHeight !== undefined) setLocalFill(extraParams.fillHeight);
    }, [extraParams]);

    const notifyExtra = (field, value) => {
        if (onExtraParamsChange) {
            onExtraParamsChange({ ...extraParams, foundationThickness: localFoundation, fillHeight: localFill, [field]: value });
        }
    };

    // ── Layer helpers ──
    const totalThickness = layers.reduce((sum, l) => sum + (parseFloat(l.thickness) || 0), 0);
    const getSoilName = (type) => soilNames[lang]?.[type] || type;

    const addLayer = () => {
        const newLayer = {
            id: `layer-${Date.now()}`,
            thickness: 5,
            soilType: 'kil',
            ...SOIL_DEFAULTS.kil
        };
        onChange([...layers, newLayer]);
    };

    const removeLayer = (id) => {
        if (layers.length <= 1) return;
        onChange(layers.filter(l => l.id !== id));
        if (popupLayerId === id) setPopupLayerId(null);
    };

    const updateLayer = (id, field, value) => {
        onChange(layers.map(layer => {
            if (layer.id !== id) return layer;
            if (field === 'soilType' && SOIL_DEFAULTS[value]) {
                return { ...layer, soilType: value, ...SOIL_DEFAULTS[value] };
            }
            return { ...layer, [field]: value };
        }));
    };

    // ── Drag & Drop ──
    const onDragStart = (e, index) => { dragItem.current = index; e.dataTransfer.effectAllowed = "move"; };
    const onDragEnter = (_, index) => { dragOverItem.current = index; };
    const onDragEnd = () => {
        const copy = [...layers];
        const dragged = copy[dragItem.current];
        copy.splice(dragItem.current, 1);
        copy.splice(dragOverItem.current, 0, dragged);
        dragItem.current = null;
        dragOverItem.current = null;
        onChange(copy);
    };
    const onDragOver = (e) => e.preventDefault();

    // ── Depth range ──
    const getDepthRange = (index) => {
        const start = layers.slice(0, index).reduce((s, l) => s + (parseFloat(l.thickness) || 0), 0);
        return { start: start.toFixed(1), end: (start + (parseFloat(layers[index].thickness) || 0)).toFixed(1) };
    };

    // ── Floating popup open ──
    const handleLayerClick = (e, layerId) => {
        const rect = e.currentTarget.getBoundingClientRect();
        // Position popup to the right of the clicked layer
        setPopupPos({ x: rect.right + 8, y: rect.top });
        setPopupLayerId(popupLayerId === layerId ? null : layerId);
    };

    // Close popup on outside click
    useEffect(() => {
        const handler = (e) => {
            if (popupRef.current && !popupRef.current.contains(e.target)) {
                // Don't close if clicking on a layer row
                if (e.target.closest('.ssp-layer-row')) return;
                setPopupLayerId(null);
            }
        };
        if (popupLayerId) document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [popupLayerId]);

    const popupLayer = layers.find(l => l.id === popupLayerId);

    // ═══════════════════════════════════════════════════════════════════════════
    //  Canvas Drawing — Cross-Section View
    // ═══════════════════════════════════════════════════════════════════════════
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const D = parseFloat(parameters.D) || 0.6;
        const s = parseFloat(parameters.s) || 1.6;
        const H = parseFloat(parameters.H) || 12;
        const gwDepth = parseFloat(waterTable) || 0;
        const foundationT = parseFloat(localFoundation) || 0;
        const fillH = parseFloat(localFill) || 0;

        const totalSoilDepth = layers.reduce((sum, l) => sum + (parseFloat(l.thickness) || 0), 0);
        const totalAbove = fillH + foundationT;
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

        const pad = { top: 60, right: 80, bottom: 45, left: 75 };
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

        const xScale = (m) => offsetX + m * ppm;
        const yScale = (d) => offsetY + (totalAbove + d) * ppm;
        const wScale = (m) => m * ppm;
        const hScale = (m) => m * ppm;

        ctx.clearRect(0, 0, W, HH);

        const surfaceY = yScale(0);

        // ── Foundation ──
        if (foundationT > 0) {
            const foundTop = yScale(-fillH - foundationT);
            const foundBot = yScale(-fillH);
            const fH = foundBot - foundTop;

            const concGrad = ctx.createLinearGradient(offsetX, foundTop, offsetX, foundBot);
            concGrad.addColorStop(0, 'rgba(180, 180, 190, 0.65)');
            concGrad.addColorStop(1, 'rgba(140, 140, 155, 0.50)');
            ctx.fillStyle = concGrad;
            ctx.fillRect(offsetX, foundTop, chartW, fH);

            ctx.save();
            ctx.beginPath(); ctx.rect(offsetX, foundTop, chartW, fH); ctx.clip();
            ctx.strokeStyle = 'rgba(80, 80, 100, 0.35)'; ctx.lineWidth = 0.5;
            for (let px = offsetX - fH; px < offsetX + chartW; px += 10) {
                ctx.beginPath(); ctx.moveTo(px, foundTop); ctx.lineTo(px + fH, foundBot); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(px + fH, foundTop); ctx.lineTo(px, foundBot); ctx.stroke();
            }
            ctx.restore();

            ctx.strokeStyle = 'rgba(200, 200, 220, 0.7)'; ctx.lineWidth = 1.5;
            ctx.strokeRect(offsetX, foundTop, chartW, fH);
            ctx.fillStyle = '#b0bec5'; ctx.font = 'bold 10px Inter, system-ui, sans-serif';
            ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
            ctx.fillText(`${tr ? 'Temel' : 'Foundation'} (${foundationT}m)`, offsetX + chartW + 6, (foundTop + foundBot) / 2);
            drawDimensionLine(ctx, offsetX - 25, foundTop, offsetX - 25, foundBot, `${foundationT}m`, 'left');
        }

        // ── Fill ──
        if (fillH > 0) {
            const fillTop = yScale(-fillH);
            const fillBot = yScale(0);
            const fillHeight_ = fillBot - fillTop;

            const fillGrad = ctx.createLinearGradient(offsetX, fillTop, offsetX, fillBot);
            fillGrad.addColorStop(0, 'rgba(139, 90, 43, 0.55)');
            fillGrad.addColorStop(1, 'rgba(160, 110, 60, 0.35)');
            ctx.fillStyle = fillGrad;
            ctx.fillRect(offsetX, fillTop, chartW, fillHeight_);
            ctx.fillStyle = '#cd7f32'; ctx.font = 'bold 10px Inter, system-ui, sans-serif';
            ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
            ctx.fillText(`${tr ? 'Dolgu' : 'Fill'} (${fillH}m)`, offsetX + chartW + 6, (fillTop + fillBot) / 2);
            drawDimensionLine(ctx, offsetX - 45, fillTop, offsetX - 45, fillBot, `${fillH}m`, 'left');
        }

        // ── Surface line ──
        ctx.strokeStyle = '#66bb6a'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(offsetX - 10, surfaceY); ctx.lineTo(offsetX + chartW + 10, surfaceY); ctx.stroke();
        ctx.fillStyle = '#66bb6a'; ctx.font = '10px sans-serif';
        for (let x = offsetX; x < offsetX + chartW; x += 12) ctx.fillText('⌃', x, surfaceY - 2);

        // ── Soil layers ──
        let cumulativeDepth = 0;
        layers.forEach((layer) => {
            const thickness = parseFloat(layer.thickness) || 0;
            const y1 = yScale(cumulativeDepth);
            const y2 = yScale(cumulativeDepth + thickness);
            const layerH = y2 - y1;
            const colors = soilColorsCanvas[layer.soilType] || soilColorsCanvas.kil;

            ctx.fillStyle = colors.fill; ctx.globalAlpha = 0.35;
            ctx.fillRect(offsetX, y1, chartW, layerH); ctx.globalAlpha = 1.0;
            drawPattern(ctx, layer.soilType, offsetX, y1, chartW, layerH, colors.fill);

            if (cumulativeDepth > 0) {
                ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1; ctx.setLineDash([6, 4]);
                ctx.beginPath(); ctx.moveTo(offsetX, y1); ctx.lineTo(offsetX + chartW, y1); ctx.stroke(); ctx.setLineDash([]);
            }

            const midY = (y1 + y2) / 2;
            const name = getSoilName(layer.soilType);
            if (layerH > 18) {
                ctx.fillStyle = '#e0e0e0'; ctx.font = '11px Inter, system-ui, sans-serif';
                ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
                ctx.fillText(`${name} (${thickness}m)`, offsetX + chartW + 6, midY);
            }
            cumulativeDepth += thickness;
        });

        // Bottom boundary
        const bottomY = yScale(totalSoilDepth);
        ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 1; ctx.setLineDash([6, 4]);
        ctx.beginPath(); ctx.moveTo(offsetX, bottomY); ctx.lineTo(offsetX + chartW, bottomY); ctx.stroke(); ctx.setLineDash([]);

        // ── Jet grout columns ──
        for (let i = 0; i < numCols; i++) {
            const colCenterX = s / 2 + i * s;
            const colLeft = xScale(colCenterX - D / 2);
            const colWidth = wScale(D);
            const colTop = yScale(0);
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

            ctx.strokeStyle = '#42a5f5'; ctx.lineWidth = 1.5;
            ctx.strokeRect(colLeft, colTop, colWidth, colHeight);

            ctx.strokeStyle = '#1e88e5'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(colLeft, colTop + colHeight); ctx.lineTo(colLeft + colWidth, colTop + colHeight); ctx.stroke();

            ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 0.5;
            for (let y = colTop; y < colTop + colHeight; y += 8) {
                ctx.beginPath(); ctx.moveTo(colLeft, y); ctx.lineTo(colLeft + colWidth, y + 8); ctx.stroke();
            }
        }

        // ── Dimension lines D, s ──
        const col1CenterX = s / 2;
        const col1Left = xScale(col1CenterX - D / 2);
        const col1Right = xScale(col1CenterX + D / 2);
        const colTopY = yScale(0);
        drawDimensionLine(ctx, col1Left, colTopY - 16, col1Right, colTopY - 16, `D = ${D}m`, 'top');

        const col2CenterX = s / 2 + s;
        const cx1 = xScale(col1CenterX);
        const cx2 = xScale(col2CenterX);
        drawDimensionLine(ctx, cx1, offsetY - 30, cx2, offsetY - 30, `s = ${s}m`, 'top');

        ctx.strokeStyle = 'rgba(255, 171, 64, 0.4)'; ctx.lineWidth = 0.5; ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.moveTo(col1Left, colTopY); ctx.lineTo(col1Left, colTopY - 21); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(col1Right, colTopY); ctx.lineTo(col1Right, colTopY - 21); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx1, colTopY - 24); ctx.lineTo(cx1, offsetY - 35); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx2, colTopY - 24); ctx.lineTo(cx2, offsetY - 35); ctx.stroke();
        ctx.setLineDash([]);

        // ── Groundwater ──
        if (gwDepth > 0 && gwDepth < totalSoilDepth) {
            const gwY = yScale(gwDepth);
            const waterGrad = ctx.createLinearGradient(0, gwY, 0, offsetY + chartH);
            waterGrad.addColorStop(0, 'rgba(33, 150, 243, 0.08)');
            waterGrad.addColorStop(1, 'rgba(33, 150, 243, 0.15)');
            ctx.fillStyle = waterGrad;
            ctx.fillRect(offsetX, gwY, chartW, offsetY + chartH - gwY);
            ctx.strokeStyle = '#2196f3'; ctx.lineWidth = 2; ctx.setLineDash([8, 4]);
            ctx.beginPath(); ctx.moveTo(offsetX, gwY); ctx.lineTo(offsetX + chartW, gwY); ctx.stroke(); ctx.setLineDash([]);

            const triX = offsetX + chartW + 10;
            ctx.fillStyle = '#2196f3';
            ctx.beginPath(); ctx.moveTo(triX - 7, gwY - 2); ctx.lineTo(triX + 7, gwY - 2); ctx.lineTo(triX, gwY + 8); ctx.closePath(); ctx.fill();
            ctx.font = '10px Inter, system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
            ctx.fillText(`${tr ? 'YASS' : 'GW'} ${gwDepth.toFixed(1)}m`, triX + 10, gwY);
        }

        // ── Depth axis ──
        ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = '10px Inter, system-ui, sans-serif';
        ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        ctx.fillText('0', offsetX - 22, surfaceY);
        let cumD = 0;
        layers.forEach((layer) => {
            cumD += parseFloat(layer.thickness) || 0;
            const y = yScale(cumD);
            ctx.fillText(cumD.toFixed(1) + 'm', offsetX - 22, y);
            ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(offsetX - 4, y); ctx.lineTo(offsetX, y); ctx.stroke();
        });

        // H mark
        const hY = yScale(H);
        let hMatchesLayer = false;
        let checkD = 0;
        for (const l of layers) {
            checkD += parseFloat(l.thickness) || 0;
            if (Math.abs(checkD - H) < 0.1) { hMatchesLayer = true; break; }
        }
        if (!hMatchesLayer) {
            ctx.fillStyle = '#42a5f5';
            ctx.fillText(H.toFixed(1) + 'm', offsetX - 22, hY);
        }

        // ── Legend ──
        const legendY = offsetY + chartH + 10;
        ctx.font = '10px Inter, system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(144, 202, 249, 0.7)';
        ctx.fillRect(offsetX, legendY, 14, 10);
        ctx.strokeStyle = '#42a5f5'; ctx.lineWidth = 1;
        ctx.strokeRect(offsetX, legendY, 14, 10);
        ctx.fillStyle = '#e0e0e0';
        ctx.fillText('Jet Grout', offsetX + 20, legendY + 5);

        const Ar = (Math.PI * (D / 2) ** 2) / (s ** 2);
        ctx.fillStyle = '#90caf9';
        ctx.fillText(`Ar = ${(Ar * 100).toFixed(1)}%`, offsetX + 90, legendY + 5);

    }, [parameters, layers, lang, waterTable, groundSurface, localFoundation, localFill]);

    // ═══════════════════════════════════════════════════════════════════════════
    //  Render
    // ═══════════════════════════════════════════════════════════════════════════
    return (
        <div className="ssp-wrapper">
            {/* ── Left panel: Soil layers ── */}
            <div className="ssp-left">
                <div className="ssp-left-header">
                    <h4>{tr ? 'Zemin Profili' : 'Soil Profile'}</h4>
                    <span className="ssp-depth-badge">
                        {totalThickness.toFixed(1)} m
                    </span>
                </div>

                {/* Foundation & Fill inputs */}
                <div className="ssp-extra-params">
                    <div className="ssp-extra-row">
                        <label>
                            <span className="ssp-extra-icon">▭</span>
                            {tr ? 'Temel' : 'Foundation'}
                        </label>
                        <div className="ssp-extra-input">
                            <input type="number" value={localFoundation}
                                onChange={e => { const v = parseFloat(e.target.value) || 0; setLocalFoundation(v); notifyExtra('foundationThickness', v); }}
                                min={0} max={5} step={0.1} />
                            <span>m</span>
                        </div>
                    </div>
                    <div className="ssp-extra-row">
                        <label>
                            <span className="ssp-extra-icon">▤</span>
                            {tr ? 'Dolgu' : 'Fill'}
                        </label>
                        <div className="ssp-extra-input">
                            <input type="number" value={localFill}
                                onChange={e => { const v = parseFloat(e.target.value) || 0; setLocalFill(v); notifyExtra('fillHeight', v); }}
                                min={0} max={10} step={0.1} />
                            <span>m</span>
                        </div>
                    </div>
                    <div className="ssp-extra-row">
                        <label>
                            <span className="ssp-extra-icon">▼</span>
                            {tr ? 'YASS' : 'GW'}
                        </label>
                        <div className="ssp-extra-input">
                            <input type="number" value={waterTable}
                                onChange={e => setWaterTable(e.target.value)}
                                min={0} max={50} step={0.5} />
                            <span>m</span>
                        </div>
                    </div>
                </div>

                <div className="ssp-divider" />

                {/* Layer stack */}
                <div className="ssp-layer-stack">
                    <div className="ssp-surface-tag">
                        <span>─── {tr ? 'Zemin Yüzeyi' : 'Ground Surface'} (0.0 m) ───</span>
                    </div>
                    {layers.map((layer, index) => {
                        const depth = getDepthRange(index);
                        const colors = SOIL_COLORS_VISUAL[layer.soilType] || SOIL_COLORS_VISUAL.kil;
                        const isPopupOpen = popupLayerId === layer.id;

                        return (
                            <div
                                key={layer.id}
                                className={`ssp-layer-row ${isPopupOpen ? 'active' : ''}`}
                                style={{ borderLeftColor: colors.accent }}
                                onClick={(e) => handleLayerClick(e, layer.id)}
                                draggable
                                onDragStart={(e) => onDragStart(e, index)}
                                onDragEnter={(e) => onDragEnter(e, index)}
                                onDragEnd={onDragEnd}
                                onDragOver={onDragOver}
                            >
                                <div className="ssp-layer-color" style={{ background: colors.bg }} />
                                <div className="ssp-layer-info">
                                    <span className="ssp-layer-name">{getSoilName(layer.soilType)}</span>
                                    <span className="ssp-layer-depth">{depth.start}–{depth.end} m</span>
                                </div>
                                <div className="ssp-layer-thick">
                                    <input
                                        type="number"
                                        value={layer.thickness}
                                        onChange={(e) => { e.stopPropagation(); updateLayer(layer.id, 'thickness', parseFloat(e.target.value) || 0); }}
                                        onClick={(e) => e.stopPropagation()}
                                        min={0.5} max={30} step={0.5}
                                    />
                                    <span>m</span>
                                </div>
                                <div className="ssp-layer-drag" title={tr ? 'Sürükle' : 'Drag'}>⋮⋮</div>
                            </div>
                        );
                    })}
                </div>

                {/* Add layer button */}
                <button className="ssp-add-btn" onClick={addLayer}>
                    + {tr ? 'Tabaka Ekle' : 'Add Layer'}
                </button>
            </div>

            {/* ── Floating Popup — Layer parameters (Word-style mini toolbar) ── */}
            {popupLayer && (
                <div
                    className="ssp-popup"
                    ref={popupRef}
                    style={{
                        top: Math.min(popupPos.y, window.innerHeight - 380),
                        left: Math.min(popupPos.x, window.innerWidth - 280)
                    }}
                >
                    <div className="ssp-popup-header">
                        <span className="ssp-popup-title">
                            {getSoilName(popupLayer.soilType)} — {tr ? 'Parametreler' : 'Parameters'}
                        </span>
                        <div className="ssp-popup-actions">
                            {layers.length > 1 && (
                                <button className="ssp-popup-del" onClick={() => removeLayer(popupLayerId)} title={tr ? 'Sil' : 'Delete'}>🗑️</button>
                            )}
                            <button className="ssp-popup-close" onClick={() => setPopupLayerId(null)}>✕</button>
                        </div>
                    </div>

                    <div className="ssp-popup-body">
                        {/* Soil type selector */}
                        <div className="ssp-popup-row">
                            <label>{tr ? 'Zemin Tipi' : 'Soil Type'}</label>
                            <select value={popupLayer.soilType}
                                onChange={e => updateLayer(popupLayerId, 'soilType', e.target.value)}>
                                {SOIL_TYPES.map(type => (
                                    <option key={type} value={type}>{getSoilName(type)}</option>
                                ))}
                            </select>
                        </div>

                        <div className="ssp-popup-divider" />

                        <div className="ssp-popup-section-title">Mohr-Coulomb</div>

                        <div className="ssp-popup-row">
                            <label>γ <span>{tr ? 'Birim Ağırlık' : 'Unit Weight'}</span></label>
                            <div className="ssp-popup-input">
                                <input type="number" value={popupLayer.gamma}
                                    onChange={e => updateLayer(popupLayerId, 'gamma', parseFloat(e.target.value) || 0)}
                                    min={10} max={30} step={0.5} />
                                <span>kN/m³</span>
                            </div>
                        </div>

                        <div className="ssp-popup-row">
                            <label>φ <span>{tr ? 'Sürtünme Açısı' : 'Friction Angle'}</span></label>
                            <div className="ssp-popup-input">
                                <input type="number" value={popupLayer.phi}
                                    onChange={e => updateLayer(popupLayerId, 'phi', parseFloat(e.target.value) || 0)}
                                    min={0} max={45} step={1} />
                                <span>°</span>
                            </div>
                        </div>

                        <div className="ssp-popup-row">
                            <label>c <span>{tr ? 'Kohezyon' : 'Cohesion'}</span></label>
                            <div className="ssp-popup-input">
                                <input type="number" value={popupLayer.cohesion}
                                    onChange={e => updateLayer(popupLayerId, 'cohesion', parseFloat(e.target.value) || 0)}
                                    min={0} max={5000} step={5} />
                                <span>kPa</span>
                            </div>
                        </div>

                        <div className="ssp-popup-row">
                            <label>E <span>{tr ? 'Elastisite' : 'Elasticity'}</span></label>
                            <div className="ssp-popup-input">
                                <input type="number" value={popupLayer.elasticity}
                                    onChange={e => updateLayer(popupLayerId, 'elasticity', parseFloat(e.target.value) || 0)}
                                    min={1000} max={500000} step={1000} />
                                <span>kN/m²</span>
                            </div>
                        </div>

                        <div className="ssp-popup-row">
                            <label>ν <span>{tr ? 'Poisson' : 'Poisson'}</span></label>
                            <div className="ssp-popup-input">
                                <input type="number" value={popupLayer.poisson}
                                    onChange={e => updateLayer(popupLayerId, 'poisson', parseFloat(e.target.value) || 0)}
                                    min={0.1} max={0.5} step={0.05} />
                                <span>—</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Right panel: Cross-Section View ── */}
            <div className="ssp-right">
                <canvas ref={canvasRef} className="ssp-canvas" />
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  Helper drawing functions
// ═══════════════════════════════════════════════════════════════════════════════
function drawDimensionLine(ctx, x1, y1, x2, y2, label, side) {
    const arrowSize = 4;
    ctx.strokeStyle = '#ffab40'; ctx.fillStyle = '#ffab40'; ctx.lineWidth = 1;
    ctx.font = 'bold 10px Inter, system-ui, sans-serif';

    if (side === 'top') {
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 + arrowSize, y1 - arrowSize); ctx.lineTo(x1 + arrowSize, y1 + arrowSize); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 - arrowSize, y2 - arrowSize); ctx.lineTo(x2 - arrowSize, y2 + arrowSize); ctx.closePath(); ctx.fill();
        ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
        ctx.fillText(label, (x1 + x2) / 2, y1 - 3);
    } else if (side === 'left') {
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 - arrowSize, y1 + arrowSize); ctx.lineTo(x1 + arrowSize, y1 + arrowSize); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 - arrowSize, y2 - arrowSize); ctx.lineTo(x2 + arrowSize, y2 - arrowSize); ctx.closePath(); ctx.fill();
        ctx.save(); ctx.translate(x1 - 6, (y1 + y2) / 2); ctx.rotate(-Math.PI / 2);
        ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(label, 0, 0); ctx.restore();
    }
}

function drawPattern(ctx, soilType, x, y, w, h, color) {
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.globalAlpha = 0.25; ctx.lineWidth = 0.5;

    switch (soilType) {
        case 'kum':
            for (let px = x; px < x + w; px += 10)
                for (let py = y; py < y + h; py += 10) {
                    const ox = (Math.sin(px * 13.7 + py * 7.3) * 3);
                    const oy = (Math.cos(px * 11.3 + py * 5.7) * 3);
                    ctx.beginPath(); ctx.arc(px + ox, py + oy, 1, 0, Math.PI * 2); ctx.fill();
                }
            break;
        case 'kil':
            for (let py = y; py < y + h; py += 8) { ctx.beginPath(); ctx.moveTo(x, py); ctx.lineTo(x + w, py); ctx.stroke(); }
            break;
        case 'silt':
            for (let px = x; px < x + w; px += 14)
                for (let py = y; py < y + h; py += 10) { ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + 6, py); ctx.stroke(); }
            break;
        case 'kaya':
            for (let px = x - h; px < x + w; px += 12) {
                ctx.beginPath(); ctx.moveTo(px, y); ctx.lineTo(px + h, y + h); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(px + h, y); ctx.lineTo(px, y + h); ctx.stroke();
            }
            break;
        case 'cakil':
            for (let px = x + 8; px < x + w; px += 16)
                for (let py = y + 6; py < y + h; py += 14) { ctx.beginPath(); ctx.arc(px, py, 3, 0, Math.PI * 2); ctx.stroke(); }
            break;
    }
    ctx.restore();
}

export default SoilSectionPanel;
