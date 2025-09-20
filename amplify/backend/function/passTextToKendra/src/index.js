// queryKendra.js
const { KendraClient, QueryCommand } = require("@aws-sdk/client-kendra");

const kendra = new KendraClient({ region: "ap-southeast-1" });
const KENDRA_INDEX_ID = "fb7cec6f-9181-495d-b003-72cd41f37f6d";

exports.handler = async (event) => {
  try {
    const question = event.userQuestion || event.body?.userQuestion;
    if (!question) throw new Error("No userQuestion provided");

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
      body: JSON.stringify({ error: err.message })
    };
  }
};
