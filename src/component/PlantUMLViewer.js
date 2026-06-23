import React from 'react';
import pako from 'pako';
import encode64 from './encode64';

const ERROR_MARKERS = [
  /syntax error\??/i,
  /assumed diagram type:/i,
  /error line\s*\d+/i,
  /cannot\s+parse/i,
  /cannot\s+find/i,
  /invalid\s+diagram/i,
  /unsupported/i,
];

const extractSvgText = (svgText) => {
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    return svgText;
  }

  try {
    const document = new DOMParser().parseFromString(svgText, 'image/svg+xml');
    const nodes = document.querySelectorAll('text, title, desc');
    const lines = Array.from(nodes)
      .map((node) => node.textContent?.replace(/\s+/g, ' ').trim())
      .filter(Boolean);

    if (lines.length > 0) {
      return lines.join('\n');
    }

    return document.documentElement?.textContent?.replace(/\s+/g, ' ').trim() || svgText;
  } catch (error) {
    return svgText;
  }
};

const extractDiagnostic = (svgText) => {
  const visibleText = extractSvgText(svgText).replace(/\r\n/g, '\n');
  const flattenedText = visibleText.replace(/\s+/g, ' ').trim();

  if (!ERROR_MARKERS.some((pattern) => pattern.test(flattenedText))) {
    return null;
  }

  const lineMatch = flattenedText.match(/line\s+(\d+)/i);
  const summary = visibleText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 4)
    .join(' • ');

  return {
    message: summary || 'PlantUML reported an error while rendering this diagram.',
    details: visibleText,
    line: lineMatch ? Number(lineMatch[1]) : null,
  };
};

const PlantUMLViewer = ({
  text,
  className = '',
  alt = 'PlantUML diagram',
  style,
  onLoad,
  onStatusChange,
}) => {
  const [src, setSrc] = React.useState('');
  const requestIdRef = React.useRef(0);
  const diagnosticRef = React.useRef(null);
  const onStatusChangeRef = React.useRef(onStatusChange);

  React.useEffect(() => {
    onStatusChangeRef.current = onStatusChange;
  }, [onStatusChange]);

  React.useEffect(() => {
    requestIdRef.current += 1;
    const requestId = requestIdRef.current;

    if (!text) {
      setSrc('');
      diagnosticRef.current = null;
      onStatusChangeRef.current?.({ status: 'idle' });
      return;
    }

    try {
      const utf8String = unescape(encodeURIComponent(text));
      const compressed = pako.deflate(utf8String, { to: 'string', level: 9 });
      const encodedString = encode64(compressed);
      const protocol = window.location.protocol;
      const hostname = window.location.hostname;
      const port = '9090';
      const basePath = '/plantuml/svg/~1';
      const nextSrc = `${protocol}//${hostname}:${port}${basePath}${encodedString}`;
      diagnosticRef.current = null;
      setSrc(nextSrc);
      onStatusChangeRef.current?.({ status: 'loading' });

      const controller = new AbortController();

      const inspectRendererResponse = async () => {
        try {
          const response = await fetch(nextSrc, {
            signal: controller.signal,
            cache: 'no-store',
          });

          if (controller.signal.aborted || requestId !== requestIdRef.current) {
            return;
          }

          const svgText = await response.text();

          if (controller.signal.aborted || requestId !== requestIdRef.current) {
            return;
          }

          const diagnostic = extractDiagnostic(svgText);

          if (diagnostic) {
            diagnosticRef.current = diagnostic;
            onStatusChangeRef.current?.({
              status: 'error',
              message: diagnostic.message,
              details: diagnostic.details,
              line: diagnostic.line,
            });
            return;
          }

          if (!response.ok) {
            onStatusChangeRef.current?.({
              status: 'error',
              message: `Renderer returned HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ''}.`,
              details: svgText.slice(0, 400),
              line: null,
            });
          }
        } catch (error) {
          if (controller.signal.aborted || requestId !== requestIdRef.current) {
            return;
          }

          if (error?.name === 'AbortError') {
            return;
          }
        }
      };

      inspectRendererResponse();

      return () => controller.abort();
    } catch (error) {
      setSrc('');
      diagnosticRef.current = null;
      onStatusChangeRef.current?.({
        status: 'error',
        message: 'Unable to encode the PlantUML source.',
        details: error instanceof Error ? error.message : String(error),
        line: null,
      });
    }
  }, [text]);

  const handleLoad = (event) => {
    onLoad?.(event);

    if (!diagnosticRef.current) {
      onStatusChangeRef.current?.({ status: 'ready' });
    }
  };

  const handleError = () => {
    diagnosticRef.current = {
      message: 'The PlantUML image could not be loaded.',
      details: '',
      line: null,
    };
    onStatusChangeRef.current?.({
      status: 'error',
      message: diagnosticRef.current.message,
      details: diagnosticRef.current.details,
      line: diagnosticRef.current.line,
    });
  };

  if (!src) {
    return null;
  }

  return <img src={src} alt={alt} className={className} style={style} onLoad={handleLoad} onError={handleError} />;
};

export default PlantUMLViewer;
