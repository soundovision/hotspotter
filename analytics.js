// analytics.js — Google Analytics 4 behind a consent gate.
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
  var GA_ID = "";                 // e.g. "G-XXXXXXXXXX"
  var PRIVACY_URL = "privacy.html";
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
  }

  function banner() {
    if (document.getElementById("consent")) return;
    var el = document.createElement("div");
    el.id = "consent";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-live", "polite");
    el.setAttribute("aria-label", "Cookie choice");
    el.innerHTML =
      '<p>We’d like to use Google Analytics to see which parts of this page get read. ' +
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
