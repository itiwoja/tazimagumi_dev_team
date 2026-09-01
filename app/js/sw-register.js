/* global navigator, window, location */
(function () {
  "use strict";

  var canUseServiceWorker =
    "serviceWorker" in navigator &&
    (location.protocol === "http:" || location.protocol === "https:");

  if (!canUseServiceWorker) return;

  window.addEventListener("load", function () {
    navigator.serviceWorker.register("./sw.js?v=33", { updateViaCache: "none" }).catch(function (error) {
      console.info("Service Worker registration skipped:", error);
    });
  });
})();
