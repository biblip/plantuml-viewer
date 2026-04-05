import React, { useState } from 'react';
import axios from 'axios';

const PlantUMLDiagram = () => {
  const [plantUMLCode, setPlantUMLCode] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await axios.post('http://localhost:9091/plantuml/svg/', plantUMLCode);
      console.log("response: " + response.data);
      setImageUrl(response.data);
    } catch (error) {
      console.error('Error rendering PlantUML diagram:', error);
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <textarea value={plantUMLCode} onChange={(e) => setPlantUMLCode(e.target.value)} />
        <button type="submit">Render Diagram</button>
      </form>
      {imageUrl && <img src={`http://localhost:9091${imageUrl}`} alt="PlantUML Diagram" />}
    </div>
  );
};

export default PlantUMLDiagram;