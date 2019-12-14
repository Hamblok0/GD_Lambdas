const AWS = require("aws-sdk");

AWS.config.update({
  region: "us-east-2"
});
const ddb = new AWS.DynamoDB.DocumentClient({ apiVersion: "2012-08-10" });

const validate = input => {
  return new Promise((resolve, reject) => {
    if (!input.email || !input.reading) {
      reject({
        code: 400,
        msg: "Error: Please submit an email and a reading ID"
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



exports.handler = async event => {
  const body = JSON.stringify({
    email: "auser1@gmail.com",
    reading: "2fb2c64d-741b-49a0-bef9-8591312250e4"
  });

  const input = JSON.parse(body);

  try {
    const validated = await validate(input);
    const user = await getUser(validated);
  } catch (err) {
    return {
      statusCode: err.code,
      body: JSON.stringify(err.msg),
      isBase64Encoded: false
    };
  }
};
