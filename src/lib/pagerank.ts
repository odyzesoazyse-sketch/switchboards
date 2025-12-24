// PageRank algorithm implementation for ranking dancers based on head-to-head battles

interface Edge {
  from: string;
  to: string;
  weight: number;
}

interface GraphNode {
  id: string;
  outLinks: Map<string, number>; // nodeId -> weight
  inLinks: Map<string, number>;  // nodeId -> weight
}

export function calculatePageRank(
  edges: Edge[],
  damping: number = 0.85,
  iterations: number = 100,
  tolerance: number = 1e-6
): Map<string, number> {
  // Build graph
  const graph = new Map<string, GraphNode>();
  
  // Initialize all nodes
  for (const edge of edges) {
    if (!graph.has(edge.from)) {
      graph.set(edge.from, { id: edge.from, outLinks: new Map(), inLinks: new Map() });
    }
    if (!graph.has(edge.to)) {
      graph.set(edge.to, { id: edge.to, outLinks: new Map(), inLinks: new Map() });
    }
    
    const fromNode = graph.get(edge.from)!;
    const toNode = graph.get(edge.to)!;
    
    // Add edge (from winner to loser - winner gains authority from beating loser)
    const currentWeight = fromNode.outLinks.get(edge.to) || 0;
    fromNode.outLinks.set(edge.to, currentWeight + edge.weight);
    
    const currentInWeight = toNode.inLinks.get(edge.from) || 0;
    toNode.inLinks.set(edge.from, currentInWeight + edge.weight);
  }
  
  const n = graph.size;
  if (n === 0) return new Map();
  
  // Initialize PageRank scores
  const ranks = new Map<string, number>();
  const initialRank = 1 / n;
  
  for (const nodeId of graph.keys()) {
    ranks.set(nodeId, initialRank);
  }
  
  // Iterate
  for (let iter = 0; iter < iterations; iter++) {
    const newRanks = new Map<string, number>();
    let maxDiff = 0;
    
    for (const [nodeId, node] of graph) {
      // Base rank from damping factor
      let rank = (1 - damping) / n;
      
      // Add contributions from nodes that this node beat
      // In our model: if A beats B, A gets PageRank from B
      // So we look at inLinks (nodes that we beat)
      for (const [loserId, weight] of node.inLinks) {
        const loserNode = graph.get(loserId)!;
        const totalLoserOutWeight = Array.from(loserNode.outLinks.values())
          .reduce((sum, w) => sum + w, 0) || 1;
        
        const loserRank = ranks.get(loserId) || 0;
        rank += damping * (loserRank * weight / totalLoserOutWeight);
      }
      
      newRanks.set(nodeId, rank);
      maxDiff = Math.max(maxDiff, Math.abs(rank - (ranks.get(nodeId) || 0)));
    }
    
    // Update ranks
    for (const [nodeId, rank] of newRanks) {
      ranks.set(nodeId, rank);
    }
    
    // Check convergence
    if (maxDiff < tolerance) {
      break;
    }
  }
  
  // Normalize scores to 0-100 scale
  const maxRank = Math.max(...Array.from(ranks.values()));
  if (maxRank > 0) {
    for (const [nodeId, rank] of ranks) {
      ranks.set(nodeId, (rank / maxRank) * 100);
    }
  }
  
  return ranks;
}

// Parse battle text input
export function parseBattleText(text: string): { winner: string; loser: string }[] {
  const battles: { winner: string; loser: string }[] = [];
  const lines = text.split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Pattern: "A beat B" or "A beats B" or "A defeated B"
    let match = trimmedLine.match(/^(.+?)\s+(?:beat|beats|defeated|def\.?|won against)\s+(.+?)$/i);
    if (match) {
      battles.push({ winner: match[1].trim(), loser: match[2].trim() });
      continue;
    }
    
    // Pattern: "A > B" or "A → B" or "A -> B"
    match = trimmedLine.match(/^(.+?)\s*(?:>|→|->|=>)\s*(.+?)$/);
    if (match) {
      battles.push({ winner: match[1].trim(), loser: match[2].trim() });
      continue;
    }
    
    // Pattern: "A vs B (A wins)" or "A vs B - A"
    match = trimmedLine.match(/^(.+?)\s+(?:vs\.?|versus)\s+(.+?)\s*(?:\((.+?)\s*wins?\)|[-–]\s*(.+?))$/i);
    if (match) {
      const dancer1 = match[1].trim();
      const dancer2 = match[2].trim();
      const winner = (match[3] || match[4])?.trim();
      if (winner?.toLowerCase() === dancer1.toLowerCase()) {
        battles.push({ winner: dancer1, loser: dancer2 });
      } else if (winner?.toLowerCase() === dancer2.toLowerCase()) {
        battles.push({ winner: dancer2, loser: dancer1 });
      }
    }
  }
  
  return battles;
}
