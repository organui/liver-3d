import {
  Component,
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronRight,
  CircleHelp,
  Eye,
  EyeOff,
  Focus,
  Info,
  Layers3,
  Minus,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
import {
  sources,
  structures,
  tour,
  type StructureId,
  type ViewName,
} from "./anatomy";
import { allIds, isolate, selectVisible, toggleHidden } from "./state";
import type { Command } from "./Scene";
import ViewMenu from "./ViewMenu";

const Scene = lazy(() => import("./Scene"));
const groups = ["Organ", "Vessel", "Biliary"] as const;
const groupLabels = {
  Organ: "Liver",
  Vessel: "Blood vessels",
  Biliary: "Biliary system",
};

class SceneBoundary extends Component<
  { children: ReactNode; onError: (s: string) => void },
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  componentDidCatch() {
    this.props.onError(
      "3D rendering is unavailable in this browser. Try enabling hardware acceleration or use another browser.",
    );
  }
  render() {
    return this.state.error ? null : this.props.children;
  }
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const q = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(q.matches);
    q.addEventListener("change", update);
    return () => q.removeEventListener("change", update);
  }, []);
  return reduced;
}

export default function App() {
  const [selected, setSelected] = useState<StructureId | null>(null);
  const [hidden, setHidden] = useState<StructureId[]>([]);
  const [reveal, setReveal] = useState(false);
  const [query, setQuery] = useState("");
  const [step, setStep] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [activeView, setActiveView] = useState<ViewName | "Custom view">(
    "Overview",
  );
  const [command, setCommand] = useState<Command>({
    serial: 0,
    type: "view",
    view: "Overview",
  });
  const [info, setInfo] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const searchInput = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const anatomyPanel = useRef<HTMLElement>(null);
  const sidebarToggle = useRef<HTMLButtonElement>(null);
  const structureList = useRef<HTMLDivElement>(null);
  const selectedRow = useRef<HTMLLIElement>(null);
  const focusTarget = useRef<"panel" | "search" | null>(null);
  const reducedMotion = useReducedMotion();
  const current = structures.find((s) => s.id === selected);
  const isolated =
    selected !== null &&
    hidden.length === allIds.length - 1 &&
    !hidden.includes(selected);
  const filtered = structures.filter((s) =>
    `${s.name} ${s.sourceName} ${s.category} ${s.fma} ${groupLabels[s.category]}`
      .toLowerCase()
      .includes(query.toLowerCase().trim()),
  );

  useLayoutEffect(() => {
    const list = structureList.current,
      row = selectedRow.current;
    if (!sidebarOpen || !list || !row || list.scrollHeight <= list.clientHeight)
      return;
    const bounds = list.getBoundingClientRect(),
      item = row.getBoundingClientRect();
    if (item.top < bounds.top) list.scrollTop += item.top - bounds.top;
    else if (item.bottom > bounds.bottom)
      list.scrollTop += item.bottom - bounds.bottom;
  }, [selected, query, step, sidebarOpen]);

  useLayoutEffect(() => {
    if (!sidebarOpen || !focusTarget.current) return;
    const target = focusTarget.current;
    focusTarget.current = null;
    (target === "search" ? searchInput.current : anatomyPanel.current)?.focus({
      preventScroll: true,
    });
    if (matchMedia("(max-width: 760px)").matches) {
      anatomyPanel.current?.scrollIntoView({
        behavior: "instant",
        block: "start",
      });
    }
  }, [sidebarOpen]);

  const openAnatomy = useCallback(
    (target: "panel" | "search" = "panel") => {
      if (sidebarOpen) {
        (target === "search"
          ? searchInput.current
          : anatomyPanel.current
        )?.focus();
        return;
      }
      focusTarget.current = target;
      setSidebarOpen(true);
    },
    [sidebarOpen],
  );

  const closeAnatomy = () => {
    setSidebarOpen(false);
    sidebarToggle.current?.focus();
  };
  const issue = useCallback((message: string) => {
    setError(message);
    setReady(false);
  }, []);
  const loaded = useCallback(() => {
    setProgress(100);
    setReady(true);
  }, []);
  const orbit = useCallback(() => setActiveView("Custom view"), []);
  const view = (name: ViewName) => {
    setActiveView(name);
    setCommand((c) => ({ serial: c.serial + 1, type: "view", view: name }));
  };
  const zoom = (amount: number) =>
    setCommand((c) => ({ ...c, serial: c.serial + 1, type: "zoom", amount }));
  const rotate = (amount: number, axis: "horizontal" | "vertical") => {
    orbit();
    setCommand((c) => ({
      ...c,
      serial: c.serial + 1,
      type: "rotate",
      amount,
      axis,
    }));
  };
  const select = useCallback((id: StructureId) => {
    setSelected(id);
    setHidden((h) => selectVisible(h, id));
    if (id !== "liver" && id !== "gallbladder") setReveal(true);
    setStep(null);
    setAnnouncement(`${structures.find((s) => s.id === id)!.name} selected.`);
  }, []);
  const toggle = (id: StructureId) => {
    setHidden((h) => toggleHidden(h, id));
    setStep(null);
    setAnnouncement(
      `${structures.find((s) => s.id === id)!.name} ${hidden.includes(id) ? "shown" : "hidden"}.`,
    );
  };
  const restore = () => {
    setHidden([]);
    setReveal(false);
    setStep(null);
    setAnnouncement(`All ${structures.length} structures restored.`);
  };
  const reset = () => {
    restore();
    setSelected(null);
    setQuery("");
    view("Overview");
    setAnnouncement("Explorer reset. All structures visible, overview view.");
  };
  const jump = (n: number) => {
    const t = tour[n];
    setStep(n);
    setQuery("");
    setSelected(t.selected);
    setHidden([]);
    setReveal(t.reveal);
    view(t.view);
    setAnnouncement(`Tour step ${n + 1} of ${tour.length}: ${t.title}.`);
  };
  const retry = () => {
    setError("");
    setReady(false);
    setProgress(0);
    setAttempt((n) => n + 1);
  };

  useEffect(() => {
    const search = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        !info &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement) &&
        !(e.target instanceof HTMLElement && e.target.isContentEditable)
      ) {
        e.preventDefault();
        openAnatomy("search");
      }
    };
    window.addEventListener("keydown", search);
    return () => window.removeEventListener("keydown", search);
  }, [info, openAnatomy]);
  useEffect(() => {
    if (info) dialog.current?.showModal();
    else dialog.current?.close();
  }, [info]);

  return (
    <>
      <a
        className="skip-link"
        href="#anatomy"
        onClick={(e) => {
          e.preventDefault();
          openAnatomy();
        }}
      >
        Skip to anatomy text
      </a>
      <header className="site-header">
        <a className="brand" href="./" aria-label="OrganUI Liver home">
          <span className="brand-icon">
            <Activity size={21} strokeWidth={1.6} />
          </span>
          <span>
            Organ<span className="brand-light">UI</span>
          </span>
          <span className="brand-slash">/</span>
          <span className="brand-product">Liver</span>
        </a>
        <nav aria-label="Project">
          <button
            className="text-button about-button"
            aria-label="About this model"
            onClick={() => setInfo(true)}
          >
            <Info size={15} />
            <span>About this model</span>
          </button>
          <button
            ref={sidebarToggle}
            className="sidebar-toggle"
            aria-label={
              sidebarOpen
                ? "Collapse anatomy sidebar"
                : "Expand anatomy sidebar"
            }
            aria-expanded={sidebarOpen}
            aria-controls="anatomy"
            onClick={() => (sidebarOpen ? closeAnatomy() : openAnatomy())}
          >
            {sidebarOpen ? (
              <PanelRightClose size={17} />
            ) : (
              <PanelRightOpen size={17} />
            )}
            <span>Anatomy</span>
          </button>
        </nav>
      </header>
      <main className={`explorer ${sidebarOpen ? "sidebar-open" : ""}`}>
        <section className="stage" aria-labelledby="page-title">
          <h1 id="page-title" className="sr-only">
            Liver anatomy explorer
          </h1>
          <div
            className="canvas-wrap"
            role="region"
            tabIndex={0}
            aria-label="Interactive 3D liver model"
            aria-describedby="model-instructions"
            onKeyDown={(e) => {
              if (!ready || e.target !== e.currentTarget) return;
              if (
                ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(
                  e.key,
                )
              ) {
                e.preventDefault();
                const horizontal =
                  e.key === "ArrowLeft" || e.key === "ArrowRight";
                rotate(
                  ((e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 1) *
                    Math.PI) /
                    12,
                  horizontal ? "horizontal" : "vertical",
                );
              } else if (["+", "=", "-", "_"].includes(e.key)) {
                e.preventDefault();
                zoom(e.key === "-" || e.key === "_" ? 1.22 : 0.82);
              }
            }}
          >
            {!error && (
              <SceneBoundary key={attempt} onError={issue}>
                <Suspense fallback={null}>
                  <Scene
                    selected={selected}
                    hidden={hidden}
                    reveal={reveal}
                    isolated={isolated}
                    command={command}
                    reducedMotion={reducedMotion}
                    onSelect={(id) => {
                      setQuery("");
                      select(id);
                    }}
                    onProgress={setProgress}
                    onReady={loaded}
                    onError={issue}
                    onOrbit={orbit}
                  />
                </Suspense>
              </SceneBoundary>
            )}
            {!ready && !error && (
              <div className="stage-message" role="status">
                <Layers3 size={25} />
                <h2>Preparing your perspective</h2>
                <p>Loading the anatomy model · {progress}%</p>
                <progress
                  aria-label="Model loading"
                  value={progress}
                  max={100}
                />
              </div>
            )}
            {error && (
              <div className="stage-message" role="alert">
                <CircleHelp size={28} />
                <h2>The model couldn’t open</h2>
                <p>{error}</p>
                <p>
                  You can still explore all anatomy descriptions in the anatomy
                  panel.
                </p>
                <button className="button primary" onClick={retry}>
                  Retry 3D viewer
                </button>
                <button className="text-button" onClick={() => openAnatomy()}>
                  Explore anatomy text <ArrowRight size={14} />
                </button>
              </div>
            )}
            {ready && hidden.length < allIds.length && (
              <p className="canvas-hint">
                Drag to rotate · Scroll or pinch to zoom
              </p>
            )}
          </div>
          <div className="scene-status">
            <span className={`status-dot ${ready ? "" : "pending"}`} />
            {ready
              ? `${structures.length - hidden.length} of ${structures.length} structures visible`
              : "Anatomy text always available"}
            {hidden.length > 0 && (
              <button onClick={restore}>Restore all</button>
            )}
          </div>
          {current && (
            <div className="selection-chip">
              <span
                className="color-dot"
                style={{ background: current.color }}
              />
              <button className="selection-name" onClick={() => openAnatomy()}>
                {current.name}
              </button>
              {hidden.includes(current.id) ? (
                <EyeOff size={13} />
              ) : (
                <Check size={13} />
              )}
              <button
                aria-label="Clear selection"
                onClick={() => {
                  setSelected(null);
                  setStep(null);
                }}
              >
                <X size={14} />
              </button>
            </div>
          )}
          {ready && hidden.length === allIds.length && (
            <div className="empty-scene">
              <EyeOff size={24} />
              <p>All structures are hidden.</p>
              <button className="button" onClick={restore}>
                Restore all structures
              </button>
            </div>
          )}
          <div className="stage-bottom">
            <div className="camera-toolbar" aria-label="Camera controls">
              <ViewMenu view={activeView} disabled={!ready} onChange={view} />
              <div
                className="camera-actions"
                role="group"
                aria-label="Zoom and reset"
              >
                <button
                  className="icon-button"
                  aria-label="Zoom in"
                  title="Zoom in"
                  disabled={!ready}
                  onClick={() => zoom(0.82)}
                >
                  <Plus size={17} />
                </button>
                <button
                  className="icon-button"
                  aria-label="Zoom out"
                  title="Zoom out"
                  disabled={!ready}
                  onClick={() => zoom(1.22)}
                >
                  <Minus size={17} />
                </button>
                <button
                  className="icon-button reset-button"
                  aria-label="Reset explorer"
                  title="Reset view, selection, and visibility"
                  onClick={reset}
                >
                  <RotateCcw size={16} />
                </button>
              </div>
            </div>
          </div>
          <p id="model-instructions" className="sr-only">
            Drag to rotate and scroll or pinch to zoom. Focus the model and use
            arrow keys to rotate, plus and minus to zoom. Select structures in
            the anatomy panel for the same information without using the 3D
            view. Press / to open anatomy search.
          </p>
        </section>
        <aside
          className="anatomy-panel"
          id="anatomy"
          hidden={!sidebarOpen}
          tabIndex={-1}
          ref={anatomyPanel}
          aria-label="Anatomy and exploration"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.stopPropagation();
              closeAnatomy();
            }
          }}
        >
          <div className="panel-heading">
            <div>
              <h2>Anatomy</h2>
              <span className="count-tag">{structures.length} structures</span>
            </div>
            <button
              className="icon-button"
              aria-label="Close anatomy sidebar"
              onClick={closeAnatomy}
            >
              <X size={18} />
            </button>
          </div>
          <div className="search-wrap">
            <Search size={16} />
            <input
              ref={searchInput}
              type="search"
              aria-label="Search structures"
              placeholder="Find a structure…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button aria-label="Clear search" onClick={() => setQuery("")}>
                <X size={14} />
              </button>
            )}
          </div>
          <div
            className="structure-list"
            aria-label="Liver structures"
            ref={structureList}
          >
            {groups.map((group) => {
              const items = filtered.filter((s) => s.category === group);
              if (!items.length) return null;
              return (
                <section key={group} aria-label={groupLabels[group]}>
                  <h3>{groupLabels[group]}</h3>
                  <ul>
                    {items.map((s) => (
                      <li
                        key={s.id}
                        ref={selected === s.id ? selectedRow : undefined}
                        className={`${selected === s.id ? "selected" : ""} ${hidden.includes(s.id) ? "is-hidden" : ""}`}
                        style={
                          { "--structure-color": s.color } as CSSProperties
                        }
                      >
                        <button
                          className="structure-select"
                          aria-label={`Select ${s.name}`}
                          aria-pressed={selected === s.id}
                          onClick={() => select(s.id)}
                        >
                          <span className="color-dot" />
                          <span>
                            {s.name}
                            {hidden.includes(s.id) && <small>Hidden</small>}
                          </span>
                          {selected === s.id && <ChevronRight size={15} />}
                        </button>
                        <button
                          className="visibility-button"
                          aria-label={`${hidden.includes(s.id) ? "Show" : "Hide"} ${s.name}`}
                          aria-pressed={!hidden.includes(s.id)}
                          onClick={() => toggle(s.id)}
                          title={`${hidden.includes(s.id) ? "Show" : "Hide"} structure`}
                        >
                          {hidden.includes(s.id) ? (
                            <EyeOff size={15} />
                          ) : (
                            <Eye size={15} />
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
            {!filtered.length && (
              <div className="no-results">
                <Search size={23} />
                <h3>No matching structures</h3>
                <p>Try “portal”, “bile”, or an FMA identifier.</p>
                <button className="text-button" onClick={() => setQuery("")}>
                  Clear search
                </button>
              </div>
            )}
          </div>
          <button
            className="reveal-control"
            role="switch"
            aria-label="Reveal interior"
            aria-checked={reveal}
            onClick={() => {
              setReveal(!reveal);
              setHidden((h) => selectVisible(h, "liver"));
              setStep(null);
            }}
          >
            <Layers3 size={17} />
            <span>
              Reveal interior<small>See vessels through the surface</small>
            </span>
            <span className="switch-track" aria-hidden="true">
              <span />
            </span>
          </button>
          <section className="detail-card" aria-label="Structure details">
            {current ? (
              <>
                <div className="detail-eyebrow">
                  <span className="eyebrow">
                    {current.category.toUpperCase()}
                  </span>
                  <span>{current.fma}</span>
                </div>
                <h2>{current.name}</h2>
                <p>{current.description}</p>
                <div className="detail-actions">
                  <button
                    className="button primary"
                    onClick={() => {
                      setHidden(isolated ? [] : isolate(current.id));
                      setReveal(false);
                      setStep(null);
                      view("Overview");
                      setAnnouncement(
                        isolated
                          ? "All structures restored."
                          : `${current.name} isolated.`,
                      );
                    }}
                  >
                    <Focus size={15} />
                    {isolated ? "Show all" : "Isolate"}
                  </button>
                  <button className="button" onClick={() => toggle(current.id)}>
                    {hidden.includes(current.id) ? (
                      <Eye size={15} />
                    ) : (
                      <EyeOff size={15} />
                    )}
                    {hidden.includes(current.id) ? "Show structure" : "Hide"}
                  </button>
                  {hidden.length > 0 && (
                    <button
                      className="text-button restore-detail"
                      onClick={restore}
                    >
                      Restore all
                    </button>
                  )}
                </div>
                <button
                  className="text-button mobile-return"
                  onClick={closeAnatomy}
                >
                  View in 3D <ArrowUpRight size={14} />
                </button>
                <details className="model-note" key={current.id}>
                  <summary>Model notes & reference</summary>
                  <p>{current.note}</p>
                  <p>
                    Source label: {current.sourceName} ({current.fma}).
                  </p>
                  <a
                    href={sources[current.source].url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {sources[current.source].label}
                    <ArrowUpRight size={12} />
                  </a>
                </details>
              </>
            ) : (
              <>
                <h2>Select a structure</h2>
                <p>
                  Choose a part of the liver or a name above to explore its
                  anatomy.
                </p>
                <span className="small-note">
                  Colors distinguish structures; they are illustrative.
                </span>
              </>
            )}
          </section>
          <section
            className={`tour-card ${step !== null ? "tour-active" : ""}`}
            aria-label="Guided exploration"
          >
            {step === null ? (
              <>
                <div className="tour-icon">
                  <BookOpen size={18} />
                </div>
                <div>
                  <h3>Guided exploration</h3>
                  <p>{tour.length} stops · At your own pace</p>
                </div>
                <button
                  aria-label="Start guided exploration"
                  className="tour-start"
                  onClick={() => jump(0)}
                >
                  <ArrowRight size={19} />
                </button>
              </>
            ) : (
              <>
                <div className="tour-top">
                  <span className="eyebrow">
                    GUIDED EXPLORATION · {step + 1} / {tour.length}
                  </span>
                  <button
                    className="icon-button"
                    aria-label="End guided exploration"
                    onClick={restore}
                  >
                    <X size={15} />
                  </button>
                </div>
                <div className="tour-progress" aria-hidden="true">
                  {tour.map((_, i) => (
                    <span className={i <= step ? "complete" : ""} key={i} />
                  ))}
                </div>
                <h3>{tour[step].title}</h3>
                <p>{tour[step].text}</p>
                <div className="tour-controls">
                  <button
                    className="text-button"
                    disabled={step === 0}
                    onClick={() => jump(step - 1)}
                  >
                    <ArrowLeft size={14} />
                    Back
                  </button>
                  <button
                    className="text-button"
                    onClick={() =>
                      step === tour.length - 1 ? reset() : jump(step + 1)
                    }
                  >
                    {step === tour.length - 1 ? "Finish tour" : "Next stop"}
                    <ArrowRight size={14} />
                  </button>
                </div>
              </>
            )}
          </section>
          <p className="review-note">
            <span className="status-dot" />
            Educational demo · Content awaiting expert review
          </p>
        </aside>
      </main>
      <footer className="site-footer">
        <span>Educational model</span>
        <span>
          Model:{" "}
          <a
            href="https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html"
            target="_blank"
            rel="noreferrer"
          >
            BodyParts3D / DBCLS · CC BY 4.0 <ArrowUpRight size={11} />
          </a>
        </span>
      </footer>
      <div
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {announcement}
      </div>
      <dialog
        className="about-dialog"
        aria-labelledby="credits-title"
        ref={dialog}
        onCancel={() => setInfo(false)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setInfo(false);
        }}
      >
        <div className="dialog-top">
          <span className="eyebrow">BEHIND THE MODEL</span>
          <button
            className="icon-button"
            autoFocus
            aria-label="Close model and credits"
            onClick={() => setInfo(false)}
          >
            <X size={20} />
          </button>
        </div>
        <h2 id="credits-title">
          Real anatomy.
          <br />
          Open exploration.
        </h2>
        <p>
          BodyParts3D 4.0, released May 16, 2013. Seven selectable groups
          preserve the source geometry and relative positions. Colors are
          illustrative.
        </p>
        <p>
          BodyParts3D, © The Database Center for Life Science licensed under{" "}
          <a
            href="https://creativecommons.org/licenses/by/4.0/"
            target="_blank"
            rel="noreferrer"
          >
            CC Attribution 4.0 International
          </a>
          .
        </p>
        <p>
          Modified by OrganUI: selected, grouped, centered, rotated, uniformly
          scaled, recolored, normals recomputed, and converted to glTF. Code is
          MIT licensed; model assets have a separate license.
        </p>
        <p>
          <strong>Review status:</strong> identifiers and geometry have been
          checked during development. Expert anatomical review and clinical
          validation have not been completed. Source mappings may contain
          inconsistencies. No physiological simulation, diagnosis, or surgical
          planning is provided.
        </p>
        <p>
          Vessels and ducts are simplified and truncated. Tissue is grouped into
          one surface; independent lobes and clinically validated segment
          boundaries are not offered. The common bile duct, inferior vena cava,
          and adjacent organs are omitted.
        </p>
        <div className="dialog-links">
          <a
            className="button primary"
            href="https://github.com/organui/liver-3d"
            target="_blank"
            rel="noreferrer"
          >
            Explore the source <ArrowUpRight size={14} />
          </a>
          <a
            className="button"
            href="https://github.com/organui/liver-3d/blob/main/docs/MODEL_PROVENANCE.md"
            target="_blank"
            rel="noreferrer"
          >
            Provenance & preparation <ArrowUpRight size={14} />
          </a>
        </div>
      </dialog>
    </>
  );
}
