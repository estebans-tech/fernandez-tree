<script lang="ts">
  import { onMount } from 'svelte'
  import { zoomAt, fitTo } from '$lib/utils/viewport'

  type VNode = { id: string, label: string, x: number, y: number }
  type VEdge = { type: 'parent' | 'spouse', from: string, to: string }
  type Transform = { x: number, y: number, k: number }

  const {
    nodes = [] as VNode[],
    edges = [] as VEdge[],
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
  let svgEl: SVGSVGElement
  let t = $state<Transform>({ x: 0, y: 0, k: 1 })
  let panning = $state(false)
  let lastX = 0
  let lastY = 0

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

  const hasContent = () => nodes.length > 0

  function onWheel(e: WheelEvent) {
    if (!hasContent()) return
    e.preventDefault()
    const rect = svgEl.getBoundingClientRect()
    const cx = e.clientX - rect.left
    const cy = e.clientY - rect.top
    const dk = e.deltaY > 0 ? 0.9 : 1.1
    t = zoomAt(t, cx, cy, dk)
  }

  // pointer pan
  function onPointerDown(e: PointerEvent) {
    svgEl.setPointerCapture(e.pointerId)
    panning = true
    lastX = e.clientX
    lastY = e.clientY
  }
  function onPointerUp(e: PointerEvent) {
    panning = false
    svgEl.releasePointerCapture(e.pointerId)
  }

  function onPointerMove(e: PointerEvent) {
    if (!panning) return
    const dx = e.clientX - lastX
    const dy = e.clientY - lastY
    t = { ...t, x: t.x + dx, y: t.y + dy }
    lastX = e.clientX
    lastY = e.clientY
  }

  // world bbox from nodes (padding half node size)
  function worldBBox() {
    if (!hasContent()) return { x: -width / 2, y: -height / 2, width, height }
    const xs = nodes.map((n: VNode) => n.x)
    const ys = nodes.map((n: VNode) => n.y)
    const minx = Math.min(...xs) - NODE_W * 0.5
    const maxx = Math.max(...xs) + NODE_W * 0.5
    const miny = Math.min(...ys) - NODE_H * 0.5
    const maxy = Math.max(...ys) + NODE_H * 0.5
    return { x: minx, y: miny, width: maxx - minx, height: maxy - miny }
  }

  // fit helpers
  function fit() {
    if (!hasContent()) {
      t = { x: 0, y: 0, k: 1 }
      return
    }
    t = fitTo(worldBBox(), { width, height }, 60)
  }
  function reset() {
    t = { x: 0, y: 0, k: 1 }
    fit()
  }

  onMount(() => fit())
  $effect(() => {
    if (nodes.length && t.k === 1 && t.x === 0 && t.y === 0) fit()
  })
</script>

<div class="relative">
  <!-- simple overlay controls -->
  <div class="absolute left-4 top-3 z-10 flex gap-2">
    <button class="btn btn-sm btn-soft" onclick={fit}>Fit</button>
    <button class="btn btn-sm btn-outline" onclick={reset}>Reset</button>
  </div>
  <svg
    bind:this={svgEl}
    {width} {height}
    class="bg-white border border-slate-200 rounded-xl"
    onwheel={onWheel}
    onpointerdown={onPointerDown}
    onpointerup={onPointerUp}
    onpointermove={onPointerMove}
    onpointercancel={onPointerUp}
    style="touch-action: none; cursor: {panning ? 'grabbing' : 'grab'}"
    >
    <!-- style="touch-action: none; cursor: {panning ? 'grabbing' : 'grab'}" -->
    <defs>
      <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="#0f172a" />
      </marker>
    </defs>

    <!-- world transform -->
    <g transform={`translate(${t.x},${t.y}) scale(${t.k})`}>
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
    </g>
  </svg>
</div>