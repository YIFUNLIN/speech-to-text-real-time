import React, { useCallback, useMemo } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  Position,
  BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';

interface MindMapBranch {
  name: string;
  keywords: string[];
  sub_branches?: {
    name: string;
    keywords: string[];
  }[];
}

interface MindMapData {
  central_topic: string;
  branches: MindMapBranch[];
}

interface MindMapProps {
  data: MindMapData;
}

const MindMap: React.FC<MindMapProps> = ({ data }) => {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    
    // 中心節點
    nodes.push({
      id: 'central',
      type: 'default',
      position: { x: 400, y: 300 },
      data: { 
        label: (
          <div className="text-center p-4 bg-blue-100 rounded-lg border-2 border-blue-500">
            <div className="font-bold text-lg text-blue-800">{data.central_topic}</div>
          </div>
        )
      },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    });

    // 主分支節點
    data.branches.forEach((branch, branchIndex) => {
      const angle = (branchIndex * 360) / data.branches.length;
      const radius = 200;
      const x = 400 + radius * Math.cos((angle * Math.PI) / 180);
      const y = 300 + radius * Math.sin((angle * Math.PI) / 180);

      const branchId = `branch-${branchIndex}`;
      
      nodes.push({
        id: branchId,
        type: 'default',
        position: { x, y },
        data: {
          label: (
            <div className="text-center p-3 bg-green-100 rounded-lg border border-green-400">
              <div className="font-semibold text-green-800">{branch.name}</div>
              <div className="text-xs text-green-600 mt-1">
                {branch.keywords.slice(0, 2).join(', ')}
              </div>
            </div>
          )
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      });

      edges.push({
        id: `central-${branchId}`,
        source: 'central',
        target: branchId,
        type: 'smoothstep',
        style: { stroke: '#22c55e', strokeWidth: 2 },
      });

      // 子分支節點
      if (branch.sub_branches && branch.sub_branches.length > 0) {
        branch.sub_branches.forEach((subBranch, subIndex) => {
          const subAngle = angle + (subIndex - (branch.sub_branches!.length - 1) / 2) * 30;
          const subRadius = 120;
          const subX = x + subRadius * Math.cos((subAngle * Math.PI) / 180);
          const subY = y + subRadius * Math.sin((subAngle * Math.PI) / 180);

          const subBranchId = `sub-${branchIndex}-${subIndex}`;
          
          nodes.push({
            id: subBranchId,
            type: 'default',
            position: { x: subX, y: subY },
            data: {
              label: (
                <div className="text-center p-2 bg-yellow-100 rounded border border-yellow-400">
                  <div className="font-medium text-yellow-800 text-sm">{subBranch.name}</div>
                  <div className="text-xs text-yellow-600">
                    {subBranch.keywords.slice(0, 1).join(', ')}
                  </div>
                </div>
              )
            },
            sourcePosition: Position.Right,
            targetPosition: Position.Left,
          });

          edges.push({
            id: `${branchId}-${subBranchId}`,
            source: branchId,
            target: subBranchId,
            type: 'smoothstep',
            style: { stroke: '#eab308', strokeWidth: 1 },
          });
        });
      }
    });

    return { nodes, edges };
  }, [data]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  if (!data || !data.branches || data.branches.length === 0) {
    return (
      <div className="w-full h-96 flex items-center justify-center bg-gray-50 rounded-lg">
        <p className="text-gray-500">沒有可用的心智圖數據</p>
      </div>
    );
  }

  return (
    <div className="w-full h-96 bg-white rounded-lg border shadow-sm">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
        attributionPosition="bottom-left"
      >
        <Controls />
        <MiniMap 
          nodeColor="#e5e7eb"
          nodeStrokeColor="#6b7280"
          nodeStrokeWidth={2}
          pannable
          zoomable
          position="top-right"
        />
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
      </ReactFlow>
    </div>
  );
};

export default MindMap;
