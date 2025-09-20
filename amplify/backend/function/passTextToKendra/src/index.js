// queryKendra.js
const { KendraClient, QueryCommand } = require("@aws-sdk/client-kendra");

const kendra = new KendraClient({ region: "ap-southeast-1" });
const KENDRA_INDEX_ID = "fb7cec6f-9181-495d-b003-72cd41f37f6d";

exports.handler = async (event) => {
  try {
    // const question = event.userQuestion || event.body?.userQuestion;
    let body = {};
    
    if (event.body) {
      try {
        body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
      } catch (parseError) {
        console.error('Failed to parse body:', parseError);
        throw new Error('Invalid JSON in request body');
      }
    }
    
    const question = event.userQuestion || body.userQuestion || event.queryStringParameters?.userQuestion;
    
    console.log('Extracted question:', question);
    
    if (!question || question.trim() === '') {
      throw new Error("No userQuestion provided or question is empty");
    }

    const params = {
      IndexId: KENDRA_INDEX_ID,
      QueryText: question,
      PageSize: 5 // get top 5 results
    };

    const command = new QueryCommand(params);
    const response = await kendra.send(command);

    // Extract snippets from results
    const snippets = [];
    if (response.ResultItems) {
      for (const item of response.ResultItems) {
        if (item.DocumentExcerpt?.Text) {
          snippets.push(item.DocumentExcerpt.Text);
        }
      }
    }

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
      },
      body: JSON.stringify({
        question,
        snippets,
        rawResponse: response
      })
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
      },
      body: JSON.stringify({ error: err.message })
    };
  }
};
