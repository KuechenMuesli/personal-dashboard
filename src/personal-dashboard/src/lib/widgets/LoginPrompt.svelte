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

<div class="relative flex h-full w-full flex-row gap-3">
  <a href="/login?signup=true" class="ds-btn ds-btn-primary pointer-events-auto h-full w-1/2 flex-1">
    <UserPlus size={16} class="shrink-0" />
    <span>{i18n.t.login.signUpBtn}</span>
  </a>
  <a href="/login" class="ds-btn ds-btn-secondary pointer-events-auto h-full w-1/2 flex-1">
    <LogIn size={16} class="shrink-0" />
    <span>{i18n.t.login.signInBtn}</span>
  </a>
</div>
