/**
 * Unity Ads - Official Native Android Integration Service
 * Game: Arrow Master : Puzzle Escape
 *
 * ---------------------------------------------------------------------------------
 * DASHBOARD CONFIGURATION:
 * Android Game ID:        800417555
 * Organization Core ID:  13469992649677 (Dashboard reference only)
 *
 * AD UNIT / PLACEMENT IDS (Only Rewarded & Interstitial - Zero Banner Ads):
 * Rewarded:     BP_Rewarded_Android
 * Interstitial: BP_Interstitial_Android
 * ---------------------------------------------------------------------------------
 */

import { Capacitor, PluginListenerHandle, registerPlugin } from '@capacitor/core';
import { UNITY_ADS_CONFIG, isUnityTestMode } from './unityAdsConfig';

export interface RewardedAdResult {
  success: boolean;
  rewardGranted: boolean;
  errorReason?: 'NOT_READY' | 'LOAD_FAILED' | 'USER_DISMISSED' | 'SKIPPED' | 'UNAVAILABLE' | 'ALREADY_CLAIMED';
  errorCode?: string;
  message: string;
}

export type AdLoadState = 'UNINITIALIZED' | 'LOADING' | 'READY' | 'SHOWING' | 'FAILED' | 'UNAVAILABLE';

export interface UnityAdsNativePlugin {
  initialize(options: { gameId: string; testMode: boolean }): Promise<{
    success: boolean;
    alreadyInitialized?: boolean;
    offline?: boolean;
    sdkVersion?: string;
  }>;
  isInitialized(): Promise<{
    initialized: boolean;
    initializing?: boolean;
    connected?: boolean;
    sdkVersion?: string;
    error?: string;
  }>;
  loadAd(options: { placementId: string }): Promise<{
    success: boolean;
    placementId: string;
    resolvedPlacementId?: string;
    alreadyLoaded?: boolean;
    offline?: boolean;
  }>;
  isAdLoaded(options: { placementId: string }): Promise<{
    loaded: boolean;
    loading?: boolean;
    initialized?: boolean;
    initializing?: boolean;
    connected?: boolean;
    resolvedPlacementId?: string;
    lastError?: string;
  }>;
  showAd(options: { placementId: string }): Promise<{
    placementId: string;
    resolvedPlacementId?: string;
    state: string;
    completed: boolean;
    skipped: boolean;
  }>;
  setPrivacyConsent?(options: {
    gdprConsent?: boolean;
    ccpaConsent?: boolean;
    nonBehavioral?: boolean;
  }): Promise<{ success: boolean }>;
  addListener(
    eventName: 'adLoaded' | 'adLoadFailed' | 'sdkInitialized' | 'sdkInitFailed' | 'networkStatusChanged',
    listenerFunc: (data: any) => void
  ): Promise<PluginListenerHandle>;
}

/**
 * Ensure UnityAdsPlugin header exists on window.Capacitor.PluginHeaders before registerPlugin()
 * so Capacitor's native-bridge always generates method proxies on Android.
 */
function ensureUnityAdsPluginHeaderRegistered(): void {
  if (typeof window === 'undefined') return;
  const winCap = (window as any).Capacitor;
  if (!winCap) return;

  if (Array.isArray(winCap.PluginHeaders)) {
    const exists = winCap.PluginHeaders.some((h: any) => h && h.name === 'UnityAdsPlugin');
    if (!exists) {
      const header = {
        name: 'UnityAdsPlugin',
        methods: [
          { name: 'initialize', rtype: 'promise' },
          { name: 'isInitialized', rtype: 'promise' },
          { name: 'loadAd', rtype: 'promise' },
          { name: 'isAdLoaded', rtype: 'promise' },
          { name: 'showAd', rtype: 'promise' },
          { name: 'setPrivacyConsent', rtype: 'promise' },
          { name: 'addListener' },
          { name: 'removeListener' },
          { name: 'removeAllListeners', rtype: 'promise' },
        ],
      };
      winCap.PluginHeaders.push(header);
      if (typeof winCap.registerPlugin === 'function') {
        try {
          winCap.registerPlugin('UnityAdsPlugin');
        } catch {}
      }
    }
  }
}

ensureUnityAdsPluginHeaderRegistered();

export const UnityAdsNative = registerPlugin<UnityAdsNativePlugin>('UnityAdsPlugin');

export interface AdMobNativePlugin {
  initialize(): Promise<{ initialized: boolean }>;
  loadRewarded(options?: { adUnitId?: string }): Promise<{ loaded: boolean }>;
  showRewarded(): Promise<{ completed: boolean; skipped: boolean }>;
  loadInterstitial(options?: { adUnitId?: string }): Promise<{ loaded: boolean }>;
  showInterstitial(): Promise<{ completed: boolean }>;
  isAdLoaded(options: { type: 'rewarded' | 'interstitial' }): Promise<{ loaded: boolean; loading?: boolean }>;
}

export const AdMobNative = registerPlugin<AdMobNativePlugin>('AdMobPlugin');

class UnityAdsService {
  private adState: AdLoadState = 'UNINITIALIZED';
  private lastError: string | null = null;
  private isShowingRewarded: boolean = false;
  private isShowingInterstitial: boolean = false;
  private loadRewardedPromise: Promise<boolean> | null = null;
  private loadInterstitialPromise: Promise<boolean> | null = null;
  private rewardedRetryTimer: ReturnType<typeof setTimeout> | null = null;
  private interstitialRetryTimer: ReturnType<typeof setTimeout> | null = null;
  private rewardedRetryCount: number = 0;
  private interstitialRetryCount: number = 0;
  private listeners: Set<(state: AdLoadState, lastError: string | null) => void> = new Set();

  private isInitialized: boolean = false;
  private initPromise: Promise<void> | null = null;
  private isNetworkOnline: boolean = true;

  // Interstitial Frequency & Cooldown Tracking
  private completedLevelsSinceLastAd: number = 0;
  private lastInterstitialTime: number = 0;
  private lastRewardedTime: number = 0;
  private recentInterstitialTimestamps: number[] = [];

  constructor() {
    ensureUnityAdsPluginHeaderRegistered();
    this.isNetworkOnline = this.checkInitialOnlineStatus();
    this.setupNativeEventListeners();
    this.setupNetworkAndLifecycleListeners();

    if (this.isOnline()) {
      this.initializeUnityAds()
        .then(() => {
          this.loadRewardedAd();
          this.loadInterstitialAd();
        })
        .catch((err) => {
          console.warn('[UnityAds] Initial preload error:', err?.message || err);
        });
    } else {
      console.debug('[UnityAds] App started offline; ads queued for when connection restores.');
      this.setAdState('UNAVAILABLE');
    }
  }

  /**
   * Invokes a method on UnityAdsNative with direct Capacitor.nativePromise fallback
   * in case the proxy was registered before native-bridge finished initializing.
   */
  private async callNative<T>(
    methodName: 'initialize' | 'isInitialized' | 'loadAd' | 'isAdLoaded' | 'showAd' | 'setPrivacyConsent',
    options: Record<string, any> = {}
  ): Promise<T> {
    ensureUnityAdsPluginHeaderRegistered();
    try {
      const fn = (UnityAdsNative as any)[methodName];
      if (typeof fn === 'function') {
        return await fn.call(UnityAdsNative, options);
      }
    } catch (err: any) {
      const code = err?.code || '';
      const msg = err?.message || String(err);
      if (code === 'UNIMPLEMENTED' || msg.includes('not implemented')) {
        const winCap = typeof window !== 'undefined' ? (window as any).Capacitor : null;
        if (winCap && typeof winCap.nativePromise === 'function') {
          return await winCap.nativePromise('UnityAdsPlugin', methodName, options);
        }
      }
      throw err;
    }

    const winCap = typeof window !== 'undefined' ? (window as any).Capacitor : null;
    if (winCap && typeof winCap.nativePromise === 'function') {
      return await winCap.nativePromise('UnityAdsPlugin', methodName, options);
    }
    throw new Error(`UnityAdsPlugin.${methodName} is unavailable on this platform.`);
  }

  private checkInitialOnlineStatus(): boolean {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return false;
    }
    return true;
  }

  public isOnline(): boolean {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return false;
    }
    return this.isNetworkOnline;
  }

  private withTimeout<T>(promise: Promise<T>, timeoutMs: number, onTimeoutValue: T): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        resolve(onTimeoutValue);
      }, timeoutMs);

      promise
        .then((val) => {
          clearTimeout(timer);
          resolve(val);
        })
        .catch((err) => {
          clearTimeout(timer);
          reject(err);
        });
    });
  }

  private clearRetryTimers(): void {
    if (this.rewardedRetryTimer !== null) {
      clearTimeout(this.rewardedRetryTimer);
      this.rewardedRetryTimer = null;
    }
    if (this.interstitialRetryTimer !== null) {
      clearTimeout(this.interstitialRetryTimer);
      this.interstitialRetryTimer = null;
    }
  }

  private scheduleRewardedRetry(baseDelayMs: number = UNITY_ADS_CONFIG.RETRY_DELAY_MS): void {
    if (this.rewardedRetryTimer !== null) {
      clearTimeout(this.rewardedRetryTimer);
      this.rewardedRetryTimer = null;
    }
    if (!this.isNativeBridgePresent() || !this.isOnline()) return;

    this.rewardedRetryCount = Math.min(this.rewardedRetryCount + 1, 6);
    const delayMs = Math.min(baseDelayMs * this.rewardedRetryCount, 15000);

    this.rewardedRetryTimer = setTimeout(() => {
      this.rewardedRetryTimer = null;
      if (this.isOnline() && this.adState !== 'READY' && !this.isShowingRewarded && !this.loadRewardedPromise) {
        this.loadRewardedAd();
      }
    }, delayMs);
  }

  private scheduleInterstitialRetry(baseDelayMs: number = UNITY_ADS_CONFIG.RETRY_DELAY_MS): void {
    if (this.interstitialRetryTimer !== null) {
      clearTimeout(this.interstitialRetryTimer);
      this.interstitialRetryTimer = null;
    }
    if (!this.isNativeBridgePresent() || !this.isOnline()) return;

    this.interstitialRetryCount = Math.min(this.interstitialRetryCount + 1, 6);
    const delayMs = Math.min(baseDelayMs * this.interstitialRetryCount, 15000);

    this.interstitialRetryTimer = setTimeout(() => {
      this.interstitialRetryTimer = null;
      if (this.isOnline() && !this.isShowingInterstitial && !this.loadInterstitialPromise) {
        this.loadInterstitialAd();
      }
    }, delayMs);
  }

  private handleOnlineConnectivityRestored(): void {
    this.isNetworkOnline = true;
    this.rewardedRetryCount = 0;
    this.interstitialRetryCount = 0;
    console.debug('[UnityAds] Connectivity restored: Verifying and auto-loading ad inventory...');

    if (this.adState !== 'READY' && !this.isShowingRewarded && !this.loadRewardedPromise) {
      this.loadRewardedAd();
    }
    if (!this.isShowingInterstitial && !this.loadInterstitialPromise) {
      this.loadInterstitialAd();
    }
  }

  private handleOfflineConnectivityLost(): void {
    this.isNetworkOnline = false;
    this.clearRetryTimers();
    console.debug('[UnityAds] Offline mode: Pausing ad network requests.');

    if (!this.isShowingRewarded && this.adState !== 'READY') {
      this.setAdState('UNAVAILABLE');
    }
  }

  private setupNetworkAndLifecycleListeners(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      this.handleOnlineConnectivityRestored();
    });

    window.addEventListener('offline', () => {
      this.handleOfflineConnectivityLost();
    });

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && this.isOnline()) {
          this.handleOnlineConnectivityRestored();
        }
      });
    }
  }

  private setupNativeEventListeners(): void {
    if (!this.isNativeBridgePresent()) return;

    try {
      // 1. Native Android Network Status Change
      UnityAdsNative.addListener('networkStatusChanged', (data: { connected?: boolean }) => {
        const isConnected = data?.connected !== false;
        if (isConnected) {
          this.handleOnlineConnectivityRestored();
        } else {
          this.handleOfflineConnectivityLost();
        }
      }).catch(() => {});

      // 2. Ad loaded listener
      UnityAdsNative.addListener('adLoaded', (data: { placementId?: string; resolvedPlacementId?: string }) => {
        const rewardedId = this.getRewardedPlacement();
        if (
          data?.placementId === rewardedId ||
          data?.resolvedPlacementId === rewardedId
        ) {
          console.debug('[UnityAds] Native Rewarded Ad loaded successfully:', data);
          this.rewardedRetryCount = 0;
          if (this.rewardedRetryTimer !== null) {
            clearTimeout(this.rewardedRetryTimer);
            this.rewardedRetryTimer = null;
          }
          this.lastError = null;
          if (!this.isShowingRewarded) {
            this.setAdState('READY');
          }
        }
      }).catch(() => {});

      // 3. Ad load failed listener
      UnityAdsNative.addListener(
        'adLoadFailed',
        (data: { placementId?: string; errorCode?: string; message?: string }) => {
          const rewardedId = this.getRewardedPlacement();
          if (data?.placementId === rewardedId) {
            const detail = data.errorCode ? `[${data.errorCode}] ${data.message || ''}`.trim() : data.message || 'Load failed';
            console.warn('[UnityAds] Rewarded Ad load failed:', detail);
            this.lastError = detail;
            if (!this.isShowingRewarded) {
              this.setAdState(this.isOnline() ? 'FAILED' : 'UNAVAILABLE');
            }
          } else {
            const detail = data?.errorCode ? `[${data.errorCode}] ${data.message || ''}`.trim() : data?.message || 'Load failed';
            console.warn('[UnityAds] Interstitial Ad load failed:', detail);
          }
        }
      ).catch(() => {});

      // 4. SDK initialized listener
      UnityAdsNative.addListener('sdkInitialized', () => {
        this.isInitialized = true;
        this.lastError = null;
        console.debug('[UnityAds] SDK initialized callback received.');
        if (this.adState !== 'READY' && !this.isShowingRewarded && !this.loadRewardedPromise) {
          this.loadRewardedAd();
        }
        if (!this.isShowingInterstitial && !this.loadInterstitialPromise) {
          this.loadInterstitialAd();
        }
      }).catch(() => {});

      // 5. SDK init failed listener
      UnityAdsNative.addListener('sdkInitFailed', (data: { errorCode?: string; message?: string }) => {
        const detail = data?.errorCode ? `[${data.errorCode}] ${data.message || ''}`.trim() : data?.message || 'SDK init failed';
        console.warn('[UnityAds] SDK init failed:', detail);
        this.lastError = detail;
        if (!this.isShowingRewarded) {
          this.setAdState(this.isOnline() ? 'FAILED' : 'UNAVAILABLE');
        }
      }).catch(() => {});
    } catch (e) {
      console.warn('[UnityAds] Native listeners setup error:', e);
    }
  }

  public isNativeBridgePresent(): boolean {
    if (typeof window === 'undefined') return false;
    return Capacitor.isNativePlatform() || Capacitor.getPlatform() === 'android';
  }

  public getGameId(): string {
    return UNITY_ADS_CONFIG.GAME_ID;
  }

  public getRewardedPlacement(): string {
    return UNITY_ADS_CONFIG.PLACEMENTS.REWARDED;
  }

  public getInterstitialPlacement(): string {
    return UNITY_ADS_CONFIG.PLACEMENTS.INTERSTITIAL;
  }

  public getLastError(): string | null {
    return this.lastError;
  }

  /**
   * Step 1 & 2: Initialize Unity Ads and wait for the official SDK initialization callback.
   */
  public async initializeUnityAds(): Promise<void> {
    if (this.isInitialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      if (!this.isNativeBridgePresent()) {
        console.debug('[UnityAds] Web preview mode: Native ads active on Android APK.');
        this.isInitialized = true;
        this.setAdState('UNAVAILABLE');
        return;
      }

      try {
        const testMode = isUnityTestMode();
        console.debug(
          `[UnityAds] Initializing native Unity Ads SDK (Game ID: ${UNITY_ADS_CONFIG.GAME_ID}, testMode: ${testMode})`
        );

        const result = await this.withTimeout(
          this.callNative<{
            success: boolean;
            alreadyInitialized?: boolean;
            offline?: boolean;
            sdkVersion?: string;
          }>('initialize', {
            gameId: UNITY_ADS_CONFIG.GAME_ID,
            testMode,
          }),
          15000,
          { success: false }
        );

        if (result && result.success) {
          this.isInitialized = true;
          this.lastError = null;
        } else {
          const status = await this.withTimeout(
            this.callNative<{ initialized: boolean; error?: string }>('isInitialized'),
            3000,
            { initialized: false }
          ).catch(() => ({ initialized: false, error: undefined }));

          if (status.initialized) {
            this.isInitialized = true;
            this.lastError = null;
          } else if (status.error) {
            this.lastError = status.error;
          }
        }
      } catch (err: any) {
        const rawErr = err?.message || String(err);
        console.warn('[UnityAds] Native initialization error:', rawErr);
        this.lastError = rawErr;
        if (!this.isShowingRewarded) {
          this.setAdState(this.isOnline() ? 'FAILED' : 'UNAVAILABLE');
        }
      } finally {
        if (!this.isInitialized) {
          this.initPromise = null;
        }
      }
    })();

    return this.initPromise;
  }

  /**
   * Step 3 & 4: Request the Rewarded Ad in the background without locking button UI.
   * Deduplicates concurrent calls via a shared promise.
   */
  public async loadRewardedAd(): Promise<boolean> {
    if (!this.isNativeBridgePresent()) {
      return false;
    }

    if (this.loadRewardedPromise) {
      return this.loadRewardedPromise;
    }

    this.loadRewardedPromise = (async () => {
      try {
        const placementId = this.getRewardedPlacement();

        // 1. Check if native already has an ad loaded
        const currentStatus = await this.withTimeout(
          this.callNative<{ loaded: boolean; loading?: boolean; lastError?: string }>('isAdLoaded', {
            placementId,
          }),
          2500,
          { loaded: false, loading: false }
        ).catch(() => ({ loaded: false, loading: false, lastError: undefined }));

        if (currentStatus && currentStatus.loaded) {
          this.rewardedRetryCount = 0;
          this.lastError = null;
          this.setAdState('READY');
          return true;
        }

        // 2. Ensure SDK is initialized
        if (!this.isInitialized) {
          await this.initializeUnityAds();
        }

        // 3. Request load from native plugin
        console.debug('[UnityAds] Requesting Rewarded Ad load for:', placementId);

        const res = await this.withTimeout(
          this.callNative<{ success: boolean; placementId: string }>('loadAd', { placementId }),
          15000,
          { success: false, placementId }
        );

        if (res && res.success) {
          this.rewardedRetryCount = 0;
          this.lastError = null;
          this.setAdState('READY');
          return true;
        }

        const fallbackStatus = await this.withTimeout(
          this.callNative<{ loaded: boolean; lastError?: string }>('isAdLoaded', { placementId }),
          2000,
          { loaded: false }
        ).catch(() => ({ loaded: false, lastError: undefined }));

        if (fallbackStatus && fallbackStatus.loaded) {
          this.rewardedRetryCount = 0;
          this.lastError = null;
          this.setAdState('READY');
          return true;
        }

        if (fallbackStatus?.lastError) {
          this.lastError = fallbackStatus.lastError;
        }

        this.setAdState(this.isOnline() ? 'FAILED' : 'UNAVAILABLE');
        if (this.isOnline()) {
          this.scheduleRewardedRetry();
        }
        return false;
      } catch (err: any) {
        const rawErr = err?.message || String(err);
        console.warn('[UnityAds] loadRewardedAd error:', rawErr);
        this.lastError = rawErr;
        if (!this.isShowingRewarded) {
          this.setAdState(this.isOnline() ? 'FAILED' : 'UNAVAILABLE');
        }
        if (this.isOnline()) {
          this.scheduleRewardedRetry();
        }
        return false;
      } finally {
        this.loadRewardedPromise = null;
      }
    })();

    return this.loadRewardedPromise;
  }

  /**
   * Synchronize JS state with native plugin readiness without blocking UI buttons
   */
  public async checkRewardedAdReady(): Promise<boolean> {
    if (!this.isNativeBridgePresent()) return false;
    try {
      const placementId = this.getRewardedPlacement();
      const res = await this.withTimeout(
        this.callNative<{ loaded: boolean; loading?: boolean; lastError?: string }>('isAdLoaded', {
          placementId,
        }),
        2500,
        { loaded: false, loading: false }
      ).catch(() => ({ loaded: false, loading: false, lastError: undefined }));

      if (res && res.loaded) {
        this.rewardedRetryCount = 0;
        this.lastError = null;
        this.setAdState('READY');
        return true;
      }

      if (res?.lastError) {
        this.lastError = res.lastError;
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * Step 6, 7, 8:
   * - Show the ad when the player taps the Watch Ad button.
   * - If not yet cached, native showAd automatically initializes (if needed), loads, and displays it on the same tap.
   * - Grant reward (+1 life, coins, hints) ONLY after official reward-completion callback.
   * - Load the next Rewarded Ad in background after the previous ad finishes or fails.
   */
  public async showRewardedAd(): Promise<RewardedAdResult> {
    if (this.isShowingRewarded) {
      return {
        success: false,
        rewardGranted: false,
        errorReason: 'ALREADY_CLAIMED',
        message: 'An advertisement is already displaying.',
      };
    }

    if (!this.isNativeBridgePresent()) {
      return {
        success: false,
        rewardGranted: false,
        errorReason: 'UNAVAILABLE',
        message: 'Unity Ads are available in the installed Android app.',
      };
    }

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      this.setAdState('UNAVAILABLE');
      return {
        success: false,
        rewardGranted: false,
        errorReason: 'UNAVAILABLE',
        message: 'No internet connection. Please connect to the internet to watch an ad.',
      };
    }

    try {
      const placementId = this.getRewardedPlacement();

      this.isShowingRewarded = true;
      this.setAdState('SHOWING');
      console.debug('[UnityAds] Requesting showAd for placement:', placementId);

      // Native showAd displays immediately if cached, or waits for load completion and shows automatically
      const showResult = await this.callNative<{
        placementId: string;
        resolvedPlacementId?: string;
        state: string;
        completed: boolean;
        skipped: boolean;
      }>('showAd', { placementId });

      this.isShowingRewarded = false;
      this.lastRewardedTime = Date.now();

      // Verified COMPLETED reward callback from Unity Ads SDK
      if (showResult && showResult.completed) {
        console.debug('[UnityAds] Reward verified via official COMPLETED callback.');
        this.lastError = null;
        this.setAdState('UNINITIALIZED');
        this.scheduleRewardedRetry(800);

        return {
          success: true,
          rewardGranted: true,
          message: 'Reward verified and granted!',
        };
      }

      // Skipped ad - strictly NO reward
      if (showResult && showResult.skipped) {
        console.debug('[UnityAds] Ad skipped by user. Reward not granted.');
        this.setAdState('FAILED');
        this.scheduleRewardedRetry(800);

        return {
          success: true,
          rewardGranted: false,
          errorReason: 'SKIPPED',
          message: 'Ad was skipped before completion. Watch the full ad to earn the reward.',
        };
      }

      // Dismissed or closed prematurely
      this.setAdState('FAILED');
      this.scheduleRewardedRetry(1000);
      return {
        success: false,
        rewardGranted: false,
        errorReason: 'USER_DISMISSED',
        message: 'Ad was closed before completion.',
      };
    } catch (err: any) {
      this.isShowingRewarded = false;
      const errorCode = err?.code || undefined;
      const rawMsg = err?.message || String(err);
      console.warn('[UnityAds] showRewardedAd error:', errorCode, rawMsg);
      this.lastError = errorCode ? `[${errorCode}] ${rawMsg}` : rawMsg;
      this.setAdState(this.isOnline() ? 'FAILED' : 'UNAVAILABLE');
      this.scheduleRewardedRetry(UNITY_ADS_CONFIG.RETRY_DELAY_MS);

      return {
        success: false,
        rewardGranted: false,
        errorReason: 'LOAD_FAILED',
        errorCode,
        message: rawMsg || 'Advertisement failed to load. Please check your internet connection and try again.',
      };
    } finally {
      this.isShowingRewarded = false;
    }
  }

  /**
   * Load Interstitial Ad using official native Unity Ads SDK
   */
  public async loadInterstitialAd(): Promise<boolean> {
    if (!this.isNativeBridgePresent()) return false;
    if (!this.isOnline()) return false;
    if (this.loadInterstitialPromise) return this.loadInterstitialPromise;

    this.loadInterstitialPromise = (async () => {
      try {
        if (!this.isInitialized) {
          await this.initializeUnityAds();
        }
        const placementId = this.getInterstitialPlacement();
        const currentStatus = await this.withTimeout(
          this.callNative<{ loaded: boolean }>('isAdLoaded', { placementId }),
          2500,
          { loaded: false }
        ).catch(() => ({ loaded: false }));

        if (currentStatus && currentStatus.loaded) {
          this.interstitialRetryCount = 0;
          return true;
        }

        console.debug('[UnityAds] Loading Interstitial Ad placement:', placementId);
        const res = await this.withTimeout(
          this.callNative<{ success: boolean; placementId: string }>('loadAd', { placementId }),
          15000,
          { success: false, placementId }
        );
        const loaded = Boolean(res && res.success);
        if (loaded) {
          this.interstitialRetryCount = 0;
        } else if (this.isOnline()) {
          this.scheduleInterstitialRetry();
        }
        return loaded;
      } catch (err) {
        console.warn('[UnityAds] loadInterstitialAd error:', err);
        if (this.isOnline()) {
          this.scheduleInterstitialRetry();
        }
        return false;
      } finally {
        this.loadInterstitialPromise = null;
      }
    })();

    return this.loadInterstitialPromise;
  }

  public canShowInterstitial(): boolean {
    if (!this.isNativeBridgePresent()) return false;
    if (!this.isOnline()) return false;
    if (this.isShowingInterstitial || this.isShowingRewarded) return false;

    const now = Date.now();

    const timeSinceLastInterstitial = now - this.lastInterstitialTime;
    if (timeSinceLastInterstitial < UNITY_ADS_CONFIG.INTERSTITIAL_COOLDOWN_MS) {
      return false;
    }

    const timeSinceLastRewarded = now - this.lastRewardedTime;
    if (timeSinceLastRewarded < UNITY_ADS_CONFIG.REWARDED_COOLDOWN_FOR_INTERSTITIAL_MS) {
      return false;
    }

    const windowStart = now - UNITY_ADS_CONFIG.ROLLING_WINDOW_MS;
    this.recentInterstitialTimestamps = this.recentInterstitialTimestamps.filter((t) => t > windowStart);
    if (this.recentInterstitialTimestamps.length >= UNITY_ADS_CONFIG.MAX_INTERSTITIALS_PER_30_MIN) {
      return false;
    }

    return this.completedLevelsSinceLastAd >= UNITY_ADS_CONFIG.LEVELS_BETWEEN_INTERSTITIALS;
  }

  public recordLevelCompleted(): void {
    this.completedLevelsSinceLastAd += 1;
    // Proactively preload interstitial when approaching threshold
    if (this.isNativeBridgePresent() && this.isOnline()) {
      this.loadInterstitialAd();
    }
  }

  public async showInterstitialAd(): Promise<boolean> {
    if (!this.canShowInterstitial()) return false;

    try {
      const placementId = this.getInterstitialPlacement();

      this.isShowingInterstitial = true;
      console.debug('[UnityAds] Showing Interstitial Ad:', placementId);

      // Native showAd displays immediately if cached, or loads and shows within timeout
      const res = await this.withTimeout(
        this.callNative<{ completed: boolean; skipped: boolean }>('showAd', { placementId }),
        15000,
        { completed: false, skipped: false }
      );

      this.isShowingInterstitial = false;
      if (res && (res.completed || res.skipped)) {
        const now = Date.now();
        this.lastInterstitialTime = now;
        this.recentInterstitialTimestamps.push(now);
        this.completedLevelsSinceLastAd = 0;
        this.scheduleInterstitialRetry(1000);
        return true;
      }

      this.scheduleInterstitialRetry(UNITY_ADS_CONFIG.RETRY_DELAY_MS);
      return false;
    } catch (err) {
      console.warn('[UnityAds] showInterstitialAd error:', err);
      this.isShowingInterstitial = false;
      this.scheduleInterstitialRetry(UNITY_ADS_CONFIG.RETRY_DELAY_MS);
      return false;
    } finally {
      this.isShowingInterstitial = false;
    }
  }

  public getAdState(): AdLoadState {
    return this.adState;
  }

  public isAdReady(): boolean {
    return this.adState === 'READY';
  }

  public subscribe(listener: (state: AdLoadState, lastError: string | null) => void): () => void {
    this.listeners.add(listener);
    listener(this.adState, this.lastError);
    return () => this.listeners.delete(listener);
  }

  public async setPrivacyConsent(options: {
    gdprConsent?: boolean;
    ccpaConsent?: boolean;
    nonBehavioral?: boolean;
  }): Promise<boolean> {
    if (!this.isNativeBridgePresent()) return true;
    try {
      const res = await this.callNative<{ success: boolean }>('setPrivacyConsent', options);
      return res?.success ?? true;
    } catch {
      return false;
    }
  }

  private setAdState(state: AdLoadState) {
    if (this.adState === state) return;
    this.adState = state;
    this.listeners.forEach((l) => l(state, this.lastError));
  }
}

export const unityAdsService = new UnityAdsService();

export const loadRewardedAd = () => unityAdsService.loadRewardedAd();
export const preloadRewardedAd = () => unityAdsService.loadRewardedAd();
export const isRewardedAdReady = () => unityAdsService.isAdReady();
export const checkRewardedAdReady = () => unityAdsService.checkRewardedAdReady();
export const showRewardedAd = () => unityAdsService.showRewardedAd();
export const setPrivacyConsent = (options: {
  gdprConsent?: boolean;
  ccpaConsent?: boolean;
  nonBehavioral?: boolean;
}) => unityAdsService.setPrivacyConsent(options);
export const subscribeToAdState = (listener: (state: AdLoadState, lastError?: string | null) => void) =>
  unityAdsService.subscribe(listener);
export const recordLevelCompletedForAds = () => unityAdsService.recordLevelCompleted();
export const canShowInterstitialAd = () => unityAdsService.canShowInterstitial();
export const showInterstitialAd = () => unityAdsService.showInterstitialAd();
export const loadInterstitialAd = () => unityAdsService.loadInterstitialAd();
