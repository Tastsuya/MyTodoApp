// ==============================
// 1. Firebaseの読み込み
// ==============================

import { initializeApp }
from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";

import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";

import {
    getFirestore,
    collection,
    doc,
    setDoc,
    updateDoc,
    deleteDoc,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";


// ==============================
// 2. Firebaseの設定
// ==============================

const firebaseConfig = {
    apiKey: "AIzaSyC72T2yZjZIBIZlUHzuo2tSiD48n5lBQGY",
    authDomain: "my-todo-app-3cd34.firebaseapp.com",
    projectId: "my-todo-app-3cd34",
    storageBucket: "my-todo-app-3cd34.firebasestorage.app",
    messagingSenderId: "924760997251",
    appId: "1:924760997251:web:08c07c491e6ca35d768ab6"
};


// Firebaseを起動
const app = initializeApp(firebaseConfig);

// Authentication
const auth = getAuth(app);

// Firestore
const db = getFirestore(app);

// Googleログイン
const provider = new GoogleAuthProvider();


// ==============================
// 3. HTMLの要素を取得
// ==============================

const loginButton =
    document.getElementById("login-button");

const logoutButton =
    document.getElementById("logout-button");

const userInfo =
    document.getElementById("user-info");

const todoForm =
    document.getElementById("task-form");

const todoInput =
    document.getElementById("task-input");

const todoList =
    document.getElementById("task-list");

const emptyMessage =
    document.getElementById("empty-message");

const totalCount =
    document.getElementById("total-count");

const remainingCount =
    document.getElementById("remaining-count");

const completedCount =
    document.getElementById("completed-count");

// フィルターボタン
const filterButtons =
    document.querySelectorAll(".filter-button");


// ==============================
// 4. アプリで使用する変数
// ==============================

// 現在ログインしているユーザー
let currentUser = null;

// 現在のToDo一覧
let todos = [];

// Firestoreの監視を解除するための変数
let unsubscribeTodos = null;

// 現在選択しているフィルター
// all       → すべて
// remaining → 未完了
// completed → 完了
let currentFilter = "all";

// 最初のFirestore読み込みが終わったか
let initialLoadFinished = false;

// 新しく追加したタスクのID
// このタスクだけ追加アニメーションさせる
let newlyAddedTodoId = null;


// ==============================
// 5. Googleログイン
// ==============================

loginButton.addEventListener(
    "click",
    async () => {

        try {

            await signInWithPopup(
                auth,
                provider
            );

        } catch (error) {

            console.error(
                "ログインエラー:",
                error
            );

        }

    }
);


// ==============================
// 6. ログアウト
// ==============================

logoutButton.addEventListener(
    "click",
    async () => {

        try {

            await signOut(auth);

        } catch (error) {

            console.error(
                "ログアウトエラー:",
                error
            );

        }

    }
);


// ==============================
// 7. ログイン状態を確認
// ==============================

onAuthStateChanged(
    auth,
    (user) => {

        // 前のFirestore監視があれば解除
        if (unsubscribeTodos !== null) {

            unsubscribeTodos();

            unsubscribeTodos = null;

        }


        if (user) {

            // --------------------------
            // ログインしている場合
            // --------------------------

            currentUser = user;

            console.log(
                "ログインしました"
            );

            console.log(user);

            userInfo.textContent =
                `${user.displayName} でログイン中`;

            loginButton.style.display =
                "none";

            logoutButton.style.display =
                "inline-block";

            // 入力を許可
            todoInput.disabled = false;

            // 初回読み込み状態をリセット
            initialLoadFinished = false;

            // FirestoreのToDoを監視
            startTodoListener();

        } else {

            // --------------------------
            // ログアウトしている場合
            // --------------------------

            console.log(
                "ログアウトしています"
            );

            currentUser = null;

            todos = [];

            newlyAddedTodoId = null;

            initialLoadFinished = false;

            userInfo.textContent = "";

            loginButton.style.display =
                "inline-block";

            logoutButton.style.display =
                "none";

            // ログアウト中は入力不可
            todoInput.disabled = true;

            renderTodos();

        }

    }
);


// ==============================
// 8. Firestoreをリアルタイム監視
// ==============================

function startTodoListener() {

    // ログインしていなければ何もしない
    if (currentUser === null) {
        return;
    }


    // 自分専用のtodosコレクション
    const todosCollection =
        collection(
            db,
            "users",
            currentUser.uid,
            "todos"
        );


    // Firestoreを監視する
    unsubscribeTodos =
        onSnapshot(

            todosCollection,

            (snapshot) => {

                // 一度配列を空にする
                todos = [];


                // Firestoreのデータを
                // todos配列に入れる
                snapshot.forEach(
                    (document) => {

                        const data =
                            document.data();

                        todos.push({

                            id:
                                document.id,

                            text:
                                data.text,

                            completed:
                                data.completed,

                            createdAt:
                                data.createdAt

                        });

                    }
                );


                // 作成順に並べる
                todos.sort(
                    (a, b) => {

                        return (
                            (a.createdAt || 0) -
                            (b.createdAt || 0)
                        );

                    }
                );


                // 画面を更新
                renderTodos();

                // 初回読み込み完了
                initialLoadFinished = true;

            },

            (error) => {

                console.error(
                    "Firestore読み込みエラー:",
                    error
                );

            }

        );

}


// ==============================
// 9. ToDoを画面に表示
// ==============================

function renderTodos() {

    // --------------------------
    // 一度すべて消す
    // --------------------------

    todoList.replaceChildren();


    // --------------------------
    // 完了数
    // --------------------------

    const completedTotal =
        todos.filter(
            (todo) => {

                return todo.completed;

            }
        ).length;


    // --------------------------
    // 未完了数
    // --------------------------

    const remainingTotal =
        todos.length -
        completedTotal;


    // --------------------------
    // 件数を表示
    // --------------------------

    totalCount.textContent =
        todos.length;

    remainingCount.textContent =
        remainingTotal;

    completedCount.textContent =
        completedTotal;


    // ==========================
    // フィルター
    // ==========================

    let filteredTodos = todos;


    // 未完了のみ
    if (
        currentFilter ===
        "remaining"
    ) {

        filteredTodos =
            todos.filter(
                (todo) => {

                    return !todo.completed;

                }
            );

    }


    // 完了のみ
    if (
        currentFilter ===
        "completed"
    ) {

        filteredTodos =
            todos.filter(
                (todo) => {

                    return todo.completed;

                }
            );

    }


    // ==========================
    // タスクがない場合
    // ==========================

    emptyMessage.classList.toggle(
        "is-hidden",
        filteredTodos.length > 0
    );


    if (filteredTodos.length === 0) {

        if (
            currentFilter ===
            "remaining"
        ) {

            emptyMessage.textContent =
                "未完了のタスクはありません。";

        } else if (
            currentFilter ===
            "completed"
        ) {

            emptyMessage.textContent =
                "完了したタスクはありません。";

        } else {

            emptyMessage.textContent =
                "タスクはまだありません。";

        }

    }


    // ==========================
    // ToDoを1件ずつ表示
    // ==========================

    filteredTodos.forEach(
        (todo) => {

            // --------------------------
            // タスクカード
            // --------------------------

            const listItem =
                document.createElement(
                    "li"
                );

            listItem.className =
                "todo-item";


            // 完了済みなら
            // is-completedを付ける
            listItem.classList.toggle(
                "is-completed",
                todo.completed
            );


            // ==========================
            // 追加アニメーション
            // ==========================

            if (
                initialLoadFinished &&
                todo.id === newlyAddedTodoId
            ) {

                listItem.classList.add(
                    "task-enter"
                );


                requestAnimationFrame(
                    () => {

                        requestAnimationFrame(
                            () => {

                                listItem.classList.add(
                                    "task-enter-active"
                                );

                            }
                        );

                    }
                );

            }


            // --------------------------
            // チェックボックス
            // --------------------------

            const checkbox =
                document.createElement(
                    "input"
                );

            checkbox.type =
                "checkbox";

            checkbox.className =
                "todo-checkbox";

            checkbox.checked =
                todo.completed;


            // ==========================
            // 完了状態変更
            // ==========================

            checkbox.addEventListener(
                "change",
                async () => {

                    if (
                        currentUser ===
                        null
                    ) {

                        return;

                    }


                    // すぐに見た目を変える
                    listItem.classList.toggle(
                        "is-completed",
                        checkbox.checked
                    );


                    // チェックした瞬間の
                    // 小さなアニメーション
                    listItem.classList.add(
                        "just-changed"
                    );


                    setTimeout(
                        () => {

                            listItem.classList.remove(
                                "just-changed"
                            );

                        },
                        250
                    );


                    try {

                        const todoReference =
                            doc(
                                db,
                                "users",
                                currentUser.uid,
                                "todos",
                                todo.id
                            );


                        await updateDoc(
                            todoReference,
                            {

                                completed:
                                    checkbox.checked

                            }
                        );

                    } catch (error) {

                        console.error(
                            "更新エラー:",
                            error
                        );

                    }

                }
            );


            // --------------------------
            // タスク名
            // --------------------------

            const text =
                document.createElement(
                    "span"
                );

            text.className =
                "todo-text";

            text.textContent =
                todo.text;


            // ==========================
            // ゴミ箱ボタン
            // ==========================

            const deleteButton =
                document.createElement(
                    "button"
                );

            deleteButton.type =
                "button";

            deleteButton.className =
                "delete-button";


            // SVGでゴミ箱を描画
            deleteButton.innerHTML = `
                <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                >
                    <path
                        d="M3 6h18"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                    />

                    <path
                        d="M8 6V4h8v2"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                    />

                    <path
                        d="M6 6l1 15h10l1-15"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linejoin="round"
                    />

                    <path
                        d="M10 10v7M14 10v7"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                    />
                </svg>
            `;


            // 読み上げ機能用
            deleteButton.setAttribute(
                "aria-label",
                "タスクを削除"
            );


            // ==========================
            // 削除処理
            // ==========================

            deleteButton.addEventListener(
                "click",
                async () => {

                    if (
                        currentUser ===
                        null
                    ) {

                        return;

                    }


                    // ----------------------
                    // 削除アニメーション
                    // ----------------------

                    listItem.classList.add(
                        "deleting"
                    );


                    // 250ms待つ
                    await new Promise(
                        (resolve) => {

                            setTimeout(
                                resolve,
                                250
                            );

                        }
                    );


                    try {

                        const todoReference =
                            doc(
                                db,
                                "users",
                                currentUser.uid,
                                "todos",
                                todo.id
                            );


                        // Firestoreから削除
                        await deleteDoc(
                            todoReference
                        );

                    } catch (error) {

                        console.error(
                            "削除エラー:",
                            error
                        );


                        // 削除に失敗したら
                        // 元の表示に戻す
                        listItem.classList.remove(
                            "deleting"
                        );

                    }

                }
            );


            // ==========================
            // HTMLに追加
            // ==========================

            listItem.append(
                checkbox,
                text,
                deleteButton
            );


            todoList.appendChild(
                listItem
            );

        }
    );


    // 追加アニメーションは
    // 1回だけ実行する
    newlyAddedTodoId = null;

}


// ==============================
// 10. タスク表示フィルター
// ==============================

filterButtons.forEach(
    (button) => {

        button.addEventListener(
            "click",
            () => {

                // ----------------------
                // 選択したフィルター
                // ----------------------

                currentFilter =
                    button.dataset.filter;


                // ----------------------
                // 全ボタンから
                // activeを削除
                // ----------------------

                filterButtons.forEach(
                    (item) => {

                        item.classList.remove(
                            "active"
                        );

                    }
                );


                // ----------------------
                // 押したボタンだけ
                // activeにする
                // ----------------------

                button.classList.add(
                    "active"
                );


                // ----------------------
                // 再表示
                // ----------------------

                renderTodos();

            }
        );

    }
);


// ==============================
// 11. 新しいToDoを追加
// ==============================

todoForm.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();


        // --------------------------
        // ログイン確認
        // --------------------------

        if (currentUser === null) {

            alert(
                "Googleでログインしてください。"
            );

            return;

        }


        // --------------------------
        // 入力文字を取得
        // --------------------------

        const taskText =
            todoInput.value.trim();


        // 空欄なら追加しない
        if (taskText === "") {

            return;

        }


        // --------------------------
        // タスクIDを作成
        // --------------------------

        const todoId =
            crypto.randomUUID();


        // このIDを追加アニメーションさせる
        newlyAddedTodoId =
            todoId;


        // --------------------------
        // Firestoreの保存場所
        // --------------------------

        const todoReference =
            doc(
                db,
                "users",
                currentUser.uid,
                "todos",
                todoId
            );


        try {

            // ----------------------
            // Firestoreへ保存
            // ----------------------

            await setDoc(
                todoReference,
                {

                    text:
                        taskText,

                    completed:
                        false,

                    createdAt:
                        Date.now()

                }
            );


            // ----------------------
            // 入力欄を空にする
            // ----------------------

            todoInput.value = "";

            todoInput.focus();


        } catch (error) {

            console.error(
                "タスク追加エラー:",
                error
            );

            // 失敗した場合はリセット
            newlyAddedTodoId = null;

            alert(
                "タスクを保存できませんでした。"
            );

        }

    }
);


// ==============================
// 12. 最初の表示
// ==============================

// ログイン確認が終わるまでは入力不可
todoInput.disabled = true;

// 空の状態を表示
renderTodos();


// ==============================
// 13. Service Workerを登録
// ==============================

if ("serviceWorker" in navigator) {

    window.addEventListener(
        "load",
        () => {

            navigator
                .serviceWorker
                .register(
                    "./service-worker.js"
                )
                .then(() => {

                    console.log(
                        "Service Workerを登録しました"
                    );

                })
                .catch(
                    (error) => {

                        console.error(
                            "Service Worker登録エラー:",
                            error
                        );

                    }
                );

        }
    );

}