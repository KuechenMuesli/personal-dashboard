<script lang="ts">
  import { i18n } from '$lib/i18n/i18n.svelte';
  import LegalFooter from '$lib/components/LegalFooter.svelte';

  function goBack() {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = '/login';
    }
  }
</script>

<div class="relative flex min-h-screen items-center justify-center bg-app p-4 text-primary">
  <!-- Subtle Dashboard Grid Background Pattern -->
  <div class="absolute inset-0 z-0 pointer-events-none opacity-40" style="background-image: radial-gradient(circle at 2px 2px, var(--ds-border-strong) 1px, transparent 0); background-size: 32px 32px;"></div>

  <div class="ds-panel relative z-10 w-full max-w-[600px] p-8">
    <button onclick={goBack} class="ds-label mb-6 inline-block transition-colors hover:text-primary">
      &larr; {i18n.t.back || 'Back'}
    </button>

    <h1 class="mb-8 text-3xl font-semibold tracking-tight">{i18n.t.legal.impressum.title}</h1>

    <div class="space-y-4 text-sm leading-relaxed text-secondary">
      <p class="font-semibold text-primary">{i18n.t.legal.impressum.info}</p>

      <p>
        Paul Simon
      </p>

      <p class="mt-6 font-semibold text-primary">{i18n.t.legal.impressum.contact}</p>
      <p>
        contact@paul-simon.dev
      </p>
    </div>

    <div class="mt-12 border-t border-line pt-8">
      <LegalFooter />
    </div>
  </div>
</div>
