const AWS = require('aws-sdk');

exports.handler = async(event) => {
    const response = {
        code: 200,
        body: JSON.stringify(event)
    }
    return response;
};