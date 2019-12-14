const AWS = require("aws-sdk");

AWS.config.update({ region: "us-east-2"  });
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

const validateReading = (reading, user) => {
  return new Promise((resolve, reject) => {
    const archives = JSON.parse(user.archived);
    if (!archived || user.archived.length < 1) {
      reject({ code: 400, msg: "User does not have any saved readings"});
      return;
    }
    if (!archived.includes(reading)) {
      reject({ code: 400, msg: "Archived reading does not exist for user" })
      return;
    }
    const params = {
      TableName: "Archives",
      Key: {
        "id": reading
      }
    }
    ddb.get(params, (err, data) => {
      if (err) {
        console.log(`DDB ERROR: ${err}`);
        reject({ code: 500, msg: "Internal server error" });
        return;
      }
      if (!data.Item) {
        reject({ code: 400, msg: "Archived reading does not exist in archives" });
        return;
      }
      resolve();
    })
  })
}

const deleteReading = reading => {
  return new Promise((resolve, reject) => {
    const params = {
      TableName: "Archives",
      Key: {
        "id": reading
      }
    }
    ddb.delete(params, err => {
      if (err) {
        console.log(`DDB ERROR: ${err}`);
        reject({ code: 500, msg: "Internal server error" });
        return;
      }
      resolve();
    })
  })
}

const updateUser = (reading, user) => {
  return new Promise((resolve, reject) => {
    const newArchive = JSON.stringify(JSON.parse(user.archived).filter(item => {
      return item !== reading;
    }));
    const params = {
      TableName: "Users",
      Key: {
        "email": user.email
      },
      UpdateExpression: "set archived = :r",
      ExpressionAttributeValues: {
        ":r": newArchive
      }
    }
    ddb.update(params, err => {
      if (err) {
        console.log(`DDB ERROR: ${err}`);
        reject({ code: 500, msg: "Internal server error" });
        return;
      }
      resolve();
    })
  })
}


exports.handler = async event => {
  const body = JSON.stringify({
    email: "auser1@gmail.com",
    reading: "2fb2c64d-741b-49a0-bef9-8591312250e4"
  });
  const input = JSON.parse(body);

  try {
    const validated = await validate(input);
    const user = await getUser(validated);
    await validateReading(validated.reading, user);
    await deleteReading(validated.reading);
    await updateUser(validated.reading, user);
    return {
      statusCode: 200,
      body: JSON.stringify("Reading successfully deleted"),
      isBase64Encoded: false
    }
  } catch (err) {
    return {
      statusCode: err.code,
      body: JSON.stringify(err.msg),
      isBase64Encoded: false
    };
  }
};
