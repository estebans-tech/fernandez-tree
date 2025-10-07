<script lang="ts">
  import NodePlayground from '$lib/components/NodePlayground.svelte'
</script>

<svelte:head>
  <title>Family Tree – Playground</title>
</svelte:head>

<NodePlayground />
  
<!-- <script lang="ts">
    import NodePlayground from '$lib/components/NodePlayground.svelte'
    import LegacyPage from '$lib/components/LegacyPage.svelte'
  
    let view: 'nodes' | 'legacy' = 'nodes'
  </script>
  
  <svelte:head>
    <title>Family Tree – Playground</title>
  </svelte:head>
  
  <div style="padding:16px">
    <div style="display:flex; gap:8px; margin-bottom:12px">
      <button
        class="btn"
        aria-pressed={view === 'nodes'}
        on:click={() => view = 'nodes'}
      >Nodes (Playground)</button>
  
      <button
        class="btn"
        aria-pressed={view === 'legacy'}
        on:click={() => view = 'legacy'}
      >Legacy</button>
    </div>
  
    {#if view === 'nodes'}
      <NodePlayground />
    {:else}
      <LegacyPage />
    {/if}
  </div>
  
  <style>
    .btn {
      padding: 6px 12px;
      border-radius: 8px;
      border: 1px solid #ddd;
      background: #fff;
      cursor: pointer;
    }
    .btn[aria-pressed="true"] {
      background: #eef6ff;
      border-color: #bcd7ff;
    }
  </style>
   -->