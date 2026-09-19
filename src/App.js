import React, { useEffect, useRef, useState } from 'react';
import PlantUMLViewer, { buildPlantUmlUrl } from './component/PlantUMLViewer';
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
const EXPORT_OPTIONS = [
  { id: 'svg', label: 'SVG', extension: 'svg', mime: 'image/svg+xml' },
  { id: 'png', label: 'PNG', extension: 'png', mime: 'image/png' },
  { id: 'txt', label: 'ASCII text', extension: 'txt', mime: 'text/plain;charset=utf-8' },
  { id: 'map', label: 'Image map', extension: 'html', mime: 'text/html;charset=utf-8' },
];

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

const downloadBlob = (blob, filename) => {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
};

const copyBlobToClipboard = async (blob) => {
  if (!navigator.clipboard || !window.ClipboardItem) {
    throw new Error('Clipboard image copying is unavailable.');
  }

  const clipboardBlob = blob.type ? blob : new Blob([blob], { type: 'image/png' });
  await navigator.clipboard.write([
    new window.ClipboardItem({
      [clipboardBlob.type]: clipboardBlob,
    }),
  ]);
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

const mapRenderedLineToSourceLine = (source, renderedSource, theme, lineNumber) => {
  if (!source || !renderedSource || !lineNumber || lineNumber < 1) {
    return null;
  }

  const themeBlock = THEME_BLOCKS[theme] || THEME_BLOCKS.dark;
  const endTag = '@enduml';
  const insertAt = renderedSource.lastIndexOf(endTag);

  if (insertAt === -1) {
    return lineNumber;
  }

  const originalPrefix = renderedSource.slice(0, insertAt);
  const sourceLineCountBeforeInsert = originalPrefix.split(/\r?\n/).length;
  const themeLineCount = themeBlock.split(/\r?\n/).length;
  const sourceLineCount = source.split(/\r?\n/).length;

  if (lineNumber <= sourceLineCountBeforeInsert) {
    return lineNumber;
  }

  if (lineNumber <= sourceLineCountBeforeInsert + themeLineCount) {
    return Math.max(1, sourceLineCount);
  }

  return Math.max(1, Math.min(sourceLineCount, lineNumber - themeLineCount));
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
  renderState,
  renderError,
  highlightedLine,
  activeTab,
  onTabChange,
}) => {
  const activeError = renderError || (renderState.status === 'error' ? renderState : null);
  const sourceLines = source.split(/\r?\n/);
  const gutterWidth = `${String(Math.max(sourceLines.length, 1)).length + 0.75}ch`;
  const [editorScroll, setEditorScroll] = useState({ top: 0, left: 0 });

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
            <div className="drawer-tabs" role="tablist" aria-label="Drawer content tabs">
              <button
                type="button"
                id="drawer-tab-source"
                className={`drawer-tab ${activeTab === 'source' ? 'is-active' : ''}`}
                role="tab"
                aria-selected={activeTab === 'source'}
                aria-controls="drawer-source-panel"
                onClick={() => onTabChange('source')}
              >
                Source
              </button>
              <button
                type="button"
                id="drawer-tab-error"
                className={`drawer-tab ${activeTab === 'error' ? 'is-active' : ''} ${activeError ? 'has-error' : ''}`}
                role="tab"
                aria-selected={activeTab === 'error'}
                aria-controls="drawer-error-panel"
                onClick={() => onTabChange('error')}
              >
                Error
                {activeError ? <span className="drawer-tab-badge">1</span> : null}
              </button>
            </div>

            {activeTab === 'source' ? (
              <section
                id="drawer-source-panel"
                className="drawer-panel editor-panel"
                role="tabpanel"
                aria-labelledby="drawer-tab-source"
              >
                <div className="panel-label-row">
                  <span className="panel-label">Source</span>
                  <span className="panel-hint">Ctrl/Cmd+E toggles the drawer</span>
                </div>
                <div className="source-editor-frame" style={{ '--source-gutter-width': gutterWidth }}>
                  <div className="source-editor-gutter" aria-hidden="true">
                    <div
                      className="source-editor-gutter-inner"
                      style={{
                        transform: `translateY(${-editorScroll.top}px)`,
                      }}
                    >
                      {sourceLines.map((line, index) => {
                        const lineNumber = index + 1;
                        const isHighlighted = highlightedLine === lineNumber;

                        return (
                          <div key={`${lineNumber}-${line}`} className="source-editor-line-row">
                            <span className="source-editor-line-number">
                              {lineNumber}
                              {isHighlighted ? <span className="source-editor-line-badge">!</span> : null}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <textarea
                    className="source-editor"
                    value={source}
                    onChange={(event) => onChange(event.target.value)}
                    onScroll={(event) => {
                      setEditorScroll({
                        top: event.currentTarget.scrollTop,
                        left: event.currentTarget.scrollLeft,
                      });
                    }}
                    ref={editorRef}
                    spellCheck={false}
                    wrap="off"
                    aria-label="PlantUML source editor"
                  />
                </div>
              </section>
            ) : null}

            {activeTab === 'error' ? (
              <section
                id="drawer-error-panel"
                className="drawer-panel"
                role="tabpanel"
                aria-labelledby="drawer-tab-error"
              >
                <div className="drawer-error-panel">
                  <div className="drawer-error-copy">
                    <p className="drawer-error-kicker">Renderer diagnostics</p>
                    <h3>{activeError ? activeError.message : 'No renderer errors reported.'}</h3>
                    {activeError && activeError.line ? (
                      <p className="drawer-error-line">Approximate source line {activeError.line}</p>
                    ) : null}
                  </div>

                  <div className="drawer-error-details">
                    <div className="drawer-error-label">Details</div>
                    <pre>
                      {activeError ? activeError.details || activeError.message : 'The renderer has not reported an issue for the current source.'}
                    </pre>
                  </div>
                </div>
              </section>
            ) : null}
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

const ExportMenu = ({
  open,
  busyFormat,
  position,
  onToggle,
  onExport,
  menuRef,
}) => {
  return (
    <div className="export-menu-shell" ref={menuRef}>
      <button
        className="export-trigger-button"
        onClick={onToggle}
        aria-label="Export diagram"
        aria-haspopup="menu"
        aria-expanded={open}
        {...BUTTON_STYLE}
      >
        <svg className="toolbar-icon" viewBox="0 0 20 20" aria-hidden="true">
          <path d="M10 3.2v8.1" />
          <path d="M6.9 8.4 10 11.5l3.1-3.1" />
          <path d="M4.2 13.6v1.8c0 .8.6 1.4 1.4 1.4h8.8c.8 0 1.4-.6 1.4-1.4v-1.8" />
        </svg>
      </button>
      {open ? (
        <div
          className="export-menu"
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
          }}
          role="menu"
          aria-label="Export diagram as"
        >
          {EXPORT_OPTIONS.map((option) => (
            <button
              key={option.id}
              className="export-menu-item"
              onClick={() => onExport(option.id)}
              role="menuitem"
              disabled={busyFormat === option.id}
              {...BUTTON_STYLE}
            >
              <span>{busyFormat === option.id ? 'Exporting' : option.label}</span>
              <span className="export-menu-extension">.{option.extension}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
};

const DiagramContextMenu = ({
  position,
  busyFormat,
  copyBusy,
  onCopy,
  onExport,
  menuRef,
}) => {
  if (!position) {
    return null;
  }

  return (
    <div
      className="diagram-context-menu"
      ref={menuRef}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
      role="menu"
      aria-label="Diagram actions"
    >
      <button
        className="export-menu-item"
        onClick={onCopy}
        role="menuitem"
        disabled={copyBusy}
        {...BUTTON_STYLE}
      >
        <span>{copyBusy ? 'Copying' : 'Copy image'}</span>
        <span className="export-menu-extension">PNG</span>
      </button>
      <div className="export-menu-divider" role="presentation" />
      <div className="export-menu-label">Export</div>
      {EXPORT_OPTIONS.map((option) => (
        <button
          key={option.id}
          className="export-menu-item"
          onClick={() => onExport(option.id)}
          role="menuitem"
          disabled={busyFormat === option.id}
          {...BUTTON_STYLE}
        >
          <span>{busyFormat === option.id ? 'Exporting' : `Export ${option.label}`}</span>
          <span className="export-menu-extension">.{option.extension}</span>
        </button>
      ))}
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
  const [renderState, setRenderState] = useState({ status: 'idle' });
  const [renderError, setRenderError] = useState(null);
  const [activeDrawerTab, setActiveDrawerTab] = useState('source');
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [exportMenuPosition, setExportMenuPosition] = useState({ x: 8, y: 8 });
  const [contextMenuPosition, setContextMenuPosition] = useState(null);
  const [exportState, setExportState] = useState({ status: 'idle', format: null });
  const [copyDiagramState, setCopyDiagramState] = useState({ status: 'idle' });
  const debounceRef = useRef(null);
  const copyResetRef = useRef(null);
  const editorRef = useRef(null);
  const viewportRef = useRef(null);
  const exportMenuRef = useRef(null);
  const contextMenuRef = useRef(null);
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
        setExportMenuOpen(false);
        setContextMenuPosition(null);
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
    const handlePointerDown = (event) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target)) {
        setExportMenuOpen(false);
      }

      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target)) {
        setContextMenuPosition(null);
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  useEffect(() => {
    if (drawerOpen && activeDrawerTab === 'source') {
      window.setTimeout(() => {
        editorRef.current?.focus();
      }, 0);
    }
  }, [drawerOpen, activeDrawerTab]);

  const handleDrawerTabChange = (nextTab) => {
    setActiveDrawerTab(nextTab);
  };

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

  const handleRenderStateChange = (nextState) => {
    setRenderState(nextState);

    if (nextState.status === 'error') {
      setRenderError({
        status: 'error',
        message: nextState.message || 'PlantUML reported an error while rendering this diagram.',
        details: nextState.details || '',
        line: nextState.line ?? null,
      });
      return;
    }

    if (nextState.status === 'ready' || nextState.status === 'idle' || nextState.status === 'loading') {
      setRenderError(null);
    }
  };

  const themedSource = applyThemeToSource(renderedSource, theme);
  const handleCopyDiagram = async () => {
    if (copyDiagramState.status === 'loading') {
      return;
    }

    setExportMenuOpen(false);
    setContextMenuPosition(null);
    setCopyDiagramState({ status: 'loading' });

    try {
      const exportUrl = buildPlantUmlUrl(themedSource, 'png');
      const response = await fetch(exportUrl, { cache: 'no-store' });

      if (!response.ok) {
        throw new Error(`Copy failed with HTTP ${response.status}`);
      }

      const responseBlob = await response.blob();
      await copyBlobToClipboard(responseBlob);
      setCopyDiagramState({ status: 'ready' });
    } catch {
      setCopyDiagramState({ status: 'error' });
    } finally {
      window.setTimeout(() => {
        setCopyDiagramState({ status: 'idle' });
      }, 1200);
    }
  };

  const handleExportDiagram = async (formatId) => {
    const exportOption = EXPORT_OPTIONS.find((option) => option.id === formatId);

    if (!exportOption || exportState.status === 'loading') {
      return;
    }

    setExportMenuOpen(false);
    setContextMenuPosition(null);
    setExportState({ status: 'loading', format: formatId });

    try {
      const exportUrl = buildPlantUmlUrl(themedSource, formatId);
      const response = await fetch(exportUrl, { cache: 'no-store' });

      if (!response.ok) {
        throw new Error(`Export failed with HTTP ${response.status}`);
      }

      const responseBlob = await response.blob();
      const blob = responseBlob.type
        ? responseBlob
        : new Blob([responseBlob], { type: exportOption.mime });

      downloadBlob(blob, `plantuml-diagram.${exportOption.extension}`);
      setExportState({ status: 'ready', format: formatId });
    } catch {
      setExportState({ status: 'error', format: formatId });
    } finally {
      window.setTimeout(() => {
        setExportState((current) => (current.format === formatId ? { status: 'idle', format: null } : current));
      }, 1200);
    }
  };

  const handleDiagramContextMenu = (event) => {
    event.preventDefault();
    const menuWidth = 196;
    const menuHeight = 236;

    setExportMenuOpen(false);
    setContextMenuPosition({
      x: Math.max(8, Math.min(event.clientX, window.innerWidth - menuWidth)),
      y: Math.max(8, Math.min(event.clientY, window.innerHeight - menuHeight)),
    });
  };

  const handleExportMenuToggle = (event) => {
    setContextMenuPosition(null);

    if (exportMenuOpen) {
      setExportMenuOpen(false);
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const menuWidth = 196;
    setExportMenuPosition({
      x: Math.max(8, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth)),
      y: Math.max(8, rect.bottom + 8),
    });
    setExportMenuOpen(true);
  };

  const highlightedSourceLine =
    renderError && renderError.line
      ? mapRenderedLineToSourceLine(source, renderedSource, theme, renderError.line)
      : null;

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
          <ExportMenu
            open={exportMenuOpen}
            busyFormat={exportState.status === 'loading' ? exportState.format : null}
            position={exportMenuPosition}
            onToggle={handleExportMenuToggle}
            onExport={handleExportDiagram}
            menuRef={exportMenuRef}
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
          <div className="diagram-stage" ref={viewportRef} onWheel={handleDiagramWheel} onContextMenu={handleDiagramContextMenu}>
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
                onStatusChange={handleRenderStateChange}
              />
            </div>
          </div>
        </section>
      </main>

      <DiagramContextMenu
        position={contextMenuPosition}
        busyFormat={exportState.status === 'loading' ? exportState.format : null}
        copyBusy={copyDiagramState.status === 'loading'}
        onCopy={handleCopyDiagram}
        onExport={handleExportDiagram}
        menuRef={contextMenuRef}
      />

      <SourceDrawer
        open={drawerOpen}
        source={source}
        onChange={setSource}
        onClose={() => setDrawerOpen(false)}
        onCopy={handleCopy}
        copyLabel={copyLabel}
        editorRef={editorRef}
        renderState={renderState}
        renderError={renderError}
        highlightedLine={highlightedSourceLine}
        activeTab={activeDrawerTab}
        onTabChange={handleDrawerTabChange}
      />
    </div>
  );
};

export default App;
