import { useRef, useEffect, useState, useCallback } from 'react';
import './PlanView.css';

// ── Geometry helpers ──
function pointInPolygon(px, py, verts) {
    let inside = false;
    for (let i = 0, j = verts.length - 1; i < verts.length; j = i++) {
        const xi = verts[i].x, yi = verts[i].y;
        const xj = verts[j].x, yj = verts[j].y;
        if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) {
            inside = !inside;
        }
    }
    return inside;
}

function polygonArea(verts) {
    let area = 0;
    for (let i = 0; i < verts.length; i++) {
        const j = (i + 1) % verts.length;
        area += verts[i].x * verts[j].y;
        area -= verts[j].x * verts[i].y;
    }
    return Math.abs(area) / 2;
}

function polygonPerimeter(verts) {
    let p = 0;
    for (let i = 0; i < verts.length; i++) {
        const j = (i + 1) % verts.length;
        const dx = verts[j].x - verts[i].x;
        const dy = verts[j].y - verts[i].y;
        p += Math.sqrt(dx * dx + dy * dy);
    }
    return p;
}

function polygonBounds(verts) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    verts.forEach(v => {
        if (v.x < minX) minX = v.x;
        if (v.y < minY) minY = v.y;
        if (v.x > maxX) maxX = v.x;
        if (v.y > maxY) maxY = v.y;
    });
    return { minX, minY, maxX, maxY };
}

// ── PlanView Component ──
function PlanView({ parameters, lang, onParameterChange }) {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);

    // Drawing state
    const [vertices, setVertices] = useState([]);
    const [isClosed, setIsClosed] = useState(false);
    const [drawingMode, setDrawingMode] = useState('draw'); // draw | rectangle | select
    const [selectedVertex, setSelectedVertex] = useState(null);
    const [hoveredVertex, setHoveredVertex] = useState(null);
    const [isDragging, setIsDragging] = useState(false);

    // Rectangle mode helpers
    const [rectStart, setRectStart] = useState(null);

    // Camera
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [isPanning, setIsPanning] = useState(false);
    const panStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

    // Grid snap
    const [gridSnap, setGridSnap] = useState(true);
    const SNAP_SIZE = 1; // 1m

    // Mouse position in world coords
    const [mouseWorld, setMouseWorld] = useState({ x: 0, y: 0 });

    // Params
    const D = parseFloat(parameters.D) || 0.6;
    const s = parseFloat(parameters.s) || 1.6;

    const tr = lang === 'tr';

    // ── Coordinate conversions ──
    const getCanvasMetrics = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();
        const W = rect.width;
        const H = rect.height;
        // 1m = basePpm pixels at zoom=1
        const basePpm = 20;
        const ppm = basePpm * zoom;
        // Center of canvas is world origin (0,0) + pan offset
        const cx = W / 2 + pan.x;
        const cy = H / 2 + pan.y;
        return { W, H, ppm, cx, cy, rect };
    }, [zoom, pan]);

    const worldToScreen = useCallback((wx, wy, metrics) => {
        const { ppm, cx, cy } = metrics;
        return { x: cx + wx * ppm, y: cy - wy * ppm }; // Y flipped
    }, []);

    const screenToWorld = useCallback((sx, sy, metrics) => {
        const { ppm, cx, cy } = metrics;
        return { x: (sx - cx) / ppm, y: -(sy - cy) / ppm }; // Y flipped
    }, []);

    const snapToGrid = useCallback((val) => {
        if (!gridSnap) return val;
        return Math.round(val / SNAP_SIZE) * SNAP_SIZE;
    }, [gridSnap]);

    // ── Compute jet grout columns ──
    const computeColumns = useCallback((verts) => {
        if (verts.length < 3) return [];
        const bounds = polygonBounds(verts);
        const cols = [];
        const startX = Math.ceil(bounds.minX / s) * s;
        const startY = Math.ceil(bounds.minY / s) * s;
        for (let x = startX; x <= bounds.maxX; x += s) {
            for (let y = startY; y <= bounds.maxY; y += s) {
                if (pointInPolygon(x, y, verts)) {
                    cols.push({ x, y });
                }
            }
        }
        return cols;
    }, [s]);

    // ── Draw ──
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const metrics = getCanvasMetrics();
        if (!metrics) return;

        const dpr = window.devicePixelRatio || 1;
        const { W, H, ppm, rect } = metrics;
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);

        // ── Background ──
        ctx.fillStyle = '#0d1117';
        ctx.fillRect(0, 0, W, H);

        // ── Grid ──
        const gridPx = ppm * SNAP_SIZE;
        if (gridPx > 4) {
            // Determine visible world bounds
            const topLeft = screenToWorld(0, 0, metrics);
            const bottomRight = screenToWorld(W, H, metrics);
            const worldLeft = Math.floor(topLeft.x / SNAP_SIZE) * SNAP_SIZE;
            const worldRight = Math.ceil(bottomRight.x / SNAP_SIZE) * SNAP_SIZE;
            const worldTop = Math.floor(bottomRight.y / SNAP_SIZE) * SNAP_SIZE;
            const worldBottom = Math.ceil(topLeft.y / SNAP_SIZE) * SNAP_SIZE;

            // Minor grid
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
            ctx.lineWidth = 0.5;
            for (let wx = worldLeft; wx <= worldRight; wx += SNAP_SIZE) {
                const p = worldToScreen(wx, 0, metrics);
                ctx.beginPath();
                ctx.moveTo(p.x, 0);
                ctx.lineTo(p.x, H);
                ctx.stroke();
            }
            for (let wy = worldTop; wy <= worldBottom; wy += SNAP_SIZE) {
                const p = worldToScreen(0, wy, metrics);
                ctx.beginPath();
                ctx.moveTo(0, p.y);
                ctx.lineTo(W, p.y);
                ctx.stroke();
            }

            // Major grid (every 5m)
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
            ctx.lineWidth = 0.8;
            for (let wx = Math.floor(worldLeft / 5) * 5; wx <= worldRight; wx += 5) {
                const p = worldToScreen(wx, 0, metrics);
                ctx.beginPath();
                ctx.moveTo(p.x, 0);
                ctx.lineTo(p.x, H);
                ctx.stroke();
            }
            for (let wy = Math.floor(worldTop / 5) * 5; wy <= worldBottom; wy += 5) {
                const p = worldToScreen(0, wy, metrics);
                ctx.beginPath();
                ctx.moveTo(0, p.y);
                ctx.lineTo(W, p.y);
                ctx.stroke();
            }
        }

        // ── Origin axes ──
        const o = worldToScreen(0, 0, metrics);
        ctx.strokeStyle = 'rgba(255, 80, 80, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(o.x, 0); ctx.lineTo(o.x, H); ctx.stroke();
        ctx.strokeStyle = 'rgba(80, 255, 80, 0.3)';
        ctx.beginPath(); ctx.moveTo(0, o.y); ctx.lineTo(W, o.y); ctx.stroke();

        // ── Grid labels along axes ──
        const topLeft2 = screenToWorld(0, 0, metrics);
        const bottomRight2 = screenToWorld(W, H, metrics);
        ctx.font = '10px Inter, system-ui, sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        const labelStep = gridPx > 30 ? SNAP_SIZE : (gridPx > 15 ? 5 : 10);
        for (let wx = Math.floor(topLeft2.x / labelStep) * labelStep; wx <= bottomRight2.x; wx += labelStep) {
            if (wx === 0) continue;
            const p = worldToScreen(wx, 0, metrics);
            if (p.x > 25 && p.x < W - 10) {
                ctx.fillText(`${wx}`, p.x, o.y + 4);
            }
        }
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        for (let wy = Math.floor(bottomRight2.y / labelStep) * labelStep; wy <= topLeft2.y; wy += labelStep) {
            if (wy === 0) continue;
            const p = worldToScreen(0, wy, metrics);
            if (p.y > 10 && p.y < H - 10) {
                ctx.fillText(`${wy}`, o.x - 6, p.y);
            }
        }

        // ── Polygon fill ──
        if (isClosed && vertices.length >= 3) {
            ctx.beginPath();
            const p0 = worldToScreen(vertices[0].x, vertices[0].y, metrics);
            ctx.moveTo(p0.x, p0.y);
            for (let i = 1; i < vertices.length; i++) {
                const p = worldToScreen(vertices[i].x, vertices[i].y, metrics);
                ctx.lineTo(p.x, p.y);
            }
            ctx.closePath();
            ctx.fillStyle = 'rgba(255, 152, 0, 0.08)';
            ctx.fill();
        }

        // ── Polygon edges ──
        if (vertices.length >= 2) {
            ctx.strokeStyle = '#ff9800';
            ctx.lineWidth = 2;
            ctx.setLineDash([]);
            ctx.beginPath();
            const p0 = worldToScreen(vertices[0].x, vertices[0].y, metrics);
            ctx.moveTo(p0.x, p0.y);
            for (let i = 1; i < vertices.length; i++) {
                const p = worldToScreen(vertices[i].x, vertices[i].y, metrics);
                ctx.lineTo(p.x, p.y);
            }
            if (isClosed) ctx.closePath();
            ctx.stroke();
        }

        // ── Preview line from last vertex to mouse ──
        if (!isClosed && vertices.length > 0 && drawingMode === 'draw') {
            const lastV = vertices[vertices.length - 1];
            const pLast = worldToScreen(lastV.x, lastV.y, metrics);
            const pMouse = worldToScreen(mouseWorld.x, mouseWorld.y, metrics);
            ctx.strokeStyle = 'rgba(255, 152, 0, 0.4)';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([6, 4]);
            ctx.beginPath();
            ctx.moveTo(pLast.x, pLast.y);
            ctx.lineTo(pMouse.x, pMouse.y);
            ctx.stroke();
            ctx.setLineDash([]);

            // If near the first vertex, show close indicator
            if (vertices.length >= 3) {
                const p0 = worldToScreen(vertices[0].x, vertices[0].y, metrics);
                const dist = Math.hypot(pMouse.x - p0.x, pMouse.y - p0.y);
                if (dist < 15) {
                    ctx.beginPath();
                    ctx.arc(p0.x, p0.y, 12, 0, Math.PI * 2);
                    ctx.strokeStyle = '#4caf50';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                }
            }
        }

        // ── Rectangle preview ──
        if (drawingMode === 'rectangle' && rectStart && !isClosed) {
            const pS = worldToScreen(rectStart.x, rectStart.y, metrics);
            const pM = worldToScreen(mouseWorld.x, mouseWorld.y, metrics);
            ctx.strokeStyle = 'rgba(255, 152, 0, 0.5)';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([6, 4]);
            ctx.strokeRect(
                Math.min(pS.x, pM.x), Math.min(pS.y, pM.y),
                Math.abs(pM.x - pS.x), Math.abs(pM.y - pS.y)
            );
            ctx.setLineDash([]);
        }

        // ── Jet grout columns ──
        if (isClosed && vertices.length >= 3) {
            const cols = computeColumns(vertices);
            const colR = (D / 2) * ppm;

            cols.forEach(({ x, y }) => {
                const p = worldToScreen(x, y, metrics);

                // Shadow
                ctx.beginPath();
                ctx.arc(p.x + 1, p.y + 1, colR, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
                ctx.fill();

                // Gradient fill
                const grad = ctx.createRadialGradient(p.x - colR * 0.3, p.y - colR * 0.3, colR * 0.1, p.x, p.y, colR);
                grad.addColorStop(0, 'rgba(220, 60, 60, 0.9)');
                grad.addColorStop(0.6, 'rgba(180, 40, 40, 0.8)');
                grad.addColorStop(1, 'rgba(140, 25, 25, 0.65)');
                ctx.beginPath();
                ctx.arc(p.x, p.y, colR, 0, Math.PI * 2);
                ctx.fillStyle = grad;
                ctx.fill();

                // Border
                ctx.strokeStyle = 'rgba(255, 90, 90, 0.85)';
                ctx.lineWidth = 0.8;
                ctx.stroke();

                // Center dot
                ctx.beginPath();
                ctx.arc(p.x, p.y, 1.2, 0, Math.PI * 2);
                ctx.fillStyle = '#fff';
                ctx.fill();
            });
        }

        // ── Edge dimension labels ──
        if (vertices.length >= 2) {
            const edgeCount = isClosed ? vertices.length : vertices.length - 1;
            ctx.font = 'bold 11px Inter, system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            for (let i = 0; i < edgeCount; i++) {
                const j = (i + 1) % vertices.length;
                const v1 = vertices[i], v2 = vertices[j];
                const len = Math.hypot(v2.x - v1.x, v2.y - v1.y);
                const midScreen = worldToScreen((v1.x + v2.x) / 2, (v1.y + v2.y) / 2, metrics);
                const dx = v2.x - v1.x, dy = v2.y - v1.y;
                const nx = -dy / len, ny = dx / len;
                const offset = 14;
                const lx = midScreen.x + nx * offset;
                const ly = midScreen.y - ny * offset;

                // Background pill
                const text = `${len.toFixed(1)}m`;
                const tw = ctx.measureText(text).width + 8;
                ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                ctx.beginPath();
                ctx.roundRect(lx - tw / 2, ly - 8, tw, 16, 4);
                ctx.fill();
                ctx.fillStyle = '#ffcc80';
                ctx.fillText(text, lx, ly);
            }
        }

        // ── Vertex handles ──
        vertices.forEach((v, i) => {
            const p = worldToScreen(v.x, v.y, metrics);
            const isHovered = hoveredVertex === i;
            const isSelected = selectedVertex === i;
            const r = isHovered || isSelected ? 7 : 5;

            // Glow
            if (isHovered || isSelected) {
                ctx.beginPath();
                ctx.arc(p.x, p.y, r + 4, 0, Math.PI * 2);
                ctx.fillStyle = isSelected ? 'rgba(76, 175, 80, 0.25)' : 'rgba(255, 152, 0, 0.2)';
                ctx.fill();
            }

            // Handle
            ctx.beginPath();
            ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
            ctx.fillStyle = i === 0 ? '#4caf50' : '#ff9800';
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Index label
            if (ppm > 12) {
                ctx.font = 'bold 9px Inter, system-ui, sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = '#fff';
                ctx.fillText(`${i + 1}`, p.x, p.y - r - 8);
            }
        });

    }, [vertices, isClosed, drawingMode, mouseWorld, hoveredVertex, selectedVertex, zoom, pan, D, s, rectStart, computeColumns, getCanvasMetrics, screenToWorld, worldToScreen]);

    // ── Resize observer ──
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        const ro = new ResizeObserver(() => {
            // Force re-render by updating a dummy state — just re-trigger the draw effect
            setVertices(v => [...v]);
        });
        ro.observe(container);
        return () => ro.disconnect();
    }, []);

    // ── Find vertex near screen position ──
    const findVertex = useCallback((sx, sy) => {
        const metrics = getCanvasMetrics();
        if (!metrics) return -1;
        for (let i = 0; i < vertices.length; i++) {
            const p = worldToScreen(vertices[i].x, vertices[i].y, metrics);
            if (Math.hypot(p.x - sx, p.y - sy) < 12) return i;
        }
        return -1;
    }, [vertices, getCanvasMetrics, worldToScreen]);

    // ── Mouse handlers ──
    const handleMouseDown = useCallback((e) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const sx = e.clientX - rect.left;
        const sy = e.clientY - rect.top;
        const metrics = getCanvasMetrics();
        if (!metrics) return;

        // Middle mouse -> pan
        if (e.button === 1) {
            e.preventDefault();
            setIsPanning(true);
            panStartRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
            return;
        }

        // Right click -> undo last vertex
        if (e.button === 2) {
            e.preventDefault();
            if (!isClosed && vertices.length > 0 && drawingMode === 'draw') {
                setVertices(v => v.slice(0, -1));
            }
            return;
        }

        // Left click
        if (e.button === 0) {
            if (drawingMode === 'select') {
                const vi = findVertex(sx, sy);
                if (vi >= 0) {
                    setSelectedVertex(vi);
                    setIsDragging(true);
                } else {
                    setSelectedVertex(null);
                }
            } else if (drawingMode === 'draw') {
                if (isClosed) return;
                const world = screenToWorld(sx, sy, metrics);
                const wx = snapToGrid(world.x);
                const wy = snapToGrid(world.y);

                // Check if clicking near first vertex to close
                if (vertices.length >= 3) {
                    const p0 = worldToScreen(vertices[0].x, vertices[0].y, metrics);
                    if (Math.hypot(sx - p0.x, sy - p0.y) < 15) {
                        setIsClosed(true);
                        return;
                    }
                }
                setVertices(v => [...v, { x: wx, y: wy }]);
            } else if (drawingMode === 'rectangle') {
                if (isClosed) return;
                const world = screenToWorld(sx, sy, metrics);
                const wx = snapToGrid(world.x);
                const wy = snapToGrid(world.y);
                if (!rectStart) {
                    setRectStart({ x: wx, y: wy });
                } else {
                    // Create rectangle from two corners
                    const x1 = Math.min(rectStart.x, wx);
                    const y1 = Math.min(rectStart.y, wy);
                    const x2 = Math.max(rectStart.x, wx);
                    const y2 = Math.max(rectStart.y, wy);
                    if (Math.abs(x2 - x1) > 0.1 && Math.abs(y2 - y1) > 0.1) {
                        setVertices([
                            { x: x1, y: y1 },
                            { x: x2, y: y1 },
                            { x: x2, y: y2 },
                            { x: x1, y: y2 }
                        ]);
                        setIsClosed(true);
                    }
                    setRectStart(null);
                }
            }
        }
    }, [drawingMode, isClosed, vertices, pan, rectStart, findVertex, getCanvasMetrics, screenToWorld, snapToGrid, worldToScreen]);

    const handleMouseMove = useCallback((e) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const sx = e.clientX - rect.left;
        const sy = e.clientY - rect.top;
        const metrics = getCanvasMetrics();
        if (!metrics) return;

        // Pan
        if (isPanning) {
            const dx = e.clientX - panStartRef.current.x;
            const dy = e.clientY - panStartRef.current.y;
            setPan({ x: panStartRef.current.panX + dx, y: panStartRef.current.panY + dy });
            return;
        }

        // Drag vertex
        if (isDragging && selectedVertex !== null) {
            const world = screenToWorld(sx, sy, metrics);
            const wx = snapToGrid(world.x);
            const wy = snapToGrid(world.y);
            setVertices(v => {
                const nv = [...v];
                nv[selectedVertex] = { x: wx, y: wy };
                return nv;
            });
            return;
        }

        // Update mouse world coord
        const world = screenToWorld(sx, sy, metrics);
        const wx = snapToGrid(world.x);
        const wy = snapToGrid(world.y);
        setMouseWorld({ x: wx, y: wy });

        // Hover detection
        const vi = findVertex(sx, sy);
        setHoveredVertex(vi >= 0 ? vi : null);
    }, [isPanning, isDragging, selectedVertex, findVertex, getCanvasMetrics, screenToWorld, snapToGrid]);

    const handleMouseUp = useCallback(() => {
        setIsPanning(false);
        setIsDragging(false);
    }, []);

    const handleWheel = useCallback((e) => {
        e.preventDefault();
        const factor = e.deltaY < 0 ? 1.12 : 0.89;
        setZoom(z => Math.max(0.1, Math.min(50, z * factor)));
    }, []);

    const handleContextMenu = useCallback((e) => {
        e.preventDefault();
    }, []);

    // ── Toolbar actions ──
    const handleClear = () => {
        setVertices([]);
        setIsClosed(false);
        setSelectedVertex(null);
        setHoveredVertex(null);
        setRectStart(null);
    };

    const handleUndoLast = () => {
        if (isClosed) {
            setIsClosed(false);
        } else if (vertices.length > 0) {
            setVertices(v => v.slice(0, -1));
        }
    };

    const handleClose = () => {
        if (vertices.length >= 3 && !isClosed) {
            setIsClosed(true);
        }
    };

    const handleDeleteVertex = () => {
        if (selectedVertex !== null && vertices.length > 0) {
            const newVerts = vertices.filter((_, i) => i !== selectedVertex);
            setVertices(newVerts);
            setSelectedVertex(null);
            if (newVerts.length < 3) setIsClosed(false);
        }
    };

    const handleZoomFit = () => {
        if (vertices.length === 0) {
            setPan({ x: 0, y: 0 });
            setZoom(1);
            return;
        }
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const bounds = polygonBounds(vertices);
        const worldW = (bounds.maxX - bounds.minX) || 10;
        const worldH = (bounds.maxY - bounds.minY) || 10;
        const margin = 1.4;
        const zx = rect.width / (worldW * margin * 20);
        const zy = rect.height / (worldH * margin * 20);
        const newZoom = Math.min(zx, zy, 10);
        const centerX = (bounds.minX + bounds.maxX) / 2;
        const centerY = (bounds.minY + bounds.maxY) / 2;
        setPan({ x: -centerX * 20 * newZoom, y: centerY * 20 * newZoom });
        setZoom(newZoom);
    };

    // ── Computed info ──
    const area = isClosed && vertices.length >= 3 ? polygonArea(vertices) : 0;
    const perimeter = isClosed && vertices.length >= 3 ? polygonPerimeter(vertices) : 0;
    const columns = isClosed && vertices.length >= 3 ? computeColumns(vertices) : [];
    const totalColumns = columns.length;
    const Ajet = Math.PI * (D / 2) ** 2;
    const Ar = area > 0 ? (totalColumns * Ajet / area) * 100 : 0;

    return (
        <div className="plan-view-fullscreen-wrapper">
            <div className="plan-view-header">
                <h3>{tr ? '✏️ Jet Grout Yerleşim Planı (İnteraktif Çizim)' : '✏️ Jet Grout Layout Plan (Interactive Drawing)'}</h3>

                {/* Toolbar */}
                <div className="plan-toolbar">
                    <div className="toolbar-group">
                        <button
                            className={`toolbar-btn ${drawingMode === 'draw' ? 'active' : ''}`}
                            onClick={() => { setDrawingMode('draw'); setRectStart(null); }}
                            title={tr ? 'Çiz — Tıklayarak köşe ekle' : 'Draw — Click to add vertices'}
                        >
                            ✏️ {tr ? 'Çiz' : 'Draw'}
                        </button>
                        <button
                            className={`toolbar-btn ${drawingMode === 'rectangle' ? 'active' : ''}`}
                            onClick={() => { setDrawingMode('rectangle'); setRectStart(null); }}
                            title={tr ? 'Dikdörtgen — 2 tıkla dikdörtgen oluştur' : 'Rectangle — 2 clicks to create'}
                        >
                            🔲 {tr ? 'Dikdörtgen' : 'Rect'}
                        </button>
                        <button
                            className={`toolbar-btn ${drawingMode === 'select' ? 'active' : ''}`}
                            onClick={() => { setDrawingMode('select'); setRectStart(null); }}
                            title={tr ? 'Seç — Köşeleri sürükle' : 'Select — Drag vertices'}
                        >
                            ↕️ {tr ? 'Seç' : 'Select'}
                        </button>
                    </div>

                    <div className="toolbar-divider" />

                    <div className="toolbar-group">
                        <button className="toolbar-btn" onClick={handleClose} disabled={isClosed || vertices.length < 3}
                            title={tr ? 'Poligonu kapat' : 'Close polygon'}>
                            🔒 {tr ? 'Kapat' : 'Close'}
                        </button>
                        <button className="toolbar-btn" onClick={handleUndoLast} disabled={vertices.length === 0}
                            title={tr ? 'Son noktayı sil' : 'Undo last vertex'}>
                            ↩️ {tr ? 'Geri' : 'Undo'}
                        </button>
                        <button className="toolbar-btn" onClick={handleDeleteVertex} disabled={selectedVertex === null}
                            title={tr ? 'Seçili noktayı sil' : 'Delete selected vertex'}>
                            ❌ {tr ? 'Sil' : 'Del'}
                        </button>
                        <button className="toolbar-btn" onClick={handleClear}
                            title={tr ? 'Tümünü temizle' : 'Clear all'}>
                            🗑️ {tr ? 'Temizle' : 'Clear'}
                        </button>
                    </div>

                    <div className="toolbar-divider" />

                    <div className="toolbar-group">
                        <button className={`toolbar-btn ${gridSnap ? 'active' : ''}`} onClick={() => setGridSnap(g => !g)}
                            title={tr ? 'Izgaraya yapış' : 'Snap to grid'}>
                            🧲 Snap
                        </button>
                        <button className="toolbar-btn" onClick={handleZoomFit}
                            title={tr ? 'Sığdır' : 'Zoom to fit'}>
                            🔍 {tr ? 'Sığdır' : 'Fit'}
                        </button>
                    </div>

                    <div className="toolbar-divider" />

                    {/* Inline D and s controls */}
                    <div className="toolbar-group toolbar-params">
                        <div className="toolbar-param">
                            <label>{tr ? 'Çap' : 'D'}</label>
                            <input type="number" value={D} min={0.3} max={3.0} step={0.1}
                                onChange={(e) => onParameterChange && onParameterChange({ target: { name: 'D', value: e.target.value } })} />
                            <span>m</span>
                        </div>
                        <div className="toolbar-param">
                            <label>{tr ? 'Aralık' : 's'}</label>
                            <input type="number" value={s} min={0.5} max={10.0} step={0.1}
                                onChange={(e) => onParameterChange && onParameterChange({ target: { name: 's', value: e.target.value } })} />
                            <span>m</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Canvas */}
            <div className="plan-canvas-container" ref={containerRef}>
                <canvas
                    ref={canvasRef}
                    className={`plan-canvas ${drawingMode === 'draw' || drawingMode === 'rectangle' ? 'cursor-crosshair' : ''} ${drawingMode === 'select' ? (isDragging ? 'cursor-grabbing' : 'cursor-pointer') : ''} ${isPanning ? 'cursor-grabbing' : ''}`}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onWheel={handleWheel}
                    onContextMenu={handleContextMenu}
                />

                {/* Coordinate display */}
                <div className="plan-coord-display">
                    <span>X: {mouseWorld.x.toFixed(1)}m</span>
                    <span>Y: {mouseWorld.y.toFixed(1)}m</span>
                    <span className="coord-zoom">🔍 {(zoom * 100).toFixed(0)}%</span>
                </div>

                {/* Info overlay */}
                {isClosed && (
                    <div className="plan-info-overlay">
                        <div className="plan-info-item">
                            <span className="info-icon">📐</span>
                            <span className="info-label">{tr ? 'Alan' : 'Area'}</span>
                            <span className="info-value">{area.toFixed(1)} m²</span>
                        </div>
                        <div className="plan-info-item">
                            <span className="info-icon">📏</span>
                            <span className="info-label">{tr ? 'Çevre' : 'Perimeter'}</span>
                            <span className="info-value">{perimeter.toFixed(1)} m</span>
                        </div>
                        <div className="plan-info-item">
                            <span className="info-icon">🔴</span>
                            <span className="info-label">{tr ? 'Kolon' : 'Columns'}</span>
                            <span className="info-value">{totalColumns}</span>
                        </div>
                        <div className="plan-info-item">
                            <span className="info-icon">📊</span>
                            <span className="info-label">Ar</span>
                            <span className="info-value">{Ar.toFixed(1)}%</span>
                        </div>
                    </div>
                )}

                {/* Help hint */}
                {vertices.length === 0 && !isClosed && (
                    <div className="plan-help-hint">
                        {tr
                            ? '✏️ "Çiz" modunda canvas\'a tıklayarak poligon köşelerini yerleştirin. "Dikdörtgen" moduyla hızlı dikdörtgen çizin.'
                            : '✏️ Click on canvas in "Draw" mode to place polygon vertices. Use "Rect" mode for quick rectangles.'
                        }
                    </div>
                )}
            </div>
        </div>
    );
}

export default PlanView;
