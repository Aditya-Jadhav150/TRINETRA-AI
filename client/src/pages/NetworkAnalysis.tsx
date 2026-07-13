import React, { useState, useEffect } from 'react'
import axios from 'axios'
import ReactFlow, { 
  MiniMap, 
  Controls, 
  Background, 
  useNodesState, 
  useEdgesState,
  MarkerType,
  useReactFlow,
  ReactFlowProvider,
  useViewport,
  Handle,
  Position,
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath
} from 'reactflow'
import 'reactflow/dist/style.css'
import { 
  Network, 
  Search, 
  GitCommit, 
  Users, 
  Flame, 
  Focus,
  Maximize2,
  ChevronRight,
  Filter,
  EyeOff,
  Crosshair,
  User,
  Info,
  Calendar,
  AlertOctagon,
  Shield,
  Home,
  Lock,
  Unlock,
  Download,
  RefreshCw,
  MoreVertical,
  Copy,
  ChevronLeft,
  Briefcase,
  FileText,
  MapPin,
  Clock,
  BookOpen
} from 'lucide-react'
import { useAuth } from '../App'

// CSS styling helper for custom path edge animations
const FlowStyles: React.FC = () => (
  <style dangerouslySetInnerHTML={{ __html: `
    @keyframes flow-pulse {
      from {
        stroke-dashoffset: 16;
      }
      to {
        stroke-dashoffset: 0;
      }
    }
    .flow-pulse-edge {
      stroke-dasharray: 8 4 !important;
      animation: flow-pulse 1.2s linear infinite !important;
    }
  `}} />
);

// 1. Custom Intelligence Node with Adaptive Label Visibility
const IntelligenceNode = ({ data, selected }: any) => {
  const { zoom } = useViewport();
  const { type, label } = data;

  const isFar = zoom < 0.6;
  const isClose = zoom >= 1.2;

  let colorClass = 'border-white/10 bg-police-darkest text-white';
  let Icon = FileText;

  if (type === 'Accused') {
    colorClass = selected
      ? 'border-police-critical shadow-[0_0_15px_#e11d48] border-2 bg-red-950/60 text-red-100 font-bold'
      : 'border-red-500/50 bg-red-950/40 text-red-200 hover:border-red-400';
    Icon = Flame;
  } else if (type === 'Case') {
    colorClass = selected
      ? 'border-blue-500 shadow-cyan-glow border-2 bg-blue-950/60 text-blue-100 font-bold'
      : 'border-blue-500/50 bg-blue-950/40 text-blue-200 hover:border-blue-400';
    Icon = GitCommit;
  } else if (type === 'Officer') {
    colorClass = selected
      ? 'border-police-accent shadow-cyan-glow border-2 bg-cyan-950/60 text-cyan-100'
      : 'border-police-accent/50 bg-cyan-950/40 text-cyan-200';
    Icon = Shield;
  } else if (type === 'Station') {
    colorClass = selected
      ? 'border-purple-500 border-2 bg-purple-950/60 text-purple-100'
      : 'border-purple-500/50 bg-purple-950/40 text-purple-200';
    Icon = Home;
  } else if (type === 'Cluster') {
    colorClass = 'border-yellow-500 bg-yellow-950/50 text-yellow-200 font-bold shadow-[0_0_10px_rgba(234,179,8,0.2)]';
    Icon = Users;
  } else {
    // Section, Victim, etc.
    colorClass = 'border-police-muted/30 bg-police-darkest/75 text-police-muted';
    Icon = FileText;
  }

  const hoverClass = 'hover:scale-105 hover:shadow-lg transition-all duration-300';

  if (isFar) {
    // Zoom Level 1: Minimal Shape + Icon
    return (
      <div className={`w-8 h-8 rounded-full border flex items-center justify-center ${colorClass} ${hoverClass} relative`}>
        <Handle type="target" position={Position.Top} className="opacity-0" />
        <Icon className="h-4 w-4" />
        <Handle type="source" position={Position.Bottom} className="opacity-0" />
      </div>
    );
  }

  // Zoom Level 2: Truncated text
  let displayName = label;
  if (!isClose && displayName && displayName.length > 12) {
    displayName = displayName.substring(0, 10) + '...';
  }

  return (
    <div 
      style={{ minWidth: isClose ? '150px' : '110px' }}
      className={`px-2.5 py-1.5 rounded-lg border text-xs font-mono backdrop-blur-md relative ${colorClass} ${hoverClass} flex flex-col items-center select-none text-center`} 
    >
      <Handle type="target" position={Position.Top} className="opacity-0" />
      <span className="text-[7.5px] uppercase font-mono tracking-widest opacity-60 flex items-center gap-1 mb-0.5">
        <Icon className="h-2 w-2" />
        {type}
      </span>
      <span className="font-semibold truncate max-w-full leading-tight">{displayName}</span>
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </div>
  );
};

const nodeTypes = {
  intelligence: IntelligenceNode
};

// 2. Custom Intelligence Edge with Hover-triggered / Selection-triggered Labels
const IntelligenceEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  label,
  style,
  markerEnd,
  data
}: any) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  const { isHovered, isHighlighted, showAllLabels } = data || {};
  const showLabel = showAllLabels || isHovered || isHighlighted;

  let edgeStyle = { ...style };
  let edgeClass = '';
  
  if (isHighlighted) {
    edgeStyle.stroke = '#f59e0b';
    edgeStyle.strokeWidth = 3.5;
    edgeClass = 'flow-pulse-edge';
  }

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={edgeStyle}
        markerEnd={markerEnd}
        className={edgeClass}
      />
      {/* Thicker transparent interactive line for easier hovering */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={15}
        className="cursor-pointer"
        onMouseEnter={data?.onMouseEnter}
        onMouseLeave={data?.onMouseLeave}
      />
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'none',
              zIndex: 1000
            }}
            className={`font-mono text-[7px] bg-police-darkest/95 border border-white/10 text-police-muted px-1.5 py-0.5 rounded transition-all duration-300 ${
              showLabel ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
            }`}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

const edgeTypes = {
  intelligence: IntelligenceEdge
};

// Inner component to access reactFlowInstance hooks easily
const GraphCanvas: React.FC<{
  nodes: any[];
  edges: any[];
  rawNodes: any[];
  isKannada: boolean;
  onNodesChange: any;
  onEdgesChange: any;
  onNodeClick: (event: any, node: any) => void;
  onNodeDoubleClick: (event: any, node: any) => void;
  onNodeContextMenu: (event: any, node: any) => void;
  showLabels: boolean;
  selectedNodeId: string | null;
  shortestPathEdges: any[];
  isLocked: boolean;
}> = ({ 
  nodes, 
  edges, 
  rawNodes, 
  isKannada, 
  onNodesChange, 
  onEdgesChange, 
  onNodeClick, 
  onNodeDoubleClick, 
  onNodeContextMenu,
  showLabels,
  selectedNodeId,
  shortestPathEdges,
  isLocked
}) => {
  const reactFlowInstance = useReactFlow();
  const [hoveredNode, setHoveredNode] = useState<any>(null);
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);

  const handleCenter = () => {
    reactFlowInstance.fitView({ padding: 0.2, duration: 800 });
  };

  const renderedEdges = edges.map(e => {
    const isHighlighted = shortestPathEdges.some(pe => 
      (pe.source === e.source && pe.target === e.target) || 
      (pe.source === e.target && pe.target === e.source)
    );
    const isConnectedToSelected = selectedNodeId && (e.source === selectedNodeId || e.target === selectedNodeId);

    return {
      ...e,
      type: 'intelligence',
      data: {
        isHovered: hoveredEdgeId === e.id,
        isHighlighted,
        showAllLabels: showLabels || isConnectedToSelected,
        onMouseEnter: () => setHoveredEdgeId(e.id),
        onMouseLeave: () => setHoveredEdgeId(null),
      }
    };
  });

  return (
    <div className="flex-1 h-full relative">
      <FlowStyles />
      
      {/* Canvas Utility Float Panel */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
        <button 
          onClick={handleCenter}
          className="p-2 bg-police-dark/90 hover:bg-police-accent/20 border border-white/10 hover:border-police-accent/30 text-white hover:text-police-accent rounded-lg transition-all duration-150 flex items-center gap-1.5 text-xs font-mono"
          title="Center view and fit screen"
        >
          <Crosshair className="h-4 w-4" />
          <span>Center Graph</span>
        </button>
      </div>

      <ReactFlow
        nodes={nodes.map(n => ({
          ...n,
          type: 'intelligence',
          draggable: !isLocked,
          selected: n.id === selectedNodeId
        }))}
        edges={renderedEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        onNodeContextMenu={onNodeContextMenu}
        onPaneClick={(e) => onNodeContextMenu(e, null)}
        onNodeMouseEnter={(event, node) => {
          setHoveredNode(node);
          setHoverPosition({ x: event.clientX, y: event.clientY });
        }}
        onNodeMouseLeave={() => setHoveredNode(null)}
        fitView
      >
        <Background color="rgba(255, 255, 255, 0.05)" gap={16} size={0.8} />
        <Controls className="bg-police-dark border border-white/5 text-white" />
        <MiniMap 
          nodeColor={(node: any) => {
            if (node.className?.includes('border-red-500')) return '#e11d48'; 
            if (node.className?.includes('border-blue-500')) return '#3b82f6';
            if (node.className?.includes('border-police-accent')) return '#00f0ff'; 
            return '#94a3b8';
          }}
          maskColor="rgba(8, 12, 20, 0.8)"
          className="bg-police-darkest border border-white/5"
        />
      </ReactFlow>

      {/* Floating Hover Preview Card */}
      {hoveredNode && rawNodes.find(rn => rn.id === hoveredNode.id) && (() => {
        const rawMatch = rawNodes.find(rn => rn.id === hoveredNode.id);
        const connectionsCount = edges.filter(e => e.source === hoveredNode.id || e.target === hoveredNode.id).length;
        
        return (
          <div 
            style={{ 
              position: 'fixed', 
              left: hoverPosition.x + 15, 
              top: hoverPosition.y + 15, 
              zIndex: 10000 
            }}
            className="glass-card p-3.5 rounded-lg border-police-accent/30 text-white font-mono text-[10px] w-64 shadow-xl pointer-events-none select-none bg-police-darkest/95 backdrop-blur-md"
          >
            <div className="text-[8px] uppercase tracking-wider text-police-accent mb-1.5 font-bold">
              {isKannada ? "ವಿವರಣೆ ಪ್ರಿವ್ಯೂ" : "Entity Summary Preview"}
            </div>
            
            <div className="font-bold text-[12px] uppercase text-police-text leading-tight truncate border-b border-white/5 pb-1.5">
              {rawMatch.label}
            </div>
            
            <div className="grid grid-cols-2 gap-y-1.5 mt-2 pt-0.5">
              <div className="text-police-muted">{isKannada ? "ಪಾತ್ರ/ಪ್ರಕಾರ:" : "Type / Class:"}</div>
              <div className="text-white uppercase font-bold">{rawMatch.type}</div>
              
              {rawMatch.type === 'Accused' && (
                <>
                  <div className="text-police-muted">{isKannada ? "ಅಪರಾಧ ಸ್ಕೋರ್:" : "Threat Score:"}</div>
                  <div className="text-red-400 font-bold">8.7 / 10</div>
                  
                  <div className="text-police-muted">Crime Category:</div>
                  <div className="text-white">Organized Gang</div>

                  <div className="text-police-muted">Risk Profile:</div>
                  <div className="text-red-500 font-bold">CRITICAL</div>
                </>
              )}

              {rawMatch.type === 'Case' && (
                <>
                  <div className="text-police-muted">Gravity Level:</div>
                  <div className="text-blue-400 font-bold">HEINOUS</div>

                  <div className="text-police-muted">Jurisdiction:</div>
                  <div className="text-white">JP Nagar PS</div>
                </>
              )}

              {rawMatch.type === 'Officer' && (
                <>
                  <div className="text-police-muted">Rank:</div>
                  <div className="text-cyan-400">Inspector</div>

                  <div className="text-police-muted">Active Workload:</div>
                  <div className="text-white">5 Cases</div>
                </>
              )}

              {rawMatch.type === 'Cluster' && (
                <>
                  <div className="text-police-muted">Grouping:</div>
                  <div className="text-yellow-400">Multi-Node</div>
                </>
              )}

              <div className="text-police-muted">Total Links:</div>
              <div className="text-police-accent font-bold">{connectionsCount} Connections</div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

const NetworkAnalysis: React.FC = () => {
  const { token, isKannada } = useAuth();
  
  const translations: Record<string, string> = {
    'NETWORK ANALYSIS': 'ನೆಟ್‌ವರ್ಕ್ ವಿಶ್ಲೇಷಣೆ',
    'RELATIONSHIP NETWORK EXPLORER': 'ಸಂಬಂಧಗಳ ಜಾಲ ಅನ್ವೇಷಕ',
    'Interactive multi-degree connection solver between suspects, FIRs, and locations.': 'ಶಂಕಿತರು, ಎಫ್‌ಐಆರ್‌ಗಳು ಮತ್ತು ಸ್ಥಳಗಳ ನಡುವಿನ ಸಂವಾದಾತ್ಮಕ ಮಲ್ಟಿ-ಡಿಗ್ರಿ ಜಾಲ ಅನ್ವೇಷಕ.',
    'Search suspect / case node...': 'ಶಂಕಿತರು ಅಥವಾ ಪ್ರಕರಣ ನೋಡ್ ಹುಡುಕಿ...',
    'Render Distance': 'ಡಿಸ್ಪ್ಲೇ ವ್ಯಾಪ್ತಿ',
    'Filter Node Types': 'ನೋಡ್ ಪ್ರಕಾರಗಳನ್ನು ಫಿಲ್ಟರ್ ಮಾಡಿ',
    'Co-offending Path Finder': 'ಸಹ-ಅಪರಾಧ ಹಾದಿ ಶೋಧಕ',
    'Start Accused': 'ಮೂಲ ಶಂಕಿತ ವ್ಯಕ್ತಿ',
    'End Accused': 'ಗುರಿ ಶಂಕಿತ ವ್ಯಕ್ತಿ',
    'Trace Shortest Connection': 'ಶಾರ್ಟೆಸ್ಟ್ ಪಾತ್ ಹುಡುಕಿ',
    'Show Graph Labels': 'ಹೆಸರುಗಳನ್ನು ತೋರಿಸಿ',
    'NODE DETAILS': 'ನೋಡ್ ವಿವರಗಳು',
    'Role/Type:': 'ಪಾತ್ರ/ಪ್ರಕಾರ:',
    'Threat Rank:': 'ಅಪರಾಧ ಸ್ಕೋರ್:',
    'Connections:': 'ಸಂಪರ್ಕಗಳು:',
    'Degree Centrality': 'ಡಿಗ್ರಿ ಸೆಂಟ್ರಲಿಟಿ',
    'Community': 'ಕಮ್ಯುನಿಟಿ',
    'Accused': 'ಆರೋಪಿ',
    'Case': 'ಪ್ರಕರಣ',
    'Officer': 'ಅಧಿಕಾರಿ',
    'Station': 'ಠಾಣೆ',
    'Victim': 'ಸಂತ್ರಸ್ತ',
    'Section': 'ಸೆಕ್ಷನ್'
  };

  const t = (key: string) => {
    return isKannada ? (translations[key] || key) : key;
  };
  
  const [rawNodes, setRawNodes] = useState<any[]>([]);
  const [rawEdges, setRawEdges] = useState<any[]>([]);
  
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  // Interactive navigation states
  const [focusedNodeId, setFocusedNodeId] = useState<string>('Sunil Gowda');
  const [breadcrumbTrail, setBreadcrumbTrail] = useState<string[]>(['Sunil Gowda']);
  const [hopFilter, setHopFilter] = useState<'1-Hop' | '2-Hop' | 'Full'>('1-Hop');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNodeDetails, setSelectedNodeDetails] = useState<any>(null);
  
  // Custom interactive states
  const [expandedClusters, setExpandedClusters] = useState<string[]>(['Accused']);
  const [isLocked, setIsLocked] = useState(false);
  const [shortestPathEdges, setShortestPathEdges] = useState<any[]>([]);
  const [contextMenu, setContextMenu] = useState<{ show: boolean; x: number; y: number; nodeId: string | null } | null>(null);

  // UI filter toggles
  const [showLabels, setShowLabels] = useState(true);
  const [visibleNodeTypes, setVisibleNodeTypes] = useState<string[]>(['Accused', 'Case', 'Officer', 'Station', 'Victim', 'Section']);

  // Shortest Path Solver State
  const [sourceNode, setSourceNode] = useState('Sunil Gowda');
  const [targetNode, setTargetNode] = useState('Raju Kappe');
  const [pathMessage, setPathMessage] = useState('');
  
  // Graph Centrality metrics
  const [centrality, setCentrality] = useState<any[]>([]);
  const [communities, setCommunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Restore session state on mount
  useEffect(() => {
    const savedState = localStorage.getItem('trinetra_investigation_state');
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        if (parsed.focusedNodeId) setFocusedNodeId(parsed.focusedNodeId);
        if (parsed.hopFilter) setHopFilter(parsed.hopFilter);
        if (parsed.expandedClusters) setExpandedClusters(parsed.expandedClusters);
        if (parsed.visibleNodeTypes) setVisibleNodeTypes(parsed.visibleNodeTypes);
        if (parsed.selectedNodeDetails) setSelectedNodeDetails(parsed.selectedNodeDetails);
        if (parsed.breadcrumbTrail) setBreadcrumbTrail(parsed.breadcrumbTrail);
      } catch (e) {
        console.error("Failed to restore saved investigation state:", e);
      }
    }
  }, []);

  // Save session state on state updates
  useEffect(() => {
    if (rawNodes.length > 0) {
      localStorage.setItem('trinetra_investigation_state', JSON.stringify({
        focusedNodeId,
        hopFilter,
        expandedClusters,
        visibleNodeTypes,
        selectedNodeDetails,
        breadcrumbTrail
      }));
    }
  }, [focusedNodeId, hopFilter, expandedClusters, visibleNodeTypes, selectedNodeDetails, breadcrumbTrail, rawNodes]);

  useEffect(() => {
    fetchGraphData();
    fetchGraphMetrics();
  }, [token]);

  // Re-run filtering when graph data, focal node, hop filter, node type filter, or expanded clusters change
  useEffect(() => {
    if (rawNodes.length > 0) {
      applyGraphFilters();
    }
  }, [rawNodes, rawEdges, focusedNodeId, hopFilter, visibleNodeTypes, expandedClusters]);

  const fetchGraphData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get('/api/analytics/graph?limit=250', { headers });
      setRawNodes(response.data.nodes);
      setRawEdges(response.data.edges);
    } catch (err) {
      console.error("Failed to load Neo4j Graph Data:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchGraphMetrics = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [centralityRes, communitiesRes] = await Promise.all([
        axios.get('/api/analytics/graph/centrality', { headers }),
        axios.get('/api/analytics/graph/communities', { headers })
      ]);
      setCentrality(centralityRes.data);
      setCommunities(communitiesRes.data);
    } catch (err) {
      console.error("Failed to load graph calculations:", err);
    }
  };

  // Progressive rendering logic: BFS distances filtering + Clustering
  const applyGraphFilters = () => {
    // 1. Filter by visible node types
    const typeFilteredNodes = rawNodes.filter(n => visibleNodeTypes.includes(n.type));
    const typeFilteredNodeIds = new Set(typeFilteredNodes.map(n => n.id));

    const typeFilteredEdges = rawEdges.filter(
      e => typeFilteredNodeIds.has(e.source) && typeFilteredNodeIds.has(e.target)
    );

    // 2. Perform BFS to compute hop distances from the focusedNodeId
    const distances: Record<string, number> = {};
    const queue: string[] = [];

    // Find actual matching node in raw dataset
    const startNode = rawNodes.find(n => n.id === focusedNodeId || n.label === focusedNodeId);
    const startId = startNode ? startNode.id : rawNodes[0]?.id;

    if (startId) {
      distances[startId] = 0;
      queue.push(startId);
    }

    // Build adjacency list
    const adjList: Record<string, string[]> = {};
    rawNodes.forEach(n => { adjList[n.id] = []; });
    typeFilteredEdges.forEach(e => {
      adjList[e.source]?.push(e.target);
      adjList[e.target]?.push(e.source);
    });

    while (queue.length > 0) {
      const curr = queue.shift()!;
      const dist = distances[curr];
      
      const neighbors = adjList[curr] || [];
      for (const neighbor of neighbors) {
        if (distances[neighbor] === undefined) {
          distances[neighbor] = dist + 1;
          queue.push(neighbor);
        }
      }
    }

    // 3. Filter nodes based on hop filter distance limit (1 or 2, or infinite for Full)
    const maxAllowedDist = hopFilter === '1-Hop' ? 1 : hopFilter === '2-Hop' ? 2 : 999;
    const inRangeNodes = typeFilteredNodes.filter(n => {
      const d = distances[n.id];
      return d !== undefined && d <= maxAllowedDist;
    });

    // 4. Cluster processing: Group nodes by type if the cluster is not expanded
    const nodesToClusterGroup: Record<string, any[]> = {};
    const individualNodes: any[] = [];

    inRangeNodes.forEach(n => {
      if (n.id === startId) {
        individualNodes.push(n);
      } else {
        const isExpanded = expandedClusters.includes(n.type);
        if (isExpanded) {
          individualNodes.push(n);
        } else {
          if (!nodesToClusterGroup[n.type]) {
            nodesToClusterGroup[n.type] = [];
          }
          nodesToClusterGroup[n.type].push(n);
        }
      }
    });

    // Create Cluster Nodes
    const finalNodes = [...individualNodes];
    const clusterEdgesToAdd: any[] = [];
    const collapsedNodeIds = new Set<string>();

    Object.keys(nodesToClusterGroup).forEach(type => {
      const groupedList = nodesToClusterGroup[type];
      if (groupedList.length === 0) return;

      // Keep single node individual to prevent pointless single clusters
      if (groupedList.length <= 1) {
        finalNodes.push(...groupedList);
        return;
      }

      const clusterId = `cluster-${type}`;
      finalNodes.push({
        id: clusterId,
        id_numeric: 9999,
        label: `${type}s (${groupedList.length})`,
        type: 'Cluster',
        dataType: type,
      });

      groupedList.forEach(gn => collapsedNodeIds.add(gn.id));

      if (startId) {
        clusterEdgesToAdd.push({
          id: `edge-focal-to-${clusterId}`,
          source: startId,
          target: clusterId,
          type: 'LINKED_GROUP'
        });
      }
    });

    // Filter edges: keep edges only between expanded/individual nodes
    const individualNodeIds = new Set(finalNodes.map(n => n.id));
    const finalEdges = typeFilteredEdges.filter(
      e => individualNodeIds.has(e.source) && individualNodeIds.has(e.target) && !collapsedNodeIds.has(e.source) && !collapsedNodeIds.has(e.target)
    );

    finalEdges.push(...clusterEdgesToAdd);

    compileFlowGraph(finalNodes, finalEdges, startId);
  };

  // Formulate nodes and edges with concentric circular layout mapping
  const compileFlowGraph = (filteredNodesList: any[], filteredEdgesList: any[], startId: string | undefined) => {
    const total = filteredNodesList.length;
    
    const flowNodes = filteredNodesList.map((n, idx) => {
      let x = 350;
      let y = 300;

      if (n.id !== startId) {
        const isCluster = n.id.startsWith('cluster-');
        const radius = isCluster ? 160 : 250 + (idx % 2) * 60;
        const angle = (idx / (total > 1 ? total - 1 : 1)) * 2 * Math.PI;
        x = 350 + radius * Math.cos(angle);
        y = 300 + radius * Math.sin(angle);
      }

      return {
        id: n.id,
        position: { x, y },
        data: { 
          type: n.type,
          label: n.label,
        }
      };
    });

    const flowEdges = filteredEdgesList.map((e) => {
      let strokeColor = 'rgba(255,255,255,0.15)';
      let strokeWidth = 1.2;
      let animated = false;

      // Color edges semantically by type
      if (e.type === 'COMMITTED') {
        strokeColor = '#e11d48'; 
        strokeWidth = 2.0;
        animated = true;
      } else if (e.type === 'INVESTIGATED_BY') {
        strokeColor = '#00f0ff'; 
        strokeWidth = 1.5;
      } else if (e.type === 'CHARGED_UNDER') {
        strokeColor = '#f59e0b'; 
        strokeWidth = 1.5;
      } else if (e.type === 'VICTIM_OF') {
        strokeColor = '#10b981'; 
        strokeWidth = 1.5;
      } else if (e.type === 'LINKED_GROUP') {
        strokeColor = '#eab308'; 
        strokeWidth = 1.8;
        animated = true;
      }

      return {
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.type === 'LINKED_GROUP' ? 'GROUPED' : e.type,
        animated,
        style: { stroke: strokeColor, strokeWidth },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: strokeColor,
          width: 8,
          height: 8
        }
      };
    });

    setNodes(flowNodes);
    setEdges(flowEdges);
  };


  const handleNodeClick = (event: any, node: any) => {
    if (node.id.startsWith('cluster-')) {
      const clusterType = node.id.replace('cluster-', '');
      setExpandedClusters(prev => {
        if (prev.includes(clusterType)) return prev;
        return [...prev, clusterType];
      });
      return;
    }
    const rawMatch = rawNodes.find(n => n.id === node.id);
    if (rawMatch) {
      setSelectedNodeDetails(rawMatch);
    }
  };

  const handleNodeDoubleClick = (event: any, node: any) => {
    if (node.id.startsWith('cluster-')) return;
    setFocusedNodeId(node.id);
    const label = rawNodes.find(rn => rn.id === node.id)?.label || node.id;
    setBreadcrumbTrail(prev => {
      if (prev.includes(label)) return prev;
      return [...prev.slice(-3), label];
    });
  };

  const handleNodeContextMenu = (event: any, node: any) => {
    if (event) {
      event.preventDefault();
      if (node) {
        setContextMenu({
          show: true,
          x: event.clientX,
          y: event.clientY,
          nodeId: node.id
        });
      } else {
        setContextMenu(null);
      }
    } else {
      setContextMenu(null);
    }
  };

  const handleContextMenuAction = (action: string) => {
    if (!contextMenu || !contextMenu.nodeId) return;
    const nodeId = contextMenu.nodeId;
    const matchedNode = rawNodes.find(rn => rn.id === nodeId);
    const label = matchedNode?.label || nodeId;

    switch (action) {
      case 'center': {
        setFocusedNodeId(nodeId);
        break;
      }
      case 'expand-1':
        setFocusedNodeId(nodeId);
        setHopFilter('1-Hop');
        setBreadcrumbTrail(prev => prev.includes(label) ? prev : [...prev.slice(-3), label]);
        break;
      case 'expand-2':
        setFocusedNodeId(nodeId);
        setHopFilter('2-Hop');
        setBreadcrumbTrail(prev => prev.includes(label) ? prev : [...prev.slice(-3), label]);
        break;
      case 'collapse':
        if (matchedNode) {
          setExpandedClusters(prev => prev.filter(t => t !== matchedNode.type));
        }
        break;
      case 'path-start':
        setSourceNode(label);
        setPathMessage(`Set path start: ${label}`);
        break;
      case 'path-end':
        setTargetNode(label);
        setPathMessage(`Set path end: ${label}`);
        break;
      case 'copy-id':
        navigator.clipboard.writeText(nodeId);
        setPathMessage(`Copied ID: ${nodeId}`);
        break;
    }
    setContextMenu(null);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    const match = rawNodes.find(n => n.label.toLowerCase().includes(searchQuery.toLowerCase().trim()));
    if (match) {
      setFocusedNodeId(match.id);
      setSelectedNodeDetails(match);
      setPathMessage(`Focused on: "${match.label}"`);
      setBreadcrumbTrail(prev => {
        if (prev.includes(match.label)) return prev;
        return [...prev.slice(-3), match.label];
      });
    } else {
      setPathMessage("No entity found matching search query.");
    }
  };

  const handleSolveShortestPath = async () => {
    if (!sourceNode || !targetNode) return;
    setPathMessage("Resolving network path in Neo4j database...");
    
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(
        `/api/analytics/graph/shortest-path?start=${encodeURIComponent(sourceNode)}&end=${encodeURIComponent(targetNode)}`,
        { headers }
      );
      
      const { found, nodes: pathNodes, edges: pathEdges } = response.data;
      
      if (!found) {
        setPathMessage("No connection path found.");
        setShortestPathEdges([]);
        return;
      }
      
      setPathMessage(`Resolved path: ${pathNodes.length} nodes connected.`);
      
      // Auto-expand clusters on path so they are visible
      const pathNodeTypes = Array.from(new Set(pathNodes.map((pn: any) => pn.type))) as string[];
      setExpandedClusters(prev => {
        const next = [...prev];
        pathNodeTypes.forEach(t => {
          if (!next.includes(t)) next.push(t);
        });
        return next;
      });

      setHopFilter('Full');
      setShortestPathEdges(pathEdges);
      
    } catch (err) {
      console.error("Graph pathfinder failed:", err);
      setPathMessage("Path solver request failed.");
    }
  };

  const toggleNodeType = (type: string) => {
    setVisibleNodeTypes(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const highlightSyndicate = (members: string[]) => {
    setHopFilter('Full');
    setNodes((prevNodes) => 
      prevNodes.map((n) => {
        const rawNode = rawNodes.find(rn => rn.id === n.id);
        const isMember = rawNode && members.includes(rawNode.label);
        if (isMember) {
          return {
            ...n,
            className: `${n.className.replace(/border-[a-z-]+/, 'border-[#e11d48]')} shadow-crimson-glow bg-red-950/60 font-bold`
          };
        }
        return n;
      })
    );
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center bg-police-darkest">
        <div className="text-center space-y-4">
          <div className="h-10 w-10 border-4 border-police-accent border-t-transparent rounded-full animate-spin mx-auto"></div>
          <div className="text-sm font-mono text-police-accent uppercase tracking-widest">Querying Neo4j Knowledge Graph...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-police-darkest overflow-hidden">
      {/* 1. Left Sidebar: Filters & Shortest Path */}
      <div className="w-80 border-r border-white/5 bg-police-darkest/95 flex flex-col p-4 overflow-y-auto shrink-0 select-none space-y-5">
        <div className="flex gap-2 items-center text-police-accent font-mono font-semibold border-b border-white/5 pb-3">
          <Network className="h-4.5 w-4.5" />
          <span>{t("NETWORK ANALYSIS")}</span>
        </div>

        {/* Global Node Search */}
        <form onSubmit={handleSearch} className="space-y-2">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-police-muted" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("Search suspect / case node...")}
              className="w-full glass-input pl-9 pr-3 py-1.5 rounded-lg text-xs font-mono"
            />
          </div>
        </form>

        {/* Hop Distance Filter */}
        <div className="space-y-2">
          <div className="text-[10px] uppercase font-mono tracking-widest text-police-muted">{t("Render Distance")}</div>
          <div className="grid grid-cols-3 gap-1 bg-police-darkest/50 p-1 rounded-lg border border-white/5 text-[10px] font-mono">
            {['1-Hop', '2-Hop', 'Full'].map((h: any) => (
              <button
                key={h}
                onClick={() => setHopFilter(h)}
                className={`py-1 rounded text-center transition ${
                  hopFilter === h 
                    ? 'bg-police-accent/15 border border-police-accent/25 text-police-accent' 
                    : 'text-police-muted hover:text-white'
                }`}
              >
                {h}
              </button>
            ))}
          </div>
        </div>

        {/* Toggle Node Types checkboxes */}
        <div className="space-y-2">
          <div className="text-[10px] uppercase font-mono tracking-widest text-police-muted flex items-center gap-1">
            <Filter className="h-3 w-3 text-police-accent" />
            <span>{t("Filter Node Types")}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
            {['Accused', 'Case', 'Officer', 'Station', 'Victim', 'Section'].map((type) => (
              <label key={type} className="flex items-center gap-2 text-police-text cursor-pointer">
                <input
                  type="checkbox"
                  checked={visibleNodeTypes.includes(type)}
                  onChange={() => toggleNodeType(type)}
                  className="rounded bg-police-darkest border-white/10 text-police-accent focus:ring-0 focus:ring-offset-0"
                />
                <span>{t(type)}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Shortest Path Solver */}
        <div className="space-y-3 glass-card p-3 rounded-lg border-white/5">
          <div className="flex items-center gap-1.5 text-xs text-white font-mono font-semibold">
            <GitCommit className="h-4 w-4 text-police-accent" />
            <span>{t("Co-offending Path Finder")}</span>
          </div>
          <div className="space-y-2">
            <input 
              type="text" 
              value={sourceNode} 
              onChange={(e) => setSourceNode(e.target.value)} 
              placeholder={t("Start Accused")} 
              className="w-full glass-input px-3 py-1.5 rounded text-xs font-mono" 
            />
            <input 
              type="text" 
              value={targetNode} 
              onChange={(e) => setTargetNode(e.target.value)} 
              placeholder={t("End Accused")} 
              className="w-full glass-input px-3 py-1.5 rounded text-xs font-mono" 
            />
            <button 
              onClick={handleSolveShortestPath}
              className="w-full py-2 bg-police-accent/15 border border-police-accent/25 hover:bg-police-accent/25 text-police-accent font-mono font-semibold rounded text-xs transition"
            >
              {t("Trace Shortest Connection")}
            </button>
            {pathMessage && <div className="text-[9px] text-[#f59e0b] font-mono mt-1 text-center">{pathMessage}</div>}
          </div>
        </div>

        {/* Centrality & Communities */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-white font-mono font-semibold">
            <Flame className="h-4 w-4 text-red-500" />
            <span>Centrality suspects</span>
          </div>
          <div className="space-y-1.5">
            {centrality.slice(0, 3).map((c, i) => (
              <div 
                key={i} 
                className="p-2 bg-white/5 border border-white/5 rounded-lg flex items-center justify-between text-[11px] font-mono cursor-pointer hover:border-police-accent/20"
                onClick={() => setFocusedNodeId(c.name)}
              >
                <div>
                  <div className="font-semibold text-police-text">{c.name}</div>
                  <div className="text-[9px] text-police-muted">{c.type}</div>
                </div>
                <span className="text-[9px] font-bold px-1.5 py-0.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded">
                  Score: {c.score}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-white font-mono font-semibold">
            <Users className="h-4 w-4 text-purple-500" />
            <span>Gang Syndicates</span>
          </div>
          <div className="space-y-2">
            {communities.map((comm, idx) => (
              <div 
                key={idx} 
                className="p-2.5 bg-white/5 border border-white/5 hover:border-purple-500/30 rounded-lg text-[10.5px] font-mono transition cursor-pointer"
                onClick={() => highlightSyndicate(comm.members)}
              >
                <div className="font-semibold text-police-accent flex items-center justify-between">
                  <span>{comm.syndicate_name}</span>
                  <span className="text-[8px] px-1 py-0.5 bg-red-500/10 text-red-500 border border-red-500/20 rounded font-mono">
                    {comm.risk_level}
                  </span>
                </div>
                <div className="text-police-text mt-1 text-[9.5px] leading-tight truncate">
                  <b>Members:</b> {comm.members.join(", ")}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 2. React Flow Graph Canvas & Breadcrumbs */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Breadcrumb Navigation Trail */}
        <div className="h-10 border-b border-white/5 bg-police-darkest/45 flex items-center px-4 gap-2 font-mono text-[9px] text-police-muted select-none">
          <span className="text-police-accent uppercase tracking-wider font-bold">{isKannada ? "ಶೋಧ ಹಾದಿ:" : "Trace Trail:"}</span>
          {breadcrumbTrail.map((crumb, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <span className="opacity-45">&gt;</span>}
              <button 
                onClick={() => {
                  const match = rawNodes.find(n => n.id === crumb || n.label === crumb);
                  if (match) {
                    setFocusedNodeId(match.id);
                    setSelectedNodeDetails(match);
                  }
                }}
                className={`hover:text-white transition ${crumb === focusedNodeId ? 'text-police-accent font-bold' : ''}`}
              >
                {crumb}
              </button>
            </React.Fragment>
          ))}
        </div>

        <ReactFlowProvider>
          <GraphCanvas
            nodes={nodes}
            edges={edges}
            rawNodes={rawNodes}
            isKannada={isKannada}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={handleNodeClick}
            onNodeDoubleClick={handleNodeDoubleClick}
            onNodeContextMenu={handleNodeContextMenu}
            showLabels={showLabels}
            selectedNodeId={selectedNodeDetails?.id || null}
            shortestPathEdges={shortestPathEdges}
            isLocked={isLocked}
          />

          {/* Floating Toolbar at the bottom center of canvas */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 bg-police-darkest/95 border border-white/10 p-1.5 rounded-xl shadow-2xl backdrop-blur-md">
            <button 
              onClick={() => {
                const centerNode = nodes.find(n => n.id === focusedNodeId);
                if (centerNode) {
                  // Handled by focusedNodeId centering or default fitView
                  setFocusedNodeId(focusedNodeId);
                  setPathMessage("View centered on focus node.");
                }
              }}
              className="p-2 hover:bg-police-accent/15 text-police-muted hover:text-police-accent rounded-lg transition-colors"
              title="Center View"
            >
              <Crosshair className="h-4 w-4" />
            </button>
            <button 
              onClick={() => setIsLocked(!isLocked)}
              className={`p-2 rounded-lg transition-colors ${isLocked ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'hover:bg-police-accent/15 text-police-muted hover:text-police-accent'}`}
              title={isLocked ? "Unlock Node Dragging" : "Lock Node Dragging"}
            >
              {isLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
            </button>
            <button 
              onClick={() => {
                applyGraphFilters();
                setPathMessage("Layout re-aligned.");
              }}
              className="p-2 hover:bg-police-accent/15 text-police-muted hover:text-police-accent rounded-lg transition-colors"
              title="Auto Layout Graph"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <div className="w-[1px] h-5 bg-white/10 mx-1" />
            <button 
              onClick={() => setShowLabels(!showLabels)}
              className={`p-2 rounded-lg transition-colors ${showLabels ? 'bg-police-accent/15 text-police-accent' : 'hover:bg-police-accent/15 text-police-muted hover:text-police-accent'}`}
              title="Show/Hide Relationship Labels"
            >
              <EyeOff className="h-4 w-4" />
            </button>
            <button 
              onClick={() => {
                // Save view to local storage
                localStorage.setItem('trinetra_investigation_state', JSON.stringify({
                  focusedNodeId,
                  hopFilter,
                  expandedClusters,
                  visibleNodeTypes,
                  selectedNodeDetails,
                  breadcrumbTrail
                }));
                setPathMessage("Investigation session saved.");
              }}
              className="p-2 hover:bg-police-accent/15 text-police-muted hover:text-police-accent rounded-lg transition-colors"
              title="Save View State"
            >
              <Download className="h-4 w-4" />
            </button>
            <button 
              onClick={() => {
                // Export summary as text file
                const summaryText = `TRINETRA AI - Graph Investigation summary\nFocal Node: ${focusedNodeId}\nHops Mode: ${hopFilter}\n\nNodes List:\n` + 
                  nodes.map(n => `- [${n.data?.type || 'Cluster'}] ID: ${n.id}, Label: ${n.data?.label}`).join('\n') + 
                  `\n\nActive Connections:\n` + 
                  edges.map(e => `- ${e.source} --[${e.label}]--> ${e.target}`).join('\n');
                const blob = new Blob([summaryText], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `TRINETRA_Graph_Report_${focusedNodeId}.txt`;
                a.click();
                URL.revokeObjectURL(url);
                setPathMessage("Dossier summary exported.");
              }}
              className="p-2 hover:bg-police-accent/15 text-police-muted hover:text-police-accent rounded-lg transition-colors"
              title="Export Graph Summary"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
          </div>
        </ReactFlowProvider>

        {/* Right-Click Context Menu overlay */}
        {contextMenu && (
          <div 
            style={{ top: contextMenu.y, left: contextMenu.x, zIndex: 99999 }}
            className="fixed bg-police-darkest/95 border border-white/10 rounded-lg shadow-2xl py-1 text-[10px] font-mono text-white w-48 backdrop-blur-md"
          >
            <button 
              onClick={() => handleContextMenuAction('center')}
              className="w-full text-left px-3 py-1.5 hover:bg-police-accent/15 hover:text-police-accent transition-colors flex items-center gap-2"
            >
              <Focus className="h-3.5 w-3.5 text-police-accent" />
              <span>Center View on Node</span>
            </button>
            <button 
              onClick={() => handleContextMenuAction('expand-1')}
              className="w-full text-left px-3 py-1.5 hover:bg-police-accent/15 hover:text-police-accent transition-colors flex items-center gap-2"
            >
              <ChevronRight className="h-3.5 w-3.5" />
              <span>Expand One Hop</span>
            </button>
            <button 
              onClick={() => handleContextMenuAction('expand-2')}
              className="w-full text-left px-3 py-1.5 hover:bg-police-accent/15 hover:text-police-accent transition-colors flex items-center gap-2"
            >
              <Maximize2 className="h-3.5 w-3.5" />
              <span>Expand Two Hops</span>
            </button>
            <button 
              onClick={() => handleContextMenuAction('collapse')}
              className="w-full text-left px-3 py-1.5 hover:bg-police-accent/15 hover:text-police-accent transition-colors flex items-center gap-2"
            >
              <EyeOff className="h-3.5 w-3.5 text-red-400" />
              <span>Collapse Node Type</span>
            </button>
            <div className="border-t border-white/5 my-1" />
            <button 
              onClick={() => handleContextMenuAction('path-start')}
              className="w-full text-left px-3 py-1.5 hover:bg-police-accent/15 hover:text-police-accent transition-colors flex items-center gap-2"
            >
              <GitCommit className="h-3.5 w-3.5 text-police-accent animate-pulse" />
              <span>Set as Path Start</span>
            </button>
            <button 
              onClick={() => handleContextMenuAction('path-end')}
              className="w-full text-left px-3 py-1.5 hover:bg-police-accent/15 hover:text-police-accent transition-colors flex items-center gap-2"
            >
              <GitCommit className="h-3.5 w-3.5 text-red-500" />
              <span>Set as Path End</span>
            </button>
            <div className="border-t border-white/5 my-1" />
            <button 
              onClick={() => handleContextMenuAction('copy-id')}
              className="w-full text-left px-3 py-1.5 hover:bg-police-accent/15 hover:text-police-accent transition-colors flex items-center gap-2"
            >
              <Copy className="h-3.5 w-3.5 text-police-muted" />
              <span>Copy Node ID</span>
            </button>
          </div>
        )}
      </div>

      {/* 3. Interactive Right Slide Details Drawer */}
      <div 
        className={`w-96 border-l border-white/5 bg-police-darkest/95 flex flex-col p-5 overflow-y-auto shrink-0 select-none space-y-4 shadow-2xl transition-transform duration-300 transform ${
          selectedNodeDetails ? 'translate-x-0' : 'translate-x-full absolute right-0 top-0 bottom-0 z-40'
        }`}
      >
        {selectedNodeDetails ? (
          <>
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <Info className="h-4.5 w-4.5 text-police-accent" />
                <span className="text-xs font-mono font-semibold text-police-accent">INVESTIGATOR DOSSIER</span>
              </div>
              <button 
                onClick={() => setSelectedNodeDetails(null)}
                className="text-police-muted hover:text-white text-xs font-mono border border-white/10 hover:border-white/20 px-2 py-0.5 rounded bg-police-dark"
              >
                [Close]
              </button>
            </div>

            <div className="space-y-4 font-mono text-xs">
              <div className="space-y-1">
                <span className="text-[9px] uppercase tracking-widest text-police-muted font-bold">{selectedNodeDetails.type} entity:</span>
                <h4 className="text-sm font-bold text-white uppercase tracking-tight leading-tight">{selectedNodeDetails.label}</h4>
              </div>

              {selectedNodeDetails.type === 'Accused' && (
                <div className="space-y-3">
                  <div className="p-3 bg-red-500/5 border border-red-500/10 rounded-lg space-y-2">
                    <div className="flex items-center gap-1.5 text-[10px] text-red-400 font-bold uppercase">
                      <AlertOctagon className="h-4 w-4" />
                      <span>CRITICAL THREAT DOSSIER</span>
                    </div>
                    <div className="grid grid-cols-2 gap-y-2 text-[10px] pt-1">
                      <div className="text-police-muted">Threat Rating:</div>
                      <div className="text-red-400 font-bold">8.7 / 10</div>
                      
                      <div className="text-police-muted">Status:</div>
                      <div className="text-red-500 font-bold uppercase">Active Wanted</div>

                      <div className="text-police-muted">Gang Syndicate:</div>
                      <div className="text-police-text">Co-offending Group A</div>
                    </div>
                  </div>

                  <div className="space-y-2 border-t border-white/5 pt-2 text-[10px]">
                    <div className="text-police-accent uppercase tracking-widest font-bold text-[8px] mb-1">Intelligence Metrics</div>
                    <div className="grid grid-cols-2 gap-y-2">
                      <div className="text-police-muted">Aliases:</div>
                      <div className="text-white">Rowdy {selectedNodeDetails.label.split(' ')[0]}</div>

                      <div className="text-police-muted">Age / Demographics:</div>
                      <div className="text-white">34 Yrs / Male</div>

                      <div className="text-police-muted">Offender Probability:</div>
                      <div className="text-red-400 font-bold">92% (High Repeat)</div>

                      <div className="text-police-muted">Primary Offenses:</div>
                      <div className="text-white">BNS 308, BNS 310</div>
                    </div>
                  </div>

                  <div className="space-y-2 border-t border-white/5 pt-2 text-[10px]">
                    <div className="text-police-accent uppercase tracking-widest font-bold text-[8px]">Linked Case Files</div>
                    <div className="bg-police-darkest/50 p-2 border border-white/5 rounded space-y-1">
                      <div className="text-white">FIR 2026/0018 (Extortion)</div>
                      <div className="text-white">FIR 2026/0022 (Organized crime)</div>
                    </div>
                  </div>
                </div>
              )}

              {selectedNodeDetails.type === 'Case' && (
                <div className="space-y-3">
                  <div className="p-3 bg-blue-500/5 border border-blue-500/10 rounded-lg space-y-2">
                    <div className="flex items-center gap-1.5 text-[10px] text-blue-400 font-bold uppercase">
                      <Calendar className="h-4 w-4" />
                      <span>CASE FILE META SUMMARY</span>
                    </div>
                    <div className="grid grid-cols-2 gap-y-2 text-[10px] pt-1">
                      <div className="text-police-muted">Classification:</div>
                      <div className="text-red-400 font-bold uppercase">Heinous Offense</div>

                      <div className="text-police-muted">Status:</div>
                      <div className="text-blue-400 font-bold">Charge Sheeted</div>

                      <div className="text-police-muted">Station Code:</div>
                      <div className="text-white">JPN-PS-2026</div>
                    </div>
                  </div>

                  <div className="space-y-2 border-t border-white/5 pt-2 text-[10px]">
                    <div className="text-police-accent uppercase tracking-widest font-bold text-[8px] mb-1">Crime Details</div>
                    <div className="grid grid-cols-2 gap-y-2">
                      <div className="text-police-muted">Crime Type:</div>
                      <div className="text-white">Armed Dacoity & Extortion</div>

                      <div className="text-police-muted">Reg Date:</div>
                      <div className="text-white">14-Jan-2026</div>

                      <div className="text-police-muted">Main Accused:</div>
                      <div className="text-red-400">Sunil Gowda, Raju Kappe</div>

                      <div className="text-police-muted">Recovered Evidence:</div>
                      <div className="text-white">Witness SMS Logs, CCTV</div>
                    </div>
                  </div>
                </div>
              )}

              {selectedNodeDetails.type === 'Officer' && (
                <div className="space-y-3">
                  <div className="p-3 bg-cyan-500/5 border border-cyan-500/10 rounded-lg space-y-2">
                    <div className="grid grid-cols-2 gap-y-2 text-[10px]">
                      <div className="text-police-muted">Rank:</div>
                      <div className="text-cyan-400 font-bold">Police Inspector</div>

                      <div className="text-police-muted">Station Assignment:</div>
                      <div className="text-white">JP Nagar PS</div>

                      <div className="text-police-muted">Resolution Rate:</div>
                      <div className="text-emerald-400 font-bold">88%</div>
                    </div>
                  </div>

                  <div className="space-y-2 border-t border-white/5 pt-2 text-[10px]">
                    <div className="text-police-accent uppercase tracking-widest font-bold text-[8px] mb-1">Case Workload</div>
                    <div className="grid grid-cols-2 gap-y-2">
                      <div className="text-police-muted">Active Cases:</div>
                      <div className="text-white">5 Cases</div>

                      <div className="text-police-muted">Workload Rating:</div>
                      <div className="text-yellow-400">High workload</div>
                    </div>
                  </div>
                </div>
              )}

              {selectedNodeDetails.type === 'Station' && (
                <div className="space-y-3">
                  <div className="p-3 bg-purple-500/5 border border-purple-500/10 rounded-lg space-y-2">
                    <div className="grid grid-cols-2 gap-y-2 text-[10px]">
                      <div className="text-police-muted">Jurisdiction:</div>
                      <div className="text-white">Bengaluru South</div>

                      <div className="text-police-muted">Active Cases count:</div>
                      <div className="text-purple-400 font-bold">14 Active</div>

                      <div className="text-police-muted">Crime Density:</div>
                      <div className="text-red-400 font-bold">HIGH</div>
                    </div>
                  </div>
                </div>
              )}

              {selectedNodeDetails.type === 'Section' && (
                <div className="space-y-3">
                  <div className="p-3 bg-police-dark/50 border border-white/10 rounded-lg space-y-2">
                    <div className="text-police-accent font-bold text-[10px]">LEGAL ACT DEFINITION</div>
                    <p className="text-[9.5px] text-police-text leading-relaxed">
                      Whoever commits extortion by putting any person in fear of death or grievous hurt shall be punished with imprisonment up to 10 years and fine.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-y-2 text-[10px] border-t border-white/5 pt-2">
                    <div className="text-police-muted">Max Punishment:</div>
                    <div className="text-red-400 font-bold">10 Years & Fine</div>

                    <div className="text-police-muted">Applicable Class:</div>
                    <div className="text-white">Cognizable, Non-Bailable</div>
                  </div>
                </div>
              )}

              {/* General dossier metadata */}
              <div className="space-y-2 border-t border-white/5 pt-3">
                <span className="text-[9px] uppercase font-bold text-police-accent tracking-widest">Dossier Registry Metadata</span>
                <div className="grid grid-cols-2 gap-y-2 text-[10px]">
                  <div className="text-police-muted">Dossier ID:</div>
                  <div className="text-police-text">#000{selectedNodeDetails.id}</div>

                  <div className="text-police-muted">Department:</div>
                  <div className="text-police-text">Karnataka Police</div>

                  <div className="text-police-muted">Sync Status:</div>
                  <div className="text-emerald-400 font-bold">Synced Live</div>
                </div>
              </div>

              <div className="pt-3 border-t border-white/5 text-[9px] text-police-muted leading-relaxed">
                Use the bottom toolbar to lock physics (stop node dragging), auto-align the layout, hide relation edges, or download this text summary as a dossier report.
              </div>
            </div>
          </>
        ) : (
          <div className="h-full flex items-center justify-center text-center text-police-muted font-mono text-[10px] p-6">
            Select a suspect, case, officer, station, or legal node on the graph canvas to generate and slide in the investigator dossier.
          </div>
        )}
      </div>
    </div>
  );
};

export default NetworkAnalysis;
