<script lang="ts">
  import type { Snippet } from 'svelte'
  import type { HTMLButtonAttributes } from 'svelte/elements'

  import Icon from './icon.svelte'

  let {
    icon,
    onclick,
    //TODO size = 'inline',
    //TODO style = 'normal',
    ...rest
  }: {
    children: Snippet
    icon?: string
    onclick?: (event: MouseEvent) => void
    //TODO size?: 'icon' | 'inline' | 'wide'
    //TODO style?: 'main' | 'normal'
  } & ({ href: string } | HTMLButtonAttributes) = $props()
</script>

{#snippet content()}
  <span class="button_cap">
    {#if icon}
      <Icon path={icon} />
    {/if}
    <span>
      {@render rest.children()}
    </span>
  </span>
{/snippet}

{#if 'href' in rest}
  <a class="button" href={rest.href} {onclick}>
    {@render content()}
  </a>
{:else}
  <button {...rest} class="button" {onclick} type={rest.type || 'button'}>
    {@render content()}
  </button>
{/if}

<style>
  :global {
    .button {
      box-sizing: border-box;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: var(--text-color);
      text-decoration: none;
      cursor: pointer;
      user-select: none;
      border: none;
      border-radius: 4px;

      &:active {
        background: oklch(from var(--land) calc(l - 0.1) c h);
        box-shadow: inset 0 2px 2px oklch(0 0 0);
      }
    }

    .button_cap {
      padding: 0 8px;
      border-radius: 4px;

      .button:active & {
        transform: scale(0.95) translateY(1px);
      }
    }
  }
</style>
