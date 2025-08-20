import React, { useState, useEffect, useMemo, useRef } from 'react';
import { generateMindMap } from '../services/geminiService';
import type { MindMapData, MindMapNode } from '../types';
import { NetworkIcon } from './icons/NetworkIcon';

interface VisualizationModalProps {
  noteContent: string;
  onClose: () => void;
}

// Layout constants
const CENTER_X = 500;
const CENTER_Y = 500;
const MAIN_RADIUS = 300;
const CHILD_RADIUS = 100;

const loadingMessages = [
    "Analyzing connections...",
    "Mapping your ideas...",
    "Visualizing the knowledge nexus...",
    "Generating cognitive map...",
];

// --- Physics-based Layout Logic ---

interface LayoutNode {
  id: string;
  label: string;
  width: number;
  height: number;
  x: number;
  y: number;
  level: 0 | 1 | 2; // 0: central, 1: main, 2: child
  parentId?: string;
  isFixed: boolean;
}

const calculateLayout = (mindMapData: MindMapData) => {
    // 1. Initialize nodes with estimated sizes
    const estimateWidth = (label: string, level: number) => {
        const basePadding = level > 1 ? 24 : 40;
        const charWidth = level > 1 ? 7 : 9;
        return Math.min(180, basePadding + label.length * charWidth);
    };

    let layoutNodes: LayoutNode[] = [];
    const centralNode: LayoutNode = {
        id: 'central',
        label: mindMapData.centralTopic,
        width: estimateWidth(mindMapData.centralTopic, 0),
        height: 60,
        x: CENTER_X, y: CENTER_Y,
        level: 0,
        isFixed: true
    };
    layoutNodes.push(centralNode);

    mindMapData.nodes.forEach((mainNode, i) => {
        const angle = (i / mindMapData.nodes.length) * 2 * Math.PI;
        layoutNodes.push({
            id: mainNode.id,
            label: mainNode.label,
            width: estimateWidth(mainNode.label, 1),
            height: 50,
            x: CENTER_X + MAIN_RADIUS * Math.cos(angle),
            y: CENTER_Y + MAIN_RADIUS * Math.sin(angle),
            level: 1,
            parentId: 'central',
            isFixed: false,
        });

        if (mainNode.children) {
            mainNode.children.forEach((childNode, j) => {
                const parentAngle = Math.atan2(layoutNodes[layoutNodes.length - 1].y - CENTER_Y, layoutNodes[layoutNodes.length - 1].x - CENTER_X);
                const childAngle = parentAngle + (j - (mainNode.children!.length - 1) / 2) * 0.5;
                layoutNodes.push({
                    id: childNode.id,
                    label: childNode.label,
                    width: estimateWidth(childNode.label, 2),
                    height: 40,
                    x: layoutNodes[layoutNodes.length - 1].x + CHILD_RADIUS * Math.cos(childAngle),
                    y: layoutNodes[layoutNodes.length - 1].y + CHILD_RADIUS * Math.sin(childAngle),
                    level: 2,
                    parentId: mainNode.id,
                    isFixed: false,
                });
            });
        }
    });

    // 2. Run iterative simulation for clean-up
    const iterations = 150;
    const repulsionStrength = 0.8;
    const attractionStrength = 0.05;

    for (let i = 0; i < iterations; i++) {
        // Repulsion force (pushes nodes away from each other)
        for (let j = 0; j < layoutNodes.length; j++) {
            for (let k = j + 1; k < layoutNodes.length; k++) {
                const nodeA = layoutNodes[j];
                const nodeB = layoutNodes[k];

                const dx = nodeA.x - nodeB.x;
                const dy = nodeA.y - nodeB.y;
                let distance = Math.sqrt(dx * dx + dy * dy);
                if (distance === 0) {
                  distance = 0.1;
                }

                const minDistance = (nodeA.width / 2) + (nodeB.width / 2) + (nodeA.level === 2 && nodeB.level === 2 ? 15 : 30);
                
                if (distance < minDistance) {
                    const force = repulsionStrength * (minDistance - distance) / distance;
                    const moveX = dx * force;
                    const moveY = dy * force;
                    if (!nodeA.isFixed) {
                        nodeA.x += moveX;
                        nodeA.y += moveY;
                    }
                    if (!nodeB.isFixed) {
                        nodeB.x -= moveX;
                        nodeB.y -= moveY;
                    }
                }
            }
        }
        
        // Attraction force (pulls children towards parents)
        for (const node of layoutNodes) {
            if (node.parentId) {
                const parent = layoutNodes.find(p => p.id === node.parentId);
                if (parent) {
                    const dx = node.x - parent.x;
                    const dy = node.y - parent.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    const desiredDistance = node.level === 1 ? MAIN_RADIUS : CHILD_RADIUS;
                    
                    if (distance > desiredDistance) {
                        const force = attractionStrength * (distance - desiredDistance);
                        const moveX = (dx / distance) * force;
                        const moveY = (dy / distance) * force;
                        
                        if (!node.isFixed) {
                            node.x -= moveX;
                            node.y -= moveY;
                        }
                    }
                }
            }
        }
    }
    return layoutNodes;
};


const VisualizationModal: React.FC<VisualizationModalProps> = ({ noteContent, onClose }) => {
  const [mindMap, setMindMap] = useState<MindMapData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentMessage, setCurrentMessage] = useState(loadingMessages[0]);

  // State for pan and zoom
  const [transform, setTransform] = useState({ scale: 1, x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    let messageInterval: number;
    if (isLoading) {
      messageInterval = window.setInterval(() => {
        setCurrentMessage(prev => {
          const currentIndex = loadingMessages.indexOf(prev);
          return loadingMessages[(currentIndex + 1) % loadingMessages.length];
        });
      }, 2500);
    }
    return () => clearInterval(messageInterval);
  }, [isLoading]);

  useEffect(() => {
    generateMindMap(noteContent)
      .then(data => {
        setMindMap(data);
      })
      .catch(err => {
        setError(err instanceof Error ? err.message : "An unknown error occurred.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [noteContent]);

  useEffect(() => {
    if (mindMap && containerRef.current) {
        const container = containerRef.current;
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        
        // 1000 is canvas size, 50 is padding
        const scale = Math.min(containerWidth / 1050, containerHeight / 1050, 1); 
        const x = (containerWidth - (1000 * scale)) / 2;
        const y = (containerHeight - (1000 * scale)) / 2;
        
        setTransform({ scale, x, y });
    }
  }, [mindMap]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.mind-map-node')) {
      return;
    }
    e.preventDefault();
    setIsPanning(true);
    panStartRef.current = { x: e.clientX - transform.x, y: e.clientY - transform.y };
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    e.preventDefault();
    setTransform(prev => ({ 
        ...prev, 
        x: e.clientX - panStartRef.current.x, 
        y: e.clientY - panStartRef.current.y 
    }));
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomIntensity = 0.001;
    const { deltaY } = e;
    
    const nextScale = transform.scale - deltaY * zoomIntensity;
    const scale = Math.max(0.2, Math.min(nextScale, 2));

    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const x = mouseX - (mouseX - transform.x) * (scale / transform.scale);
    const y = mouseY - (mouseY - transform.y) * (scale / transform.scale);
    
    setTransform({ scale, x, y });
  };

  const mindMapElements = useMemo(() => {
    if (!mindMap) return null;
    
    const layout = calculateLayout(mindMap);
    const nodePositions: { [key: string]: { x: number, y: number } } = {};
    layout.forEach(n => nodePositions[n.id] = { x: n.x, y: n.y });

    const lines = [];
    const centralPos = nodePositions['central'];
    
    // Main lines from central topic
    mindMap.nodes.forEach(mainNode => {
        const mainPos = nodePositions[mainNode.id];
        if(centralPos && mainPos) {
            lines.push(
                <line key={`line-c-${mainNode.id}`} x1={centralPos.x} y1={centralPos.y} x2={mainPos.x} y2={mainPos.y} className="mind-map-line" />
            );
        }
        
        // Child lines
        if (mainNode.children) {
            mainNode.children.forEach(childNode => {
                const childPos = nodePositions[childNode.id];
                 if (mainPos && childPos) {
                    lines.push(
                        <line key={`line-m-${childNode.id}`} x1={mainPos.x} y1={mainPos.y} x2={childPos.x} y2={childPos.y} className="mind-map-line child-line" />
                    );
                 }
            });
        }
    });

    const nodes = layout.map(node => {
        const nodeClass = 
            node.level === 0 ? 'central-node' :
            node.level === 1 ? 'main-node' : 'child-node';
        
        return (
            <div key={node.id} className={`mind-map-node ${nodeClass}`} style={{ left: node.x, top: node.y, width: node.width, height: node.height }}>
              {node.label}
            </div>
        );
    });

    return { nodes, lines };
  }, [mindMap]);
  
  return (
    <div className="fixed inset-0 bg-slate-950/80 z-50 flex items-center justify-center animate-modal-fade-in backdrop-blur-sm" onClick={onClose}>
      <div className="w-full h-full relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 z-20 p-2 bg-slate-800/50 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors" aria-label="Close visualization">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {isLoading && (
          <div className="w-full h-full flex flex-col items-center justify-center text-center">
            <NetworkIcon className="w-24 h-24 text-sky-500 animate-pulse-slow" />
            <p className="text-xl text-slate-300 mt-6 font-medium transition-opacity duration-500">{currentMessage}</p>
          </div>
        )}
        
        {error && (
          <div className="w-full h-full flex flex-col items-center justify-center text-center p-8">
             <h3 className="text-2xl font-bold text-red-400">Visualization Failed</h3>
             <p className="text-slate-400 mt-4 max-w-lg">{error}</p>
             <button onClick={onClose} className="mt-8 px-6 py-2.5 rounded-lg bg-slate-700 text-slate-200 font-semibold hover:bg-slate-600 transition-colors">Close</button>
          </div>
        )}

        {!isLoading && !error && mindMapElements && (
           <div 
            ref={containerRef}
            className="mind-map-container"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
            >
             <div 
              className="mind-map-canvas"
              style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})` }}
             >
                <svg className="mind-map-svg" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid meet">
                  <defs>
                    <radialGradient id="line-gradient" gradientUnits="userSpaceOnUse" cx="500" cy="500" r="500">
                      <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity="0.3" />
                    </radialGradient>
                  </defs>
                  <g>{mindMapElements.lines}</g>
                </svg>
                {mindMapElements.nodes}
             </div>
           </div>
        )}
      </div>
    </div>
  );
};

export default VisualizationModal;
