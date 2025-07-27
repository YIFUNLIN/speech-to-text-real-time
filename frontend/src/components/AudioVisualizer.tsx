import React from 'react';

interface AudioVisualizerProps {
  audioLevel: number;
  isActive: boolean;
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ audioLevel, isActive }) => {
  const bars = Array.from({ length: 20 }, (_, i) => {
    const height = isActive 
      ? Math.max(10, audioLevel * 50 + Math.sin(Date.now() / 200 + i) * 10)
      : 10;
    
    return (
      <div
        key={i}
        className="visualizer-bar"
        style={{
          height: `${height}px`,
          opacity: isActive ? 0.8 : 0.3,
          animationDelay: `${i * 0.1}s`,
        }}
      />
    );
  });

  return (
    <div className="audio-visualizer">
      {bars}
    </div>
  );
};

export default AudioVisualizer;
