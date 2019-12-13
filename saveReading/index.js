const AWS = require("aws-sdk");
const uuidv4 = require("uuid/v4");

AWS.config.update({ region: "us-east-2" });
const ddb = new AWS.DynamoDB.DocumentClient({ apiVersion: "2012-08-10" });

const validate = input => {
  return new Promise((resolve, reject) => {
    const data = JSON.parse(input);
    if (!data.user || !data.deck) {
      reject({ code: 400, msg: "Error: Must submit a user and deck" });
      return;
    }
    if (data.deck.length === 0 || !Array.isArray(data.deck)) {
      reject({ code: 400, msg: "Error: Invalid deck format" });
      return;
    }
    resolve(data);
  });
};

const saveReading = data => {
  return new Promise((resolve, reject) => {
    const id = uuidv4();
    const params = {
      TableName: "Archives",
      Item: {
        id: id,
        user: data.user,
        deck: JSON.stringify(data.deck),
        spread: "Golden_Dawn",
        date: Date.now()
      }
    };
    ddb.put(params, (err, response) => {
      if (err) {
        console.log(`DDB ERROR: ${err}`);
        reject({ code: 500, msg: "Internal server error" });
        return;
      }
      resolve({ reading: id, user: data.user });
    });
  });
};

const updateUser = data => {
  return new Promise((resolve, reject) => {
    const params = {
      TableName: "Users",
      Key: {
        email: data.user
      }
    };

    ddb.get(params, (err, response) => {
      if (err) {
        console.log(`DDB ERROR: ${err}`);
        reject({ code: 500, msg: "Internal server error" });
        return;
      }
      if (!response.Item) {
        reject({ code: 400, msg: "User does not exist!" });
        return;
      }
      const user = response.Item;
      if (!user.archived) {
        const newArchive = JSON.stringify([data.reading]);
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
          }
          resolve();
        });
      } else {
        const archive = JSON.parse(user.archived);
        const newArchive = JSON.stringify([...archive, data.reading]);
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
          }
          resolve();
        });
      }
    });
  });
};

exports.handler = async event => {
  if (!event.body) {
    return {
      statusCode: 400,
      body: JSON.stringify("Error: No data submitted"),
      isBase64Encoded: false
    };
  }

  try {
    const validated = await validate(event.body);
    const savedReading = await saveReading(validated);
    await updateUser(savedReading);

    return {
      statusCode: 200,
      body: JSON.stringify("Reading successfully saved!"),
      isBase64Encoded: false
    };
  } catch (err) {
    return {
      statusCode: err.code,
      body: JSON.stringify(err.msg),
      isBase64Encoded: false
    };
  }
};
