

# AlphaCodium

This project implements a streamlined code generation system inspired by the AlphaCodium Paper. While the original paper likely utilizes a sandbox environment for code testing, this implementation includes a simplified validation approach using pseudocode to demonstrate the core concepts.

![AlphaCodium Graph](./AlphaCodium/graphs/graph.png)

## Install dependencies:

```bash
npm install
```

## Set up environment variables:
   - Copy `.env.example` to `.env`
   - Add your OpenAI API key to `.env`:

```bash
OPENAI_API_KEY="your-api-key-here"
```

## Usage

Run the code generation script:

```bash
npm start
```

This will execute the main script located at `AlphaCodium/code-gen-index.ts`.
