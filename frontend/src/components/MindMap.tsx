import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

interface MindMapData {
  type: "mermaid";
  mermaid_code: string;
}

interface MindMapProps {
  data: MindMapData;
}

const MindMap: React.FC<MindMapProps> = ({ data }) => {
  const mermaidRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mermaidRef.current && data && data.mermaid_code) {
      // 初始化 Mermaid
      mermaid.initialize({
        startOnLoad: true,
        theme: 'default',
        flowchart: {
          useMaxWidth: true,
          htmlLabels: true,
        },
      });

      // 清空容器
      mermaidRef.current.innerHTML = '';

      // 生成唯一的 ID
      const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // 渲染 Mermaid 圖表
      mermaid.render(id, data.mermaid_code).then((result) => {
        if (mermaidRef.current) {
          mermaidRef.current.innerHTML = result.svg;
        }
      }).catch((error) => {
        console.error('Mermaid 渲染錯誤:', error);
        if (mermaidRef.current) {
          mermaidRef.current.innerHTML = `
            <div style="padding: 20px; text-align: center; color: #666; border: 1px dashed #ccc; border-radius: 8px;">
              <p>心智圖渲染失敗</p>
              <pre style="font-size: 12px; text-align: left; background: #f5f5f5; padding: 10px; margin-top: 10px;">${data.mermaid_code}</pre>
            </div>
          `;
        }
      });
    }
  }, [data]);

  if (!data || !data.mermaid_code) {
    return (
      <div className="w-full h-64 flex items-center justify-center bg-gray-50 rounded-lg">
        <p className="text-gray-500">沒有可用的心智圖數據</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-white rounded-lg border shadow-sm p-4">
      <div 
        ref={mermaidRef} 
        className="w-full flex justify-center"
        style={{ minHeight: '200px' }}
      />
    </div>
  );
};

export default MindMap;
