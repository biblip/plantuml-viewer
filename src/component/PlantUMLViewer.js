import React from 'react';
import pako from 'pako';
import encode64 from './encode64';

const PlantUMLViewer = ({
  text,
  className = '',
  alt = 'PlantUML diagram',
  style,
  onLoad,
}) => {
  const [src, setSrc] = React.useState('');

  React.useEffect(() => {
    if (!text) {
      setSrc('');
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
      setSrc(`${protocol}//${hostname}:${port}${basePath}${encodedString}`);
    } catch (error) {
      setSrc('');
    }
  }, [text]);

  if (!src) {
    return null;
  }

  return <img src={src} alt={alt} className={className} style={style} onLoad={onLoad} />;
};

export default PlantUMLViewer;
