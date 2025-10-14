import { InferenceSession, Tensor } from 'onnxruntime-node';
import fs from 'fs';
import sharp from 'sharp';

let scrfdSession = null;
let arcfaceSession = null;
let osnetSession = null;

export async function getScrfd() {
  if (scrfdSession) return scrfdSession;
  const modelPath = process.env.SCRFD_MODEL_PATH || 'models/scrfd_person_2.5g.onnx';
  if (!fs.existsSync(modelPath)) throw new Error(`SCRFD model not found at ${modelPath}`);
  scrfdSession = await InferenceSession.create(modelPath);
  return scrfdSession;
}

export async function getArcface() {
  if (arcfaceSession) return arcfaceSession;
  const modelPath = process.env.ARCFACE_MODEL_PATH || 'models/arcface_r50.onnx';
  if (!fs.existsSync(modelPath)) throw new Error(`ArcFace model not found at ${modelPath}`);
  arcfaceSession = await InferenceSession.create(modelPath);
  return arcfaceSession;
}

export async function getOsnet() {
  if (osnetSession) return osnetSession;
  const modelPath = process.env.OSNET_MODEL_PATH || 'models/osnet_x0_25.onnx';
  if (!fs.existsSync(modelPath)) throw new Error(`OSNet model not found at ${modelPath}`);
  osnetSession = await InferenceSession.create(modelPath);
  return osnetSession;
}

export async function checkModelsHealth() {
  try {
    await getScrfd();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

function hwcToNchwFloat32BgrLetterbox(pixels, width, height) {
  // Convert HWC RGB uint8 -> NCHW BGR float32 normalized
  // Normalize to [0,1]. Some SCRFD variants expect mean/std; adjust if needed later.
  const chw = new Float32Array(3 * width * height);
  let idx = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const r = pixels[idx++];
      const g = pixels[idx++];
      const b = pixels[idx++];
      const pi = y * width + x;
      // B, G, R order
      chw[0 * width * height + pi] = b / 255;
      chw[1 * width * height + pi] = g / 255;
      chw[2 * width * height + pi] = r / 255;
    }
  }
  return chw;
}

export async function detectFacesScrfd(absImagePath) {
  try {
    const session = await getScrfd();
    const inputName = session.inputNames[0];
    const meta = await sharp(absImagePath).metadata();
    const origW = meta.width || 0;
    const origH = meta.height || 0;
    const target = 640;
    const scale = Math.min(target / Math.max(1, origW), target / Math.max(1, origH));
    const newW = Math.max(1, Math.round(origW * scale));
    const newH = Math.max(1, Math.round(origH * scale));
    const padX = Math.floor((target - newW) / 2);
    const padY = Math.floor((target - newH) / 2);

    const resized = await sharp(absImagePath)
      .resize(target, target, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 1 } })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const width = resized.info.width; // expect 640
    const height = resized.info.height; // expect 640
    const inputData = hwcToNchwFloat32BgrLetterbox(resized.data, width, height);
    const tensor = new Tensor('float32', inputData, [1, 3, height, width]);
    const outputs = await session.run({ [inputName]: tensor });
    const outEntries = Object.entries(outputs);
    try {
      const debug = outEntries.map(([name, t]) => ({ name, dims: t.dims, length: t.data?.length || 0 }));
      console.log('SCRFD outputs detail:', JSON.stringify(debug));
    } catch {}

    // Decode heads that may be either [1, H, W, C] or [G, C] with G=(H*W)
    const headsByStride = new Map(); // stride -> { score: {t, grid}, bbox: {t, grid}, kps?: {t, grid} }
    for (const [name, t] of outEntries) {
      const dims = t.dims || [];
      if (dims.length === 4) {
        const h = dims[1], w2 = dims[2], c = dims[3];
        if (!h || !w2) continue;
        const stride = Math.round(width / h); // width == height == 640
        const key = String(stride);
        if (!headsByStride.has(key)) headsByStride.set(key, {});
        const group = headsByStride.get(key);
        if (c === 1) group.score = { t, grid: { gh: h, gw: w2 } };
        else if (c === 4) group.bbox = { t, grid: { gh: h, gw: w2 } };
        else if (c === 10) group.kps = { t, grid: { gh: h, gw: w2 } };
      } else if (dims.length === 2) {
        const G = dims[0], c = dims[1];
        const gsize = Math.round(Math.sqrt(G));
        if (gsize * gsize !== G || gsize === 0) continue;
        const stride = Math.round(width / gsize);
        const key = String(stride);
        if (!headsByStride.has(key)) headsByStride.set(key, {});
        const group = headsByStride.get(key);
        if (c === 1) group.score = { t, grid: { gh: gsize, gw: gsize } };
        else if (c === 4) group.bbox = { t, grid: { gh: gsize, gw: gsize } };
        else if (c === 10) group.kps = { t, grid: { gh: gsize, gw: gsize } };
      }
    }

    const sigmoid = (x) => 1 / (1 + Math.exp(-x));
    const SCORE_THRESHOLD = parseFloat(process.env.DETECT_SCORE_THRESHOLD || '0.15');
    const MAX_CANDIDATES = 4000;
    const allCandidates = [];
    for (const [key, group] of Array.from(headsByStride.entries()).sort((a, b) => Number(a[0]) - Number(b[0]))) {
      const stride = Number(key);
      const sHead = group.score, bHead = group.bbox, kHead = group.kps;
      if (!sHead || !bHead) continue;
      const sh = sHead.grid.gh, sw = sHead.grid.gw;
      const scores = sHead.t.data; // length sh*sw*1
      const bbox = bHead.t.data;   // length sh*sw*4 in l,t,r,b
      const kps = kHead ? kHead.t.data : null; // length sh*sw*10 in (dx1,dy1,...,dx5,dy5)
      const total = sh * sw;

      // Debug score stats
      try {
        let maxS = -Infinity, minS = Infinity;
        for (let i = 0; i < total; i++) { const p = scores[i] ?? 0; const v = (p >= 0 && p <= 1) ? p : sigmoid(p); if (v > maxS) maxS = v; if (v < minS) minS = v; }
        console.log(`SCRFD stride=${stride} grid=${sw}x${sh} score[min,max]=[${minS.toFixed(4)},${maxS.toFixed(4)}]`);
      } catch {}

      const iou2d = (ax1, ay1, ax2, ay2, bx1, by1, bx2, by2) => {
        const ix1 = Math.max(ax1, bx1), iy1 = Math.max(ay1, by1);
        const ix2 = Math.min(ax2, bx2), iy2 = Math.min(ay2, by2);
        const iw = Math.max(0, ix2 - ix1), ih = Math.max(0, iy2 - iy1);
        const inter = iw * ih;
        const a = Math.max(0, ax2 - ax1) * Math.max(0, ay2 - ay1);
        const b = Math.max(0, bx2 - bx1) * Math.max(0, by2 - by1);
        const ua = a + b - inter;
        return ua > 0 ? inter / ua : 0;
      };
      const expandBox = (x1, y1, x2, y2, factor) => {
        const w = Math.max(0, x2 - x1), h = Math.max(0, y2 - y1);
        const cx = (x1 + x2) * 0.5, cy = (y1 + y2) * 0.5;
        const nw = w * factor, nh = h * factor;
        return [cx - nw / 2, cy - nh / 2, cx + nw / 2, cy + nh / 2];
      };

      for (let i = 0; i < total; i++) {
        const raw = scores[i] ?? 0;
        const prob = raw >= 0 && raw <= 1 ? raw : sigmoid(raw);
        if (prob < SCORE_THRESHOLD) continue;
        const l = bbox[i * 4 + 0];
        const t = bbox[i * 4 + 1];
        const r = bbox[i * 4 + 2];
        const b = bbox[i * 4 + 3];
        const row = Math.floor(i / sw);
        const col = i - row * sw;
        const cx = (col + 0.5) * stride;
        const cy = (row + 0.5) * stride;
        // Default distances in stride-scaled pixels (common for SCRFD)
        let x1 = cx - l * stride;
        let y1 = cy - t * stride;
        let x2 = cx + r * stride;
        let y2 = cy + b * stride;

        // Landmark-driven selection and tightening
        let origLandmarks = null;
        if (kps) {
          const kBase = i * 10;
          // Determine if landmark deltas look normalized (very small); if so, scale by stride
          let sampleDx = Math.abs(kps[kBase + 0]);
          let sampleDy = Math.abs(kps[kBase + 1]);
          const useStrideForKps = Math.max(sampleDx, sampleDy) < 2.5;
          const kpScale = useStrideForKps ? stride : 1;
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
          const pts = [];
          for (let k = 0; k < 5; k++) {
            const dx = kps[kBase + k * 2 + 0] * kpScale;
            const dy = kps[kBase + k * 2 + 1] * kpScale;
            const px = cx + dx, py = cy + dy;
            pts.push({ x: px, y: py });
            if (px < minX) minX = px; if (px > maxX) maxX = px; if (py < minY) minY = py; if (py > maxY) maxY = py;
          }
          // Derive a square face box from landmarks with small expansion (configurable)
          const expand = parseFloat(process.env.FACE_BOX_EXPAND || '1.15');
          const midX = (minX + maxX) * 0.5;
          const midY = (minY + maxY) * 0.5;
          const spanX = (maxX - minX);
          const spanY = (maxY - minY);
          const side = Math.max(8, Math.max(spanX, spanY) * expand);
          const half = side / 2;
          x1 = midX - half; y1 = midY - half; x2 = midX + half; y2 = midY + half;

          // Map landmarks to original image space
          origLandmarks = pts.map(p => ({
            x: (p.x - padX) / (scale || 1),
            y: (p.y - padY) / (scale || 1)
          }));
        }

        // Remove letterbox padding and scale back to original
        let left = (Math.min(x1, x2) - padX) / (scale || 1);
        let top = (Math.min(y1, y2) - padY) / (scale || 1);
        let right = (Math.max(x1, x2) - padX) / (scale || 1);
        let bottom = (Math.max(y1, y2) - padY) / (scale || 1);
        // Clamp
        left = Math.max(0, Math.min(left, origW));
        top = Math.max(0, Math.min(top, origH));
        right = Math.max(0, Math.min(right, origW));
        bottom = Math.max(0, Math.min(bottom, origH));
        const wBox = Math.max(0, right - left);
        const hBox = Math.max(0, bottom - top);
        if (wBox <= 1 || hBox <= 1) continue;
        // Optional aspect/area filter to prefer face-like boxes
        const aspect = wBox / Math.max(1e-6, hBox);
        const imgArea = origW * origH;
        const boxArea = wBox * hBox;
        const tooLarge = imgArea > 0 && (boxArea / imgArea) > 0.25; // drop if >25% of image
        if (tooLarge) continue;
        const scoreAdj = (aspect < 0.6 || aspect > 1.8) ? 0.9 : 1.0;
        allCandidates.push({ left, top, width: wBox, height: hBox, score: prob * scoreAdj, landmarks: origLandmarks });
        if (allCandidates.length >= MAX_CANDIDATES) break;
      }
      if (allCandidates.length >= MAX_CANDIDATES) break;
    }

    // Non-maximum suppression
    const iou = (a, b) => {
      const ax2 = a.left + a.width, ay2 = a.top + a.height;
      const bx2 = b.left + b.width, by2 = b.top + b.height;
      const ix1 = Math.max(a.left, b.left), iy1 = Math.max(a.top, b.top);
      const ix2 = Math.min(ax2, bx2), iy2 = Math.min(ay2, by2);
      const iw = Math.max(0, ix2 - ix1), ih = Math.max(0, iy2 - iy1);
      const inter = iw * ih;
      const ua = a.width * a.height + b.width * b.height - inter;
      return ua > 0 ? inter / ua : 0;
    };
    allCandidates.sort((a, b) => b.score - a.score);
    const selected = [];
    const NMS_IOU = 0.45;
    for (const cand of allCandidates) {
      let keep = true;
      for (const sel of selected) {
        if (iou(cand, sel) > NMS_IOU) { keep = false; break; }
      }
      if (keep) selected.push(cand);
      if (selected.length >= 300) break;
    }

    return selected;
  } catch (e) {
    console.error('SCRFD detect error:', e.message);
    return [];
  }
}

export async function detectPeopleInImage(absImagePath) {
  try {
    const meta = await sharp(absImagePath).metadata();
    const boxes = await detectFacesScrfd(absImagePath);
    return {
      boxes: boxes.map((b) => ({
        left: Math.round(b.left),
        top: Math.round(b.top),
        width: Math.round(b.width),
        height: Math.round(b.height),
        score: b.score || 0
      })),
      imageWidth: meta.width || 0,
      imageHeight: meta.height || 0
    };
  } catch (e) {
    return { boxes: [], imageWidth: 0, imageHeight: 0 };
  }
}


