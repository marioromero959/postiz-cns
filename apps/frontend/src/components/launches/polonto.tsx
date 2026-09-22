'use client';

/**
 * CNS design editor — replaces Polotno (no external license).
 * Same public API as the old Polonto component so media.component keeps working.
 */

import { FC, useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@gitroom/react/form/button';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useLaunchStore } from '@gitroom/frontend/components/new-launch/store';

type ShapeKind = 'text' | 'rect' | 'circle' | 'image';

type CanvasItem = {
  id: string;
  kind: ShapeKind;
  x: number;
  y: number;
  w: number;
  h: number;
  text?: string;
  fontFamily?: string;
  fontSize?: number;
  fill: string;
  src?: string;
};

const FONTS = [
  'Arial',
  'Georgia',
  'Times New Roman',
  'Verdana',
  'Courier New',
  'Trebuchet MS',
  'Impact',
  'Comic Sans MS',
];

const PRESET_COLORS = [
  '#000000',
  '#ffffff',
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#3b82f6',
  '#a855f7',
  '#ec4899',
  '#0f172a',
];

const uid = () => Math.random().toString(36).slice(2, 10);

const Polonto: FC<{
  setMedia: (params: { id: string; path: string }[]) => void;
  type?: 'image' | 'video';
  closeModal: () => void;
  width?: number;
  height?: number;
}> = (props) => {
  const { setMedia, closeModal } = props;
  const canvasW = props.width || 540;
  const canvasH = props.height || 675;
  const t = useT();
  const fetch = useFetch();
  const setActivateExitButton = useLaunchStore((e) => e.setActivateExitButton);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<{
    id: string;
    ox: number;
    oy: number;
  } | null>(null);

  const [bg, setBg] = useState('#1e293b');
  const [items, setItems] = useState<CanvasItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const imageCache = useRef<Record<string, HTMLImageElement>>({});

  useEffect(() => {
    setActivateExitButton(false);
    return () => setActivateExitButton(true);
  }, [setActivateExitButton]);

  const selected = items.find((i) => i.id === selectedId) || null;

  const updateSelected = useCallback(
    (patch: Partial<CanvasItem>) => {
      if (!selectedId) return;
      setItems((prev) =>
        prev.map((i) => (i.id === selectedId ? { ...i, ...patch } : i))
      );
    },
    [selectedId]
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvasW, canvasH);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvasW, canvasH);

    for (const item of items) {
      if (item.kind === 'rect') {
        ctx.fillStyle = item.fill;
        ctx.fillRect(item.x, item.y, item.w, item.h);
      } else if (item.kind === 'circle') {
        ctx.fillStyle = item.fill;
        ctx.beginPath();
        ctx.ellipse(
          item.x + item.w / 2,
          item.y + item.h / 2,
          item.w / 2,
          item.h / 2,
          0,
          0,
          Math.PI * 2
        );
        ctx.fill();
      } else if (item.kind === 'text') {
        ctx.fillStyle = item.fill;
        ctx.font = `${item.fontSize || 32}px ${item.fontFamily || 'Arial'}`;
        ctx.textBaseline = 'top';
        const lines = (item.text || '').split('\n');
        lines.forEach((line, idx) => {
          ctx.fillText(line, item.x, item.y + idx * (item.fontSize || 32) * 1.2);
        });
      } else if (item.kind === 'image' && item.src) {
        const img = imageCache.current[item.src];
        if (img?.complete) {
          ctx.drawImage(img, item.x, item.y, item.w, item.h);
        }
      }

      if (item.id === selectedId) {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(item.x - 2, item.y - 2, item.w + 4, item.h + 4);
        ctx.setLineDash([]);
      }
    }
  }, [bg, items, selectedId, canvasW, canvasH]);

  useEffect(() => {
    draw();
  }, [draw]);

  const hitTest = (x: number, y: number) => {
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      if (x >= it.x && x <= it.x + it.w && y >= it.y && y <= it.y + it.h) {
        return it;
      }
    }
    return null;
  };

  const toCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = canvasW / rect.width;
    const scaleY = canvasH / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = toCanvasCoords(e);
    const hit = hitTest(x, y);
    if (hit) {
      setSelectedId(hit.id);
      dragRef.current = { id: hit.id, ox: x - hit.x, oy: y - hit.y };
    } else {
      setSelectedId(null);
      dragRef.current = null;
    }
  };

  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!dragRef.current) return;
    const { x, y } = toCanvasCoords(e);
    const { id, ox, oy } = dragRef.current;
    setItems((prev) =>
      prev.map((it) =>
        it.id === id ? { ...it, x: x - ox, y: y - oy } : it
      )
    );
  };

  const onMouseUp = () => {
    dragRef.current = null;
  };

  const addText = () => {
    const item: CanvasItem = {
      id: uid(),
      kind: 'text',
      x: 40,
      y: 40,
      w: 280,
      h: 48,
      text: 'Texto',
      fontFamily: 'Arial',
      fontSize: 36,
      fill: '#ffffff',
    };
    setItems((p) => [...p, item]);
    setSelectedId(item.id);
  };

  const addRect = () => {
    const item: CanvasItem = {
      id: uid(),
      kind: 'rect',
      x: 60,
      y: 60,
      w: 180,
      h: 120,
      fill: '#3b82f6',
    };
    setItems((p) => [...p, item]);
    setSelectedId(item.id);
  };

  const addCircle = () => {
    const item: CanvasItem = {
      id: uid(),
      kind: 'circle',
      x: 80,
      y: 80,
      w: 140,
      h: 140,
      fill: '#f97316',
    };
    setItems((p) => [...p, item]);
    setSelectedId(item.id);
  };

  const onUploadImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const src = String(reader.result);
      const img = new Image();
      img.onload = () => {
        imageCache.current[src] = img;
        const maxW = canvasW * 0.7;
        const maxH = canvasH * 0.7;
        let w = img.width;
        let h = img.height;
        const scale = Math.min(maxW / w, maxH / h, 1);
        w *= scale;
        h *= scale;
        const item: CanvasItem = {
          id: uid(),
          kind: 'image',
          x: (canvasW - w) / 2,
          y: (canvasH - h) / 2,
          w,
          h,
          fill: '#000',
          src,
        };
        setItems((p) => [...p, item]);
        setSelectedId(item.id);
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    setItems((p) => p.filter((i) => i.id !== selectedId));
    setSelectedId(null);
  };

  const bringForward = () => {
    if (!selectedId) return;
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.id === selectedId);
      if (idx < 0 || idx === prev.length - 1) return prev;
      const next = [...prev];
      const [it] = next.splice(idx, 1);
      next.splice(idx + 1, 0, it);
      return next;
    });
  };

  const useMedia = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setSaving(true);
    try {
      // redraw without selection outline
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const prevSelected = selectedId;
        setSelectedId(null);
        await new Promise((r) => requestAnimationFrame(() => r(null)));
        ctx.clearRect(0, 0, canvasW, canvasH);
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, canvasW, canvasH);
        for (const item of items) {
          if (item.kind === 'rect') {
            ctx.fillStyle = item.fill;
            ctx.fillRect(item.x, item.y, item.w, item.h);
          } else if (item.kind === 'circle') {
            ctx.fillStyle = item.fill;
            ctx.beginPath();
            ctx.ellipse(
              item.x + item.w / 2,
              item.y + item.h / 2,
              item.w / 2,
              item.h / 2,
              0,
              0,
              Math.PI * 2
            );
            ctx.fill();
          } else if (item.kind === 'text') {
            ctx.fillStyle = item.fill;
            ctx.font = `${item.fontSize || 32}px ${item.fontFamily || 'Arial'}`;
            ctx.textBaseline = 'top';
            (item.text || '').split('\n').forEach((line, idx) => {
              ctx.fillText(
                line,
                item.x,
                item.y + idx * (item.fontSize || 32) * 1.2
              );
            });
          } else if (item.kind === 'image' && item.src) {
            const img = imageCache.current[item.src];
            if (img?.complete) {
              ctx.drawImage(img, item.x, item.y, item.w, item.h);
            }
          }
        }
        setSelectedId(prevSelected);
      }

      const blob: Blob | null = await new Promise((resolve) =>
        canvas.toBlob((b) => resolve(b), 'image/png')
      );
      if (!blob) throw new Error('export failed');

      const formData = new FormData();
      formData.append('file', blob, 'media.png');
      const data = await (
        await fetch('/media/upload-simple', {
          method: 'POST',
          body: formData,
        })
      ).json();
      setMedia([{ id: data.id, path: data.path }]);
      closeModal();
    } catch (e) {
      console.error(e);
      setSaving(false);
    }
  };

  return (
    <div className="bg-white text-black relative z-[400] polonto flex flex-col md:flex-row gap-3 p-3 min-h-[700px]">
      <aside className="w-full md:w-[260px] shrink-0 flex flex-col gap-3 border border-gray-200 rounded-lg p-3">
        <div className="font-semibold text-sm">Diseñar medios (CNS)</div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="px-2 py-1 text-xs rounded bg-slate-800 text-white"
            onClick={addText}
          >
            + Texto
          </button>
          <button
            type="button"
            className="px-2 py-1 text-xs rounded bg-slate-800 text-white"
            onClick={addRect}
          >
            + Rectángulo
          </button>
          <button
            type="button"
            className="px-2 py-1 text-xs rounded bg-slate-800 text-white"
            onClick={addCircle}
          >
            + Círculo
          </button>
          <button
            type="button"
            className="px-2 py-1 text-xs rounded bg-slate-800 text-white"
            onClick={() => fileRef.current?.click()}
          >
            + Imagen
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onUploadImage(f);
              e.target.value = '';
            }}
          />
        </div>

        <label className="text-xs flex flex-col gap-1">
          Fondo
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="color"
              value={bg}
              onChange={(e) => setBg(e.target.value)}
            />
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                title={c}
                className="w-5 h-5 rounded border border-gray-300"
                style={{ background: c }}
                onClick={() => setBg(c)}
              />
            ))}
          </div>
        </label>

        {selected && (
          <div className="flex flex-col gap-2 border-t pt-2">
            <div className="text-xs font-medium">Elemento seleccionado</div>

            {(selected.kind === 'text' ||
              selected.kind === 'rect' ||
              selected.kind === 'circle') && (
              <label className="text-xs flex flex-col gap-1">
                Color
                <input
                  type="color"
                  value={selected.fill}
                  onChange={(e) => updateSelected({ fill: e.target.value })}
                />
              </label>
            )}

            {selected.kind === 'text' && (
              <>
                <label className="text-xs flex flex-col gap-1">
                  Texto
                  <textarea
                    className="border rounded p-1 text-sm"
                    rows={3}
                    value={selected.text || ''}
                    onChange={(e) =>
                      updateSelected({
                        text: e.target.value,
                        h: Math.max(
                          40,
                          e.target.value.split('\n').length *
                            (selected.fontSize || 32) *
                            1.2
                        ),
                      })
                    }
                  />
                </label>
                <label className="text-xs flex flex-col gap-1">
                  Tipografía
                  <select
                    className="border rounded p-1 text-sm"
                    value={selected.fontFamily || 'Arial'}
                    onChange={(e) =>
                      updateSelected({ fontFamily: e.target.value })
                    }
                  >
                    {FONTS.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs flex flex-col gap-1">
                  Tamaño
                  <input
                    type="number"
                    min={10}
                    max={200}
                    className="border rounded p-1 text-sm"
                    value={selected.fontSize || 32}
                    onChange={(e) =>
                      updateSelected({
                        fontSize: Number(e.target.value) || 32,
                      })
                    }
                  />
                </label>
              </>
            )}

            {(selected.kind === 'rect' ||
              selected.kind === 'circle' ||
              selected.kind === 'image') && (
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs flex flex-col gap-1">
                  Ancho
                  <input
                    type="number"
                    className="border rounded p-1 text-sm"
                    value={Math.round(selected.w)}
                    onChange={(e) =>
                      updateSelected({ w: Number(e.target.value) || 10 })
                    }
                  />
                </label>
                <label className="text-xs flex flex-col gap-1">
                  Alto
                  <input
                    type="number"
                    className="border rounded p-1 text-sm"
                    value={Math.round(selected.h)}
                    onChange={(e) =>
                      updateSelected({ h: Number(e.target.value) || 10 })
                    }
                  />
                </label>
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                className="px-2 py-1 text-xs rounded border"
                onClick={bringForward}
              >
                Traer adelante
              </button>
              <button
                type="button"
                className="px-2 py-1 text-xs rounded border border-red-400 text-red-600"
                onClick={deleteSelected}
              >
                Eliminar
              </button>
            </div>
          </div>
        )}

        <div className="mt-auto flex flex-col gap-2">
          <Button
            loading={saving}
            className="outline-none"
            innerClassName="invert outline-none text-black"
            onClick={useMedia}
          >
            {t('use_this_media', 'Use this media')}
          </Button>
          <button
            type="button"
            className="text-xs text-gray-500 underline"
            onClick={closeModal}
          >
            Cancelar
          </button>
        </div>
      </aside>

      <div className="flex-1 flex items-center justify-center bg-gray-100 rounded-lg overflow-auto p-2">
        <canvas
          ref={canvasRef}
          width={canvasW}
          height={canvasH}
          className="shadow-lg max-w-full cursor-move bg-white"
          style={{
            width: 'min(100%, 540px)',
            height: 'auto',
            aspectRatio: `${canvasW} / ${canvasH}`,
          }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        />
      </div>
    </div>
  );
};

export default Polonto;
