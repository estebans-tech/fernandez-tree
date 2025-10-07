<script lang="ts">
  // Simple SVG renderer for nodes + edges.
  // spouse: dashed straight line
  // parent: orthogonal elbow with arrow
  type VNode = { id: string, label: string, x: number, y: number }
  type VEdge = { type: 'parent' | 'spouse', from: string, to: string }

  const { nodes = [], edges = [], width = 1000, height = 640 } =
    $props<{ nodes?: VNode[], edges?: VEdge[], width?: number, height?: number }>()

  // node box metrics
  const NODE_W = 120
  const NODE_H = 36
  const R = 8

  // quick lookup
  const byId = $derived(new Map(nodes.map(n => [n.id, n])))

  function center(n: VNode) {
    return { cx: n.x + NODE_W / 2, cy: n.y + NODE_H / 2, top: n.y, bottom: n.y + NODE_H }
  }

  function elbow(parent: VNode, child: VNode) {
    // orthogonal path: from bottom-center of parent → vertical down to midY → horizontal → up to top-center of child
    const p = center(parent)
    const c = center(child)
    const midY = (p.bottom + c.top) / 2
    const x1 = p.cx, y1 = p.bottom
    const x2 = c.cx, y2 = c.top
    return `M ${x1} ${y1} L ${x1} ${midY} L ${x2} ${midY} L ${x2} ${y2}`
  }
</script>

<svg {width} {height} class="bg-white border border-slate-200 rounded-xl">
  <defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z"></path>
    </marker>
  </defs>

  <!-- edges -->
  {#each edges as e}
    {#if byId.has(e.from) && byId.has(e.to)}
      {#if e.type === 'spouse'}
        {@const a = byId.get(e.from)!}
        {@const b = byId.get(e.to)!}
        {@const ac = center(a)}
        {@const bc = center(b)}
       
        <line x1={ac.cx} y1={ac.cy} x2={bc.cx} y2={bc.cy}
              stroke="black" stroke-width="1.25" stroke-dasharray="5 4" opacity="0.7"
              vector-effect="non-scaling-stroke" />
      {:else}
        {@const p = byId.get(e.from)!}
        {@const c = byId.get(e.to)!}
        <path d={elbow(p, c)} fill="none" stroke="black" stroke-width="1.25"
              marker-end="url(#arrow)" opacity="0.8"
              vector-effect="non-scaling-stroke" />
      {/if}
    {/if}
  {/each}

  <!-- nodes -->
  {#each nodes as n}
    <g transform={`translate(${n.x},${n.y})`}>
      <rect width={NODE_W} height={NODE_H} rx={R} ry={R} fill="#fff" stroke="#1e293b" stroke-width="1" />
      <text x={NODE_W/2} y={NODE_H/2 + 4} text-anchor="middle" class="select-none"
            style="font: 12px system-ui, -apple-system, Segoe UI, Roboto, sans-serif">
        {n.label}
      </text>
    </g>
  {/each}
</svg>
