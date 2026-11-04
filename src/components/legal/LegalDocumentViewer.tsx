import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  ShieldCheck,
  FileText,
  Info,
  Gamepad2,
} from 'lucide-react';
import { sound } from '../../game/sound';

export type LegalPageType = 'privacy' | 'terms' | 'about';

export const OFFICIAL_PRIVACY_POLICY_URL =
  'https://sites.google.com/view/arrow-master2-privacy-policy/home';
export const OFFICIAL_TERMS_OF_USE_URL =
  'https://sites.google.com/view/arrow-master2-terms-of-use/home';

interface WindowWithLegalBack extends Window {
  __handleLegalViewerBack?: () => boolean;
}

interface LegalDocumentViewerProps {
  pageType: LegalPageType;
  onBack: () => void;
  isStandalone?: boolean;
  onLaunchGame?: () => void;
}

export const LegalDocumentViewer: React.FC<LegalDocumentViewerProps> = ({
  pageType,
  onBack,
  isStandalone = false,
  onLaunchGame,
}) => {
  const [browserError, setBrowserError] = useState<string | null>(null);
  const currentYear = new Date().getFullYear();
  const APP_VERSION = '1.0.0';

  const handleBack = () => {
    sound.playTap();
    onBack();
  };

  useEffect(() => {
    setBrowserError(null);
  }, [pageType]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const win = window as WindowWithLegalBack;
    win.__handleLegalViewerBack = () => {
      onBack();
      return true;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onBack();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      delete win.__handleLegalViewerBack;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onBack]);

  const handleOpenExternalUrl = (
    e: React.MouseEvent<HTMLAnchorElement>,
    url: string,
    docLabel: string
  ) => {
    sound.playTap();
    setBrowserError(null);

    try {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        e.preventDefault();
        setBrowserError(
          `Unable to open the external ${docLabel} page while your device is offline. Please connect to the internet and try again.`
        );
        return;
      }
      if (!url || !url.startsWith('https://')) {
        e.preventDefault();
        setBrowserError(`Unable to open the ${docLabel} link on this device.`);
      }
    } catch {
      e.preventDefault();
      setBrowserError(
        `Could not launch an external browser on this device to view the ${docLabel}.`
      );
    }
  };

  const renderContent = () => {
    switch (pageType) {
      case 'privacy':
        return (
          <div className="space-y-5 text-slate-700 text-[13.5px] sm:text-sm leading-[1.68] font-normal tracking-[-0.005em] text-left break-words overflow-x-hidden">
            {/* Header Identity Summary */}
            <div className="p-4 rounded-2xl bg-blue-50/80 border border-blue-100/90 text-blue-950 space-y-1.5">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-600 block">
                PRIVACY POLICY
              </span>
              <p className="text-sm sm:text-[15px] font-bold leading-snug text-slate-900">
                Application Name: Arrow Master: Puzzle Escape
              </p>
              <p className="text-[13px] text-slate-700 leading-snug">
                Developer / Publisher:{' '}
                <strong className="font-bold text-slate-900">Vikash Gamboge</strong>
              </p>
              <p className="text-[13px] text-slate-700 leading-snug break-all">
                Contact Email:{' '}
                <strong className="font-bold text-slate-900">vikashtopofficial@gmail.com</strong>
              </p>
            </div>

            <section className="space-y-2.5">
              <h4 className="text-[14px] sm:text-[15px] font-extrabold text-slate-900 uppercase tracking-tight leading-snug">
                1. OVERVIEW
              </h4>
              <p>
                This Privacy Policy explains how information is handled when you install and play{' '}
                <strong className="font-bold text-slate-900">Arrow Master: Puzzle Escape</strong>{' '}
                (the &quot;Game&quot;), developed and published by{' '}
                <strong className="font-bold text-slate-900">Vikash Gamboge</strong>{' '}
                (&quot;Developer&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;). This
                policy is based on the actual technical implementation of the Game.
              </p>
            </section>

            <section className="space-y-2.5">
              <h4 className="text-[14px] sm:text-[15px] font-extrabold text-slate-900 uppercase tracking-tight leading-snug">
                2. DIRECT COLLECTION OF PERSONAL INFORMATION
              </h4>
              <p>
                We do not require you to create an account, register, or log in to play{' '}
                <strong className="font-bold text-slate-900">Arrow Master: Puzzle Escape</strong>.
                We do not directly collect, store on external servers, or request personally
                identifiable information such as your real name, residential address, phone number,
                payment information, contacts, photos, microphone audio, or precise GPS location.
              </p>
              <p>
                If you choose to contact us directly via email (
                <strong className="font-bold text-slate-900">vikashtopofficial@gmail.com</strong>)
                for customer support or privacy inquiries, we will receive your email address and
                any information you voluntarily include in your message solely for the purpose of
                responding to your inquiry.
              </p>
            </section>

            <section className="space-y-2.5">
              <h4 className="text-[14px] sm:text-[15px] font-extrabold text-slate-900 uppercase tracking-tight leading-snug">
                3. INFORMATION STORED LOCALLY ON YOUR DEVICE
              </h4>
              <p>
                To save your gameplay progress and preferences,{' '}
                <strong className="font-bold text-slate-900">Arrow Master: Puzzle Escape</strong>{' '}
                stores data locally on your device using standard application local storage
                (localStorage). This locally stored data is not transmitted to us and includes:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-slate-700">
                <li>
                  <strong className="font-bold text-slate-900">
                    Level &amp; Mode Progression:
                  </strong>{' '}
                  Your current and highest unlocked level in Classic Arrow Puzzle mode, your
                  highest unlocked stage in Snake Arrow mode, completed Daily Challenge dates, and
                  locally cached daily puzzle layouts.
                </li>
                <li>
                  <strong className="font-bold text-slate-900">
                    Virtual Coins &amp; Daily Rewards:
                  </strong>{' '}
                  Your virtual coin balance, your last daily login reward claim date, and your
                  current 7-day login streak count.
                </li>
                <li>
                  <strong className="font-bold text-slate-900">
                    Player Profile Customizations:
                  </strong>{' '}
                  The optional display nickname (up to 14 characters, defaulting to
                  &quot;ArrowMaster&quot;) and emoji avatar icon you select on the Home screen.
                  These remain strictly on your device.
                </li>
                <li>
                  <strong className="font-bold text-slate-900">
                    Game Settings &amp; Preferences:
                  </strong>{' '}
                  Your sound effects toggle, background music toggle, vibration/haptic feedback
                  preference, and selected visual board theme.
                </li>
                <li>
                  <strong className="font-bold text-slate-900">
                    Local Gameplay Statistics:
                  </strong>{' '}
                  Local records of levels started and completed on your device.
                </li>
              </ul>
              <p>
                Because this data is stored locally within the application&apos;s storage on your
                device, clearing the application&apos;s storage/data in your device settings or
                uninstalling the Game will remove this local progress and reset settings to their
                defaults.
              </p>
            </section>

            <section className="space-y-2.5">
              <h4 className="text-[14px] sm:text-[15px] font-extrabold text-slate-900 uppercase tracking-tight leading-snug">
                4. THIRD-PARTY ADVERTISING (UNITY ADS)
              </h4>
              <p>
                To provide{' '}
                <strong className="font-bold text-slate-900">Arrow Master: Puzzle Escape</strong> as
                a free-to-play game, the Android application integrates the{' '}
                <strong className="font-bold text-slate-900">Unity Ads SDK</strong> provided by{' '}
                <strong className="font-bold text-slate-900">Unity Technologies</strong>.
              </p>
              <p className="font-bold text-slate-900 pt-0.5">
                How Advertisements Appear in the Game:
              </p>
              <p>
                The Game uses Unity Ads to serve two types of advertisements when your device is
                connected to the internet:
              </p>
              <p>
                <strong className="font-bold text-slate-900">
                  1) Optional Rewarded Video Advertisements:
                </strong>{' '}
                Triggered only when you voluntarily tap an option to watch an advertisement in
                exchange for an in-game reward:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-slate-700">
                <li>
                  <strong className="font-bold text-slate-900">Out of Lives:</strong> Watching a
                  rewarded ad on the &quot;Out of Lives&quot; screen to receive +1 Life and
                  continue the current puzzle.
                </li>
                <li>
                  <strong className="font-bold text-slate-900">Daily Reward Bonus:</strong>{' '}
                  Watching a rewarded ad in the Daily Reward window on the Home screen to receive
                  +50 bonus virtual coins.
                </li>
                <li>
                  <strong className="font-bold text-slate-900">Out of Hints:</strong> Watching a
                  rewarded ad on the &quot;Out of Hints&quot; prompt during gameplay to receive +2
                  free hints.
                </li>
                <li>
                  <strong className="font-bold text-slate-900">
                    Level / Stage Complete Coin Doubler:
                  </strong>{' '}
                  Watching a rewarded ad on the Level Complete screen (Classic and Daily Challenge
                  modes) or Stage Cleared screen (Snake Arrow mode) to double the virtual coins
                  earned for that level or stage.
                </li>
              </ul>
              <p>
                <strong className="font-bold text-slate-900">
                  2) Interstitial Advertisements:
                </strong>{' '}
                Full-screen advertisements that may appear between gameplay sessions (such as after
                completing every 2 levels or stages when advancing to the next level/stage or
                returning to the Home screen), subject to built-in frequency caps and time
                cooldowns.
              </p>
              <p className="font-bold text-slate-900 pt-0.5">
                Data Collected and Processed by Unity Ads:
              </p>
              <p>
                When the Game initializes Unity Ads, preloads ad inventory, or displays
                advertisements over an active internet connection, the Unity Ads SDK automatically
                collects, processes, and transmits certain device and technical information
                directly to Unity Technologies. Depending on your device platform and system
                settings, this may include:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-slate-700">
                <li>
                  <strong className="font-bold text-slate-900">
                    Device &amp; System Information:
                  </strong>{' '}
                  Device manufacturer, model, operating system and version, screen dimensions,
                  system language, device volume/settings, and application package details.
                </li>
                <li>
                  <strong className="font-bold text-slate-900">
                    Network &amp; Coarse Location Information:
                  </strong>{' '}
                  IP address (which Unity Ads may use to estimate coarse geographic location such
                  as country or region), network connection type (Wi-Fi or cellular), and internet
                  connectivity status.
                </li>
                <li>
                  <strong className="font-bold text-slate-900">
                    Advertising &amp; Device Identifiers:
                  </strong>{' '}
                  Platform advertising identifiers (such as Amazon Advertising ID on Fire OS
                  devices or Google Advertising ID where applicable) and vendor/application-scoped
                  identifiers.
                </li>
                <li>
                  <strong className="font-bold text-slate-900">
                    Ad Interaction &amp; Diagnostic Data:
                  </strong>{' '}
                  Ad requests, ad impressions, video view completion or skip status, ad clicks, and
                  SDK diagnostic/error logs.
                </li>
              </ul>
              <p>
                Unity Technologies processes and shares this data with its advertising partners to
                deliver advertisements, cap ad frequency, measure ad performance, attribute
                installs, and detect or prevent advertising fraud. For complete details on how
                Unity handles data and your privacy choices, please review Unity&apos;s Privacy
                Policy at:
              </p>
              <p className="font-mono text-xs text-slate-600 break-all">
                https://unity.com/legal/game-player-and-app-user-privacy-policy
              </p>
            </section>

            <section className="space-y-2.5">
              <h4 className="text-[14px] sm:text-[15px] font-extrabold text-slate-900 uppercase tracking-tight leading-snug">
                5. DEVICE PERMISSIONS
              </h4>
              <p>
                The Android application requests only the minimum technical permissions necessary
                for core functionality and ad delivery:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-slate-700">
                <li>
                  <strong className="font-bold text-slate-900">INTERNET:</strong> Used to load and
                  display advertisements via Unity Ads when your device is online.
                </li>
                <li>
                  <strong className="font-bold text-slate-900">ACCESS_NETWORK_STATE:</strong> Used
                  to check whether your device has an active internet connection so the Game can
                  operate smoothly offline and pause ad requests when disconnected.
                </li>
              </ul>
              <p>
                The Game does not request access to your camera, microphone, contacts, phone state,
                photos/media files, or precise GPS location.
              </p>
            </section>

            <section className="space-y-2.5">
              <h4 className="text-[14px] sm:text-[15px] font-extrabold text-slate-900 uppercase tracking-tight leading-snug">
                6. PRIVACY CHOICES AND ADVERTISING CONTROLS
              </h4>
              <p>
                You can limit or reset the use of your device&apos;s advertising identifier for
                interest-based advertising through your device&apos;s system settings:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-slate-700">
                <li>
                  <strong className="font-bold text-slate-900">Amazon Fire OS Devices:</strong> Open
                  Settings &gt; Security &amp; Privacy &gt; Advertising ID, where you can reset
                  your Advertising ID or toggle off Interest-Based Ads.
                </li>
                <li>
                  <strong className="font-bold text-slate-900">Android Devices:</strong> Open
                  Settings &gt; Privacy &gt; Ads (or Settings &gt; Google &gt; Ads), where you can
                  reset or delete your advertising ID or opt out of personalized ads.
                </li>
              </ul>
              <p>
                You may also play the Game offline; when offline, advertisements are not loaded or
                displayed, though optional ad-based rewards (+1 Life, bonus coins, free hints, and
                2x coin multipliers) require an active internet connection.
              </p>
            </section>

            <section className="space-y-2.5">
              <h4 className="text-[14px] sm:text-[15px] font-extrabold text-slate-900 uppercase tracking-tight leading-snug">
                7. CHILDREN&apos;S PRIVACY
              </h4>
              <p>
                We do not knowingly collect personal information directly from children. The Game
                does not include user accounts, public chat, social sharing, or user-to-user
                communication. Third-party advertisements served by Unity Ads are governed by
                Unity&apos;s privacy and age-appropriateness configurations. If you are a parent or
                guardian and have questions or believe that personal information has been
                inadvertently provided to us via support email, please contact us at{' '}
                <strong className="font-bold text-slate-900">vikashtopofficial@gmail.com</strong> so
                we can delete that correspondence.
              </p>
            </section>

            <section className="space-y-2.5">
              <h4 className="text-[14px] sm:text-[15px] font-extrabold text-slate-900 uppercase tracking-tight leading-snug">
                8. CHANGES TO THIS PRIVACY POLICY
              </h4>
              <p>
                We may update this Privacy Policy if the Game&apos;s features or third-party
                integrations change. Any updates will be reflected within the Privacy Policy
                section inside the Game.
              </p>
            </section>

            <section className="space-y-2.5 pt-3 border-t border-slate-200/80">
              <h4 className="text-[14px] sm:text-[15px] font-extrabold text-slate-900 uppercase tracking-tight leading-snug">
                9. CONTACT INFORMATION
              </h4>
              <p>
                If you have any questions or concerns regarding this Privacy Policy or the
                Game&apos;s privacy practices, please contact:
              </p>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-[13px]">
                <div>
                  <span className="text-slate-500 font-bold uppercase tracking-wider block text-[11px]">
                    Developer / Publisher:
                  </span>
                  <strong className="text-slate-900 font-bold text-sm">Vikash Gamboge</strong>
                </div>
                <div>
                  <span className="text-slate-500 font-bold uppercase tracking-wider block text-[11px]">
                    Email:
                  </span>
                  <a
                    href="mailto:vikashtopofficial@gmail.com?subject=Arrow%20Master%20Privacy%20Policy%20Inquiry"
                    className="text-blue-600 font-bold text-sm hover:underline break-all"
                  >
                    vikashtopofficial@gmail.com
                  </a>
                </div>
              </div>
              <p className="text-xs text-slate-500 pt-1">
                © {currentYear} Vikash Gamboge. All rights reserved.
              </p>
            </section>

            {/* Centered Clickable Footer Link at the Very Bottom */}
            <div className="pt-3 pb-2 border-t border-slate-100 text-center">
              <a
                href={OFFICIAL_PRIVACY_POLICY_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) =>
                  handleOpenExternalUrl(e, OFFICIAL_PRIVACY_POLICY_URL, 'Privacy Policy')
                }
                data-testid="bottom-privacy-policy-link"
                className="inline-block text-sm sm:text-[15px] font-bold text-blue-600 hover:text-blue-700 active:text-blue-800 underline underline-offset-4 decoration-2 decoration-blue-500/80 hover:decoration-blue-700 transition-colors cursor-pointer py-1 px-3 touch-manipulation"
              >
                Privacy Policy
              </a>
              {browserError && (
                <p
                  role="status"
                  className="mt-2 text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-center"
                >
                  {browserError}
                </p>
              )}
            </div>
          </div>
        );

      case 'terms':
        return (
          <div className="space-y-5 text-slate-700 text-[13.5px] sm:text-sm leading-[1.68] font-normal tracking-[-0.005em] text-left break-words overflow-x-hidden">
            {/* Header Identity Summary */}
            <div className="p-4 rounded-2xl bg-indigo-50/80 border border-indigo-100/90 text-indigo-950 space-y-1.5">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-600 block">
                TERMS OF USE
              </span>
              <p className="text-sm sm:text-[15px] font-bold leading-snug text-slate-900">
                Application Name: Arrow Master: Puzzle Escape
              </p>
              <p className="text-[13px] text-slate-700 leading-snug">
                Developer / Publisher:{' '}
                <strong className="font-bold text-slate-900">Vikash Gamboge</strong>
              </p>
              <p className="text-[13px] text-slate-700 leading-snug break-all">
                Contact Email:{' '}
                <strong className="font-bold text-slate-900">vikashtopofficial@gmail.com</strong>
              </p>
            </div>

            <section className="space-y-2.5">
              <h4 className="text-[14px] sm:text-[15px] font-extrabold text-slate-900 uppercase tracking-tight leading-snug">
                1. ACCEPTANCE OF TERMS
              </h4>
              <p>
                By downloading, installing, accessing, or playing{' '}
                <strong className="font-bold text-slate-900">Arrow Master: Puzzle Escape</strong>{' '}
                (the &quot;Game&quot;), developed and published by{' '}
                <strong className="font-bold text-slate-900">Vikash Gamboge</strong>{' '}
                (&quot;Developer&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;), you
                agree to be bound by these Terms of Use (&quot;Terms&quot;). If you do not agree to
                these Terms, please do not install or play the Game.
              </p>
            </section>

            <section className="space-y-2.5">
              <h4 className="text-[14px] sm:text-[15px] font-extrabold text-slate-900 uppercase tracking-tight leading-snug">
                2. LICENSE TO USE THE GAME
              </h4>
              <p>
                Subject to your compliance with these Terms,{' '}
                <strong className="font-bold text-slate-900">Vikash Gamboge</strong> grants you a
                personal, limited, non-exclusive, non-transferable, non-sublicensable, revocable
                license to install and use the Game on a compatible mobile, tablet, or web device
                that you own or control, solely for your personal, non-commercial entertainment.
              </p>
            </section>

            <section className="space-y-2.5">
              <h4 className="text-[14px] sm:text-[15px] font-extrabold text-slate-900 uppercase tracking-tight leading-snug">
                3. GAMEPLAY MODES AND FEATURES
              </h4>
              <p>
                <strong className="font-bold text-slate-900">Arrow Master: Puzzle Escape</strong>{' '}
                provides the following gameplay modes and features:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-slate-700">
                <li>
                  <strong className="font-bold text-slate-900">
                    Classic Arrow Puzzle Campaign:
                  </strong>{' '}
                  Sequential logic puzzle levels where players tap arrows to slide them off the
                  grid without colliding with blocking arrows. Each level attempt begins with 3
                  lives.
                </li>
                <li>
                  <strong className="font-bold text-slate-900">Daily Challenge:</strong> Date-based
                  daily puzzle missions tracked on a monthly calendar.
                </li>
                <li>
                  <strong className="font-bold text-slate-900">Snake Arrow Mode:</strong>{' '}
                  Progressive stage-based puzzles featuring multi-turn serpentine arrow paths.
                </li>
                <li>
                  <strong className="font-bold text-slate-900">
                    Profile &amp; Visual Customization:
                  </strong>{' '}
                  Ability to select an in-game board color theme, toggle audio/vibration settings,
                  and set a local display nickname and emoji avatar.
                </li>
              </ul>
              <p>
                We reserve the right to modify, update, rebalance, or discontinue any aspect or
                feature of the Game in future updates.
              </p>
            </section>

            <section className="space-y-2.5">
              <h4 className="text-[14px] sm:text-[15px] font-extrabold text-slate-900 uppercase tracking-tight leading-snug">
                4. VIRTUAL COINS, HINTS, AND DAILY LOGIN REWARDS
              </h4>
              <p>
                The Game includes virtual items, including Virtual Coins and Puzzle Hints, which
                are earned and used exclusively within the Game:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-slate-700">
                <li>
                  <strong className="font-bold text-slate-900">Earning Virtual Items:</strong>{' '}
                  Virtual coins can be earned by completing Classic Campaign levels, Daily
                  Challenges, and Snake Arrow stages, claiming 7-day Daily Login Rewards on the
                  Home screen, or watching optional rewarded advertisements. Hints are provided for
                  puzzle assistance and can be replenished by completing levels or watching
                  optional rewarded advertisements.
                </li>
                <li>
                  <strong className="font-bold text-slate-900">
                    No Real-World Monetary Value:
                  </strong>{' '}
                  All virtual coins, hints, daily login streaks, and unlocked themes are purely
                  digital entertainment features. They have no real-world monetary value, do not
                  constitute real currency or property, and cannot be purchased with real money,
                  sold, transferred, traded, or redeemed for cash, goods, or services outside the
                  Game.
                </li>
              </ul>
            </section>

            <section className="space-y-2.5">
              <h4 className="text-[14px] sm:text-[15px] font-extrabold text-slate-900 uppercase tracking-tight leading-snug">
                5. ADVERTISEMENTS (REWARDED AND INTERSTITIAL ADS)
              </h4>
              <p>
                <strong className="font-bold text-slate-900">Arrow Master: Puzzle Escape</strong> is
                supported by advertisements delivered through the{' '}
                <strong className="font-bold text-slate-900">Unity Ads SDK</strong>:
              </p>
              <ul className="list-disc pl-5 space-y-2.5 text-slate-700">
                <li>
                  <strong className="font-bold text-slate-900">Rewarded Video Ads:</strong> When
                  your device is online, you may voluntarily choose to watch a full rewarded video
                  advertisement to receive specific in-game benefits:
                  <ul className="list-disc pl-5 mt-1.5 space-y-1.5">
                    <li>
                      +1 Life to continue a puzzle after losing all 3 lives on the &quot;Out of
                      Lives&quot; screen.
                    </li>
                    <li>+50 Bonus Coins in the Daily Reward window on the Home screen.</li>
                    <li>+2 Free Hints when you run out of hints during a puzzle.</li>
                    <li>
                      2x Coin Multiplier after completing a level or clearing a Snake Arrow stage.
                    </li>
                  </ul>
                  <p className="mt-2">
                    <strong className="font-bold text-slate-900">Completion Requirement:</strong>{' '}
                    To receive the in-game reward, the advertisement must be watched to completion
                    as verified by the Unity Ads SDK callback. If an advertisement fails to load,
                    is unavailable due to lack of internet connectivity, or is skipped/closed
                    before completion, the reward will not be granted.
                  </p>
                </li>
                <li>
                  <strong className="font-bold text-slate-900">Interstitial Ads:</strong> The Game
                  may display full-screen interstitial advertisements at natural transition points
                  between gameplay (such as after completing every 2 levels or stages when
                  advancing or returning to the Home screen), subject to built-in frequency limits
                  and cooldown timers.
                </li>
              </ul>
            </section>

            <section className="space-y-2.5">
              <h4 className="text-[14px] sm:text-[15px] font-extrabold text-slate-900 uppercase tracking-tight leading-snug">
                6. LOCAL GAME PROGRESS AND SAVED SETTINGS
              </h4>
              <p>
                All game progress—including unlocked levels and stages, virtual coin balances,
                daily login streaks, completed Daily Challenge dates, local player nickname/avatar,
                and audio/theme preferences—is stored locally on your device.
              </p>
              <ul className="list-disc pl-5 space-y-2 text-slate-700">
                <li>
                  <strong className="font-bold text-slate-900">No Cloud Backup:</strong> The Game
                  does not use cloud accounts or external servers to back up your progress.
                </li>
                <li>
                  <strong className="font-bold text-slate-900">Risk of Loss:</strong> If you clear
                  the Game&apos;s application data/cache in your device settings, uninstall the
                  Game, or switch to a different device, your local progress, virtual coins, and
                  settings will be lost and cannot be recovered by the Developer.
                </li>
              </ul>
            </section>

            <section className="space-y-2.5">
              <h4 className="text-[14px] sm:text-[15px] font-extrabold text-slate-900 uppercase tracking-tight leading-snug">
                7. ACCEPTABLE USE
              </h4>
              <p>
                You agree to use the Game only for lawful entertainment purposes. You must not:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-slate-700">
                <li>
                  Decompile, reverse engineer, disassemble, or attempt to extract the source code
                  or underlying puzzle generation algorithms of the Game, except to the extent
                  expressly permitted by applicable law.
                </li>
                <li>
                  Modify, tamper with, or create derivative works based on the Game or its APK
                  package.
                </li>
                <li>
                  Use cheats, automation software, bots, hacks, or unauthorized third-party tools
                  to manipulate ad callbacks, virtual coin balances, or gameplay behavior.
                </li>
                <li>
                  Interfere with or circumvent the normal operation of the Unity Ads SDK or network
                  security features.
                </li>
              </ul>
            </section>

            <section className="space-y-2.5">
              <h4 className="text-[14px] sm:text-[15px] font-extrabold text-slate-900 uppercase tracking-tight leading-snug">
                8. INTELLECTUAL PROPERTY RIGHTS
              </h4>
              <p>
                All rights, title, and interest in and to{' '}
                <strong className="font-bold text-slate-900">Arrow Master: Puzzle Escape</strong>
                —including its visual design, user interface, custom vector graphics, deterministic
                puzzle and Snake Arrow generation engines, synthesized audio effects, code, and
                branding—are owned by{' '}
                <strong className="font-bold text-slate-900">Vikash Gamboge</strong> (or licensed
                from respective third-party SDK providers such as Unity Technologies). These Terms
                do not grant you any ownership rights in the Game.
              </p>
            </section>

            <section className="space-y-2.5">
              <h4 className="text-[14px] sm:text-[15px] font-extrabold text-slate-900 uppercase tracking-tight leading-snug">
                9. DISCLAIMER OF WARRANTIES
              </h4>
              <p>
                The Game is provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis
                without warranties of any kind, whether express or implied. To the fullest extent
                permitted by applicable law,{' '}
                <strong className="font-bold text-slate-900">Vikash Gamboge</strong> disclaims all
                warranties, including implied warranties of merchantability, fitness for a
                particular purpose, and non-infringement. We do not guarantee that the Game or
                third-party advertisements will always be uninterrupted, error-free, or available
                at all times.
              </p>
            </section>

            <section className="space-y-2.5">
              <h4 className="text-[14px] sm:text-[15px] font-extrabold text-slate-900 uppercase tracking-tight leading-snug">
                10. LIMITATION OF LIABILITY
              </h4>
              <p>
                To the maximum extent permitted by applicable law,{' '}
                <strong className="font-bold text-slate-900">Vikash Gamboge</strong> shall not be
                liable for any indirect, incidental, special, consequential, or punitive damages,
                or any loss of locally saved game progress, virtual coins, or data, arising out of
                or related to your use of or inability to use{' '}
                <strong className="font-bold text-slate-900">Arrow Master: Puzzle Escape</strong>.
              </p>
            </section>

            <section className="space-y-2.5">
              <h4 className="text-[14px] sm:text-[15px] font-extrabold text-slate-900 uppercase tracking-tight leading-snug">
                11. CHANGES TO THESE TERMS
              </h4>
              <p>
                We may revise these Terms of Use from time to time to reflect changes in the Game
                or legal requirements. Updated Terms will be included in future versions of the
                Game. Continued use of the Game constitutes acceptance of the updated Terms.
              </p>
            </section>

            <section className="space-y-2.5 pt-3 border-t border-slate-200/80">
              <h4 className="text-[14px] sm:text-[15px] font-extrabold text-slate-900 uppercase tracking-tight leading-snug">
                12. DEVELOPER CONTACT INFORMATION
              </h4>
              <p>
                If you have any questions, feedback, or support requests regarding{' '}
                <strong className="font-bold text-slate-900">Arrow Master: Puzzle Escape</strong> or
                these Terms of Use, please contact:
              </p>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-[13px]">
                <div>
                  <span className="text-slate-500 font-bold uppercase tracking-wider block text-[11px]">
                    Developer / Publisher:
                  </span>
                  <strong className="text-slate-900 font-bold text-sm">Vikash Gamboge</strong>
                </div>
                <div>
                  <span className="text-slate-500 font-bold uppercase tracking-wider block text-[11px]">
                    Email:
                  </span>
                  <a
                    href="mailto:vikashtopofficial@gmail.com?subject=Arrow%20Master%20Terms%20Inquiry"
                    className="text-blue-600 font-bold text-sm hover:underline break-all"
                  >
                    vikashtopofficial@gmail.com
                  </a>
                </div>
              </div>
              <p className="text-xs text-slate-500 pt-1">
                © {currentYear} Vikash Gamboge. All rights reserved.
              </p>
            </section>

            {/* Centered Clickable Footer Link at the Very Bottom */}
            <div className="pt-3 pb-2 border-t border-slate-100 text-center">
              <a
                href={OFFICIAL_TERMS_OF_USE_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) =>
                  handleOpenExternalUrl(e, OFFICIAL_TERMS_OF_USE_URL, 'Terms of Use')
                }
                data-testid="bottom-terms-of-use-link"
                className="inline-block text-sm sm:text-[15px] font-bold text-blue-600 hover:text-blue-700 active:text-blue-800 underline underline-offset-4 decoration-2 decoration-blue-500/80 hover:decoration-blue-700 transition-colors cursor-pointer py-1 px-3 touch-manipulation"
              >
                Terms of Use
              </a>
              {browserError && (
                <p
                  role="status"
                  className="mt-2 text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-center"
                >
                  {browserError}
                </p>
              )}
            </div>
          </div>
        );

      case 'about':
        return (
          <div className="space-y-5 text-slate-700 text-[13.5px] sm:text-sm leading-[1.68] font-normal tracking-[-0.005em] text-left break-words overflow-x-hidden">
            {/* App Icon & Identity Header */}
            <div className="text-center space-y-3 pb-1">
              <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center shadow-xl shadow-blue-500/25 p-1">
                <div className="w-full h-full rounded-2xl bg-[#0B132B] flex items-center justify-center">
                  <svg viewBox="0 0 40 40" className="w-12 h-12 drop-shadow-md">
                    <path
                      d="M 10 30 L 10 18 L 30 18"
                      fill="none"
                      stroke="#38BDF8"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <polygon points="34,18 26,13 26,23" fill="#F59E0B" />
                    <circle cx="28" cy="28" r="3.5" fill="#10B981" />
                  </svg>
                </div>
              </div>

              <div>
                <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight leading-snug">
                  Arrow Master: Puzzle Escape
                </h3>
                <span className="inline-block mt-1 px-3 py-1 rounded-full bg-cyan-50 border border-cyan-200/80 text-[11px] font-bold uppercase tracking-wider text-cyan-800">
                  Logic &amp; Spatial Escape Puzzle Game
                </span>
              </div>
            </div>

            {/* Header Identity Badge */}
            <div className="p-4 rounded-2xl bg-cyan-50/80 border border-cyan-100/90 text-cyan-950 space-y-1.5">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-cyan-700 block">
                ABOUT
              </span>
              <p className="text-sm sm:text-[15px] font-bold leading-snug text-slate-900">
                Application Name: Arrow Master: Puzzle Escape
              </p>
              <p className="text-[13px] text-slate-700 leading-snug">
                Developer / Publisher:{' '}
                <strong className="font-bold text-slate-900">Vikash Gamboge</strong>
              </p>
              <p className="text-[13px] text-slate-700 leading-snug break-all">
                Contact Email:{' '}
                <strong className="font-bold text-slate-900">vikashtopofficial@gmail.com</strong>
              </p>
            </div>

            {/* 1. Short Professional Game Description */}
            <section className="space-y-2.5">
              <h4 className="text-[14px] sm:text-[15px] font-extrabold text-slate-900 uppercase tracking-tight leading-snug">
                1. ABOUT THE GAME
              </h4>
              <p>
                <strong className="font-bold text-slate-900">Arrow Master: Puzzle Escape</strong> is
                a logic and spatial escape puzzle game designed to challenge your observation and
                planning skills. Each puzzle presents an intricate grid of directional and
                multi-turn arrows. Your objective is to find the right sequence to slide every
                arrow safely off the board without colliding with blocking arrows.
              </p>
            </section>

            {/* 2. How to Play */}
            <section className="space-y-2.5">
              <h4 className="text-[14px] sm:text-[15px] font-extrabold text-slate-900 uppercase tracking-tight leading-snug">
                2. HOW TO PLAY
              </h4>
              <ul className="list-disc pl-5 space-y-2 text-slate-700">
                <li>
                  <strong className="font-bold text-slate-900">Tap to Escape:</strong> Tap any
                  arrow whose forward exit path is completely clear to slide it off the grid.
                </li>
                <li>
                  <strong className="font-bold text-slate-900">Avoid Collisions:</strong> Tapping an
                  arrow whose path is blocked by another arrow causes a collision and deducts 1
                  life. Each puzzle starts with 3 lives.
                </li>
                <li>
                  <strong className="font-bold text-slate-900">Clear the Board:</strong> Free all
                  arrows from the grid to complete the level and earn virtual coins and up to 3
                  stars based on your accuracy.
                </li>
              </ul>
            </section>

            {/* 3. Real Implemented Features */}
            <section className="space-y-2.5">
              <h4 className="text-[14px] sm:text-[15px] font-extrabold text-slate-900 uppercase tracking-tight leading-snug">
                3. IMPLEMENTED GAME MODES &amp; FEATURES
              </h4>
              <ul className="list-disc pl-5 space-y-2.5 text-slate-700">
                <li>
                  <strong className="font-bold text-slate-900">
                    Classic Arrow Puzzle Campaign:
                  </strong>{' '}
                  200+ sequential puzzle levels across progressive difficulty tiers (Easy, Normal,
                  Hard, and Very Hard) with level completion statistics, elapsed timer, accuracy
                  tracking, and 3-star ratings.
                </li>
                <li>
                  <strong className="font-bold text-slate-900">Daily Challenge Mode:</strong>{' '}
                  Date-based daily puzzle missions tracked on an interactive monthly calendar so
                  you can complete today&apos;s mission or revisit earlier days in the month.
                </li>
                <li>
                  <strong className="font-bold text-slate-900">Snake Arrow Mode:</strong>{' '}
                  Progressive stage-based puzzles featuring multi-turn winding serpentine arrow
                  paths across Easy, Normal, Hard, Very Hard, and Expert stages.
                </li>
                <li>
                  <strong className="font-bold text-slate-900">In-Game Puzzle Tools:</strong>{' '}
                  Built-in Hint button (highlights a movable arrow with a clear exit path), an
                  optional Grid Dots overlay for alignment visibility, and a Magnifier zoom toggle.
                </li>
                <li>
                  <strong className="font-bold text-slate-900">
                    Virtual Coins &amp; Daily Login Rewards:
                  </strong>{' '}
                  Earn virtual coins by completing campaign levels, Daily Challenges, and Snake
                  Arrow stages, plus claim a 7-day Daily Login Reward streak on the Home screen.
                </li>
                <li>
                  <strong className="font-bold text-slate-900">
                    Board Themes &amp; Player Profile:
                  </strong>{' '}
                  Customize your board with 6 visual color themes (Midnight Blue, Ocean Cyan,
                  Emerald Green, Royal Purple, Sunset Orange, and Light Minimal), personalize your
                  local player nickname and emoji avatar, and independently toggle Sound Effects,
                  Background Music, and Vibration.
                </li>
              </ul>
            </section>

            {/* 4. Developer & Application Information */}
            <section className="space-y-2.5 pt-3 border-t border-slate-200/80">
              <h4 className="text-[14px] sm:text-[15px] font-extrabold text-slate-900 uppercase tracking-tight leading-snug">
                4. DEVELOPER INFORMATION
              </h4>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-left space-y-2.5 text-[13px]">
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Official Game Name:
                  </span>
                  <strong className="text-slate-900 font-bold text-sm">
                    Arrow Master: Puzzle Escape
                  </strong>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Developer / Publisher:
                  </span>
                  <strong className="text-slate-900 font-bold text-sm">Vikash Gamboge</strong>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Version:
                  </span>
                  <span className="font-mono font-bold text-slate-800 text-sm">{APP_VERSION}</span>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Support Email:
                  </span>
                  <a
                    href="mailto:vikashtopofficial@gmail.com?subject=Arrow%20Master%20Support"
                    className="text-blue-600 font-bold text-sm hover:underline break-all"
                  >
                    vikashtopofficial@gmail.com
                  </a>
                </div>
              </div>
              <p className="text-xs text-slate-500 pt-1">
                © {currentYear} Vikash Gamboge. All rights reserved.
              </p>
            </section>
          </div>
        );
    }
  };

  const getPageTitle = () => {
    switch (pageType) {
      case 'privacy':
        return 'Privacy Policy';
      case 'terms':
        return 'Terms of Use';
      case 'about':
        return 'About';
    }
  };

  const getPageIcon = () => {
    switch (pageType) {
      case 'privacy':
        return <ShieldCheck className="w-5 h-5 text-blue-600" />;
      case 'terms':
        return <FileText className="w-5 h-5 text-indigo-600" />;
      case 'about':
        return <Info className="w-5 h-5 text-cyan-600" />;
    }
  };

  if (isStandalone) {
    // Fullscreen public webpage layout for direct URL access (/privacy-policy, /terms, /about)
    return (
      <div className="min-h-screen w-full bg-slate-900 text-slate-100 flex flex-col items-center justify-start p-4 sm:p-6 overflow-y-auto overflow-x-hidden">
        <header className="w-full max-w-2xl flex items-center justify-between py-4 border-b border-slate-800 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-600/20 border border-blue-500/30 text-blue-400">
              {getPageIcon()}
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                {getPageTitle()}
              </h1>
              <p className="text-xs text-slate-400">Arrow Master: Puzzle Escape · Vikash Gamboge</p>
            </div>
          </div>

          {onLaunchGame && (
            <button
              type="button"
              onClick={onLaunchGame}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
            >
              <Gamepad2 className="w-4 h-4" />
              <span>PLAY GAME</span>
            </button>
          )}
        </header>

        <main className="w-full max-w-2xl bg-white text-slate-800 rounded-3xl p-5 sm:p-8 shadow-2xl border border-slate-100 mb-8 overflow-x-hidden">
          {renderContent()}
        </main>

        <footer className="w-full max-w-2xl text-center text-xs text-slate-500 pb-8">
          <div>© {currentYear} Vikash Gamboge. All rights reserved.</div>
          <div className="mt-1 text-[11px] text-slate-600">
            Arrow Master: Puzzle Escape · Public Legal Document
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-page-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 select-none animate-in fade-in duration-150"
    >
      <div className="w-full max-w-sm h-full max-h-[88vh] bg-white rounded-3xl p-4 sm:p-5 shadow-2xl border border-slate-100 flex flex-col justify-between overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Top Header */}
        <header className="shrink-0 flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/70">
              {getPageIcon()}
            </div>
            <h3
              id="legal-page-title"
              className="text-lg font-extrabold text-slate-900 tracking-tight"
            >
              {getPageTitle()}
            </h3>
          </div>

          <button
            type="button"
            onClick={handleBack}
            aria-label="Back to Settings"
            className="p-2 -mr-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer touch-manipulation"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        </header>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden pr-1.5 py-1 space-y-5 touch-pan-y scroll-smooth">
          {renderContent()}
        </div>

        {/* Bottom Back Button */}
        <footer className="shrink-0 pt-3 border-t border-slate-100 mt-3">
          <button
            type="button"
            onClick={handleBack}
            className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-98 text-slate-700 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer touch-manipulation flex items-center justify-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>BACK TO SETTINGS</span>
          </button>
        </footer>
      </div>
    </div>
  );
};
