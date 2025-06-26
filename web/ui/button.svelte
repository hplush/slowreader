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
      display: inline-block;
      font: var(--control-font);
      color: var(--text-color);
      text-decoration: none;
      cursor: pointer;
      user-select: none;
      background: oklch(from var(--land) calc(l - 0.03) c h);
      border: none;
      border-radius: 8px;

      &:hover {
        background: oklch(from var(--land) calc(l - 0.06) c h);
      }

      &:active {
        background: oklch(from var(--land) calc(l - 0.09) c h);
        box-shadow:
          inset 0 1px 2px oklch(0 0 0 / 50%),
          0 0.5px 0 oklch(1 0 0 / 100%);
      }
    }

    .button_cap {
      display: flex;
      flex-direction: row;
      gap: 4px;
      align-items: center;
      justify-content: center;
      padding: 2px 8px;

      .button:active & {
        transform: translateY(1px);
      }
    }
  }
</style>
