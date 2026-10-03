import React from 'react';
import { Check, Image as ImageIcon, Minus, Plus, X } from 'lucide-react';

interface ProfilePhotoCropModalProps {
  file: File;
  onCancel: () => void;
  onCrop: (file: File) => void;
}

const FRAME_SIZE = 280;

export const ProfilePhotoCropModal: React.FC<ProfilePhotoCropModalProps> = ({ file, onCancel, onCrop }) => {
  const [image, setImage] = React.useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = React.useState(1);
  const [offset, setOffset] = React.useState({ x: 0, y: 0 });
  const [error, setError] = React.useState<string | null>(null);
  const [processing, setProcessing] = React.useState(false);
  const dragStart = React.useRef<{ x: number; y: number; offsetX: number; offsetY: number } | null>(null);

  React.useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    const preview = new Image();
    preview.onload = () => {
      setImage(preview);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      setError(null);
    };
    preview.onerror = () => setError('No se pudo abrir esta imagen. Intenta con otro archivo.');
    preview.src = objectUrl;
    return () => {
      preview.onload = null;
      preview.onerror = null;
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  const scale = image ? Math.max(FRAME_SIZE / image.naturalWidth, FRAME_SIZE / image.naturalHeight) * zoom : 1;
  const clampOffset = React.useCallback((next: { x: number; y: number }, nextScale = scale) => {
    if (!image) return { x: 0, y: 0 };
    const maxX = Math.max(0, (image.naturalWidth * nextScale - FRAME_SIZE) / 2);
    const maxY = Math.max(0, (image.naturalHeight * nextScale - FRAME_SIZE) / 2);
    return {
      x: Math.min(maxX, Math.max(-maxX, next.x)),
      y: Math.min(maxY, Math.max(-maxY, next.y))
    };
  }, [image, scale]);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!image) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStart.current = { x: event.clientX, y: event.clientY, offsetX: offset.x, offsetY: offset.y };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStart.current) return;
    setOffset(clampOffset({
      x: dragStart.current.offsetX + event.clientX - dragStart.current.x,
      y: dragStart.current.offsetY + event.clientY - dragStart.current.y
    }));
  };

  const finishCrop = () => {
    if (!image || processing) return;
    setProcessing(true);
    const sourceSize = FRAME_SIZE / scale;
    const sourceX = Math.min(image.naturalWidth - sourceSize, Math.max(0, (image.naturalWidth - sourceSize) / 2 - offset.x / scale));
    const sourceY = Math.min(image.naturalHeight - sourceSize, Math.max(0, (image.naturalHeight - sourceSize) / 2 - offset.y / scale));
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 600;
    const context = canvas.getContext('2d');
    if (!context) {
      setError('No se pudo procesar el recorte. Intenta nuevamente.');
      setProcessing(false);
      return;
    }
    context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) {
        setError('No se pudo generar la foto recortada. Intenta nuevamente.');
        setProcessing(false);
        return;
      }
      const croppedFile = new File([blob], `${file.name.replace(/\.[^.]+$/, '')}-recortada.jpg`, { type: 'image/jpeg' });
      onCrop(croppedFile);
    }, 'image/jpeg', 0.92);
  };

  return (
    <div onClick={(event) => { if (event.target === event.currentTarget) onCancel(); }} className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-3 backdrop-blur-[2px] animate-in fade-in sm:p-6">
      <section role="dialog" aria-modal="true" aria-labelledby="photo-crop-title" className="w-full max-w-md overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl animate-in zoom-in-95">
        <header className="flex items-start justify-between gap-4 border-b border-stone-200 px-5 py-4">
          <div className="flex items-start gap-3">
            <span aria-hidden="true" className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-700"><ImageIcon className="h-4 w-4" /></span>
            <div>
              <h2 id="photo-crop-title" className="text-sm font-semibold text-slate-900">Ajusta tu foto</h2>
              <p className="mt-0.5 text-xs text-stone-500">Arrastra para centrarla y ajusta el zoom.</p>
            </div>
          </div>
          <button type="button" onClick={onCancel} aria-label="Cancelar recorte" className="flex h-9 w-9 items-center justify-center rounded-lg text-stone-500 transition-colors hover:bg-stone-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"><X aria-hidden="true" className="h-4 w-4" /></button>
        </header>

        <div className="flex flex-col items-center gap-4 p-5">
          <div
            className="relative touch-none cursor-grab select-none overflow-hidden rounded-full bg-stone-100 active:cursor-grabbing"
            style={{ width: FRAME_SIZE, height: FRAME_SIZE, maxWidth: '100%' }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={() => { dragStart.current = null; }}
            onPointerCancel={() => { dragStart.current = null; }}
            aria-label="Vista previa recortada. Arrastra la imagen para ajustarla."
          >
            {image && <img src={image.src} alt="Vista previa de la foto que se va a recortar" draggable={false} className="pointer-events-none absolute left-1/2 top-1/2 max-w-none" style={{ width: image.naturalWidth * scale, height: image.naturalHeight * scale, transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))` }} />}
            {!image && !error && <div className="absolute inset-0 flex items-center justify-center text-xs text-stone-500">Cargando imagen…</div>}
          </div>

          <div className="w-full max-w-[280px] space-y-2">
            <div className="flex items-center gap-3">
              <Minus aria-hidden="true" className="h-4 w-4 shrink-0 text-stone-500" />
              <label className="sr-only" htmlFor="photo-crop-zoom">Zoom de la foto</label>
              <input id="photo-crop-zoom" type="range" min="1" max="3" step="0.01" value={zoom} onChange={(event) => {
                const nextZoom = Number(event.target.value);
                const nextScale = image ? Math.max(FRAME_SIZE / image.naturalWidth, FRAME_SIZE / image.naturalHeight) * nextZoom : 1;
                setZoom(nextZoom);
                setOffset((current) => clampOffset(current, nextScale));
              }} disabled={!image} className="h-2 w-full cursor-pointer accent-emerald-700" />
              <Plus aria-hidden="true" className="h-4 w-4 shrink-0 text-stone-500" />
            </div>
            <p className="text-center text-[11px] text-stone-500">La imagen se guardará en formato cuadrado.</p>
          </div>
          {error && <p role="alert" className="w-full rounded-lg border border-danger-border bg-danger-soft p-3 text-xs text-danger">{error}</p>}
        </div>

        <footer className="flex justify-end gap-2 border-t border-stone-200 px-5 py-3">
          <button type="button" onClick={onCancel} className="inline-flex min-h-10 items-center justify-center rounded-lg border border-stone-200 px-4 text-xs font-medium text-slate-700 transition-colors hover:bg-stone-50">Cancelar</button>
          <button type="button" onClick={finishCrop} disabled={!image || processing || !!error} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-brand-700 px-4 text-xs font-semibold text-white transition-colors hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50">
            <Check aria-hidden="true" className="h-3.5 w-3.5" />{processing ? 'Procesando…' : 'Usar esta foto'}
          </button>
        </footer>
      </section>
    </div>
  );
};
