/// <reference types="youtube" />
import { useEffect, useRef, useState } from 'react';

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
  onVideoEnded: () => void;
}

export function YouTubePlayer({ nowPlayingVideoId, isPaused, onVideoEnded }: YouTubePlayerProps) {
  const playerRef = useRef<YT.Player | null>(null);
  const onEndedRef = useRef(onVideoEnded);
  const prevIsPausedRef = useRef(false);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showOverlay, setShowOverlay] = useState(true);
  const [started, setStarted] = useState(false);
  const [embedError, setEmbedError] = useState(false);

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
          <p style={{ color: '#888', fontSize: '18px', margin: '0 0 40px' }}>
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
          <p style={{ color: '#444', fontSize: '13px', marginTop: '16px' }}>
            Click once to enable autoplay
          </p>
        </div>
      )}
    </div>
  );
}
