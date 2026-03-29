import { useRef, useEffect, useState, useCallback } from 'react';
import SectionCutView from './SectionCutView';
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
function PlanView({ parameters, lang, onParameterChange, soilLayers }) {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);

    // Drawing state
    const [vertices, setVertices] = useState([]);
    const [isClosed, setIsClosed] = useState(false);
    const [drawingMode, setDrawingMode] = useState('draw'); // draw | rectangle | select | section
    const [selectedVertex, setSelectedVertex] = useState(null);
    const [hoveredVertex, setHoveredVertex] = useState(null);
    const [isDragging, setIsDragging] = useState(false);

    // Rectangle mode helpers
    const [rectStart, setRectStart] = useState(null);

    // Section lines state
    const [sectionLines, setSectionLines] = useState([]);
    const [sectionStart, setSectionStart] = useState(null); // temp start point while drawing
    const [activeSectionId, setActiveSectionId] = useState(null);

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

                ctx.beginPath();
                ctx.arc(p.x + 1, p.y + 1, colR, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
                ctx.fill();

                const grad = ctx.createRadialGradient(p.x - colR * 0.3, p.y - colR * 0.3, colR * 0.1, p.x, p.y, colR);
                grad.addColorStop(0, 'rgba(220, 60, 60, 0.9)');
                grad.addColorStop(0.6, 'rgba(180, 40, 40, 0.8)');
                grad.addColorStop(1, 'rgba(140, 25, 25, 0.65)');
                ctx.beginPath();
                ctx.arc(p.x, p.y, colR, 0, Math.PI * 2);
                ctx.fillStyle = grad;
                ctx.fill();

                ctx.strokeStyle = 'rgba(255, 90, 90, 0.85)';
                ctx.lineWidth = 0.8;
                ctx.stroke();

                ctx.beginPath();
                ctx.arc(p.x, p.y, 1.2, 0, Math.PI * 2);
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

    }, [vertices, isClosed, drawingMode, mouseWorld, hoveredVertex, selectedVertex, zoom, pan, D, s, rectStart, sectionLines, sectionStart, activeSectionId, computeColumns, getCanvasMetrics, screenToWorld, worldToScreen]);

    // ── Resize observer ──
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        const ro = new ResizeObserver(() => {
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

        // Right click -> undo
        if (e.button === 2) {
            e.preventDefault();
            if (drawingMode === 'section' && sectionStart) {
                setSectionStart(null);
            } else if (!isClosed && vertices.length > 0 && drawingMode === 'draw') {
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
                    // Check if clicking on a section line
                    const sl = findSectionLine(sx, sy);
                    if (sl) {
                        setActiveSectionId(sl.id);
                    } else {
                        setSelectedVertex(null);
                    }
                }
            } else if (drawingMode === 'draw') {
                if (isClosed) return;
                const world = screenToWorld(sx, sy, metrics);
                const wx = snapToGrid(world.x);
                const wy = snapToGrid(world.y);

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
                    const x1 = Math.min(rectStart.x, wx);
                    const y1 = Math.min(rectStart.y, wy);
                    const x2 = Math.max(rectStart.x, wx);
                    const y2 = Math.max(rectStart.y, wy);
                    if (Math.abs(x2 - x1) > 0.1 && Math.abs(y2 - y1) > 0.1) {
                        setVertices([
                            { x: x1, y: y1 }, { x: x2, y: y1 },
                            { x: x2, y: y2 }, { x: x1, y: y2 }
                        ]);
                        setIsClosed(true);
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
    }, [drawingMode, isClosed, vertices, pan, rectStart, sectionStart, sectionLines, findVertex, findSectionLine, getCanvasMetrics, screenToWorld, snapToGrid, worldToScreen]);

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
            setVertices(v => {
                const nv = [...v];
                nv[selectedVertex] = { x: wx, y: wy };
                return nv;
            });
            return;
        }

        const world = screenToWorld(sx, sy, metrics);
        const wx = snapToGrid(world.x);
        const wy = snapToGrid(world.y);
        setMouseWorld({ x: wx, y: wy });

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

    const handleDeleteSection = (id) => {
        setSectionLines(prev => prev.filter(sl => sl.id !== id));
        if (activeSectionId === id) {
            setActiveSectionId(null);
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

    const showSectionPanel = activeSection !== null;

    return (
        <div className="plan-view-fullscreen-wrapper">
            <div className="plan-view-header">
                <h3>{tr ? '✏️ Jet Grout Yerleşim Planı (İnteraktif Çizim)' : '✏️ Jet Grout Layout Plan (Interactive Drawing)'}</h3>

                {/* Toolbar */}
                <div className="plan-toolbar">
                    <div className="toolbar-group">
                        <button
                            className={`toolbar-btn ${drawingMode === 'draw' ? 'active' : ''}`}
                            onClick={() => { setDrawingMode('draw'); setRectStart(null); setSectionStart(null); }}
                            title={tr ? 'Çiz — Tıklayarak köşe ekle' : 'Draw — Click to add vertices'}
                        >
                            ✏️ {tr ? 'Çiz' : 'Draw'}
                        </button>
                        <button
                            className={`toolbar-btn ${drawingMode === 'rectangle' ? 'active' : ''}`}
                            onClick={() => { setDrawingMode('rectangle'); setRectStart(null); setSectionStart(null); }}
                            title={tr ? 'Dikdörtgen — 2 tıkla dikdörtgen oluştur' : 'Rectangle — 2 clicks to create'}
                        >
                            🔲 {tr ? 'Dikdörtgen' : 'Rect'}
                        </button>
                        <button
                            className={`toolbar-btn ${drawingMode === 'select' ? 'active' : ''}`}
                            onClick={() => { setDrawingMode('select'); setRectStart(null); setSectionStart(null); }}
                            title={tr ? 'Seç — Köşeleri sürükle' : 'Select — Drag vertices'}
                        >
                            ↕️ {tr ? 'Seç' : 'Select'}
                        </button>
                        <button
                            className={`toolbar-btn ${drawingMode === 'section' ? 'active' : ''}`}
                            onClick={() => { setDrawingMode('section'); setRectStart(null); setSectionStart(null); }}
                            title={tr ? 'Kesit — 2 tıkla kesit çizgisi tanımla' : 'Section — 2 clicks to define section line'}
                            disabled={!isClosed}
                        >
                            ✂️ {tr ? 'Kesit' : 'Section'}
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

                    {/* Section line buttons */}
                    {sectionLines.length > 0 && (
                        <>
                            <div className="toolbar-divider" />
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
                                            title={tr ? 'Kesiti sil' : 'Delete section'}
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </>
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
                        className={`plan-canvas ${drawingMode === 'draw' || drawingMode === 'rectangle' || drawingMode === 'section' ? 'cursor-crosshair' : ''} ${drawingMode === 'select' ? (isDragging ? 'cursor-grabbing' : 'cursor-pointer') : ''} ${isPanning ? 'cursor-grabbing' : ''}`}
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

                    {/* Section mode hint */}
                    {drawingMode === 'section' && !sectionStart && (
                        <div className="plan-section-hint">
                            {tr
                                ? '✂️ Kesit başlangıç noktasını tıklayın'
                                : '✂️ Click to set section start point'}
                        </div>
                    )}
                    {drawingMode === 'section' && sectionStart && (
                        <div className="plan-section-hint">
                            {tr
                                ? '✂️ Kesit bitiş noktasını tıklayın (sağ tık: iptal)'
                                : '✂️ Click to set section end point (right-click: cancel)'}
                        </div>
                    )}

                    {/* Help hint */}
                    {vertices.length === 0 && !isClosed && (
                        <div className="plan-help-hint">
                            {tr
                                ? '✏️ "Çiz" modunda canvas\'a tıklayarak poligon köşelerini yerleştirin. "Dikdörtgen" moduyla hızlı dikdörtgen çizin.'
                                : '✏️ Click on canvas in "Draw" mode to place polygon vertices. Use "Rect" mode for quick rectangles.'}
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
                            columns={columns}
                            parameters={parameters}
                            soilLayers={soilLayers || []}
                            lang={lang}
                            sectionColor={activeSectionColor}
                            onClose={() => setActiveSectionId(null)}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

export default PlanView;
