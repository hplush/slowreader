<script lang="ts">
  import { commonMessages as t } from '@slowreader/core/messages'
  import { nanoid } from 'nanoid/non-secure'
  import { createEventDispatcher, onMount } from 'svelte'

  export let type: 'email' | 'password' | 'text' | 'url' = 'text'
  export let error: string | undefined = undefined
  export let label: string | undefined = undefined
  export let placeholder = ''
  export let required = false
  export let value = ''

  let inputError: string | undefined = error
  let dispatch = createEventDispatcher<{
    change: { valid: boolean; value: string }
    submit: { valid: boolean; value: string }
  }>()
  let id = nanoid()

  function onInput(e: Event & { currentTarget: HTMLInputElement }): void {
    value = e.currentTarget.value
  }

  function onChange(e: Event & { currentTarget: HTMLInputElement }): void {
    value = e.currentTarget.value
    validate()
    dispatch('change', { valid: !!inputError, value })
  }

  function validate(): void {
    if (required && !value) {
      inputError = t.get().empty
    } else if (type === 'url' && !isValidUrl()) {
      inputError = t.get().noUrl
    } else {
      inputError = error
    }
  }

  function onKeyUp(e: KeyboardEvent): void {
    if (e.key === 'Enter') {
      validate()
      dispatch('change', { valid: !!inputError, value })
      dispatch('submit', { valid: !!inputError, value })
    } else if (required) {
      if (!value) {
        inputError = t.get().empty
      } else {
        inputError = error
      }
    }
  }

  function onBlur(): void {
    validate()
  }

  function isValidUrl(): boolean {
    try {
      new URL(value)
      return true
    } catch {
      return false
    }
  }

  onMount(() => {
    if (value && type === 'url') {
      if (!isValidUrl()) inputError = t.get().noUrl
    }
  })
</script>

{#if label}
  <label class="text-field_label" for={id}>{label}</label>
{/if}
<input
  id={label ? id : null}
  class="text-field_input"
  aria-errormessage={inputError ? `${id}-error` : null}
  aria-invalid={inputError ? true : null}
  {placeholder}
  {required}
  {type}
  {value}
  on:input={onInput}
  on:keyup={onKeyUp}
  on:blur={onBlur}
  on:change={onChange}
/>
{#if inputError}
  <div id={`${id}-error`} class="text-field_error">{inputError}</div>
{/if}

<style>
  .text-field_label {
    padding: 0 var(--padding-m) var(--padding-m) var(--padding-m);
    margin-top: var(--padding-l);
    font-weight: bold;
  }

  :global(.card) > .text-field_label:first-child {
    margin-top: calc(var(--card-text-fix) - 4px);
  }

  .text-field_input {
    box-sizing: border-box;
    width: 100%;
    height: var(--control-height);
    padding: 0 var(--padding-m);
    background-color: var(--field-color);
    border: 1px solid var(--field-border-color);
    border-radius: var(--inner-radius);
    box-shadow: var(--field-shadow);

    &[aria-invalid='true'] {
      border-color: var(--error-color);
    }

    &:focus-visible {
      border-color: var(--focus-color);
      outline: 3px solid oklch(from var(--focus-color) l c h / 50%);
      outline-offset: 0;
    }
  }

  .text-field_error {
    padding: 0 var(--padding-m);
    color: var(--error-color);
  }

  :global(.card) > .text-field_error:last-child {
    margin-bottom: var(--card-text-fix);
  }
</style>
