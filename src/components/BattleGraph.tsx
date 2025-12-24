import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Maximize2, Minimize2, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

interface Dancer {
  id: string;
  name: string;
  category: string;
  pagerank_score: number;
  wins_count: number;
  losses_count: number;
  battles_count: number;
}

interface Battle {
  id: string;
  winner_id: string;
  loser_id: string;
}

interface BattleGraphProps {
  dancers: Dancer[];
  battles: Battle[];
  category: 'bboy' | 'bgirl';
  onSelectDancer?: (dancer: Dancer) => void;
}

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  score: number;
  wins: number;
  losses: number;
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: GraphNode | string;
  target: GraphNode | string;
  weight: number;
}

export function BattleGraph({ dancers, battles, category, onSelectDancer }: BattleGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    // Filter by category
    const filteredDancers = dancers.filter(d => d.category === category);
    const dancerIds = new Set(filteredDancers.map(d => d.id));
    const filteredBattles = battles.filter(b => dancerIds.has(b.winner_id) && dancerIds.has(b.loser_id));

    if (filteredDancers.length === 0) return;

    // Clear previous
    d3.select(svgRef.current).selectAll("*").remove();

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = isExpanded ? 600 : 400;

    // Create nodes
    const nodes: GraphNode[] = filteredDancers.map(d => ({
      id: d.id,
      name: d.name,
      score: d.pagerank_score,
      wins: d.wins_count,
      losses: d.losses_count,
    }));

    // Create edges with weight (aggregated battles)
    const edgeMap = new Map<string, number>();
    for (const battle of filteredBattles) {
      const key = `${battle.winner_id}->${battle.loser_id}`;
      edgeMap.set(key, (edgeMap.get(key) || 0) + 1);
    }

    const links: GraphLink[] = [];
    edgeMap.forEach((weight, key) => {
      const [source, target] = key.split('->');
      links.push({ source, target, weight });
    });

    // Create SVG
    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height]);

    // Add zoom behavior
    const g = svg.append("g");

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom);

    // Create arrow markers
    svg.append("defs").append("marker")
      .attr("id", "arrowhead")
      .attr("viewBox", "-0 -5 10 10")
      .attr("refX", 20)
      .attr("refY", 0)
      .attr("orient", "auto")
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .append("path")
      .attr("d", "M 0,-5 L 10,0 L 0,5")
      .attr("fill", "hsl(var(--primary) / 0.5)");

    // Size scale based on PageRank score
    const maxScore = Math.max(...nodes.map(n => n.score), 1);
    const sizeScale = d3.scaleLinear()
      .domain([0, maxScore])
      .range([8, 30]);

    // Color scale based on win ratio
    const colorScale = (node: GraphNode) => {
      const total = node.wins + node.losses;
      if (total === 0) return "hsl(var(--muted-foreground))";
      const ratio = node.wins / total;
      if (ratio > 0.7) return "hsl(142, 71%, 45%)"; // green
      if (ratio > 0.4) return "hsl(var(--primary))"; // primary
      return "hsl(0, 84%, 60%)"; // red
    };

    // Create simulation
    const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink<GraphNode, GraphLink>(links)
        .id(d => d.id)
        .distance(100)
        .strength(0.5))
      .force("charge", d3.forceManyBody().strength(-200))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(d => sizeScale((d as GraphNode).score) + 10));

    // Draw links
    const link = g.append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", "hsl(var(--primary) / 0.3)")
      .attr("stroke-width", d => Math.min(d.weight * 1.5, 6))
      .attr("marker-end", "url(#arrowhead)");

    // Draw nodes
    const node = g.append("g")
      .attr("class", "nodes")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .attr("cursor", "pointer")
      .call(d3.drag<SVGGElement, GraphNode>()
        .on("start", (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on("drag", (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on("end", (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        }));

    // Add circles
    node.append("circle")
      .attr("r", d => sizeScale(d.score))
      .attr("fill", colorScale)
      .attr("stroke", "hsl(var(--background))")
      .attr("stroke-width", 2)
      .on("mouseover", function() {
        d3.select(this).transition().duration(200).attr("stroke-width", 4);
      })
      .on("mouseout", function() {
        d3.select(this).transition().duration(200).attr("stroke-width", 2);
      });

    // Add labels
    node.append("text")
      .text(d => d.name.length > 12 ? d.name.slice(0, 10) + "…" : d.name)
      .attr("text-anchor", "middle")
      .attr("dy", d => sizeScale(d.score) + 14)
      .attr("font-size", "10px")
      .attr("fill", "hsl(var(--foreground))")
      .attr("pointer-events", "none");

    // Add score labels on nodes with high scores
    node.filter(d => d.score > maxScore * 0.3)
      .append("text")
      .text(d => d.score.toFixed(0))
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("font-size", "9px")
      .attr("font-weight", "bold")
      .attr("fill", "hsl(var(--background))")
      .attr("pointer-events", "none");

    // Click handler
    node.on("click", (_, d) => {
      const dancer = dancers.find(dancer => dancer.id === d.id);
      if (dancer && onSelectDancer) {
        onSelectDancer(dancer as Dancer);
      }
    });

    // Simulation tick
    simulation.on("tick", () => {
      link
        .attr("x1", d => (d.source as GraphNode).x!)
        .attr("y1", d => (d.source as GraphNode).y!)
        .attr("x2", d => (d.target as GraphNode).x!)
        .attr("y2", d => (d.target as GraphNode).y!);

      node.attr("transform", d => `translate(${d.x},${d.y})`);
    });

    // Reset zoom function
    const resetZoom = () => {
      svg.transition().duration(750).call(
        zoom.transform,
        d3.zoomIdentity
      );
    };

    // Expose reset function
    (containerRef.current as any).__resetZoom = resetZoom;
    (containerRef.current as any).__zoomIn = () => {
      svg.transition().duration(300).call(zoom.scaleBy, 1.3);
    };
    (containerRef.current as any).__zoomOut = () => {
      svg.transition().duration(300).call(zoom.scaleBy, 0.7);
    };

    return () => {
      simulation.stop();
    };
  }, [dancers, battles, category, isExpanded, onSelectDancer]);

  const handleZoomIn = () => (containerRef.current as any)?.__zoomIn?.();
  const handleZoomOut = () => (containerRef.current as any)?.__zoomOut?.();
  const handleResetZoom = () => (containerRef.current as any)?.__resetZoom?.();

  return (
    <Card className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'fixed inset-4 z-50' : ''}`}>
      <div className="p-3 border-b border-border/50 flex items-center justify-between bg-muted/30">
        <div className="text-sm font-medium">
          Battle Network Graph
          <span className="text-muted-foreground ml-2 text-xs">
            ({category === 'bboy' ? 'B-Boys' : 'B-Girls'})
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleZoomIn}>
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleZoomOut}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleResetZoom}>
            <RotateCcw className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsExpanded(!isExpanded)}>
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
        </div>
      </div>
      <div ref={containerRef} className={`w-full ${isExpanded ? 'h-[calc(100%-48px)]' : 'h-[400px]'}`}>
        <svg ref={svgRef} className="w-full h-full" />
      </div>
      {isExpanded && (
        <div className="absolute bottom-4 left-4 bg-background/80 backdrop-blur p-3 rounded-lg text-xs space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: "hsl(142, 71%, 45%)" }} />
            <span>High win rate (&gt;70%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary" />
            <span>Medium win rate</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: "hsl(0, 84%, 60%)" }} />
            <span>Low win rate (&lt;40%)</span>
          </div>
          <div className="mt-2 text-muted-foreground">Node size = PageRank score</div>
        </div>
      )}
    </Card>
  );
}
