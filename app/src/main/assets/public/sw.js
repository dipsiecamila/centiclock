/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-afac4cd2'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();
  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "registerSW.js",
    "revision": "1872c500de691dce40960bb85481de07"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "e61abc8eeffe0f104d6c8c4e8a723135"
  }, {
    "url": "pwa-512x512.png",
    "revision": "efe83437aa30409bcd7377491e105c55"
  }, {
    "url": "pwa-192x192.png",
    "revision": "030e65c75e7c34d9f61910ec313fcb72"
  }, {
    "url": "index.html",
    "revision": "d7e8beb936271735d047727ad67a4963"
  }, {
    "url": "icon.svg",
    "revision": "7828cc24e8795bfada41f2f892479781"
  }, {
    "url": "favicon.ico",
    "revision": "71b7cd876531da145e9233b784da291f"
  }, {
    "url": "apple-touch-icon.png",
    "revision": "6a254ef972898da9161739a6131bc2d1"
  }, {
    "url": "assets/index-qvzi7aFo.css",
    "revision": null
  }, {
    "url": "assets/index-DuZpnY1-.js",
    "revision": null
  }, {
    "url": "assets/aistudio/image_15518e62.png",
    "revision": null
  }, {
    "url": "apple-touch-icon.png",
    "revision": "6a254ef972898da9161739a6131bc2d1"
  }, {
    "url": "favicon.ico",
    "revision": "71b7cd876531da145e9233b784da291f"
  }, {
    "url": "icon.svg",
    "revision": "7828cc24e8795bfada41f2f892479781"
  }, {
    "url": "pwa-192x192.png",
    "revision": "030e65c75e7c34d9f61910ec313fcb72"
  }, {
    "url": "pwa-512x512.png",
    "revision": "efe83437aa30409bcd7377491e105c55"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "e61abc8eeffe0f104d6c8c4e8a723135"
  }, {
    "url": "manifest.webmanifest",
    "revision": "e71a81e047e0db1c6cfbffa48811b896"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html")));
  workbox.registerRoute(/^https:\/\/fonts\.googleapis\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "google-fonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 10,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');
  workbox.registerRoute(/^https:\/\/fonts\.gstatic\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "gstatic-fonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 10,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');

}));
