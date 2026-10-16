const CACHE_NAME = "todo-app-v1";

const FILES_TO_CACHE = [
    "./",
    "./index.html",
    "./style.css"
];


// インストール時
self.addEventListener("install", (event) => {

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                return cache.addAll(FILES_TO_CACHE);
            })
    );

});


// リクエスト時
self.addEventListener("fetch", (event) => {

    event.respondWith(

        caches.match(event.request)
            .then((cachedResponse) => {

                return cachedResponse ||
                       fetch(event.request);

            })

    );

});