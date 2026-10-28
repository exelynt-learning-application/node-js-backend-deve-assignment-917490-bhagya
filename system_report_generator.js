
const os = require("node:os");
const path = require("node:path");
const process = require("node:process");
const fs = require("node:fs/promises");

// Format bytes into a readable size
function formatBytes(bytes) {
  const units = ["Bytes", "KB", "MB", "GB", "TB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

// Format uptime into days, hours, minutes and seconds
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  return `${days} days, ${hours} hours, ${minutes} minutes, ${remainingSeconds} seconds`;
}

// Generate the system report
function generateReport() {
  const cpus = os.cpus();
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const reportDate = new Date().toLocaleString();

  const report = `
==================================================
             SYSTEM REPORT GENERATOR
==================================================

REPORT DETAILS
--------------------------------------------------
Generated At       : ${reportDate}
Report File        : system_report.txt

OPERATING SYSTEM INFORMATION
--------------------------------------------------
Operating System   : ${os.type()}
Platform           : ${process.platform}
OS Release         : ${os.release()}
Architecture       : ${os.arch()}
Hostname           : ${os.hostname()}

SYSTEM RESOURCES
--------------------------------------------------
CPU Model          : ${cpus[0]?.model || "Unknown"}
CPU Cores          : ${cpus.length}
Total Memory       : ${formatBytes(totalMemory)}
Free Memory        : ${formatBytes(freeMemory)}
Used Memory        : ${formatBytes(totalMemory - freeMemory)}
System Uptime      : ${formatUptime(os.uptime())}

NODE.JS RUNTIME INFORMATION
--------------------------------------------------
Node.js Version    : ${process.version}
Node Executable    : ${process.execPath}
Process ID         : ${process.pid}
Current Directory  : ${process.cwd()}
Script Directory   : ${__dirname}
Process Uptime     : ${formatUptime(process.uptime())}

PATH INFORMATION
--------------------------------------------------
Path Separator     : ${path.sep}
Path Delimiter     : ${path.delimiter}
Script File Name   : ${path.basename(__filename)}
Script Extension   : ${path.extname(__filename)}
Absolute Script    : ${path.resolve(__filename)}

ENVIRONMENT
--------------------------------------------------
Environment       : ${process.env.NODE_ENV || "Not specified"}
User Home Directory: ${os.homedir()}
Temporary Directory: ${os.tmpdir()}

==================================================
                  END OF REPORT
==================================================
`;

  return report;
}

// Save the report to a text file
async function saveReport(report) {
  const reportPath = path.join(__dirname, "system_report.txt");

  await fs.writeFile(reportPath, report, "utf8");

  return reportPath;
}

// Main application
async function main() {
  try {
    console.log("Generating system report...\n");

    const report = generateReport();
    const reportPath = await saveReport(report);

    console.log(report);
    console.log(`Report successfully saved to:\n${reportPath}`);
  } catch (error) {
    console.error("Failed to generate system report:", error.message);
    process.exitCode = 1;
  }
}

main();
