<script lang="ts">
  import { enhance } from '$app/forms';
  import { fade } from 'svelte/transition';
  import { i18n } from '$lib/i18n/i18n.svelte';
  import LegalFooter from '$lib/components/LegalFooter.svelte';
  
  let { form, data } = $props();
  import { page } from '$app/stores';
  let loading = $state(false);
  let isSignUp = $state($page.url.searchParams.has('signup'));
  

</script>

<div class="min-h-screen flex items-center justify-center p-4 font-sans text-white relative" style="background-color: var(--theme-body-bg, #121212);">
  <!-- Subtle Dashboard Grid Background Pattern -->
  <div class="absolute inset-0 z-0 pointer-events-none opacity-40" style="background-image: radial-gradient(circle at 2px 2px, rgba(255,255,255,0.1) 1px, transparent 0); background-size: 32px 32px;"></div>

  <div class="w-full max-w-[380px] bg-neutral-800/80 backdrop-blur-xl border border-black/40 rounded-[24px] shadow-2xl p-8 relative z-10">
    
    <div class="mb-8">
      <h1 class="text-2xl font-bold tracking-tight mb-1">{isSignUp ? i18n.t.login.createAccount : i18n.t.login.welcomeBack}</h1>
      <p class="text-neutral-400 text-sm">{isSignUp ? i18n.t.login.signUpDesc : i18n.t.login.signInDesc}</p>
    </div>

    {#if form?.error}
      <div class="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-xl mb-6 font-medium" in:fade>
        {form.error}
      </div>
    {/if}
    
    {#if form?.message}
      <div class="bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs p-3 rounded-xl mb-6 font-medium" in:fade>
        {form.message}
      </div>
    {/if}

    <form method="POST" action={isSignUp ? "?/signup" : "?/login"} use:enhance={() => { loading = true; return async ({ update }) => { loading = false; update(); } }} class="space-y-4">
      <div>
        <label for="email" class="block text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-1.5 ml-1">{i18n.t.login.email}</label>
        <input type="email" id="email" name="email" required placeholder="you@example.com" class="w-full bg-black/20 border border-black/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-neutral-600" />
      </div>
      <div>
      <div class="flex justify-between items-center mt-1">
        <label for="password" class="block text-[10px] font-black text-neutral-500 uppercase tracking-widest ml-1">{i18n.t.login.password}</label>
        {#if !isSignUp}
          <a href="/login/reset-password" class="text-[10px] font-medium text-neutral-400 hover:text-white transition-colors">{i18n.t.login.forgotPassword}</a>
        {/if}
      </div>
      <input type="password" id="password" name="password" required placeholder="••••••••" class="w-full bg-black/20 border border-black/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-neutral-600" />
    </div>
    
    <button type="submit" disabled={loading} class="w-full bg-neutral-700/50 hover:bg-neutral-600/50 border border-black/20 text-white font-bold text-sm py-3 rounded-xl mt-6 transition-all disabled:opacity-50 active:scale-[0.98]">
      {loading ? (isSignUp ? i18n.t.login.creating : i18n.t.login.signingIn) : (isSignUp ? i18n.t.login.signUpBtn : i18n.t.login.signInBtn)}
    </button>
  </form>



  <div class="mt-8 text-center text-[11px] text-neutral-500 font-medium">
    {#if isSignUp}
      {i18n.t.login.alreadyHaveAccount}
      <button type="button" class="text-white hover:underline ml-1" onclick={() => isSignUp = false}>{i18n.t.login.signInBtn}</button>
    {:else}
      {i18n.t.login.dontHaveAccount}
      <button type="button" class="text-white hover:underline ml-1" onclick={() => isSignUp = true}>{i18n.t.login.signUpBtn}</button>
    {/if}
  </div>

  <LegalFooter class="mt-8" />

  </div>
</div>
