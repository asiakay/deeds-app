#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

function readWranglerConfig() {
  const wranglerPath = path.join(process.cwd(), "wrangler.toml");
  try {
    return fs.readFileSync(wranglerPath, "utf8");
  } catch (error) {
    console.error(
      `Unable to read wrangler.toml at ${wranglerPath}. Make sure you are running the script from the project root.`,
    );
    console.error(error.message);
    process.exit(1);
  }
}

function extractValue(content, key) {
  const regex = new RegExp(`^${key}\\s*=\\s*"([^"]+)"`, "m");
  const match = content.match(regex);
  return match ? match[1] : null;
}

function extractSectionValue(content, section, key) {
  const sectionRegex = new RegExp(`\\[${section}\\]([^\\[]+)`, "m");
  const sectionMatch = content.match(sectionRegex);

  if (!sectionMatch) {
    return null;
  }

  const keyRegex = new RegExp(`^${key}\\s*=\\s*"([^"]+)"`, "m");
  const keyMatch = sectionMatch[1].match(keyRegex);
  return keyMatch ? keyMatch[1] : null;
}

function extractArraySection(content, sectionName, keys) {
  const regex = new RegExp(`\\[\\[${sectionName}\\]\\]([^\\[]+)`, "gm");
  const matches = [];
  let match;

  while ((match = regex.exec(content)) !== null) {
    const sectionContent = match[1];
    const result = {};
    for (const key of keys) {
      const keyRegex = new RegExp(`^${key}\\s*=\\s*"([^"]+)"`, "m");
      const keyMatch = sectionContent.match(keyRegex);
      if (keyMatch) {
        result[key] = keyMatch[1];
      }
    }
    matches.push(result);
  }

  return matches;
}

function main() {
  const content = readWranglerConfig();

  const name = extractValue(content, "name");
  const mainEntry = extractValue(content, "main");
  const compatibilityDate = extractValue(content, "compatibility_date");
  const assetDirectory = extractSectionValue(content, "assets", "directory");
  const d1Databases = extractArraySection(content, "d1_databases", [
    "binding",
    "database_name",
    "database_id",
  ]);

  console.log("\n⚙️  Deeds App Deployment Configuration\n");

  if (name) {
    console.log(`• Worker name: ${name}`);
  }
  if (mainEntry) {
    console.log(`• Entry module: ${mainEntry}`);
  }
  if (compatibilityDate) {
    console.log(`• Compatibility date: ${compatibilityDate}`);
  }
  if (assetDirectory) {
    console.log(`• Static asset directory: ${assetDirectory}`);
  }

  if (d1Databases.length > 0) {
    console.log("\n📦  Bound D1 databases:");
    for (const db of d1Databases) {
      const binding = db.binding ? `Binding: ${db.binding}` : "Binding: (not set)";
      const dbName = db.database_name
        ? `Database name: ${db.database_name}`
        : "Database name: (not set)";
      const dbId = db.database_id
        ? `Database ID: ${db.database_id}`
        : "Database ID: (not set)";
      console.log(`  - ${binding}`);
      console.log(`    ${dbName}`);
      console.log(`    ${dbId}`);
    }
  } else {
    console.log("\n📦  No D1 databases configured.");
  }

  console.log(
    "\n🚀  Deploy with: npx wrangler deploy (or npm run deploy) once you've authenticated via npx wrangler login.\n",
  );
}

main();
