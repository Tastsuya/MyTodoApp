// キャッシュのバージョン
const CACHE_NAME = "todo-app-v2";

// オフラインでも表示したいファイル
const FILES_TO_CACHE = [
    "./",
    "./index.html",
    "./style.css",
    "./manifest.json",
    "./icons/icon-192.png",
    "./icons/icon-512.png"
];


// ==============================
// Service Worker インストール
// ==============================

self.addEventListener("install", (event) => {

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                return cache.addAll(FILES_TO_CACHE);
            })
    );

    // 新しいService Workerをすぐ待機状態から進める
    self.skipWaiting();
});


// ==============================
// 古いキャッシュを削除
// ==============================

self.addEventListener("activate", (event) => {

    event.waitUntil(

        caches.keys().then((cacheNames) => {

            return Promise.all(

                cacheNames.map((cacheName) => {

                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }

                })

            );

        })

    );

    // 開いているページをすぐ管理対象にする
    self.clients.claim();
});


// ==============================
// ファイル取得
// ==============================

self.addEventListener("fetch", (event) => {

    // HTMLなどのページ移動は
    // まず最新版をネットから取得する
    if (event.request.mode === "navigate") {

        event.respondWith(

            fetch(event.request)
                .then((response) => {

                    const copy = response.clone();

                    caches.open(CACHE_NAME)
                        .then((cache) => {
                            cache.put(event.request, copy);
                        });

                    return response;

                })
                .catch(() => {

                    return caches.match("./index.html");

                })

        );

        return;
    }


    // CSS・画像などもまず最新版を取得する
    event.respondWith(

        fetch(event.request)
            .then((response) => {

                // Firebaseなど外部通信まで
                // 無理にキャッシュしない
                if (
                    event.request.url.startsWith(
                        self.location.origin
                    )
                ) {

                    const copy = response.clone();

                    caches.open(CACHE_NAME)
                        .then((cache) => {
                            cache.put(event.request, copy);
                        });

                }

                return response;

            })
            .catch(() => {

                return caches.match(event.request);

            })

    );

});