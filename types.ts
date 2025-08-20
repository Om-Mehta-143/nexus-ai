export interface Note {
  id: string;
  title: string;
  content: string;
  lastModified: number;
  type?: 'note' | 'database' | 'image';
}

export interface MindMapNode {
  id: string;
  label: string;
  children?: MindMapNode[];
}

export interface MindMapData {
  centralTopic: string;
  nodes: MindMapNode[];
}
