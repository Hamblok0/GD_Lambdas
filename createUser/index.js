const AWS = require('aws-sdk');
const uuidv4 = require('uuid/v4');

exports.handler = async(event) => {
    const body = {
        email: "someguy@gmail.com",
        password: "123123"
    }
    const newEvent = {...event, body: JSON.stringify(body)};

    
    const response = {
        code: 200,
        body: JSON.stringify(newEvent)
    }
    return response;
};