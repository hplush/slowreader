let { nodeResolve } = require('@rollup/plugin-node-resolve')

module.exports = {
  core: {
    builder: 'storybook-builder-vite'
  },
  stories: ['../ui/**/*.stories.svelte'],
  addons: ['@storybook/addon-svelte-csf'],
  svelteOptions: {
    preprocess: require('../svelte.config.cjs').preprocess
  },
  viteFinal(config) {
    config.plugins.push(
      nodeResolve({
        extensions: ['.js', '.ts']
      })
    )
    return config
  }
}
