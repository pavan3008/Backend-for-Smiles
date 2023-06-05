const AWS = require('aws-sdk');
require('dotenv').config();

const dynamoDB = new AWS.DynamoDB.DocumentClient();

const DYNAMODB_TABLE_NAME = process.env.DYNAMODB_TABLE_NAME;

async function getProfile(userId) {
  const params = {
    TableName: DYNAMODB_TABLE_NAME,
    Key: {
      'PK': `User${userId}`,
      'SK': `User${userId}`
    }
  };
  try {
    const result = await dynamoDB.get(params).promise();
    return result.Item;
  } catch (error) {
    console.error('Error fetching user details:', error);
    throw new Error('Failed to fetch user details');
  }
}

async function getUsersForTrip(tripId) {
  const params = {
    TableName: DYNAMODB_TABLE_NAME,
    IndexName: 'Trips-Users-view',
    KeyConditionExpression: 'GSI1 = :tripId',
    FilterExpression: 'begins_with(SK, :sk)',
    ExpressionAttributeValues: {
      ':tripId': `Trip${tripId}`,
      ':sk': 'User',
    },
    ProjectionExpression: 'PK',
  };
  
  try {
    const result = await dynamoDB.query(params).promise();

    if (!result.Items || result.Items.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'Trip not found' }),
      };
    }

    const userIds = result.Items.map((item) => item.PK);

    const userParams = {
      RequestItems: {
        [DYNAMODB_TABLE_NAME]: {
          Keys: userIds.map((userId) => ({
            PK: userId,
            SK: userId,
          })),
          ProjectionExpression: 'PK, user_data',
        },
      },
    };

    const userResult = await dynamoDB.batchGet(userParams).promise();

    const users = userResult.Responses[DYNAMODB_TABLE_NAME].map((user) => ({
      userId: user.PK.replace('User', ''),
      userData: user.user_data,
    }));

    return {
      statusCode: 200,
      body: JSON.stringify(users),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal Server Error' }),
    };
  }
}

module.exports = { getUsersForTrip, getProfile };