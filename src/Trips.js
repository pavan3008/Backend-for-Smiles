const AWS = require('aws-sdk');

const dynamoDB = new AWS.DynamoDB.DocumentClient();
const { v4: uuidv4 } = require('uuid');

const DYNAMODB_TABLE_NAME = process.env.DYNAMODB_TABLE_NAME;

async function getTripsForUser(userId) {
  // Get all trips details for a user
  const params = {
    TableName: DYNAMODB_TABLE_NAME,
    IndexName: 'Users-Trips-view',
    KeyConditionExpression: 'GSI2 = :gs1pk',
    ExpressionAttributeValues: {
      ':gs1pk': `User${userId}`,
    },
    ProjectionExpression: 'PK, trip_name, trip_status',
  };

  const result = await dynamoDB.query(params).promise();

  // const items = result.Items.filter((item) => item.trip_name && item.trip_status); // consider removing it when GSI2 for tasks and expenses is removed
  const items = result.Items.map((item) => ({
    PK: item.PK.replace('Trip', ''),
    tripName: item.trip_name,
    status: item.trip_status,
  }));

  return {
    statusCode: 200,
    body: JSON.stringify(items),
  };
}

async function getTrip(tripId) {
  const params = {
    TableName: DYNAMODB_TABLE_NAME,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: {
      ':pk': `Trip${tripId}`,
      ':sk': `Trip`,
    },
    ProjectionExpression: 'trip_name, trip_status',
  };

  const result = await dynamoDB.query(params).promise();

  if (!result.Items || result.Items.length === 0) {
    return {
      statusCode: 404,
      body: JSON.stringify({ message: 'Trip not found' }),
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify(result.Items[0]),
  };
}

async function createTripForUser(userId, trip_name) {
  const tripId = `Trip${uuidv4()}`;
  const trip_status = 'Progress';
  const tripItem = {
    PK: tripId,
    SK: `${tripId}#User${userId}`,
    GSI2: `User${userId}`,
    trip_name,
    trip_status,
  };

  const userItem = {
    PK: `User${userId}`,
    SK: `User${userId}#${tripId}`,
    GSI1: tripId,
  };

  const params = {
    RequestItems: {
      [DYNAMODB_TABLE_NAME]: [
        {
          PutRequest: {
            Item: tripItem,
          },
        },
        {
          PutRequest: {
            Item: userItem,
          },
        },
      ],
    },
  };

  try {
    await dynamoDB.batchWrite(params).promise();
    const response = {
      tripId: tripId.replace('Trip', ''),
      userId,
      trip_name,
      trip_status,
    };
    return { statusCode: 201, body: JSON.stringify(response) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Error creating trip' }) };
  }
}

async function modifyTrip(tripId, trip_name, trip_status) {
  let updateExpression = 'SET ';
  const expressionAttributeValues = {};

  if (trip_name) {
    updateExpression += 'trip_name = :name';
    expressionAttributeValues[':name'] = trip_name;
  }

  if (trip_status) {
    if (updateExpression !== 'SET ') {
      updateExpression += ', ';
    }
    updateExpression += 'trip_status = :status';
    expressionAttributeValues[':status'] = trip_status;
  }

  const queryParams = {
    TableName: DYNAMODB_TABLE_NAME,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: {
      ':pk': `Trip${tripId}`,
      ':sk': `Trip${tripId}`,
    },
  };

  try {
    const queryResult = await dynamoDB.query(queryParams).promise();
    const updatePromises = queryResult.Items.map(async (item) => {
      const params = {
        TableName: DYNAMODB_TABLE_NAME,
        Key: {
          PK: item.PK,
          SK: item.SK,
        },
        UpdateExpression: updateExpression,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW',
      };
      const updatedItem = await dynamoDB.update(params).promise();
      return updatedItem.Attributes; // return only the updated attributes
    });
    const updatedItems = await Promise.all(updatePromises);
    return { statusCode: 200, body: JSON.stringify(updatedItems) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ message: 'Error updating trip' }) };
  }
}

async function deleteTrip(tripId) {
  const queryParams = {
    TableName: DYNAMODB_TABLE_NAME,
    IndexName: 'Trips-Users-view',
    KeyConditionExpression: 'GSI1 = :pk',
    ExpressionAttributeValues: {
      ':pk': `Trip${tripId}`,
    },
  };

  const queryParams2 = {
    TableName: DYNAMODB_TABLE_NAME,
    KeyConditionExpression: 'PK = :pk and begins_with(SK, :sk)',
    ExpressionAttributeValues: {
      ':pk': `Trip${tripId}`,
      ':sk': 'Trip',
    },
  };

  const queryResult = await dynamoDB.query(queryParams).promise();
  const queryResult2 = await dynamoDB.query(queryParams2).promise();

  const deletePromises = [];

  for (const item of queryResult.Items) {
    const params = {
      TableName: DYNAMODB_TABLE_NAME,
      Key: {
        PK: item.PK,
        SK: item.SK,
      },
    };
    deletePromises.push(dynamoDB.delete(params).promise());
  }

  for (const item of queryResult2.Items) {
    const params = {
      TableName: DYNAMODB_TABLE_NAME,
      Key: {
        PK: item.PK,
        SK: item.SK,
      },
    };
    deletePromises.push(dynamoDB.delete(params).promise());
  }
  await Promise.all(deletePromises);
  return { statusCode: 200, body: 'Trip and associated records deleted successfully' };
}

module.exports = {
  getTripsForUser,
  getTrip,
  createTripForUser,
  modifyTrip,
  deleteTrip,
};

// TODO: Next do it with joinTrip function.