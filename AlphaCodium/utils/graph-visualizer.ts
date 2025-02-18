export async function visualizeGraph(graph: any) {
  const representation = await graph.getGraphAsync();
  const image = await representation.drawMermaidPng();
  const arrayBuffer = await image.arrayBuffer();

  const fs = require("fs");
  const path = require("path");
  
  const distDir = path.join(__dirname, "..", "graphs");
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir);
  }
  
  fs.writeFileSync(path.join(distDir, "graph.png"), Buffer.from(arrayBuffer));

  return arrayBuffer;
}
