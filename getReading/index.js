const AWS = require("aws-sdk");

AWS.config.update({ region: "us-east-2" });
const ddb = new AWS.DynamoDB.DocumentClient({ apiVersion: "2012-08-10" });

const validate = input => {
  return new Promise((resolve, reject) => {
    const data = JSON.parse(input);
    if (!data.user || !data.readings) {
      reject({ code: 400, msg: "ERROR: Must send a user and readings" });
      return;
    }
    resolve(data);
  });
};

const getReadings = input => {
  return new Promise((resolve, reject) => {
    const keys = input.readings.map(item => {
      return {
        user: input.user,
        id: item
      };
    });
    const params = {
      RequestItems: {
        Archives: {
          Keys: keys
        }
      }
    };
    console.log("here");
    ddb.batchGet(params, (err, data) => {
      if (err) {
        console.log(`DDB ERROR: ${err}`);
        reject({ code: 500, msg: "Internal server error" });
        return;
      }
      resolve(data);
    });
  });
};

exports.handler = async event => {
  if (!event.body) {
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify("Please submit a user and list of readings"),
      isBase64Encoded: false
    };
  }

  try {
    const validated = await validate(event.body);
    const readings = await getReadings(validated);
    await console.log(readings);

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify(readings),
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
