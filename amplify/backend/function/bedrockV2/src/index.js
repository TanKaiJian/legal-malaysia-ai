/* Amplify Params - DO NOT EDIT
	ENV
	REGION
Amplify Params - DO NOT EDIT *//* Amplify Params - DO NOT EDIT
	ENV
	REGION
Amplify Params - DO NOT EDIT */
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";


// Initialize clients with proper regions
const bedrock = new BedrockRuntimeClient({ region: "us-east-1" });

export const handler = async (event) => {
  try {
    // Get user input and Kendra snippets
    const body = event.body ? JSON.parse(event.body) : {};
    const userQuestion = event.userQuestion || body.userQuestion || "Hello";
    const snippets = event.snippets || body.snippets || [];

    // Combine snippets into one text block
    const contextText = snippets.join("\n\n");

    // Define system prompt for KL legal assistant
    const systemPrompt = `
      You are a virtual legal assistant specializing in Malaysian law, particularly focused on Kuala Lumpur regulations and legal practices. Use the information passed in to answer the question.
      Provide clear, concise, and professional information based on Malaysian law. 

      Tone:
      - Professional but approachable
      - Easy to understand for non-lawyers
      - Neutral and unbiased

      When answering:
      1. Reference laws, regulations, or legal principles whenever possible.
      2. Give examples relevant to Kuala Lumpur or Malaysia.
      3. Give step-by-step guidance for general legal processes.
      4. Use the context provided below from Kendra to answer accurately.
      5. If outside your knowledge, respond: "I’m sorry, I don’t have information on that. Please consult a licensed lawyer."

      At the end of your response:
      - mention that the information is for suggestion only, please consult a licensed lawyer for any legally sensitive decisions.

      Context from Kendra:
      ${contextText}
    `;

    // Prepare Bedrock command
    const command = new InvokeModelCommand({
      modelId: "deepseek-llm-r1", // your model ID
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userQuestion },
        ],
      }),
    });

    console.log(command);

    // Call Bedrock model
    const response = await bedrock.send(command);

    // Parse response body
    const result = JSON.parse(Buffer.from(response.body).toString());

    // Return the Bedrock answer
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
      },
      body: JSON.stringify({ answer: result }),
    };
  } catch (error) {
    console.error("Error invoking Bedrock model:", error);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
      },
      body: JSON.stringify({
        error: "Failed to invoke Bedrock model",
        details: error.message,
      }),
    };
  }
};
