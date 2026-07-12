<script lang="ts">
  import { i18n } from '$lib/i18n/i18n.svelte';
  import { LogIn, UserPlus } from 'lucide-svelte';

  let {
    id,
    isEditing = false,
    width,
    height,
    showSettings = $bindable(false)
  }: {
    id: string;
    isEditing?: boolean;
    width: number;
    height: number;
    showSettings?: boolean;
  } = $props();
</script>

<div class="flex h-full w-full flex-row gap-3 relative">
  <a href="/login?signup=true" class="flex flex-row flex-1 items-center justify-center gap-3 w-1/2 h-full bg-white/15 hover:bg-white/25 border border-white/20 text-white text-sm font-bold rounded-xl transition-colors pointer-events-auto shadow-lg shadow-black/20 text-center">
    <UserPlus size={16} class="shrink-0" />
    <span>{i18n.t.login.signUpBtn}</span>
  </a>
  <a href="/login" class="flex flex-row flex-1 items-center justify-center gap-3 w-1/2 h-full bg-black/20 hover:bg-black/40 border border-white/5 text-neutral-300 hover:text-white text-sm font-bold rounded-xl transition-colors pointer-events-auto text-center">
    <LogIn size={16} class="shrink-0" />
    <span>{i18n.t.login.signInBtn}</span>
  </a>
</div>
