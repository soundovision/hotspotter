// analytics.js — Google Analytics 4 and PostHog behind one consent gate.
//
// Owner setup: paste the GA4 Measurement ID below. While it is empty this
// file does nothing (no banner, no gtag, no cookies). PRIVACY_URL must point
// at a published privacy page before GA_ID is set — the banner links to it.
//
// Behaviour:
//   • Visitors whose browser time zone is in Europe (EU/EEA/UK/CH) see a
//     consent banner first; GA loads only after "Accept". (Time zone is a
//     heuristic — it errs on the side of asking.)
//   • Everyone else gets GA immediately, in Consent Mode with ad signals
//     denied and only analytics_storage granted.
//   • A Global Privacy Control signal is honoured as "decline" everywhere.
//   • The choice is stored per browser; a "Cookie choices" footer link
//     re-opens the banner so consent can be withdrawn as easily as given.
(function () {
  if (/[?&](license_key|email)=/.test(location.search)) return; // a buyer's key or email in the URL: load nothing
  var GA_ID = "G-VKQMD5HFYX";     // Hot Spotter — GA4 property
  var PRIVACY_URL = "/privacy.html";
  var KEY = "hs-consent";         // "granted" | "denied"
  if (!GA_ID) return;

  function stored() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function remember(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }
  function tz() { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch (e) { return ""; } }
  var EU_ATLANTIC = { "Atlantic/Canary": 1, "Atlantic/Madeira": 1, "Atlantic/Azores": 1, "Atlantic/Reykjavik": 1, "Atlantic/Faroe": 1 };
  function needsConsent() { var z = tz(); return z.indexOf("Europe/") === 0 || !!EU_ATLANTIC[z]; }
  var gpc = !!navigator.globalPrivacyControl;

  var loaded = false;
  function loadGA() {
    if (loaded) return; loaded = true;
    window.dataLayer = window.dataLayer || [];
    function gtag() { window.dataLayer.push(arguments); }
    window.gtag = gtag;
    gtag("consent", "default", {
      analytics_storage: "granted",
      ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied"
    });
    gtag("js", new Date());
    gtag("config", GA_ID);
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(GA_ID);
    document.head.appendChild(s);
    loadPostHog();
  }

  // PostHog (the app's project), loaded wherever GA is. The live site only:
  // a local preview sends nothing. The loader is PostHog's own snippet.
  function loadPostHog() {
    if (!location.hostname.endsWith("hotspotter.studio")) return;
    !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],Object.defineProperty(u,"toString",{configurable:!0,enumerable:!0,writable:!0,value:function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e}}),Object.defineProperty(u.people,"toString",{configurable:!0,enumerable:!0,writable:!0,value:function(){return u.toString(1)+".people (stub)"}}),o="init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagResult isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey getNextSurveyStep identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
    window.posthog.init("phc_CoU3RwKEWSMKPVHWqNVxBJyCsUDtiVsxF3e5cSS9msQb", {
      api_host: "https://us.i.posthog.com",
      defaults: "2026-08-30",
      persistence: "memory",              // no cookies or local storage
      person_profiles: "identified_only", // anonymous, like the app
      disable_session_recording: true
    });
  }

  function banner() {
    if (document.getElementById("consent")) return;
    var el = document.createElement("div");
    el.id = "consent";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-live", "polite");
    el.setAttribute("aria-label", "Cookie choice");
    el.innerHTML =
      '<p>We’d like to use Google Analytics and PostHog to see which parts of this page get read. ' +
      'No ads, nothing sold. <a href="' + PRIVACY_URL + '">Privacy</a></p>' +
      '<p class="consent-btns">' +
      '<button type="button" class="btn btn-sm" data-c="granted">Accept</button>' +
      '<button type="button" class="ghost micro" data-c="denied">Decline</button></p>';
    el.addEventListener("click", function (e) {
      var b = e.target.closest("button[data-c]"); if (!b) return;
      remember(b.getAttribute("data-c"));
      el.remove();
      if (b.getAttribute("data-c") === "granted") loadGA();
    });
    document.body.appendChild(el);
  }

  function footerLink() {
    var meta = document.querySelector(".foot-meta"); if (!meta) return;
    var sep = document.createElement("span"); sep.setAttribute("aria-hidden", "true"); sep.textContent = "·";
    var a = document.createElement("a"); a.href = "#"; a.textContent = "Cookie choices";
    a.addEventListener("click", function (e) { e.preventDefault(); banner(); });
    meta.appendChild(sep); meta.appendChild(a);
  }

  function start() {
    footerLink();
    var c = stored();
    if (gpc && c !== "granted") return;
    if (c === "granted") return loadGA();
    if (c === "denied") return;
    if (needsConsent()) banner(); else loadGA();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
