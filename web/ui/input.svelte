<script lang="ts">
  import { notEmpty, type Validator, validUrl } from '@slowreader/core'
  import { onMount } from 'svelte'
  import type { HTMLInputAttributes } from 'svelte/elements'

  let {
    error,
    errorId,
    label,
    onchange,
    oninput,
    type = 'text',
    validate = () => undefined,
    value = $bindable(''),
    ...props
  }: {
    error?: string
    errorId?: string
    label: string
    onchange?: (v: string, valid: boolean) => void
    oninput?: (v: string, valid: boolean) => void
    validate?: Validator | Validator[]
  } & HTMLInputAttributes = $props()

  let id = $props.id()
  let inputError = $state<string | undefined>(error)
  let isValid = $derived(!inputError || !error || !errorId)

  let validators = Array.isArray(validate) ? validate : [validate]

  if (props.required) validators.push(notEmpty)
  if (type === 'url') validators.push(validUrl)

  function runValidators(
    val: string,
    event: Parameters<Validator>[1]
  ): string | undefined {
    for (let validator of validators) {
      let result = validator(val, event)
      if (result) return result
    }
    return undefined
  }

  onMount(() => {
    inputError = runValidators(value, 'init')
  })
</script>

<div class="input">
  <label class="input_label" for={id}>{label}</label>
  <input
    {id}
    class="input_field"
    aria-errormessage={errorId || (inputError || error ? `${id}-error` : null)}
    aria-invalid={inputError || error || errorId ? true : null}
    onblur={() => {
      inputError = runValidators(value, 'blur')
    }}
    onchange={e => {
      value = e.currentTarget.value
      inputError = runValidators(value, 'change')
      if (onchange) onchange(value, isValid)
    }}
    oninput={e => {
      if (oninput) oninput(e.currentTarget.value, isValid)
    }}
    onkeyup={() => {
      inputError = runValidators(value, 'keyup')
    }}
    {type}
    {value}
    {...props}
  />
  {#if inputError || error}
    <div id={`${id}-error`} class="input_error">{inputError || error}</div>
  {/if}
</div>

<style>
  :global {
    .input {
      margin: 8px 0;
    }

    .input_label {
      padding-inline-start: 8px;
      padding-bottom: 2px;
      font: var(--control-secondary-font);
    }

    .input_field {
      width: 100%;
      padding: 4px 6px;
      font: var(--control-font);
      background: var(--field-color);
      border: 2px solid var(--text-color);
      border-radius: 8px;

      &:focus-visible {
        outline-offset: 0;
      }

      &[aria-invalid] {
        border-color: var(--dangerous-text-color);
      }
    }

    .input_error {
      padding: 0 8px;
      margin-top: 2px;
      font: var(--control-secondary-font);
      color: var(--dangerous-text-color);
    }
  }
</style>
