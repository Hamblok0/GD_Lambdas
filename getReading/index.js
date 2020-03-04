const AWS = require("aws-sdk");

AWS.config.update({ region: "us-east-2" });
const ddb = new AWS.DynamoDB.DocumentClient({ apiVersion: "2012-08-10" });

const validate = (queryParams, multiValueQuery) => {
  return new Promise((resolve, reject) => {
    if (!queryParams.user || !multiValueQuery['readings[]']) {
      reject({ code: 400, msg: "ERROR: Must send a user and readings" });
      return;
    } else {
      const data = {
        user: queryParams.user,
        readings: multiValueQuery['readings[]']
      }
      resolve(data);
    }
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
  await console.log(event);
  try {
    const validated = await validate(event.queryStringParameters, event.multiValueQueryStringParameters);
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
    console.log(err);
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
