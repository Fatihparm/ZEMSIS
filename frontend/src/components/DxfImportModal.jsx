import { useState, useCallback, useRef } from 'react';
import { parseDxf, dxfExtractCandidates, buildProjectData } from '../utils/dxfParser';
import './DxfImportModal.css';

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmtNum(n, dec = 2) {
    if (n === undefined || n === null || !isFinite(n)) return '—';
    return n.toFixed(dec);
}

const UNIT_LABELS = { mm: 'mm', cm: 'cm', m: 'm', inch: 'in', ft: 'ft' };

// Palette for polyline candidates in SVG
const POLY_COLORS = [
    '#4fc3f7', '#ff9800', '#4caf50', '#ab47bc', '#ef5350',
    '#26c6da', '#fdd835', '#ec407a', '#66bb6a', '#8d6e63',
    '#78909c', '#7e57c2', '#ffca28', '#29b6f6', '#d4e157',
];

// ── Interactive SVG Preview ────────────────────────────────────────────────────
function DxfSelectorSvg({ polylineCandidates, allCircles, selectedId, onSelectPoly, unit }) {
    // Compute global bounds from all polylines + circles
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of polylineCandidates) {
        for (const v of p.vertices) {
            if (v.x < minX) minX = v.x;
            if (v.x > maxX) maxX = v.x;
            if (v.y < minY) minY = v.y;
            if (v.y > maxY) maxY = v.y;
        }
    }
    for (const c of allCircles) {
        if (c.x - c.radius < minX) minX = c.x - c.radius;
        if (c.x + c.radius > maxX) maxX = c.x + c.radius;
        if (c.y - c.radius < minY) minY = c.y - c.radius;
        if (c.y + c.radius > maxY) maxY = c.y + c.radius;
    }

    if (!isFinite(minX)) return null;

    const w = maxX - minX || 1;
    const h = maxY - minY || 1;
    const pad = Math.max(w, h) * 0.06;

    const vbX = minX - pad;
    const vbY = -(maxY + pad); // flip Y for screen coords
    const vbW = w + pad * 2;
    const vbH = h + pad * 2;

    const dotR = Math.max(w, h) * 0.004;
    const strokeW = Math.max(w, h) * 0.003;
    const selectedStrokeW = Math.max(w, h) * 0.006;

    return (
        <svg
            className="dxf-selector-svg"
            viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
            preserveAspectRatio="xMidYMid meet"
        >
            {/* Dark background */}
            <rect x={vbX} y={vbY} width={vbW} height={vbH} fill="rgba(0,0,0,0.4)" />

            {/* Circle dots (columns) — drawn first so polylines are on top */}
            {allCircles.map((c, i) => (
                <circle
                    key={`c-${i}`}
                    cx={c.x} cy={-c.y}
                    r={dotR * 1.2}
                    fill="#ef5350"
                    opacity={0.5}
                />
            ))}

            {/* Polyline candidates — clickable */}
            {polylineCandidates.map((poly, idx) => {
                const isSelected = selectedId.includes(poly.id);
                const color = POLY_COLORS[idx % POLY_COLORS.length];
                const pathD = poly.vertices.map((v, i) =>
                    `${i === 0 ? 'M' : 'L'}${v.x},${-v.y}`
                ).join(' ') + ' Z';

                return (
                    <g key={poly.id} style={{ cursor: 'pointer' }} onClick={() => onSelectPoly(poly.id)}>
                        {/* Transparent hit area */}
                        <path
                            d={pathD}
                            fill="transparent"
                            stroke="transparent"
                            strokeWidth={selectedStrokeW * 3}
                        />
                        {/* Visible path */}
                        <path
                            d={pathD}
                            fill={isSelected ? `${color}22` : 'none'}
                            stroke={color}
                            strokeWidth={isSelected ? selectedStrokeW : strokeW}
                            strokeLinejoin="round"
                            opacity={isSelected ? 1 : 0.6}
                            strokeDasharray={isSelected ? 'none' : `${strokeW * 6} ${strokeW * 3}`}
                        />
                    </g>
                );
            })}
        </svg>
    );
}

// ── AutoCAD Preparation Guide ──────────────────────────────────────────────────
function LayerGuide({ tr, show, onToggle }) {
    return (
        <div className="dxf-guide-wrapper">
            <button className="dxf-guide-toggle" onClick={onToggle}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                {tr ? 'AutoCAD Katman Hazırlığı' : 'AutoCAD Layer Preparation'}
                <svg className={`dxf-guide-chevron ${show ? 'open' : ''}`}
                    width="12" height="12" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.5">
                    <polyline points="6 9 12 15 18 9" />
                </svg>
            </button>
            {show && (
                <div className="dxf-guide-content">
                    <p>{tr
                        ? 'AutoCAD\'de aşağıdaki katman isimlerini kullanarak çizimlerinizi etiketleyin:'
                        : 'Tag your drawings in AutoCAD using these exact layer names:'}</p>
                    <div className="dxf-guide-layers">
                        <div className="dxf-guide-layer-item">
                            <code className="dxf-guide-layer-name boundary">JET_ZEMIN</code>
                            <span>{tr ? 'Zemin sınır polyline\'ları (TR)' : 'Ground boundary polylines (TR)'}</span>
                        </div>
                        <div className="dxf-guide-layer-item">
                            <code className="dxf-guide-layer-name boundary">JET_BOUNDARY</code>
                            <span>{tr ? 'Zemin sınır polyline\'ları (EN)' : 'Ground boundary polylines (EN)'}</span>
                        </div>
                        <div className="dxf-guide-layer-item">
                            <code className="dxf-guide-layer-name column">JET_KOLON</code>
                            <span>{tr ? 'Jet grout kolon daireleri (TR)' : 'Jet grout column circles (TR)'}</span>
                        </div>
                        <div className="dxf-guide-layer-item">
                            <code className="dxf-guide-layer-name column">JET_COLUMNS</code>
                            <span>{tr ? 'Jet grout kolon daireleri (EN)' : 'Jet grout column circles (EN)'}</span>
                        </div>
                    </div>
                    <p className="dxf-guide-note">{tr
                        ? '💡 İpucu: Katman isimleri büyük/küçük harf duyarlıdır. Tam olarak yukarıdaki gibi yazın.'
                        : '💡 Tip: Layer names are case-sensitive. Use the exact names shown above.'}</p>
                </div>
            )}
        </div>
    );
}

// ── Layer Filter Chips (manual mode) ───────────────────────────────────────────
function LayerFilterChips({ availableLayers, visibleLayers, onToggleLayer, tr }) {
    if (!availableLayers || availableLayers.length <= 1) return null;

    return (
        <div className="dxf-layer-filter">
            <div className="dxf-layer-filter-label">
                {tr ? 'Katman Filtresi:' : 'Layer Filter:'}
            </div>
            <div className="dxf-layer-chips">
                {availableLayers.map(layer => {
                    const isActive = visibleLayers.includes(layer.name);
                    return (
                        <button
                            key={layer.name}
                            className={`dxf-layer-chip ${isActive ? 'active' : ''}`}
                            onClick={() => onToggleLayer(layer.name)}
                            title={`${layer.polylineCount} polylines, ${layer.circleCount} circles`}
                        >
                            <span className="dxf-layer-chip-name">{layer.name}</span>
                            <span className="dxf-layer-chip-count">
                                {layer.polylineCount > 0 && `⬡${layer.polylineCount}`}
                                {layer.polylineCount > 0 && layer.circleCount > 0 && ' '}
                                {layer.circleCount > 0 && `●${layer.circleCount}`}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function DxfImportModal({ lang, onImport, onClose }) {
    const tr = lang === 'tr';
    const inputRef = useRef(null);

    const [status, setStatus] = useState('idle'); // 'idle' | 'parsing' | 'done' | 'error'
    const [fileName, setFileName] = useState('');
    const [parseError, setParseError] = useState('');
    const [warnings, setWarnings] = useState([]);

    // Parsed data
    const [candidates, setCandidates] = useState(null);
    const [selectedPolyIds, setSelectedPolyIds] = useState([]);
    const [showGuide, setShowGuide] = useState(false);

    // Manual mode layer filter
    const [visibleLayers, setVisibleLayers] = useState([]);

    // ── File reading & auto-parse ─────────────────────────────────────────────
    const handleFile = useCallback((file) => {
        if (!file) return;
        if (!file.name.toLowerCase().endsWith('.dxf')) {
            setParseError(tr
                ? 'Lütfen .dxf uzantılı bir dosya seçin.'
                : 'Please select a .dxf file.');
            setStatus('error');
            return;
        }

        setParseError('');
        setFileName(file.name);
        setStatus('parsing');
        setCandidates(null);
        setSelectedPolyIds([]);
        setVisibleLayers([]);

        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const text = ev.target.result;
                const dxfResult = parseDxf(text);
                const layerNames = Object.keys(dxfResult.layers);

                setWarnings(dxfResult.warnings || []);

                if (layerNames.length === 0) {
                    setParseError(tr
                        ? 'Dosyada hiçbir katman bulunamadı.'
                        : 'No layers found in file.');
                    setStatus('error');
                    return;
                }

                // Extract candidates (with smart layer detection)
                const cands = dxfExtractCandidates(dxfResult);

                if (cands.polylineCandidates.length === 0 && cands.allCircles.length === 0) {
                    setParseError(tr
                        ? 'Dosyada uygun geometri bulunamadı (kapalı polyline veya daire yok).'
                        : 'No usable geometry found (no closed polylines or circles).');
                    setStatus('error');
                    return;
                }

                setCandidates(cands);
                // Auto-select ALL candidates (in smart mode these are already filtered)
                setSelectedPolyIds(cands.polylineCandidates.map(p => p.id));
                // In manual mode, show all layers by default
                setVisibleLayers(cands.availableLayers.map(l => l.name));
                setStatus('done');
            } catch (err) {
                setParseError((tr ? 'DXF parse hatası: ' : 'DXF parse error: ') + err.message);
                setStatus('error');
            }
        };
        reader.onerror = () => {
            setParseError(tr ? 'Dosya okunamadı.' : 'Could not read file.');
            setStatus('error');
        };
        reader.readAsText(file, 'UTF-8');
    }, [tr]);

    const handleInputChange = (e) => handleFile(e.target.files[0]);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    }, [handleFile]);

    // ── Polyline selection toggle ─────────────────────────────────────────────
    const handleSelectPoly = useCallback((id) => {
        setSelectedPolyIds(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
    }, []);

    const handleToggleAll = useCallback(() => {
        if (!candidates) return;
        // Only toggle among visible polylines
        const visiblePolys = candidates.polylineCandidates.filter(p =>
            visibleLayers.includes(p.layer)
        );
        const visibleIds = visiblePolys.map(p => p.id);
        const allVisible = visibleIds.every(id => selectedPolyIds.includes(id));
        if (allVisible) {
            // Deselect visible ones
            setSelectedPolyIds(prev => prev.filter(id => !visibleIds.includes(id)));
        } else {
            // Select all visible
            setSelectedPolyIds(prev => [...new Set([...prev, ...visibleIds])]);
        }
    }, [candidates, visibleLayers, selectedPolyIds]);

    // ── Layer filter toggle (manual mode) ─────────────────────────────────────
    const handleToggleLayer = useCallback((layerName) => {
        setVisibleLayers(prev =>
            prev.includes(layerName)
                ? prev.filter(l => l !== layerName)
                : [...prev, layerName]
        );
    }, []);

    // ── Reset ─────────────────────────────────────────────────────────────────
    const handleReset = () => {
        setStatus('idle');
        setFileName('');
        setParseError('');
        setWarnings([]);
        setCandidates(null);
        setSelectedPolyIds([]);
        setVisibleLayers([]);
        setShowGuide(false);
        if (inputRef.current) inputRef.current.value = '';
    };

    // ── Import ────────────────────────────────────────────────────────────────
    const handleImport = () => {
        if (!candidates) return;
        const data = buildProjectData(candidates, selectedPolyIds);
        onImport(data);
        onClose();
    };

    // ── Computed info ─────────────────────────────────────────────────────────
    const canImport = candidates && (candidates.allCircles.length > 0 || selectedPolyIds.length > 0);
    const isSmartMode = candidates?.mode === 'smart';

    // Filter displayed polylines by visible layers (for manual mode)
    const displayedPolys = candidates
        ? candidates.polylineCandidates.filter(p => visibleLayers.includes(p.layer))
        : [];

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="dxf-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="dxf-modal">
                {/* Header */}
                <div className="dxf-modal-header">
                    <div className="dxf-modal-title">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                            <line x1="8" y1="13" x2="16" y2="13" />
                            <line x1="8" y1="17" x2="16" y2="17" />
                        </svg>
                        {tr ? 'DXF Dosyası İçe Aktar' : 'Import DXF File'}
                    </div>
                    <button className="dxf-modal-close" onClick={onClose}>✕</button>
                </div>

                <div className="dxf-modal-body">
                    {/* ── Upload area ── */}
                    {(status === 'idle' || status === 'error') && (
                        <div className="dxf-upload-area"
                            onDrop={handleDrop}
                            onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('drag-over'); }}
                            onDragLeave={e => e.currentTarget.classList.remove('drag-over')}
                            onClick={() => inputRef.current?.click()}>
                            <input ref={inputRef} type="file" accept=".dxf"
                                style={{ display: 'none' }}
                                onChange={handleInputChange} />
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none"
                                stroke="currentColor" strokeWidth="1.5">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="17 8 12 3 7 8" />
                                <line x1="12" y1="3" x2="12" y2="15" />
                            </svg>
                            <p className="dxf-upload-text">
                                {tr
                                    ? 'DXF dosyanızı buraya sürükleyin veya tıklayın'
                                    : 'Drag & drop your DXF file here or click to browse'}
                            </p>
                            <p className="dxf-upload-sub">
                                {tr ? 'AutoCAD DXF formatı desteklenir' : 'AutoCAD DXF format supported'}
                            </p>
                        </div>
                    )}

                    {/* ── Layer guide (always visible in idle/error) ── */}
                    {(status === 'idle' || status === 'error') && (
                        <LayerGuide tr={tr} show={showGuide} onToggle={() => setShowGuide(v => !v)} />
                    )}

                    {/* ── Parsing spinner ── */}
                    {status === 'parsing' && (
                        <div className="dxf-parsing">
                            <div className="dxf-spinner" />
                            <p>{tr ? 'DXF dosyası okunuyor...' : 'Reading DXF file...'}</p>
                            <p className="dxf-parsing-file">{fileName}</p>
                        </div>
                    )}

                    {/* ── Results ── */}
                    {status === 'done' && candidates && (
                        <div className="dxf-results">
                            {/* File info bar */}
                            <div className="dxf-file-info">
                                <span className="dxf-file-name">📄 {fileName}</span>
                                <button className="dxf-change-file" onClick={handleReset}>
                                    {tr ? 'Değiştir' : 'Change'}
                                </button>
                            </div>

                            {/* ── Smart Mode Banner ── */}
                            {isSmartMode && (
                                <div className="dxf-smart-banner">
                                    <div className="dxf-smart-banner-icon">✅</div>
                                    <div className="dxf-smart-banner-text">
                                        {tr ? (
                                            <>
                                                Akıllı katman algılama aktif.
                                                {candidates.detectedBoundaryLayer && (
                                                    <> <code>{candidates.detectedBoundaryLayer}</code> katmanında <strong>{candidates.polylineCandidates.length}</strong> sınır</>
                                                )}
                                                {candidates.detectedBoundaryLayer && candidates.detectedColumnLayer && ','}
                                                {candidates.detectedColumnLayer && (
                                                    <> <code>{candidates.detectedColumnLayer}</code> katmanında <strong>{candidates.allCircles.length}</strong> kolon</>
                                                )} bulundu.
                                            </>
                                        ) : (
                                            <>
                                                Smart layer detection active.
                                                {candidates.detectedBoundaryLayer && (
                                                    <> Found <strong>{candidates.polylineCandidates.length}</strong> boundaries in <code>{candidates.detectedBoundaryLayer}</code></>
                                                )}
                                                {candidates.detectedBoundaryLayer && candidates.detectedColumnLayer && ','}
                                                {candidates.detectedColumnLayer && (
                                                    <> <strong>{candidates.allCircles.length}</strong> columns in <code>{candidates.detectedColumnLayer}</code></>
                                                )}.
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* ── Manual Mode Warning ── */}
                            {!isSmartMode && (
                                <div className="dxf-manual-banner">
                                    <div className="dxf-manual-banner-icon">⚠️</div>
                                    <div className="dxf-manual-banner-text">
                                        {tr
                                            ? <>
                                                <code>JET_ZEMIN</code> / <code>JET_KOLON</code> katmanları bulunamadı.
                                                Tüm katmanlardan polyline ve daireler gösteriliyor.
                                              </>
                                            : <>
                                                <code>JET_ZEMIN</code> / <code>JET_KOLON</code> layers not found.
                                                Showing polylines and circles from all layers.
                                              </>
                                        }
                                    </div>
                                    <button
                                        className="dxf-manual-guide-btn"
                                        onClick={() => setShowGuide(v => !v)}
                                    >
                                        ?
                                    </button>
                                </div>
                            )}

                            {/* Guide (in results, if manual mode) */}
                            {!isSmartMode && (
                                <LayerGuide tr={tr} show={showGuide} onToggle={() => setShowGuide(v => !v)} />
                            )}

                            {/* ── Layer filter chips (manual mode only, when multiple layers) ── */}
                            {!isSmartMode && (
                                <LayerFilterChips
                                    availableLayers={candidates.availableLayers}
                                    visibleLayers={visibleLayers}
                                    onToggleLayer={handleToggleLayer}
                                    tr={tr}
                                />
                            )}

                            {/* Instruction text */}
                            <div className="dxf-instruction">
                                {displayedPolys.length > 0 ? (
                                    isSmartMode
                                        ? (tr
                                            ? '✅ Etiketli katmandaki tüm polyline\'lar otomatik seçildi. İstemediğinize tıklayarak seçimi kaldırabilirsiniz.'
                                            : '✅ All polylines from the tagged layer are auto-selected. Click any to deselect.')
                                        : (tr
                                            ? '📌 Kapalı polyline\'lar listelendi. İstemediğinize tıklayarak seçimi kaldırabilirsiniz.'
                                            : '📌 Closed polylines listed. Click any to deselect.')
                                ) : (
                                    tr
                                        ? '📌 Kapalı polyline bulunamadı. Kolonlar (daireler) aktarılacak, sınırı manuel çizebilirsiniz.'
                                        : '📌 No closed polylines found. Columns (circles) will be imported, you can draw the boundary manually.'
                                )}
                            </div>

                            {/* Interactive SVG */}
                            {(displayedPolys.length > 0 || candidates.allCircles.length > 0) && (
                                <div className="dxf-selector-container">
                                    <DxfSelectorSvg
                                        polylineCandidates={displayedPolys}
                                        allCircles={candidates.allCircles}
                                        selectedId={selectedPolyIds}
                                        onSelectPoly={handleSelectPoly}
                                        unit={candidates.unit}
                                    />
                                </div>
                            )}

                            {/* Polyline list (compact) */}
                            {displayedPolys.length > 0 && (
                                <div className="dxf-poly-list">
                                    <div className="dxf-poly-list-title">
                                        {tr ? 'Kapalı Polyline\'lar' : 'Closed Polylines'}
                                        <span className="dxf-poly-count">
                                            {selectedPolyIds.filter(id => displayedPolys.some(p => p.id === id)).length}/{displayedPolys.length}
                                        </span>
                                        <button className="dxf-toggle-all-btn" onClick={handleToggleAll}>
                                            {displayedPolys.every(p => selectedPolyIds.includes(p.id))
                                                ? (tr ? 'Tümünü Kaldır' : 'Deselect All')
                                                : (tr ? 'Tümünü Seç' : 'Select All')}
                                        </button>
                                    </div>
                                    <div className="dxf-poly-items">
                                        {displayedPolys.map((poly, idx) => {
                                            const color = POLY_COLORS[idx % POLY_COLORS.length];
                                            const isSelected = selectedPolyIds.includes(poly.id);
                                            const scale = { mm: 0.001, cm: 0.01, m: 1, inch: 0.0254, ft: 0.3048 }[candidates.unit] || 1;
                                            const w = (poly.bbox.maxX - poly.bbox.minX) * scale;
                                            const h = (poly.bbox.maxY - poly.bbox.minY) * scale;
                                            return (
                                                <button
                                                    key={poly.id}
                                                    className={`dxf-poly-item ${isSelected ? 'selected' : ''}`}
                                                    onClick={() => handleSelectPoly(poly.id)}
                                                    style={{
                                                        borderColor: isSelected ? color : undefined,
                                                        backgroundColor: isSelected ? `${color}15` : undefined,
                                                    }}
                                                >
                                                    <span className="dxf-poly-swatch" style={{ backgroundColor: color }} />
                                                    <span className="dxf-poly-info">
                                                        <span className="dxf-poly-layer">{poly.layer}</span>
                                                        <span className="dxf-poly-dim">
                                                            {fmtNum(w, 1)} × {fmtNum(h, 1)} m · {poly.vertexCount} {tr ? 'nokta' : 'pts'}
                                                        </span>
                                                    </span>
                                                    {isSelected && <span className="dxf-poly-check">✓</span>}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Stats row */}
                            <div className="dxf-stats-row">
                                <div className="dxf-stat-chip">
                                    <span>🔴</span>
                                    <span>{candidates.allCircles.length} {tr ? 'Kolon' : 'Columns'}</span>
                                </div>
                                {candidates.columnDiameter && (
                                    <div className="dxf-stat-chip">
                                        <span>📐</span>
                                        <span>D = {fmtNum(candidates.columnDiameter, 2)} m</span>
                                    </div>
                                )}
                                <div className="dxf-stat-chip">
                                    <span>📏</span>
                                    <span>{tr ? 'Birim' : 'Unit'}: {UNIT_LABELS[candidates.unit] || candidates.unit}</span>
                                </div>
                                {selectedPolyIds.length > 0 && (
                                    <div className="dxf-stat-chip highlight">
                                        <span>⬡</span>
                                        <span>{selectedPolyIds.length} {tr ? 'sınır' : 'boundaries'}</span>
                                    </div>
                                )}
                                {isSmartMode && (
                                    <div className="dxf-stat-chip smart">
                                        <span>🎯</span>
                                        <span>{tr ? 'Akıllı Mod' : 'Smart Mode'}</span>
                                    </div>
                                )}
                            </div>

                            {/* Import note */}
                            <div className="dxf-import-note">
                                {tr
                                    ? '⚠️ Mevcut çizim verisi silinecek ve DXF verileri yüklenecek.'
                                    : '⚠️ Existing drawing data will be replaced with DXF data.'}
                            </div>
                        </div>
                    )}

                    {/* Warnings */}
                    {warnings.length > 0 && (
                        <div className="dxf-warnings">
                            {warnings.map((w, i) => (
                                <div key={i} className="dxf-warning">⚠ {w}</div>
                            ))}
                        </div>
                    )}

                    {/* Error */}
                    {parseError && (
                        <div className="dxf-error">❌ {parseError}</div>
                    )}
                </div>

                {/* Footer */}
                <div className="dxf-modal-footer">
                    <button className="dxf-btn dxf-btn-ghost" onClick={onClose}>
                        {tr ? 'İptal' : 'Cancel'}
                    </button>

                    {status === 'done' && (
                        <button
                            className="dxf-btn dxf-btn-import"
                            onClick={handleImport}
                            disabled={!canImport}
                        >
                            {selectedPolyIds.length > 0
                                ? (tr
                                    ? `✓ ${selectedPolyIds.length} Sınır + Kolonları Aktar`
                                    : `✓ Import ${selectedPolyIds.length} Boundaries + Columns`)
                                : (tr ? '✓ Sadece Kolonları Aktar' : '✓ Import Columns Only')
                            }
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
