

/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */

const AWS = require("aws-sdk");
const kendra = new AWS.Kendra({ region: "ap-southeast-1" });

exports.handler = async (event) => {
  const userQuestion = event.question;

  const response = await kendra.query({
    IndexId: "<YOUR_INDEX_ID>", //the index in Kendra
    QueryText: userQuestion
  }).promise();

  const snippets = response.ResultItems.map(item => item.DocumentExcerpt.Text);

  return { snippets };
};
