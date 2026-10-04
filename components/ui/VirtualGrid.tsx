'use client';
import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

// Grille de cartes virtualisée pour les longues listes (Compadex, Alliés,
// Collection des compagnons : jusqu'à ~500 cartes et 30 000 nœuds DOM).
//
// La liste est découpée en blocs de quelques lignes complètes. Seuls les blocs
// proches de la zone visible du conteneur qui défile sont montés ; les autres
// sont remplacés par un espace vide de leur dernière hauteur mesurée (ou d'une
// estimation), pour garder la barre de défilement stable. Les blocs se
// montent un par frame : l'ouverture de la page ne gèle donc plus, même sur
// une grosse collection (rendu progressif, ancien useProgressiveCount).
//
// Chaque bloc est une sous-grille (`grid-template-columns: subgrid`) de la
// grille parente : colonnes, écarts et media queries restent ceux de la
// classe CSS d'origine (.collection-grid, .upgrades-ally-grid...), et un bloc
// incomplet ne change pas la largeur des cartes.

const ROWS_PER_BLOCK = 4;
// Hystérésis : un bloc se monte à moins de MOUNT_MARGIN de la zone visible
// mais ne se démonte qu'au-delà d'UNMOUNT_MARGIN. Avec une seule limite, un
// bloc posé pile dessus oscillait à chaque frame : monté, il la dépassait
// d'une fraction de pixel ; démonté, son espace vide (hauteur légèrement
// différente) la touchait de nouveau.
const MOUNT_MARGIN = '1000px 0px';
const UNMOUNT_MARGIN = '2000px 0px';
const FALLBACK_BLOCK_HEIGHT = 600;

// Hauteur moyenne d'un bloc par classe de grille, partagée entre grilles
// (les groupes de rareté du Compadex) et entre visites de la page : un
// groupe jamais affiché estime ainsi sa hauteur à partir des autres.
const sharedEstimates = new Map<string, number>();

// File de montage partagée par toutes les grilles : un bloc par frame.
const mountQueue = new Set<() => void>();
let frameScheduled = false;
function scheduleMount() {
  if (frameScheduled || mountQueue.size === 0) return;
  frameScheduled = true;
  requestAnimationFrame(() => {
    frameScheduled = false;
    const next = mountQueue.values().next().value;
    if (next) {
      mountQueue.delete(next);
      next();
    }
    scheduleMount();
  });
}

function findScrollParent(el: HTMLElement): HTMLElement | null {
  for (let p = el.parentElement; p; p = p.parentElement) {
    const { overflowY } = getComputedStyle(p);
    if (overflowY === 'auto' || overflowY === 'scroll') return p;
  }
  return null;
}

type Register = (el: Element, handlers: { onEnter: () => void; onLeave: () => void; onExitMountZone: () => void }) => () => void;

interface Props<T> {
  items: readonly T[];
  getKey: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  className: string;
  // Monte le premier bloc dès le premier rendu (pas d'écran vide à
  // l'ouverture). À désactiver pour les grilles plus bas dans la page.
  eager?: boolean;
}

export function VirtualGrid<T>({ items, getKey, renderItem, className, eager = true }: Props<T>) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [cols, setCols] = useState(1);
  const [ownEstimate, setOwnEstimate] = useState<number | null>(null);
  const estimate = ownEstimate ?? sharedEstimates.get(className) ?? FALLBACK_BLOCK_HEIGHT;
  const heights = useRef(new Map<number, number>());

  // Nombre de colonnes réel de la grille CSS (dépend de la largeur et des
  // media queries) : les blocs doivent contenir des lignes complètes.
  useLayoutEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const measure = () => {
      const n = getComputedStyle(el).gridTemplateColumns.split(' ').filter(Boolean).length;
      setCols(c => (n > 0 && n !== c ? n : c));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Deux IntersectionObserver par grille (zone de montage / de démontage),
  // créés au premier enregistrement (les effets des blocs passent avant celui
  // de la grille), avec pour racine le conteneur qui défile : sinon la marge
  // ne s'appliquerait qu'au viewport et les blocs sous le pli ne seraient
  // jamais préparés.
  const observers = useRef<{ mount: IntersectionObserver; unmount: IntersectionObserver } | null>(null);
  const handlers = useRef(new Map<Element, Parameters<Register>[1]>());
  const register = useCallback<Register>((el, h) => {
    if (!observers.current) {
      const root = gridRef.current ? findScrollParent(gridRef.current) : null;
      observers.current = {
        mount: new IntersectionObserver(entries => {
          for (const e of entries) {
            const cb = handlers.current.get(e.target);
            if (e.isIntersecting) cb?.onEnter(); else cb?.onExitMountZone();
          }
        }, { root, rootMargin: MOUNT_MARGIN }),
        unmount: new IntersectionObserver(entries => {
          for (const e of entries) if (!e.isIntersecting) handlers.current.get(e.target)?.onLeave();
        }, { root, rootMargin: UNMOUNT_MARGIN }),
      };
    }
    const { mount, unmount } = observers.current;
    handlers.current.set(el, h);
    mount.observe(el);
    unmount.observe(el);
    return () => {
      mount.unobserve(el);
      unmount.unobserve(el);
      handlers.current.delete(el);
    };
  }, []);
  useEffect(() => () => {
    observers.current?.mount.disconnect();
    observers.current?.unmount.disconnect();
  }, []);

  const blockSize = cols * ROWS_PER_BLOCK;
  // Hauteurs mesurées périmées quand le découpage change.
  useEffect(() => { heights.current.clear(); }, [blockSize]);

  const onMeasure = useCallback((index: number, h: number) => {
    if (h <= 0) return;
    heights.current.set(index, h);
    const all = [...heights.current.values()];
    const avg = Math.round(all.reduce((a, b) => a + b, 0) / all.length);
    sharedEstimates.set(className, avg);
    setOwnEstimate(prev => (prev == null || Math.abs(prev - avg) > prev * 0.1 ? avg : prev));
  }, [className]);

  const blocks: T[][] = [];
  for (let i = 0; i < items.length; i += blockSize) blocks.push(items.slice(i, i + blockSize));

  return (
    <div ref={gridRef} className={className}>
      {blocks.map((block, i) => (
        <Block
          key={i}
          index={i}
          layoutKey={blockSize}
          items={block}
          getKey={getKey}
          renderItem={renderItem}
          register={register}
          estimate={estimate}
          onMeasure={onMeasure}
          initiallyMounted={eager && i === 0}
        />
      ))}
    </div>
  );
}

const MOUNTED_STYLE = { gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: 'subgrid', rowGap: 'inherit' } as const;

function Block<T>({ index, layoutKey, items, getKey, renderItem, register, estimate, onMeasure, initiallyMounted }: {
  index: number;
  layoutKey: number;
  items: readonly T[];
  getKey: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  register: Register;
  estimate: number;
  onMeasure: (index: number, h: number) => void;
  initiallyMounted: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // `height` : hauteur réelle au moment du démontage, reprise par l'espace
  // vide tant que le découpage (layoutKey) n'a pas changé.
  const [view, setView] = useState<{ mounted: boolean; height: number | null; key: number }>(
    { mounted: initiallyMounted, height: null, key: layoutKey },
  );
  const mountedRef = useRef(view.mounted);
  const layoutKeyRef = useRef(layoutKey);
  useLayoutEffect(() => {
    mountedRef.current = view.mounted;
    layoutKeyRef.current = layoutKey;
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let pending: (() => void) | null = null;
    const cancel = () => { if (pending) { mountQueue.delete(pending); pending = null; } };
    const unregister = register(el, {
      onEnter: () => {
        if (mountedRef.current || pending) return;
        pending = () => { pending = null; setView(v => ({ ...v, mounted: true })); };
        mountQueue.add(pending);
        scheduleMount();
      },
      // Sorti de la zone de montage avant son tour : inutile de le monter.
      onExitMountZone: cancel,
      onLeave: () => {
        cancel();
        if (!mountedRef.current) return;
        // Hauteur exacte (offsetHeight arrondit au pixel).
        setView({ mounted: false, height: el.getBoundingClientRect().height || null, key: layoutKeyRef.current });
      },
    });
    return () => { unregister(); cancel(); };
  }, [register]);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!view.mounted || !el) return;
    const ro = new ResizeObserver(() => onMeasure(index, el.getBoundingClientRect().height));
    ro.observe(el);
    return () => ro.disconnect();
  }, [view.mounted, index, onMeasure]);

  const placeholderHeight = view.height != null && view.key === layoutKey ? view.height : estimate;
  // Même élément monté ou non : l'IntersectionObserver continue de le suivre.
  return (
    <div ref={ref} style={view.mounted ? MOUNTED_STYLE : { gridColumn: '1 / -1', height: placeholderHeight }}>
      {view.mounted && items.map(item => <Fragment key={getKey(item)}>{renderItem(item)}</Fragment>)}
    </div>
  );
}
