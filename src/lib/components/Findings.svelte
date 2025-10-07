<script lang="ts">
  import type { Finding } from '$lib/types/warnings'


  type Props = { findings: Finding[] }
  let { findings = [] }: Props = $props()


  const info   = $derived(findings.filter(f => f.severity === 'INFO'))
  const warns  = $derived(findings.filter(f => f.severity === 'WARN'))
  const errors = $derived(findings.filter(f => f.severity === 'ERROR'))
</script>
  
<section class="border border-slate-200 rounded-xl p-4 space-y-3">
  <h3 class="text-lg font-medium">Findings</h3>

  {#if errors.length === 0 && warns.length === 0 && info.length === 0}
    <div class="text-sm text-slate-500">No findings</div>
  {/if}

  {#if errors.length}
    <div class="my-1 pl-3 py-2 border-l-4 border-red-600 bg-red-50 rounded">
      <strong class="text-red-700">ERROR</strong>
      <ul class="list-disc ml-5 text-sm mt-1">
        {#each errors as f}
          <li>
            <code class="text-red-700">{f.code}</code>
            {f.line ? ` @line ${f.line}: ` : ' '}
            {f.message}
          </li>
        {/each}
      </ul>
    </div>
  {/if}

  {#if warns.length}
    <div class="my-1 pl-3 py-2 border-l-4 border-amber-500 bg-amber-50 rounded">
      <strong class="text-amber-700">WARN</strong>
      <ul class="list-disc ml-5 text-sm mt-1">
        {#each warns as f}
          <li class="space-y-0.5">
            <div>
              <code class="text-amber-700">{f.code}</code>
              {f.line ? ` @line ${f.line}: ` : ' '}
              {f.message}
            </div>
            {#if f.contextIdCandidates?.length}
              <div class="text-xs text-slate-600">candidates: {f.contextIdCandidates.join(', ')}</div>
            {/if}
            {#if f.hint}
              <div class="text-xs text-slate-600">hint: {f.hint}</div>
            {/if}
          </li>
        {/each}
      </ul>
    </div>
  {/if}

  {#if info.length}
    <div class="my-1 pl-3 py-2 border-l-4 border-blue-500 bg-blue-50 rounded">
      <strong class="text-blue-700">INFO</strong>
      <ul class="list-disc ml-5 text-sm mt-1">
        {#each info as f}
          <li>
            <code class="text-blue-700">{f.code}</code>
            {f.line ? ` @line ${f.line}: ` : ' '}
            {f.message}
          </li>
        {/each}
      </ul>
    </div>
  {/if}
</section>
  