<script>
  import { isFastRoutes, isSlowRoutes } from '@slowreader/core'

  import { router, getURL } from '../../stores/router'
  import Button from './button.svelte'
</script>

<nav>
  <Button>Refresh</Button>
  <div>
    <Button
      href={getURL('slowAll')}
      current={isSlowRoutes($router)}
      swicther
      slow
    >
      Slow
    </Button>
    <Button href={getURL('fast')} current={isFastRoutes($router)} swicther>
      Fast
    </Button>
  </div>
  <div>
    <Button href={getURL('add')} current={$router.route === 'add'}>Add</Button>
    <Button>Menu</Button>
  </div>
</nav>

<style>
  :root {
    --navbar-height: 51px;
  }

  nav {
    position: fixed;
    top: 0;
    right: 0;
    left: 0;
    box-sizing: border-box;
    display: flex;
    justify-content: space-between;
    height: var(--navbar-height);
    background: var(--app-background);
    border-bottom: 1px solid var(--navbar-border);
  }

  div {
    display: flex;
  }
</style>
