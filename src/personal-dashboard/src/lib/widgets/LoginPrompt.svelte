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

<div class="flex h-full w-full flex-col justify-center gap-3 p-4 bg-black/40 border border-neutral-800 rounded-xl overflow-hidden relative">
  <!-- Grid Background -->
  <div class="absolute inset-0 z-0 pointer-events-none opacity-20" style="background-image: radial-gradient(circle at 2px 2px, rgba(255,255,255,0.2) 1px, transparent 0); background-size: 16px 16px;"></div>

  <div class="z-10 relative text-center">
    <div class="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-4">{i18n.t.dashboardSettings.localMode}</div>
    
    <div class="flex flex-col gap-2">
      <a href="/login" class="flex items-center justify-center gap-2 w-full px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors pointer-events-auto shadow-lg shadow-blue-900/20">
        <LogIn size={14} /> {i18n.t.login.signInBtn}
      </a>
      <a href="/login?signup=true" class="flex items-center justify-center gap-2 w-full px-4 py-3 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-lg transition-colors pointer-events-auto">
        <UserPlus size={14} /> {i18n.t.login.signUpBtn}
      </a>
    </div>
  </div>
</div>
