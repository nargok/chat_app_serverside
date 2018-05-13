const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);
const express = require('express');
const app = express();
const cors = require('cors')({origin: true})
app.use(cors);

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//  response.send("Hello from Firebase!");
// });

// 仕様
// 認証しなくてもチャット機能を使える

// ユーザ情報の取得
const anonymousUser = {
  id: "anon",
  name: "Anonymous",
  avatar: ""
};

const checkUser = (req, res, next) => {
  req.user = anonymousUser;
  if (req.query.auth_token != undefined) {
    let idToken = req.query.auth_token;
    // ユーザを検証する
    admin.auth().verifyIdToken(idToken).then(decodedIdtoken => {
      // 検証したユーザの情報を設定する
      let authUser = {
        id :decodedIdtoken.user_id,
        name: decodedIdtoken.name,
        avatar: decodedIdtoken.picture
      };
      // reqオブジェクトにuserとして設定する
      req.user = authUser;
      next();
    }).catch(error => {
      next();
    });
  } else {
    next();
  };
};

app.use(checkUser);

// チャンネルの作成
function createChannel(cname){
  let channelsRef = admin.database().ref('channels');
  let date1 = new Date();
  let date2 = new Date();
  date2.setSeconds(date2.getSeconds() + 1);
  const defaultData = `{
    "messages" : {
      "1" : {
        "body" : "Welcome to #{cname} channel!",
        "date" : "${date1.toJSON()}",
        "user" : {
          "avatar" : "",
          "id" : "robot",
          "name" : "Robot"
        }
      },
      "2" : {
        "body" : "はじめてのメッセージを投稿してみましょう。",
        "date" : "${date2.toJSON()}",
        "user" : {
          "avatar" : "",
          "id" : "robot",
          "name" : "Robot"
        }
      }
    }
  }`;
  channelsRef.child(cname).set(JSON.parse(defaultData));
}

app.post('/channels', (req, res) => {
  let cname = req.body.cname;
  createChannel(cname);
  res.header('Content-Type', 'application/json; charset=utf-8');
  req.statusCode(201).json({result: 'ok'});
});

// チェンネル一覧の取得
app.get('/channels', (req, res) => {
  let channelsRef = admin.database().ref('channels');
  // データの読み出しは、valueイベントを使う
  // onceで1回だけコールバックする
  channelsRef.once('value', function(snapshot) {
    let items = new Array();
    snapshot.forEach(function(childSnapshot) {
      let cname = childSnapshot.key;
      items.push(cname)
    });
    res.header('Content-Type', 'application/json; charset=utf-8');
    res.send({channels: items});
  })
});

// メッセージの追加
// :cnameでこの位置にある値(チャンネル名)をreq.params.cnameにセットする
app.post('/channels/:cname/messages', (req, res) => {
  // チェンネル名を取得する
  let cname = req.params.cname;
  let message = {
    date: new Date().toJSON(),
    body: req.body.body,
    user: req.user
  };
  let messagesRef = admin.database().ref(`channels/${cname}/messages`);
  // パスにmessageオブジェクトをセットする
  messagesRef.push(message);
  res.header('Content-Type', 'application/json; charset=utf-8');
  res.status(201).send({result: "ok"});
});

// メッセージ一覧の取得
app.get('/channels/:cname/messages', (req, res) => {
 let cname = req.params.cname;
 // dateキーで並べ替え、最後から20件を取得する
 let messagesRef = admin.database().ref(`channels/${cname}/messages`).orderByChild(`date`).limitToLast(20);
 messagesRef.once('value', function(snapshot) {
  let items = new Array();
  snapshot.forEach(function(childSnapshot) {
    let message = childSnapshot.val();
    message.id = childSnapshot.key;
    items.push(message);
  });
  // 日付の降順になっているので昇順に変える
  items.reverse();
  res.header('Content-Type', 'application/json; charset=utf-8');
  res.send({messages: items});
 });
});

// リセット
app.post('/reset', (req, res) => {
  createChannel('general');
  createChannel('random');
  res.header('Content-Type', 'application/json; charset=utf-8');
  res.status(201).send({result: "ok"});
});