const AWS = require("aws-sdk");
const uuidv4 = require("uuid/v4");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

AWS.config.update({ region: "us-east-2" });
const ddb = new AWS.DynamoDB.DocumentClient({ apiVersion: "2012-08-10" });
const secret = process.env.secret;

const newDeck = [
  "t-0", "t-1", "t-2", "t-3", "t-4", "t-5", "t-6", "t-7", "t-8", "t-9", "t-10", "t-11", "t-12", "t-13", "t-14", "t-15",
  "t-16", "t-17", "t-18", "t-19", "t-20", "t-21", "w-1", "w-2", "w-3", "w-4", "w-5", "w-6", "w-7", "w-8", "w-9", "w-10",
  "w-k", "w-q", "w-p1", "w-p2", "s-1", "s-2", "s-3", "s-4", "s-5", "s-6", "s-7", "s-8", "s-9", "s-10", "s-k", "s-q", "s-p1",
  "s-p2", "c-1", "c-2", "c-3", "c-4", "c-5", "c-6", "c-7", "c-8", "c-9", "c-10", "c-k", "c-q", "c-p1", "c-p2", "d-1", "d-2",
  "d-3", "d-4", "d-5", "d-6", "d-7", "d-8", "d-9", "d-10", "d-k", "d-q", "d-p1", "d-p2"
]

const validate = body => {
  return new Promise((resolve, reject) => {
    if (!body || !body.email || !body.password) {
      reject({ code: 400, msg: "Email and/or password was not submitted" });
      return;
    }
    const params = {
      TableName: "Users",
      Key: {
        "email": body.email
      }
    };

    ddb.get(params, (err, data) => {
      if (err) {
        console.log(`DDB ERR: ${err}`)
        reject({code: 500, msg: "Internal server error"});
      } else if (data.Item) {
        reject({code: 400, msg: "User already exists"});
      } else {
        resolve();
      }
    });
  });
};

const createUser = userData => {
  return new Promise((resolve, reject) => {
    const id = uuidv4();
    bcrypt.hash(userData.password, 10, (err, hash) => {
      if (err) {
        console.log(`HASH ERR: ${err}`)
        reject({ code: 500, msg: "Internal server error" });
        return;
      }

      const params = {
        TableName: "Users",
        Item: {
          "email": userData.email,
          "password": hash,
          "id": id,
          "created": Date.now(),
          "deck": JSON.stringify(newDeck)
        }
      }

      ddb.put(params, (err, data) => {
        if (err) {
          console.log(`DDB ERR ${err}`)
          reject({ code: 500, msg: "Internal server error" })
          return;
        }
        const payload = {
          email: userData.email,
          id: id,
          deck: newDeck
        }
        resolve(payload);
      })
    })
  })
}

const createToken = payload => {
  return new Promise((resolve, reject) => {
    jwt.sign(payload, secret, { expiresIn: '7d' }, (err, token) => {
      if (err) {
        console.log(`JWT ERR: ${err}`)
        reject({ code: 500, msg: "Internal server error" });
        return;
      }
      resolve(token);
    })
  })
}

exports.handler = async event => {
  console.log(event);
  const body = JSON.parse(event.body);

  try {
    await validate(body);
    const newUser = await createUser(body);
    const token = await createToken(newUser);

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify(token),
      isBase64Encoded: false
    }
  } catch (err) {
    return {
      statusCode: err.code,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify(err.msg),
      isBase64Encoded: false
    };
  }
};
