// index.js
const { BedrockRuntimeClient, InvokeModelCommand } = require("@aws-sdk/client-bedrock-runtime");

const bedrock = new BedrockRuntimeClient({ region: 'us-east-1' });

exports.handler = async (event) => {
  try {
    // Get user input from API request body
    const userPrompt = event.prompt || event.body?.prompt || "Hello";

    // Define system prompt for KL legal assistant
    const systemPrompt = `
You are a virtual legal assistant specializing in Malaysian law, particularly focused on Kuala Lumpur regulations and legal practices. 

Provide clear, concise, and professional information based on Malaysian law. Do not provide binding legal advice. Advise users to consult a licensed lawyer for any legally sensitive decisions.

Tone:
- Professional but approachable
- Easy to understand for non-lawyers
- Neutral and unbiased

When answering:
1. Reference laws, regulations, or legal principles whenever possible.
2. Give examples relevant to Kuala Lumpur or Malaysia.
3. Offer step-by-step guidance for general legal processes.
4. If outside your knowledge, respond: "I’m sorry, I don’t have information on that. Please consult a licensed lawyer."
`;

    // Combine system prompt and user input
    const combinedPrompt = systemPrompt + "\n\nUser question: " + userPrompt;

    // For local mock testing, just log the prompt
    console.log("Combined prompt:", combinedPrompt);

    const command = new InvokeModelCommand({
      modelId: 'qwen.qwen3-coder-30b-a3b-v1:0',
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ]
      })
    });

    // Call Bedrock model
    const response = await bedrock.send(command);

    // Parse response body
    const result = JSON.parse(Buffer.from(response.body).toString());

    // Return response to API
    return {
      statusCode: 200,
      body: JSON.stringify({ answer: result })
    };
  } catch (error) {
    console.error("Error invoking Bedrock model:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to invoke Bedrock model' })
    };
  }
};

