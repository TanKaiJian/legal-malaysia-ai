import type { Schema } from "../../data/resource";

export const handler: Schema["sayHello"]["functionHandler"] = async (event) => {
  const { name } = event.arguments;
  
  if (!name) {
    throw new Error("Name is required");
  }
  
  return `Hello, ${name}! Welcome to MyLegal AI Assistant.`;
};