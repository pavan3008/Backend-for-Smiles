const { getTripsForUser, getTrip, createTripForUser, modifyTrip, deleteTrip }= require('./src/Trips');
const { getUsersForTrip, getProfile } = require('./src/Users');
const { getTasksForTrip, getTaskDetails, createTaskForTrip, updateTaskForTrip, deleteTaskForTrip } = require('./src/Tasks');
const { getExpensesForTrip, getExpenseDetails, createExpenseForTrip, updateExpenseForTrip, deleteExpenseForTrip } = require('./src/Expenses');

exports.handler = async (event, context) => {
  try {
    console.log('Incoming event:', JSON.stringify(event));

    const httpMethod = event.httpMethod.toUpperCase();
    const { path } = event;
    const { id } = event.pathParameters || {};
    const { trip_name, trip_status } = event.body ? JSON.parse(event.body) : {};
    const { task_name, task_status } = event.body ? JSON.parse(event.body) : {};
    const { expense_name, amount } = event.body ? JSON.parse(event.body) : {};

    let response;

    switch (true) {

      case httpMethod === 'GET' && path === `/users/${id}/trips`:
        response = await getTripsForUser(id);
        break;

      case httpMethod === 'GET' && path === `/users/${id}/profile`:
        response = await getProfile(id);
        break;
        
      case httpMethod === 'GET' && path === `/trips/${id}`:
        response = await getTrip(id);
        break;

      case httpMethod === 'POST' && path === `/users/${id}/trips`:
        response = await createTripForUser(id, trip_name);
        break;

      case httpMethod === 'PATCH' && path === `/trips/${id}`:
        response = await modifyTrip(id, trip_name, trip_status);
        break;

      case httpMethod === 'DELETE' && path === `/trips/${id}`:
        response = await deleteTrip(id);
        break;

      case httpMethod === 'GET' && path === `/trips/${id}/users`:
        response = await getUsersForTrip(id);
        break;

      case httpMethod === 'GET' && path === `/trips/${id}/tasks`:
        response = await getTasksForTrip(id);
        break;
      
      case httpMethod === 'GET' && path === `/tasks/${id}`:
        response = await getTaskDetails(id);
        break;

      case httpMethod === 'POST' && path === `/trips/${id}/tasks`:
        response = await createTaskForTrip(id, task_name);
        break;
      
      case httpMethod === 'PATCH' && path === `/tasks/${id}`:
        response = await updateTaskForTrip(id, task_name, task_status);
        break;
            
      case httpMethod === 'DELETE' && path === `/tasks/${id}`:
        response = await deleteTaskForTrip(id);
        break;

      case httpMethod === 'GET' && path === `/trips/${id}/expenses`:
        response = await getExpensesForTrip(id);
        break;

      case httpMethod === 'GET' && path === `/expenses/${id}`:
        response = await getExpenseDetails(id);
        break;
    
      case httpMethod === 'POST' && path === `/trips/${id}/expenses`:
        response = await createExpenseForTrip(id, expense_name, amount);
        break;

      case httpMethod === 'PATCH' && path === `/expenses/${id}`:
        response = await updateExpenseForTrip(id, expense_name, amount);
        break;

      case httpMethod === 'DELETE' && path === `/expenses/${id}`:
        response = await deleteExpenseForTrip(id);
        break;

      default:
        response = {
          statusCode: 404,
          body: JSON.stringify({ message: 'Not Found' }),
        };
        break;    
    }

    return {
      ...response,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'DELETE,GET,HEAD,OPTIONS,PATCH,POST,PUT',
      },
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal Server Error' }),
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'DELETE,GET,HEAD,OPTIONS,PATCH,POST,PUT',
      },
    };
  }
};