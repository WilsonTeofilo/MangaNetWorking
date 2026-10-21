import { useCallback, useEffect, useRef, useState } from 'react';
import { Crop, Minus, Plus, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { Win } from '../ui/Win';

/**
 * Ajuste da foto de perfil (recorte quadrado com arraste e zoom).
 *
 * <p>Mesmo padrão do MangaTeofilo (`CreatorApplicationModal`): a pessoa arrasta a imagem
 * dentro de um quadro quadrado, regula o zoom e confirma. O recorte final é gerado aqui no
 * navegador (canvas 512×512, sem metadados) e devolvido como Blob — o servidor continua
 * normalizando para JPEG quadrado.</p>
 *
 * <p>Acessibilidade: o zoom é um {@code input[type=range]} com rótulo, o arraste funciona
 * com mouse, toque e as setas do teclado, e o foco permanece visível (regra 12 da identidade
 * visual).</p>
 */

const OUTPUT_SIZE = 512;

export interface AvatarCropperProps {
  /** Arquivo escolhido pelo usuário. */
  file: File;
  /** Fecha o modal. */
  onCancel: () => void;
  /** Entrega o recorte final (PNG quadrado). */
  onConfirm: (cropped: Blob) => void | Promise<void>;
  /** Estado de envio (desabilita os botões). */
  busy?: boolean;
  /** Mensagem de erro vinda do servidor. */
  error?: string | null;
}

export function AvatarCropper({ file, onCancel, onConfirm, busy = false, error = null }: AvatarCropperProps) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragOrigin = useRef<{ pointerX: number; pointerY: number; x: number; y: number } | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const frameSize = 320;

  /** Escala aplicada à imagem: cobre o quadro (cover) e multiplica pelo zoom. */
  const computeScale = useCallback(() => {
    const image = imageRef.current;
    if (!image) return 1;
    const natural = Math.max(image.naturalWidth, image.naturalHeight) || 1;
    return (frameSize / natural) * zoom;
  }, [zoom]);

  /** Mantém a imagem cobrindo o quadro (nunca mostra borda vazia). */
  const clamp = useCallback(
    (next: { x: number; y: number }) => {
      const image = imageRef.current;
      if (!image) return next;
      const scale = computeScale();
      const width = image.naturalWidth * scale;
      const height = image.naturalHeight * scale;
      const maxX = Math.max(0, (width - frameSize) / 2);
      const maxY = Math.max(0, (height - frameSize) / 2);
      return {
        x: Math.min(maxX, Math.max(-maxX, next.x)),
        y: Math.min(maxY, Math.max(-maxY, next.y)),
      };
    },
    [computeScale]
  );

  const onPointerDown = (event: React.PointerEvent) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
    dragOrigin.current = { pointerX: event.clientX, pointerY: event.clientY, ...offset };
  };

  const onPointerMove = (event: React.PointerEvent) => {
    if (!dragOrigin.current) return;
    const deltaX = event.clientX - dragOrigin.current.pointerX;
    const deltaY = event.clientY - dragOrigin.current.pointerY;
    setOffset(clamp({ x: dragOrigin.current.x + deltaX, y: dragOrigin.current.y + deltaY }));
  };

  const onPointerUp = () => {
    setDragging(false);
    dragOrigin.current = null;
  };

  /** Teclado: as setas movem o recorte (acessibilidade do arraste). */
  const onKeyDown = (event: React.KeyboardEvent) => {
    const step = event.shiftKey ? 24 : 8;
    const moves: Record<string, { x: number; y: number }> = {
      ArrowLeft: { x: offset.x - step, y: offset.y },
      ArrowRight: { x: offset.x + step, y: offset.y },
      ArrowUp: { x: offset.x, y: offset.y - step },
      ArrowDown: { x: offset.x, y: offset.y + step },
    };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    setOffset(clamp(move));
  };

  const reset = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  const confirm = async () => {
    const image = imageRef.current;
    if (!image) return;
    const scale = computeScale();
    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;

    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const context = canvas.getContext('2d');
    if (!context) return;
    const factor = OUTPUT_SIZE / frameSize;
    context.drawImage(
      image,
      offset.x * factor,
      offset.y * factor,
      width * factor,
      height * factor
    );
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (blob) await onConfirm(blob);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Ajustar foto de perfil"
      className="fixed inset-0 z-[130] bg-black/85 flex items-center justify-center p-4"
    >
      <div className="w-full max-w-lg">
        <Win title="AJUSTAR FOTO.EXE">
          <div className="space-y-4">
            <p className="font-body text-xs text-[var(--mn-mute)]">
              Arraste a imagem para enquadrar o rosto e ajuste o zoom. O recorte é quadrado e fica
              salvo como a foto do seu perfil.
            </p>

            <div className="flex flex-col items-center gap-3">
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
                style={{ width: frameSize, height: frameSize, touchAction: 'none' }}
              >
                {imageUrl && (
                  <img
                    ref={imageRef}
                    src={imageUrl}
                    alt="Pré-visualização da foto escolhida"
                    draggable={false}
                    className="absolute max-w-none select-none"
                    onLoad={() => setOffset(clamp({ x: 0, y: 0 }))}
                    style={{
                      width: '100%',
                      transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                      transformOrigin: 'center',
                    }}
                  />
                )}
              </div>

              <div className="w-full flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setZoom((value) => Math.max(1, Number((value - 0.1).toFixed(2))))}
                  className="p-2 border-2 border-[var(--mn-line)] text-[var(--mn-paper)] hover:border-[var(--mn-yellow)]"
                  aria-label="Diminuir o zoom"
                >
                  <Minus size={14} />
                </button>
                <label htmlFor="avatar-zoom" className="font-pixel text-[11px] uppercase text-[var(--mn-mute)]">
                  ZOOM
                </label>
                <input
                  id="avatar-zoom"
                  type="range"
                  min={1}
                  max={3}
                  step={0.05}
                  value={zoom}
                  onChange={(event) => {
                    setZoom(Number(event.target.value));
                    setOffset(clamp(offset));
                  }}
                  className="flex-1 accent-[var(--mn-yellow)]"
                />
                <button
                  type="button"
                  onClick={() => setZoom((value) => Math.min(3, Number((value + 0.1).toFixed(2))))}
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
                <Button type="button" variant="ghost" onClick={reset}>
                  <Crop size={14} /> RECOMEÇAR
                </Button>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>
                    <X size={14} /> CANCELAR
                  </Button>
                  <Button type="button" variant="primary" onClick={confirm} disabled={busy}>
                    {busy ? 'SALVANDO...' : 'USAR ESTA FOTO'}
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
