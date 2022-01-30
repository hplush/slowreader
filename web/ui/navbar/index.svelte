<script>
  import {
    navbarMessages as t,
    isFastRoute,
    isSlowRoute
  } from '@slowreader/core'

  import { router, getURL } from '../../stores/router'
  import Button from './button.svelte'
</script>

<nav>
  <Button>{$t.refresh}</Button>
  <div>
    <Button
      href={getURL('slowAll')}
      current={isSlowRoute($router)}
      swicther
      slow
    >
      {$t.slow}
    </Button>
    <Button href={getURL('fast')} current={isFastRoute($router)} swicther>
      {$t.fast}
    </Button>
  </div>
  <div>
    <Button href={getURL('add')} current={$router.route === 'add'}>
      {$t.add}
    </Button>
    <Button>{$t.menu}</Button>
  </div>
</nav>

<style>
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
