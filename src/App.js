import React, { useEffect, useRef, useState } from 'react';
import PlantUMLViewer from './component/PlantUMLViewer';
import './App.css';

const SAMPLE_DIAGRAM = `@startuml
skinparam backgroundColor transparent
skinparam shadowing false
skinparam roundcorner 18
skinparam ArrowColor #355C7D
skinparam defaultFontName Inter
skinparam defaultFontSize 14
skinparam ParticipantBorderColor #1F2937
skinparam ParticipantBackgroundColor #FFFFFF
skinparam ParticipantFontColor #0F172A

left to right direction

actor "Designer" as D
rectangle "PlantUML Viewer" as APP {
  usecase "Inspect result" as U1
  usecase "Edit source" as U2
  usecase "Return to canvas" as U3
}

D --> U1
D --> U2
U2 --> U3
@enduml`;

const MODE_OPTIONS = [
  { id: 'fitWidth', label: 'Full width', hint: 'Best for wide diagrams' },
  { id: 'fitHeight', label: 'Full height', hint: 'Best for tall diagrams' },
];

const ZOOM_STEP = 10;
const ZOOM_MIN = 1;
const ZOOM_MAX = 200;

const THEME_BLOCKS = {
  dark: `skinparam backgroundColor transparent
skinparam shadowing false
skinparam defaultFontName Inter
skinparam defaultFontSize 14
skinparam defaultFontColor #F8FAFC
skinparam ArrowColor #94A3B8
skinparam defaultLineColor #94A3B8
skinparam ParticipantBackgroundColor #111827
skinparam ParticipantBorderColor #64748B
skinparam ParticipantFontColor #F8FAFC
skinparam actorBorderColor #94A3B8
skinparam actorFontColor #F8FAFC
skinparam actorBackgroundColor #0F172A
skinparam ActorBorderColor #64748B
skinparam ActorFontColor #F8FAFC
skinparam ActorBackgroundColor #111827
skinparam LifeLineBorderColor #CBD5E1
skinparam LifeLineBackgroundColor #64748B
skinparam SequenceBoxBackgroundColor #0F172A
skinparam SequenceBoxBorderColor #64748B
skinparam SequenceGroupBackgroundColor #0F172A
skinparam SequenceGroupBorderColor #64748B
skinparam NoteBackgroundColor #1E293B
skinparam NoteBorderColor #64748B
skinparam BoxBackgroundColor #0F172A
skinparam BoxBorderColor #64748B
skinparam usecaseBorderColor #64748B
skinparam usecaseFontColor #F8FAFC
skinparam usecaseBackgroundColor #111827
skinparam rectangleBorderColor #64748B
skinparam rectangleFontColor #F8FAFC
skinparam rectangleBackgroundColor #111827
skinparam componentBorderColor #64748B
skinparam componentFontColor #F8FAFC
skinparam componentBackgroundColor #111827
skinparam classBorderColor #64748B
skinparam classFontColor #F8FAFC
skinparam classBackgroundColor #111827
skinparam stateBorderColor #64748B
skinparam stateFontColor #F8FAFC
skinparam stateBackgroundColor #111827
skinparam nodeBorderColor #64748B
skinparam nodeFontColor #F8FAFC
skinparam nodeBackgroundColor #111827
skinparam databaseBorderColor #64748B
skinparam databaseFontColor #F8FAFC
skinparam databaseBackgroundColor #111827
skinparam packageBorderColor #64748B
skinparam packageFontColor #F8FAFC
skinparam packageBackgroundColor #111827`,
  light: `skinparam backgroundColor transparent
skinparam shadowing false
skinparam defaultFontName Inter
skinparam defaultFontSize 14
skinparam defaultFontColor #0F172A
skinparam ArrowColor #475569
skinparam defaultLineColor #475569
skinparam rectangleBorderColor #334155
skinparam componentBorderColor #334155
skinparam classBorderColor #334155
skinparam usecaseBorderColor #334155
skinparam stateBorderColor #334155
skinparam nodeBorderColor #334155
skinparam databaseBorderColor #334155
skinparam packageBorderColor #334155`,
};

const BUTTON_STYLE = {
  type: 'button',
};

const applyThemeToSource = (source, theme) => {
  const themeBlock = THEME_BLOCKS[theme] || THEME_BLOCKS.dark;
  const endTag = '@enduml';
  const insertAt = source.lastIndexOf(endTag);

  if (insertAt === -1) {
    return `${source}\n${themeBlock}`;
  }

  return `${source.slice(0, insertAt)}${themeBlock}\n${source.slice(insertAt)}`;
};

const useElementSize = (ref) => {
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return undefined;
    }

    const updateSize = () => {
      const { clientWidth, clientHeight } = element;
      setSize({
        width: Math.round(clientWidth),
        height: Math.round(clientHeight),
      });
    };

    updateSize();

    const observer = new ResizeObserver(updateSize);
    observer.observe(element);

    return () => observer.disconnect();
  }, [ref]);

  return size;
};

const SourceDrawer = ({
  open,
  source,
  onChange,
  onClose,
  onCopy,
  copyLabel,
  editorRef,
}) => {
  return (
    <>
      <button
        className={`drawer-backdrop ${open ? 'is-visible' : ''}`}
        onClick={onClose}
        {...BUTTON_STYLE}
        aria-label="Close source drawer"
      />

      <aside className={`source-drawer ${open ? 'is-open' : ''}`} aria-hidden={!open}>
        <div className="drawer-shell">
          <div className="drawer-header">
            <div>
              <p className="drawer-kicker">Source drawer</p>
              <h2>Make quick edits without losing the diagram</h2>
            </div>

            <div className="drawer-actions">
              <button className="ghost-button" onClick={onCopy} {...BUTTON_STYLE}>
                {copyLabel}
              </button>
              <button className="solid-button" onClick={onClose} {...BUTTON_STYLE}>
                Return to view
              </button>
            </div>
          </div>

          <div className="drawer-body">
            <section className="editor-panel">
              <div className="panel-label-row">
                <span className="panel-label">Source</span>
                <span className="panel-hint">Ctrl/Cmd+E toggles the drawer</span>
              </div>
              <textarea
                className="source-editor"
                value={source}
                onChange={(event) => onChange(event.target.value)}
                ref={editorRef}
                spellCheck={false}
                wrap="off"
                aria-label="PlantUML source editor"
              />
            </section>
          </div>
        </div>
      </aside>
    </>
  );
};

const DiagramControls = ({
  mode,
  zoom,
  canZoomOut,
  onModeChange,
  onZoomIn,
  onZoomOut,
  onResetZoom,
}) => {
  return (
    <div className="diagram-controls" role="group" aria-label="Diagram display controls">
      <div className="mode-group" role="radiogroup" aria-label="Diagram fit mode">
        {MODE_OPTIONS.map((option) => (
          <button
            key={option.id}
            className={`mode-button ${mode === option.id ? 'is-active' : ''}`}
            onClick={() => onModeChange(option.id)}
            aria-pressed={mode === option.id}
            aria-label={option.label}
            {...BUTTON_STYLE}
          >
            {option.id === 'fitWidth' ? (
              <svg className="toolbar-icon" viewBox="0 0 20 20" aria-hidden="true">
                <rect x="4" y="5" width="12" height="10" rx="2.25" fill="none" stroke="currentColor" strokeWidth="1.6" />
                <path d="M2.8 10h3.1" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                <path d="M14.1 10h3.1" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                <path d="M4.9 8.4L2.8 10l2.1 1.6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M15.1 8.4L17.2 10l-2.1 1.6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg className="toolbar-icon" viewBox="0 0 20 20" aria-hidden="true">
                <rect x="5" y="4" width="10" height="12" rx="2.25" fill="none" stroke="currentColor" strokeWidth="1.6" />
                <path d="M10 2.8v3.1" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                <path d="M10 14.1v3.1" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                <path d="M8.4 4.9L10 2.8l1.6 2.1" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M8.4 15.1L10 17.2l1.6-2.1" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            <span className="sr-only">{option.label}</span>
          </button>
        ))}
      </div>

      <div className="zoom-group">
        <button className="zoom-button" onClick={onZoomOut} disabled={!canZoomOut} aria-label="Zoom out" {...BUTTON_STYLE}>
          <svg className="toolbar-icon" viewBox="0 0 20 20" aria-hidden="true">
            <circle cx="8.5" cy="8.5" r="5.1" fill="none" stroke="currentColor" strokeWidth="1.6" />
            <path d="M12.4 12.4L16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M6.4 8.5h4.2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
        <div className="zoom-readout" aria-label={`Zoom ${zoom}%`}>
          {zoom}%
        </div>
        <button className="zoom-button" onClick={onZoomIn} aria-label="Zoom in" {...BUTTON_STYLE}>
          <svg className="toolbar-icon" viewBox="0 0 20 20" aria-hidden="true">
            <circle cx="8.5" cy="8.5" r="5.1" fill="none" stroke="currentColor" strokeWidth="1.6" />
            <path d="M12.4 12.4L16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M8.5 6.4v4.2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M6.4 8.5h4.2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
        <button className="zoom-reset" onClick={onResetZoom} aria-label="Reset zoom" {...BUTTON_STYLE}>
          <svg className="toolbar-icon" viewBox="0 0 20 20" aria-hidden="true">
            <path d="M14.8 6.2a6.1 6.1 0 1 0 1.5 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M14.8 6.2v3.2h-3.2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
};

const App = () => {
  const [source, setSource] = useState(SAMPLE_DIAGRAM);
  const [renderedSource, setRenderedSource] = useState(SAMPLE_DIAGRAM);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [copyLabel, setCopyLabel] = useState('Copy source');
  const [mode, setMode] = useState('fitWidth');
  const [zoom, setZoom] = useState(100);
  const [theme, setTheme] = useState('dark');
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const debounceRef = useRef(null);
  const copyResetRef = useRef(null);
  const editorRef = useRef(null);
  const viewportRef = useRef(null);
  const viewportSize = useElementSize(viewportRef);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setRenderedSource(source);
    }, 220);

    return () => clearTimeout(debounceRef.current);
  }, [source]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      const isToggleShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'e';

      if (isToggleShortcut) {
        event.preventDefault();
        setDrawerOpen((current) => !current);
      }

      if (event.key === 'Escape') {
        setDrawerOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    return () => clearTimeout(debounceRef.current);
  }, []);

  useEffect(() => {
    return () => clearTimeout(copyResetRef.current);
  }, []);

  useEffect(() => {
    if (drawerOpen) {
      window.setTimeout(() => {
        editorRef.current?.focus();
      }, 0);
    }
  }, [drawerOpen]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(source);
      setCopyLabel('Copied');
    } catch (error) {
      setCopyLabel('Unavailable');
    }

    clearTimeout(copyResetRef.current);
    copyResetRef.current = window.setTimeout(() => {
      setCopyLabel('Copy source');
    }, 1200);
  };

  const handleImageLoad = (event) => {
    const { naturalWidth, naturalHeight } = event.currentTarget;
    setImageSize({
      width: naturalWidth,
      height: naturalHeight,
    });
  };

  const getFitScales = () => {
    if (!imageSize.width || !imageSize.height || !viewportSize.width || !viewportSize.height) {
      return {
        widthFitScale: 1,
        heightFitScale: 1,
      };
    }

    return {
      widthFitScale: Math.min(1, viewportSize.width / imageSize.width),
      heightFitScale: Math.min(1, viewportSize.height / imageSize.height),
    };
  };

  const { widthFitScale, heightFitScale } = getFitScales();

  const zoomScale = zoom / 100;
  const displayScale = widthFitScale * zoomScale;
  const displayWidth = Math.max(1, Math.round(imageSize.width * displayScale));
  const displayHeight = Math.max(1, Math.round(imageSize.height * displayScale));
  const isFullyVisible =
    Boolean(viewportSize.width && viewportSize.height && imageSize.width && imageSize.height) &&
    displayWidth <= viewportSize.width &&
    displayHeight <= viewportSize.height;
  const canZoomOut = !isFullyVisible && zoom > ZOOM_MIN;
  const getModeZoom = (nextMode) => {
    if (nextMode === 'fitHeight' && widthFitScale > 0) {
      return Math.round((heightFitScale / widthFitScale) * 100);
    }

    return 100;
  };

  const handleZoomIn = () => {
    setZoom((current) => Math.min(ZOOM_MAX, current + ZOOM_STEP));
  };

  const handleZoomOut = () => {
    if (!canZoomOut) {
      return;
    }

    setZoom((current) => Math.max(ZOOM_MIN, current - ZOOM_STEP));
  };

  const handleResetZoom = () => {
    setZoom(100);
  };

  const handleModeChange = (nextMode) => {
    setMode(nextMode);
    setZoom(getModeZoom(nextMode));
  };

  const handleDiagramWheel = (event) => {
    if (!event.ctrlKey) {
      return;
    }

    event.preventDefault();

    const direction = event.deltaY > 0 ? -1 : 1;

    if (direction < 0 && !canZoomOut) {
      return;
    }

    setZoom((current) => {
      const nextZoom = current + direction * ZOOM_STEP;
      return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, nextZoom));
    });
  };

  const themedSource = applyThemeToSource(renderedSource, theme);

  return (
    <div className={`app-shell theme-${theme} ${drawerOpen ? 'is-drawer-open' : ''}`}>
      <div className="app-orb app-orb-left" aria-hidden="true" />
      <div className="app-orb app-orb-right" aria-hidden="true" />

      <header className="app-header">
        <div className="brand-block">
          <div className="brand-mark" aria-hidden="true" />
          <div>
            <p className="brand-title">PlantUML Viewer</p>
            <p className="brand-subtitle">Built for clear diagram work</p>
          </div>
        </div>

        <div className="header-actions">
          <div className="status-pill">
            <span className="status-dot" />
            Live render
          </div>
          <DiagramControls
            mode={mode}
            zoom={zoom}
            canZoomOut={canZoomOut}
            onModeChange={handleModeChange}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onResetZoom={handleResetZoom}
          />
          <button
            className={`source-toggle-button ${drawerOpen ? 'is-open' : 'is-closed'}`}
            onClick={() => setDrawerOpen((current) => !current)}
            aria-pressed={drawerOpen}
            {...BUTTON_STYLE}
          >
            {drawerOpen ? 'Close Source' : 'Open Source'}
          </button>
          <button
            className="theme-toggle-button"
            onClick={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-pressed={theme === 'light'}
            {...BUTTON_STYLE}
          >
            <svg className="toolbar-icon" viewBox="0 0 20 20" aria-hidden="true">
              {theme === 'dark' ? (
                <>
                  <circle cx="10" cy="10" r="3.8" fill="none" stroke="currentColor" strokeWidth="1.6" />
                  <path d="M10 2.4v1.8M10 15.8v1.8M2.4 10h1.8M15.8 10h1.8M4.2 4.2l1.2 1.2M14.6 14.6l1.2 1.2M14.6 5.4l1.2-1.2M4.2 15.8l1.2-1.2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </>
              ) : (
                <>
                  <path d="M13.6 12.9A5.3 5.3 0 1 1 7.1 6.4a6.3 6.3 0 1 0 6.5 6.5Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                </>
              )}
            </svg>
          </button>
        </div>
      </header>

      <main className="workspace">
        <section className="diagram-card" aria-label="PlantUML result canvas">
          <div className="diagram-stage" ref={viewportRef} onWheel={handleDiagramWheel}>
            <div
              className="diagram-canvas"
              style={{
                width: `${displayWidth}px`,
                height: `${displayHeight}px`,
              }}
            >
              <PlantUMLViewer
                text={themedSource}
                className="main-diagram-image"
                style={{ width: '100%', height: '100%' }}
                onLoad={handleImageLoad}
              />
            </div>
          </div>
        </section>
      </main>

      <SourceDrawer
        open={drawerOpen}
        source={source}
        onChange={setSource}
        onClose={() => setDrawerOpen(false)}
        onCopy={handleCopy}
        copyLabel={copyLabel}
        editorRef={editorRef}
      />
    </div>
  );
};

export default App;
