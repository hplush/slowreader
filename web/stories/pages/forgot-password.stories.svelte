<script context="module" lang="ts">
  import { pages } from '@slowreader/core'
  import { defineMeta } from '@storybook/addon-svelte-csf'

  import ForgotPasswordPage from '../../pages/forgot-password.svelte'
  import Scene from '../scene.svelte'

  let { Story } = defineMeta({
    component: ForgotPasswordPage,
    title: 'Pages/Forgot Password'
  })
</script>

<Story name="Base" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene route="forgotPassword" user={false}>
    <ForgotPasswordPage page={pages.forgotPassword()} />
  </Scene>
</Story>
