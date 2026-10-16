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


// ==============================
// 4. アプリで使用する変数
// ==============================

// 現在ログインしているユーザー
let currentUser = null;

// 現在のToDo一覧
let todos = [];

// Firestoreの監視を解除するための変数
let unsubscribeTodos = null;


// ==============================
// 5. Googleログイン
// ==============================

loginButton.addEventListener("click", async () => {

    try {

        await signInWithPopup(auth, provider);

    } catch (error) {

        console.error("ログインエラー:", error);

    }

});


// ==============================
// 6. ログアウト
// ==============================

logoutButton.addEventListener("click", async () => {

    try {

        await signOut(auth);

    } catch (error) {

        console.error("ログアウトエラー:", error);

    }

});


// ==============================
// 7. ログイン状態を確認
// ==============================

onAuthStateChanged(auth, (user) => {

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

        console.log("ログインしました");
        console.log(user);

        userInfo.textContent =
            `${user.displayName} でログイン中`;

        loginButton.style.display = "none";
        logoutButton.style.display = "inline-block";

        // 入力を許可
        todoInput.disabled = false;

        // FirestoreのToDoを監視
        startTodoListener();

    } else {

        // --------------------------
        // ログアウトしている場合
        // --------------------------

        console.log("ログアウトしています");

        currentUser = null;

        todos = [];

        userInfo.textContent = "";

        loginButton.style.display = "inline-block";
        logoutButton.style.display = "none";

        // ログアウト中は入力不可
        todoInput.disabled = true;

        renderTodos();
    }

});


// ==============================
// 8. Firestoreをリアルタイム監視
// ==============================

function startTodoListener() {

    // ログインしていなければ何もしない
    if (currentUser === null) {
        return;
    }

    // 自分専用のtodosコレクション
    const todosCollection = collection(
        db,
        "users",
        currentUser.uid,
        "todos"
    );

    // Firestoreを監視する
    unsubscribeTodos = onSnapshot(
        todosCollection,

        (snapshot) => {

            todos = [];

            snapshot.forEach((document) => {

                const data = document.data();

                todos.push({
                    id: document.id,
                    text: data.text,
                    completed: data.completed,
                    createdAt: data.createdAt
                });

            });


            // 作成順に並べる
            todos.sort((a, b) => {

                return (a.createdAt || 0) -
                       (b.createdAt || 0);

            });


            // 画面を更新
            renderTodos();

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

    // 一度すべて消す
    todoList.replaceChildren();


    // 完了数
    const completedTotal =
        todos.filter((todo) => {
            return todo.completed;
        }).length;


    // 未完了数
    const remainingTotal =
        todos.length - completedTotal;


    // 件数を表示
    totalCount.textContent =
        todos.length;

    remainingCount.textContent =
        remainingTotal;

    completedCount.textContent =
        completedTotal;


    // タスクが0件ならメッセージ表示
    emptyMessage.classList.toggle(
        "is-hidden",
        todos.length > 0
    );


    // ToDoを1件ずつ表示
    todos.forEach((todo) => {

        const listItem =
            document.createElement("li");

        listItem.className =
            "todo-item";


        listItem.classList.toggle(
            "is-completed",
            todo.completed
        );


        // --------------------------
        // チェックボックス
        // --------------------------

        const checkbox =
            document.createElement("input");

        checkbox.type = "checkbox";

        checkbox.className =
            "todo-checkbox";

        checkbox.checked =
            todo.completed;


        // 完了状態変更
        checkbox.addEventListener(
            "change",
            async () => {

                if (currentUser === null) {
                    return;
                }

                try {

                    const todoReference = doc(
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
            document.createElement("span");

        text.className =
            "todo-text";

        text.textContent =
            todo.text;


        // --------------------------
        // 削除ボタン
        // --------------------------

        const deleteButton =
            document.createElement("button");

        deleteButton.type =
            "button";

        deleteButton.className =
            "delete-button";

        deleteButton.textContent =
            "削除";


        deleteButton.addEventListener(
            "click",
            async () => {

                if (currentUser === null) {
                    return;
                }

                try {

                    const todoReference = doc(
                        db,
                        "users",
                        currentUser.uid,
                        "todos",
                        todo.id
                    );

                    await deleteDoc(
                        todoReference
                    );

                } catch (error) {

                    console.error(
                        "削除エラー:",
                        error
                    );

                }

            }
        );


        // HTMLに追加
        listItem.append(
            checkbox,
            text,
            deleteButton
        );

        todoList.appendChild(
            listItem
        );

    });

}


// ==============================
// 10. 新しいToDoを追加
// ==============================

todoForm.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();


        // ログインしているか確認
        if (currentUser === null) {

            alert(
                "Googleでログインしてください。"
            );

            return;
        }


        const taskText =
            todoInput.value.trim();


        // 空欄なら追加しない
        if (taskText === "") {
            return;
        }


        // タスクIDを作成
        const todoId =
            crypto.randomUUID();


        // 保存場所
        const todoReference = doc(
            db,
            "users",
            currentUser.uid,
            "todos",
            todoId
        );


        try {

            // Firestoreへ保存
            await setDoc(
                todoReference,
                {
                    text: taskText,
                    completed: false,
                    createdAt: Date.now()
                }
            );


            // 入力欄を空にする
            todoInput.value = "";

            todoInput.focus();


        } catch (error) {

            console.error(
                "タスク追加エラー:",
                error
            );

            alert(
                "タスクを保存できませんでした。"
            );

        }

    }
);


// ==============================
// 11. 最初の表示
// ==============================

// ログイン確認が終わるまでは入力不可
todoInput.disabled = true;

// 空の状態を表示
renderTodos();