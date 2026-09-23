'use client';

/**
 * CNS Media Editor — Polotno-like UX without Polotno license.
 * Same public API as the old Polonto component.
 */

import {
  FC,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Button } from '@gitroom/react/form/button';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useLaunchStore } from '@gitroom/frontend/components/new-launch/store';

type ShapeKind = 'text' | 'rect' | 'circle' | 'image';
type ToolTab = 'text' | 'shapes' | 'upload' | 'background' | 'size';
type Handle = 'nw' | 'ne' | 'sw' | 'se' | 'move';

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
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  align?: 'left' | 'center' | 'right';
  fill: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  radius?: number;
  src?: string;
};

const FONTS = [
  'Arial',
  'Helvetica',
  'Georgia',
  'Times New Roman',
  'Verdana',
  'Trebuchet MS',
  'Courier New',
  'Impact',
  'Palatino Linotype',
  'Comic Sans MS',
];

const PRESET_COLORS = [
  '#000000',
  '#ffffff',
  '#0f172a',
  '#1e293b',
  '#334155',
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#14b8a6',
  '#3b82f6',
  '#6366f1',
  '#a855f7',
  '#ec4899',
  '#f43f5e',
];

const SIZE_PRESETS = [
  { id: 'ig-post', label: 'Instagram Post', w: 1080, h: 1080 },
  { id: 'ig-story', label: 'Instagram Story', w: 1080, h: 1920 },
  { id: 'ig-portrait', label: 'IG Portrait 4:5', w: 1080, h: 1350 },
  { id: 'fb-post', label: 'Facebook / LinkedIn', w: 1200, h: 630 },
  { id: 'yt-thumb', label: 'YouTube Thumb', w: 1280, h: 720 },
  { id: 'square', label: 'Square 1:1', w: 1080, h: 1080 },
];

const TEXT_PRESETS = [
  { label: 'Título', text: 'Tu título', fontSize: 64, fontWeight: 'bold' as const },
  { label: 'Subtítulo', text: 'Subtítulo', fontSize: 40, fontWeight: 'normal' as const },
  { label: 'Cuerpo', text: 'Escribe tu texto aquí', fontSize: 28, fontWeight: 'normal' as const },
];

const uid = () => Math.random().toString(36).slice(2, 10);

function measureText(
  ctx: CanvasRenderingContext2D,
  item: CanvasItem
): { w: number; h: number } {
  const size = item.fontSize || 32;
  const weight = item.fontWeight || 'normal';
  const style = item.fontStyle || 'normal';
  ctx.font = `${style} ${weight} ${size}px ${item.fontFamily || 'Arial'}`;
  const lines = (item.text || '').split('\n');
  const w = Math.max(40, ...lines.map((l) => ctx.measureText(l).width));
  const h = Math.max(size, lines.length * size * 1.25);
  return { w, h };
}

function drawItem(
  ctx: CanvasRenderingContext2D,
  item: CanvasItem,
  imageCache: Record<string, HTMLImageElement>
) {
  ctx.save();
  ctx.globalAlpha = item.opacity ?? 1;

  if (item.kind === 'rect') {
    const r = Math.min(item.radius || 0, item.w / 2, item.h / 2);
    ctx.fillStyle = item.fill;
    if (r > 0) {
      roundRect(ctx, item.x, item.y, item.w, item.h, r);
      ctx.fill();
    } else {
      ctx.fillRect(item.x, item.y, item.w, item.h);
    }
    if (item.strokeWidth && item.stroke) {
      ctx.strokeStyle = item.stroke;
      ctx.lineWidth = item.strokeWidth;
      if (r > 0) {
        roundRect(ctx, item.x, item.y, item.w, item.h, r);
        ctx.stroke();
      } else {
        ctx.strokeRect(item.x, item.y, item.w, item.h);
      }
    }
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
    if (item.strokeWidth && item.stroke) {
      ctx.strokeStyle = item.stroke;
      ctx.lineWidth = item.strokeWidth;
      ctx.stroke();
    }
  } else if (item.kind === 'text') {
    const size = item.fontSize || 32;
    const weight = item.fontWeight || 'normal';
    const style = item.fontStyle || 'normal';
    ctx.fillStyle = item.fill;
    ctx.font = `${style} ${weight} ${size}px ${item.fontFamily || 'Arial'}`;
    ctx.textBaseline = 'top';
    const lines = (item.text || '').split('\n');
    lines.forEach((line, idx) => {
      let x = item.x;
      const y = item.y + idx * size * 1.25;
      if (item.align === 'center') {
        ctx.textAlign = 'center';
        x = item.x + item.w / 2;
      } else if (item.align === 'right') {
        ctx.textAlign = 'right';
        x = item.x + item.w;
      } else {
        ctx.textAlign = 'left';
      }
      ctx.fillText(line, x, y);
    });
    ctx.textAlign = 'left';
  } else if (item.kind === 'image' && item.src) {
    const img = imageCache[item.src];
    if (img?.complete) {
      const r = item.radius || 0;
      if (r > 0) {
        ctx.beginPath();
        roundRect(ctx, item.x, item.y, item.w, item.h, r);
        ctx.clip();
      }
      ctx.drawImage(img, item.x, item.y, item.w, item.h);
    }
  }

  ctx.restore();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

const Polonto: FC<{
  setMedia: (params: { id: string; path: string }[]) => void;
  type?: 'image' | 'video';
  closeModal: () => void;
  width?: number;
  height?: number;
}> = (props) => {
  const { setMedia, closeModal } = props;
  const initialW = props.width || 1080;
  const initialH = props.height || 1080;
  const t = useT();
  const fetch = useFetch();
  const setActivateExitButton = useLaunchStore((e) => e.setActivateExitButton);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const imageCache = useRef<Record<string, HTMLImageElement>>({});
  const dragRef = useRef<{
    handle: Handle;
    id: string;
    startX: number;
    startY: number;
    orig: CanvasItem;
  } | null>(null);

  const [canvasW, setCanvasW] = useState(initialW);
  const [canvasH, setCanvasH] = useState(initialH);
  const [bg, setBg] = useState('#0f172a');
  const [items, setItems] = useState<CanvasItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<ToolTab>('text');
  const [zoom, setZoom] = useState(0.45);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setActivateExitButton(false);
    return () => setActivateExitButton(true);
  }, [setActivateExitButton]);

  const selected = useMemo(
    () => items.find((i) => i.id === selectedId) || null,
    [items, selectedId]
  );

  const updateSelected = useCallback(
    (patch: Partial<CanvasItem>) => {
      if (!selectedId) return;
      setItems((prev) =>
        prev.map((i) => {
          if (i.id !== selectedId) return i;
          const next = { ...i, ...patch };
          return next;
        })
      );
    },
    [selectedId]
  );

  const draw = useCallback(
    (hideSelection = false) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvasW, canvasH);
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, canvasW, canvasH);

      for (const item of items) {
        const drawIt =
          item.kind === 'text'
            ? (() => {
                const m = measureText(ctx, item);
                return { ...item, w: m.w, h: m.h };
              })()
            : item;
        drawItem(ctx, drawIt, imageCache.current);

        if (!hideSelection && selectedId === item.id) {
          const box = drawIt;
          ctx.save();
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = Math.max(2, 2 / zoom);
          ctx.setLineDash([8 / zoom, 6 / zoom]);
          ctx.strokeRect(box.x - 2, box.y - 2, box.w + 4, box.h + 4);
          ctx.setLineDash([]);
          const hs = Math.max(8, 10 / zoom);
          const handles: { x: number; y: number }[] = [
            { x: box.x, y: box.y },
            { x: box.x + box.w, y: box.y },
            { x: box.x, y: box.y + box.h },
            { x: box.x + box.w, y: box.y + box.h },
          ];
          ctx.fillStyle = '#38bdf8';
          for (const h of handles) {
            ctx.fillRect(h.x - hs / 2, h.y - hs / 2, hs, hs);
          }
          ctx.restore();
        }
      }
    },
    [bg, items, selectedId, canvasW, canvasH, zoom]
  );

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

  const hitHandle = (item: CanvasItem, x: number, y: number): Handle | null => {
    const hs = Math.max(12, 14 / zoom);
    const pts: { h: Handle; x: number; y: number }[] = [
      { h: 'nw', x: item.x, y: item.y },
      { h: 'ne', x: item.x + item.w, y: item.y },
      { h: 'sw', x: item.x, y: item.y + item.h },
      { h: 'se', x: item.x + item.w, y: item.y + item.h },
    ];
    for (const p of pts) {
      if (Math.abs(x - p.x) <= hs && Math.abs(y - p.y) <= hs) return p.h;
    }
    if (x >= item.x && x <= item.x + item.w && y >= item.y && y <= item.y + item.h) {
      return 'move';
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
    if (selected) {
      const h = hitHandle(selected, x, y);
      if (h) {
        dragRef.current = {
          handle: h,
          id: selected.id,
          startX: x,
          startY: y,
          orig: { ...selected },
        };
        return;
      }
    }
    const hit = hitTest(x, y);
    if (hit) {
      setSelectedId(hit.id);
      setTab(hit.kind === 'text' ? 'text' : hit.kind === 'image' ? 'upload' : 'shapes');
      dragRef.current = {
        handle: 'move',
        id: hit.id,
        startX: x,
        startY: y,
        orig: { ...hit },
      };
    } else {
      setSelectedId(null);
      dragRef.current = null;
    }
  };

  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const { x, y } = toCanvasCoords(e);
    const dx = x - drag.startX;
    const dy = y - drag.startY;
    const o = drag.orig;

    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== drag.id) return it;
        if (drag.handle === 'move') {
          return { ...it, x: o.x + dx, y: o.y + dy };
        }
        let nx = o.x;
        let ny = o.y;
        let nw = o.w;
        let nh = o.h;
        if (drag.handle.includes('e')) nw = Math.max(20, o.w + dx);
        if (drag.handle.includes('s')) nh = Math.max(20, o.h + dy);
        if (drag.handle.includes('w')) {
          nw = Math.max(20, o.w - dx);
          nx = o.x + (o.w - nw);
        }
        if (drag.handle.includes('n')) {
          nh = Math.max(20, o.h - dy);
          ny = o.y + (o.h - nh);
        }
        if (it.kind === 'text') {
          // scale font with height roughly
          const ratio = nh / Math.max(1, o.h);
          return {
            ...it,
            x: nx,
            y: ny,
            w: nw,
            h: nh,
            fontSize: Math.max(10, Math.round((o.fontSize || 32) * ratio)),
          };
        }
        return { ...it, x: nx, y: ny, w: nw, h: nh };
      })
    );
  };

  const onMouseUp = () => {
    dragRef.current = null;
  };

  const addText = (preset?: (typeof TEXT_PRESETS)[0]) => {
    const p = preset || TEXT_PRESETS[0];
    const item: CanvasItem = {
      id: uid(),
      kind: 'text',
      x: canvasW * 0.1,
      y: canvasH * 0.15,
      w: canvasW * 0.8,
      h: p.fontSize * 1.4,
      text: p.text,
      fontFamily: 'Arial',
      fontSize: p.fontSize,
      fontWeight: p.fontWeight,
      fontStyle: 'normal',
      align: 'left',
      fill: '#ffffff',
      opacity: 1,
    };
    setItems((prev) => [...prev, item]);
    setSelectedId(item.id);
    setTab('text');
  };

  const addRect = () => {
    const item: CanvasItem = {
      id: uid(),
      kind: 'rect',
      x: canvasW * 0.2,
      y: canvasH * 0.25,
      w: canvasW * 0.5,
      h: canvasH * 0.25,
      fill: '#3b82f6',
      radius: 16,
      opacity: 1,
    };
    setItems((p) => [...p, item]);
    setSelectedId(item.id);
    setTab('shapes');
  };

  const addCircle = () => {
    const s = Math.min(canvasW, canvasH) * 0.35;
    const item: CanvasItem = {
      id: uid(),
      kind: 'circle',
      x: (canvasW - s) / 2,
      y: (canvasH - s) / 2,
      w: s,
      h: s,
      fill: '#f97316',
      opacity: 1,
    };
    setItems((p) => [...p, item]);
    setSelectedId(item.id);
    setTab('shapes');
  };

  const onUploadImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const src = String(reader.result);
      const img = new Image();
      img.onload = () => {
        imageCache.current[src] = img;
        const maxW = canvasW * 0.75;
        const maxH = canvasH * 0.75;
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
          opacity: 1,
          radius: 0,
        };
        setItems((p) => [...p, item]);
        setSelectedId(item.id);
        setTab('upload');
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

  const duplicateSelected = () => {
    if (!selected) return;
    const copy: CanvasItem = {
      ...selected,
      id: uid(),
      x: selected.x + 24,
      y: selected.y + 24,
    };
    setItems((p) => [...p, copy]);
    setSelectedId(copy.id);
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

  const sendBackward = () => {
    if (!selectedId) return;
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.id === selectedId);
      if (idx <= 0) return prev;
      const next = [...prev];
      const [it] = next.splice(idx, 1);
      next.splice(idx - 1, 0, it);
      return next;
    });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        e.preventDefault();
        deleteSelected();
      }
      if ((e.key === 'd' || e.key === 'D') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        duplicateSelected();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const applySize = (w: number, h: number) => {
    setCanvasW(w);
    setCanvasH(h);
    const fit = Math.min(0.7, 520 / Math.max(w, h));
    setZoom(fit);
  };

  const useMedia = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setSaving(true);
    try {
      draw(true);
      await new Promise((r) => requestAnimationFrame(() => r(null)));

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
    } catch (err) {
      console.error(err);
      setSaving(false);
      draw(false);
    }
  };

  const tabs: { id: ToolTab; label: string }[] = [
    { id: 'text', label: 'Texto' },
    { id: 'shapes', label: 'Formas' },
    { id: 'upload', label: 'Imagen' },
    { id: 'background', label: 'Fondo' },
    { id: 'size', label: 'Tamaño' },
  ];

  return (
    <div className="polonto relative z-[400] flex h-[min(90vh,900px)] min-h-[640px] w-full overflow-hidden rounded-lg bg-[#0b1220] text-slate-100">
      {/* Left tools */}
      <aside className="flex w-[72px] shrink-0 flex-col items-center gap-1 border-r border-slate-800 bg-[#0f172a] py-3">
        {tabs.map((tb) => (
          <button
            key={tb.id}
            type="button"
            onClick={() => setTab(tb.id)}
            className={`w-[60px] rounded-md px-1 py-2 text-[11px] leading-tight transition ${
              tab === tb.id
                ? 'bg-sky-500/20 text-sky-300'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            {tb.label}
          </button>
        ))}
      </aside>

      {/* Side panel */}
      <aside className="flex w-[280px] shrink-0 flex-col gap-3 overflow-y-auto border-r border-slate-800 bg-[#111827] p-3">
        <div className="text-sm font-semibold tracking-wide text-slate-200">
          Media Editor
        </div>

        {tab === 'text' && (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-slate-400">Agregar texto</p>
            {TEXT_PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => addText(p)}
                className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-left text-sm hover:border-sky-500/50"
              >
                <span
                  className="block text-white"
                  style={{
                    fontSize: Math.min(22, p.fontSize / 3),
                    fontWeight: p.fontWeight,
                  }}
                >
                  {p.label}
                </span>
              </button>
            ))}
          </div>
        )}

        {tab === 'shapes' && (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-slate-400">Elementos</p>
            <button
              type="button"
              onClick={addRect}
              className="rounded-md border border-slate-700 bg-slate-900 px-3 py-3 text-left text-sm hover:border-sky-500/50"
            >
              ▢ Rectángulo
            </button>
            <button
              type="button"
              onClick={addCircle}
              className="rounded-md border border-slate-700 bg-slate-900 px-3 py-3 text-left text-sm hover:border-sky-500/50"
            >
              ○ Círculo / elipse
            </button>
          </div>
        )}

        {tab === 'upload' && (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-slate-400">Subir imagen al canvas</p>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="rounded-md border border-dashed border-slate-600 bg-slate-900 px-3 py-8 text-sm text-slate-300 hover:border-sky-500/60"
            >
              Elegir archivo…
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
        )}

        {tab === 'background' && (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-slate-400">Color de fondo</p>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={bg}
                onChange={(e) => setBg(e.target.value)}
                className="h-10 w-14 cursor-pointer rounded border border-slate-700 bg-transparent"
              />
              <input
                type="text"
                value={bg}
                onChange={(e) => setBg(e.target.value)}
                className="flex-1 rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  title={c}
                  className="h-7 w-7 rounded border border-slate-600"
                  style={{ background: c }}
                  onClick={() => setBg(c)}
                />
              ))}
            </div>
          </div>
        )}

        {tab === 'size' && (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-slate-400">Formato del lienzo</p>
            {SIZE_PRESETS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => applySize(s.w, s.h)}
                className={`rounded-md border px-3 py-2 text-left text-sm ${
                  canvasW === s.w && canvasH === s.h
                    ? 'border-sky-500 bg-sky-500/10'
                    : 'border-slate-700 bg-slate-900 hover:border-sky-500/40'
                }`}
              >
                <div className="font-medium">{s.label}</div>
                <div className="text-xs text-slate-400">
                  {s.w} × {s.h}
                </div>
              </button>
            ))}
            <div className="mt-2 grid grid-cols-2 gap-2">
              <label className="text-xs text-slate-400">
                Ancho
                <input
                  type="number"
                  className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-white"
                  value={canvasW}
                  onChange={(e) =>
                    applySize(Number(e.target.value) || 1080, canvasH)
                  }
                />
              </label>
              <label className="text-xs text-slate-400">
                Alto
                <input
                  type="number"
                  className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-white"
                  value={canvasH}
                  onChange={(e) =>
                    applySize(canvasW, Number(e.target.value) || 1080)
                  }
                />
              </label>
            </div>
          </div>
        )}

        {/* Properties of selected */}
        {selected && (
          <div className="mt-2 flex flex-col gap-2 border-t border-slate-800 pt-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Propiedades
              </span>
              <span className="text-[10px] text-slate-500">{selected.kind}</span>
            </div>

            {selected.kind !== 'image' && (
              <label className="text-xs text-slate-400">
                Color de relleno
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="color"
                    value={selected.fill}
                    onChange={(e) => updateSelected({ fill: e.target.value })}
                    className="h-8 w-10 cursor-pointer rounded border border-slate-700 bg-transparent"
                  />
                  <div className="flex flex-wrap gap-1">
                    {PRESET_COLORS.slice(0, 8).map((c) => (
                      <button
                        key={c}
                        type="button"
                        className="h-5 w-5 rounded border border-slate-600"
                        style={{ background: c }}
                        onClick={() => updateSelected({ fill: c })}
                      />
                    ))}
                  </div>
                </div>
              </label>
            )}

            {selected.kind === 'text' && (
              <>
                <label className="text-xs text-slate-400">
                  Texto
                  <textarea
                    className="mt-1 w-full rounded border border-slate-700 bg-slate-950 p-2 text-sm text-white"
                    rows={3}
                    value={selected.text || ''}
                    onChange={(e) => updateSelected({ text: e.target.value })}
                  />
                </label>
                <label className="text-xs text-slate-400">
                  Tipografía
                  <select
                    className="mt-1 w-full rounded border border-slate-700 bg-slate-950 p-2 text-sm text-white"
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
                <label className="text-xs text-slate-400">
                  Tamaño ({selected.fontSize || 32}px)
                  <input
                    type="range"
                    min={12}
                    max={180}
                    className="mt-1 w-full"
                    value={selected.fontSize || 32}
                    onChange={(e) =>
                      updateSelected({
                        fontSize: Number(e.target.value) || 32,
                      })
                    }
                  />
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className={`flex-1 rounded border px-2 py-1 text-sm font-bold ${
                      selected.fontWeight === 'bold'
                        ? 'border-sky-500 bg-sky-500/20'
                        : 'border-slate-700'
                    }`}
                    onClick={() =>
                      updateSelected({
                        fontWeight:
                          selected.fontWeight === 'bold' ? 'normal' : 'bold',
                      })
                    }
                  >
                    B
                  </button>
                  <button
                    type="button"
                    className={`flex-1 rounded border px-2 py-1 text-sm italic ${
                      selected.fontStyle === 'italic'
                        ? 'border-sky-500 bg-sky-500/20'
                        : 'border-slate-700'
                    }`}
                    onClick={() =>
                      updateSelected({
                        fontStyle:
                          selected.fontStyle === 'italic' ? 'normal' : 'italic',
                      })
                    }
                  >
                    I
                  </button>
                  {(['left', 'center', 'right'] as const).map((a) => (
                    <button
                      key={a}
                      type="button"
                      className={`flex-1 rounded border px-1 py-1 text-[10px] ${
                        (selected.align || 'left') === a
                          ? 'border-sky-500 bg-sky-500/20'
                          : 'border-slate-700'
                      }`}
                      onClick={() => updateSelected({ align: a })}
                    >
                      {a === 'left' ? '⟸' : a === 'center' ? '⇔' : '⟹'}
                    </button>
                  ))}
                </div>
              </>
            )}

            {(selected.kind === 'rect' || selected.kind === 'image') && (
              <label className="text-xs text-slate-400">
                Bordes redondeados ({selected.radius || 0})
                <input
                  type="range"
                  min={0}
                  max={120}
                  className="mt-1 w-full"
                  value={selected.radius || 0}
                  onChange={(e) =>
                    updateSelected({ radius: Number(e.target.value) })
                  }
                />
              </label>
            )}

            {(selected.kind === 'rect' || selected.kind === 'circle') && (
              <>
                <label className="text-xs text-slate-400">
                  Contorno
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="color"
                      value={selected.stroke || '#ffffff'}
                      onChange={(e) =>
                        updateSelected({
                          stroke: e.target.value,
                          strokeWidth: selected.strokeWidth || 4,
                        })
                      }
                      className="h-8 w-10 cursor-pointer rounded border border-slate-700 bg-transparent"
                    />
                    <input
                      type="number"
                      min={0}
                      max={40}
                      className="w-20 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm"
                      value={selected.strokeWidth || 0}
                      onChange={(e) =>
                        updateSelected({
                          strokeWidth: Number(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                </label>
              </>
            )}

            <label className="text-xs text-slate-400">
              Opacidad ({Math.round((selected.opacity ?? 1) * 100)}%)
              <input
                type="range"
                min={10}
                max={100}
                className="mt-1 w-full"
                value={Math.round((selected.opacity ?? 1) * 100)}
                onChange={(e) =>
                  updateSelected({ opacity: Number(e.target.value) / 100 })
                }
              />
            </label>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className="rounded border border-slate-700 px-2 py-1.5 text-xs hover:bg-slate-800"
                onClick={bringForward}
              >
                Adelante
              </button>
              <button
                type="button"
                className="rounded border border-slate-700 px-2 py-1.5 text-xs hover:bg-slate-800"
                onClick={sendBackward}
              >
                Atrás
              </button>
              <button
                type="button"
                className="rounded border border-slate-700 px-2 py-1.5 text-xs hover:bg-slate-800"
                onClick={duplicateSelected}
              >
                Duplicar
              </button>
              <button
                type="button"
                className="rounded border border-red-500/40 px-2 py-1.5 text-xs text-red-300 hover:bg-red-500/10"
                onClick={deleteSelected}
              >
                Eliminar
              </button>
            </div>
          </div>
        )}

        {/* Layers */}
        {items.length > 0 && (
          <div className="mt-2 border-t border-slate-800 pt-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Capas
            </div>
            <div className="flex max-h-40 flex-col gap-1 overflow-y-auto">
              {[...items].reverse().map((it) => (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => setSelectedId(it.id)}
                  className={`rounded px-2 py-1.5 text-left text-xs ${
                    it.id === selectedId
                      ? 'bg-sky-500/20 text-sky-200'
                      : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  {it.kind === 'text'
                    ? `T: ${(it.text || '').slice(0, 24)}`
                    : it.kind === 'image'
                      ? 'Imagen'
                      : it.kind === 'rect'
                        ? 'Rectángulo'
                        : 'Círculo'}
                </button>
              ))}
            </div>
          </div>
        )}
      </aside>

      {/* Canvas stage */}
      <div className="relative flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between gap-3 border-b border-slate-800 bg-[#0f172a] px-4 py-2">
          <div className="text-xs text-slate-400">
            {canvasW} × {canvasH}px
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded border border-slate-700 px-2 py-1 text-xs"
              onClick={() => setZoom((z) => Math.max(0.15, z - 0.05))}
            >
              −
            </button>
            <span className="w-12 text-center text-xs text-slate-300">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              className="rounded border border-slate-700 px-2 py-1 text-xs"
              onClick={() => setZoom((z) => Math.min(1.5, z + 0.05))}
            >
              +
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="text-xs text-slate-400 underline"
              onClick={closeModal}
            >
              Cancelar
            </button>
            <Button
              loading={saving}
              className="outline-none"
              onClick={useMedia}
            >
              {t('use_this_media', 'Usar este medio')}
            </Button>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center overflow-auto bg-[radial-gradient(circle_at_center,#1e293b_0%,#020617_70%)] p-6">
          <div
            className="shadow-2xl ring-1 ring-slate-700"
            style={{
              width: canvasW * zoom,
              height: canvasH * zoom,
            }}
          >
            <canvas
              ref={canvasRef}
              width={canvasW}
              height={canvasH}
              className="h-full w-full cursor-default bg-black"
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={onMouseUp}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Polonto;
