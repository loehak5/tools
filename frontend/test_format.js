// Test the new formatLocalTime implementation
const formatLocalTime = (utcString) => {
    const date = new Date(utcString);
    const day = date.getDate();
    const month = date.toLocaleDateString('id-ID', { month: 'short' });
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${day} ${month} ${year}, ${hours}.${minutes}`;
};

const testUTC = "2026-02-09T01:23:00.000Z";
console.log("UTC input:", testUTC);
console.log("Formatted output:", formatLocalTime(testUTC));
console.log("Expected: 9 Feb 2026, 08.23");

const date = new Date(testUTC);
console.log("\nDebug:");
console.log("getDate():", date.getDate());
console.log("getHours():", date.getHours());
console.log("getUTCHours():", date.getUTCHours());
