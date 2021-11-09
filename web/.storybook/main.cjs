module.exports = {
  stories: ['../ui/**/*.stories.svelte'],
  addons: ['@storybook/addon-svelte-csf'],
  svelteOptions: {
    preprocess: require('../svelte.config.cjs').preprocess
  }
}
