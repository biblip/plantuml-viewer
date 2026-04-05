import React, { useState, useRef, useEffect } from 'react';
import PlantUMLViewer from './component/PlantUMLViewer';
import "./App.css";

const ResizableTwoPane = () => {
  const [text, setText] = useState('');
  const [plantUmlText, setPlantUmlText] = useState('');
  const left = useRef(null);
  const right = useRef(null);
  const div = useRef(null);
  let md = null;
  let timeout = useRef(null);
  let currentValue = '';

  const handleTextChange = (e) => {
    currentValue = e.target.value;
    clearTimeout(timeout.current); // Clear the previous timeout, if any

    setText(currentValue); // Set the text state immediately

    timeout.current = setTimeout(() => {
      setPlantUmlText(currentValue); // Set the text for PlantUMLViewer after 500ms of user inactivity
    }, 500);
  };

  useEffect(() => {
    // Cleanup the timeout on component unmount
    return () => {
      clearTimeout(timeout.current);
    };
  }, []);

  const onMouseMove = (e) => {
    let dx = e.clientX - md.e.clientX;
    left.current.style.width = md.leftWidth + dx + "px";
    right.current.style.width = md.rightWidth - dx + "px";
  };

  const onMouseDown = (e) => {
    md = {
      e: e,
      leftWidth: left.current.offsetWidth,
      rightWidth: right.current.offsetWidth
    };

    document.onmousemove = onMouseMove;
    document.onmouseup = () => {
      document.onmousemove = document.onmouseup = md = null;
    };
  };

  return (
    <div className="colContainer">
      <textarea
        ref={left}
        value={text}
        onChange={handleTextChange}
        className="col colLeft"
        style={{ width: '100%', height: '100%', resize: 'none', border: 'none' }}
        wrap='off'
        />
      <div onMouseDown={onMouseDown} className="draggableDiv" ref={div} />
      <div ref={right}>
        <PlantUMLViewer text={plantUmlText} />
      </div>
    </div>
  );
};

const App = () => {
  
  // server should run as:
  // java -jar plantuml-1.2024.3.jar -tsvg -picoweb:9090

  return (
    <div className="app-container">
      <ResizableTwoPane />
    </div>
  );
};

export default App;