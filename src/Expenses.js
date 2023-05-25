const AWS = require("aws-sdk");

const dynamoDB = new AWS.DynamoDB.DocumentClient();
const { v4: uuidv4 } = require('uuid');

const DYNAMODB_TABLE_NAME = process.env.DYNAMODB_TABLE_NAME;

async function getExpensesForTrip(tripId) {
  const params = {
    TableName: DYNAMODB_TABLE_NAME,
    IndexName: "Trips-Users-view",
    KeyConditionExpression: "GSI1 = :tripId",
    FilterExpression: "begins_with(PK, :pk)",
    ExpressionAttributeValues: {
      ":tripId": `Trip${tripId}`,
      ":pk": `Expense`,
    },
    ProjectionExpression: "PK, expense_object",
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

async function getExpenseDetails(expenseId) {
  const params = {
    TableName: DYNAMODB_TABLE_NAME,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: {
      ":pk": `Expense${expenseId}`,
      ":sk": `Expense`,
    },
    ProjectionExpression: "expense_object",
  };
  const result = await dynamoDB.query(params).promise();

  if (!result.Items || result.Items.length === 0) {
    return {
      statusCode: 404,
      body: JSON.stringify({ message: 'Expense not found' }),
    };
  }
  return {
    statusCode: 200,
    body: JSON.stringify(result.Items),
  };
}

async function createExpenseForTrip(tripId, expenseName, amount) {
  // Validate the amount as an integer
  if (!Number.isInteger(amount)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Amount must be an integer' }) };
  }

  const expenseId = `Expense${uuidv4()}`;
  const expenseItem = {
    PK: expenseId,
    SK: expenseId,
    GSI1: `Trip${tripId}`,
    expense_object: {
      expense_name: expenseName,
      amount: amount,
    },
  };

  const params = {
    TableName: DYNAMODB_TABLE_NAME,
    Item: expenseItem,
  };

  try {
    await dynamoDB.put(params).promise();
    const response = {      
      expenseId: expenseId.replace('Expense', ''),
      tripId,
      expense_object: {
        expense_name: expenseName,
        amount: amount,
      },
    };
    return { statusCode: 201, body: JSON.stringify(response) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Error creating expense' }) };
  }
}

async function updateExpenseForTrip(expenseId, expenseName, amount) {
  const params = {
    TableName: DYNAMODB_TABLE_NAME,
    Key: {
      PK: `Expense${expenseId}`,
      SK: `Expense${expenseId}`,
    },
    UpdateExpression: 'SET ',
    ExpressionAttributeValues: {},
    ReturnValues: 'ALL_NEW',
  };

  // Conditionally add the expense name update expression and value
  if (expenseName) {
    params.UpdateExpression += 'expense_object.expense_name = :expenseName';
    params.ExpressionAttributeValues[':expenseName'] = expenseName;
  }

  // Conditionally add the expense amount update expression and value
  if (amount) {
    if (expenseName) {
      params.UpdateExpression += ', ';
    }
    params.UpdateExpression += 'expense_object.amount = :amount';
    params.ExpressionAttributeValues[':amount'] = amount;
  }

  try {
    const result = await dynamoDB.update(params).promise();
    const expense = result.Attributes;
    return { statusCode: 200, body: JSON.stringify(expense) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Error updating expense' }) };
  }
}

async function deleteExpenseForTrip(expenseId) {
  const params = {
    TableName: DYNAMODB_TABLE_NAME,
    Key: {
      PK: `Expense${expenseId}`,
      SK: `Expense${expenseId}`,
    },
  };

  try {
    await dynamoDB.delete(params).promise();
    return { statusCode: 200, body: JSON.stringify({ message: 'Expense deleted successfully' }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Error deleting expense' }) };
  }
}


module.exports = { getExpensesForTrip, getExpenseDetails, createExpenseForTrip, updateExpenseForTrip, deleteExpenseForTrip };
