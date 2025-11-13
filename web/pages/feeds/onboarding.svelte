<script lang="ts">
  import type { OnboardingReader } from '@slowreader/core'

  let { reader }: { reader: OnboardingReader } = $props()
</script>

Onboarding {reader.reading}
