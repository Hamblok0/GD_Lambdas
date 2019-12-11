const AWS = require("aws-sdk");
const uuidv4 = require("uuid/v4");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

AWS.config.update({ region: "us-east-2" });
const ddb = new AWS.DynamoDB.DocumentClient({ apiVersion: "2012-08-10" });
const secret = process.env.secret;

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
          "created": Date.now()
        }
      }

      ddb.put(params, (err, data) => {
        if (err) {
          console.log(`DDB ERR ${err}`)
          reject({ code: 500, msg: "Internal server error" })
          return;
        }
        const payload = {
          "email": params.email,
          "id": params.id
        }
        resolve(payload);
      })
    })
  })
}

const createToken = payload => {
  return new Promise((resolve, reject) => {
    jwt.sign({payload}, secret, { expiresIn: '7d' }, (err, token) => {
      if (err) {
        console.log(`JWT ERR: ${err}`)
        reject({ code: 500, msg: "Internal server error" });
      }
      resolve(token);
    })
  })
}

exports.handler = async event => {
  const body = JSON.parse(event.body);

  try {
    await validate(body);
    const newUser = await createUser(JSON.parse(newEvent.body));
    const token = await createToken(newUser);

    return {
      statusCode: 200,
      body: token
    }
  } catch (err) {
    return {
      code: err.code,
      body: JSON.stringify(err.msg)
    };
  }
};
