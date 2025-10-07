<script lang="ts">
  import type { NodeEntry } from '$lib/types/domain'

  const { nodes } = $props<{ nodes: NodeEntry[] }>()
</script>

<section class="border border-slate-200 rounded-xl p-4">
<h3 class="text-lg font-medium mb-3">Nodes ({nodes.length})</h3>

<div class="overflow-x-auto">
    <table class="min-w-full text-sm">
    <thead>
        <tr class="border-b border-slate-200">
        <th class="text-left py-2 px-2 font-semibold text-slate-700">id</th>
        <th class="text-left py-2 px-2 font-semibold text-slate-700">label</th>
        <th class="text-left py-2 px-2 font-semibold text-slate-700">attrs</th>
        </tr>
    </thead>
    <tbody>
        {#each nodes as n}
        <tr class="border-b border-slate-100">
            <td class="py-2 px-2"><code>{n.id}</code></td>
            <td class="py-2 px-2">{n.label}</td>
            <td class="py-2 px-2"><code>{JSON.stringify(n.attrs)}</code></td>
        </tr>
        {/each}
    </tbody>
    </table>
</div>
</section>
