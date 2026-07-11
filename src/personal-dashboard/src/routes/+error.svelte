<script lang="ts">
  import { page } from '$app/stores';
  import { Ghost, ArrowLeft } from 'lucide-svelte';
  import { i18n } from '$lib/i18n/i18n.svelte';
</script>

<div class="min-h-screen flex items-center justify-center p-4 font-sans text-white relative py-12" style="background-color: var(--theme-body-bg, #121212);">
  <!-- Subtle Dashboard Grid Background Pattern -->
  <div class="absolute inset-0 z-0 pointer-events-none opacity-40" style="background-image: radial-gradient(circle at 2px 2px, rgba(255,255,255,0.1) 1px, transparent 0); background-size: 32px 32px;"></div>

  <div class="w-full max-w-[500px] bg-neutral-800/80 backdrop-blur-xl border border-black/40 rounded-[24px] shadow-2xl p-8 md:p-12 relative z-10 my-auto text-center">
    
    <div class="flex justify-center mb-6 text-neutral-500 animate-bounce" style="animation-duration: 3s;">
      <Ghost size={64} strokeWidth={1.5} />
    </div>

    <h1 class="text-6xl font-black tracking-tighter mb-4 text-transparent bg-clip-text bg-gradient-to-br from-white to-neutral-500">
      {$page.status}
    </h1>
    
    <p class="text-lg font-medium text-neutral-400 mb-8">
      {#if $page.status === 404}
        {i18n.t.errorPage.notFound}
      {:else}
        {$page.error?.message || i18n.t.errorPage.generic}
      {/if}
    </p>

    <a href="/" class="inline-flex items-center justify-center bg-white/10 hover:bg-white/20 border border-white/10 text-white font-bold text-sm py-3 px-6 rounded-xl transition-all active:scale-[0.98]">
      <ArrowLeft size={16} class="mr-2" />
      {i18n.t.errorPage.backToDashboard}
    </a>
  </div>
</div>
