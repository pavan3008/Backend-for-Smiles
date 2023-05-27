const AWS = require("aws-sdk");

const dynamoDB = new AWS.DynamoDB.DocumentClient();
const { v4: uuidv4 } = require("uuid");

const DYNAMODB_TABLE_NAME = process.env.DYNAMODB_TABLE_NAME;

async function getTasksForTrip(tripId) {
  const params = {
    TableName: DYNAMODB_TABLE_NAME,
    IndexName: "Trips-Users-view",
    KeyConditionExpression: "GSI1 = :tripId",
    FilterExpression: "begins_with(PK, :pk)",
    ExpressionAttributeValues: {
      ":tripId": `Trip${tripId}`,
      ":pk": "Task",
    },
    ProjectionExpression: "PK, task_object",
  };

  try {
    const result = await dynamoDB.query(params).promise();

    return {
      statusCode: 200,
      body: JSON.stringify({
        Items: result.Items,
        Count: result.Count,
      }),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal Server Error" }),
    };
  }
}

async function getTaskDetails(taskId) {
  const params = {
    TableName: DYNAMODB_TABLE_NAME,
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
    ExpressionAttributeValues: {
      ":pk": `Task${taskId}`,
      ":sk": `Task`,
    },
    ProjectionExpression: "task_object",
  };
  const result = await dynamoDB.query(params).promise();

  if (!result.Items || result.Items.length === 0) {
    return {
      statusCode: 404,
      body: JSON.stringify({ message: "Tasks not found" }),
    };
  }
  return {
    statusCode: 200,
    body: JSON.stringify(result.Items),
  };
}

async function createTaskForTrip(tripId, taskName) {
  const taskId = `Task${uuidv4()}`;
  const taskObject = {
    task_name: taskName,
    task_status: "incomplete",
  };
  const taskItem = {
    PK: taskId,
    SK: taskId,
    GSI1: `Trip${tripId}`,
    task_object: taskObject,
  };

  const params = {
    TableName: DYNAMODB_TABLE_NAME,
    Item: taskItem,
  };

  try {
    await dynamoDB.put(params).promise();
    const response = {
      taskId: taskId.replace('Task', ''),
      tripId,
      taskName,
      task_status: "incomplete",
    };
    return { statusCode: 201, body: JSON.stringify(response) };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Error creating task" }),
    };
  }
}

async function updateTaskForTrip(taskId, taskName, taskStatus) {
  const params = {
    TableName: DYNAMODB_TABLE_NAME,
    Key: {
      PK: `Task${taskId}`,
      SK: `Task${taskId}`,
    },
    UpdateExpression: "SET ",
    ExpressionAttributeValues: {},
    ReturnValues: "ALL_NEW",
  };

  // Conditionally add the task name update expression and value
  if (taskName) {
    params.UpdateExpression += "task_object.task_name = :taskName";
    params.ExpressionAttributeValues[":taskName"] = taskName;
  }

  // Conditionally add the expense amount update expression and value
  if (taskStatus) {
    if (taskName) {
      params.UpdateExpression += ", ";
    }
    params.UpdateExpression += "task_object.task_status = :taskStatus";
    params.ExpressionAttributeValues[":taskStatus"] = taskStatus;
  }

  try {
    const result = await dynamoDB.update(params).promise();
    const expense = result.Attributes;
    return { statusCode: 200, body: JSON.stringify(expense) };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Error updating task" }),
    };
  }
}

async function deleteTaskForTrip(taskId) {
    const params = {
      TableName: DYNAMODB_TABLE_NAME,
      Key: {
        PK: `Task${taskId}`,
        SK: `Task${taskId}`,
      },
    };
  
    try {
      await dynamoDB.delete(params).promise();
      return { statusCode: 200, body: JSON.stringify({ message: 'Task deleted successfully' }) };
    } catch (err) {
      console.error(err);
      return { statusCode: 500, body: JSON.stringify({ error: 'Error deleting task' }) };
    }
  }
  

module.exports = {
  getTasksForTrip,
  getTaskDetails,
  createTaskForTrip,
  updateTaskForTrip,
  deleteTaskForTrip,
};
