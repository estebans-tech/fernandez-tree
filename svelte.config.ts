import adapter from '@sveltejs/adapter-netlify'
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'
import type { Config } from '@sveltejs/kit'

const config: Config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter(),
    alias: {
      $types: 'src/lib/types',
      $utils: 'src/lib/utils',
      $constants: 'src/lib/constants',
      $components: 'src/lib/components'
    }
  }
}

export default config