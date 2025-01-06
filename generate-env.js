const { config } = require("dotenv");
const { readFileSync, writeFileSync } = require("fs");

// Load .env variables
config();

const environments = [
  { path: "./src/environments/environment.ts", production: true },
  { path: "./src/environments/environment.development.ts", production: false },
];

// Function to generate the content
const generateContent = (existingContent, apiUrl, isProduction) => {
  const updatedContent = existingContent.replace(
    /apiUrl: '.*?'/,
    `apiUrl: '${apiUrl}'`
  );
  return updatedContent.replace(
    /production: .*?,/,
    `production: ${isProduction},`
  );
};

// Iterate through environment files and update them
environments.forEach(({ path, production }) => {
  const existingContent = readFileSync(path, "utf8");
  const newContent = generateContent(
    existingContent,
    process.env.API_URL || "https://default.example.com",
    production
  );
  writeFileSync(path, newContent, "utf8");
  console.log(`Updated ${path}`);
});
