import { useState, useCallback, useRef } from 'react';
import { parseDxf, dxfToProjectData } from '../utils/dxfParser';
import './DxfImportModal.css';

// ── Helpers ────────────────────────────────────────────────────────────────────
const UNITS = [
    { value: 'mm',   label: 'Millimetres (mm)' },
    { value: 'cm',   label: 'Centimetres (cm)' },
    { value: 'm',    label: 'Metres (m)' },
    { value: 'inch', label: 'Inches (in)' },
    { value: 'ft',   label: 'Feet (ft)' },
];

function fmtNum(n, dec = 2) {
    if (n === undefined || n === null || !isFinite(n)) return '—';
    return n.toFixed(dec);
}

function BBox({ bbox, unit }) {
    if (!bbox) return <span className="dxf-dim-empty">—</span>;
    const w = fmtNum(bbox.maxX - bbox.minX);
    const h = fmtNum(bbox.maxY - bbox.minY);
    return (
        <span className="dxf-dim">
            {w} × {h} {unit}
        </span>
    );
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function DxfImportModal({ lang, onImport, onClose }) {
    const tr = lang === 'tr';
    const inputRef = useRef(null);

    // Step: 'upload' | 'configure' | 'preview'
    const [step, setStep] = useState('upload');
    const [dxfResult, setDxfResult]       = useState(null);
    const [fileName, setFileName]         = useState('');
    const [parseError, setParseError]     = useState('');
    const [warnings, setWarnings]         = useState([]);

    // Config
    const [boundaryLayer, setBoundaryLayer] = useState('');
    const [columnLayer, setColumnLayer]     = useState('__none__');
    const [unit, setUnit]                   = useState('m');
    const [autoCenter, setAutoCenter]       = useState(true);

    // Preview
    const [preview, setPreview] = useState(null);

    // ── File reading ──────────────────────────────────────────────────────────
    const handleFile = useCallback((file) => {
        if (!file) return;
        if (!file.name.toLowerCase().endsWith('.dxf')) {
            setParseError(tr
                ? 'Lütfen .dxf uzantılı bir dosya seçin.'
                : 'Please select a .dxf file.');
            return;
        }
        setParseError('');
        setFileName(file.name);

        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const text = ev.target.result;
                const result = parseDxf(text);
                const layerNames = Object.keys(result.layers);

                setDxfResult(result);
                setWarnings(result.warnings || []);

                if (layerNames.length === 0) {
                    setParseError(tr
                        ? 'Dosyada hiçbir katman bulunamadı.'
                        : 'No layers found in file.');
                    return;
                }

                // Auto-select first layer with polylines as boundary
                const polyLayers = layerNames.filter(
                    l => result.layers[l].polylines.length > 0
                );
                if (polyLayers.length > 0) setBoundaryLayer(polyLayers[0]);
                else setBoundaryLayer(layerNames[0]);

                setStep('configure');
            } catch (err) {
                setParseError((tr ? 'DXF parse hatası: ' : 'DXF parse error: ') + err.message);
            }
        };
        reader.onerror = () => {
            setParseError(tr ? 'Dosya okunamadı.' : 'Could not read file.');
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

    // ── Preview ───────────────────────────────────────────────────────────────
    const buildPreview = useCallback(() => {
        if (!dxfResult || !boundaryLayer) return;
        try {
            const data = dxfToProjectData(dxfResult, {
                boundaryLayer: boundaryLayer || undefined,
                columnLayer: columnLayer === '__none__' ? undefined : columnLayer,
                unit,
                autoCenter,
            });
            setPreview(data);
            setStep('preview');
        } catch (err) {
            setParseError((tr ? 'Dönüştürme hatası: ' : 'Conversion error: ') + err.message);
        }
    }, [dxfResult, boundaryLayer, columnLayer, unit, autoCenter, tr]);

    // ── Import ────────────────────────────────────────────────────────────────
    const handleImport = () => {
        if (!preview) return;
        onImport(preview);
        onClose();
    };

    // ── Render ────────────────────────────────────────────────────────────────
    const layerNames = dxfResult ? Object.keys(dxfResult.layers) : [];
    const polyLayerNames = layerNames.filter(l => dxfResult.layers[l].polylines.length > 0);

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

                {/* Step indicator */}
                <div className="dxf-steps">
                    {[
                        { id: 'upload',    label: tr ? '1. Dosya' : '1. File' },
                        { id: 'configure', label: tr ? '2. Katmanlar' : '2. Layers' },
                        { id: 'preview',   label: tr ? '3. Önizleme' : '3. Preview' },
                    ].map(s => (
                        <div key={s.id}
                            className={`dxf-step ${step === s.id ? 'active' : ''} ${
                                (step === 'configure' && s.id === 'upload') ||
                                (step === 'preview' && (s.id === 'upload' || s.id === 'configure'))
                                    ? 'done' : ''
                            }`}>
                            {s.label}
                        </div>
                    ))}
                </div>

                <div className="dxf-modal-body">
                    {/* ── STEP 1: Upload ── */}
                    {step === 'upload' && (
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
                                {tr ? 'ASCII DXF formatı desteklenir (AutoCAD R12+)' : 'ASCII DXF format supported (AutoCAD R12+)'}
                            </p>
                        </div>
                    )}

                    {/* ── STEP 2: Configure ── */}
                    {step === 'configure' && dxfResult && (
                        <div className="dxf-configure">
                            {/* Parsed file info */}
                            <div className="dxf-file-info">
                                <span className="dxf-file-name">📄 {fileName}</span>
                                <span className="dxf-file-layers">
                                    {layerNames.length} {tr ? 'katman' : 'layers'}
                                </span>
                            </div>

                            {/* Layer table */}
                            <div className="dxf-layer-table-wrapper">
                                <table className="dxf-layer-table">
                                    <thead>
                                        <tr>
                                            <th>{tr ? 'Katman Adı' : 'Layer Name'}</th>
                                            <th>{tr ? 'Poligon' : 'Polylines'}</th>
                                            <th>{tr ? 'Nokta' : 'Points'}</th>
                                            <th>{tr ? 'Boyut' : 'Size'}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {layerNames.map(lname => {
                                            const ld = dxfResult.layers[lname];
                                            return (
                                                <tr key={lname}
                                                    className={boundaryLayer === lname ? 'selected-boundary' : ''}>
                                                    <td><code>{lname}</code></td>
                                                    <td>{ld.polylines.length}</td>
                                                    <td>{ld.points.length}</td>
                                                    <td><BBox bbox={ld.bbox} unit={unit} /></td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Settings */}
                            <div className="dxf-settings">
                                {/* Boundary layer */}
                                <div className="dxf-setting-row">
                                    <label>
                                        <span className="dxf-setting-icon">⬡</span>
                                        {tr ? 'Alan Sınırı Katmanı' : 'Boundary Polygon Layer'}
                                    </label>
                                    <select value={boundaryLayer}
                                        onChange={e => setBoundaryLayer(e.target.value)}>
                                        <option value="">{tr ? '— Seçiniz —' : '— Select —'}</option>
                                        {polyLayerNames.map(l => (
                                            <option key={l} value={l}>{l}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Column layer */}
                                <div className="dxf-setting-row">
                                    <label>
                                        <span className="dxf-setting-icon">🔴</span>
                                        {tr ? 'Kolon Konumları Katmanı' : 'Column Positions Layer'}
                                    </label>
                                    <select value={columnLayer}
                                        onChange={e => setColumnLayer(e.target.value)}>
                                        <option value="__none__">{tr ? '— Yok —' : '— None —'}</option>
                                        {layerNames.map(l => (
                                            <option key={l} value={l}>{l}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Unit */}
                                <div className="dxf-setting-row">
                                    <label>
                                        <span className="dxf-setting-icon">📐</span>
                                        {tr ? 'Birim' : 'Unit'}
                                    </label>
                                    <select value={unit} onChange={e => setUnit(e.target.value)}>
                                        {UNITS.map(u => (
                                            <option key={u.value} value={u.value}>{u.label}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Auto-center */}
                                <div className="dxf-setting-row dxf-setting-check">
                                    <label>
                                        <input type="checkbox" checked={autoCenter}
                                            onChange={e => setAutoCenter(e.target.checked)} />
                                        {tr ? 'Koordinatları Merkeze Al (önerilen)' : 'Center coordinates around origin (recommended)'}
                                    </label>
                                </div>
                            </div>

                            {/* Warnings */}
                            {warnings.length > 0 && (
                                <div className="dxf-warnings">
                                    {warnings.map((w, i) => (
                                        <div key={i} className="dxf-warning">⚠ {w}</div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── STEP 3: Preview ── */}
                    {step === 'preview' && preview && (
                        <div className="dxf-preview">
                            <div className="dxf-preview-stats">
                                <div className="dxf-stat">
                                    <span className="dxf-stat-icon">⬡</span>
                                    <span className="dxf-stat-label">
                                        {tr ? 'Sınır Noktaları' : 'Boundary Vertices'}
                                    </span>
                                    <span className="dxf-stat-value">{preview.vertices.length}</span>
                                </div>
                                <div className="dxf-stat">
                                    <span className="dxf-stat-icon">🔴</span>
                                    <span className="dxf-stat-label">
                                        {tr ? 'Kolon Sayısı' : 'Columns'}
                                    </span>
                                    <span className="dxf-stat-value">{preview.columnPositions.length}</span>
                                </div>
                                <div className="dxf-stat">
                                    <span className="dxf-stat-icon">🔒</span>
                                    <span className="dxf-stat-label">
                                        {tr ? 'Kapalı Poligon' : 'Closed Polygon'}
                                    </span>
                                    <span className="dxf-stat-value">
                                        {preview.isClosed ? (tr ? 'Evet' : 'Yes') : (tr ? 'Hayır' : 'No')}
                                    </span>
                                </div>
                            </div>

                            {/* Coordinate preview table */}
                            {preview.vertices.length > 0 && (
                                <div className="dxf-coord-preview">
                                    <div className="dxf-coord-title">
                                        {tr ? 'Sınır Koordinatları (ilk 8)' : 'Boundary Coordinates (first 8)'}
                                    </div>
                                    <table className="dxf-coord-table">
                                        <thead>
                                            <tr><th>#</th><th>X (m)</th><th>Y (m)</th></tr>
                                        </thead>
                                        <tbody>
                                            {preview.vertices.slice(0, 8).map((v, i) => (
                                                <tr key={i}>
                                                    <td>{i + 1}</td>
                                                    <td>{fmtNum(v.x, 3)}</td>
                                                    <td>{fmtNum(v.y, 3)}</td>
                                                </tr>
                                            ))}
                                            {preview.vertices.length > 8 && (
                                                <tr>
                                                    <td colSpan={3} style={{ textAlign: 'center', opacity: 0.5 }}>
                                                        … +{preview.vertices.length - 8} {tr ? 'nokta daha' : 'more vertices'}
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            <div className="dxf-import-note">
                                {tr
                                    ? '⚠️ Mevcut çizim verisi silinecek ve DXF verileri yüklenecek.'
                                    : '⚠️ Existing drawing data will be replaced with DXF data.'}
                            </div>
                        </div>
                    )}

                    {/* Error */}
                    {parseError && (
                        <div className="dxf-error">❌ {parseError}</div>
                    )}
                </div>

                {/* Footer actions */}
                <div className="dxf-modal-footer">
                    <button className="dxf-btn dxf-btn-ghost" onClick={onClose}>
                        {tr ? 'İptal' : 'Cancel'}
                    </button>

                    {step === 'configure' && (
                        <>
                            <button className="dxf-btn dxf-btn-ghost"
                                onClick={() => setStep('upload')}>
                                {tr ? 'Geri' : 'Back'}
                            </button>
                            <button className="dxf-btn dxf-btn-primary"
                                onClick={buildPreview}
                                disabled={!boundaryLayer}>
                                {tr ? 'Önizle →' : 'Preview →'}
                            </button>
                        </>
                    )}

                    {step === 'preview' && (
                        <>
                            <button className="dxf-btn dxf-btn-ghost"
                                onClick={() => setStep('configure')}>
                                {tr ? 'Geri' : 'Back'}
                            </button>
                            <button className="dxf-btn dxf-btn-import"
                                onClick={handleImport}
                                disabled={!preview || preview.vertices.length === 0}>
                                {tr ? '✓ İçe Aktar' : '✓ Import'}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
