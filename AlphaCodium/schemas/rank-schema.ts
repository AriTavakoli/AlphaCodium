import { z } from "zod";

export const rankSchema = z.object({
  bestSolution: z
    .object({
      code: z.string().describe("The generated code"),
      imports: z.string().describe("The required imports"),
      prefix: z.string().describe("The code description"),
    })
    .describe("The best solution"),
});
