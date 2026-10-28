
const fs = require("node:fs/promises");
const path = require("node:path");
const readline = require("node:readline/promises");
const { stdin: input, stdout: output } = require("node:process");

// Display basic logs
function log(message) {
  console.log(`[${new Date().toLocaleString()}] ${message}`);
}

// Check whether a filename matches the search query
function matchesFileName(fileName, query, exactMatch) {
  const name = fileName.toLowerCase();
  const search = query.toLowerCase();

  return exactMatch ? name === search : name.includes(search);
}

// Recursively search for files
async function searchFiles(directory, query, exactMatch = false) {
  const results = [];
  const pendingDirectories = [path.resolve(directory)];

  while (pendingDirectories.length > 0) {
    const currentDirectory = pendingDirectories.pop();
    let entries;

    try {
      entries = await fs.readdir(currentDirectory, {
        withFileTypes: true
      });
    } catch (error) {
      log(`Cannot access ${currentDirectory}: ${error.message}`);
      continue;
    }

    for (const entry of entries) {
      const fullPath = path.join(currentDirectory, entry.name);

      try {
        if (entry.isDirectory()) {
          pendingDirectories.push(fullPath);
        } else if (
          entry.isFile() &&
          matchesFileName(entry.name, query, exactMatch)
        ) {
          results.push(fullPath);
        }
      } catch (error) {
        log(`Could not inspect ${fullPath}: ${error.message}`);
      }
    }
  }

  return results;
}

// Main application
async function main() {
  const rl = readline.createInterface({ input, output });

  try {
    console.log("\n===== FILE SEARCH TOOL =====\n");

    const directoryInput = (
      await rl.question("Enter directory path to search: ")
    ).trim();

    const query = (
      await rl.question("Enter file name or search text: ")
    ).trim();

    if (!directoryInput || !query) {
      console.log("Error: Directory and search text are required.");
      return;
    }

    const exactAnswer = (
      await rl.question("Exact filename match? (y/n): ")
    ).trim().toLowerCase();

    const exactMatch = exactAnswer === "y";
    const directory = path.resolve(directoryInput);

    let stats;

    try {
      stats = await fs.stat(directory);
    } catch {
      console.log("Error: Directory does not exist or cannot be accessed.");
      return;
    }

    if (!stats.isDirectory()) {
      console.log("Error: The supplied path is not a directory.");
      return;
    }

    log(`Searching in: ${directory}`);
    log(`Search query: ${query}`);
    log(`Match type: ${exactMatch ? "Exact" : "Partial"}`);

    const startTime = Date.now();
    const results = await searchFiles(directory, query, exactMatch);
    const elapsedTime = Date.now() - startTime;

    console.log("\n===== SEARCH RESULTS =====\n");

    if (results.length === 0) {
      console.log("No matching files found.");
    } else {
      results.sort((a, b) => a.localeCompare(b));

      results.forEach((file, index) => {
        console.log(`${index + 1}. ${file}`);
      });

      console.log(`\nTotal files found: ${results.length}`);
    }

    console.log(`Search completed in ${elapsedTime} ms.`);
  } catch (error) {
    log(`Unexpected error: ${error.message}`);
  } finally {
    rl.close();
  }
}

main();
