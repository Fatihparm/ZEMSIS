/**
 * dxfParser.js — Robust ASCII DXF Parser for Jet Grout Projects
 * ──────────────────────────────────────────────────────────────
 * Supports: LWPOLYLINE, POLYLINE+VERTEX, LINE, CIRCLE, ARC, POINT, INSERT
 * No external dependencies — pure deterministic parsing.
 *
 * Output of parseDxf(): { layers, warnings, headerUnits }
 *   layers: { [layerName]: { polylines, circles, points, arcs, bbox, entityCount } }
 *   polyline: { vertices: [{x, y}], closed: boolean }
 *   circle:   { x, y, radius }
 *   point:    { x, y }
 *   arc:      { x, y, radius, startAngle, endAngle }
 */

// ── Known layer conventions (case-sensitive) ──────────────────────────────────
// Users tag relevant geometry in AutoCAD with these exact layer names.
// Both Turkish and English variants are recognised.
const BOUNDARY_LAYERS = ['JET_ZEMIN', 'JET_BOUNDARY'];   // closed polylines = zemin sınırı
const COLUMN_LAYERS   = ['JET_KOLON', 'JET_COLUMNS'];    // circles = jet grout kolonları

// ── Entry point ────────────────────────────────────────────────────────────────
export function parseDxf(text) {
    const warnings = [];

    // Normalise line endings, remove BOM
    const normalised = text
        .replace(/\uFEFF/, '')
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n');
    const rawLines = normalised.split('\n');

    // Build (code, value) pair array
    const pairs = [];
    let i = 0;
    while (i < rawLines.length - 1) {
        const codeLine = rawLines[i].trim();
        const valueLine = rawLines[i + 1].trim();
        if (codeLine === '') { i++; continue; }
        const code = parseInt(codeLine, 10);
        if (!isNaN(code)) {
            pairs.push([code, valueLine]);
            i += 2; // consume code + value
        } else {
            i++;
        }
    }

    // ── Try to read $INSUNITS from HEADER section ──
    let headerUnits = null;
    for (let pi = 0; pi < pairs.length; pi++) {
        const [code, value] = pairs[pi];
        if (code === 0 && value === 'ENDSEC') break; // past HEADER
        if (code === 9 && value === '$INSUNITS') {
            if (pi + 1 < pairs.length && pairs[pi + 1][0] === 70) {
                const unitCode = parseInt(pairs[pi + 1][1], 10);
                // AutoCAD unit codes: 1=inches, 2=feet, 4=mm, 5=cm, 6=m
                const MAP = { 1: 'inch', 2: 'ft', 4: 'mm', 5: 'cm', 6: 'm' };
                headerUnits = MAP[unitCode] || null;
            }
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
        return { layers: {}, warnings, headerUnits };
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
                const [entity, newPi] = parsePolyline(entityPairs, pairs, pi);
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
        if (!layers[lname]) {
            layers[lname] = { polylines: [], circles: [], points: [], arcs: [] };
        }
        if (e.type === 'poly')   layers[lname].polylines.push({ vertices: e.vertices, closed: e.closed });
        if (e.type === 'circle') layers[lname].circles.push({ x: e.x, y: e.y, radius: e.radius });
        if (e.type === 'point')  layers[lname].points.push({ x: e.x, y: e.y });
        if (e.type === 'arc')    layers[lname].arcs.push({ x: e.x, y: e.y, radius: e.radius, startAngle: e.startAngle, endAngle: e.endAngle });
    }

    // Compute bounding box per layer for info
    for (const ld of Object.values(layers)) {
        ld.bbox = computeLayerBBox(ld);
        ld.entityCount = ld.polylines.length + ld.circles.length + ld.points.length + ld.arcs.length;
    }

    return { layers, warnings, headerUnits };
}

// ── Entity dispatcher ──────────────────────────────────────────────────────────
function parseEntity(type, pairs) {
    switch (type) {
        case 'LWPOLYLINE': return parseLwPolyline(pairs);
        case 'CIRCLE':     return parseCircle(pairs);
        case 'ARC':        return parseArc(pairs);
        case 'POINT':      return parsePoint(pairs);
        case 'INSERT':     return parsePoint(pairs); // block insert → treat center as point
        case 'LINE':       return parseLine(pairs);
        default:           return null; // TEXT, MTEXT, HATCH, DIMENSION, etc. — skip
    }
}

// ── LWPOLYLINE ─────────────────────────────────────────────────────────────────
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
function parsePolyline(headerPairs, allPairs, pi) {
    const e = { type: 'poly', layer: '0', vertices: [], closed: false };

    for (const [code, value] of headerPairs) {
        if (code === 8)  e.layer  = value;
        if (code === 70) e.closed = (parseInt(value, 10) & 1) === 1;
    }

    while (pi < allPairs.length) {
        const [code, value] = allPairs[pi];
        if (code !== 0) { pi++; continue; }

        if (value === 'SEQEND') {
            pi++;
            while (pi < allPairs.length && allPairs[pi][0] !== 0) pi++;
            break;
        }

        if (value !== 'VERTEX') break;

        pi++;
        let vx = 0, vy = 0, vflags = 0;
        while (pi < allPairs.length && allPairs[pi][0] !== 0) {
            const [vc, vv] = allPairs[pi];
            if (vc === 10) vx = parseFloat(vv);
            if (vc === 20) vy = parseFloat(vv);
            if (vc === 70) vflags = parseInt(vv, 10);
            pi++;
        }
        if (!(vflags & 16) && !(vflags & 32)) {
            e.vertices.push({ x: vx, y: vy });
        }
    }

    return [e.vertices.length >= 2 ? e : null, pi];
}

// ── CIRCLE ─────────────────────────────────────────────────────────────────────
function parseCircle(pairs) {
    const e = { type: 'circle', layer: '0', x: 0, y: 0, radius: 0 };
    for (const [code, value] of pairs) {
        if (code === 8)  e.layer  = value;
        if (code === 10) e.x      = parseFloat(value);
        if (code === 20) e.y      = parseFloat(value);
        if (code === 40) e.radius = parseFloat(value);
    }
    return e.radius > 0 ? e : null;
}

// ── ARC ────────────────────────────────────────────────────────────────────────
function parseArc(pairs) {
    const e = { type: 'arc', layer: '0', x: 0, y: 0, radius: 0, startAngle: 0, endAngle: 360 };
    for (const [code, value] of pairs) {
        if (code === 8)  e.layer      = value;
        if (code === 10) e.x          = parseFloat(value);
        if (code === 20) e.y          = parseFloat(value);
        if (code === 40) e.radius     = parseFloat(value);
        if (code === 50) e.startAngle = parseFloat(value);
        if (code === 51) e.endAngle   = parseFloat(value);
    }
    return e.radius > 0 ? e : null;
}

// ── POINT ──────────────────────────────────────────────────────────────────────
function parsePoint(pairs) {
    const e = { type: 'point', layer: '0', x: 0, y: 0 };
    for (const [code, value] of pairs) {
        if (code === 8)  e.layer = value;
        if (code === 10) e.x = parseFloat(value);
        if (code === 20) e.y = parseFloat(value);
    }
    return e;
}

// ── LINE → open polyline with 2 vertices ───────────────────────────────────────
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
    ld.circles.forEach(c => {
        processVert({ x: c.x - c.radius, y: c.y - c.radius });
        processVert({ x: c.x + c.radius, y: c.y + c.radius });
    });
    ld.points.forEach(processVert);
    ld.arcs.forEach(a => processVert({ x: a.x, y: a.y }));
    if (!isFinite(minX)) return null;
    return { minX, minY, maxX, maxY };
}

// Compute polygon area (Shoelace formula) — returns unsigned area
function shoelaceArea(verts) {
    let a = 0;
    for (let i = 0, j = verts.length - 1; i < verts.length; j = i++) {
        a += (verts[j].x + verts[i].x) * (verts[j].y - verts[i].y);
    }
    return Math.abs(a / 2);
}

// Compute polygon centroid
function centroid(verts) {
    if (verts.length === 0) return { x: 0, y: 0 };
    const sx = verts.reduce((s, v) => s + v.x, 0);
    const sy = verts.reduce((s, v) => s + v.y, 0);
    return { x: sx / verts.length, y: sy / verts.length };
}

// ── Unit scale factors to metres ──
const UNIT_SCALES = { mm: 0.001, cm: 0.01, m: 1.0, inch: 0.0254, ft: 0.3048 };

/**
 * Guess unit from circle radii — jet grout columns are typically D=0.3–2.0 m.
 * So radius in metres = 0.15–1.0, in cm = 15–100, in mm = 150–1000.
 */
function guessUnitFromCircles(circles) {
    if (circles.length === 0) return null;
    // Find the most common radius
    const rCounts = {};
    for (const c of circles) {
        const r = Math.round(c.radius * 100) / 100;
        rCounts[r] = (rCounts[r] || 0) + 1;
    }
    const mostCommonR = parseFloat(
        Object.entries(rCounts).sort((a, b) => b[1] - a[1])[0][0]
    );

    // Jet grout typical diameter range: 0.3m – 2.0m → radius 0.15–1.0m
    if (mostCommonR >= 0.1 && mostCommonR <= 1.5) return 'm';
    if (mostCommonR >= 10 && mostCommonR <= 150)   return 'cm';
    if (mostCommonR >= 100 && mostCommonR <= 1500)  return 'mm';
    // Fallback: if radius > 1.5 and < 10, ambiguous — assume cm
    if (mostCommonR > 1.5 && mostCommonR < 10) return 'cm';
    return 'cm'; // safe default for engineering drawings
}

/**
 * Fallback: guess unit from coordinate range.
 */
function guessUnitFromCoords(bbox) {
    if (!bbox) return 'm';
    const maxDim = Math.max(bbox.maxX - bbox.minX, bbox.maxY - bbox.minY);
    if (maxDim > 100000) return 'mm';
    if (maxDim > 500)    return 'cm';
    return 'm';
}

// ── Phase 1: Extract candidates for UI selection ──────────────────────────────
/**
 * dxfExtractCandidates(dxfResult)
 *
 * Smart layer detection:
 *   - If JET_ZEMIN / JET_BOUNDARY layer exists → only those polylines
 *   - If JET_KOLON / JET_COLUMNS  layer exists → only those circles
 *   - Otherwise → fallback to all layers (manual mode)
 *
 * Returns:
 *   { polylineCandidates, allCircles, unit, columnDiameter,
 *     mode,                    // 'smart' | 'manual'
 *     detectedBoundaryLayer,   // matched layer name or null
 *     detectedColumnLayer,     // matched layer name or null
 *     availableLayers }        // all layer names in file (for manual filter)
 */
export function dxfExtractCandidates(dxfResult) {
    const allLayers = dxfResult.layers;
    const layerNames = Object.keys(allLayers);

    // ── Detect known convention layers (case-sensitive exact match) ──
    const detectedBoundaryLayer = layerNames.find(n => BOUNDARY_LAYERS.includes(n)) || null;
    const detectedColumnLayer   = layerNames.find(n => COLUMN_LAYERS.includes(n))   || null;
    const isSmartMode = !!(detectedBoundaryLayer || detectedColumnLayer);

    // ── Determine which layers to scan for polylines ──
    const polySourceLayers = detectedBoundaryLayer
        ? [detectedBoundaryLayer]
        : layerNames; // fallback: all

    // ── Determine which layers to scan for circles ──
    const circleSourceLayers = detectedColumnLayer
        ? [detectedColumnLayer]
        : layerNames; // fallback: all

    // ── Collect closed polylines from relevant layers ──
    const polylineCandidates = [];
    let polyId = 0;
    for (const lname of polySourceLayers) {
        const ld = allLayers[lname];
        if (!ld) continue;
        for (const poly of ld.polylines) {
            if (poly.closed && poly.vertices.length >= 3) {
                const area = shoelaceArea(poly.vertices);
                const bbox = polyBBox(poly.vertices);
                polylineCandidates.push({
                    id: polyId++,
                    vertices: poly.vertices,
                    closed: poly.closed,
                    layer: lname,
                    area,
                    bbox,
                    vertexCount: poly.vertices.length,
                });
            }
        }
    }

    // Sort by area descending
    polylineCandidates.sort((a, b) => b.area - a.area);

    // ── Collect circles from relevant layers ──
    const allCircles = [];
    for (const lname of circleSourceLayers) {
        const ld = allLayers[lname];
        if (!ld) continue;
        for (const c of ld.circles) {
            allCircles.push({ ...c, layer: lname });
        }
    }

    // ── Determine unit ──
    let unit = dxfResult.headerUnits;
    if (!unit && allCircles.length > 0) {
        unit = guessUnitFromCircles(allCircles);
    }
    if (!unit && polylineCandidates.length > 0) {
        unit = guessUnitFromCoords(polylineCandidates[0].bbox);
    }
    unit = unit || 'cm';

    // ── Column diameter from circles ──
    let columnDiameter = null;
    if (allCircles.length > 0) {
        const rCounts = {};
        for (const c of allCircles) {
            const r = Math.round(c.radius * 1000) / 1000;
            rCounts[r] = (rCounts[r] || 0) + 1;
        }
        const mostCommonR = parseFloat(
            Object.entries(rCounts).sort((a, b) => b[1] - a[1])[0][0]
        );
        const scale = UNIT_SCALES[unit] ?? 1.0;
        columnDiameter = mostCommonR * 2 * scale;
    }

    // ── Build per-layer summary for manual filter UI ──
    const availableLayers = layerNames.map(name => {
        const ld = allLayers[name];
        return {
            name,
            polylineCount: ld.polylines.filter(p => p.closed && p.vertices.length >= 3).length,
            circleCount: ld.circles.length,
            entityCount: ld.entityCount,
        };
    }).filter(l => l.polylineCount > 0 || l.circleCount > 0);

    return {
        polylineCandidates,
        allCircles,
        unit,
        columnDiameter,
        mode: isSmartMode ? 'smart' : 'manual',
        detectedBoundaryLayer,
        detectedColumnLayer,
        availableLayers,
    };
}

// Helper: compute bounding box for a vertex array
function polyBBox(verts) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const v of verts) {
        if (v.x < minX) minX = v.x;
        if (v.x > maxX) maxX = v.x;
        if (v.y < minY) minY = v.y;
        if (v.y > maxY) maxY = v.y;
    }
    return { minX, minY, maxX, maxY };
}

// ── Phase 2: Build final project data from user selection ─────────────────────
/**
 * buildProjectData(candidates, selectedPolyId, options) → { vertices, isClosed, columnPositions, columnDiameter, unit }
 *
 * Takes the user's boundary selection (or null for columns-only) and builds
 * the final data to import into PlanView.
 */
export function buildProjectData(candidates, selectedPolyIds = [], options = {}) {
    const { autoCenter = true } = options;
    const { polylineCandidates, allCircles, unit, columnDiameter } = candidates;
    const scale = UNIT_SCALES[unit] ?? 1.0;

    // ── Build polygons ──
    let polygons = [];
    if (Array.isArray(selectedPolyIds) && selectedPolyIds.length > 0) {
        polygons = polylineCandidates
            .filter(p => selectedPolyIds.includes(p.id))
            .map((p, idx) => ({
                id: `poly-dxf-${Date.now()}-${idx}`,
                vertices: p.vertices.map(v => ({ x: v.x * scale, y: v.y * scale })),
                isClosed: true
            }));
    } else if (selectedPolyIds !== null && selectedPolyIds !== undefined && !Array.isArray(selectedPolyIds)) {
        // Fallback for single ID (legacy)
        const selected = polylineCandidates.find(p => p.id === selectedPolyIds);
        if (selected) {
            polygons.push({
                id: `poly-dxf-${Date.now()}`,
                vertices: selected.vertices.map(v => ({ x: v.x * scale, y: v.y * scale })),
                isClosed: true
            });
        }
    }

    // ── Build column positions from ALL circles ──
    let columnPositions = allCircles.map((c, i) => ({
        id: `dxf-col-${i}`,
        x: c.x * scale,
        y: c.y * scale,
    }));

    // ── Auto-center around columns or boundary ──
    if (autoCenter) {
        const allPts = [...polygons.flatMap(p => p.vertices), ...columnPositions];
        if (allPts.length > 0) {
            const c = centroid(allPts);
            polygons = polygons.map(poly => ({
                ...poly,
                vertices: poly.vertices.map(v => ({ x: v.x - c.x, y: v.y - c.y }))
            }));
            columnPositions = columnPositions.map(cp => ({
                ...cp, x: cp.x - c.x, y: cp.y - c.y,
            }));
        }
    }

    // Fallback for backward compatibility
    const firstPoly = polygons[0] || { vertices: [], isClosed: false };

    return { 
        polygons,
        vertices: firstPoly.vertices, 
        isClosed: firstPoly.isClosed, 
        columnPositions, 
        columnDiameter, 
        unit 
    };
}

// Legacy wrapper — kept for backward compatibility
export function dxfToProjectData(dxfResult, options = {}) {
    const candidates = dxfExtractCandidates(dxfResult);
    // Auto-pick largest polyline as boundary (legacy behavior)
    const selectedId = candidates.polylineCandidates.length > 0
        ? candidates.polylineCandidates[0].id
        : null;
    return buildProjectData(candidates, selectedId, options);
}

// Re-export for backward compat
export function polygonAreaDxf(verts) {
    return shoelaceArea(verts);
}
