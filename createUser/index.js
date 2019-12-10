const AWS = require("aws-sdk");
const uuidv4 = require("uuid/v4");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

AWS.config.update({ region: "us-east-2" });
const ddb = new AWS.DynamoDB.DocumentClient({ apiVersion: "2012-08-10" });

const validate = email => {
  return new Promise((resolve, reject) => {
    const params = {
      TableName: "Users",
      Key: {
        "email": email
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
        reject({code: 500, msg: "Internal server error"})
      }

      const params = {
        TableName: "Users",
        Item: {
          "email": userData.email,
          "password": hash,
          "id": id,
          "created": Date.now()
        }
      }

      ddb.put(params, (err, data) => {
        if (err) {
          console.log(`DDB ERR ${err}`)
          reject({code: 500, msg: "Internal server error"})
        }
        resolve();
      })
    })
  })
}

exports.handler = async event => {
  const body = {
    email: "someguy@gmail.com",
    password: "123123"
  };

  const newEvent = { ...event, body: JSON.stringify(body) };

  try {
    await validate(JSON.parse(newEvent.body).email);
    const newUser = await createUser(JSON.parse(newEvent.body));

    return {
      code: 200,
      body: JSON.stringify(newUser)
    }
  } catch (err) {
    return {
      code: err.code,
      body: JSON.stringify(err.msg)
    };
  }
};
