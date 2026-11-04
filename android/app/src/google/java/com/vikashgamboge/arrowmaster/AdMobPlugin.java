package com.vikashgamboge.arrowmaster;

import android.app.Activity;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import androidx.annotation.NonNull;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import com.google.android.gms.ads.AdError;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.FullScreenContentCallback;
import com.google.android.gms.ads.LoadAdError;
import com.google.android.gms.ads.MobileAds;
import com.google.android.gms.ads.interstitial.InterstitialAd;
import com.google.android.gms.ads.interstitial.InterstitialAdLoadCallback;
import com.google.android.gms.ads.rewarded.RewardedAd;
import com.google.android.gms.ads.rewarded.RewardedAdLoadCallback;

import java.util.concurrent.atomic.AtomicBoolean;

@CapacitorPlugin(name = "AdMobPlugin")
public class AdMobPlugin extends Plugin {

    private static final String TAG = "AdMobPlugin";

    // Standard Google AdMob Test Placement IDs (Replace with production IDs via JS or config)
    private static final String TEST_REWARDED_ID = "ca-app-pub-3940256099942544/5224354917";
    private static final String TEST_INTERSTITIAL_ID = "ca-app-pub-3940256099942544/1033173712";

    // Ad presentation mutual exclusion flag
    public static final AtomicBoolean isAnyAdDisplaying = new AtomicBoolean(false);

    private final AtomicBoolean isInitialized = new AtomicBoolean(false);
    private RewardedAd rewardedAd = null;
    private InterstitialAd interstitialAd = null;

    private boolean isRewardedLoading = false;
    private boolean isInterstitialLoading = false;

    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    @Override
    public void load() {
        super.load();
    }

    @PluginMethod
    public void initialize(PluginCall call) {
        if (isInitialized.get()) {
            JSObject ret = new JSObject();
            ret.put("initialized", true);
            call.resolve(ret);
            return;
        }

        Activity activity = getActivity();
        if (activity == null) {
            call.reject("CONTEXT_NULL", "Activity is null");
            return;
        }

        mainHandler.post(() -> {
            try {
                MobileAds.initialize(activity, initializationStatus -> {
                    isInitialized.set(true);
                    Log.i(TAG, "AdMob MobileAds initialized successfully");
                    JSObject ret = new JSObject();
                    ret.put("initialized", true);
                    call.resolve(ret);
                });
            } catch (Exception e) {
                Log.e(TAG, "AdMob initialization failed: " + e.getMessage());
                call.reject("INIT_FAILED", e.getMessage());
            }
        });
    }

    @PluginMethod
    public void loadRewarded(PluginCall call) {
        String adUnitId = call.getString("adUnitId", TEST_REWARDED_ID);
        if (rewardedAd != null) {
            JSObject ret = new JSObject();
            ret.put("loaded", true);
            call.resolve(ret);
            return;
        }

        if (isRewardedLoading) {
            JSObject ret = new JSObject();
            ret.put("loading", true);
            call.resolve(ret);
            return;
        }

        Activity activity = getActivity();
        if (activity == null) {
            call.reject("ACTIVITY_NULL", "Activity unavailable");
            return;
        }

        isRewardedLoading = true;
        mainHandler.post(() -> {
            AdRequest adRequest = new AdRequest.Builder().build();
            RewardedAd.load(activity, adUnitId, adRequest, new RewardedAdLoadCallback() {
                @Override
                public void onAdLoaded(@NonNull RewardedAd ad) {
                    rewardedAd = ad;
                    isRewardedLoading = false;
                    Log.i(TAG, "AdMob Rewarded ad loaded: " + adUnitId);
                    JSObject ret = new JSObject();
                    ret.put("loaded", true);
                    call.resolve(ret);
                }

                @Override
                public void onAdFailedToLoad(@NonNull LoadAdError loadAdError) {
                    rewardedAd = null;
                    isRewardedLoading = false;
                    Log.w(TAG, "AdMob Rewarded ad failed to load: " + loadAdError.getMessage());
                    call.reject("LOAD_FAILED", loadAdError.getMessage());
                }
            });
        });
    }

    @PluginMethod
    public void showRewarded(PluginCall call) {
        if (!isAnyAdDisplaying.compareAndSet(false, true)) {
            call.reject("ALREADY_SHOWING", "Another ad is currently displaying");
            return;
        }

        if (rewardedAd == null) {
            isAnyAdDisplaying.set(false);
            call.reject("NOT_READY", "AdMob Rewarded ad is not ready");
            return;
        }

        Activity activity = getActivity();
        if (activity == null || activity.isFinishing() || activity.isDestroyed()) {
            isAnyAdDisplaying.set(false);
            call.reject("ACTIVITY_UNAVAILABLE", "Activity unavailable");
            return;
        }

        mainHandler.post(() -> {
            final AtomicBoolean earned = new AtomicBoolean(false);

            rewardedAd.setFullScreenContentCallback(new FullScreenContentCallback() {
                @Override
                public void onAdShowedFullScreenContent() {
                    Log.i(TAG, "AdMob Rewarded ad displayed fullscreen");
                }

                @Override
                public void onAdFailedToShowFullScreenContent(@NonNull AdError adError) {
                    rewardedAd = null;
                    isAnyAdDisplaying.set(false);
                    Log.e(TAG, "AdMob Rewarded failed to show: " + adError.getMessage());
                    call.reject("SHOW_FAILED", adError.getMessage());
                }

                @Override
                public void onAdDismissedFullScreenContent() {
                    rewardedAd = null;
                    isAnyAdDisplaying.set(false);
                    Log.i(TAG, "AdMob Rewarded dismissed. Earned=" + earned.get());
                    JSObject ret = new JSObject();
                    ret.put("completed", earned.get());
                    ret.put("skipped", !earned.get());
                    call.resolve(ret);
                }
            });

            rewardedAd.show(activity, rewardItem -> {
                earned.set(true);
                Log.i(TAG, "User earned AdMob reward: " + rewardItem.getAmount() + " " + rewardItem.getType());
            });
        });
    }

    @PluginMethod
    public void loadInterstitial(PluginCall call) {
        String adUnitId = call.getString("adUnitId", TEST_INTERSTITIAL_ID);
        if (interstitialAd != null) {
            JSObject ret = new JSObject();
            ret.put("loaded", true);
            call.resolve(ret);
            return;
        }

        if (isInterstitialLoading) {
            JSObject ret = new JSObject();
            ret.put("loading", true);
            call.resolve(ret);
            return;
        }

        Activity activity = getActivity();
        if (activity == null) {
            call.reject("ACTIVITY_NULL", "Activity unavailable");
            return;
        }

        isInterstitialLoading = true;
        mainHandler.post(() -> {
            AdRequest adRequest = new AdRequest.Builder().build();
            InterstitialAd.load(activity, adUnitId, adRequest, new InterstitialAdLoadCallback() {
                @Override
                public void onAdLoaded(@NonNull InterstitialAd ad) {
                    interstitialAd = ad;
                    isInterstitialLoading = false;
                    Log.i(TAG, "AdMob Interstitial ad loaded: " + adUnitId);
                    JSObject ret = new JSObject();
                    ret.put("loaded", true);
                    call.resolve(ret);
                }

                @Override
                public void onAdFailedToLoad(@NonNull LoadAdError loadAdError) {
                    interstitialAd = null;
                    isInterstitialLoading = false;
                    Log.w(TAG, "AdMob Interstitial failed to load: " + loadAdError.getMessage());
                    call.reject("LOAD_FAILED", loadAdError.getMessage());
                }
            });
        });
    }

    @PluginMethod
    public void showInterstitial(PluginCall call) {
        if (!isAnyAdDisplaying.compareAndSet(false, true)) {
            call.reject("ALREADY_SHOWING", "Another ad is currently displaying");
            return;
        }

        if (interstitialAd == null) {
            isAnyAdDisplaying.set(false);
            call.reject("NOT_READY", "AdMob Interstitial ad is not ready");
            return;
        }

        Activity activity = getActivity();
        if (activity == null || activity.isFinishing() || activity.isDestroyed()) {
            isAnyAdDisplaying.set(false);
            call.reject("ACTIVITY_UNAVAILABLE", "Activity unavailable");
            return;
        }

        mainHandler.post(() -> {
            interstitialAd.setFullScreenContentCallback(new FullScreenContentCallback() {
                @Override
                public void onAdShowedFullScreenContent() {
                    Log.i(TAG, "AdMob Interstitial ad displayed fullscreen");
                }

                @Override
                public void onAdFailedToShowFullScreenContent(@NonNull AdError adError) {
                    interstitialAd = null;
                    isAnyAdDisplaying.set(false);
                    Log.e(TAG, "AdMob Interstitial failed to show: " + adError.getMessage());
                    call.reject("SHOW_FAILED", adError.getMessage());
                }

                @Override
                public void onAdDismissedFullScreenContent() {
                    interstitialAd = null;
                    isAnyAdDisplaying.set(false);
                    Log.i(TAG, "AdMob Interstitial dismissed");
                    JSObject ret = new JSObject();
                    ret.put("completed", true);
                    call.resolve(ret);
                }
            });

            interstitialAd.show(activity);
        });
    }

    @PluginMethod
    public void isAdLoaded(PluginCall call) {
        String type = call.getString("type", "rewarded");
        JSObject ret = new JSObject();
        if ("interstitial".equalsIgnoreCase(type)) {
            ret.put("loaded", interstitialAd != null);
            ret.put("loading", isInterstitialLoading);
        } else {
            ret.put("loaded", rewardedAd != null);
            ret.put("loading", isRewardedLoading);
        }
        ret.put("initialized", isInitialized.get());
        call.resolve(ret);
    }
}
