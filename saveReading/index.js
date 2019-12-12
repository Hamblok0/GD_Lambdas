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
    })
}

const saveReading = data => {
    return new Promise((resolve, reject) => {
        const id = uuidv4();
        const params = {
            TableName: "Archives",
            Item: {
                "id": id,
                "user": data.user,
                "deck": JSON.stringify(data.deck),
                "spread": "Golden_Dawn",
                "date": Date.now()
            }
        }
        ddb.put(params, (err, response) => {
            if (err) {
                console.log(`DDB ERROR: ${err}`)
                reject({ code: 500, msg: "Internal server error" });
                return;
            }
            console.log(`RESPONSE FROM DDB PUT ${response}`);
            resolve();
        })
    })
}

exports.handler = async event => {
  if (event.body) {
      return {
          statusCode: 400,
          body: JSON.stringify("Error: No data submitted"),
          isBase64Encoded: false
      }
  }
  try {
    const validated = await validate(event.body);
    await saveReading(validated);
    return {
        statusCode: 200,
        body: JSON.stringify("Successfully saved reading!"),
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
