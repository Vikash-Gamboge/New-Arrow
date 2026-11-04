package com.vikashgamboge.arrowmaster;

import android.app.Activity;
import android.content.Context;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.NetworkInfo;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import com.unity3d.ads.IUnityAdsInitializationListener;
import com.unity3d.ads.IUnityAdsLoadListener;
import com.unity3d.ads.IUnityAdsShowListener;
import com.unity3d.ads.UnityAds;
import com.unity3d.ads.UnityAdsLoadOptions;
import com.unity3d.ads.UnityAdsShowOptions;
import com.unity3d.ads.metadata.MetaData;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;

@CapacitorPlugin(name = "UnityAdsPlugin")
public class UnityAdsPlugin extends Plugin {

    private static final String TAG = "UnityAdsPlugin";

    // Exact Unity Dashboard Values (Rewarded & Interstitial only - Zero Banner Ads)
    private static final String DEFAULT_GAME_ID = "800417555";
    private static final String REWARDED_PLACEMENT = "BP_Rewarded_Android";
    private static final String INTERSTITIAL_PLACEMENT = "BP_Interstitial_Android";

    // Unity Ads opportunities expire after ~4-5 minutes; refresh anything older than 3.5 minutes
    private static final long PLACEMENT_EXPIRY_MS = 210_000L;

    // Static shared state so SDK singleton state and Capacitor plugin instance never desync
    private static final AtomicBoolean isInitializing = new AtomicBoolean(false);
    private static final AtomicBoolean isShowingAd = new AtomicBoolean(false);
    private static final AtomicBoolean isNetworkConnected = new AtomicBoolean(true);

    private static final AtomicInteger initRetryAttempt = new AtomicInteger(0);
    private static final Map<String, Integer> loadRetryAttempts = new ConcurrentHashMap<>();
    private static final Map<String, Runnable> scheduledRetryRunnables = new ConcurrentHashMap<>();
    private static Runnable scheduledInitRetryRunnable = null;

    private static final Set<String> loadedPlacements = Collections.synchronizedSet(new HashSet<>());
    private static final Map<String, Long> loadedTimestamps = new ConcurrentHashMap<>();
    private static final Set<String> loadingPlacements = Collections.synchronizedSet(new HashSet<>());
    private static final Map<String, String> lastLoadErrors = new ConcurrentHashMap<>();

    private static final List<PluginCall> pendingInitCalls = Collections.synchronizedList(new ArrayList<>());
    private static final List<Runnable> pendingAfterInitTasks = Collections.synchronizedList(new ArrayList<>());
    private static final Map<String, List<PluginCall>> pendingLoadCalls = new HashMap<>();
    private static final Map<String, List<Runnable>> pendingLoadCallbacks = new HashMap<>();

    private static final Handler mainHandler = new Handler(Looper.getMainLooper());

    private static volatile String activeGameId = DEFAULT_GAME_ID;
    private static volatile boolean activeTestMode = false;
    private static volatile String lastInitError = null;
    private static volatile UnityAdsPlugin activeInstance = null;

    private ConnectivityManager connectivityManager;
    private ConnectivityManager.NetworkCallback networkCallback;

    @Override
    public void load() {
        super.load();
        activeInstance = this;
        Log.i(TAG, "UnityAdsPlugin loaded by Capacitor Bridge (Game ID: " + DEFAULT_GAME_ID + ")");

        initNetworkMonitoring();

        // Always start Unity Ads SDK initialization on the UI thread at startup
        mainHandler.post(() -> {
            isNetworkConnected.set(isCurrentlyConnected());
            startNativeInitialization(activeGameId, activeTestMode, null);
        });
    }

    private void emitEventToJS(String eventName, JSObject data) {
        UnityAdsPlugin target = activeInstance != null ? activeInstance : this;
        try {
            target.notifyListeners(eventName, data);
        } catch (Exception e) {
            Log.w(TAG, "Failed to notify JS listeners for " + eventName + ": " + e.getMessage());
        }
    }

    private Context resolveBestContext() {
        UnityAdsPlugin target = activeInstance != null ? activeInstance : this;
        Activity activity = target.getActivity();
        if (activity != null && !activity.isFinishing() && !activity.isDestroyed()) {
            return activity;
        }
        if (getActivity() != null) {
            return getActivity();
        }
        if (target.getContext() != null) {
            return target.getContext();
        }
        return getContext();
    }

    private Activity resolveBestActivity() {
        UnityAdsPlugin target = activeInstance != null ? activeInstance : this;
        Activity activity = target.getActivity();
        if (activity != null) {
            return activity;
        }
        return getActivity();
    }

    private boolean isPlacementFreshlyLoaded(String placementId) {
        if (!loadedPlacements.contains(placementId)) {
            return false;
        }
        Long timestamp = loadedTimestamps.get(placementId);
        if (timestamp == null) {
            return true;
        }
        long ageMs = System.currentTimeMillis() - timestamp;
        if (ageMs > PLACEMENT_EXPIRY_MS) {
            Log.i(TAG, "Cached placement " + placementId + " expired after " + (ageMs / 1000) + "s; marking for reload");
            loadedPlacements.remove(placementId);
            loadedTimestamps.remove(placementId);
            return false;
        }
        return true;
    }

    private boolean isCurrentlyConnected() {
        try {
            Context ctx = resolveBestContext();
            if (ctx == null) return true;
            ConnectivityManager cm = (ConnectivityManager) ctx.getSystemService(Context.CONNECTIVITY_SERVICE);
            if (cm == null) return true;

            NetworkInfo activeInfo = cm.getActiveNetworkInfo();
            if (activeInfo != null && activeInfo.isConnectedOrConnecting()) {
                return true;
            }

            Network activeNet = cm.getActiveNetwork();
            if (activeNet != null) {
                NetworkCapabilities caps = cm.getNetworkCapabilities(activeNet);
                if (caps != null) {
                    if (caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) ||
                        caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) ||
                        caps.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) ||
                        caps.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET) ||
                        caps.hasTransport(NetworkCapabilities.TRANSPORT_VPN)) {
                        return true;
                    }
                } else {
                    return true;
                }
            }

            return false;
        } catch (Exception e) {
            Log.w(TAG, "Network check exception (defaulting to connected): " + e.getMessage());
            return true;
        }
    }

    private void cancelAllScheduledRetries() {
        if (scheduledInitRetryRunnable != null) {
            mainHandler.removeCallbacks(scheduledInitRetryRunnable);
            scheduledInitRetryRunnable = null;
        }
        for (Runnable r : scheduledRetryRunnables.values()) {
            mainHandler.removeCallbacks(r);
        }
        scheduledRetryRunnables.clear();
    }

    private void scheduleInitRetry() {
        if (scheduledInitRetryRunnable != null) {
            mainHandler.removeCallbacks(scheduledInitRetryRunnable);
        }
        if (UnityAds.isInitialized()) return;

        int attempt = initRetryAttempt.incrementAndGet();
        long delayMs = Math.min(3000L * attempt, 15000L);
        Log.d(TAG, "Scheduling Unity Ads init retry #" + attempt + " in " + delayMs + "ms");

        scheduledInitRetryRunnable = () -> {
            scheduledInitRetryRunnable = null;
            if (!UnityAds.isInitialized() && !isInitializing.get()) {
                startNativeInitialization(activeGameId, activeTestMode, null);
            }
        };
        mainHandler.postDelayed(scheduledInitRetryRunnable, delayMs);
    }

    private void schedulePlacementLoadRetry(final String placementId) {
        Runnable existing = scheduledRetryRunnables.remove(placementId);
        if (existing != null) {
            mainHandler.removeCallbacks(existing);
        }

        int currentAttempt = loadRetryAttempts.getOrDefault(placementId, 0) + 1;
        loadRetryAttempts.put(placementId, currentAttempt);
        long delayMs = Math.min(3000L * currentAttempt, 18000L);
        Log.d(TAG, "Scheduling background load retry #" + currentAttempt + " for " + placementId + " in " + delayMs + "ms");

        Runnable retryTask = () -> {
            scheduledRetryRunnables.remove(placementId);
            if (!isPlacementFreshlyLoaded(placementId) && !loadingPlacements.contains(placementId)) {
                if (UnityAds.isInitialized()) {
                    executeStandaloneLoad(placementId, null);
                } else {
                    startNativeInitialization(activeGameId, activeTestMode, null);
                }
            }
        };
        scheduledRetryRunnables.put(placementId, retryTask);
        mainHandler.postDelayed(retryTask, delayMs);
    }

    private void initNetworkMonitoring() {
        try {
            Context ctx = resolveBestContext();
            if (ctx == null) return;
            connectivityManager = (ConnectivityManager) ctx.getApplicationContext().getSystemService(Context.CONNECTIVITY_SERVICE);
            if (connectivityManager == null) return;

            boolean initialConnected = isCurrentlyConnected();
            isNetworkConnected.set(initialConnected);
            Log.d(TAG, "Initial network connected state: " + initialConnected);

            networkCallback = new ConnectivityManager.NetworkCallback() {
                @Override
                public void onAvailable(Network network) {
                    isNetworkConnected.set(true);
                    Log.i(TAG, "Network AVAILABLE event received");

                    initRetryAttempt.set(0);
                    loadRetryAttempts.clear();

                    mainHandler.post(() -> {
                        JSObject data = new JSObject();
                        data.put("connected", true);
                        emitEventToJS("networkStatusChanged", data);

                        if (!UnityAds.isInitialized()) {
                            Log.i(TAG, "Network available: Initializing Unity Ads SDK...");
                            startNativeInitialization(activeGameId, activeTestMode, null);
                        } else {
                            Log.i(TAG, "Network available: Preloading standard placements...");
                            preloadStandardPlacements();
                        }
                    });
                }

                @Override
                public void onLost(Network network) {
                    boolean stillConnected = isCurrentlyConnected();
                    isNetworkConnected.set(stillConnected);
                    Log.i(TAG, "Network LOST event received (stillConnected=" + stillConnected + ")");

                    if (!stillConnected) {
                        mainHandler.post(() -> {
                            JSObject data = new JSObject();
                            data.put("connected", false);
                            emitEventToJS("networkStatusChanged", data);
                        });
                    }
                }
            };

            connectivityManager.registerDefaultNetworkCallback(networkCallback);
        } catch (Exception e) {
            Log.w(TAG, "Could not register default network callback: " + e.getMessage());
            isNetworkConnected.set(true);
        }
    }

    private String normalizePlacementId(String requestedPlacement) {
        if (requestedPlacement == null || requestedPlacement.trim().isEmpty()) {
            return REWARDED_PLACEMENT;
        }
        String trimmed = requestedPlacement.trim();
        if (INTERSTITIAL_PLACEMENT.equalsIgnoreCase(trimmed)) {
            return INTERSTITIAL_PLACEMENT;
        }
        if (REWARDED_PLACEMENT.equalsIgnoreCase(trimmed)) {
            return REWARDED_PLACEMENT;
        }
        return trimmed;
    }

    private void applyDefaultPrivacyMetadata(Context context) {
        // Do NOT unconditionally set gdpr.consent=true, privacy.consent=true, or
        // privacy.useroverageLimit=true when explicit user consent has not been collected.
        // Unity Ads SDK handles regional privacy defaults unless explicit user consent is passed
        // via setPrivacyConsent().
        if (context == null) {
            Log.w(TAG, "Context unavailable during privacy metadata check");
        }
    }

    @PluginMethod
    public void initialize(PluginCall call) {
        activeInstance = this;
        String gameId = call.getString("gameId", DEFAULT_GAME_ID);
        Boolean testMode = call.getBoolean("testMode", false);

        if (gameId == null || gameId.trim().isEmpty()) {
            gameId = DEFAULT_GAME_ID;
        }

        final String finalGameId = gameId.trim();
        final boolean finalTestMode = testMode != null ? testMode : false;

        mainHandler.post(() -> startNativeInitialization(finalGameId, finalTestMode, call));
    }

    @PluginMethod
    public void setPrivacyConsent(PluginCall call) {
        activeInstance = this;
        Context ctx = resolveBestContext();
        if (ctx == null) {
            call.reject("CONTEXT_NULL", "Context unavailable for privacy configuration");
            return;
        }

        try {
            Context appCtx = ctx.getApplicationContext() != null ? ctx.getApplicationContext() : ctx;
            MetaData metaData = new MetaData(appCtx);
            boolean hasChanges = false;

            if (call.hasOption("gdprConsent")) {
                Boolean gdpr = call.getBoolean("gdprConsent");
                if (gdpr != null) {
                    metaData.set("gdpr.consent", gdpr);
                    hasChanges = true;
                }
            }
            if (call.hasOption("ccpaConsent")) {
                Boolean ccpa = call.getBoolean("ccpaConsent");
                if (ccpa != null) {
                    metaData.set("privacy.consent", ccpa);
                    hasChanges = true;
                }
            }
            if (call.hasOption("nonBehavioral")) {
                Boolean nonBehavioral = call.getBoolean("nonBehavioral");
                if (nonBehavioral != null) {
                    metaData.set("user.nonbehavioral", nonBehavioral);
                    hasChanges = true;
                }
            }
            if (call.hasOption("userOverageLimit")) {
                Boolean userOverageLimit = call.getBoolean("userOverageLimit");
                if (userOverageLimit != null) {
                    metaData.set("privacy.useroverageLimit", userOverageLimit);
                    hasChanges = true;
                }
            }
            if (hasChanges) {
                metaData.commit();
            }

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            Log.w(TAG, "Failed to set privacy consent: " + e.getMessage());
            call.reject("CONSENT_ERROR", e.getMessage());
        }
    }

    private void startNativeInitialization(final String gameId, final boolean testMode, final PluginCall call) {
        activeGameId = gameId;
        activeTestMode = testMode;

        if (UnityAds.isInitialized()) {
            Log.d(TAG, "Unity Ads SDK is already initialized (version " + UnityAds.getVersion() + ")");
            preloadStandardPlacements();
            drainPendingAfterInitTasks();
            if (call != null) {
                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("alreadyInitialized", true);
                ret.put("sdkVersion", UnityAds.getVersion());
                call.resolve(ret);
            }
            return;
        }

        if (call != null) {
            pendingInitCalls.add(call);
        }

        if (isInitializing.getAndSet(true)) {
            Log.d(TAG, "Unity Ads initialization already in progress; queued caller.");
            return;
        }

        // Prefer Activity context so UnityAds ClientProperties sets both Activity and Application
        Context initContext = resolveBestContext();
        if (initContext == null) {
            isInitializing.set(false);
            String msg = "Android Context is unavailable for Unity Ads initialization";
            lastInitError = "CONTEXT_NULL: " + msg;
            synchronized (pendingInitCalls) {
                for (PluginCall pending : pendingInitCalls) {
                    try {
                        pending.reject("CONTEXT_NULL", msg);
                    } catch (Exception ignored) {}
                }
                pendingInitCalls.clear();
            }
            return;
        }

        Log.i(TAG, "Initializing Unity Ads SDK v" + UnityAds.getVersion() + " with Game ID: " + gameId + ", testMode: " + testMode);

        try {
            applyDefaultPrivacyMetadata(initContext);

            UnityAds.initialize(initContext, gameId, testMode, new IUnityAdsInitializationListener() {
                @Override
                public void onInitializationComplete() {
                    mainHandler.post(() -> {
                        isInitializing.set(false);
                        initRetryAttempt.set(0);
                        lastInitError = null;
                        Log.i(TAG, "Unity Ads Initialization Completed Successfully (v" + UnityAds.getVersion() + ", Game ID: " + gameId + ")");

                        JSObject eventData = new JSObject();
                        eventData.put("initialized", true);
                        eventData.put("gameId", gameId);
                        eventData.put("sdkVersion", UnityAds.getVersion());
                        emitEventToJS("sdkInitialized", eventData);

                        synchronized (pendingInitCalls) {
                            for (PluginCall pending : pendingInitCalls) {
                                try {
                                    JSObject ret = new JSObject();
                                    ret.put("success", true);
                                    ret.put("gameId", gameId);
                                    ret.put("sdkVersion", UnityAds.getVersion());
                                    pending.resolve(ret);
                                } catch (Exception ignored) {}
                            }
                            pendingInitCalls.clear();
                        }

                        drainPendingAfterInitTasks();
                        preloadStandardPlacements();
                    });
                }

                @Override
                public void onInitializationFailed(final UnityAds.UnityAdsInitializationError error, final String message) {
                    mainHandler.post(() -> {
                        isInitializing.set(false);
                        String errCode = error != null ? error.name() : "UNKNOWN";
                        String errMsg = message != null ? message : "Initialization failed";
                        lastInitError = errCode + ": " + errMsg;
                        Log.e(TAG, "Unity Ads Initialization Failed [" + errCode + "]: " + errMsg);

                        JSObject eventData = new JSObject();
                        eventData.put("initialized", false);
                        eventData.put("errorCode", errCode);
                        eventData.put("message", errMsg);
                        emitEventToJS("sdkInitFailed", eventData);

                        synchronized (pendingInitCalls) {
                            for (PluginCall pending : pendingInitCalls) {
                                try {
                                    pending.reject(errCode, "Unity Ads Initialization Error [" + errCode + "]: " + errMsg);
                                } catch (Exception ignored) {}
                            }
                            pendingInitCalls.clear();
                        }

                        synchronized (pendingAfterInitTasks) {
                            pendingAfterInitTasks.clear();
                        }
                        rejectAllPendingLoads(errCode, "Unity Ads Initialization Error [" + errCode + "]: " + errMsg);

                        scheduleInitRetry();
                    });
                }
            });
        } catch (Exception e) {
            isInitializing.set(false);
            lastInitError = "EXCEPTION: " + e.getMessage();
            Log.e(TAG, "Unexpected error starting Unity Ads initialization", e);
            synchronized (pendingInitCalls) {
                for (PluginCall pending : pendingInitCalls) {
                    try {
                        pending.reject("INIT_FAILED", "Unexpected error initializing Unity Ads: " + e.getMessage());
                    } catch (Exception ignored) {}
                }
                pendingInitCalls.clear();
            }
            rejectAllPendingLoads("INIT_FAILED", "Unexpected error initializing Unity Ads: " + e.getMessage());
            scheduleInitRetry();
        }
    }

    private void drainPendingAfterInitTasks() {
        List<Runnable> tasks;
        synchronized (pendingAfterInitTasks) {
            tasks = new ArrayList<>(pendingAfterInitTasks);
            pendingAfterInitTasks.clear();
        }
        for (Runnable r : tasks) {
            mainHandler.post(r);
        }
    }

    private void rejectAllPendingLoads(String code, String message) {
        Map<String, List<PluginCall>> copy;
        synchronized (pendingLoadCalls) {
            copy = new HashMap<>(pendingLoadCalls);
            pendingLoadCalls.clear();
        }
        for (Map.Entry<String, List<PluginCall>> entry : copy.entrySet()) {
            lastLoadErrors.put(entry.getKey(), message);
            for (PluginCall c : entry.getValue()) {
                try {
                    c.reject(code, message);
                } catch (Exception ignored) {}
            }
        }
        List<Runnable> callbacksToRun = new ArrayList<>();
        synchronized (pendingLoadCallbacks) {
            for (List<Runnable> list : pendingLoadCallbacks.values()) {
                callbacksToRun.addAll(list);
            }
            pendingLoadCallbacks.clear();
        }
        for (Runnable r : callbacksToRun) {
            mainHandler.post(r);
        }
    }

    @PluginMethod
    public void isInitialized(PluginCall call) {
        activeInstance = this;
        boolean liveConnected = isCurrentlyConnected();
        JSObject ret = new JSObject();
        ret.put("initialized", UnityAds.isInitialized());
        ret.put("initializing", isInitializing.get());
        ret.put("connected", liveConnected);
        ret.put("gameId", activeGameId);
        ret.put("sdkVersion", UnityAds.getVersion());
        if (lastInitError != null) {
            ret.put("error", lastInitError);
        }
        call.resolve(ret);
    }

    @PluginMethod
    public void loadAd(final PluginCall call) {
        activeInstance = this;
        String requestedPlacement = call.getString("placementId", REWARDED_PLACEMENT);
        if (requestedPlacement == null || requestedPlacement.trim().isEmpty()) {
            call.reject("INVALID_ARGUMENT", "Placement ID is required");
            return;
        }

        final String placementId = normalizePlacementId(requestedPlacement);

        if (isPlacementFreshlyLoaded(placementId)) {
            Log.d(TAG, "Placement already loaded and fresh: " + placementId);
            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("placementId", placementId);
            ret.put("resolvedPlacementId", placementId);
            ret.put("alreadyLoaded", true);
            call.resolve(ret);
            return;
        }

        mainHandler.post(() -> {
            if (!UnityAds.isInitialized()) {
                Log.d(TAG, "Unity Ads not yet initialized when loadAd(" + placementId + ") called; queueing load.");
                synchronized (pendingLoadCalls) {
                    List<PluginCall> list = pendingLoadCalls.computeIfAbsent(placementId, k -> new ArrayList<>());
                    list.add(call);
                }
                pendingAfterInitTasks.add(() -> executeStandaloneLoad(placementId, null));
                startNativeInitialization(activeGameId, activeTestMode, null);
                return;
            }

            executeStandaloneLoad(placementId, call);
        });
    }

    private void executeStandaloneLoad(final String placementId, final PluginCall call) {
        if (isPlacementFreshlyLoaded(placementId)) {
            if (call != null) {
                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("placementId", placementId);
                ret.put("resolvedPlacementId", placementId);
                call.resolve(ret);
            }
            notifyPendingLoadCallbacks(placementId);
            return;
        }

        synchronized (pendingLoadCalls) {
            if (call != null) {
                List<PluginCall> list = pendingLoadCalls.computeIfAbsent(placementId, k -> new ArrayList<>());
                list.add(call);
            }
        }

        if (loadingPlacements.contains(placementId)) {
            Log.d(TAG, "Placement is already loading; queued callback for: " + placementId);
            return;
        }

        // Ensure current Activity is registered with Unity Ads ClientProperties before loading
        Activity currentAct = resolveBestActivity();
        if (currentAct != null) {
            try {
                com.unity3d.services.core.properties.ClientProperties.setActivity(currentAct);
            } catch ( Throwable ignored ) {}
        }

        loadingPlacements.add(placementId);
        Log.i(TAG, "Requesting UnityAds.load for placement: " + placementId);

        try {
            UnityAdsLoadOptions loadOptions = new UnityAdsLoadOptions();
            UnityAds.load(placementId, loadOptions, new IUnityAdsLoadListener() {
                @Override
                public void onUnityAdsAdLoaded(final String pId) {
                    mainHandler.post(() -> {
                        Log.i(TAG, "Unity Ad loaded successfully for placement: " + pId);
                        loadingPlacements.remove(pId);
                        loadingPlacements.remove(placementId);

                        long now = System.currentTimeMillis();
                        loadedPlacements.add(pId);
                        loadedPlacements.add(placementId);
                        loadedTimestamps.put(pId, now);
                        loadedTimestamps.put(placementId, now);
                        lastLoadErrors.remove(placementId);
                        loadRetryAttempts.remove(placementId);

                        Runnable pendingRetry = scheduledRetryRunnables.remove(placementId);
                        if (pendingRetry != null) {
                            mainHandler.removeCallbacks(pendingRetry);
                        }

                        JSObject eventData = new JSObject();
                        eventData.put("placementId", placementId);
                        eventData.put("resolvedPlacementId", pId);
                        eventData.put("loaded", true);
                        emitEventToJS("adLoaded", eventData);

                        resolvePendingLoadCalls(placementId, pId);
                        notifyPendingLoadCallbacks(placementId);
                    });
                }

                @Override
                public void onUnityAdsFailedToLoad(final String pId, final UnityAds.UnityAdsLoadError error, final String message) {
                    mainHandler.post(() -> {
                        String errCode = error != null ? error.name() : "LOAD_FAILED";
                        String errMsg = message != null ? message : "Ad failed to load";
                        Log.e(TAG, "Unity Ad failed to load for placement " + pId + " [" + errCode + "]: " + errMsg);

                        loadingPlacements.remove(pId);
                        loadingPlacements.remove(placementId);
                        loadedPlacements.remove(pId);
                        loadedPlacements.remove(placementId);
                        loadedTimestamps.remove(pId);
                        loadedTimestamps.remove(placementId);

                        String errDetail = "[" + errCode + "] " + errMsg;
                        lastLoadErrors.put(placementId, errDetail);

                        JSObject eventData = new JSObject();
                        eventData.put("placementId", placementId);
                        eventData.put("resolvedPlacementId", pId);
                        eventData.put("loaded", false);
                        eventData.put("errorCode", errCode);
                        eventData.put("message", errMsg);
                        emitEventToJS("adLoadFailed", eventData);

                        rejectPendingLoadCalls(placementId, errCode, "Unity Ads Load Error [" + errCode + "]: " + errMsg);
                        notifyPendingLoadCallbacks(placementId);

                        schedulePlacementLoadRetry(placementId);
                    });
                }
            });
        } catch (Exception e) {
            loadingPlacements.remove(placementId);
            String errDetail = "LOAD_EXCEPTION: " + e.getMessage();
            lastLoadErrors.put(placementId, errDetail);
            Log.e(TAG, "Exception during UnityAds.load for: " + placementId, e);
            rejectPendingLoadCalls(placementId, "LOAD_EXCEPTION", "Exception loading ad: " + e.getMessage());
            notifyPendingLoadCallbacks(placementId);
            schedulePlacementLoadRetry(placementId);
        }
    }

    private void notifyPendingLoadCallbacks(String placementId) {
        List<Runnable> callbacks;
        synchronized (pendingLoadCallbacks) {
            callbacks = pendingLoadCallbacks.remove(placementId);
        }
        if (callbacks != null) {
            for (Runnable r : callbacks) {
                mainHandler.post(r);
            }
        }
    }

    private void resolvePendingLoadCalls(String primaryPlacement, String actualPlacement) {
        List<PluginCall> calls;
        synchronized (pendingLoadCalls) {
            calls = pendingLoadCalls.remove(primaryPlacement);
        }
        if (calls != null) {
            for (PluginCall c : calls) {
                try {
                    JSObject ret = new JSObject();
                    ret.put("success", true);
                    ret.put("placementId", primaryPlacement);
                    ret.put("resolvedPlacementId", actualPlacement);
                    c.resolve(ret);
                } catch (Exception ignored) {}
            }
        }
    }

    private void rejectPendingLoadCalls(String primaryPlacement, String code, String message) {
        List<PluginCall> calls;
        synchronized (pendingLoadCalls) {
            calls = pendingLoadCalls.remove(primaryPlacement);
        }
        if (calls != null) {
            for (PluginCall c : calls) {
                try {
                    c.reject(code, message);
                } catch (Exception ignored) {}
            }
        }
    }

    @PluginMethod
    public void isAdLoaded(PluginCall call) {
        activeInstance = this;
        String requestedPlacement = call.getString("placementId", REWARDED_PLACEMENT);
        String placementId = normalizePlacementId(requestedPlacement);
        boolean isLoaded = isPlacementFreshlyLoaded(placementId);
        boolean isLoading = loadingPlacements.contains(placementId) || isInitializing.get();
        boolean liveConnected = isCurrentlyConnected();

        JSObject ret = new JSObject();
        ret.put("loaded", isLoaded);
        ret.put("loading", isLoading);
        ret.put("initialized", UnityAds.isInitialized());
        ret.put("initializing", isInitializing.get());
        ret.put("connected", liveConnected);
        ret.put("gameId", activeGameId);
        ret.put("resolvedPlacementId", placementId);
        if (lastLoadErrors.containsKey(placementId)) {
            ret.put("lastError", lastLoadErrors.get(placementId));
        } else if (lastInitError != null) {
            ret.put("lastError", lastInitError);
        }
        call.resolve(ret);
    }

    @PluginMethod
    public void showAd(final PluginCall call) {
        activeInstance = this;
        String requestedPlacement = call.getString("placementId", REWARDED_PLACEMENT);
        if (requestedPlacement == null || requestedPlacement.trim().isEmpty()) {
            call.reject("INVALID_ARGUMENT", "Placement ID is required");
            return;
        }

        if (isShowingAd.get()) {
            Log.w(TAG, "An ad is already currently displaying");
            call.reject("ALREADY_SHOWING", "An ad is already currently displaying.");
            return;
        }

        final Activity activity = resolveBestActivity();
        if (activity == null || activity.isFinishing() || activity.isDestroyed()) {
            Log.e(TAG, "Activity is not available to display ad");
            call.reject("ACTIVITY_UNAVAILABLE", "Activity is not available to display ad");
            return;
        }

        final String placementId = normalizePlacementId(requestedPlacement);

        if (isPlacementFreshlyLoaded(placementId) && UnityAds.isInitialized()) {
            performShowAd(activity, placementId, call, true);
            return;
        }

        loadAndShowAd(placementId, call);
    }

    private void loadAndShowAd(final String placementId, final PluginCall call) {
        Log.i(TAG, "showAd called while placement not yet cached (" + placementId + "); loading and awaiting readiness...");
        final AtomicBoolean handled = new AtomicBoolean(false);

        final Runnable timeoutRunnable = () -> {
            if (handled.compareAndSet(false, true)) {
                Log.w(TAG, "Timed out waiting for placement to load during showAd: " + placementId);
                String err = lastLoadErrors.get(placementId);
                if (err == null && lastInitError != null) {
                    err = lastInitError;
                }
                call.reject("NOT_READY", err != null ? err : "Advertisement timed out while loading. Please check your connection and try again.");
            }
        };

        mainHandler.postDelayed(timeoutRunnable, 14000L);

        Runnable onLoadFinished = () -> {
            if (handled.compareAndSet(false, true)) {
                mainHandler.removeCallbacks(timeoutRunnable);
                if (isPlacementFreshlyLoaded(placementId)) {
                    Activity currentAct = resolveBestActivity();
                    if (currentAct != null && !currentAct.isFinishing() && !currentAct.isDestroyed()) {
                        performShowAd(currentAct, placementId, call, false);
                    } else {
                        call.reject("ACTIVITY_UNAVAILABLE", "Activity is not available to display ad");
                    }
                } else {
                    String err = lastLoadErrors.get(placementId);
                    if (err == null && lastInitError != null) {
                        err = lastInitError;
                    }
                    call.reject("LOAD_FAILED", err != null ? err : "Advertisement failed to load.");
                }
            }
        };

        synchronized (pendingLoadCallbacks) {
            List<Runnable> list = pendingLoadCallbacks.computeIfAbsent(placementId, k -> new ArrayList<>());
            list.add(onLoadFinished);
        }

        mainHandler.post(() -> {
            if (!UnityAds.isInitialized()) {
                pendingAfterInitTasks.add(() -> executeStandaloneLoad(placementId, null));
                startNativeInitialization(activeGameId, activeTestMode, null);
            } else {
                executeStandaloneLoad(placementId, null);
            }
        });
    }

    private void performShowAd(final Activity activity, final String placementId, final PluginCall call, final boolean allowReloadFallback) {
        if (!isShowingAd.compareAndSet(false, true)) {
            call.reject("ALREADY_SHOWING", "An ad is already currently displaying.");
            return;
        }

        Log.i(TAG, "Showing Unity Ad for placement: " + placementId);

        activity.runOnUiThread(() -> {
            try {
                UnityAdsShowOptions showOptions = new UnityAdsShowOptions();
                UnityAds.show(activity, placementId, showOptions, new IUnityAdsShowListener() {
                    @Override
                    public void onUnityAdsShowFailure(final String pId, final UnityAds.UnityAdsShowError error, final String message) {
                        mainHandler.post(() -> {
                            isShowingAd.set(false);
                            loadedPlacements.remove(pId);
                            loadedPlacements.remove(placementId);
                            loadedTimestamps.remove(pId);
                            loadedTimestamps.remove(placementId);

                            String errCode = error != null ? error.name() : "SHOW_FAILED";
                            String errMsg = message != null ? message : "Ad failed to show";
                            String errDetail = "[" + errCode + "] " + errMsg;
                            lastLoadErrors.put(placementId, errDetail);
                            Log.e(TAG, "Unity Ad show failed for " + pId + " [" + errCode + "]: " + errMsg);

                            // If cached opportunity expired in SDK before show, reload and show immediately
                            if (allowReloadFallback &&
                                (error == UnityAds.UnityAdsShowError.INVALID_ARGUMENT ||
                                 error == UnityAds.UnityAdsShowError.NOT_READY ||
                                 error == UnityAds.UnityAdsShowError.NOT_INITIALIZED)) {
                                Log.i(TAG, "Cached ad opportunity expired before show; reloading and displaying fresh ad for: " + placementId);
                                loadAndShowAd(placementId, call);
                                return;
                            }

                            triggerBackgroundReload(placementId);
                            call.reject(errCode, "Unity Ads Show Error [" + errCode + "]: " + errMsg);
                        });
                    }

                    @Override
                    public void onUnityAdsShowStart(String pId) {
                        Log.i(TAG, "Unity Ad show started for: " + pId);
                    }

                    @Override
                    public void onUnityAdsShowClick(String pId) {
                        Log.d(TAG, "Unity Ad clicked: " + pId);
                    }

                    @Override
                    public void onUnityAdsShowComplete(final String pId, final UnityAds.UnityAdsShowCompletionState state) {
                        mainHandler.post(() -> {
                            isShowingAd.set(false);
                            loadedPlacements.remove(pId);
                            loadedPlacements.remove(placementId);
                            loadedTimestamps.remove(pId);
                            loadedTimestamps.remove(placementId);
                            Log.i(TAG, "Unity Ad show complete for " + pId + ", state: " + state.name());

                            triggerBackgroundReload(placementId);

                            JSObject ret = new JSObject();
                            ret.put("placementId", placementId);
                            ret.put("resolvedPlacementId", pId);
                            ret.put("state", state.name());
                            ret.put("completed", state == UnityAds.UnityAdsShowCompletionState.COMPLETED);
                            ret.put("skipped", state == UnityAds.UnityAdsShowCompletionState.SKIPPED);
                            call.resolve(ret);
                        });
                    }
                });
            } catch (Exception e) {
                isShowingAd.set(false);
                loadedPlacements.remove(placementId);
                loadedTimestamps.remove(placementId);
                Log.e(TAG, "Exception during UnityAds.show for: " + placementId, e);
                triggerBackgroundReload(placementId);
                call.reject("SHOW_FAILED", "Exception showing ad: " + e.getMessage());
            }
        });
    }

    private void preloadStandardPlacements() {
        if (!UnityAds.isInitialized()) return;
        Log.d(TAG, "Preloading standard Unity Ads placements (BP_Rewarded_Android & BP_Interstitial_Android)...");
        if (!isPlacementFreshlyLoaded(REWARDED_PLACEMENT) && !loadingPlacements.contains(REWARDED_PLACEMENT)) {
            executeStandaloneLoad(REWARDED_PLACEMENT, null);
        }
        if (!isPlacementFreshlyLoaded(INTERSTITIAL_PLACEMENT) && !loadingPlacements.contains(INTERSTITIAL_PLACEMENT)) {
            executeStandaloneLoad(INTERSTITIAL_PLACEMENT, null);
        }
    }

    private void triggerBackgroundReload(String placementId) {
        mainHandler.postDelayed(() -> {
            try {
                if (UnityAds.isInitialized()) {
                    executeStandaloneLoad(placementId, null);
                }
            } catch (Exception e) {
                Log.w(TAG, "Background reload failed for: " + placementId, e);
            }
        }, 1000);
    }

    @Override
    protected void handleOnResume() {
        super.handleOnResume();
        activeInstance = this;
        isNetworkConnected.set(isCurrentlyConnected());
        mainHandler.post(() -> {
            if (!UnityAds.isInitialized()) {
                startNativeInitialization(activeGameId, activeTestMode, null);
            } else {
                preloadStandardPlacements();
            }
        });
    }

    @Override
    protected void handleOnDestroy() {
        super.handleOnDestroy();
        cancelAllScheduledRetries();
        if (connectivityManager != null && networkCallback != null) {
            try {
                connectivityManager.unregisterNetworkCallback(networkCallback);
            } catch (Exception ignored) {}
            networkCallback = null;
        }
        if (activeInstance == this) {
            activeInstance = null;
        }
    }
}
