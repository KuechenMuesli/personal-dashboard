<script lang="ts">
  import { enhance } from '$app/forms';
  import { fade } from 'svelte/transition';
  import { i18n } from '$lib/i18n/i18n.svelte';
  import LegalFooter from '$lib/components/LegalFooter.svelte';
  
  let { form, data } = $props();
  import { page } from '$app/stores';
  let loading = $state(false);
  let isSignUp = $state($page.url.searchParams.has('signup'));
  
  async function signInWithGithub() {
    loading = true;
    const { error } = await data.supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });
    if (error) {
      console.error(error);
      loading = false;
    }
  }

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

    <button type="button" disabled={loading} onclick={signInWithGithub} class="w-full flex items-center justify-center gap-2 bg-black/20 hover:bg-black/40 border border-white/5 text-neutral-300 hover:text-white font-bold text-sm py-3 rounded-xl mb-6 transition-all disabled:opacity-50 active:scale-[0.98]">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>
      {isSignUp ? 'Sign up with GitHub' : 'Sign in with GitHub'}
    </button>

    <div class="flex items-center gap-3 mb-6">
      <div class="flex-1 h-px bg-black/40"></div>
      <div class="text-[10px] font-black uppercase tracking-widest text-neutral-500">OR</div>
      <div class="flex-1 h-px bg-black/40"></div>
    </div>

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
    
    <button type="submit" disabled={loading} class="w-full bg-white/15 hover:bg-white/25 border border-white/20 text-white font-bold text-sm py-3 rounded-xl mt-6 transition-all disabled:opacity-50 active:scale-[0.98] shadow-lg shadow-black/20">
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
