<script lang="ts">
    // lightweight pan/zoom SVG canvas
    import { onMount } from 'svelte'
    import type { Graph, Transform, Node } from '$types/graph'
    import { zoomAt, fitTo } from '$lib/utils/viewport'
  
    export let graph: Graph
    export let width = 960
    export let height = 600
  
    let svgEl: SVGSVGElement
    let t: Transform = { x: 0, y: 0, k: 1 }
    let panning = false
    let lastX = 0
    let lastY = 0
  
    const nodeSize = { w: 90, h: 36, rx: 8 }
  
    const nodeById = new Map<string, Node>()
    $: {
      nodeById.clear()
      graph.nodes.forEach(n => nodeById.set(n.id, n))
    }
  
    const hasNodes = () => !!graph?.nodes?.length

    const worldBBox = () => {
      // fallback bbox when there are no nodes yet
      if (!hasNodes()) return { x: -width / 2, y: -height / 2, width, height }

      const xs = graph.nodes.map(n => n.x)
      const ys = graph.nodes.map(n => n.y)
      const minx = Math.min(...xs) - nodeSize.w * 0.5
      const maxx = Math.max(...xs) + nodeSize.w * 0.5
      const miny = Math.min(...ys) - nodeSize.h * 0.5
      const maxy = Math.max(...ys) + nodeSize.h * 0.5
      return { x: minx, y: miny, width: maxx - minx, height: maxy - miny }
    }
  
    const toScreen = (x: number, y: number) => ({
      x: x * t.k + t.x,
      y: y * t.k + t.y
    })
  
    const onWheel = (e: WheelEvent) => {
      // if we have no content, ignore zoom to avoid NaNs
      if (!hasNodes()) return
      e.preventDefault()
      const rect = svgEl.getBoundingClientRect()
      const cx = e.clientX - rect.left
      const cy = e.clientY - rect.top
      const dk = e.deltaY > 0 ? 0.9 : 1.1
      t = zoomAt(t, cx, cy, dk)
    }
  
    const onPointerDown = (e: PointerEvent) => {
      svgEl.setPointerCapture(e.pointerId)
      panning = true
      lastX = e.clientX
      lastY = e.clientY
    }
  
    const onPointerMove = (e: PointerEvent) => {
      if (!panning) return
      const dx = e.clientX - lastX
      const dy = e.clientY - lastY
      t = { ...t, x: t.x + dx, y: t.y + dy }
      lastX = e.clientX
      lastY = e.clientY
    }
  
    const onPointerUp = (e: PointerEvent) => {
      panning = false
      svgEl.releasePointerCapture(e.pointerId)
    }
  
    const fit = () => {
      if (!hasNodes()) {
        t = { x: 0, y: 0, k: 1 }
        return
      }
      const bbox = worldBBox()
      t = fitTo(bbox, { width, height }, 60)
    }
  
    onMount(() => {
      fit()
    })
  </script>
  
  <style>
    .toolbar {
      position: absolute;
      top: 12px;
      left: 12px;
      display: flex;
      gap: 8px
    }
    .btn {
      border: 1px solid #ddd;
      background: #fff;
      padding: 6px 10px;
      border-radius: 8px;
      cursor: pointer
    }
    .root {
      position: relative;
      width: 100%;
      height: 100%
    }
  </style>
  
  <div class="root" style="width:{width}px;height:{height}px">
    <div class="toolbar">
      <button class="btn" on:click={() => t = { x: 0, y: 0, k: 1 }}>reset</button>
      <button class="btn" on:click={fit}>fit</button>
    </div>
  
    <svg bind:this={svgEl}
         width={width}
         height={height}
         on:wheel={onWheel}
         on:pointerdown={onPointerDown}
         on:pointermove={onPointerMove}
         on:pointerup={onPointerUp}
         style="touch-action: none; background: #fafafa; border: 1px solid #eee">
      <defs>
        <marker id="arrow" markerWidth="12" markerHeight="8" refX="10" refY="4" orient="auto-start-reverse">
          <polygon points="0 0, 12 4, 0 8" fill="#999" />
        </marker>
      </defs>
  
      <g transform={`translate(${t.x},${t.y}) scale(${t.k})`}>
        {#each graph.edges as e}
          {#if nodeById.get(e.from) && nodeById.get(e.to)}
            {@const a = nodeById.get(e.from)}
            {@const b = nodeById.get(e.to)}
            {@const sx = a.x}
            {@const sy = a.y + (e.type === 'parent' ? nodeSize.h * 0.5 : 0)}
            {@const tx = b.x}
            {@const ty = b.y - (e.type === 'parent' ? nodeSize.h * 0.5 : 0)}
            <line x1={sx} y1={sy} x2={tx} y2={ty}
              stroke={e.type === 'spouse' ? '#999' : '#666'}
              stroke-dasharray={e.type === 'spouse' ? '6 6' : '0'}
              stroke-width="1"
              marker-end={e.type === 'parent' ? 'url(#arrow)' : undefined} />
          {/if}
        {/each}
  
        {#each graph.nodes as n}
          <g transform={`translate(${n.x - nodeSize.w / 2},${n.y - nodeSize.h / 2})`}>
            <rect width={nodeSize.w} height={nodeSize.h} rx={nodeSize.rx} fill="#fff" stroke="#333" />
            <text x={nodeSize.w / 2} y={nodeSize.h / 2 + 4} text-anchor="middle" font-family="system-ui, sans-serif" font-size="11">
              {n.label}
            </text>
          </g>
        {/each}
      </g>
    </svg>
  </div>
  