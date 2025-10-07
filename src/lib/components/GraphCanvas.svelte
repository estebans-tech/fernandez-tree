<script lang="ts">
  type VNode = { id: string, label: string, x: number, y: number }
  type VEdge = { type: 'parent' | 'spouse', from: string, to: string }

  const {
    nodes = [],
    edges = [],
    width = 1000,
    height = 640,
    // 🎨 färger (ändra fritt eller skicka in via prop)
    edgeColors = {
      parent: '#0f172a',  // slate-900
      spouse: '#475569'   // slate-600
    },
    edgeOpacity = 0.9
  } = $props<{
    nodes?: VNode[], edges?: VEdge[], width?: number, height?: number,
    edgeColors?: { parent: string; spouse: string },
    edgeOpacity?: number
  }>()

  const NODE_W = 120, NODE_H = 36, R = 8
  const byId = $derived(new Map(nodes.map((n: VNode) => [n.id, n])))
  const colorFor = (t: VEdge['type']) => t === 'spouse' ? edgeColors.spouse : edgeColors.parent

  function center(n: VNode) {
    return { cx: n.x + NODE_W / 2, cy: n.y + NODE_H / 2, top: n.y, bottom: n.y + NODE_H }
  }

  function elbow(parent: VNode, child: VNode) {
    const p = center(parent), c = center(child)
    const midY = (p.bottom + c.top) / 2
    return `M ${p.cx} ${p.bottom} L ${p.cx} ${midY} L ${c.cx} ${midY} L ${c.cx} ${c.top}`
  }
</script>

<svg {width} {height} class="bg-white border border-slate-200 rounded-xl">
  <defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#0f172a" />
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
        <line
          x1={ac.cx} y1={ac.cy} x2={bc.cx} y2={bc.cy}
          stroke={colorFor('spouse')}
          stroke-width="1.75"
          stroke-dasharray="6 5"
          opacity={edgeOpacity}
          vector-effect="non-scaling-stroke"
          stroke-linecap="round"
        />
      {:else}
        {@const p = byId.get(e.from)!}
        {@const c = byId.get(e.to)!}
        <path
          d={elbow(p, c)}
          fill="none"
          stroke={colorFor('parent')}
          stroke-width="2"
          marker-end="url(#arrow)"
          opacity={edgeOpacity}
          vector-effect="non-scaling-stroke"
          stroke-linecap="round"
        />
      {/if}
    {/if}
  {/each}

  <!-- nodes -->
  {#each nodes as n}
    <g transform={`translate(${n.x},${n.y})`}>
      <rect width={NODE_W} height={NODE_H} rx={R} ry={R} fill="#fff" stroke="#1e293b" stroke-width="1" />
      <text x={NODE_W/2} y={NODE_H/2 + 4} text-anchor="middle"
            style="font: 12px system-ui, -apple-system, Segoe UI, Roboto, sans-serif">
        {n.label}
      </text>
    </g>
  {/each}
</svg>