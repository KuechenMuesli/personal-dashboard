<script lang="ts">
    import { onMount } from 'svelte';
    import { marked } from 'marked';
    import { DownloadCloud, Check, X, FileText, Image as ImageIcon, File as FileIcon, Copy, Maximize, Minimize } from 'lucide-svelte';
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
            return marked.parse(decodedText);
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
        downloadStatus = 'idle';
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
            downloadStatus = 'success';
            setTimeout(() => downloadStatus = 'idle', 3000);
        } catch (e) {
            console.error(e);
            downloadStatus = 'error';
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
        }
    }
</script>

<div class="h-[100dvh] w-full bg-[#0a0a0a] text-neutral-300 font-sans flex flex-col overflow-hidden">
    
    <header class="shrink-0 border-b border-white/10 bg-neutral-900/50 backdrop-blur-xl flex items-center justify-between px-4 sm:px-8 py-4 z-10 shadow-lg">
        <div class="flex items-center gap-3">
            <span class="font-black text-white text-lg tracking-tight">Personal Dashboard</span>
            <span class="hidden sm:inline-block px-2.5 py-1 bg-white/10 text-neutral-300 text-[10px] font-bold rounded-full uppercase tracking-widest border border-white/5">Quickshare</span>
        </div>
        {#if !expired}
        <a href="/" class="px-4 sm:px-5 py-2 bg-white text-black text-sm font-bold rounded-xl hover:bg-neutral-200 hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.15)] flex items-center gap-2">
            Create your own <span class="hidden sm:inline">&rarr;</span>
        </a>
        {/if}
    </header>

    <div class="flex-grow {isFullscreen ? 'p-0' : 'p-4 sm:p-8'} flex items-center justify-center overflow-hidden min-h-0 relative z-0 transition-all duration-300">
        {#if expired}
        <div class="max-w-md w-full bg-neutral-900/80 border border-white/10 rounded-[2rem] p-8 flex flex-col items-center text-center shadow-2xl">
            <div class="w-20 h-20 bg-neutral-800 rounded-3xl flex items-center justify-center mb-6 border border-white/5 shadow-inner">
                <X size={40} class="text-neutral-500" strokeWidth={2} />
            </div>
            <h1 class="text-2xl font-bold text-white mb-3">Snippet Expired</h1>
            <p class="text-neutral-400 mb-8 leading-relaxed text-sm">
                This content is no longer available. It may have expired or the host has updated their clipboard.
            </p>
            
            <a href="/" class="w-full bg-white text-black font-bold text-lg rounded-2xl py-4 hover:bg-neutral-200 transition-colors shadow-xl">
                Create your own Dashboard &rarr;
            </a>
        </div>
        {:else}
        <div class="{isFullscreen ? 'w-full h-full' : 'max-w-5xl w-full h-full max-h-[850px]'} flex flex-col md:flex-row gap-4 sm:gap-6 transition-all duration-300">
        
        <div class="flex-grow {isFullscreen ? 'bg-[#0a0a0a] rounded-none border-none' : 'bg-neutral-900/80 border border-white/10 rounded-[2rem]'} overflow-hidden flex flex-col min-h-0 shadow-2xl transition-all duration-300">
           <div class="h-14 border-b border-white/5 bg-black/20 flex items-center px-4 sm:px-6 gap-3 shrink-0">
               {#if content.type.startsWith('image/')}
                   <ImageIcon size={18} class="text-neutral-500 shrink-0" />
               {:else if isText}
                   <FileText size={18} class="text-neutral-500 shrink-0" />
               {:else}
                   <FileIcon size={18} class="text-neutral-500 shrink-0" />
               {/if}
               <span class="flex-grow text-sm font-medium text-neutral-300 truncate">{content.name || 'Shared Snippet'}</span>
               
               {#if content.type.startsWith('image/') || isText || isMarkdown}
               <button 
                   onclick={() => isFullscreen = !isFullscreen}
                   class="p-2 -mr-2 hover:bg-white/10 rounded-lg text-neutral-400 hover:text-white transition-colors shrink-0 flex items-center justify-center"
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
           
           <div class="flex-grow {isFullscreen ? 'p-4 sm:p-10' : 'p-4 sm:p-6'} flex items-center justify-center bg-black/20 overflow-hidden relative transition-all duration-300">
               {#if content.type.startsWith('image/')}
                   <img src={content.data} alt="Shared Image" class="w-full h-full object-contain drop-shadow-md rounded-xl" />
               {:else if isMarkdown}
                   <div class="w-full h-full overflow-y-auto text-left bg-black/40 border border-white/5 rounded-xl p-4 sm:p-8 prose prose-invert max-w-none">
                       {@html htmlContent}
                   </div>
               {:else if isText}
                   <div class="w-full h-full overflow-y-auto text-left bg-black/40 border border-white/5 rounded-xl p-4 sm:p-6">
                       <pre class="m-0 bg-transparent"><code bind:this={codeElement} class="text-sm sm:text-base !bg-transparent !p-0 block whitespace-pre-wrap break-words">{decodedText}</code></pre>
                   </div>
               {:else}
                   <div class="flex flex-col items-center gap-4 text-center">
                       <div class="w-20 h-20 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-neutral-500">
                           <FileIcon size={40} />
                       </div>
                       <div>
                           <span class="block text-lg font-bold text-white mb-1">{content.name}</span>
                           <span class="text-xs text-neutral-500 uppercase tracking-widest">{content.type}</span>
                       </div>
                   </div>
               {/if}
           </div>
        </div>

        {#if !isFullscreen}
        <div class="w-full md:w-80 shrink-0 flex flex-col gap-4 sm:gap-6 min-h-0">
            <div class="flex-grow bg-neutral-900/80 border border-white/10 rounded-[2rem] p-6 sm:p-8 flex flex-col items-center justify-center gap-6 shadow-2xl min-h-0 overflow-y-auto">
                <div class="p-4 sm:p-5 bg-black/40 rounded-[2rem] border border-white/5 shadow-inner shrink-0 flex items-center justify-center">
                    <img src={qrUrl} alt="QR Code" class="w-32 h-32 sm:w-40 sm:h-40 object-contain opacity-90 mix-blend-screen" />
                </div>
                
                <div class="text-center space-y-1.5 w-full shrink-0">
                    <h2 class="text-xl font-bold text-white">Quickshare</h2>
                    <p class="text-sm font-medium text-neutral-500 bg-black/20 py-2 rounded-xl border border-white/5">{timeRemaining}</p>
                </div>
            </div>

            {#if !content.data.startsWith('data:')}
                <!-- Raw text snippet -->
                <button 
                    onclick={copyAction}
                    disabled={downloadStatus === 'success'}
                    class="w-full shrink-0 bg-white text-black hover:bg-neutral-200 active:bg-neutral-300 transition-colors font-bold text-sm sm:text-base rounded-2xl sm:rounded-[1.5rem] p-3.5 sm:p-4 flex items-center justify-center gap-2 sm:gap-3 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl"
                >
                    {#if downloadStatus === 'success'}
                        <Check size={20} strokeWidth={3} /> Success
                    {:else if downloadStatus === 'error'}
                        <X size={20} strokeWidth={3} /> Error
                    {:else}
                        <Copy size={20} strokeWidth={2.5} /> Copy Content
                    {/if}
                </button>
            {:else}
                <!-- Actual File -->
                <div class="w-full shrink-0 flex flex-col gap-3">
                    {#if isText || content.type.startsWith('image/')}
                        <button 
                            onclick={copyAction}
                            disabled={downloadStatus === 'success'}
                            class="w-full bg-white/10 text-white hover:bg-white/20 active:bg-white/30 border border-white/10 transition-colors font-bold text-sm sm:text-base rounded-2xl sm:rounded-[1.5rem] p-3.5 sm:p-4 flex items-center justify-center gap-2 sm:gap-3 disabled:opacity-50 shadow-xl"
                        >
                            {#if downloadStatus === 'success'}
                                <Check size={20} strokeWidth={3} /> Copied
                            {:else}
                                <Copy size={20} strokeWidth={2.5} /> {content.type.startsWith('image/') ? 'Copy Image' : 'Copy Text'}
                            {/if}
                        </button>
                    {/if}
                    <button 
                        onclick={downloadAction}
                        disabled={downloadStatus === 'success'}
                        class="w-full bg-white text-black hover:bg-neutral-200 active:bg-neutral-300 transition-colors font-bold text-sm sm:text-base rounded-2xl sm:rounded-[1.5rem] p-3.5 sm:p-4 flex items-center justify-center gap-2 sm:gap-3 disabled:opacity-50 shadow-xl"
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

    <div class="shrink-0 flex items-center justify-center py-4 px-6 border-t border-white/5 bg-black/40">
        <LegalFooter />
    </div>
</div>
