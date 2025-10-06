import adapter from '@sveltejs/adapter-netlify'
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'
import type { Config } from '@sveltejs/kit'

const config: Config = {
  // enables postcss, scss, md transforms handled by Vite
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter()
  }
}

export default config