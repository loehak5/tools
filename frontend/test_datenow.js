// Test Date.now() timezone behavior
const now = Date.now();
const dateFromNow = new Date(now);
const dateFromNew = new Date();

console.log("=== Date.now() Test ===");
console.log("Date.now():", now);
console.log("new Date(now):", dateFromNow);
console.log("new Date():", dateFromNew);
console.log("\n=== Hours comparison ===");
console.log("new Date(now).getHours():", dateFromNow.getHours());
console.log("new Date().getHours():", dateFromNew.getHours());
console.log("new Date(now).getUTCHours():", dateFromNow.getUTCHours());

console.log("\n=== Random schedule simulation ===");
const randomMs = 5 * 60 * 1000; // 5 minutes
const futureDate = new Date(now + randomMs);
console.log("In 5 minutes:");
console.log("  Local time (getHours):", futureDate.getHours());
console.log("  ISO string:", futureDate.toISOString());
console.log("  Expected ISO to be ~7 hours less than local hour");
