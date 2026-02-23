import { useState, useRef } from 'react';
import './SoilLayerEditor.css';

// ... (sabitler aynı kalıyor)

// Zemin tipi default değerleri (Mohr-Coulomb parametreleri)
const SOIL_DEFAULTS = {
    kum: { gamma: 17, phi: 35, cohesion: 5, elasticity: 30000, poisson: 0.25 },
    kil: { gamma: 18, phi: 15, cohesion: 80, elasticity: 25000, poisson: 0.3 },
    silt: { gamma: 19, phi: 28, cohesion: 10, elasticity: 35000, poisson: 0.25 },
    kaya: { gamma: 22, phi: 15, cohesion: 3000, elasticity: 300000, poisson: 0.2 },
    cakil: { gamma: 20, phi: 40, cohesion: 0, elasticity: 50000, poisson: 0.2 }
};

// Zemin renkleri
const SOIL_COLORS = {
    kum: { bg: 'linear-gradient(135deg, #f4d03f 0%, #c9a227 100%)', border: '#b8860b' },
    kil: { bg: 'linear-gradient(135deg, #a0522d 0%, #8b4513 100%)', border: '#6b3410' },
    silt: { bg: 'linear-gradient(135deg, #9e9e9e 0%, #757575 100%)', border: '#616161' },
    kaya: { bg: 'linear-gradient(135deg, #607d8b 0%, #455a64 100%)', border: '#37474f' },
    cakil: { bg: 'linear-gradient(135deg, #78909c 0%, #546e7a 100%)', border: '#455a64' }
};

const SOIL_TYPES = ['kum', 'kil', 'silt', 'kaya', 'cakil'];

function SoilLayerEditor({ layers, onChange, translations, lang }) {
    const t = translations;
    const MAX_DEPTH = 30; // maksimum 30 metre
    const MIN_VISUAL_HEIGHT = 40; // minimum piksel yüksekliği
    const MAX_VISUAL_HEIGHT = 400; // maksimum toplam görsel yükseklik

    // Seçili tabaka
    const [selectedLayerId, setSelectedLayerId] = useState(layers[0]?.id || null);

    // Drag & Drop referansları
    const dragItem = useRef(null);
    const dragOverItem = useRef(null);

    // Toplam kalınlığı hesapla
    const totalThickness = layers.reduce((sum, layer) => sum + (parseFloat(layer.thickness) || 0), 0);
    const isOverLimit = totalThickness > MAX_DEPTH;

    // Seçili tabakayı bul
    const selectedLayer = layers.find(l => l.id === selectedLayerId);

    // Zemin tipi ismini çevir
    const getSoilTypeName = (type) => {
        const names = {
            en: { kum: 'Sand', kil: 'Clay', silt: 'Silt', kaya: 'Rock', cakil: 'Gravel' },
            tr: { kum: 'Kum', kil: 'Kil', silt: 'Silt', kaya: 'Kaya', cakil: 'Çakıl' }
        };
        return names[lang]?.[type] || type;
    };

    // Tabaka yüksekliğini hesapla (orantılı)
    const getLayerHeight = (thickness) => {
        if (totalThickness === 0) return MIN_VISUAL_HEIGHT;
        const ratio = thickness / Math.max(totalThickness, 10);
        const height = ratio * MAX_VISUAL_HEIGHT;
        return Math.max(MIN_VISUAL_HEIGHT, height);
    };

    // Yeni tabaka ekle
    const addLayer = () => {
        const newLayer = {
            id: `layer-${Date.now()}`,
            thickness: 5,
            soilType: 'kil',
            ...SOIL_DEFAULTS.kil
        };
        onChange([...layers, newLayer]);
        setSelectedLayerId(newLayer.id);
    };

    // Tabaka sil
    const removeLayer = (id) => {
        if (layers.length <= 1) return;
        const newLayers = layers.filter(layer => layer.id !== id);
        onChange(newLayers);
        if (selectedLayerId === id) {
            setSelectedLayerId(newLayers[0]?.id || null);
        }
    };

    // Tabaka güncelle
    const updateLayer = (id, field, value) => {
        onChange(layers.map(layer => {
            if (layer.id !== id) return layer;

            // Zemin tipi değiştiğinde default değerleri uygula
            if (field === 'soilType' && SOIL_DEFAULTS[value]) {
                return {
                    ...layer,
                    soilType: value,
                    ...SOIL_DEFAULTS[value]
                };
            }

            return { ...layer, [field]: value };
        }));
    };

    // Drag start
    const onDragStart = (e, index) => {
        dragItem.current = index;
        e.dataTransfer.effectAllowed = "move";
        // Ghost image'ı şeffaflaştırmak için stil eklenebilir ama şu an basit tutalım
    };

    // Drag enter - hedefi güncelle
    const onDragEnter = (e, index) => {
        dragOverItem.current = index;
    };

    // Drag end - sıralamayı değiştir
    const onDragEnd = () => {
        const copyListItems = [...layers];
        const dragItemContent = copyListItems[dragItem.current];

        // Listeden çıkar ve yeni yerine ekle
        copyListItems.splice(dragItem.current, 1);
        copyListItems.splice(dragOverItem.current, 0, dragItemContent);

        // State güncelle
        dragItem.current = null;
        dragOverItem.current = null;
        onChange(copyListItems);
    };

    // Drag over - varsayılan davranışı engelle (drop'a izin ver)
    const onDragOver = (e) => {
        e.preventDefault();
    };

    // Derinlik aralığını hesapla
    const getDepthRange = (index) => {
        const startDepth = layers.slice(0, index).reduce((sum, l) => sum + (parseFloat(l.thickness) || 0), 0);
        const endDepth = startDepth + (parseFloat(layers[index].thickness) || 0);
        return { start: startDepth.toFixed(1), end: endDepth.toFixed(1) };
    };

    return (
        <div className="soil-layer-editor-v2">
            {/* Üst bilgi çubuğu */}
            <div className="soil-header-v2">
                <div className="depth-indicator">
                    <span className="depth-label">{t.totalDepth}:</span>
                    <span className={`depth-value ${isOverLimit ? 'over-limit' : ''}`}>
                        {totalThickness.toFixed(1)} m / {MAX_DEPTH} m
                    </span>
                </div>
                <button className="add-layer-btn-v2" onClick={addLayer} title={t.addLayer}>
                    + {t.addLayer}
                </button>
            </div>

            {isOverLimit && (
                <div className="depth-warning">
                    ⚠️ {t.depthWarning}
                </div>
            )}

            {/* Ana içerik - Sol: Parametreler, Sağ: Görsel */}
            <div className="soil-main-layout">
                {/* Sol Panel - Parametre Düzenleme */}
                <div className="param-panel">
                    {selectedLayer ? (
                        <>
                            <div className="param-header">
                                <h3>{t.layer} {layers.findIndex(l => l.id === selectedLayerId) + 1}</h3>
                                <span className="param-soil-type">{getSoilTypeName(selectedLayer.soilType)}</span>
                                {layers.length > 1 && (
                                    <button
                                        className="remove-layer-btn-v2"
                                        onClick={() => removeLayer(selectedLayerId)}
                                        title={t.removeLayer}
                                    >
                                        🗑️
                                    </button>
                                )}
                            </div>

                            {/* Temel Bilgiler */}
                            <div className="param-section">
                                <div className="param-row">
                                    <label>{t.thickness}</label>
                                    <div className="param-input-group">
                                        <input
                                            type="number"
                                            value={selectedLayer.thickness}
                                            onChange={(e) => updateLayer(selectedLayerId, 'thickness', parseFloat(e.target.value) || 0)}
                                            min={0.5}
                                            max={30}
                                            step={0.5}
                                        />
                                        <span className="unit">m</span>
                                    </div>
                                </div>

                                <div className="param-row">
                                    <label>{t.soilType}</label>
                                    <select
                                        value={selectedLayer.soilType}
                                        onChange={(e) => updateLayer(selectedLayerId, 'soilType', e.target.value)}
                                    >
                                        {SOIL_TYPES.map(type => (
                                            <option key={type} value={type}>
                                                {getSoilTypeName(type)}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Mohr-Coulomb Parametreleri */}
                            <div className="param-section">
                                <h4>Mohr-Coulomb</h4>

                                <div className="param-row">
                                    <label>γ <span className="param-desc">({t.gamma})</span></label>
                                    <div className="param-input-group">
                                        <input
                                            type="number"
                                            value={selectedLayer.gamma}
                                            onChange={(e) => updateLayer(selectedLayerId, 'gamma', parseFloat(e.target.value) || 0)}
                                            min={10}
                                            max={30}
                                            step={0.5}
                                        />
                                        <span className="unit">kN/m³</span>
                                    </div>
                                </div>

                                <div className="param-row">
                                    <label>φ <span className="param-desc">({t.phi})</span></label>
                                    <div className="param-input-group">
                                        <input
                                            type="number"
                                            value={selectedLayer.phi}
                                            onChange={(e) => updateLayer(selectedLayerId, 'phi', parseFloat(e.target.value) || 0)}
                                            min={0}
                                            max={45}
                                            step={1}
                                        />
                                        <span className="unit">°</span>
                                    </div>
                                </div>

                                <div className="param-row">
                                    <label>c <span className="param-desc">({t.cohesion})</span></label>
                                    <div className="param-input-group">
                                        <input
                                            type="number"
                                            value={selectedLayer.cohesion}
                                            onChange={(e) => updateLayer(selectedLayerId, 'cohesion', parseFloat(e.target.value) || 0)}
                                            min={0}
                                            max={5000}
                                            step={5}
                                        />
                                        <span className="unit">kPa</span>
                                    </div>
                                </div>

                                <div className="param-row">
                                    <label>E <span className="param-desc">({t.elasticity})</span></label>
                                    <div className="param-input-group">
                                        <input
                                            type="number"
                                            value={selectedLayer.elasticity}
                                            onChange={(e) => updateLayer(selectedLayerId, 'elasticity', parseFloat(e.target.value) || 0)}
                                            min={1000}
                                            max={500000}
                                            step={1000}
                                        />
                                        <span className="unit">kN/m²</span>
                                    </div>
                                </div>

                                <div className="param-row">
                                    <label>ν <span className="param-desc">({t.poisson})</span></label>
                                    <div className="param-input-group">
                                        <input
                                            type="number"
                                            value={selectedLayer.poisson}
                                            onChange={(e) => updateLayer(selectedLayerId, 'poisson', parseFloat(e.target.value) || 0)}
                                            min={0.1}
                                            max={0.5}
                                            step={0.05}
                                        />
                                        <span className="unit">-</span>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="no-selection">
                            <p>👆 Bir tabaka seçin</p>
                        </div>
                    )}
                </div>

                {/* Sağ Panel - Görsel İzdüşüm */}
                <div className="visual-panel">
                    <div className="ground-surface">
                        <span>Zemin Yüzeyi (0.0 m)</span>
                    </div>
                    <div className="layers-visual-stack">
                        {layers.map((layer, index) => {
                            const depthRange = getDepthRange(index);
                            const colors = SOIL_COLORS[layer.soilType] || SOIL_COLORS.kil;
                            const isSelected = layer.id === selectedLayerId;

                            return (
                                <div
                                    key={layer.id}
                                    className={`layer-visual ${isSelected ? 'selected' : ''}`}
                                    style={{
                                        height: `${getLayerHeight(layer.thickness)}px`,
                                        background: colors.bg,
                                        borderColor: isSelected ? '#4fc3f7' : colors.border
                                    }}
                                    onClick={() => setSelectedLayerId(layer.id)}
                                    // Sürükle-Bırak Özellikleri
                                    draggable
                                    onDragStart={(e) => onDragStart(e, index)}
                                    onDragEnter={(e) => onDragEnter(e, index)}
                                    onDragEnd={onDragEnd}
                                    onDragOver={onDragOver}
                                >
                                    <div className="layer-visual-content">
                                        <span className="layer-name">{getSoilTypeName(layer.soilType)}</span>
                                        <span className="layer-thickness">{layer.thickness} m</span>
                                    </div>
                                    <div className="layer-depth-marker">
                                        {depthRange.end} m
                                    </div>
                                    <div className="drag-handle" title="Sürükle ve Sırala">
                                        ⋮⋮
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default SoilLayerEditor;
