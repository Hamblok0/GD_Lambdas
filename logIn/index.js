const AWS = require("aws-sdk");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

AWS.config.update({ region: "us-east-2" });
const ddb = new AWS.DynamoDB.DocumentClient({ apiVersion: "2012-08-10" });
const secret = process.env.secret;

const validate = input => {
    return new Promise((resolve, reject) => {
        const user = JSON.parse(input);
        if (!user.email || !user.password) {
            reject({ code: 400, msg: "Error: Please submit an email and a password"});
            return;
        }
        resolve(user);
    })
}

const getUser = input => {
    return new Promise((resolve, reject) => {
        const params = {
            TableName: "Users",
            Key: {
                "email": input.email
            }
        }
        ddb.get(params, (err, data) => {
            if (err) {
                console.log(`DDB ERROR: ${err}`);
                reject({ code: 500, msg: "Internal server error"});
                return;
            }
            if (!data.Item) {
                reject({ code: 400, msg: "User does not exist"});
                return;
            }
            resolve(data.Item);
        })
    })
}

exports.handler = async event => {
    const body = JSON.stringify({
        email: "auser1@gmail.com",
        password: "123123"
    })

    try {
        const validated = await validate(body);
        const user = await getUser(validated);
        console.log(user);
        return {
            statusCode: 200,
            body: JSON.stringify("Got 'em"),
            isBase64Encoded: false
        }
    } catch (err) {
        return {
            statusCode: err.code,
            body: JSON.stringify(err.msg),
            isBase64Encoded: false
        }
    }
}