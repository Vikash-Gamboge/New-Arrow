import React, { useState, useEffect } from 'react';
import { HeartCrack, Play, RotateCcw, Loader2 } from 'lucide-react';
import {
  showRewardedAd,
  loadRewardedAd,
  checkRewardedAdReady,
  subscribeToAdState,
  AdLoadState,
  unityAdsService,
} from '../game/adService';
import { sound } from '../game/sound';

interface GameOverModalProps {
  onRestart: () => void;
  onWatchAdSuccess: () => void;
  onMainMenu: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  onRestart,
  onWatchAdSuccess,
  onMainMenu,
}) => {
  const [adState, setAdState] = useState<AdLoadState>(() => unityAdsService.getAdState());
  const [isRequestingAd, setIsRequestingAd] = useState(false);
  const [adErrorMessage, setAdErrorMessage] = useState<string | null>(null);

  // Subscribe to Unity Ads state changes and verify readiness on mount
  useEffect(() => {
    const unsubscribe = subscribeToAdState((state, lastErr) => {
      setAdState(state);
      if (state === 'FAILED' && lastErr) {
        console.warn('[GameOverModal] Unity Ads state: FAILED', lastErr);
      }
    });

    checkRewardedAdReady().then((ready) => {
      if (!ready) {
        loadRewardedAd();
      }
    });

    return () => unsubscribe();
  }, []);

  const isAdButtonBusy = isRequestingAd || adState === 'LOADING' || adState === 'SHOWING';
  const isAdActivelyShowing = adState === 'SHOWING';

  const handleWatchAdClick = async () => {
    if (isAdButtonBusy) return;
    sound.playTap();
    setAdErrorMessage(null);
    setIsRequestingAd(true);

    try {
      const result = await showRewardedAd();

      if (result.rewardGranted) {
        sound.playWin();
        // ONLY grant +1 Life after verified Unity Ads reward callback
        onWatchAdSuccess();
      } else {
        sound.playBump();
        setAdErrorMessage(result.message || 'Unable to load advertisement. Please try again.');
        console.warn('[GameOverModal] Rewarded ad not completed:', result.errorReason, result.message);
      }
    } catch (e: any) {
      sound.playBump();
      const errMsg = e?.message || 'Unable to load advertisement. Please try again.';
      setAdErrorMessage(errMsg);
      console.warn('[GameOverModal] Rewarded ad error:', e);
    } finally {
      setIsRequestingAd(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="gameover-title"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/75 p-4 select-none"
    >
      <div className="w-full max-w-sm bg-white rounded-3xl p-6 text-center shadow-2xl border border-slate-100 flex flex-col items-center relative">
        {/* Heartbreak Graphic */}
        <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mb-3 ring-8 ring-rose-50/60 shadow-inner">
          <HeartCrack className="w-9 h-9 stroke-[2.2]" />
        </div>

        {/* 1. Clear "OUT OF LIVES!" Heading with Extra Chance Badge */}
        <h3
          id="gameover-title"
          className="text-2xl font-black text-slate-800 tracking-tight mb-0.5 uppercase"
        >
          OUT OF LIVES!
        </h3>
        <span className="inline-block px-3 py-0.5 rounded-full bg-rose-100 text-rose-700 font-black text-[10px] uppercase tracking-wider mb-2">
          EXTRA CHANCE AVAILABLE
        </span>

        {/* 2. Short Explanatory Message */}
        <p className="text-xs font-medium text-slate-500 mb-3 px-2">
          Watch a rewarded ad to get an extra chance (+1 Life) and resume this puzzle, or restart.
        </p>

        {adErrorMessage && (
          <div className="w-full mb-3 px-3 py-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-semibold leading-snug">
            {adErrorMessage}
          </div>
        )}

        <div className="w-full flex flex-col gap-2.5">
          {/* 3. Primary Button: "WATCH AD & CONTINUE" (+1 Life Extra Chance) */}
          <button
            type="button"
            disabled={isAdButtonBusy}
            onClick={handleWatchAdClick}
            data-testid="watch-ad-continue-btn"
            className={`w-full py-3.5 px-6 rounded-2xl font-black text-sm uppercase tracking-wider shadow-lg active:scale-98 transition-all flex items-center justify-center gap-2.5 touch-manipulation cursor-pointer ${
              isAdButtonBusy
                ? 'bg-blue-400 text-white cursor-wait shadow-blue-400/20'
                : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white shadow-blue-600/30'
            }`}
          >
            {isAdButtonBusy ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Loading advertisement...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>WATCH AD & CONTINUE (+1 Life)</span>
              </>
            )}
          </button>

          {/* 4. Secondary Button directly below: "RESTART LEVEL" */}
          <button
            type="button"
            disabled={isAdActivelyShowing}
            onClick={() => {
              sound.playTap();
              onRestart();
            }}
            data-testid="restart-level-gameover-btn"
            className="w-full py-3 px-6 rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-98 text-slate-700 font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer touch-manipulation border border-slate-200/60"
          >
            <RotateCcw className="w-4 h-4 stroke-[2.4]" />
            <span>RESTART LEVEL</span>
          </button>

          {/* 5. Return Home Link */}
          <button
            type="button"
            disabled={isAdActivelyShowing}
            onClick={() => {
              sound.playTap();
              onMainMenu();
            }}
            aria-label="Return to Home Screen"
            className="py-2 text-slate-400 hover:text-slate-600 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation mt-1"
          >
            <span>HOME</span>
          </button>
        </div>
      </div>
    </div>
  );
};
