<script lang="ts">
    import { onMount } from 'svelte';
    import { renderMarkdown } from '$lib/markdown';
    import { DownloadCloud, Check, X, FileText, Image as ImageIcon, File as FileIcon, Copy, Maximize, Minimize, Link } from 'lucide-svelte';
    import LegalFooter from '$lib/components/LegalFooter.svelte';
    let { data } = $props<{ data: import('./$types').PageData }>();

    let expired = data.expired;
    let content = data.content;
    let url = typeof window !== 'undefined' ? window.location.href : '';
    let qrUrl = content ? `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(url)}&color=ffffff&bgcolor=000000&margin=0` : '';
    
    let timeRemaining = $state("");
    let hljsLoaded = $state(false);
    let codeElement = $state<HTMLElement>();
    let isFullscreen = $state(false);

    $effect(() => {
        if (typeof document !== 'undefined') {
            document.body.className = 'theme-default';
        }
    });

    let isText = $derived.by(() => {
        if (!content) return false;
        const type = content.type.toLowerCase();
        const name = (content.name || '').toLowerCase();
        if (type.startsWith('text/') || type.includes('json') || type.includes('javascript') || type.includes('xml')) return true;
        const textExts = ['.txt', '.js', '.ts', '.py', '.html', '.css', '.json', '.md', '.csv', '.svelte', '.jsx', '.tsx', '.sh', '.yml', '.yaml'];
        if (textExts.some(ext => name.endsWith(ext))) return true;
        return false;
    });

    let isMarkdown = $derived.by(() => {
        if (!content) return false;
        const type = content.type.toLowerCase();
        const name = (content.name || '').toLowerCase();
        return type === 'text/markdown' || name.endsWith('.md');
    });

    let isCode = $derived(isText && !isMarkdown);

    let decodedText = $derived.by(() => {
        if (!content || !isText) return "";
        if (content.data.startsWith('data:')) {
            const parts = content.data.split(',');
            const base64 = parts[1];
            if (base64) {
                try {
                    const binStr = atob(base64);
                    const bytes = new Uint8Array(binStr.length);
                    for (let i = 0; i < binStr.length; i++) {
                        bytes[i] = binStr.charCodeAt(i);
                    }
                    return new TextDecoder().decode(bytes);
                } catch(e) {
                    return "Error decoding text file.";
                }
            }
        }
        return content.data; // Raw text
    });

    let htmlContent = $derived.by(() => {
        if (isMarkdown && decodedText) {
            return renderMarkdown(decodedText);
        }
        return "";
    });

    $effect(() => {
        // Automatically highlight if it's a code block and highlight.js has loaded
        if (isCode && decodedText && hljsLoaded && codeElement && typeof window !== 'undefined' && (window as any).hljs) {
            // Remove any previous highlight classes to force re-highlight if content changes
            codeElement.className = 'text-sm sm:text-base !bg-transparent !p-0';
            // Provide a language hint based on file extension if possible
            const ext = content?.name?.split('.').pop();
            if (ext) codeElement.classList.add(`language-${ext}`);
            (window as any).hljs.highlightElement(codeElement);
        }
    });

    $effect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isFullscreen) {
                isFullscreen = false;
            }
        };
        if (typeof window !== 'undefined') {
            window.addEventListener('keydown', handleEsc);
            return () => window.removeEventListener('keydown', handleEsc);
        }
    });

    function updateCountdown() {
        if (expired || !content) return;
        const diff = content.expiresAt - Date.now();
        if (diff <= 0) {
            timeRemaining = "Expired";
            return;
        }
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        timeRemaining = `${hours}h ${minutes}m remaining`;
    }

    onMount(() => {
        if (!expired && content) {
            updateCountdown();
            const interval = setInterval(updateCountdown, 60000);
            
            // Load highlight.js dynamically
            if (!document.getElementById('hljs-script')) {
                const script = document.createElement('script');
                script.id = 'hljs-script';
                script.src = "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js";
                script.onload = () => { hljsLoaded = true; };
                document.head.appendChild(script);

                const link = document.createElement('link');
                link.rel = "stylesheet";
                link.href = "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark.min.css";
                document.head.appendChild(link);
            } else {
                if ((window as any).hljs) hljsLoaded = true;
            }

            return () => clearInterval(interval);
        }
    });

    let downloadStatus = $state('idle');
    let copyStatus = $state('idle');
    let linkStatus = $state('idle');

    async function triggerDownload(dataUrl: string, name: string) {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const bUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = bUrl;
        a.download = name || 'download';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(bUrl), 100);
    }

    async function copyAction() {
        if (!content) return;
        copyStatus = 'idle';
        try {
            if (isText) {
                await navigator.clipboard.writeText(decodedText);
            } else if (content.type.startsWith('image/') && navigator.clipboard.write) {
                const convertPromise = new Promise<Blob>((resolve, reject) => {
                    const img = new Image();
                    img.crossOrigin = 'anonymous';
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        canvas.width = img.width;
                        canvas.height = img.height;
                        const ctx = canvas.getContext('2d');
                        if (ctx) ctx.drawImage(img, 0, 0);
                        canvas.toBlob((blob) => {
                            if (blob) resolve(blob);
                            else reject(new Error('Canvas toBlob failed'));
                        }, 'image/png');
                    };
                    img.onerror = reject;
                    img.src = content.data;
                });
                await navigator.clipboard.write([
                    new ClipboardItem({ 'image/png': convertPromise })
                ]);
            }
            copyStatus = 'success';
            setTimeout(() => copyStatus = 'idle', 3000);
        } catch (e) {
            console.error(e);
            copyStatus = 'error';
            setTimeout(() => copyStatus = 'idle', 3000);
        }
    }

    async function downloadAction() {
        if (!content) return;
        downloadStatus = 'idle';
        try {
            await triggerDownload(content.data, content.name);
            downloadStatus = 'success';
            setTimeout(() => downloadStatus = 'idle', 3000);
        } catch (e) {
            console.error(e);
            downloadStatus = 'error';
            setTimeout(() => downloadStatus = 'idle', 3000);
        }
    }

    async function copyLinkAction() {
        linkStatus = 'idle';
        try {
            await navigator.clipboard.writeText(url);
            linkStatus = 'success';
            setTimeout(() => linkStatus = 'idle', 3000);
        } catch (e) {
            console.error(e);
            linkStatus = 'error';
            setTimeout(() => linkStatus = 'idle', 3000);
        }
    }
</script>

<div class="flex h-[100dvh] w-full flex-col overflow-hidden bg-app text-secondary">
    
    <header class="z-10 flex shrink-0 items-center justify-between border-b border-line bg-surface/50 px-4 py-4 backdrop-blur-xl sm:px-8">
        <div class="flex items-center gap-3">
            <span class="text-lg font-semibold tracking-tight text-primary">Personal Dashboard</span>
            <span class="ds-label hidden rounded-full border border-line bg-fill px-2.5 py-1 sm:inline-block">Quickshare</span>
        </div>
        {#if !expired}
        <a href="/" class="ds-btn ds-btn-primary px-4 sm:px-5">
            Create your own <span class="hidden sm:inline">&rarr;</span>
        </a>
        {/if}
    </header>

    <div class="flex-grow {isFullscreen ? 'p-0' : 'p-4 sm:p-8'} flex items-center justify-center overflow-hidden min-h-0 relative z-0 transition-all duration-300">
        {#if expired}
        <div class="ds-panel flex w-full max-w-md flex-col items-center p-8 text-center">
            <div class="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl border border-line bg-fill">
                <X size={40} class="text-muted" strokeWidth={2} />
            </div>
            <h1 class="mb-3 text-2xl font-semibold text-primary">Snippet Expired</h1>
            <p class="mb-8 text-sm leading-relaxed text-secondary">
                This content is no longer available. It may have expired or the host has updated their clipboard.
            </p>
            
            <a href="/" class="ds-btn ds-btn-primary w-full rounded-2xl py-4 text-lg">
                Create your own Dashboard &rarr;
            </a>
        </div>
        {:else}
        <div class="{isFullscreen ? 'w-full h-full' : 'max-w-5xl w-full h-full max-h-[850px]'} flex flex-col md:flex-row gap-4 sm:gap-6 transition-all duration-300">
        
        <div class="{isFullscreen ? 'flex-1 rounded-none border-none bg-surface' : 'ds-card h-32 flex-none md:h-auto md:flex-1'} overflow-hidden flex flex-col min-h-0 shadow-2xl transition-all duration-300">
           <div class="flex h-14 shrink-0 items-center gap-3 border-b border-line bg-fill px-4 sm:px-6">
               {#if content.type.startsWith('image/')}
                   <ImageIcon size={18} class="shrink-0 text-muted" />
               {:else if isText}
                   <FileText size={18} class="shrink-0 text-muted" />
               {:else}
                   <FileIcon size={18} class="shrink-0 text-muted" />
               {/if}
               <span class="flex-grow truncate text-sm font-medium text-secondary">{content.name || 'Shared Snippet'}</span>
               
               {#if content.type.startsWith('image/') || isText || isMarkdown}
               <button 
                   onclick={() => isFullscreen = !isFullscreen}
                   class="ds-icon-btn -mr-2 p-2 {isFullscreen ? 'flex' : 'hidden md:flex'}"
                   title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
               >
                   {#if isFullscreen}
                       <Minimize size={18} />
                   {:else}
                       <Maximize size={18} />
                   {/if}
               </button>
               {/if}
           </div>
           
           <div class="flex-grow p-0 flex items-center justify-center bg-transparent overflow-hidden relative transition-all duration-300">
               {#if !isFullscreen && (content.type.startsWith('image/') || isText || isMarkdown)}
               <button 
                   onclick={() => isFullscreen = true}
                   class="flex h-full w-full flex-row items-center justify-center gap-3 transition-all hover:bg-fill md:hidden"
               >
                   <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line bg-fill-strong">
                       <Maximize size={18} class="text-primary" />
                   </div>
                   <span class="text-sm font-semibold tracking-wide text-secondary">Show Content</span>
               </button>
               {/if}

               <div class="w-full h-full {isFullscreen || !(content.type.startsWith('image/') || isText || isMarkdown) ? 'flex' : 'hidden md:flex'} justify-center items-center overflow-hidden">
                   {#if content.type.startsWith('image/')}
                       <img src={content.data} alt="Shared Image" class="w-full h-full object-contain drop-shadow-md rounded-xl" />
                   {:else if isMarkdown}
                       <div class="w-full h-full overflow-y-auto text-left bg-transparent rounded-xl p-4 sm:p-8 prose prose-invert max-w-none">
                           {@html htmlContent}
                       </div>
                   {:else if isText}
                       <div class="w-full h-full overflow-y-auto text-left bg-transparent rounded-xl p-4 sm:p-6">
                           <pre class="m-0 bg-transparent"><code bind:this={codeElement} class="text-sm sm:text-base !bg-transparent !p-0 block whitespace-pre-wrap break-words">{decodedText}</code></pre>
                       </div>
                   {:else}
                       <div class="flex flex-row sm:flex-col items-center justify-center gap-3 sm:gap-4 text-left sm:text-center w-full h-full">
                           <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line bg-fill text-muted sm:h-20 sm:w-20 sm:rounded-2xl">
                               <FileIcon class="w-5 h-5 sm:w-10 sm:h-10" />
                           </div>
                           <div class="flex flex-col">
                               <span class="mb-0.5 block max-w-[200px] truncate text-sm font-semibold text-primary sm:mb-1 sm:text-lg">{content.name}</span>
                               <span class="ds-label text-muted">{content.type}</span>
                           </div>
                       </div>
                   {/if}
               </div>
           </div>
        </div>

        {#if !isFullscreen}
        <div class="w-full md:w-80 shrink-0 flex flex-col gap-3 sm:gap-6 min-h-0">
            <div class="ds-card ds-scroll flex min-h-0 flex-grow flex-col items-center justify-center gap-3 overflow-y-auto p-4 sm:gap-6 sm:p-8">
                <div class="flex shrink-0 items-center justify-center rounded-3xl border border-line bg-fill p-3 sm:rounded-[2rem] sm:p-5">
                    <img src={qrUrl} alt="QR Code" class="w-24 h-24 sm:w-40 sm:h-40 object-contain opacity-90 mix-blend-screen" />
                </div>
                
                <div class="text-center gap-2 sm:gap-3 w-full shrink-0 flex flex-col items-center">
                    <div class="flex flex-col items-center">
                        <h2 class="hidden text-xl font-semibold text-primary sm:block">Quickshare</h2>
                        <p class="ds-well inline-block px-3 py-1 text-xs font-medium text-muted sm:mt-1.5 sm:py-1.5 sm:text-sm">{timeRemaining}</p>
                    </div>
                    
                    <button 
                        onclick={copyLinkAction}
                        disabled={linkStatus === 'success'}
                        class="ds-btn ds-btn-secondary text-xs"
                    >
                        {#if linkStatus === 'success'}
                            <Check size={14} strokeWidth={3} /> Link Copied
                        {:else}
                            <Link size={14} strokeWidth={2.5} /> Copy Link
                        {/if}
                    </button>
                </div>
            </div>

            {#if !content.data.startsWith('data:')}
                <!-- Raw text snippet -->
                <div class="w-full shrink-0 flex flex-col gap-3">
                    <button 
                        onclick={copyAction}
                        disabled={copyStatus === 'success'}
                        class="ds-btn ds-btn-primary w-full shrink-0 rounded-2xl p-3.5 sm:rounded-[1.5rem] sm:p-4 sm:text-base"
                    >
                        {#if copyStatus === 'success'}
                            <Check size={20} strokeWidth={3} /> Success
                        {:else if copyStatus === 'error'}
                            <X size={20} strokeWidth={3} /> Error
                        {:else}
                            <Copy size={20} strokeWidth={2.5} /> Copy Content
                        {/if}
                    </button>
                </div>
            {:else}
                <!-- Actual File -->
                <div class="w-full shrink-0 flex flex-col gap-3">
                    {#if isText || content.type.startsWith('image/')}
                        <button 
                            onclick={copyAction}
                            disabled={copyStatus === 'success'}
                            class="ds-btn ds-btn-secondary w-full rounded-2xl p-3.5 sm:rounded-[1.5rem] sm:p-4 sm:text-base"
                        >
                            {#if copyStatus === 'success'}
                                <Check size={20} strokeWidth={3} /> Copied
                            {:else}
                                <Copy size={20} strokeWidth={2.5} /> {content.type.startsWith('image/') ? 'Copy Image' : 'Copy Text'}
                            {/if}
                        </button>
                    {/if}
                    <button 
                        onclick={downloadAction}
                        disabled={downloadStatus === 'success'}
                        class="ds-btn ds-btn-primary w-full rounded-2xl p-3.5 sm:rounded-[1.5rem] sm:p-4 sm:text-base"
                    >
                        {#if downloadStatus === 'success'}
                            <Check size={20} strokeWidth={3} /> Downloaded
                        {:else}
                            <DownloadCloud size={20} strokeWidth={2.5} /> Download File
                        {/if}
                    </button>
                </div>
            {/if}
        </div>
        {/if}
        </div>
        {/if}
    </div>

    <div class="flex shrink-0 items-center justify-center border-t border-line bg-fill px-6 py-4">
        <LegalFooter />
    </div>
</div>
