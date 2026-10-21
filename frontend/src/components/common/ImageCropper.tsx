import { useEffect, useRef, useState } from 'react';
import { Crop, Minus, Plus, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { Win } from '../ui/Win';
import {
  applyDragDelta,
  buildCropStyle,
  createDragSnapshot,
  CropAdjustment,
  drawCropToCanvas,
  getCropZoomBounds,
  loadImageFromFile,
  loadImageFromUrl,
} from '../../utils/responsiveCrop';

/**
 * Editor de recorte de imagem (avatar, capa e banner).
 *
 * <p>Usa a mesma matemática do MangaTeofilo (`utils/responsiveCrop.js`): o quadro mostra a
 * imagem inteira em modo "cover" e o arrasto move em <strong>todos os eixos</strong> (cima,
 * baixo, esquerda e direita) até o limite real de cada eixo. O preview é desenhado no canvas
 * com a mesma geometria do arquivo salvo — o que você vê é o que é gravado.</p>
 *
 * <p>Quando a origem é uma <strong>URL</strong> (a foto que já está no perfil), o recorte é
 * refeito a partir dela: a pessoa reajusta sem subir um arquivo novo.</p>
 */
export interface ImageCropperProps {
  /** Arquivo escolhido (ou undefined quando a origem é a URL). */
  file?: File | null;
  /** URL da imagem já hospedada (para reajustar sem subir arquivo novo). */
  sourceUrl?: string | null;
  /** Largura/altura do arquivo final. */
  outputWidth: number;
  outputHeight: number;
  /** Texto do botão de confirmação. */
  confirmLabel?: string;
  busy?: boolean;
  error?: string | null;
  onCancel: () => void;
  onConfirm: (cropped: Blob) => void | Promise<void>;
}

export function ImageCropper({
  file,
  sourceUrl,
  outputWidth,
  outputHeight,
  confirmLabel = 'USAR ESTA FOTO',
  busy = false,
  error = null,
  onCancel,
  onConfirm,
}: ImageCropperProps) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [adjustment, setAdjustment] = useState<CropAdjustment>({ zoom: 1, x: 0, y: 0 });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const dragOrigin = useRef<{ pointerX: number; pointerY: number; snapshot: ReturnType<typeof createDragSnapshot> } | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState(false);

  // O quadro de trabalho: o tamanho real do elemento define a geometria (responsivo).
  const [frameSize, setFrameSize] = useState({ width: 320, height: 320 });
  useEffect(() => {
    const element = frameRef.current;
    if (!element) return;
    const update = () => {
      const rect = element.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setFrameSize({ width: rect.width, height: rect.height });
      }
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [image]);

  // Carrega a imagem (arquivo novo ou a que ja está no perfil).
  useEffect(() => {
    let cancelled = false;
    const source = file ? loadImageFromFile(file) : sourceUrl ? loadImageFromUrl(sourceUrl) : Promise.reject(new Error('Sem imagem.'));
    source
      .then((loaded) => {
        if (cancelled) return;
        setImage(loaded);
        setLoadError(null);
        const bounds = getCropZoomBounds(
          { w: loaded.naturalWidth, h: loaded.naturalHeight },
          outputWidth,
          outputHeight
        );
        setAdjustment({ zoom: bounds.coverZoom, x: 0, y: 0 });
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err?.message || 'Não foi possível carregar a imagem.');
      });
    return () => {
      cancelled = true;
    };
  }, [file, sourceUrl, outputWidth, outputHeight]);

  // O preview é o proprio canvas salvo: o que aparece é o que vai para o servidor.
  useEffect(() => {
    if (!image) return;
    const canvas = document.createElement('canvas');
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.fillStyle = '#0B0B0C';
    context.fillRect(0, 0, outputWidth, outputHeight);
    drawCropToCanvas(context, image, outputWidth, outputHeight, adjustment);
    setPreviewUrl(canvas.toDataURL('image/jpeg', 0.9));
  }, [image, adjustment, outputWidth, outputHeight]);

  const maxZoom = image
    ? getCropZoomBounds(
        { w: image.naturalWidth, h: image.naturalHeight },
        outputWidth,
        outputHeight
      ).maxZoom
    : 3;

  const onPointerDown = (event: React.PointerEvent) => {
    if (!image) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
    dragOrigin.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      snapshot: createDragSnapshot(
        { w: image.naturalWidth, h: image.naturalHeight },
        frameSize.width,
        frameSize.height,
        adjustment,
        maxZoom
      ),
    };
  };

  const onPointerMove = (event: React.PointerEvent) => {
    const origin = dragOrigin.current;
    if (!origin) return;
    const deltaX = event.clientX - origin.pointerX;
    const deltaY = event.clientY - origin.pointerY;
    setAdjustment((current) => applyDragDelta(current, origin.snapshot, deltaX, deltaY, maxZoom));
  };

  const onPointerUp = () => {
    setDragging(false);
    dragOrigin.current = null;
  };

  /** Teclado: as setas movem o recorte (acessibilidade da regua 12 da identidade visual). */
  const onKeyDown = (event: React.KeyboardEvent) => {
    if (!image) return;
    const step = event.shiftKey ? 24 : 8;
    const moves: Record<string, { x: number; y: number }> = {
      ArrowLeft: { x: -step, y: 0 },
      ArrowRight: { x: step, y: 0 },
      ArrowUp: { x: 0, y: -step },
      ArrowDown: { x: 0, y: step },
    };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    const snapshot = createDragSnapshot(
      { w: image.naturalWidth, h: image.naturalHeight },
      frameSize.width,
      frameSize.height,
      adjustment,
      maxZoom
    );
    setAdjustment((current) => applyDragDelta(current, snapshot, move.x, move.y, maxZoom));
  };

  const confirm = async () => {
    if (!image) return;
    const canvas = document.createElement('canvas');
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.fillStyle = '#0B0B0C';
    context.fillRect(0, 0, outputWidth, outputHeight);
    drawCropToCanvas(context, image, outputWidth, outputHeight, adjustment);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
    if (blob) await onConfirm(blob);
  };

  const style = image
    ? buildCropStyle(
        { w: image.naturalWidth, h: image.naturalHeight },
        adjustment,
        frameSize.width,
        frameSize.height,
        maxZoom
      )
    : {};

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Ajustar imagem"
      className="fixed inset-0 z-[130] bg-black/85 flex items-center justify-center p-4"
    >
      <div className="w-full max-w-lg">
        <Win title="AJUSTAR IMAGEM.EXE">
          <div className="space-y-4">
            <p className="font-body text-xs text-[var(--mn-mute)]">
              Arraste a imagem para enquadrar (funciona nos quatro eixos) ou use as setas do teclado. O
              preview é exatamente o que será gravado.
            </p>

            {loadError && (
              <p role="alert" className="font-body text-xs text-[var(--mn-red)]">
                {loadError}
              </p>
            )}

            <div className="flex flex-col items-center gap-3">
              <div className="flex flex-wrap items-start justify-center gap-4">
                <div
                  ref={frameRef}
                  tabIndex={0}
                  role="application"
                  aria-label="Área de recorte: use as setas do teclado para mover a imagem"
                  onKeyDown={onKeyDown}
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerCancel={onPointerUp}
                  className={`relative overflow-hidden border-2 border-[var(--mn-yellow)] bg-[#0B0B0C] select-none ${
                    dragging ? 'cursor-grabbing' : 'cursor-grab'
                  }`}
                  style={{
                    width: outputWidth > outputHeight ? 360 : Math.min(320, 360 * (outputWidth / outputHeight)),
                    height: outputHeight > outputWidth ? 360 : Math.min(320, 360 * (outputHeight / outputWidth)),
                    maxHeight: 420,
                    aspectRatio: `${outputWidth} / ${outputHeight}`,
                    touchAction: 'none',
                  }}
                >
                  {image && (
                    <img
                      src={image.src}
                      alt="Pré-visualização da imagem em recorte"
                      draggable={false}
                      className="absolute max-w-none select-none"
                      style={style}
                    />
                  )}
                </div>

                {/* O preview é o próprio canvas gravado: o que aparece é o que será salvo. */}
                {previewUrl && (
                  <figure className="space-y-1">
                    <img
                      src={previewUrl}
                      alt="Resultado do recorte"
                      className="border-2 border-[var(--mn-line)] bg-[#0B0B0C]"
                      style={{ maxHeight: 180, maxWidth: 180 }}
                    />
                    <figcaption className="font-pixel text-[10px] uppercase text-[var(--mn-mute)]">
                      Como vai ficar
                    </figcaption>
                  </figure>
                )}
              </div>

              <div className="w-full flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setAdjustment((current) => ({ ...current, zoom: Math.max(1, current.zoom - 0.1) }))}
                  className="p-2 border-2 border-[var(--mn-line)] text-[var(--mn-paper)] hover:border-[var(--mn-yellow)]"
                  aria-label="Diminuir o zoom"
                >
                  <Minus size={14} />
                </button>
                <label htmlFor="crop-zoom" className="font-pixel text-[11px] uppercase text-[var(--mn-mute)]">
                  ZOOM
                </label>
                <input
                  id="crop-zoom"
                  type="range"
                  min={1}
                  max={maxZoom}
                  step={0.05}
                  value={adjustment.zoom}
                  onChange={(event) => setAdjustment((current) => ({ ...current, zoom: Number(event.target.value) }))}
                  className="flex-1 accent-[var(--mn-yellow)]"
                />
                <button
                  type="button"
                  onClick={() => setAdjustment((current) => ({ ...current, zoom: Math.min(maxZoom, current.zoom + 0.1) }))}
                  className="p-2 border-2 border-[var(--mn-line)] text-[var(--mn-paper)] hover:border-[var(--mn-yellow)]"
                  aria-label="Aumentar o zoom"
                >
                  <Plus size={14} />
                </button>
              </div>

              {error && (
                <p role="alert" className="font-body text-xs text-[var(--mn-red)]">
                  {error}
                </p>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setAdjustment({ zoom: image ? getCropZoomBounds({ w: image.naturalWidth, h: image.naturalHeight }, outputWidth, outputHeight).coverZoom : 1, x: 0, y: 0 })}
                >
                  <Crop size={14} /> RECENTRAR
                </Button>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>
                    <X size={14} /> CANCELAR
                  </Button>
                  <Button type="button" variant="primary" onClick={confirm} disabled={busy || !image}>
                    {busy ? 'SALVANDO...' : confirmLabel}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Win>
      </div>
    </div>
  );
}
