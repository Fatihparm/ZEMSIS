/**
 * dxfParser.js — Minimal ASCII DXF Parser
 * ─────────────────────────────────────────
 * Supports: LWPOLYLINE, POLYLINE + VERTEX, POINT, LINE
 * No external dependencies — pure deterministic parsing.
 *
 * Output: { layers, warnings }
 *   layers: { [layerName]: { polylines: [...], points: [...] } }
 *   polyline: { vertices: [{x, y}], closed: boolean }
 *   point:    { x, y }
 */

// ── Entry point ────────────────────────────────────────────────────────────────
export function parseDxf(text) {
    const warnings = [];

    // Normalise line endings, remove BOM
    const normalised = text.replace(/\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const rawLines = normalised.split('\n').map(l => l.trim());

    // Build (code, value) pair array — filter blank lines
    const pairs = [];
    for (let i = 0; i < rawLines.length - 1; i++) {
        const codeLine = rawLines[i];
        const valueLine = rawLines[i + 1];
        if (codeLine === '') continue;
        const code = parseInt(codeLine, 10);
        if (!isNaN(code)) {
            pairs.push([code, valueLine]);
            i++; // consume value line
        }
    }

    // ── Find ENTITIES section ──
    let pi = 0;
    while (pi < pairs.length) {
        const [code, value] = pairs[pi];
        if (code === 0 && value === 'SECTION') {
            pi++;
            if (pi < pairs.length && pairs[pi][0] === 2 && pairs[pi][1] === 'ENTITIES') {
                pi++;
                break;
            }
        } else {
            pi++;
        }
    }

    if (pi >= pairs.length) {
        warnings.push('ENTITIES section not found. Is this a valid DXF file?');
        return { layers: {}, warnings };
    }

    // ── Parse entities ──
    const rawEntities = [];

    while (pi < pairs.length) {
        const [code, value] = pairs[pi];
        if (code === 0 && (value === 'ENDSEC' || value === 'EOF')) break;

        if (code === 0) {
            const entityType = value;
            pi++;

            // Collect all pairs belonging to this entity (until next code 0)
            const entityPairs = [];
            while (pi < pairs.length && pairs[pi][0] !== 0) {
                entityPairs.push(pairs[pi]);
                pi++;
            }

            // Handle POLYLINE: its VERTEX sub-entities appear as separate code-0 tokens
            if (entityType === 'POLYLINE') {
                const [entity, newPi] = parsePolyline(entityPairs, pairs, pi, warnings);
                if (entity) rawEntities.push(entity);
                pi = newPi;
            } else {
                const entity = parseEntity(entityType, entityPairs);
                if (entity) rawEntities.push(entity);
            }
        } else {
            pi++;
        }
    }

    // ── Group by layer ──
    const layers = {};
    for (const e of rawEntities) {
        const lname = e.layer || '0';
        if (!layers[lname]) layers[lname] = { polylines: [], points: [] };
        if (e.type === 'poly')  layers[lname].polylines.push({ vertices: e.vertices, closed: e.closed });
        if (e.type === 'point') layers[lname].points.push({ x: e.x, y: e.y });
    }

    // Compute bounding box per layer for UI preview
    for (const [lname, ld] of Object.entries(layers)) {
        ld.bbox = computeLayerBBox(ld);
        ld.entityCount = ld.polylines.length + ld.points.length;
    }

    return { layers, warnings };
}

// ── Entity dispatcher ──────────────────────────────────────────────────────────
function parseEntity(type, pairs) {
    switch (type) {
        case 'LWPOLYLINE': return parseLwPolyline(pairs);
        case 'POINT':      return parsePoint(pairs);
        case 'LINE':       return parseLine(pairs);
        default:           return null;
    }
}

// ── LWPOLYLINE ─────────────────────────────────────────────────────────────────
// Group codes:
//   8  = layer, 70 = flags (bit 0 = closed), 10 = X, 20 = Y
function parseLwPolyline(pairs) {
    const e = { type: 'poly', layer: '0', vertices: [], closed: false };
    for (const [code, value] of pairs) {
        switch (code) {
            case 8:  e.layer  = value; break;
            case 70: e.closed = (parseInt(value, 10) & 1) === 1; break;
            case 10: e.vertices.push({ x: parseFloat(value), y: 0 }); break;
            case 20:
                if (e.vertices.length > 0)
                    e.vertices[e.vertices.length - 1].y = parseFloat(value);
                break;
            default: break;
        }
    }
    return e.vertices.length >= 2 ? e : null;
}

// ── POLYLINE + VERTEX ──────────────────────────────────────────────────────────
// POLYLINE header pairs + subsequent VERTEX entities until SEQEND
function parsePolyline(headerPairs, allPairs, pi, warnings) {
    const e = { type: 'poly', layer: '0', vertices: [], closed: false };

    // Parse POLYLINE header
    for (const [code, value] of headerPairs) {
        if (code === 8)  e.layer  = value;
        if (code === 70) e.closed = (parseInt(value, 10) & 1) === 1;
    }

    // Parse VERTEX sub-entities
    while (pi < allPairs.length) {
        const [code, value] = allPairs[pi];
        if (code !== 0) { pi++; continue; }

        if (value === 'SEQEND') {
            // Consume SEQEND's own pairs
            pi++;
            while (pi < allPairs.length && allPairs[pi][0] !== 0) pi++;
            break;
        }

        if (value !== 'VERTEX') break; // Unknown next entity — stop

        pi++; // consume VERTEX token
        let vx = 0, vy = 0, vflags = 0;
        while (pi < allPairs.length && allPairs[pi][0] !== 0) {
            const [vc, vv] = allPairs[pi];
            if (vc === 10) vx = parseFloat(vv);
            if (vc === 20) vy = parseFloat(vv);
            if (vc === 70) vflags = parseInt(vv, 10);
            pi++;
        }
        // Skip spline control/fit points (flags 16, 32)
        if (!(vflags & 16) && !(vflags & 32)) {
            e.vertices.push({ x: vx, y: vy });
        }
    }

    return [e.vertices.length >= 2 ? e : null, pi];
}

// ── POINT ─────────────────────────────────────────────────────────────────────
function parsePoint(pairs) {
    const e = { type: 'point', layer: '0', x: 0, y: 0 };
    for (const [code, value] of pairs) {
        if (code === 8)  e.layer = value;
        if (code === 10) e.x = parseFloat(value);
        if (code === 20) e.y = parseFloat(value);
    }
    return e;
}

// ── LINE (two-point) → treat as open polyline ─────────────────────────────────
function parseLine(pairs) {
    const e = { type: 'poly', layer: '0', vertices: [{ x: 0, y: 0 }, { x: 0, y: 0 }], closed: false };
    for (const [code, value] of pairs) {
        if (code === 8)  e.layer = value;
        if (code === 10) e.vertices[0].x = parseFloat(value);
        if (code === 20) e.vertices[0].y = parseFloat(value);
        if (code === 11) e.vertices[1].x = parseFloat(value);
        if (code === 21) e.vertices[1].y = parseFloat(value);
    }
    return e;
}

// ── Utilities ──────────────────────────────────────────────────────────────────
function computeLayerBBox(ld) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const processVert = ({ x, y }) => {
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
    };
    ld.polylines.forEach(p => p.vertices.forEach(processVert));
    ld.points.forEach(processVert);
    if (!isFinite(minX)) return null;
    return { minX, minY, maxX, maxY };
}

// ── Coordinate transformation ─────────────────────────────────────────────────
const UNIT_SCALES = { mm: 0.001, cm: 0.01, m: 1.0, inch: 0.0254, ft: 0.3048 };

/**
 * dxfToProjectData(dxfResult, options) → { vertices, isClosed, columnPositions }
 *
 * options:
 *   boundaryLayer  — layer name for the boundary polygon
 *   columnLayer    — layer name for column positions (optional)
 *   unit           — 'mm' | 'cm' | 'm' | 'inch' | 'ft'
 *   autoCenter     — bool, center polygon around origin
 *   polylineIndex  — which polyline in the boundary layer to use (default: largest)
 */
export function dxfToProjectData(dxfResult, options = {}) {
    const {
        boundaryLayer,
        columnLayer,
        unit = 'm',
        autoCenter = true,
        polylineIndex = -1,   // -1 = pick largest
    } = options;

    const scale = UNIT_SCALES[unit] ?? 1.0;

    // ── Boundary polygon ──
    let vertices = [];
    let isClosed = false;

    if (boundaryLayer && dxfResult.layers[boundaryLayer]) {
        const polys = dxfResult.layers[boundaryLayer].polylines;
        let chosen = null;

        if (polylineIndex >= 0 && polylineIndex < polys.length) {
            chosen = polys[polylineIndex];
        } else if (polys.length > 0) {
            // Pick the polyline with the most vertices (likely the boundary)
            chosen = polys.reduce((best, p) =>
                p.vertices.length > (best?.vertices.length ?? 0) ? p : best, null);
        }

        if (chosen) {
            vertices = chosen.vertices.map(v => ({ x: v.x * scale, y: v.y * scale }));
            isClosed = chosen.closed || vertices.length >= 3;
        }
    }

    // ── Column positions ──
    let columnPositions = [];

    if (columnLayer && dxfResult.layers[columnLayer]) {
        const cd = dxfResult.layers[columnLayer];

        // POINT entities → direct column positions
        const fromPoints = cd.points.map((p, i) => ({
            id: `dxf-c-${i}`, x: p.x * scale, y: p.y * scale
        }));

        // Small closed polylines → centroids as column positions
        const fromPolys = cd.polylines
            .filter(p => p.closed || p.vertices.length === 1)
            .map((p, i) => {
                const c = centroid(p.vertices);
                return { id: `dxf-cp-${i}`, x: c.x * scale, y: c.y * scale };
            });

        columnPositions = [...fromPoints, ...fromPolys];
    }

    // ── Auto-center ──
    if (autoCenter && vertices.length > 0) {
        const c = centroid(vertices);
        vertices = vertices.map(v => ({ x: v.x - c.x, y: v.y - c.y }));
        columnPositions = columnPositions.map(cp => ({
            ...cp, x: cp.x - c.x, y: cp.y - c.y
        }));
    }

    return { vertices, isClosed, columnPositions };
}

// Compute polygon centroid
function centroid(verts) {
    if (verts.length === 0) return { x: 0, y: 0 };
    const sx = verts.reduce((s, v) => s + v.x, 0);
    const sy = verts.reduce((s, v) => s + v.y, 0);
    return { x: sx / verts.length, y: sy / verts.length };
}

// Compute polygon area (Shoelace formula) — returns signed area
export function polygonAreaDxf(verts) {
    let a = 0;
    for (let i = 0, j = verts.length - 1; i < verts.length; j = i++) {
        a += (verts[j].x + verts[i].x) * (verts[j].y - verts[i].y);
    }
    return Math.abs(a / 2);
}
