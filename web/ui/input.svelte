<script lang="ts">
  import { notEmpty, type Validator, validUrl } from '@slowreader/core'
  import type { HTMLInputAttributes } from 'svelte/elements'

  import Error from './error.svelte'
  import Label from './label.svelte'

  let {
    error,
    errorId,
    font = 'normal',
    input = $bindable(),
    label,
    onchange,
    onescape,
    oninput,
    type = 'text',
    validate = () => undefined,
    value = $bindable(''),
    ...props
  }: {
    error?: string
    errorId?: string
    font?: 'mono' | 'normal'
    input?: HTMLInputElement
    label: string
    onchange?: (v: string, valid: boolean) => void
    onescape?: () => void
    oninput?: (v: string, valid: boolean) => void
    validate?: Validator | Validator[]
  } & HTMLInputAttributes = $props()

  let id = $props.id()
  let inputError = $state<string | undefined>(error)
  let isValid = $derived(!inputError || !error || !errorId)

  let validators = Array.isArray(validate) ? validate : [validate]

  if (props.required) validators.unshift(notEmpty)
  if (type === 'url') validators.unshift(validUrl)

  function runValidators(val: string): string | undefined {
    for (let validator of validators) {
      let result = validator(val)
      if (result) return result
    }
    return undefined
  }
</script>

<div class="input">
  <Label {id}>{label}</Label>
  <input
    bind:this={input}
    {id}
    class="input_field"
    class:is-mono={font === 'mono'}
    aria-errormessage={errorId || (inputError || error ? `${id}-error` : null)}
    aria-invalid={inputError || error || errorId ? true : null}
    data-invalid={!!runValidators(value)}
    onblur={() => {
      inputError = runValidators(value)
    }}
    onchange={e => {
      value = e.currentTarget.value
      inputError = runValidators(value)
      if (onchange) onchange(value, isValid)
    }}
    oninput={e => {
      if (oninput) oninput(e.currentTarget.value, isValid)
    }}
    onkeyup={e => {
      if (e.key === 'Escape') onescape?.()
      if (inputError) {
        inputError = runValidators(e.currentTarget.value)
      }
    }}
    {type}
    {value}
    {...props}
  />
  <Error id={`${id}-error`} field text={inputError || error} />
</div>

<style>
  :global {
    .input {
      margin: 10px 0;
    }

    .input_field {
      box-sizing: border-box;
      width: 100%;
      padding: 4px 6px;
      font: var(--control-font);
      background: var(--field-color);
      border: 2px solid var(--text-color);
      border-radius: 8px;

      &:focus-visible {
        outline-offset: 1px;
      }

      &[aria-invalid] {
        border-color: var(--dangerous-text-color);
      }

      &.is-mono {
        font: var(--control-mono-font);
      }
    }
  }
</style>
