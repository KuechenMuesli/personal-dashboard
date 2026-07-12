<script lang="ts">
  import { getContext } from 'svelte';
  import { page } from '$app/stores';
  import { i18n } from '$lib/i18n/i18n.svelte';
  import { Clipboard, X, GripHorizontal, ClipboardPaste, DownloadCloud, File as FileIcon, Image as ImageIcon, FileText, Check, Share2, FilePlus } from 'lucide-svelte';
  import WidgetCard from '$lib/components/WidgetCard.svelte';

  let { id, onDragStart, onResizeStart, onDelete, isEditing = false, width = 2, height = 3 } = $props<{
    id: string,
    onDragStart?: (e: MouseEvent | TouchEvent) => void,
    onResizeStart?: (e: MouseEvent | TouchEvent) => void,
    onDelete?: () => void,
    isEditing?: boolean,
    width?: number,
    height?: number
  }>();

  const getSecrets = getContext<() => Record<string, any>>('secrets');
  const getSecretsLoaded = getContext<() => boolean>('secretsLoaded');

  const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB configurable limit
  const EXPIRY_TIME_MS = 24 * 60 * 60 * 1000; // 24 hours

  let cloudContent = $state<{ data: string, type: string, name?: string, timestamp: number } | null>(null);
  let isLoaded = $state(false);
  let isDragging = $state(false);
  let dragCounter = $state(0);
  let isUploading = $state(false);
  let statusMessage = $state("");
  let timeRemaining = $state("");
  let isSharing = $state(false);
  let shareLink = $state("");
  let fileInput: HTMLInputElement;

  $effect(() => {
    const secrets = getSecrets();
    const secretsLoaded = getSecretsLoaded ? getSecretsLoaded() : true;
    
    if (secretsLoaded && !isLoaded) {
      if (secrets[id] && secrets[id].clipboard) {
        const item = secrets[id].clipboard;
        if (Date.now() - item.timestamp < EXPIRY_TIME_MS) {
            cloudContent = item;
        }
      }
      isLoaded = true;
    }
  });

  $effect(() => {
    if (cloudContent && cloudContent.timestamp) {
       shareLink = ""; // Reset share link when content changes
       const update = () => {
         const diff = cloudContent.timestamp + EXPIRY_TIME_MS - Date.now();
         if (diff <= 0) {
            timeRemaining = i18n.t.w.clipboardSync?.expired || "Expired";
         } else {
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            timeRemaining = (i18n.t.w.clipboardSync?.expiresIn || "Expires in {h}h {m}m")
                 .replace('{h}', hours.toString())
                 .replace('{m}', minutes.toString());
         }
       };
       update();
       const int = setInterval(update, 60000);
       return () => clearInterval(int);
    } else {
       timeRemaining = "";
    }
  });

  async function generateShareLink(e: MouseEvent) {
    e.stopPropagation();
    if (!cloudContent || isSharing) return;
    
    if (!$page.data.session) {
        alert("You must be logged in to create Quickshare links.");
        return;
    }
    
    if (shareLink) {
        window.open(shareLink, '_blank');
        return;
    }

    isSharing = true;
    
    const newTab = window.open('', '_blank');
    if (newTab) {
        newTab.document.body.innerHTML = `<div style="background:#0a0a0a;height:100vh;display:flex;align-items:center;justify-content:center;color:#fff;font-family:system-ui,sans-serif;">Generiere Link...</div>`;
    }

    try {
        const res = await fetch('/api/share', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...cloudContent, serviceId: id })
        });
        const data = await res.json();
        if (data.id) {
            shareLink = window.location.origin + '/s/' + data.id;
            if (newTab) {
                newTab.location.href = shareLink;
            } else {
                window.location.href = shareLink;
            }
        } else {
            if (newTab) newTab.close();
        }
    } catch (e) {
        console.error(e);
        if (newTab) newTab.close();
    } finally {
        isSharing = false;
    }
  }

  $effect(() => {
    const handleGlobalKeydown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName || '')) return;
      
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        e.stopPropagation();
      }
    };

    const handleGlobalPaste = async (e: ClipboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName || '')) return;
      
      e.preventDefault();
      e.stopImmediatePropagation();
      
      await handlePaste(e);
    };
    
    window.addEventListener('keydown', handleGlobalKeydown, true);
    window.addEventListener('paste', handleGlobalPaste);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeydown, true);
      window.removeEventListener('paste', handleGlobalPaste);
    };
  });

  let uploadStatus = $state<'idle' | 'success' | 'error'>('idle');
  let downloadStatus = $state<'idle' | 'success' | 'error'>('idle');
  let debugInfo = $state("");

  function setUploadStatus(status: 'success' | 'error', debugStr?: string) {
    uploadStatus = status;
    if (debugStr) debugInfo = debugStr;
    setTimeout(() => { uploadStatus = 'idle'; debugInfo = ""; }, 3000);
  }

  function setDownloadStatus(status: 'success' | 'error') {
    downloadStatus = status;
    setTimeout(() => { downloadStatus = 'idle'; }, 3000);
  }

  async function saveToCloud(data: string, type: string, name?: string) {
    if (!$page.data.session) {
      setUploadStatus('error', 'Login required');
      return;
    }
    isUploading = true;
    const item = { data, type, name, timestamp: Date.now() };
    try {
      await fetch('/api/secrets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service: id, key: { clipboard: item } })
      });
      cloudContent = item;
      setUploadStatus('success');
    } catch (e) {
      setUploadStatus('error', 'Network error');
    }
    isUploading = false;
  }

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function compressImage(file: File, maxMb: number = 2): Promise<File> {
    if (!file.type.startsWith('image/')) return file;
    if (file.size < maxMb * 1024 * 1024) return file;

    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 1920;
        
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", { type: 'image/jpeg' }));
          } else {
            resolve(file);
          }
        }, 'image/jpeg', 0.8);
      };
      img.onerror = () => resolve(file);
      img.src = url;
    });
  }

  async function handleFileUpload(rawFile: File) {
    let file = rawFile;
    if (file.type.startsWith('image/')) {
      file = await compressImage(file, 2);
    }

    if (file.size > MAX_SIZE_BYTES) {
      setUploadStatus('error', 'Too large');
      return;
    }
    if (!$page.data.session) {
      setUploadStatus('error', 'Login required');
      return;
    }
    try {
      const b64 = await fileToBase64(file);
      await saveToCloud(b64, file.type || 'application/octet-stream', file.name);
    } catch (e) {
      setUploadStatus('error', 'Read error');
    }
  }

  async function uploadFromClipboard() {
    try {
      let handled = false;
      
      if (navigator.clipboard.read) {
        try {
          const clipboardItems = await navigator.clipboard.read();
          for (const item of clipboardItems) {
            const types = Array.from(item.types);
            const imageType = types.find(t => t.startsWith('image/') || t.includes('png') || t.includes('jpeg'));
            if (imageType) {
              const blob = await item.getType(imageType);
              const ext = imageType.split('/')[1] || 'png';
              const file = new File([blob], `clipboard_image.${ext}`, { type: blob.type });
              await handleFileUpload(file);
              handled = true;
              break;
            }
          }
        } catch (e: any) {
          console.error("Clipboard read error:", e);
        }
      }

      if (!handled && navigator.clipboard.readText) {
          try {
              const text = await navigator.clipboard.readText();
              if (text && text.trim().length > 0) {
                  if (text.length > MAX_SIZE_BYTES) {
                      setUploadStatus('error', 'Too long');
                      return;
                  }
                  await saveToCloud(text, 'text/plain', 'Pasted Text');
                  handled = true;
              }
          } catch(e) {
              console.error("Clipboard readText error:", e);
          }
      }

      if (!handled) {
        // Logic refactored to rely on global paste listener
        setUploadStatus('error', i18n.currentLang === 'de' ? 'Drücke Cmd+V' : 'Press Cmd+V');
      }
    } catch (err) {
      console.error(err);
      if (!$page.data.session) {
        setUploadStatus('error', 'Login required');
      } else {
        setUploadStatus('error', 'No permission');
      }
    }
  }

  async function triggerDownload(dataUrl: string, name: string) {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name || 'download';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }

  async function downloadToClipboard() {
    if (!cloudContent) return;
    try {
      if (cloudContent.type === 'text/plain') {
        await navigator.clipboard.writeText(cloudContent.data);
      } else if (cloudContent.type.startsWith('image/')) {
        if (navigator.clipboard.write) {
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
            img.src = cloudContent.data;
          });

          try {
            await navigator.clipboard.write([
              new ClipboardItem({ 'image/png': convertPromise })
            ]);
          } catch (writeErr) {
            console.error("Clipboard write failed:", writeErr);
            await triggerDownload(cloudContent.data, cloudContent.name || 'download');
          }
        } else {
          await triggerDownload(cloudContent.data, cloudContent.name || 'download');
        }
      } else {
        // Not text, not image. Browsers don't support arbitrary files in clipboard.
        await triggerDownload(cloudContent.data, cloudContent.name || 'download');
      }
      setDownloadStatus('success');
    } catch (err) {
      console.error(err);
      setDownloadStatus('error');
    }
  }

  function handleDragEnter(e: DragEvent) {
    e.preventDefault();
    dragCounter++;
    isDragging = true;
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
  }

  function handleDragLeave(e: DragEvent) {
    dragCounter--;
    if (dragCounter === 0) {
      isDragging = false;
    }
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    dragCounter = 0;
    isDragging = false;
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    } else if (e.dataTransfer?.items) {
       e.dataTransfer.items[0].getAsString((str) => {
         if (str) {
           saveToCloud(str, 'text/plain', 'Dropped Text');
         }
       });
    }
  }

  async function handlePaste(e: ClipboardEvent) {
    if (!e.clipboardData) return;
    
    // Prefer actual files if pasted from OS file explorer
    if (e.clipboardData.files && e.clipboardData.files.length > 0) {
        await handleFileUpload(e.clipboardData.files[0]);
        return;
    }

    const items = Array.from(e.clipboardData.items);
    let handled = false;
    for (const item of items) {
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) {
          await handleFileUpload(file);
          handled = true;
          break;
        }
      }
    }
    if (!handled) {
      const text = e.clipboardData.getData('text');
      if (text) {
         if (text.length > MAX_SIZE_BYTES) {
            setUploadStatus('error', 'Too long');
            return;
         }
         await saveToCloud(text, 'text/plain', 'Pasted Text');
      }
    }
  }
</script>

<WidgetCard isConfigured={true} padding={false}>
  <div class="flex h-full w-full flex-col font-sans relative {isDragging ? 'bg-blue-500/10' : ''} outline-none"
       tabindex="-1"
       ondragenter={handleDragEnter}
       ondragover={handleDragOver}
       ondragleave={handleDragLeave}
       ondrop={handleDrop}
       onpaste={handlePaste}
       role="application"
  >
    {#if isEditing}
    <div class="flex h-8 shrink-0 items-center justify-between border-b border-black/20 bg-black/10 px-2">
      <span class="text-[10px] font-bold uppercase tracking-widest text-neutral-500 flex items-center gap-1.5 px-1">
        <Clipboard size={12} /> {i18n.t.widgets?.clipboardSync || 'Cloud Clipboard'}
      </span>

      <div
          onmousedown={onDragStart}
          ontouchstart={onDragStart}
          role="presentation"
          class="flex h-full flex-grow cursor-grab touch-none items-center justify-center text-neutral-600 transition-colors hover:text-neutral-400 active:cursor-grabbing"
      >
        <GripHorizontal size={14} strokeWidth={2.5} />
      </div>

      <button
          onclick={onDelete}
          class="flex h-5 w-5 shrink-0 items-center justify-center rounded text-neutral-500 transition-colors hover:bg-red-500/20 hover:text-red-400"
      >
        <X size={14} strokeWidth={2.5} />
      </button>
    </div>
    {/if}

    <div class="flex flex-col flex-grow w-full relative overflow-hidden">
        <div class="w-full flex-grow flex {width === 1 && height > 1 ? 'flex-col' : 'flex-row'} min-h-0">
            <!-- Hidden file input for manual file selection -->
            <input type="file" class="hidden" bind:this={fileInput} onchange={(e) => {
                if (e.currentTarget.files && e.currentTarget.files.length > 0) {
                    handleFileUpload(e.currentTarget.files[0]);
                }
            }} />

            <!-- LEFT HALF: UPLOAD -->
            <div class="flex-1 relative group {width === 1 && height > 1 ? 'border-b' : 'border-r'} border-white/5 min-h-0 min-w-0">
                <!-- Main Upload Button -->
                <button 
                    onclick={uploadFromClipboard}
                    disabled={isUploading}
                    class="w-full h-full flex flex-col items-center justify-center transition-all disabled:opacity-50 {isDragging ? 'pointer-events-none' : ''} 
                           {uploadStatus === 'success' ? 'bg-green-500/20 text-green-300' : 
                            uploadStatus === 'error' ? 'bg-red-500/20 text-red-300' : 
                            'bg-transparent hover:bg-white/5 text-neutral-300'} overflow-hidden"
                    title={i18n.t.w.clipboardSync?.uploadLocal || 'Upload Local Clipboard'}
                >
                    <div class="flex flex-col items-center justify-center gap-1.5 p-2 w-full h-full">
                        {#if uploadStatus === 'success'}
                            <Check size={width === 1 || height === 1 ? 18 : 24} class="shrink-0 text-green-400" />
                        {:else if uploadStatus === 'error'}
                            <X size={width === 1 || height === 1 ? 18 : 24} class="shrink-0 text-red-400" />
                        {:else}
                            <ClipboardPaste size={width === 1 || height === 1 ? 18 : 24} class="shrink-0 text-blue-400" />
                        {/if}

                        {#if height > 1 && width > 1}
                        <span class="text-[11px] font-bold text-center px-1 shrink-0">
                           {uploadStatus === 'success' ? (i18n.t.w.clipboardSync?.success || 'Success') : 
                            uploadStatus === 'error' ? (debugInfo || i18n.t.w.clipboardSync?.error || 'Error') : 
                            (i18n.t.w.clipboardSync?.upload || 'Upload')}
                        </span>
                        {/if}
                    </div>
                </button>

                <!-- File picker button overlay -->
                <button 
                    onclick={(e) => { e.stopPropagation(); fileInput.click(); }}
                    class="absolute {height === 1 ? 'top-1/2 -translate-y-1/2 left-1.5' : (width === 1 && height > 1 ? 'top-1 right-1 sm:top-2 sm:right-2' : 'top-1 left-1 sm:top-2 sm:left-2')} p-1.5 rounded-lg bg-neutral-800 border border-neutral-700 text-neutral-400 hover:text-white hover:bg-neutral-700 transition-colors opacity-0 group-hover:opacity-100 z-10 shadow-lg"
                    title={i18n.currentLang === 'de' ? 'Datei auswählen' : 'Select file'}
                >
                    <FilePlus size={14} />
                </button>
            </div>

            <!-- RIGHT HALF: DOWNLOAD -->
            <div class="flex-1 relative group min-h-0 min-w-0">
                <!-- Main Download Button -->
                <button 
                    onclick={downloadToClipboard}
                    disabled={!cloudContent || isUploading}
                    class="w-full h-full flex flex-col items-center justify-center transition-all disabled:opacity-50 {isDragging ? 'pointer-events-none' : ''}
                           {downloadStatus === 'success' ? 'bg-green-500/20 text-green-300' : 
                            downloadStatus === 'error' ? 'bg-red-500/20 text-red-300' : 
                            'bg-transparent hover:bg-white/5 text-neutral-300'} overflow-hidden"
                    title={i18n.t.w.clipboardSync?.copyCloud || 'Copy from Cloud'}
                >
                    <div class="flex flex-col items-center justify-center gap-1.5 p-2 w-full h-full overflow-hidden">
                        {#if downloadStatus === 'success'}
                            <Check size={width === 1 || height === 1 ? 18 : 24} class="shrink-0 text-green-400" />
                        {:else if downloadStatus === 'error'}
                            <X size={width === 1 || height === 1 ? 18 : 24} class="shrink-0 text-red-400" />
                        {:else if cloudContent}
                            {#if cloudContent.type === 'text/plain'}
                               <FileText size={width === 1 || height === 1 ? 18 : 24} class="text-green-400 shrink-0" />
                            {:else if cloudContent.type.startsWith('image/')}
                               <ImageIcon size={width === 1 || height === 1 ? 18 : 24} class="text-green-400 shrink-0" />
                            {:else}
                               <FileIcon size={width === 1 || height === 1 ? 18 : 24} class="text-green-400 shrink-0" />
                            {/if}
                            {#if height > 1 && width > 1}
                            <span class="text-[11px] font-bold text-center px-1 shrink-0 mt-0.5">
                               {downloadStatus === 'success' ? (i18n.t.w.clipboardSync?.success || 'Success') : 
                                downloadStatus === 'error' ? (i18n.t.w.clipboardSync?.error || 'Error') :
                                (i18n.t.w.clipboardSync?.copy || 'Copy')
                               }
                            </span>
                            {/if}
                        {:else}
                            <DownloadCloud size={width === 1 || height === 1 ? 18 : 24} class="text-neutral-500 shrink-0" />
                            {#if height > 1 && width > 1}
                            <span class="text-[11px] font-bold text-center text-neutral-500 px-1">
                               {i18n.t.w.clipboardSync?.empty || 'Empty'}
                            </span>
                            {/if}
                        {/if}
                    </div>
                </button>

                <!-- Share picker button overlay -->
                {#if cloudContent}
                   <button 
                       onclick={generateShareLink}
                       class="absolute {height === 1 ? 'top-1/2 -translate-y-1/2 right-1.5' : 'top-1 right-1 sm:top-2 sm:right-2'} p-1.5 rounded-lg bg-neutral-800 border border-neutral-700 text-neutral-400 hover:text-white hover:bg-neutral-700 transition-colors opacity-0 group-hover:opacity-100 z-10 shadow-lg"
                       title={i18n.t.w.clipboardSync?.share || 'Create Quickshare'}
                   >
                       {#if isSharing}
                           <div class="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                       {:else}
                           <Share2 size={14} />
                       {/if}
                   </button>
                {/if}
            </div>
        </div>

        {#if height > 1 && width > 1 && cloudContent}
        <div class="w-full shrink-0 py-1.5 border-t border-white/5 bg-black/20 flex flex-col items-center justify-center px-3 gap-0.5 z-10">
            <span class="text-[9px] text-neutral-400 font-mono w-full text-center truncate leading-none">
                {cloudContent.name || i18n.t.w.clipboardSync?.snippet || 'Text Snippet'}
            </span>
            <span class="text-[9px] text-neutral-500 font-medium w-full text-center truncate leading-none">
                {timeRemaining}
            </span>
        </div>
        {/if}

        {#if isDragging}
            <div class="absolute inset-0 border-2 border-dashed border-blue-500 bg-blue-500/20 flex items-center justify-center backdrop-blur-sm z-20">
                <span class="text-sm font-bold text-blue-200 pointer-events-none">{i18n.t.w.clipboardSync?.dropHere || 'Drop here'}</span>
            </div>
        {/if}
    </div>

    {#if isEditing}
    <div
        onmousedown={onResizeStart}
        ontouchstart={onResizeStart}
        role="presentation"
        class="absolute bottom-0 right-0 h-4 w-4 cursor-nwse-resize touch-none bg-gradient-to-br from-transparent from-50% to-black/30 to-50% transition-colors hover:to-black/50"
    ></div>
    {/if}
  </div>
</WidgetCard>
