import React, { useState, useEffect } from 'react';
import { Lightbulb, Play, X, Sparkles, Loader2 } from 'lucide-react';
import {
  showRewardedAd,
  loadRewardedAd,
  checkRewardedAdReady,
  subscribeToAdState,
  AdLoadState,
  unityAdsService,
} from '../game/adService';
import { sound } from '../game/sound';

interface FreeHintsModalProps {
  onRewardSuccess: () => void;
  onClose: () => void;
}

export const FreeHintsModal: React.FC<FreeHintsModalProps> = ({
  onRewardSuccess,
  onClose,
}) => {
  const [adState, setAdState] = useState<AdLoadState>(() => unityAdsService.getAdState());
  const [isLoading, setIsLoading] = useState(false);
  const [adErrorMessage, setAdErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToAdState((state, lastErr) => {
      setAdState(state);
      if (state === 'FAILED' && lastErr) {
        console.warn('[FreeHintsModal] Unity Ads state: FAILED', lastErr);
      }
    });

    checkRewardedAdReady().then((ready) => {
      if (!ready) {
        loadRewardedAd();
      }
    });

    return () => unsubscribe();
  }, []);

  const isBusy = isLoading || adState === 'LOADING' || adState === 'SHOWING';

  const handleWatchAd = async () => {
    if (isBusy) return;
    sound.playTap();
    setAdErrorMessage(null);
    setIsLoading(true);

    try {
      const result = await showRewardedAd();

      if (result.rewardGranted) {
        sound.playWin();
        onRewardSuccess();
      } else {
        sound.playBump();
        setAdErrorMessage(result.message || 'Unable to load advertisement. Please try again.');
        console.warn('[FreeHintsModal] Rewarded ad not completed:', result.errorReason, result.message);
      }
    } catch (e: any) {
      sound.playBump();
      const errMsg = e?.message || 'Unable to load advertisement. Please try again.';
      setAdErrorMessage(errMsg);
      console.warn('[FreeHintsModal] Rewarded ad error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="hints-modal-title"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/75 p-4 select-none"
    >
      <div className="w-full max-w-xs bg-white rounded-3xl p-6 text-center shadow-2xl border border-slate-100 flex flex-col items-center relative">
        {/* Close Button */}
        <button
          type="button"
          onClick={() => {
            sound.playTap();
            onClose();
          }}
          aria-label="Close"
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer touch-manipulation"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Radiant Lightbulb Emblem */}
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mb-3 ring-8 ring-amber-50/70 shadow-inner">
          <Lightbulb className="w-8 h-8 stroke-[2.2]" />
        </div>

        {/* Heading */}
        <h3
          id="hints-modal-title"
          className="text-xl font-black text-slate-800 tracking-tight mb-1 uppercase"
        >
          OUT OF HINTS!
        </h3>

        {/* Description */}
        <p className="text-xs font-medium text-slate-500 mb-3 px-2 leading-relaxed">
          Stuck on this arrow puzzle? Watch a short ad to get <strong className="text-amber-600 font-black">+2 Free Hints</strong>!
        </p>

        {adErrorMessage && (
          <div className="w-full mb-3 px-3 py-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-semibold leading-snug">
            {adErrorMessage}
          </div>
        )}

        {/* Action Buttons */}
        <div className="w-full flex flex-col gap-2">
          {/* Watch Ad Button */}
          <button
            type="button"
            disabled={isBusy}
            onClick={handleWatchAd}
            className={`w-full py-3.5 px-4 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer touch-manipulation ${
              isBusy
                ? 'bg-amber-400 text-white cursor-wait'
                : 'bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white shadow-amber-500/30'
            }`}
          >
            {isBusy ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Loading advertisement...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>WATCH AD (+2 HINTS)</span>
                <Sparkles className="w-3.5 h-3.5 text-yellow-100" />
              </>
            )}
          </button>

          {/* Cancel Button */}
          <button
            type="button"
            onClick={() => {
              sound.playTap();
              onClose();
            }}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wide transition-colors cursor-pointer touch-manipulation"
          >
            Keep Trying
          </button>
        </div>
      </div>
    </div>
  );
};
