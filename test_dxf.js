import fs from 'fs';
import { parseDxf, dxfExtractCandidates } from './frontend/src/utils/dxfParser.js';

const text = fs.readFileSync('./örnek 1YENI.dxf', 'utf-8');
const result = parseDxf(text);
const cands = dxfExtractCandidates(result);

console.log('--- Mode:', cands.mode);
console.log('--- Detected boundary layer:', cands.detectedBoundaryLayer);
console.log('--- Detected column layer:', cands.detectedColumnLayer);
console.log('--- polylines in JET_ZEMIN:', result.layers['JET_ZEMIN'] ? result.layers['JET_ZEMIN'].polylines.map(p => ({v: p.vertices.length, closed: p.closed, first: p.vertices[0], last: p.vertices[p.vertices.length-1]})) : 'not found');
console.log('--- polylineCandidates:', cands.polylineCandidates.length);
console.log('--- circles:', cands.allCircles.length);
