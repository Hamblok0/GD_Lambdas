const AWS = require("aws-sdk");
const uuidv4 = require("uuid/v4");

const deck = [
  "t-0",
  "t-1",
  "t-2",
  "t-3",
  "t-4",
  "t-5",
  "t-6",
  "t-7",
  "t-8",
  "t-9",
  "t-10",
  "t-11",
  "t-12",
  "t-13",
  "t-14",
  "t-15",
  "t-16",
  "t-17",
  "t-18",
  "t-19",
  "t-20",
  "t-21",
  "w-1",
  "w-2",
  "w-3",
  "w-4",
  "w-5",
  "w-6",
  "w-7",
  "w-8",
  "w-9",
  "w-10",
  "w-k",
  "w-q",
  "w-p1",
  "w-p2",
  "s-1",
  "s-2",
  "s-3",
  "s-4",
  "s-5",
  "s-6",
  "s-7",
  "s-8",
  "s-9",
  "s-10",
  "s-k",
  "s-q",
  "s-p1",
  "s-p2",
  "c-1",
  "c-2",
  "c-3",
  "c-4",
  "c-5",
  "c-6",
  "c-7",
  "c-8",
  "c-9",
  "c-10",
  "c-k",
  "c-q",
  "c-p1",
  "c-p2",
  "d-1",
  "d-2",
  "d-3",
  "d-4",
  "d-5",
  "d-6",
  "d-7",
  "d-8",
  "d-9",
  "d-10",
  "d-k",
  "d-q",
  "d-p1",
  "d-p2"
];

AWS.config.update({
  region: "us-east-2"
});
const ddb = new AWS.DynamoDB.DocumentClient({ apiVersion: "2012-08-10" });

const validate = input => {
    return new Promise((resolve, reject) => {
        const data = JSON.parse(input);
        if (!data.user || !data.deck) {
            reject({ code: 400, msg: "Error: Must submit a user and deck" });
            return;
        }
        if (data.deck.length() === 0 || !Array.isArray(data.deck)) {
            reject({ code: 400, msg: "Error: Invalid deck format" });
            return;
        }
        resolve(data);
    })
}

const saveReading = data => {
    return new Promise((resolve, reject) => {
        const params = {
            TableName: "Archives",
            Item: {
                "id": uuidv4(),
                "user": data.user,
                "deck": JSON.stringify(data.deck),
                "spread": "Golden_Dawn",
                "date": Date,now()
            }
        }

        ddb.put(params, (err, data) => {
            if (err) {
                console.log(`DDB ERROR: ${err}`)
                reject({ code:500, msg: "Internal server error"});
                return;
            }
            console.log(data);
            resolve();
        })
    })
}

exports.handler = async event => {
  const body = {
    user: "dfe1093a-46a1-44be-ad00-2141173b4203",
    deck: deck
  };
  const newEvent = { ...event, body: JSON.stringify(body) };

  if (!newEvent.body) {
      return {
          statusCode: 400,
          body: JSON.stringify("Error: No data submitted"),
          isBase64Encoded: false
      }
  }
  try {
    const validated = await validate(newEvent.body);
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
