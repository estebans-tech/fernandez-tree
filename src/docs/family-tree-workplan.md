# Family Tree — Work Plan

> Klistra detta i projektet som README eller som en issue. Allt är grupperat i Sprint 1, Sprint 2 och Backlog. Checkboxar = status.

---

## Sprint 1 — Foundation (Nodes + Playground)

### Project structure
- [ ] Create `$lib/types`
  - [ ] `domain.ts` (Attrs, Year, etc.)
  - [ ] `nodes.ts` (NodeEntry, NodeRegistry)
  - [ ] `warnings.ts` (Finding, codes I/W/E)
- [ ] Create `$lib/constants`
  - [ ] `years.ts` (YEAR_MIN/YEAR_MAX)
- [ ] Create `$lib/utils`
  - [ ] `normalize.ts` (toIdBase, toLabel)
  - [ ] `debounce.ts`
  - [ ] `storage.ts` (saveLS/loadLS)
- [ ] Code comments in English, avoid semicolons

**Acceptance**
- [ ] Types split across files and imported where needed  
- [ ] Constants used for year validation  
- [ ] Build passes

---

### Node parsing + attributes + findings
- [ ] Tokenizer that splits only on `+ , >` **outside** `[...]`
- [ ] `extractLabelAndAttrs(token)`
  - [ ] Support `b=YYYY` and shorthand `[YYYY]` → infer `b`
  - [ ] Year range validation with constants
  - [ ] Findings:
    - INFO: `I001` (CreatedNode), `I003` (Duplicate same name+year), `I011` (Shorthand → b)
    - WARN: `W001` (Ambiguous), `W002` (Multi no-year), `W020` (Extra year tokens), `W021` (Conflict in bracket)
    - ERROR: `E001..E007`  
      - `E001` UnclosedBracket  
      - `E002` InvalidShorthandYear  
      - `E003` YearOutOfRange  
      - `E004` ConflictingDuplicateKeys  
      - `E005` MalformedAttributePair  
      - `E006` MultipleArrowsNotAllowed (line-level)  
      - `E007` EmptyNameToken (line-level)
- [ ] `decideId(label, attrs, reg, mode)`
  - [ ] `resolve` only warns on **multiple** candidates (no warning on 0)
  - [ ] `create` applies id policy:
    - with year: `base_YYYY` or `base_YYYY_2`
    - no year: `base_1`, `base_2` (emit `W002` on >1)
  - [ ] Emit `I001` (created) and `I003` (on same name+year duplicates)

**Acceptance**
- [ ] All described findings appear for the paste-pack scenarios  
- [ ] Silent resolve when 0 candidates; warn only on ambiguity

---

### Playground (Svelte 5 / Runes)
- [ ] Route `/playground`
- [ ] Components
  - [ ] `Findings.svelte`
  - [ ] `NodesTable.svelte`
  - [ ] `NodePlayground.svelte` (node-only parsing)
- [ ] Behavior
  - [ ] Debounced save to LocalStorage (no SSR load)
  - [ ] Parent tokens → resolve (create only if not ambiguous & no match)
  - [ ] Child tokens → always create (to allow duplicates like Samantha 2010)
  - [ ] Single extraction per token to avoid double-logging
- [ ] UI polish
  - [ ] Home `/` shows title + link to `/playground`
  - [ ] `app.css` with Tailwind utility classes (btns etc.)

**Acceptance**
- [ ] Live nodes + findings update without crashes  
- [ ] Shows expected INFO/WARN/ERROR for test input

---

### QA (Sprint 1)
- [ ] Paste-pack of cases:
  - INFO: create, duplicate same name+year, shorthand
  - WARN: ambiguous, multi no-year, extra years, conflicts
  - ERROR: E001–E007
- [ ] Verify findings match expected lines/messages

---

## Sprint 2 — Edges + Interactive Builder

### Edge types + id policy
- [ ] `$lib/types/edges.ts` (EdgeEntry, EdgeType `'parent' | 'spouse'`)
- [ ] Edge id rules
  - [ ] spouse: unordered → `min(a,b)-max(a,b)-spouse`
  - [ ] parent: directed → `from-to-parent`
- [ ] Duplicate-safe insertion

**Acceptance**
- [ ] Types compile and used by parser

---

### Edge parser (parent/spouse) + findings
- [ ] DSL rules
  - [ ] `A+B>C,D` → spouse(A,B) + parent(A→C,D) + parent(B→C,D)
  - [ ] `A=B` → spouse(A,B)
  - [ ] Parents: resolve; 0 → create; ambiguous → block those edges (emit E101/E102)
  - [ ] Children: always create
- [ ] Edge findings
  - WARN:
    - [ ] `W100` DuplicateEdge
    - [ ] `W101` ParentAgeAnomaly (e.g., `child.b - parent.b < 12` or `parent.b >= child.b`)
    - [ ] `W102` SelfSpouse (A=A)
    - [ ] `W103` SelfParent (A>A)
    - [ ] `W104` MultiSpouseHint (optional)
  - ERROR:
    - [ ] `E101` AmbiguousParent (blocks those edges)
    - [ ] `E102` AmbiguousSpouse
    - [ ] `E103` TooManyArrows (line-level pass-through from tokenizer)
    - [ ] `E104` MixedEmptyTokens (line-level)
- [ ] Strict mode (toggle)
  - [ ] Off (default): block only ambiguous edges, continue others
  - [ ] On: ambiguous blocks whole line (promote to blocking)

**Acceptance**
- [ ] Edge list created correctly from sample DSL  
- [ ] Findings include W100/W101/W102/W103 and E101/E102  
- [ ] Strict toggle changes behavior as specified

---

### Canvas clicks + selection
- [ ] `GraphCanvas` emits `onNodeClick(id)` and `onBlankClick()`
- [ ] Selection highlights node + neighbors
- [ ] Badge counts for findings (INFO/WARN/ERROR)

**Acceptance**
- [ ] Clicking selects node; no errors; badges update

---

### Interactive builder v0
- [ ] `GraphEditorOverlay.svelte`
  - [ ] On node click → toolbar: **Add spouse**, **Add child**, (later **Add parent**)
  - [ ] Chooser dialog:
    - [ ] Search existing (reuse) or create new `[YYYY]`
    - [ ] Disambiguation UI if multiple matches (W001)
  - [ ] Actions create nodes/edges via same APIs
  - [ ] Block self-edges; skip duplicates; emit findings
  - [ ] Age sanity warning (W101) if years present

**Acceptance**
- [ ] Can add spouse/child interactively; graph & findings update live

---

### DSL export/format
- [ ] Serialize current graph → DSL
  - [ ] Prefer shorthand `[YYYY]`
  - [ ] Group children under shared parent pairs
  - [ ] Standalone `A=B` lines for spouse links not implied by parent lines
- [ ] “Format/Export” button in UI

**Acceptance**
- [ ] Exported DSL reflects current graph deterministically

---

### QA (Sprint 2)
- [ ] Duplicate edge handling
- [ ] Age anomaly warnings
- [ ] Ambiguous parent/spouse blocking (strict vs non-strict)
- [ ] Self-edge protection
- [ ] Export/import roundtrip sanity

---

## Tooling & Ops

### GitHub setup (scripts)
- [ ] `project_sprint1_foundation.sh` (works)
- [ ] `project_sprint2_edges_interactive.sh`
- [ ] `project_board_setup.sh`
  - [ ] Requires `gh`, `jq`, token with `repo`, `read:org`, `read:project`, `project`
  - [ ] Board fields: **Sprint**, **Priority**, **Status** (Todo/In Progress/Done)
  - [ ] Adds sprint 1/2 issues to the board and sets Sprint + Status

---

## Backlog / Future

- [ ] “Guided input” mini-form (add person/partner/child) that writes DSL
- [ ] Quick fixes in Findings (e.g., on W001 propose: “Create new _3” or “Refer to …_2”)
- [ ] Undo/redo command stack
- [ ] Birth/death/place extended attrs (`d=YYYY`, `place=…`)
- [ ] Import/Export JSON (graph snapshot)
- [ ] Auto-layout tuning (avoid edge crossings, generation layering)
- [ ] Tests (unit/utils + integration for parsing)

---

## Paste-pack (for quick QA)

```text
# INFO
Eva[1970]
Alex
Bo[1980]
Clara[1995]

# WARN
Samantha[2010]
Samantha[2010]         # triggers I003
Göte[1999]
Göte                    # W001 ambiguous
Eva+Per>Alex
Lina+Omar>Alex          # W002 multi no-year
Gertrud[1966,2002]      # I011 + W020
Göte[b=1999,2001]       # W021

# ERROR
Bo[1980                 # E001
Clara[95]               # E002
Elin[2201]              # E003
Fred[b=1980, b=1981]    # E004
Hans[b=]                # E005
Ivar+Jenny>Kim>Leo      # E006
Karl+ ,Lisa> Mia        # E007
```
