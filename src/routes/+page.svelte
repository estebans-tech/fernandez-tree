<script lang="ts">
  import GraphCanvas from '$lib/components/GraphCanvas.svelte'
  import { parseDsl, layoutWithHubs, loadLS, saveLS, debounce } from '$lib/utils'

  import { onMount } from 'svelte'

  const LS_KEY = 'family-dsl'
  
let dsl = `Abelard+America>Johan[b=1950],Vidal[b=1949],Tit[b=1958]
Johan+Betty>Este[b=1974],Ceci
Johan+Vilma>Alex[b=2012]
Ceci+Rickard[b=1972]>Martin[b=2005],Bla[b=2011]
Este+Tai[b=1976]>Gre[b=2006]
Este+Kat[b=1976]>Em[b=2011]`

const defaultDsl = ``

dsl = defaultDsl

  // load from LS on mount
  onMount(() => {
    dsl = loadLS<string>(LS_KEY, defaultDsl)
  })

  // debounced saver
  const saveDebounced = debounce((value: string) => saveLS(LS_KEY, value), 300)

  // live parse + layout
  $: parsed = layoutWithHubs(parseDsl(dsl))
</script>
  
<svelte:head>
  <title>Family tree prototype</title>
</svelte:head>
  
<div style="display: grid; grid-template-columns: 420px 1fr; gap: 16px; padding: 16px">
  <div>
    <h2 style="margin: 0 0 8px 0">Relations</h2>

    <textarea
      bind:value={dsl}
      on:input={(e) => saveDebounced((e.target as HTMLTextAreaElement).value)}
      style="width: 100%; height: 260px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 13px; line-height: 1.4; padding: 10px"></textarea>

    <p style="font-size: 12px; color: #666; margin-top: 8px">
        Format: <code>A+B&gt;C,D</code> for parents to children, <code>A=B</code> for spouse  
        Birth year with <code>[b=YYYY]</code>
    </p>
    
    <div style="display: flex; gap: 8px; margin-top: 8px">
      <button class="btn btn-warning" on:click={() => { dsl = defaultDsl; saveLS(LS_KEY, dsl) }}>reset text</button>
      <button class="btn btn-danger" on:click={() => { localStorage.removeItem(LS_KEY) }}>clear storage</button>
    </div>

  </div>
  
    <div>
      <GraphCanvas graph={parsed} width={1000} height={640} />
    </div>
  </div>