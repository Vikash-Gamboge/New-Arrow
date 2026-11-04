package com.vikashgamboge.arrowmaster;

import android.os.Bundle;
import android.util.Log;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "MainActivity";
    private static final String UNITY_ADS_PLUGIN_CLASS = "com.vikashgamboge.arrowmaster.UnityAdsPlugin";
    private static final String UNITY_ADS_PLUGIN_NAME = "UnityAdsPlugin";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // 1. Check if UnityAdsPlugin is already listed in assets/capacitor.plugins.json.
        // If not present in assets/capacitor.plugins.json, register it before super.onCreate()
        // so BridgeActivity loads it exactly once without duplicate plugin instantiation.
        boolean inPluginsJson = isPluginInCapacitorJson(UNITY_ADS_PLUGIN_CLASS);
        if (!inPluginsJson) {
            registerPlugin(UnityAdsPlugin.class);
            Log.i(TAG, "UnityAdsPlugin registered via MainActivity.registerPlugin()");
        } else {
            Log.i(TAG, "UnityAdsPlugin listed in assets/capacitor.plugins.json; BridgeActivity will auto-load it");
        }

        // 2. Dynamically register optional AdMob Plugin if present (Google Play flavor only)
        try {
            Class<?> admobClass = Class.forName("com.vikashgamboge.arrowmaster.AdMobPlugin");
            if (Plugin.class.isAssignableFrom(admobClass)) {
                @SuppressWarnings("unchecked")
                Class<? extends Plugin> pluginClass = (Class<? extends Plugin>) admobClass;
                registerPlugin(pluginClass);
                Log.i(TAG, "AdMobPlugin successfully registered for Google Play flavor");
            }
        } catch (ClassNotFoundException e) {
            Log.i(TAG, "AdMobPlugin not present; running with Unity Ads (Amazon Appstore build)");
        } catch (Exception e) {
            Log.w(TAG, "Optional AdMobPlugin could not be registered: " + e.getMessage());
        }

        super.onCreate(savedInstanceState);

        // 3. Post-initialization verification: guarantee UnityAdsPlugin is registered on the active Bridge
        Bridge activeBridge = getBridge();
        if (activeBridge != null && activeBridge.getPlugin(UNITY_ADS_PLUGIN_NAME) == null) {
            Log.w(TAG, "UnityAdsPlugin was missing from Bridge after super.onCreate(); registering directly on Bridge");
            activeBridge.registerPlugin(UnityAdsPlugin.class);
        }
    }

    private boolean isPluginInCapacitorJson(String className) {
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(getAssets().open("capacitor.plugins.json"), StandardCharsets.UTF_8))) {
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                sb.append(line);
            }
            return sb.toString().contains(className);
        } catch (Exception e) {
            Log.w(TAG, "Could not inspect capacitor.plugins.json: " + e.getMessage());
            return false;
        }
    }
}
