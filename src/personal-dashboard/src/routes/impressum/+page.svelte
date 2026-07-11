<script lang="ts">
  import { i18n } from '$lib/i18n/i18n.svelte';

  function goBack() {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = '/login';
    }
  }
</script>

<div class="min-h-screen flex items-center justify-center p-4 font-sans text-white relative" style="background-color: var(--theme-body-bg, #121212);">
  <!-- Subtle Dashboard Grid Background Pattern -->
  <div class="absolute inset-0 z-0 pointer-events-none opacity-40" style="background-image: radial-gradient(circle at 2px 2px, rgba(255,255,255,0.1) 1px, transparent 0); background-size: 32px 32px;"></div>

  <div class="w-full max-w-[600px] bg-neutral-800/80 backdrop-blur-xl border border-black/40 rounded-[24px] shadow-2xl p-8 relative z-10">
    <button onclick={goBack} class="inline-block text-xs font-bold uppercase tracking-widest text-neutral-500 hover:text-white transition-colors mb-6">
      &larr; {i18n.t.back || 'Back'}
    </button>

    <h1 class="text-3xl font-bold tracking-tight mb-8">{i18n.t.legal.impressum.title}</h1>

    <div class="space-y-4 text-sm text-neutral-300 leading-relaxed">
      <p class="font-bold text-white">{i18n.t.legal.impressum.info}</p>

      <p>
        Paul Simon
      </p>

      <p class="font-bold text-white mt-6">{i18n.t.legal.impressum.contact}</p>
      <p>
        contact@paul-simon.dev
      </p>
    </div>
  </div>
</div>
