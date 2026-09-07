/**
 * Attach an HLS (.m3u8) source to a <video> element.
 * Uses native HLS on Safari/iOS, falls back to hls.js elsewhere (loaded on demand).
 * Returns a cleanup function to tear down the player.
 */
export function attachHls(
  video: HTMLVideoElement,
  src: string,
  onError?: (msg: string) => void
): () => void {
  // Safari / iOS play HLS natively — no library needed.
  if (video.canPlayType("application/vnd.apple.mpegurl")) {
    video.src = src;
    return () => {
      video.removeAttribute("src");
      video.load();
    };
  }

  let cancelled = false;
  let hls: { destroy: () => void } | null = null;
  import("hls.js")
    .then(({ default: Hls }) => {
      if (cancelled || !video.isConnected) return;
      if (!Hls.isSupported()) {
        onError?.("Browser tidak mendukung pemutaran HLS.");
        return;
      }
      const inst = new Hls({ enableWorker: true });
      inst.on(Hls.Events.ERROR, (_evt, data) => {
        if (data?.fatal) onError?.("Gagal memuat stream (URL/CORS/offline).");
      });
      inst.loadSource(src);
      inst.attachMedia(video);
      hls = inst;
    })
    .catch(() => onError?.("Gagal memuat pemutar HLS."));

  return () => {
    cancelled = true;
    hls?.destroy();
  };
}
