const AWS = require("aws-sdk");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

AWS.config.update({ region: "us-east-2" });
const ddb = new AWS.DynamoDB.DocumentClient({ apiVersion: "2012-08-10" });
const secret = process.env.secret;

const validate = input => {
  return new Promise((resolve, reject) => {
    if (!input.email || !input.password) {
      reject({
        code: 400,
        msg: "Error: Please submit an email and a password"
      });
      return;
    }
    resolve(input);
  });
};

const getUser = input => {
  return new Promise((resolve, reject) => {
    const params = {
      TableName: "Users",
      Key: {
        email: input.email
      }
    };
    ddb.get(params, (err, data) => {
      if (err) {
        console.log(`DDB ERROR: ${err}`);
        reject({ code: 500, msg: "Internal server error" });
        return;
      }
      if (!data.Item) {
        reject({ code: 400, msg: "User does not exist" });
        return;
      }
      resolve(data.Item);
    });
  });
};

const validatePassword = (hash, password) => {
  return new Promise((resolve, reject) => {
    bcrypt.compare(password, hash, (err, res) => {
      if (err) {
        console.log(`BCRYPT ERROR: ${err}`);
        reject({ code: 500, msg: "Internal server error" });
        return;
      }
      if (res) {
        resolve();
        return;
      } else {
        reject({ code: 400, msg: "Passwords do not match" });
        return;
      }
    });
  });
};

const createToken = user => {
  return new Promise((resolve, reject) => {
    const payload = {
      email: user.email,
      deck: user.deck,
      archived: user.archived || [],
      id: user.id
    };

    jwt.sign(payload, secret, { expiresIn: "7d" }, (err, token) => {
      if (err) {
        console.log(`JWT ERR: ${err}`);
        reject({ code: 500, msg: "Internal server error" });
        return;
      }
      resolve(token);
    });
  });
};

exports.handler = async event => {
  const input = JSON.parse(event.body);

  try {
    const validated = await validate(input);
    const user = await getUser(validated);
    await validatePassword(user.password, input.password);
    const token = await createToken(user);

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify(token),
      isBase64Encoded: false
    };
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
