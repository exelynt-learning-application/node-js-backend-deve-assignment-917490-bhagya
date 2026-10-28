
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const readline = require("node:readline/promises");
const process = require("node:process");

// ==============================
// NODE.JS UTILITY TOOLKIT
// ==============================

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const LOG_FILE = path.join(__dirname, "toolkit_events.log");

// Display application logs
function log(level, message) {
  const entry = `[${new Date().toISOString()}] [${level}] ${message}`;

  console.log(entry);

  fs.appendFile(LOG_FILE, entry + "\n", "utf8").catch((error) => {
    console.error("Unable to write event log:", error.message);
  });
}

// Format bytes into readable units
function formatBytes(bytes) {
  const units = ["Bytes", "KB", "MB", "GB", "TB"];
  let size = bytes;
  let index = 0;

  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index++;
  }

  return `${size.toFixed(2)} ${units[index]}`;
}

// ==============================
// 1. FILE EXPLORER
// ==============================

async function fileExplorer() {
  const inputPath = (
    await rl.question("Enter directory path: ")
  ).trim();

  if (!inputPath) {
    console.log("Please enter a directory path.");
    return;
  }

  const directory = path.resolve(inputPath);

  try {
    const stats = await fs.stat(directory);

    if (!stats.isDirectory()) {
      console.log("The specified path is not a directory.");
      return;
    }

    const entries = await fs.readdir(directory, {
      withFileTypes: true
    });

    console.log(`\nContents of: ${directory}\n`);

    if (entries.length === 0) {
      console.log("The directory is empty.");
    }

    for (const entry of entries) {
      const type = entry.isDirectory() ? "[DIR] " : "[FILE]";
      console.log(`${type} ${entry.name}`);
    }

    log("INFO", `Explored directory: ${directory}`);
  } catch (error) {
    console.log(`File explorer error: ${error.message}`);
    log("ERROR", `File explorer failed: ${error.message}`);
  }
}

// ==============================
// 2. SYSTEM INFORMATION VIEWER
// ==============================

function systemInfo() {
  const cpus = os.cpus();
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();

  console.log("\n========== SYSTEM INFORMATION ==========");
  console.log(`Operating System : ${os.type()}`);
  console.log(`OS Release       : ${os.release()}`);
  console.log(`Platform         : ${process.platform}`);
  console.log(`Architecture     : ${process.arch}`);
  console.log(`Hostname         : ${os.hostname()}`);
  console.log(`CPU Model        : ${cpus[0]?.model || "Unknown"}`);
  console.log(`CPU Cores        : ${cpus.length}`);
  console.log(`Total Memory     : ${formatBytes(totalMemory)}`);
  console.log(`Free Memory      : ${formatBytes(freeMemory)}`);
  console.log(`Used Memory      : ${formatBytes(totalMemory - freeMemory)}`);
  console.log(`System Uptime    : ${(os.uptime() / 3600).toFixed(2)} hours`);
  console.log(`Node.js Version  : ${process.version}`);
  console.log(`Process ID       : ${process.pid}`);
  console.log(`Current Folder   : ${process.cwd()}`);
  console.log("========================================\n");

  log("INFO", "Viewed system information");
}

// ==============================
// 3. EVENT LOGGER
// ==============================

async function eventLogger() {
  const message = (
    await rl.question("Enter an event message: ")
  ).trim();

  if (!message) {
    console.log("Event message cannot be empty.");
    return;
  }

  const levelInput = (
    await rl.question("Enter level (INFO/WARN/ERROR): ")
  ).trim().toUpperCase();

  const allowedLevels = ["INFO", "WARN", "ERROR"];
  const level = allowedLevels.includes(levelInput)
    ? levelInput
    : "INFO";

  const entry = `[${new Date().toISOString()}] [${level}] ${message}`;

  try {
    await fs.appendFile(LOG_FILE, entry + "\n", "utf8");
    console.log("Event saved successfully.");
    console.log(entry);
  } catch (error) {
    console.log(`Unable to save event: ${error.message}`);
  }
}

// ==============================
// 4. PATH ANALYZER
// ==============================

async function pathAnalyzer() {
  const inputPath = (
    await rl.question("Enter a file or directory path: ")
  ).trim();

  if (!inputPath) {
    console.log("Please enter a path.");
    return;
  }

  const resolvedPath = path.resolve(inputPath);
  const parsedPath = path.parse(resolvedPath);

  console.log("\n========== PATH ANALYSIS ==========");
  console.log(`Original Path : ${inputPath}`);
  console.log(`Absolute Path : ${resolvedPath}`);
  console.log(`Root          : ${parsedPath.root}`);
  console.log(`Directory     : ${parsedPath.dir}`);
  console.log(`Base Name     : ${parsedPath.base}`);
  console.log(`File Name     : ${parsedPath.name}`);
  console.log(`Extension     : ${parsedPath.ext}`);
  console.log(`Path Separator: ${path.sep}`);
  console.log(`Path Delimiter: ${path.delimiter}`);

  try {
    const stats = await fs.stat(resolvedPath);

    console.log(`Exists        : Yes`);
    console.log(`Type          : ${stats.isDirectory() ? "Directory" : "File"}`);
    console.log(`Size          : ${formatBytes(stats.size)}`);
    console.log(`Last Modified : ${stats.mtime.toLocaleString()}`);
  } catch (error) {
    if (error.code === "ENOENT") {
      console.log("Exists        : No");
    } else {
      console.log(`Could not inspect path: ${error.message}`);
    }
  }

  console.log("===================================\n");

  log("INFO", `Analyzed path: ${resolvedPath}`);
}

// ==============================
// 5. VIEW EVENT LOG
// ==============================

async function viewLogs() {
  try {
    const contents = await fs.readFile(LOG_FILE, "utf8");

    console.log("\n========== EVENT LOGS ==========");
    console.log(contents || "No events recorded.");
    console.log("================================\n");
  } catch (error) {
    if (error.code === "ENOENT") {
      console.log("No log file exists yet.");
    } else {
      console.log(`Unable to read logs: ${error.message}`);
    }
  }
}

// ==============================
// MAIN MENU
// ==============================

async function main() {
  console.log("\n====================================");
  console.log("       NODE.JS UTILITY TOOLKIT");
  console.log("====================================");

  let running = true;

  while (running) {
    console.log("\nChoose an option:");
    console.log("1. File Explorer");
    console.log("2. System Information Viewer");
    console.log("3. Event Logger");
    console.log("4. Path Analyzer");
    console.log("5. View Event Logs");
    console.log("6. Exit");

    const choice = (await rl.question("\nEnter your choice: ")).trim();

    try {
      switch (choice) {
        case "1":
          await fileExplorer();
          break;

        case "2":
          systemInfo();
          break;

        case "3":
          await eventLogger();
          break;

        case "4":
          await pathAnalyzer();
          break;

        case "5":
          await viewLogs();
          break;

        case "6":
          running = false;
          console.log("Thank you for using the Node.js Utility Toolkit!");
          log("INFO", "Application closed");
          break;

        default:
          console.log("Invalid choice. Please select 1 to 6.");
      }
    } catch (error) {
      console.error("Unexpected error:", error.message);
      log("ERROR", `Unexpected error: ${error.message}`);
    }
  }

  rl.close();
}

main().catch((error) => {
  console.error("Application failed:", error.message);
  process.exitCode = 1;
  rl.close();
});
