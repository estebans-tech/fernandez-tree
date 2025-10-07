<script lang="ts">
    // lightweight pan/zoom SVG canvas
    import { onMount } from 'svelte'
    import type { Graph, Transform, Node } from '$types/graph'
    import { zoomAt, fitTo } from '$lib/utils/viewport'
    import { elbowPath } from '$lib/utils'

    export let graph: Graph
    export let width = 960
    export let height = 600
  
    let svgEl: SVGSVGElement
    let t: Transform = { x: 0, y: 0, k: 1 }
    let panning = false
    let lastX = 0
    let lastY = 0
  
    const nodeSize = { w: 90, h: 36, rx: 8 }
  
    // quick lookups
    const nodeById = new Map<string, Node>()
    $: {
      nodeById.clear()
      graph.nodes.forEach(n => nodeById.set(n.id, n))
    }

    // build spouse set for quick checks (undirected)
    const spouseKey = (a: string, b: string) => a < b ? `${a}|${b}` : `${b}|${a}`
    let spousePairs = new Set<string>()
    $: {
      spousePairs = new Set()
      for (const e of graph.edges) if (e.type === 'spouse') {
        spousePairs.add(spouseKey(e.from, e.to))
      }
    }

    // compute children -> parents map
    let parentsOf = new Map<string, string[]>()
    $: {
      parentsOf = new Map()
      for (const e of graph.edges) if (e.type === 'parent') {
        const arr = parentsOf.get(e.to) ?? []
        if (!arr.includes(e.from)) arr.push(e.from)
        parentsOf.set(e.to, arr)
      }
    }

    // children that qualify for a couple hub
    let hubChildren = new Map<string, { p1: string, p2: string }>()
    $: {
      hubChildren = new Map()
      for (const [child, ps] of parentsOf) {
        if (ps.length === 2 && spousePairs.has(spouseKey(ps[0], ps[1]))) {
          hubChildren.set(child, { p1: ps[0], p2: ps[1] })
        }
      }
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
  
      <g transform={`translate(${Number.isFinite(t.x) ? t.x : 0},${Number.isFinite(t.y) ? t.y : 0}) scale(${Number.isFinite(t.k) && t.k > 0 ? t.k : 1})`}>

        {#each graph.edges.filter(e => e.type === 'spouse') as e}
          {#if nodeById.get(e.from) && nodeById.get(e.to)}
            {@const a = nodeById.get(e.from)}
            {@const b = nodeById.get(e.to)}
            {@const sameRow = Math.abs(a.y - b.y) < 1}  <!-- proxy för "samma generation" -->
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              stroke={sameRow ? '#999' : '#bbb'}
              stroke-dasharray="6 6"
              stroke-width={sameRow ? '1' : '0.8'} />
          {/if}
        {/each}
      
        {#each graph.nodes as child}
          {#if hubChildren.has(child.id)}
            {@const pair = hubChildren.get(child.id)}
            {@const A = nodeById.get(pair.p1)}
            {@const B = nodeById.get(pair.p2)}
            {#if A && B}
              {@const hx = (A.x + B.x) * 0.5}
              {@const hy = (A.y + B.y) * 0.5}
              {@const path = elbowPath(hx, hy + 18, child.x, child.y - 18)}
              <path d={path} fill="none" stroke="#666" stroke-width="1.2" marker-end="url(#arrow)" />
            {/if}
          {/if}
        {/each}
      
        {#each graph.edges.filter(e => e.type === 'parent') as e}
          {#if nodeById.get(e.from) && nodeById.get(e.to)}
            {@const a = nodeById.get(e.from)}
            {@const b = nodeById.get(e.to)}
      
            {#if !hubChildren.has(e.to)}
              {@const sx = a.x}
              {@const sy = a.y + 18}
              {@const tx = b.x}
              {@const ty = b.y - 18}
              {@const path = elbowPath(sx, sy, tx, ty)}
              <path d={path} fill="none" stroke="#666" stroke-width="1.2" marker-end="url(#arrow)" />
            {/if}
          {/if}
        {/each}
      
        <!-- nodes as before -->
        {#each graph.nodes as n}
          <g transform={`translate(${n.x - nodeSize.w / 2},${n.y - nodeSize.h / 2})`}>
            <rect width={nodeSize.w} height={nodeSize.h} rx={nodeSize.rx} fill="#fff" stroke="#333" />
            <text x={nodeSize.w / 2} y={nodeSize.h / 2 + 4} text-anchor="middle" font-family="system-ui, sans-serif" font-size="12">
              {n.label}
            </text>
          </g>
        {/each}
      </g>
    </svg>
  </div>
  