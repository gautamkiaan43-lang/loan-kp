const getWeekNum = (date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7; // treat Sunday as 7, Mon=1..Sun=7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum); // set to nearest Thursday
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
};

const generateDueDates = (frequency, termMonths, disbursementDate = new Date(), fortnightCycle = 'N/A') => {
  const dates = [];
  const start = new Date(disbursementDate);
  const day = start.getDate();
  
  let totalInstallments = termMonths;
  
  if (frequency === 'Weekly') {
    totalInstallments = termMonths * 4;
    for (let i = 1; i <= totalInstallments; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + (7 * i));
      dates.push(d);
    }
  } else if (frequency === 'Fortnightly') {
    totalInstallments = termMonths * 2;
    // Align first due date to company's fortnightCycle (Even/Odd ISO week)
    // Candidate 1: start + 7 days  (minimum safe buffer)
    // Candidate 2: start + 14 days (default 2-week buffer)
    // Candidate 3: start + 21 days (if both above are wrong parity)
    let firstDate = null;

    if (fortnightCycle === 'Even Weeks' || fortnightCycle === 'Odd Weeks') {
      const targetEven = fortnightCycle === 'Even Weeks';
      // Try candidates in order: +7, +14, +21 days
      for (const offset of [7, 14, 21]) {
        const candidate = new Date(start);
        candidate.setDate(start.getDate() + offset);
        const w = getWeekNum(candidate);
        const isEven = w % 2 === 0;
        if (isEven === targetEven) {
          firstDate = candidate;
          break;
        }
      }
      // Fallback (should never be needed with 3 candidates)
      if (!firstDate) {
        firstDate = new Date(start);
        firstDate.setDate(start.getDate() + 14);
      }
    } else {
      // No cycle configured — default to +14 days
      firstDate = new Date(start);
      firstDate.setDate(start.getDate() + 14);
    }

    for (let i = 0; i < totalInstallments; i++) {
      const d = new Date(firstDate);
      d.setDate(firstDate.getDate() + (14 * i));
      dates.push(d);
    }
  } else { // Monthly
    totalInstallments = termMonths;
    let targetMonth = start.getMonth();
    let targetYear = start.getFullYear();
    
    if (day > 8) {
      targetMonth += 1;
      if (targetMonth > 11) {
        targetMonth = 0;
        targetYear += 1;
      }
    }
    
    for (let i = 0; i < totalInstallments; i++) {
      const d = new Date(targetYear, targetMonth + i, 25);
      dates.push(d);
    }
  }
  return dates;
};

// --- Test suite ---
console.log("=== Testing Fortnightly Due Dates Alignment ===");

// We test a disbursement date of June 8, 2026.
// June 8, 2026 is Monday of Week 24 (Even week)
const disburseDate = new Date('2026-06-08');
console.log(`Disbursement Date: ${disburseDate.toDateString()} (Week ${getWeekNum(disburseDate)})`);

// Test case 1: Even Weeks Cycle
console.log("\n--- Test Case 1: Even Weeks Cycle ---");
const dueDatesEven = generateDueDates('Fortnightly', 3, disburseDate, 'Even Weeks');
dueDatesEven.forEach((d, i) => {
  const w = getWeekNum(d);
  console.log(`Installment ${i+1}: ${d.toDateString()} (Week ${w}) -> Correct parity? ${w % 2 === 0}`);
});

// Test case 2: Odd Weeks Cycle
console.log("\n--- Test Case 2: Odd Weeks Cycle ---");
const dueDatesOdd = generateDueDates('Fortnightly', 3, disburseDate, 'Odd Weeks');
dueDatesOdd.forEach((d, i) => {
  const w = getWeekNum(d);
  console.log(`Installment ${i+1}: ${d.toDateString()} (Week ${w}) -> Correct parity? ${w % 2 !== 0}`);
});

// Test case 3: N/A Cycle (no alignment, just default +14 days)
console.log("\n--- Test Case 3: N/A Cycle (Default 14 days) ---");
const dueDatesNA = generateDueDates('Fortnightly', 3, disburseDate, 'N/A');
dueDatesNA.forEach((d, i) => {
  const w = getWeekNum(d);
  console.log(`Installment ${i+1}: ${d.toDateString()} (Week ${w})`);
});
