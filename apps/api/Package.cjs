const fs = require("fs");
let content = fs.readFileSync("C:/Users/NIRALI/multitenant-booking-saas/backend/package.json", "utf8");
const old = '"lint:no-console": "grep -v "console." src/ || findstr /c:"console." src/ >nul && exit 1 || exit 0",,';
const repl = '"lint:no-console": "node lintNoConsole.cjs",';
if (content.includes("lint:no-console")) {
  content = content.replace(old, repl);
  fs.writeFileSync("C:/Users/NIRALI/multitenant-booking-saas/backend/package.json", content, "utf8");
  console.log("Replaced lint:no-console script");
} else {
  console.log("Not found, checking...", content.substring(content.indexOf("lint"), content.indexOf("lint") + 100));
}
