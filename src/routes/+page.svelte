<script lang="ts">
    import GraphCanvas from '$lib/components/GraphCanvas.svelte'
    import { sampleGraph } from '$lib/constants/sampleGraph'
  </script>
  
  <svelte:head>
    <title>Family tree canvas</title>
  </svelte:head>
  
  <div style="padding: 16px">
    <h1 style="margin: 0 0 12px 0">Family tree prototype</h1>
    <GraphCanvas graph={sampleGraph} width={1000} height={640} />
  </div>
  