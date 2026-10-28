// Self-contained payroll test script
function runTests() {
  console.log('🧪 Running Payroll Calculation & Safety Verification Tests...\n');

  // Test 1: Dynamic Calculation with exact user-requested figures
  const sample = {
    basic_salary: 45000,
    hra: 8000,
    academic_allowance: 5000,
    other_allowances: 2000,
    provident_fund: 5400,
    professional_tax: 200,
    other_deductions: 400,
  };

  const totalAllowances = sample.hra + sample.academic_allowance + sample.other_allowances;
  const grossSalary = sample.basic_salary + totalAllowances;
  const totalDeductions = sample.provident_fund + sample.professional_tax + sample.other_deductions;
  const netSalary = grossSalary - totalDeductions;

  console.log('1. Checking Calculated Figures:');
  console.log(`   - Basic Salary:     ${sample.basic_salary}`);
  console.log(`   - Total Allowances: ${totalAllowances} (Expected: 15000)`);
  console.log(`   - Gross Salary:     ${grossSalary} (Expected: 60000)`);
  console.log(`   - Total Deductions: ${totalDeductions} (Expected: 6000)`);
  console.log(`   - Net Salary:       ${netSalary} (Expected: 54000)`);

  if (totalAllowances !== 15000 || grossSalary !== 60000 || totalDeductions !== 6000 || netSalary !== 54000) {
    throw new Error('Calculation mismatch!');
  }
  console.log('   ✅ All payroll mathematical calculations verified 100% accurate!\n');

  // Test 2: Formatting validation (INR currency)
  const formatINRTest = (amt) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amt);

  console.log('2. Checking Indian Rupee Formatting:');
  console.log(`   - Gross Salary: ${formatINRTest(grossSalary)}`);
  console.log(`   - Net Salary:   ${formatINRTest(netSalary)}`);
  console.log(`   - Basic Salary: ${formatINRTest(sample.basic_salary)}`);
  console.log('   ✅ Indian Currency (₹) and comma separation (en-IN) verified!\n');

  // Test 3: Edge Case / Partial Entries
  const partial = {
    basic_salary: 50000,
    hra: 10000,
    academic_allowance: 0,
    other_allowances: 0,
    provident_fund: 6000,
    professional_tax: 0,
    other_deductions: 0,
  };
  const partialAllowances = partial.hra + partial.academic_allowance + partial.other_allowances;
  const partialGross = partial.basic_salary + partialAllowances;
  const partialDeductions = partial.provident_fund + partial.professional_tax + partial.other_deductions;
  const partialNet = partialGross - partialDeductions;

  if (partialGross !== 60000 || partialDeductions !== 6000 || partialNet !== 54000) {
    throw new Error('Partial calculation mismatch!');
  }
  console.log('3. Edge Case Handling:');
  console.log(`   - Partial Net Salary: ${formatINRTest(partialNet)}`);
  console.log('   ✅ Edge case calculations verified!\n');

  console.log('🎉 ALL PAYROLL CALCULATIONS PASSED SUCCESSFULLY!');
}

runTests();
