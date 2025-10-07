<script lang="ts">
  // Simple, read-only edge table
  type EdgeRow = {
    id: string
    type: 'parent' | 'spouse'
    from: string
    to: string
    meta?: { line?: number }
  }

  const { edges = [] } = $props<{ edges: EdgeRow[] }>()
</script>

<section class="border border-slate-200 rounded-xl p-4 space-y-3">
  <h3 class="text-lg font-medium">Edges ({edges.length})</h3>

  {#if edges.length === 0}
    <div class="text-sm text-slate-500">No edges</div>
  {:else}
    <div class="overflow-auto">
      <table class="w-full text-sm border-collapse">
        <thead class="text-left">
          <tr class="border-b">
            <th class="py-2 pr-3">id</th>
            <th class="py-2 pr-3">type</th>
            <th class="py-2 pr-3">from → to</th>
            <th class="py-2 pr-3">line</th>
          </tr>
        </thead>
        <tbody>
          {#each edges as e}
            <tr class="border-b last:border-0 align-top">
              <td class="py-1 pr-3 font-mono">{e.id}</td>
              <td class="py-1 pr-3">{e.type}</td>
              <td class="py-1 pr-3">
                <span class="font-mono">{e.from}</span>
                <span class="px-1.5 text-slate-500">→</span>
                <span class="font-mono">{e.to}</span>
              </td>
              <td class="py-1 pr-3">{e.meta?.line ?? ''}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</section>
