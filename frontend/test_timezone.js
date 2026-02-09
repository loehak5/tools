// Quick test for timezone display
const testDate = "2026-02-09T01:19:00.000Z"; // UTC time
const date = new Date(testDate);

console.log("=== Timezone Display Test ===");
console.log("Input UTC string:", testDate);
console.log("Date object:", date);
console.log("toLocaleDateString:", date.toLocaleDateString());
console.log("toLocaleString:", date.toLocaleString());
console.log("toLocaleString id-ID:", date.toLocaleString('id-ID'));
console.log("toLocaleString with options:", date.toLocaleString('id-ID', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
}));
console.log("getHours (local):", date.getHours());
console.log("getUTCHours:", date.getUTCHours());
