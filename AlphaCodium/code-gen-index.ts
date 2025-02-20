import { AIMessage, BaseMessage, HumanMessage } from "@langchain/core/messages";
import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { model } from "./model/model";
import { codeGenSchema, testCaseSchema } from "./schemas/code-gen-schema";
import { rankSchema } from "./schemas/rank-schema";
import { visualizeGraph } from "./utils/graph-visualizer";
import dedent from "dedent";

const GraphState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
  }),
  userQuery: Annotation<string>({
    reducer: (x, y) => y,
  }),
  status: Annotation<{
    success?: {
      code: string;
      imports: string;
      prefix: string;
    };
    failure?: {
      reason: string;
      code: string;
    };
  }>({
    reducer: (x, y) => y,
  }),
  generation: Annotation<{
    solutions: Array<{
      code: string;
      imports: string;
      prefix: string;
    }>;

    testCases: Array<{
      code: string;
      imports: string;
      prefix: string;
    }>;
  } | null>({
    reducer: (prev, next) => {
      if (!prev) return next;
      if (!next) return prev;

      return {
        solutions: [...(prev.solutions || []), ...(next.solutions || [])],
        testCases: [...(prev.testCases || []), ...(next.testCases || [])],
      };
    },
  }),

  bestSolution: Annotation<{
    code: string;
    imports: string;
    prefix: string;
  } | null>(),

  iterations: Annotation<number>({
    default: () => 0,
    reducer: (x, y) => x + y,
  }),
  reflections: Annotation<string[]>({
    default: () => [],
    reducer: (x, y) => x.concat(y),
  }),
});

const generateCode = async (state: typeof GraphState.State) => {
  const { userQuery } = state;

  const prompt = dedent`You are a TypeScript code generator focused on writing clean, efficient, and type-safe code.

Task: Generate 2 distinct solutions for the following query: "${userQuery}"

For each solution, provide:
1. APPROACH: Explain the rationale, including:
   - Why this approach is suitable
   - Time/space complexity analysis
   - Any trade-offs or considerations

2. IMPLEMENTATION:
   - Write production-ready TypeScript code
   - Include proper type annotations
   - Follow TypeScript best practices
   - Avoid type assertions
   - Include error handling where appropriate
   - Add minimal but essential comments

3. DIFFERENCES:
   Each solution must differ in at least one significant aspect, such as:
   - Algorithm approach
   - Data structures used
   - Time/space complexity trade-offs
   - Implementation style (functional vs imperative)

Format each solution as a complete, self-contained function that can be directly used.`;

  const result = await model
    .withStructuredOutput(codeGenSchema)
    .invoke([new HumanMessage(prompt)]);

  const codeGeneration = result.solutions;

  return {
    generation: {
      solutions: codeGeneration,
    },
    iterations: 1,
    messages: [
      new AIMessage({
        name: "code_generation",
        content: JSON.stringify({
          solutions: codeGeneration,
        }),
      }),
    ],
  };
};

const generateTestCases = async (state: typeof GraphState.State) => {
  const { userQuery } = state;

  const prompt = dedent`
    You are a test case generator. You are given a query and you need to generate 2 different test cases for the query.
    Make sure to not include any comments or /n in the test cases.
    For each test case:
    1. Write the rationale for the approach
    2. Provide the implementation
    3. Make sure each test case takes a different approach to solve the problem

    Generate at least 2 different solutions.
    The query is: ${userQuery}
    The code should be written in typescript.
    `;

  const result = await model
    .withStructuredOutput(testCaseSchema)
    .invoke([new HumanMessage(prompt)]);

  const testCases = result.testCases;

  return {
    generation: {
      testCases,
    },
    messages: [
      new AIMessage({
        name: "test_case_generation",
        content: JSON.stringify({
          testCases,
        }),
      }),
    ],
  };
};

const rankSolutions = async (state: typeof GraphState.State) => {
  const { generation } = state;

  const solutions = generation?.solutions;

  const prompt = `
    You are a code evaluator. You are given a code and you need to evaluate the code.

    Here are all the solutions. 
    ${JSON.stringify(
      solutions
    )}. I want you to evaluate each solution and return the one that is the most robust and efficient.
    `;

  const result = await model
    .withStructuredOutput(rankSchema)
    .invoke([new HumanMessage(prompt)]);

  return {
    bestSolution: result.bestSolution,
  };
};

const retryRouter = (
  state: typeof GraphState.State
): "call_model" | typeof END => {
  if (!state.status.failure?.reason || state.iterations >= 3) {
    return END;
  }
  console.log("retrying");
  return "call_model";
};

const validateCode = async (state: typeof GraphState.State) => {
  const { bestSolution, generation } = state;

  const testCases = generation?.testCases;
  const code = bestSolution?.code;
  const imports = bestSolution?.imports;
  const prefix = bestSolution?.prefix;

  const isValid = true;

  // PSEUDO CODE
  // 1. Run the test cases
  // 2. If the test cases pass, return the code
  // 3. If the test cases fail, return the reason and the code that failed to the generate_code node
  // 4. The generate_code node will then generate a new code
  // 5. The new code will be validated again
  // 6. This will continue until the code is valid or the iterations are exhausted
  // 7. Return the best code

  if (isValid) {
    return {
      status: {
        success: { code, imports, prefix },
      },
    };
  } else {
    return {
      status: {
        failure: { reason: "The code is not valid" },
      },
    };
  }
};

const graph = new StateGraph(GraphState)
  .addNode("generate_code", generateCode)
  .addEdge(START, "generate_code")
  .addNode("generate_test_cases", generateTestCases)
  .addNode("rank_solutions", rankSolutions)
  .addNode("validate_code", validateCode)
  .addEdge("generate_code", "generate_test_cases")
  .addEdge("generate_code", "rank_solutions")
  .addEdge("generate_test_cases", "validate_code")
  .addEdge("rank_solutions", "validate_code")
  .addConditionalEdges("validate_code", retryRouter, {
    [END]: END,
    generate_code: "generate_code",
  });

async function main() {
  const compiledGraph = graph.compile();
  const result = await compiledGraph.invoke({
    messages: [new HumanMessage("write a function to add two numbers")],
    userQuery: "write a function to add two numbers",
    iterations: 0,
    generation: null,
  });

  console.log("Code generation complete :", result.bestSolution);
  console.log("Full result: ", result);
  visualizeGraph(compiledGraph);
  console.log("Graph saved as graph.png");
}

main();
