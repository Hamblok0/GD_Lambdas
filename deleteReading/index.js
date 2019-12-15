const AWS = require("aws-sdk");

AWS.config.update({ region: "us-east-2" });
const ddb = new AWS.DynamoDB.DocumentClient({ apiVersion: "2012-08-10" });

const validate = input => {
  return new Promise((resolve, reject) => {
    const data = JSON.parse(input);
    if (!data.email || !data.reading) {
      reject({
        code: 400,
        msg: "Error: Please submit an email and a reading ID"
      });
      return;
    }
    resolve(data);
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

const validateReading = (reading, user) => {
  return new Promise((resolve, reject) => {
    if (!user.archived) {
      reject({ code: 400, msg: "User does not have any saved readings" });
      return;
    }
    const archives = JSON.parse(user.archived);
    if (!archives.includes(reading)) {
      reject({ code: 400, msg: "Archived reading does not exist for user" });
      return;
    }
    const params = {
      TableName: "Archives",
      Key: {
        id: reading,
        user: user.email
      }
    };
    ddb.get(params, (err, data) => {
      if (err) {
        console.log(`DDB ERROR: ${err}`);
        reject({ code: 500, msg: "Internal server error" });
        return;
      }
      if (!data.Item) {
        reject({
          code: 400,
          msg: "Archived reading does not exist in archives"
        });
        return;
      }
      resolve();
    });
  });
};

const deleteReading = (reading, user) => {
  return new Promise((resolve, reject) => {
    const params = {
      TableName: "Archives",
      Key: {
        id: reading,
        user: user.email
      }
    };
    ddb.delete(params, err => {
      if (err) {
        console.log(`DDB ERROR: ${err}`);
        reject({ code: 500, msg: "Internal server error" });
        return;
      }
      resolve();
    });
  });
};

const updateUser = (reading, user) => {
  return new Promise((resolve, reject) => {
    const newArchive = JSON.stringify(
      JSON.parse(user.archived).filter(item => {
        return item !== reading;
      })
    );
    const params = {
      TableName: "Users",
      Key: {
        email: user.email
      },
      UpdateExpression: "set archived = :r",
      ExpressionAttributeValues: {
        ":r": newArchive
      }
    };
    ddb.update(params, err => {
      if (err) {
        console.log(`DDB ERROR: ${err}`);
        reject({ code: 500, msg: "Internal server error" });
        return;
      }
      resolve();
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
      body: JSON.stringify("No body submitted"),
      isBase64Encoded: false
    };
  }

  try {
    const validated = await validate(event.body);
    const user = await getUser(validated);
    await validateReading(validated.reading, user);
    await deleteReading(validated.reading, user);
    await updateUser(validated.reading, user);
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify("Reading successfully deleted"),
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
