/**
 * Recorte responsivo: a mesma matemática do MangaTeofilo (`utils/responsiveCrop.js`),
 * trazida para o MangaNetWorking.
 *
 * <p>Princípio: o ajuste é `{ zoom, x, y }` com `x`/`y` em **percentual** (-100..100). A
 * imagem é desenhada "cover" (cobre o quadro inteiro) e o arrasto move em **todos os eixos**
 * até o limite real de cada eixo — por isso o preview e o arquivo salvo são idênticos: o
 * canvas usa a mesma geometria que o CSS.</p>
 */

export interface CropAdjustment {
  /** 1 = a imagem cobre o quadro; maior = aproxima. */
  zoom: number;
  /** Deslocamento horizontal em percentual do limite do eixo (-100..100). */
  x: number;
  /** Deslocamento vertical em percentual do limite do eixo (-100..100). */
  y: number;
}

export interface CropDimensions {
  w: number;
  h: number;
}

export interface CropGeometry {
  drawW: number;
  drawH: number;
  drawX: number;
  drawY: number;
  limitX: number;
  limitY: number;
  offsetX: number;
  offsetY: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function normalizeCropAdjustment(
  raw: Partial<CropAdjustment> | null | undefined,
  maxZoom = 6
): CropAdjustment {
  return {
    zoom: clamp(Number(raw?.zoom ?? 1), 1, maxZoom),
    x: clamp(Number(raw?.x ?? 0), -100, 100),
    y: clamp(Number(raw?.y ?? 0), -100, 100),
  };
}

/** Limites de zoom: o mínimo cobre o quadro; o máximo dá folga para enquadrar. */
export function getCropZoomBounds(
  dimensions: CropDimensions,
  frameW: number,
  frameH: number,
  maxZoomCap = 6
): { minZoom: number; maxZoom: number; coverZoom: number } {
  const w = Number(dimensions?.w || 0);
  const h = Number(dimensions?.h || 0);
  const safeFrameW = Math.max(1, Number(frameW || 0));
  const safeFrameH = Math.max(1, Number(frameH || 0));
  if (!w || !h) {
    return { minZoom: 1, maxZoom: 3, coverZoom: 1 };
  }
  const fitScale = Math.min(safeFrameW / w, safeFrameH / h);
  const coverScale = Math.max(safeFrameW / w, safeFrameH / h);
  const coverZoom = fitScale > 0 ? coverScale / fitScale : 1;
  return {
    minZoom: 1,
    maxZoom: Number(clamp(Math.max(3, coverZoom * 1.75), 3, maxZoomCap).toFixed(2)),
    coverZoom: Number(coverZoom.toFixed(2)),
  };
}

/** Geometria do desenho: a mesma para o CSS (preview) e para o canvas (arquivo salvo). */
export function computeCropGeometry(
  imgW: number,
  imgH: number,
  frameW: number,
  frameH: number,
  adjustment: Partial<CropAdjustment> | null | undefined,
  maxZoomCap = 6
): CropGeometry {
  const safeImgW = Number(imgW || 0);
  const safeImgH = Number(imgH || 0);
  const safeFrameW = Math.max(1, Number(frameW || 0));
  const safeFrameH = Math.max(1, Number(frameH || 0));
  if (!safeImgW || !safeImgH) {
    return { drawW: safeFrameW, drawH: safeFrameH, drawX: 0, drawY: 0, limitX: 0, limitY: 0, offsetX: 0, offsetY: 0 };
  }

  const { maxZoom } = getCropZoomBounds({ w: safeImgW, h: safeImgH }, safeFrameW, safeFrameH, maxZoomCap);
  const ajuste = normalizeCropAdjustment(adjustment, maxZoom);
  const fitScale = Math.min(safeFrameW / safeImgW, safeFrameH / safeImgH);
  const scale = fitScale * ajuste.zoom;
  const drawW = safeImgW * scale;
  const drawH = safeImgH * scale;
  const limitX = Math.abs(drawW - safeFrameW) / 2;
  const limitY = Math.abs(drawH - safeFrameH) / 2;
  const offsetX = limitX > 0 ? (ajuste.x / 100) * limitX : 0;
  const offsetY = limitY > 0 ? (ajuste.y / 100) * limitY : 0;

  return {
    drawW,
    drawH,
    drawX: (safeFrameW - drawW) / 2 + offsetX,
    drawY: (safeFrameH - drawH) / 2 + offsetY,
    limitX,
    limitY,
    offsetX,
    offsetY,
  };
}

/** Estilo do preview (percentual do quadro) — espelha o canvas. */
export function buildCropStyle(
  dimensions: CropDimensions,
  adjustment: Partial<CropAdjustment> | null | undefined,
  frameW: number,
  frameH: number,
  maxZoomCap = 6
): React.CSSProperties {
  const w = Number(dimensions?.w || 0);
  const h = Number(dimensions?.h || 0);
  if (!w || !h) return {};
  const geometry = computeCropGeometry(w, h, frameW, frameH, adjustment, maxZoomCap);
  return {
    width: `${(geometry.drawW / frameW) * 100}%`,
    height: `${(geometry.drawH / frameH) * 100}%`,
    left: `${(geometry.drawX / frameW) * 100}%`,
    top: `${(geometry.drawY / frameH) * 100}%`,
  };
}

/** Desenha o recorte no canvas com a MESMA geometria do preview. */
export function drawCropToCanvas(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  targetW: number,
  targetH: number,
  adjustment: Partial<CropAdjustment> | null | undefined,
  maxZoomCap = 6
): void {
  const safeTargetW = Math.max(1, Number(targetW || 0));
  const safeTargetH = Math.max(1, Number(targetH || 0));
  const geometry = computeCropGeometry(
    Number(image?.naturalWidth || image?.width || 0),
    Number(image?.naturalHeight || image?.height || 0),
    safeTargetW,
    safeTargetH,
    adjustment,
    maxZoomCap
  );

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, geometry.drawX, geometry.drawY, geometry.drawW, geometry.drawH);
}

/** Estado do arrasto: os limites reais de cada eixo no momento do gesto. */
export function createDragSnapshot(
  dimensions: CropDimensions,
  frameW: number,
  frameH: number,
  adjustment: Partial<CropAdjustment> | null | undefined,
  maxZoomCap = 6
): { limitX: number; limitY: number; offsetX: number; offsetY: number } {
  const geometry = computeCropGeometry(
    dimensions.w,
    dimensions.h,
    frameW,
    frameH,
    adjustment,
    maxZoomCap
  );
  return {
    limitX: geometry.limitX,
    limitY: geometry.limitY,
    offsetX: geometry.offsetX,
    offsetY: geometry.offsetY,
  };
}

/** Aplica o delta do arraste (em pixels) mantendo o percentual de cada eixo. */
export function applyDragDelta(
  adjustment: CropAdjustment,
  snapshot: { limitX: number; limitY: number; offsetX: number; offsetY: number },
  deltaX: number,
  deltaY: number,
  maxZoomCap = 6
): CropAdjustment {
  const nextOffsetX =
    snapshot.limitX > 0 ? clamp(snapshot.offsetX + deltaX, -snapshot.limitX, snapshot.limitX) : 0;
  const nextOffsetY =
    snapshot.limitY > 0 ? clamp(snapshot.offsetY + deltaY, -snapshot.limitY, snapshot.limitY) : 0;
  const nextX = snapshot.limitX > 0 ? (nextOffsetX / snapshot.limitX) * 100 : 0;
  const nextY = snapshot.limitY > 0 ? (nextOffsetY / snapshot.limitY) * 100 : 0;
  return normalizeCropAdjustment({ ...adjustment, x: nextX, y: nextY }, maxZoomCap);
}

/** Carrega uma imagem de arquivo (objectURL) para o canvas. */
export function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Não foi possível ler a imagem.'));
    };
    image.src = url;
  });
}

/**
 * Carrega uma imagem já hospedada (mesma origem) para o canvas.
 * Mesma origem evita "tainted canvas" — o preview e o arquivo salvo saem iguais.
 */
export function loadImageFromUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    if (!url) {
      reject(new Error('URL vazia.'));
      return;
    }
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Não foi possível carregar a imagem.'));
    image.src = url;
  });
}
