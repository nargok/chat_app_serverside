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