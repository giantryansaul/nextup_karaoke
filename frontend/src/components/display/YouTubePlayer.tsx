/// <reference types="youtube" />
import { useEffect, useRef, useState } from 'react';
import { formatPlaybackRate } from '../../playbackRates';

const EARLY_END_THRESHOLD = 5;
const RATE_FLASH_MS = 1800;

declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
  }
}

// Module-level promise resolves when the IFrame API is ready
let ytReadyResolve!: () => void;
const ytReady = new Promise<void>((resolve) => {
  ytReadyResolve = resolve;
});

function loadYouTubeApi() {
  if (window.YT && window.YT.Player) {
    ytReadyResolve();
    return;
  }
  window.onYouTubeIframeAPIReady = () => ytReadyResolve();
  const script = document.createElement('script');
  script.src = 'https://www.youtube.com/iframe_api';
  document.head.appendChild(script);
}

loadYouTubeApi();

interface YouTubePlayerProps {
  nowPlayingVideoId: string | null;
  isPaused: boolean;
  restartSignal: number;
  skipToNearEndSignal: number;
  playbackRate: number;
  onVideoEnded: () => void;
}

export function YouTubePlayer({
  nowPlayingVideoId,
  isPaused,
  restartSignal,
  skipToNearEndSignal,
  playbackRate,
  onVideoEnded,
}: YouTubePlayerProps) {
  const playerRef = useRef<YT.Player | null>(null);
  const onEndedRef = useRef(onVideoEnded);
  const prevIsPausedRef = useRef(false);
  const prevPlaybackRateRef = useRef<number | null>(null);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const earlyEndIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showOverlay, setShowOverlay] = useState(true);
  const [started, setStarted] = useState(false);
  const [embedError, setEmbedError] = useState(false);
  const [rateFlash, setRateFlash] = useState<{ label: string; faster: boolean } | null>(null);

  // Always keep the ref current without recreating the player
  onEndedRef.current = onVideoEnded;

  // Create the player once after the API is ready
  useEffect(() => {
    let mounted = true;
    void ytReady.then(() => {
      if (!mounted) return;
      playerRef.current = new YT.Player('yt-player', {
        height: '100%',
        width: '100%',
        videoId: '',
        playerVars: {
          autoplay: 1,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
          iv_load_policy: 3,
        } as YT.PlayerVars,
        events: {
          onStateChange: (event: YT.OnStateChangeEvent) => {
            if (event.data === YT.PlayerState.PLAYING) {
              if (earlyEndIntervalRef.current) clearInterval(earlyEndIntervalRef.current);
              earlyEndIntervalRef.current = setInterval(() => {
                const player = playerRef.current;
                if (!player) return;
                const duration = player.getDuration();
                const current = player.getCurrentTime();
                if (duration > 0 && duration - current <= EARLY_END_THRESHOLD) {
                  if (earlyEndIntervalRef.current) clearInterval(earlyEndIntervalRef.current);
                  earlyEndIntervalRef.current = null;
                  onEndedRef.current();
                }
              }, 1000);
            } else {
              if (earlyEndIntervalRef.current) clearInterval(earlyEndIntervalRef.current);
              earlyEndIntervalRef.current = null;
            }
            if (event.data === YT.PlayerState.ENDED) {
              onEndedRef.current();
            }
          },
          onError: (event: YT.OnErrorEvent) => {
            // 101 / 150: embedding disabled by video owner
            if (event.data === 101 || event.data === 150) {
              setEmbedError(true);
              errorTimerRef.current = setTimeout(() => {
                setEmbedError(false);
                onEndedRef.current();
              }, 4000);
            }
          },
        },
      });
    });
    return () => {
      mounted = false;
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
      if (earlyEndIntervalRef.current) clearInterval(earlyEndIntervalRef.current);
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, []);

  // Load new video when nowPlayingVideoId changes; stop player when queue empties
  useEffect(() => {
    if (!playerRef.current || !started) return;
    if (!nowPlayingVideoId) {
      playerRef.current.stopVideo();
      return;
    }
    if (errorTimerRef.current) {
      clearTimeout(errorTimerRef.current);
      errorTimerRef.current = null;
    }
    if (earlyEndIntervalRef.current) {
      clearInterval(earlyEndIntervalRef.current);
      earlyEndIntervalRef.current = null;
    }
    setEmbedError(false);
    playerRef.current.loadVideoById(nowPlayingVideoId);
  }, [nowPlayingVideoId, started]);

  // Pause or resume in response to synced is_paused state
  useEffect(() => {
    if (!playerRef.current || !started) return;
    if (isPaused === prevIsPausedRef.current) return;
    prevIsPausedRef.current = isPaused;
    if (isPaused) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
  }, [isPaused, started]);

  // Apply synced playback rate; flash overlay when the rate changes
  useEffect(() => {
    if (!playerRef.current || !started) return;
    try {
      playerRef.current.setPlaybackRate(playbackRate);
    } catch {
      /* player may not be ready yet */
    }

    const prev = prevPlaybackRateRef.current;
    prevPlaybackRateRef.current = playbackRate;
    if (prev === null || prev === playbackRate) return;

    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    setRateFlash({
      label: formatPlaybackRate(playbackRate),
      faster: playbackRate > prev,
    });
    flashTimerRef.current = setTimeout(() => {
      setRateFlash(null);
      flashTimerRef.current = null;
    }, RATE_FLASH_MS);
  }, [playbackRate, started]);

  // Re-apply rate after a new video loads (YouTube resets to 1× on loadVideoById)
  useEffect(() => {
    if (!playerRef.current || !started || !nowPlayingVideoId) return;
    const player = playerRef.current;
    const apply = () => {
      try {
        player.setPlaybackRate(playbackRate);
      } catch {
        /* ignore */
      }
    };
    // loadVideoById is async; nudge rate shortly after load
    const t = setTimeout(apply, 400);
    return () => clearTimeout(t);
  }, [nowPlayingVideoId, playbackRate, started]);

  // Seek to start when restart is requested; isPaused is intentionally read
  // at call time only — adding it to deps would cause spurious re-seeks on pause toggle
  useEffect(() => {
    if (!playerRef.current || !started || restartSignal === 0) return;
    playerRef.current.seekTo(0, true);
    if (!isPaused) playerRef.current.playVideo();
  }, [restartSignal, started]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!playerRef.current || !started || skipToNearEndSignal === 0) return;
    const duration = playerRef.current.getDuration();
    if (duration > 0) playerRef.current.seekTo(Math.max(0, duration - 10), true);
  }, [skipToNearEndSignal, started]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStart = () => {
    setShowOverlay(false);
    setStarted(true);
    if (nowPlayingVideoId && playerRef.current) {
      playerRef.current.loadVideoById(nowPlayingVideoId);
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: '#000' }}>
      <div id="yt-player" style={{ width: '100%', height: '100%' }} />

      {!nowPlayingVideoId && !showOverlay && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          background: '#000',
        }}>
          <p style={{ fontSize: '64px', margin: '0 0 16px' }}>🎤</p>
          <p style={{ color: '#fff', fontSize: '24px', fontWeight: 700 }}>Waiting for songs...</p>
          <p style={{ color: '#666', fontSize: '16px' }}>Add songs from your phone to get started</p>
        </div>
      )}

      {playbackRate !== 1 && started && nowPlayingVideoId && !showOverlay && (
        <div style={{
          position: 'absolute',
          top: 16,
          left: 16,
          zIndex: 4,
          padding: '8px 14px',
          background: 'rgba(0,0,0,0.65)',
          border: '1px solid rgba(255,255,255,0.18)',
          borderRadius: 8,
          color: '#fff',
          fontSize: 18,
          fontWeight: 800,
          letterSpacing: '0.02em',
          pointerEvents: 'none',
        }}>
          {formatPlaybackRate(playbackRate)}
        </div>
      )}

      {rateFlash && started && !showOverlay && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 4,
          pointerEvents: 'none',
        }}>
          <div style={{
            padding: '20px 36px',
            background: 'rgba(0,0,0,0.72)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 14,
            color: '#fff',
            fontSize: 42,
            fontWeight: 900,
            letterSpacing: '-0.02em',
            animation: 'rateFlashIn 0.2s ease-out',
          }}>
            {rateFlash.faster ? '▲' : '▼'} {rateFlash.label}
          </div>
        </div>
      )}

      {embedError && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.88)',
          zIndex: 5,
        }}>
          <p style={{ fontSize: '56px', margin: '0 0 16px' }}>🚫</p>
          <p style={{ color: '#fff', fontSize: '22px', fontWeight: 700, margin: '0 0 8px' }}>
            This video can't be played here
          </p>
          <p style={{ color: '#888', fontSize: '15px', margin: 0 }}>
            Skipping to next song...
          </p>
        </div>
      )}

      {showOverlay && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.92)',
          zIndex: 10,
        }}>
          <h1 style={{ fontSize: '48px', fontWeight: 900, margin: '0 0 8px', letterSpacing: '-0.02em' }}>
            NextUp Karaoke
          </h1>
          <p style={{ color: '#ddd', fontSize: '18px', margin: '0 0 40px' }}>
            Party Display
          </p>
          <button
            onClick={handleStart}
            style={{
              padding: '18px 48px',
              background: '#fff',
              color: '#000',
              border: 'none',
              borderRadius: '12px',
              fontSize: '20px',
              fontWeight: 800,
              cursor: 'pointer',
              letterSpacing: '-0.01em',
            }}
          >
            Start Party 🎉
          </button>
          <p style={{ color: '#ddd', fontSize: '13px', marginTop: '16px' }}>
            Click once to enable autoplay
          </p>
        </div>
      )}

      <style>{`
        @keyframes rateFlashIn {
          from { opacity: 0; transform: scale(0.92); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
