// manual positions for a tiny prototype graph
// matches your earlier example so you can eyeball it quickly

import type { Graph } from '$types/graph'

export const sampleGraph: Graph = {
  nodes: [
    { id: 'bo', label: 'Bo', x: 100, y: 40 },
    { id: 'rita', label: 'Rita', x: 240, y: 40 },
    { id: 'layla', label: 'Layla', x: 380, y: 40 },

    { id: 'kalle', label: 'Kalle', x: 100, y: 180 },
    { id: 'lisa', label: 'Lisa', x: 240, y: 180 },
    { id: 'ruth', label: 'Ruth', x: 380, y: 180 },

    { id: 'jenny', label: 'Jenny', x: 40, y: 320 },
    { id: 'sam', label: 'Sam', x: 100, y: 320 },
    { id: 'samantha', label: 'Samantha', x: 240, y: 320 },
    { id: 'kaj', label: 'Kaj', x: 480, y: 40 }
  ],
  edges: [
    { id: 'bo-rita', from: 'bo', to: 'rita', type: 'spouse' },
    { id: 'bo-layla', from: 'bo', to: 'layla', type: 'spouse' },
    { id: 'rita-kaj', from: 'rita', to: 'kaj', type: 'spouse' },

    { id: 'bo-kalle', from: 'bo', to: 'kalle', type: 'parent' },
    { id: 'rita-kalle', from: 'rita', to: 'kalle', type: 'parent' },

    { id: 'bo-lisa', from: 'bo', to: 'lisa', type: 'parent' },
    { id: 'rita-lisa', from: 'rita', to: 'lisa', type: 'parent' },

    { id: 'bo-ruth', from: 'bo', to: 'ruth', type: 'parent' },
    { id: 'layla-ruth', from: 'layla', to: 'ruth', type: 'parent' },

    { id: 'kalle-jenny', from: 'kalle', to: 'jenny', type: 'spouse' },
    { id: 'kalle-sam', from: 'kalle', to: 'sam', type: 'parent' },
    { id: 'jenny-sam', from: 'jenny', to: 'sam', type: 'parent' },

    { id: 'lisa-samantha', from: 'lisa', to: 'samantha', type: 'spouse' }
  ]
}
