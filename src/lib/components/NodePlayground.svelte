<script lang="ts">
  // Node-only playground (no edges). Svelte 5 runes.
  import Findings from '$lib/components/Findings.svelte'
  import NodesTable from '$lib/components/NodesTable.svelte'
  
  import {
    createEmptyRegistry,
    extractLabelAndAttrs,
    decideId
  } from '$lib/data/nodes'
  import { parseEdgesFromDsl } from '$lib/data/edges'

  import type { NodeRegistry } from '$lib/types/nodes'
  import type { Finding } from '$lib/types/warnings'
  import type { Attrs } from '$lib/types/domain'

  import { saveLS } from '$lib/utils/storage'
  import { debounce } from '$lib/utils/debounce'

  const LS_KEY = 'family-nodes-playground'

  const SAMPLE = `Åke Fehrm[1950]+Gertrud Hansson[1956]>André Fehrm Hansson[1977],Göte Fehrm Hansson[1980],Gertrud Fehrm Hansson[1982]
Göte Fehrm Hansson+Hilda Svansson[1988]>Samantha Fehrm Svansson[2010]
Åke Fehrm+Vilma Cynthia[1977]>Samantha Fehrm Cynthia[2010]`

  // local state
  let dsl = $state(SAMPLE)
  let reg = $state<NodeRegistry>(createEmptyRegistry())
  let findings = $state<Finding[]>([])
  let edgesCount = $state(0)

  // save to localStorage (debounced) whenever dsl changes
  const saveDebounced = debounce((v: string) => saveLS(LS_KEY, v), 300)
  $effect(() => {
    saveDebounced(dsl)
  })

  // re-parse when dsl changes
  $effect(() => {
  const { tokens: toks } = tokenizePersonsWithRole(dsl)

  const newReg = createEmptyRegistry()
  const newFindings: Finding[] = []

  for (const tok of toks) {
    const ex = extractLabelAndAttrs(tok.text)
    newFindings.push(...ex.findings.map(f => ({ ...f, line: tok.line })))

    const hasError = ex.findings.some(f => f.severity === 'ERROR')
    if (hasError) continue

    if (tok.role === 'parent') {
      const r1 = decideId(ex.label, ex.attrs as Attrs, newReg, 'resolve')
      newFindings.push(...r1.findings.map(f => ({ ...f, line: tok.line })))

      const ambiguous = r1.findings.some(f => f.code === 'W001' && (f.contextIdCandidates?.length ?? 0) > 1)
      if (!r1.id && !ambiguous) {
        const r2 = decideId(ex.label, ex.attrs as Attrs, newReg, 'create')
        newFindings.push(...r2.findings.map(f => ({ ...f, line: tok.line })))
      }
    } else {
      const r = decideId(ex.label, ex.attrs as Attrs, newReg, 'create')
      newFindings.push(...r.findings.map(f => ({ ...f, line: tok.line })))
    }
  }

  // edges – read-only, don't create nodes again
  const { edges, findings: edgeFinds } = parseEdgesFromDsl(dsl, newReg, {
    strictMode: false,
    createMissingNodes: false
  })

  // single assignments — no read/modify cycles
  reg = newReg
  edgesCount = edges.list.length
  findings = [...newFindings, ...edgeFinds]
})

  // derived for table
  const nodes = $derived(Array.from(reg.byId.values()))

  // helpers -------------------------------------------------------------
  type Tok = { text: string, role: 'parent' | 'child', line: number }
  type TokResult = { tokens: Tok[], findings: Finding[] }


  function tokenizePersonsWithRole(text: string): TokResult {
    const tokens: Tok[] = []
    const findings: Finding[] = []

    const lines = text.split(/\r?\n/).map(s => s.split('#')[0].trim()).filter(Boolean)

    for (let li = 0; li < lines.length; li++) {
      const lineNo = li + 1
      const line = lines[li]

      // count top-level '>'
      let depth = 0, arrows = 0
      for (const ch of line) {
        if (ch === '[') depth++
        else if (ch === ']') depth = Math.max(0, depth - 1)
        else if (ch === '>' && depth === 0) arrows++
      }

      if (arrows > 1) {
        findings.push({
          severity: 'ERROR',
          code: 'E006',
          message: `Multiple '>' in one line is not allowed.`,
          line: lineNo
        })
        continue // skip this line entirely
      }

      // mask only + , > inside [...]
      let safe = '', d = 0
      for (const ch of line) {
        if (ch === '[') d++
        else if (ch === ']') d = Math.max(0, d - 1)
        safe += (d > 0 && (ch === '+' || ch === ',' || ch === '>')) ? '§' : ch
      }

      const [left = '', right = ''] = safe.split('>')
      const splitAndPush = (side: string, role: 'parent' | 'child') => {
        const raw = side.split(/[+,]/)
        for (const piece of raw) {
          const t = piece.trim()
          if (!t) {
            findings.push({
              severity: 'ERROR',
              code: 'E007',
              message: `Empty person token near '+', ',' or '>'.`,
              line: lineNo
            })
            continue
          }
          tokens.push({ text: t.replace(/§/g, ','), role, line: lineNo })
        }
      }

      splitAndPush(left, 'parent')
      if (right) splitAndPush(right, 'child')
    }

    return { tokens, findings }
  }

  function resetText() {
    dsl = SAMPLE
  }

  function clearStorage() {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(LS_KEY)
  }
</script>

<div class="grid grid-cols-[420px_1fr] gap-4 p-4">
  <div>
    <h2 class="text-xl font-semibold mb-2">Nodes playground</h2>

    <textarea
      bind:value={dsl}
      class="w-full h-60 font-mono text-[13px] leading-snug p-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
    ></textarea>

    <p class="text-xs text-slate-600 mt-2">
      Tips: <code>[b=YYYY]</code> or shorthand <code>[YYYY]</code>. Multiple persons can share the same name+year.
    </p>

    <div class="flex gap-2 mt-2">
      <button class="btn btn-sm btn-secondary" onclick={resetText}>reset text</button>
      <button class="btn btn-sm btn-warning" onclick={clearStorage}>clear storage</button>
    </div>
  </div>

  <div class="flex flex-col gap-3">
    <div class="flex items-center gap-3">
      <span class="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-slate-100">
        Nodes {nodes.length}
      </span>
      <span class="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-slate-100">
        Edges {edgesCount}
      </span>
    </div>
    <NodesTable nodes={nodes} />
    <Findings findings={findings} />
  </div>
</div>
