import { config } from "dotenv";
import { ChatOpenAI } from "@langchain/openai";

config();

export const model = new ChatOpenAI({
  model: "gpt-4",
  apiKey: process.env.OPENAI_API_KEY,
  temperature: 0,
});
