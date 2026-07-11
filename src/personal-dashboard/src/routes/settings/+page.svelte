<script lang="ts">
  import { enhance } from '$app/forms';
  import { fade } from 'svelte/transition';
  import { ArrowLeft } from 'lucide-svelte';
  import { i18n } from '$lib/i18n/i18n.svelte';

  let { data, form } = $props();
  let emailLoading = $state(false);
  let passwordLoading = $state(false);
</script>

<div class="min-h-screen p-8 text-white bg-black font-sans">
  <div class="max-w-2xl mx-auto mt-10">
    
    <div class="mb-8">
      <a href="/" class="inline-flex items-center text-xs font-bold uppercase tracking-widest text-neutral-500 hover:text-white transition-colors mb-6">
        <ArrowLeft size={14} class="mr-2" /> {i18n.t.accountSettings.backToDash}
      </a>
      <h1 class="text-3xl font-bold">{i18n.t.accountSettings.title}</h1>
      <p class="text-neutral-400 mt-2">{i18n.t.accountSettings.desc}</p>
    </div>

    <div class="space-y-8">
      <!-- Email Update Section -->
      <div class="bg-neutral-900 border border-neutral-800 rounded-[24px] p-6 shadow-xl">
        <h2 class="text-lg font-bold mb-1">{i18n.t.accountSettings.changeEmail}</h2>
        <p class="text-xs text-neutral-500 mb-6">{i18n.t.accountSettings.currentEmail.replace('{email}', data.user.email)}</p>

        {#if form?.emailError}
          <div class="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-xl mb-6 font-medium" in:fade>
            {form.emailError}
          </div>
        {/if}
        {#if form?.emailSuccess}
          <div class="bg-green-500/10 border border-green-500/20 text-green-400 text-xs p-3 rounded-xl mb-6 font-medium" in:fade>
            {form.emailSuccess}
          </div>
        {/if}

        <form method="POST" action="?/updateEmail" use:enhance={() => { emailLoading = true; return async ({ update }) => { emailLoading = false; update(); } }} class="space-y-4">
          <div>
            <label for="email" class="block text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-1.5 ml-1">{i18n.t.accountSettings.newEmail}</label>
            <input type="email" id="email" name="email" required placeholder="new@example.com" class="w-full bg-black/20 border border-black/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-neutral-600" />
          </div>
          
          <button type="submit" disabled={emailLoading} class="bg-neutral-700/50 hover:bg-neutral-600/50 border border-black/20 text-white font-bold text-sm py-2 px-6 rounded-xl transition-all disabled:opacity-50 active:scale-[0.98]">
            {emailLoading ? '...' : i18n.t.accountSettings.updateEmailBtn}
          </button>
        </form>
      </div>

      <!-- Password Update Section -->
      <div class="bg-neutral-900 border border-neutral-800 rounded-[24px] p-6 shadow-xl">
        <h2 class="text-lg font-bold mb-1">{i18n.t.accountSettings.changePassword}</h2>
        <p class="text-xs text-neutral-500 mb-6">{i18n.t.accountSettings.passwordDesc}</p>

        {#if form?.passwordError}
          <div class="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-xl mb-6 font-medium" in:fade>
            {form.passwordError}
          </div>
        {/if}
        {#if form?.passwordSuccess}
          <div class="bg-green-500/10 border border-green-500/20 text-green-400 text-xs p-3 rounded-xl mb-6 font-medium" in:fade>
            {form.passwordSuccess}
          </div>
        {/if}

        <form method="POST" action="?/updatePassword" use:enhance={() => { passwordLoading = true; return async ({ update }) => { passwordLoading = false; update(); } }} class="space-y-4">
          <div>
            <label for="password" class="block text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-1.5 ml-1">{i18n.t.accountSettings.newPassword}</label>
            <input type="password" id="password" name="password" required placeholder="••••••••" class="w-full bg-black/20 border border-black/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-neutral-600" />
          </div>
          
          <button type="submit" disabled={passwordLoading} class="bg-neutral-700/50 hover:bg-neutral-600/50 border border-black/20 text-white font-bold text-sm py-2 px-6 rounded-xl transition-all disabled:opacity-50 active:scale-[0.98]">
            {passwordLoading ? '...' : i18n.t.accountSettings.updatePasswordBtn}
          </button>
        </form>
      </div>

      <div class="text-center">
        <form method="POST" action="/logout">
          <button type="submit" class="text-red-400 hover:text-red-300 text-xs font-bold uppercase tracking-widest transition-colors">{i18n.t.accountSettings.signOut}</button>
        </form>
      </div>

    </div>
  </div>
</div>
