import React from 'react';
import pako from 'pako';
import encode64 from './encode64';

const PlantUMLViewer = ({ text }) => {
  // Initialize src state at the top level of the component
  const [src, setSrc] = React.useState('');

  // Use useEffect to handle dynamic URL construction
  React.useEffect(() => {
    if (!text) {
      setSrc(''); // Set src to an empty string if text is empty or falsy
      return;
    }

    const compressAndEncode = (inputString) => {
      const utf8String = unescape(encodeURIComponent(inputString)); // Encode to UTF-8
      const compressed = pako.deflate(utf8String, { to: 'string', level: 9 }); // Compress
      return encode64(compressed); // Base64 encode
    };

    const encodedString = compressAndEncode(text);

    // Construct the URL using the current window location, but replace the port with 9090
    const protocol = window.location.protocol;
    const hostname = window.location.hostname; // Extract just the hostname without the port
    const port = '9090'; // Set the port to 9090
    const basePath = '/plantuml/svg/~1'; // Adjust this path as necessary
    const dynamicUrl = `${protocol}//${hostname}:${port}${basePath}${encodedString}`;
    setSrc(dynamicUrl);
  }, [text]); // Dependency array ensures this effect runs only when text prop changes

  // Early return moved after hooks
  if (!src) {
    return ''; // Return an empty string if src is empty or falsy
  }

  return <img src={src} alt="Diagram" />;
};

export default PlantUMLViewer;
