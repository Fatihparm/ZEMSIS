import { useRef, useEffect, useState, useCallback } from 'react';
import SectionCutView from './SectionCutView';
import DxfImportModal from './DxfImportModal';
import './PlanView.css';

// ── Section line colors ──
const SECTION_COLORS = [
    '#ff9800', '#4caf50', '#ab47bc', '#ef5350', '#26c6da', '#fdd835'
];

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

// Generate section label from index: 0 → 'A-A', 1 → 'B-B', etc.
function sectionLabel(index) {
    const ch = String.fromCharCode(65 + (index % 26));
    return `${ch}-${ch}`;
}

// ── PlanView Component ──
function PlanView({ parameters, lang, onParameterChange, soilLayers, initialDrawingData, onDrawingDataChange, extraParams, openDxfModal, onDxfModalOpened }) {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const initializedRef = useRef(false);

    // Drawing state
    const [polygons, setPolygons] = useState(() => {
        if (initialDrawingData?.polygons) return initialDrawingData.polygons;
        if (initialDrawingData?.vertices?.length > 0) {
            return [{ id: 'poly-1', vertices: initialDrawingData.vertices, isClosed: initialDrawingData.isClosed || false }];
        }
        return [];
    });
    const [activePolygonId, setActivePolygonId] = useState(() => {
        if (initialDrawingData?.polygons?.length > 0) return initialDrawingData.polygons[0].id;
        if (initialDrawingData?.vertices?.length > 0) return 'poly-1';
        return null;
    });

    const activePolygon = polygons.find(p => p.id === activePolygonId) || polygons[0] || null;
    const vertices = activePolygon ? activePolygon.vertices : [];
    const isClosed = activePolygon ? activePolygon.isClosed : false;
    const [drawingMode, setDrawingMode] = useState('draw'); // draw | rectangle | select | section
    const [selectedVertex, setSelectedVertex] = useState(null);
    const [hoveredVertex, setHoveredVertex] = useState(null);
    const [isDragging, setIsDragging] = useState(false);

    // ── Column entity state ──
    const [columnPositions, setColumnPositions] = useState(() =>
        initialDrawingData?.columnPositions || []
    );
    const [columnsAutoSync, setColumnsAutoSync] = useState(() =>
        initialDrawingData?.columnsAutoSync !== undefined ? initialDrawingData.columnsAutoSync : true
    );
    const [selectedColumn, setSelectedColumn] = useState(null);
    const [isDraggingColumn, setIsDraggingColumn] = useState(false);
    const [hoveredColumn, setHoveredColumn] = useState(null);

    // Undo / Redo stacks
    const [undoStack, setUndoStack] = useState([]);
    const [redoStack, setRedoStack] = useState([]);

    // Rectangle mode helpers
    const [rectStart, setRectStart] = useState(null);

    // Section lines state
    const [sectionLines, setSectionLines] = useState(() =>
        initialDrawingData?.sectionLines || []
    );
    const [sectionStart, setSectionStart] = useState(null); // temp start point while drawing
    const [activeSectionId, setActiveSectionId] = useState(null);

    // DXF import modal
    const [showDxfModal, setShowDxfModal] = useState(false);

    // Open DXF modal from outside (e.g. home page button)
    useEffect(() => {
        if (openDxfModal) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setShowDxfModal(true);
            onDxfModalOpened && onDxfModalOpened();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [openDxfModal]);

    // Notify parent of drawing data changes (skip initial render)
    useEffect(() => {
        if (!initializedRef.current) {
            initializedRef.current = true;
            return;
        }
        if (onDrawingDataChange) {
            const processedPolygons = polygons.map(p => ({ ...p, vertices: p.vertices.map(v => ({ x: v.x, y: v.y })) }));
            onDrawingDataChange({
                polygons: processedPolygons,
                activePolygonId,
                // Backward compatibility
                vertices: processedPolygons.length > 0 ? processedPolygons[0].vertices : [],
                isClosed: processedPolygons.length > 0 ? processedPolygons[0].isClosed : false,
                sectionLines: sectionLines.map(sl => ({
                    id: sl.id,
                    start: { x: sl.start.x, y: sl.start.y },
                    end: { x: sl.end.x, y: sl.end.y },
                    label: sl.label
                })),
                columnPositions: columnPositions.map(c => ({ id: c.id, x: c.x, y: c.y })),
                columnsAutoSync,
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [polygons, activePolygonId, sectionLines, columnPositions, columnsAutoSync]);

    // Split view
    const [splitRatio, setSplitRatio] = useState(0.6); // 60% plan, 40% section
    const [isResizingSplit, setIsResizingSplit] = useState(false);

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

    // ── Undo/Redo helpers ──
    const pushUndo = useCallback(() => {
        setUndoStack(prev => [...prev, {
            polygons: polygons.map(p => ({ ...p, vertices: p.vertices.map(v => ({ ...v })) })),
            activePolygonId,
            sectionLines: sectionLines.map(sl => ({ ...sl, start: { ...sl.start }, end: { ...sl.end } })),
            columnPositions: columnPositions.map(c => ({ ...c })),
            columnsAutoSync,
        }]);
        setRedoStack([]);
    }, [polygons, activePolygonId, sectionLines, columnPositions, columnsAutoSync]);

    const handleUndo = useCallback(() => {
        if (undoStack.length === 0) return;
        const newStack = [...undoStack];
        const snapshot = newStack.pop();

        setRedoStack(r => [...r, {
            polygons: polygons.map(p => ({ ...p, vertices: p.vertices.map(v => ({ ...v })) })),
            activePolygonId,
            sectionLines: sectionLines.map(sl => ({ ...sl, start: { ...sl.start }, end: { ...sl.end } })),
            columnPositions: columnPositions.map(c => ({ ...c })),
            columnsAutoSync,
        }]);

        setUndoStack(newStack);
        if (snapshot.polygons) {
            setPolygons(snapshot.polygons);
            setActivePolygonId(snapshot.activePolygonId);
        } else if (snapshot.vertices) {
            setPolygons([{ id: 'poly-1', vertices: snapshot.vertices, isClosed: snapshot.isClosed }]);
            setActivePolygonId('poly-1');
        }
        setSectionLines(snapshot.sectionLines);
        if (snapshot.columnPositions !== undefined) setColumnPositions(snapshot.columnPositions);
        if (snapshot.columnsAutoSync !== undefined) setColumnsAutoSync(snapshot.columnsAutoSync);
        setSelectedVertex(null);
        setHoveredVertex(null);
        setSelectedColumn(null);
    }, [undoStack, polygons, activePolygonId, sectionLines, columnPositions, columnsAutoSync]);

    const handleRedo = useCallback(() => {
        if (redoStack.length === 0) return;
        const newStack = [...redoStack];
        const snapshot = newStack.pop();

        setUndoStack(u => [...u, {
            polygons: polygons.map(p => ({ ...p, vertices: p.vertices.map(v => ({ ...v })) })),
            activePolygonId,
            sectionLines: sectionLines.map(sl => ({ ...sl, start: { ...sl.start }, end: { ...sl.end } })),
            columnPositions: columnPositions.map(c => ({ ...c })),
            columnsAutoSync,
        }]);

        setRedoStack(newStack);
        if (snapshot.polygons) {
            setPolygons(snapshot.polygons);
            setActivePolygonId(snapshot.activePolygonId);
        } else if (snapshot.vertices) {
            setPolygons([{ id: 'poly-1', vertices: snapshot.vertices, isClosed: snapshot.isClosed }]);
            setActivePolygonId('poly-1');
        }
        setSectionLines(snapshot.sectionLines);
        if (snapshot.columnPositions !== undefined) setColumnPositions(snapshot.columnPositions);
        if (snapshot.columnsAutoSync !== undefined) setColumnsAutoSync(snapshot.columnsAutoSync);
        setSelectedVertex(null);
        setHoveredVertex(null);
        setSelectedColumn(null);
    }, [redoStack, polygons, activePolygonId, sectionLines, columnPositions, columnsAutoSync]);

    // ── Active section ──
    const activeSection = sectionLines.find(sl => sl.id === activeSectionId) || null;
    const activeSectionColor = activeSection
        ? SECTION_COLORS[sectionLines.indexOf(activeSection) % SECTION_COLORS.length]
        : '#ff9800';

    // ── Coordinate conversions ──
    const getCanvasMetrics = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();
        const W = rect.width;
        const H = rect.height;
        const basePpm = 20;
        const ppm = basePpm * zoom;
        const cx = W / 2 + pan.x;
        const cy = H / 2 + pan.y;
        return { W, H, ppm, cx, cy, rect };
    }, [zoom, pan]);

    const worldToScreen = useCallback((wx, wy, metrics) => {
        const { ppm, cx, cy } = metrics;
        return { x: cx + wx * ppm, y: cy - wy * ppm };
    }, []);

    const screenToWorld = useCallback((sx, sy, metrics) => {
        const { ppm, cx, cy } = metrics;
        return { x: (sx - cx) / ppm, y: -(sy - cy) / ppm };
    }, []);

    const snapToGrid = useCallback((val) => {
        if (!gridSnap) return val;
        return Math.round(val / SNAP_SIZE) * SNAP_SIZE;
    }, [gridSnap]);

    // ── Compute jet grout columns ──
    const computeColumns = useCallback((polys) => {
        const closedPolys = polys.filter(p => p.isClosed && p.vertices.length >= 3);
        if (closedPolys.length === 0) return [];

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        closedPolys.forEach(p => {
            const b = polygonBounds(p.vertices);
            if (b.minX < minX) minX = b.minX;
            if (b.minY < minY) minY = b.minY;
            if (b.maxX > maxX) maxX = b.maxX;
            if (b.maxY > maxY) maxY = b.maxY;
        });

        const cols = [];
        
        // ── Calculate balanced grid start positions ──
        const width = maxX - minX;
        const height = maxY - minY;
        const remX = width % s;
        const remY = height % s;
        const startX = minX + (remX / 2);
        const startY = minY + (remY / 2);

        for (let x = startX; x <= maxX + 0.001; x += s) {
            for (let y = startY; y <= maxY + 0.001; y += s) {
                if (closedPolys.some(p => pointInPolygon(x, y, p.vertices))) {
                    cols.push({ x, y });
                }
            }
        }
        return cols;
    }, [s]);

    // ── Auto-sync columns when polygon or spacing changes ──
    useEffect(() => {
        const hasClosed = polygons.some(p => p.isClosed && p.vertices.length >= 3);
        if (!columnsAutoSync) {
            return;
        }
        if (!hasClosed) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setColumnPositions([]);
            return;
        }
        const newCols = computeColumns(polygons);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setColumnPositions(newCols.map((c, i) => ({ id: `auto-${i}-${c.x.toFixed(2)}-${c.y.toFixed(2)}`, x: c.x, y: c.y })));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [polygons, computeColumns, columnsAutoSync]);

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
            const topLeft = screenToWorld(0, 0, metrics);
            const bottomRight = screenToWorld(W, H, metrics);
            const worldLeft = Math.floor(topLeft.x / SNAP_SIZE) * SNAP_SIZE;
            const worldRight = Math.ceil(bottomRight.x / SNAP_SIZE) * SNAP_SIZE;
            const worldTop = Math.floor(bottomRight.y / SNAP_SIZE) * SNAP_SIZE;
            const worldBottom = Math.ceil(topLeft.y / SNAP_SIZE) * SNAP_SIZE;

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
            ctx.lineWidth = 0.5;
            for (let wx = worldLeft; wx <= worldRight; wx += SNAP_SIZE) {
                const p = worldToScreen(wx, 0, metrics);
                ctx.beginPath(); ctx.moveTo(p.x, 0); ctx.lineTo(p.x, H); ctx.stroke();
            }
            for (let wy = worldTop; wy <= worldBottom; wy += SNAP_SIZE) {
                const p = worldToScreen(0, wy, metrics);
                ctx.beginPath(); ctx.moveTo(0, p.y); ctx.lineTo(W, p.y); ctx.stroke();
            }

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
            ctx.lineWidth = 0.8;
            for (let wx = Math.floor(worldLeft / 5) * 5; wx <= worldRight; wx += 5) {
                const p = worldToScreen(wx, 0, metrics);
                ctx.beginPath(); ctx.moveTo(p.x, 0); ctx.lineTo(p.x, H); ctx.stroke();
            }
            for (let wy = Math.floor(worldTop / 5) * 5; wy <= worldBottom; wy += 5) {
                const p = worldToScreen(0, wy, metrics);
                ctx.beginPath(); ctx.moveTo(0, p.y); ctx.lineTo(W, p.y); ctx.stroke();
            }
        }

        // ── Origin axes ──
        const o = worldToScreen(0, 0, metrics);
        ctx.strokeStyle = 'rgba(255, 80, 80, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(o.x, 0); ctx.lineTo(o.x, H); ctx.stroke();
        ctx.strokeStyle = 'rgba(80, 255, 80, 0.3)';
        ctx.beginPath(); ctx.moveTo(0, o.y); ctx.lineTo(W, o.y); ctx.stroke();

        // ── Grid labels ──
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
            if (p.x > 25 && p.x < W - 10) ctx.fillText(`${wx}`, p.x, o.y + 4);
        }
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        for (let wy = Math.floor(bottomRight2.y / labelStep) * labelStep; wy <= topLeft2.y; wy += labelStep) {
            if (wy === 0) continue;
            const p = worldToScreen(0, wy, metrics);
            if (p.y > 10 && p.y < H - 10) ctx.fillText(`${wy}`, o.x - 6, p.y);
        }

        // ── Polygons fill & edges ──
        polygons.forEach(poly => {
            const popVerts = poly.vertices;
            if (popVerts.length === 0) return;
            const isActive = poly.id === activePolygonId;

            // Fill
            if (poly.isClosed && popVerts.length >= 3) {
                ctx.beginPath();
                const p0 = worldToScreen(popVerts[0].x, popVerts[0].y, metrics);
                ctx.moveTo(p0.x, p0.y);
                for (let i = 1; i < popVerts.length; i++) {
                    const p = worldToScreen(popVerts[i].x, popVerts[i].y, metrics);
                    ctx.lineTo(p.x, p.y);
                }
                ctx.closePath();
                ctx.fillStyle = isActive ? 'rgba(255, 152, 0, 0.08)' : 'rgba(150, 150, 150, 0.05)';
                ctx.fill();
            }

            // Edges
            if (popVerts.length >= 2) {
                ctx.strokeStyle = isActive ? '#ff9800' : '#888';
                ctx.lineWidth = isActive ? 2 : 1.5;
                ctx.setLineDash([]);
                ctx.beginPath();
                const p0 = worldToScreen(popVerts[0].x, popVerts[0].y, metrics);
                ctx.moveTo(p0.x, p0.y);
                for (let i = 1; i < popVerts.length; i++) {
                    const p = worldToScreen(popVerts[i].x, popVerts[i].y, metrics);
                    ctx.lineTo(p.x, p.y);
                }
                if (poly.isClosed) ctx.closePath();
                ctx.stroke();
            }
        });

        // ── Preview line from last vertex to mouse ──
        if (activePolygon && !isClosed && vertices.length > 0 && drawingMode === 'draw') {
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

        // ── Jet grout columns (entity-based, draggable) ──
        if (columnPositions.length > 0) {
            const colR = (D / 2) * ppm;

            columnPositions.forEach((col, idx) => {
                const p = worldToScreen(col.x, col.y, metrics);
                const isSelected = selectedColumn === idx;
                const isHovered = hoveredColumn === idx;

                // Shadow
                ctx.beginPath();
                ctx.arc(p.x + 1.5, p.y + 1.5, colR, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
                ctx.fill();

                // Body gradient
                const grad = ctx.createRadialGradient(p.x - colR * 0.3, p.y - colR * 0.3, colR * 0.1, p.x, p.y, colR);
                if (isSelected) {
                    grad.addColorStop(0, 'rgba(100, 220, 120, 0.95)');
                    grad.addColorStop(0.6, 'rgba(60, 180, 80, 0.85)');
                    grad.addColorStop(1, 'rgba(30, 140, 55, 0.70)');
                } else if (isHovered) {
                    grad.addColorStop(0, 'rgba(255, 200, 100, 0.95)');
                    grad.addColorStop(0.6, 'rgba(220, 160, 60, 0.85)');
                    grad.addColorStop(1, 'rgba(180, 120, 30, 0.70)');
                } else {
                    grad.addColorStop(0, 'rgba(220, 60, 60, 0.90)');
                    grad.addColorStop(0.6, 'rgba(180, 40, 40, 0.80)');
                    grad.addColorStop(1, 'rgba(140, 25, 25, 0.65)');
                }
                ctx.beginPath();
                ctx.arc(p.x, p.y, colR, 0, Math.PI * 2);
                ctx.fillStyle = grad;
                ctx.fill();

                // Border
                ctx.strokeStyle = isSelected ? '#4caf50' : isHovered ? '#ffd54f' : 'rgba(255, 90, 90, 0.85)';
                ctx.lineWidth = isSelected ? 2.5 : isHovered ? 1.5 : 0.8;
                ctx.stroke();

                // Selection ring
                if (isSelected) {
                    ctx.setLineDash([4, 3]);
                    ctx.strokeStyle = 'rgba(76, 175, 80, 0.6)';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, colR + 5, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.setLineDash([]);
                }

                // Center dot
                ctx.beginPath();
                ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
                ctx.fillStyle = '#fff';
                ctx.fill();
            });
        }

        // ── SECTION LINES ──
        sectionLines.forEach((sl, idx) => {
            const color = SECTION_COLORS[idx % SECTION_COLORS.length];
            const isActive = sl.id === activeSectionId;
            const pStart = worldToScreen(sl.start.x, sl.start.y, metrics);
            const pEnd = worldToScreen(sl.end.x, sl.end.y, metrics);

            // Line
            ctx.strokeStyle = color;
            ctx.lineWidth = isActive ? 3 : 2;
            ctx.setLineDash([10, 5]);
            ctx.beginPath();
            ctx.moveTo(pStart.x, pStart.y);
            ctx.lineTo(pEnd.x, pEnd.y);
            ctx.stroke();
            ctx.setLineDash([]);

            // Arrow heads perpendicular to line direction
            const dx = pEnd.x - pStart.x;
            const dy = pEnd.y - pStart.y;
            const len = Math.hypot(dx, dy);
            if (len < 1) return;
            const ux = dx / len;
            const uy = dy / len;
            const nx = -uy;
            const ny = ux;
            const arrowLen = 12;

            // Start arrow (perpendicular)
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(pStart.x + nx * arrowLen, pStart.y + ny * arrowLen);
            ctx.lineTo(pStart.x - nx * arrowLen, pStart.y - ny * arrowLen);
            ctx.lineTo(pStart.x - ux * 6, pStart.y - uy * 6);
            ctx.closePath();
            ctx.fill();

            // End arrow (perpendicular)
            ctx.beginPath();
            ctx.moveTo(pEnd.x + nx * arrowLen, pEnd.y + ny * arrowLen);
            ctx.lineTo(pEnd.x - nx * arrowLen, pEnd.y - ny * arrowLen);
            ctx.lineTo(pEnd.x + ux * 6, pEnd.y + uy * 6);
            ctx.closePath();
            ctx.fill();

            // Labels at both ends
            ctx.font = 'bold 13px Inter, system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            const labelOffset = 22;
            // Start label
            const slx = pStart.x - ux * labelOffset;
            const sly = pStart.y - uy * labelOffset;
            ctx.fillStyle = 'rgba(0,0,0,0.75)';
            ctx.beginPath();
            ctx.arc(slx, sly, 14, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.fillStyle = color;
            ctx.fillText(sl.label.split('-')[0], slx, sly);

            // End label
            const elx = pEnd.x + ux * labelOffset;
            const ely = pEnd.y + uy * labelOffset;
            ctx.fillStyle = 'rgba(0,0,0,0.75)';
            ctx.beginPath();
            ctx.arc(elx, ely, 14, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.fillStyle = color;
            ctx.fillText(sl.label.split('-')[1], elx, ely);
        });

        // ── Section preview line (while drawing) ──
        if (drawingMode === 'section' && sectionStart) {
            const pS = worldToScreen(sectionStart.x, sectionStart.y, metrics);
            const pM = worldToScreen(mouseWorld.x, mouseWorld.y, metrics);
            ctx.strokeStyle = 'rgba(79, 195, 247, 0.6)';
            ctx.lineWidth = 2;
            ctx.setLineDash([8, 4]);
            ctx.beginPath();
            ctx.moveTo(pS.x, pS.y);
            ctx.lineTo(pM.x, pM.y);
            ctx.stroke();
            ctx.setLineDash([]);

            // Preview label
            const nextLabel = sectionLabel(sectionLines.length);
            ctx.font = 'bold 11px Inter, system-ui, sans-serif';
            ctx.fillStyle = '#4fc3f7';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.fillText(nextLabel, (pS.x + pM.x) / 2, Math.min(pS.y, pM.y) - 8);
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

            if (isHovered || isSelected) {
                ctx.beginPath();
                ctx.arc(p.x, p.y, r + 4, 0, Math.PI * 2);
                ctx.fillStyle = isSelected ? 'rgba(76, 175, 80, 0.25)' : 'rgba(255, 152, 0, 0.2)';
                ctx.fill();
            }

            ctx.beginPath();
            ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
            ctx.fillStyle = i === 0 ? '#4caf50' : '#ff9800';
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            if (ppm > 12) {
                ctx.font = 'bold 9px Inter, system-ui, sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = '#fff';
                ctx.fillText(`${i + 1}`, p.x, p.y - r - 8);
            }
        });

    }, [polygons, activePolygonId, vertices, isClosed, activePolygon, drawingMode, mouseWorld, hoveredVertex, selectedVertex, zoom, pan, D, s, rectStart, sectionLines, sectionStart, activeSectionId, columnPositions, selectedColumn, hoveredColumn, getCanvasMetrics, screenToWorld, worldToScreen]);

    // ── Resize observer ──
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        const ro = new ResizeObserver(() => {
            setPolygons(v => [...v]);
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

    // ── Find column near screen position ──
    const findColumn = useCallback((sx, sy) => {
        const metrics = getCanvasMetrics();
        if (!metrics) return -1;
        const { ppm } = metrics;
        const colR = Math.max((D / 2) * ppm, 8); // min 8px hit area
        for (let i = 0; i < columnPositions.length; i++) {
            const p = worldToScreen(columnPositions[i].x, columnPositions[i].y, metrics);
            if (Math.hypot(p.x - sx, p.y - sy) < colR + 3) return i;
        }
        return -1;
    }, [columnPositions, D, getCanvasMetrics, worldToScreen]);

    // ── Find section line near screen position ──
    const findSectionLine = useCallback((sx, sy) => {
        const metrics = getCanvasMetrics();
        if (!metrics) return null;
        for (const sl of sectionLines) {
            const pS = worldToScreen(sl.start.x, sl.start.y, metrics);
            const pE = worldToScreen(sl.end.x, sl.end.y, metrics);
            // Point-to-segment distance
            const dx = pE.x - pS.x;
            const dy = pE.y - pS.y;
            const len2 = dx * dx + dy * dy;
            if (len2 < 1) continue;
            let t = ((sx - pS.x) * dx + (sy - pS.y) * dy) / len2;
            t = Math.max(0, Math.min(1, t));
            const projX = pS.x + t * dx;
            const projY = pS.y + t * dy;
            const dist = Math.hypot(sx - projX, sy - projY);
            if (dist < 10) return sl;
        }
        return null;
    }, [sectionLines, getCanvasMetrics, worldToScreen]);

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

        // Right click -> undo last point (draw/section mode only)
        if (e.button === 2) {
            e.preventDefault();
            if (drawingMode === 'section' && sectionStart) {
                setSectionStart(null);
            } else if (!isClosed && vertices.length > 0 && drawingMode === 'draw') {
                pushUndo();
                setPolygons(prev => prev.map(p => p.id === activePolygonId ? { ...p, vertices: p.vertices.slice(0, -1) } : p));
            }
            return;
        }

        // Left click
        if (e.button === 0) {
            if (drawingMode === 'select') {
                const vi = findVertex(sx, sy);
                if (vi >= 0) {
                    pushUndo();
                    setSelectedVertex(vi);
                    setSelectedColumn(null);
                    setIsDragging(true);
                } else {
                    // Check column first (before section lines)
                    const ci = findColumn(sx, sy);
                    if (ci >= 0) {
                        pushUndo();
                        setSelectedColumn(ci);
                        setSelectedVertex(null);
                        setIsDraggingColumn(true);
                    } else {
                        // Check if clicking on a section line
                        const sl = findSectionLine(sx, sy);
                        if (sl) {
                            setActiveSectionId(sl.id);
                        } else {
                            const world = screenToWorld(sx, sy, metrics);
                            const clickedPoly = polygons.find(p => p.isClosed && p.vertices.length >= 3 && pointInPolygon(world.x, world.y, p.vertices));
                            if (clickedPoly && clickedPoly.id !== activePolygonId) {
                                setActivePolygonId(clickedPoly.id);
                            }
                            setSelectedVertex(null);
                            setSelectedColumn(null);
                        }
                    }
                }
            } else if (drawingMode === 'draw') {
                const world = screenToWorld(sx, sy, metrics);
                const wx = snapToGrid(world.x);
                const wy = snapToGrid(world.y);

                if (activePolygon && !isClosed) {
                    if (vertices.length >= 3) {
                        const p0 = worldToScreen(vertices[0].x, vertices[0].y, metrics);
                        if (Math.hypot(sx - p0.x, sy - p0.y) < 15) {
                            pushUndo();
                            setPolygons(prev => prev.map(p => p.id === activePolygonId ? { ...p, isClosed: true } : p));
                            return;
                        }
                    }
                    pushUndo();
                    setPolygons(prev => prev.map(p => p.id === activePolygonId ? { ...p, vertices: [...p.vertices, { x: wx, y: wy }] } : p));
                } else {
                    pushUndo();
                    const newId = `poly-${Date.now()}`;
                    setPolygons(prev => [...prev, { id: newId, vertices: [{ x: wx, y: wy }], isClosed: false }]);
                    setActivePolygonId(newId);
                }
            } else if (drawingMode === 'rectangle') {
                if (activePolygon && !isClosed) return;
                const world = screenToWorld(sx, sy, metrics);
                const wx = snapToGrid(world.x);
                const wy = snapToGrid(world.y);
                if (!rectStart) {
                    setRectStart({ x: wx, y: wy });
                } else {
                    const x1 = Math.min(rectStart.x, wx);
                    const y1 = Math.min(rectStart.y, wy);
                    const x2 = Math.max(rectStart.x, wx);
                    const y2 = Math.max(rectStart.y, wy);
                    if (Math.abs(x2 - x1) > 0.1 && Math.abs(y2 - y1) > 0.1) {
                        pushUndo();
                        const newId = `poly-${Date.now()}`;
                        const newVerts = [
                            { x: x1, y: y1 }, { x: x2, y: y1 },
                            { x: x2, y: y2 }, { x: x1, y: y2 }
                        ];
                        setPolygons(prev => [...prev, { id: newId, vertices: newVerts, isClosed: true }]);
                        setActivePolygonId(newId);
                    }
                    setRectStart(null);
                }
            } else if (drawingMode === 'section') {
                const world = screenToWorld(sx, sy, metrics);
                const wx = snapToGrid(world.x);
                const wy = snapToGrid(world.y);
                if (!sectionStart) {
                    setSectionStart({ x: wx, y: wy });
                } else {
                    // Complete the section line
                    const dist = Math.hypot(wx - sectionStart.x, wy - sectionStart.y);
                    if (dist > 0.1) {
                        pushUndo();
                        const newSection = {
                            id: `section-${Date.now()}`,
                            start: sectionStart,
                            end: { x: wx, y: wy },
                            label: sectionLabel(sectionLines.length)
                        };
                        setSectionLines(prev => [...prev, newSection]);
                        setActiveSectionId(newSection.id);
                    }
                    setSectionStart(null);
                }
            }
        }
    }, [drawingMode, isClosed, vertices, activePolygon, activePolygonId, polygons, pan, rectStart, sectionStart, sectionLines, findVertex, findColumn, findSectionLine, getCanvasMetrics, screenToWorld, snapToGrid, worldToScreen, pushUndo]);

    const handleMouseMove = useCallback((e) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const sx = e.clientX - rect.left;
        const sy = e.clientY - rect.top;
        const metrics = getCanvasMetrics();
        if (!metrics) return;

        if (isPanning) {
            const dx = e.clientX - panStartRef.current.x;
            const dy = e.clientY - panStartRef.current.y;
            setPan({ x: panStartRef.current.panX + dx, y: panStartRef.current.panY + dy });
            return;
        }

        if (isDragging && selectedVertex !== null) {
            const world = screenToWorld(sx, sy, metrics);
            const wx = snapToGrid(world.x);
            const wy = snapToGrid(world.y);
            setPolygons(prev => prev.map(p => {
                if (p.id === activePolygonId) {
                    const nv = [...p.vertices];
                    nv[selectedVertex] = { x: wx, y: wy };
                    return { ...p, vertices: nv };
                }
                return p;
            }));
            return;
        }

        // Column dragging
        if (isDraggingColumn && selectedColumn !== null) {
            const world = screenToWorld(sx, sy, metrics);
            const wx = snapToGrid(world.x);
            const wy = snapToGrid(world.y);
            setColumnPositions(prev => {
                const nv = [...prev];
                nv[selectedColumn] = { ...nv[selectedColumn], x: wx, y: wy };
                return nv;
            });
            // Disable auto-sync once user manually moves a column
            setColumnsAutoSync(false);
            return;
        }

        const world = screenToWorld(sx, sy, metrics);
        const wx = snapToGrid(world.x);
        const wy = snapToGrid(world.y);
        setMouseWorld({ x: wx, y: wy });

        const vi = findVertex(sx, sy);
        setHoveredVertex(vi >= 0 ? vi : null);

        // Hover highlight for columns (only in select mode)
        if (drawingMode === 'select') {
            const ci = findColumn(sx, sy);
            setHoveredColumn(ci >= 0 ? ci : null);
        } else {
            setHoveredColumn(null);
        }
    }, [isPanning, isDragging, isDraggingColumn, selectedVertex, selectedColumn, drawingMode, activePolygonId, findVertex, findColumn, getCanvasMetrics, screenToWorld, snapToGrid]);

    const handleMouseUp = useCallback(() => {
        setIsPanning(false);
        setIsDragging(false);
        setIsDraggingColumn(false);
    }, []);

    // Wheel zoom — must be non-passive to preventDefault
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const onWheel = (e) => {
            e.preventDefault();
            const factor = e.deltaY < 0 ? 1.12 : 0.89;
            setZoom(z => Math.max(0.1, Math.min(50, z * factor)));
        };
        canvas.addEventListener('wheel', onWheel, { passive: false });
        return () => canvas.removeEventListener('wheel', onWheel);
    }, []);

    const handleContextMenu = useCallback((e) => {
        e.preventDefault();
    }, []);

    // ── Split resize handler ──
    const handleSplitMouseDown = useCallback((e) => {
        e.preventDefault();
        setIsResizingSplit(true);
    }, []);

    useEffect(() => {
        if (!isResizingSplit) return;
        const wrapper = containerRef.current?.closest('.plan-view-fullscreen-wrapper');
        if (!wrapper) return;

        const handleMove = (e) => {
            const rect = wrapper.getBoundingClientRect();
            // wrapper contains header + content area. We need the content area.
            const contentArea = wrapper.querySelector('.plan-split-container');
            if (!contentArea) return;
            const contentRect = contentArea.getBoundingClientRect();
            const y = e.clientY - contentRect.top;
            const ratio = Math.max(0.25, Math.min(0.85, y / contentRect.height));
            setSplitRatio(ratio);
        };

        const handleUp = () => {
            setIsResizingSplit(false);
        };

        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleUp);
        return () => {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleUp);
        };
    }, [isResizingSplit]);

    // ── Toolbar actions ──
    const handleClear = () => {
        pushUndo();
        if (activePolygonId) {
            setPolygons(prev => prev.filter(p => p.id !== activePolygonId));
            setActivePolygonId(null);
        } else {
            setPolygons([]);
        }
        setSelectedVertex(null);
        setHoveredVertex(null);
        setSelectedColumn(null);
        setRectStart(null);
    };

    const handleResetColumns = () => {
        const hasClosed = polygons.some(p => p.isClosed && p.vertices.length >= 3);
        if (!hasClosed) return;
        pushUndo();
        const newCols = computeColumns(polygons);
        setColumnPositions(newCols.map((c, i) => ({ id: `auto-${i}-${c.x.toFixed(2)}-${c.y.toFixed(2)}`, x: c.x, y: c.y })));
        setColumnsAutoSync(true);
        setSelectedColumn(null);
    };

    // ── DXF import handler ──
    const handleDxfImport = (data) => {
        // data: { polygons, vertices, isClosed, columnPositions, sectionLines, columnDiameter, unit }
        pushUndo();

        if (data.polygons && data.polygons.length > 0) {
            setPolygons(data.polygons);
            setActivePolygonId(data.polygons[0].id);
        } else if (data.vertices && data.vertices.length > 0) {
            setPolygons([{ id: `poly-${Date.now()}`, vertices: data.vertices, isClosed: data.isClosed }]);
            setActivePolygonId(`poly-${Date.now()}`);
        } else {
            setPolygons([]);
            setActivePolygonId(null);
        }

        setSelectedVertex(null);
        setHoveredVertex(null);
        setSelectedColumn(null);
        setRectStart(null);
        setSectionStart(null);

        if (data.sectionLines && data.sectionLines.length > 0) {
            setSectionLines(data.sectionLines);
        } else {
            setSectionLines([]);
        }

        if (data.columnPositions && data.columnPositions.length > 0) {
            setColumnPositions(data.columnPositions);
            setColumnsAutoSync(false);
        } else {
            // Auto-generate columns if no explicit column layer given
            setColumnsAutoSync(true);
        }

        // If DXF circles provided a diameter, update the D parameter
        if (data.columnDiameter && data.columnDiameter > 0 && onParameterChange) {
            onParameterChange({ target: { name: 'D', value: String(data.columnDiameter.toFixed(2)) } });
        }

        // Auto zoom fit to the newly imported data
        const newVerts = [];
        if (data.polygons) data.polygons.forEach(p => newVerts.push(...p.vertices));
        if (data.vertices) newVerts.push(...data.vertices);
        if (data.columnPositions) newVerts.push(...data.columnPositions);
        if (data.sectionLines) data.sectionLines.forEach(sl => newVerts.push(sl.start, sl.end));

        if (newVerts.length > 0) {
            const bounds = polygonBounds(newVerts);
            const canvas = canvasRef.current;
            if (canvas) {
                const rect = canvas.getBoundingClientRect();
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
            }
        }

        // Switch to select mode so user can see & adjust immediately
        setDrawingMode('select');
    };

    const handleClose = () => {
        if (activePolygon && activePolygon.vertices.length >= 3 && !activePolygon.isClosed) {
            pushUndo();
            setPolygons(prev => prev.map(p => p.id === activePolygonId ? { ...p, isClosed: true } : p));
        }
    };

    const handleDeleteVertex = () => {
        if (selectedVertex !== null && activePolygon && activePolygon.vertices.length > 0) {
            pushUndo();
            setPolygons(prev => prev.map(p => {
                if (p.id === activePolygonId) {
                    const newVerts = p.vertices.filter((_, i) => i !== selectedVertex);
                    return { ...p, vertices: newVerts, isClosed: newVerts.length < 3 ? false : p.isClosed };
                }
                return p;
            }));
            setSelectedVertex(null);
        }
    };

    const handleDeleteSection = (id) => {
        pushUndo();
        setSectionLines(prev => prev.filter(sl => sl.id !== id));
        if (activeSectionId === id) {
            setActiveSectionId(null);
        }
    };

    const handleZoomFit = () => {
        const allVerts = [...polygons.flatMap(p => p.vertices), ...columnPositions];
        if (allVerts.length === 0) {
            setPan({ x: 0, y: 0 });
            setZoom(1);
            return;
        }
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const bounds = polygonBounds(allVerts);
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

    // ── Keyboard shortcuts (Ctrl+Z/Y, WASD pan) ──
    useEffect(() => {
        const PAN_STEP = 40;
        const handleKeyDown = (e) => {
            // Skip if user is typing in an input/textarea
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'z') {
                e.preventDefault();
                handleUndo();
            } else if (
                ((e.ctrlKey || e.metaKey) && e.key === 'y') ||
                ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') ||
                ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'Z')
            ) {
                e.preventDefault();
                handleRedo();
            } else if (!e.ctrlKey && !e.metaKey) {
                // WASD panning
                switch (e.key.toLowerCase()) {
                    case 'w':
                        e.preventDefault();
                        setPan(p => ({ ...p, y: p.y + PAN_STEP }));
                        break;
                    case 's':
                        e.preventDefault();
                        setPan(p => ({ ...p, y: p.y - PAN_STEP }));
                        break;
                    case 'a':
                        e.preventDefault();
                        setPan(p => ({ ...p, x: p.x + PAN_STEP }));
                        break;
                    case 'd':
                        e.preventDefault();
                        setPan(p => ({ ...p, x: p.x - PAN_STEP }));
                        break;
                    default:
                        break;
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleUndo, handleRedo]);

    // ── Computed info ──
    const area = polygons.reduce((sum, p) => p.isClosed && p.vertices.length >= 3 ? sum + polygonArea(p.vertices) : sum, 0);
    const perimeter = polygons.reduce((sum, p) => p.isClosed && p.vertices.length >= 3 ? sum + polygonPerimeter(p.vertices) : sum, 0);
    const totalColumns = columnPositions.length;
    const Ajet = Math.PI * (D / 2) ** 2;
    const Ar = area > 0 ? (totalColumns * Ajet / area) * 100 : 0;

    const showSectionPanel = activeSection !== null;

    return (
        <div className="plan-view-fullscreen-wrapper">
            <div className="plan-view-header">
                <h3>{tr ? 'Jet Grout Yerleşim Planı (İnteraktif Çizim)' : 'Jet Grout Layout Plan (Interactive Drawing)'}</h3>

                {/* Toolbar */}
                <div className="plan-toolbar">
                    {/* DXF Import button — far left */}
                    <button
                        className="toolbar-btn icon-btn dxf-import-btn"
                        onClick={() => setShowDxfModal(true)}
                        data-tooltip={tr ? 'DXF Dosyasından İçe Aktar' : 'Import from DXF File'}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                            <polyline points="12 18 8 14 12 10" />
                            <line x1="16" y1="14" x2="8" y2="14" />
                        </svg>
                    </button>

                    <div className="toolbar-divider" />

                    <div className="toolbar-group">
                        <button
                            className={`toolbar-btn icon-btn ${drawingMode === 'draw' ? 'active' : ''}`}
                            onClick={() => { setDrawingMode('draw'); setRectStart(null); setSectionStart(null); }}
                            data-tooltip={tr ? 'Çiz — Tıklayarak köşe ekle' : 'Draw — Click to add vertices'}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
                        </button>
                        <button
                            className={`toolbar-btn icon-btn ${drawingMode === 'rectangle' ? 'active' : ''}`}
                            onClick={() => { setDrawingMode('rectangle'); setRectStart(null); setSectionStart(null); }}
                            data-tooltip={tr ? 'Dikdörtgen — 2 tıklayın' : 'Rectangle — 2 clicks to create'}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /></svg>
                        </button>
                        <button
                            className={`toolbar-btn icon-btn ${drawingMode === 'select' ? 'active' : ''}`}
                            onClick={() => { setDrawingMode('select'); setRectStart(null); setSectionStart(null); }}
                            data-tooltip={tr ? 'Seç — Köşeleri sürükle' : 'Select — Drag vertices'}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" /><path d="M13 13l6 6" /></svg>
                        </button>
                    </div>

                    <div className="toolbar-divider" />

                    <div className="toolbar-group">
                        <button className="toolbar-btn icon-btn" onClick={handleClose} disabled={isClosed || vertices.length < 3}
                            data-tooltip={tr ? 'Poligonu kapat' : 'Close polygon'}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 2 17 12 22 22 17 22 7 12 2" /></svg>
                        </button>
                        <button className="toolbar-btn icon-btn" onClick={handleUndo} disabled={undoStack.length === 0}
                            data-tooltip={tr ? 'Geri al (Ctrl+Z)' : 'Undo (Ctrl+Z)'}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" /></svg>
                        </button>
                        <button className="toolbar-btn icon-btn" onClick={handleRedo} disabled={redoStack.length === 0}
                            data-tooltip={tr ? 'İleri al (Ctrl+Y)' : 'Redo (Ctrl+Y)'}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.13-9.36L23 10" /></svg>
                        </button>
                        <button className="toolbar-btn icon-btn" onClick={handleDeleteVertex} disabled={selectedVertex === null}
                            data-tooltip={tr ? 'Seçili noktayı sil' : 'Delete selected vertex'}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                        </button>
                        <button className="toolbar-btn icon-btn" onClick={handleClear}
                            data-tooltip={tr ? 'Tümünü temizle' : 'Clear all'}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                        </button>
                    </div>

                    <div className="toolbar-divider" />

                    <div className="toolbar-group">
                        <button className={`toolbar-btn icon-btn ${gridSnap ? 'active' : ''}`} onClick={() => setGridSnap(g => !g)}
                            data-tooltip={tr ? 'Köşelere yapış' : 'Snap to grid'}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" /><circle cx="7.5" cy="10" r="1.5" /><circle cx="12" cy="7" r="1.5" /><circle cx="16.5" cy="10" r="1.5" /></svg>
                        </button>
                        <button className="toolbar-btn icon-btn" onClick={handleZoomFit}
                            data-tooltip={tr ? 'Sığdır' : 'Zoom to fit'}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6" /><path d="M9 21H3v-6" /><path d="M21 3l-7 7" /><path d="M3 21l7-7" /></svg>
                        </button>
                    </div>

                    <div className="toolbar-divider" />

                    {/* Inline D and s controls */}
                    <div className="toolbar-group toolbar-params">
                        <div className="toolbar-param">
                            <label>{tr ? 'Çap (D)' : 'Diameter (D)'}</label>
                            <input type="number" value={D} min={0.3} max={3.0} step={0.1}
                                onChange={(e) => onParameterChange && onParameterChange({ target: { name: 'D', value: e.target.value } })} />
                            <span>m</span>
                        </div>
                        <div className="toolbar-param">
                            <label>{tr ? 'Aralık (s)' : 'Spacing (s)'}</label>
                            <input type="number" value={s} min={0.5} max={10.0} step={0.1}
                                onChange={(e) => onParameterChange && onParameterChange({ target: { name: 's', value: e.target.value } })} />
                            <span>m</span>
                        </div>
                    </div>

                    <div className="toolbar-divider" />

                    {/* Reset columns / auto-sync toggle */}
                    <div className="toolbar-group">
                        <button
                            className={`toolbar-btn icon-btn ${!columnsAutoSync ? 'active' : ''}`}
                            onClick={handleResetColumns}
                            disabled={!polygons.some(p => p.isClosed && p.vertices.length >= 3)}
                            data-tooltip={tr ? 'Kolonları Sıfırla (Otomatik Yerleşim)' : 'Reset Columns (Auto Layout)'}
                            style={!columnsAutoSync ? { borderColor: '#ff9800', color: '#ff9800' } : {}}
                        >
                            {/* Grid/reset icon */}
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="3" />
                                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                                <path d="M4.93 4.93a10 10 0 0 0 0 14.14" />
                                <line x1="12" y1="2" x2="12" y2="5" />
                                <line x1="12" y1="19" x2="12" y2="22" />
                                <line x1="2" y1="12" x2="5" y2="12" />
                                <line x1="19" y1="12" x2="22" y2="12" />
                            </svg>
                        </button>
                        {!columnsAutoSync && (
                            <span style={{ fontSize: '10px', color: '#ff9800', marginLeft: '2px' }}
                                title={tr ? 'Kolonlar manuel konumda' : 'Columns in manual position'}>
                                ✋
                            </span>
                        )}
                    </div>

                    <div className="toolbar-divider" />

                    {/* Section cut button */}
                    <button
                        className={`toolbar-btn section-cut-action-btn ${drawingMode === 'section' ? 'active' : ''}`}
                        onClick={() => { setDrawingMode('section'); setRectStart(null); setSectionStart(null); }}
                        data-tooltip={tr ? 'Kesit Al — 2 tıkla kesit çizgisi tanımla' : 'Section Cut — 2 clicks to define section line'}
                        disabled={!polygons.some(p => p.isClosed && p.vertices.length >= 3)}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><line x1="20" y1="4" x2="8.12" y2="15.88" /><line x1="14.47" y1="14.48" x2="20" y2="20" /><line x1="8.12" y1="8.12" x2="12" y2="12" /></svg>
                    </button>

                    {/* Section line buttons */}
                    {sectionLines.length > 0 && (
                        <div className="toolbar-group toolbar-sections">
                            {sectionLines.map((sl, idx) => (
                                <div key={sl.id} className="toolbar-section-item">
                                    <button
                                        className={`toolbar-btn toolbar-section-btn ${activeSectionId === sl.id ? 'active' : ''}`}
                                        onClick={() => setActiveSectionId(activeSectionId === sl.id ? null : sl.id)}
                                        style={{
                                            borderColor: activeSectionId === sl.id ? SECTION_COLORS[idx % SECTION_COLORS.length] : undefined,
                                            color: SECTION_COLORS[idx % SECTION_COLORS.length]
                                        }}
                                    >
                                        {sl.label}
                                    </button>
                                    <button
                                        className="toolbar-btn toolbar-section-delete"
                                        onClick={() => handleDeleteSection(sl.id)}
                                        data-tooltip={tr ? 'Kesiti sil' : 'Delete section'}
                                    >
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Split container: Plan canvas + Section view */}
            <div className="plan-split-container">
                {/* Canvas */}
                <div className="plan-canvas-container" ref={containerRef}
                    style={showSectionPanel ? { flex: `0 0 ${splitRatio * 100}%` } : { flex: 1 }}>
                    <canvas
                        ref={canvasRef}
                        className={`plan-canvas ${drawingMode === 'draw' || drawingMode === 'rectangle' || drawingMode === 'section' ? 'cursor-crosshair' : ''} ${drawingMode === 'select' ? (isDragging || isDraggingColumn ? 'cursor-grabbing' : hoveredColumn !== null ? 'cursor-grab' : 'cursor-pointer') : ''} ${isPanning ? 'cursor-grabbing' : ''}`}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                        onContextMenu={handleContextMenu}
                    />

                    {/* Coordinate display */}
                    <div className="plan-coord-display">
                        <span>X: {mouseWorld.x.toFixed(1)}m</span>
                        <span>Y: {mouseWorld.y.toFixed(1)}m</span>
                        <span className="coord-zoom">🔍 {(zoom * 100).toFixed(0)}%</span>
                    </div>

                    {/* Info overlay */}
                    {polygons.some(p => p.isClosed && p.vertices.length >= 3) && (
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

                    {/* Section mode hint */}
                    {drawingMode === 'section' && !sectionStart && (
                        <div className="plan-section-hint">
                            {tr
                                ? 'Kesit başlangıç noktasını tıklayın'
                                : 'Click to set section start point'}
                        </div>
                    )}
                    {drawingMode === 'section' && sectionStart && (
                        <div className="plan-section-hint">
                            {tr
                                ? 'Kesit bitiş noktasını tıklayın (sağ tık: iptal)'
                                : 'Click to set section end point (right-click: cancel)'}
                        </div>
                    )}
                </div>

                {/* Resize handle */}
                {showSectionPanel && (
                    <div className="plan-split-handle" onMouseDown={handleSplitMouseDown}>
                        <div className="plan-split-handle-bar" />
                    </div>
                )}

                {/* Section Cut View */}
                {showSectionPanel && (
                    <div className="plan-section-panel" style={{ flex: `0 0 ${(1 - splitRatio) * 100}%` }}>
                        <SectionCutView
                            sectionLine={activeSection}
                            columns={columnPositions}
                            parameters={parameters}
                            soilLayers={soilLayers || []}
                            lang={lang}
                            sectionColor={activeSectionColor}
                            onClose={() => setActiveSectionId(null)}
                            extraParams={extraParams}
                        />
                    </div>
                )}
            </div>      {/* /plan-split-container */}

            {/* DXF Import Modal (inside root wrapper so overlay works) */}
            {showDxfModal && (
                <DxfImportModal
                    lang={lang}
                    onImport={handleDxfImport}
                    onClose={() => setShowDxfModal(false)}
                />
            )}
        </div>
    );
}

export default PlanView;
