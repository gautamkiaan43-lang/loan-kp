const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');

// Import controllers locally
const employeeController = require('./controllers/employeeController');
const loanController = require('./controllers/loanController');

// Mock response creator
const mockResponse = () => {
  const res = {};
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data) => {
    res.jsonData = data;
    return res;
  };
  return res;
};

async function runTests() {
  console.log('====================================================');
  console.log('🚀 RUNNING EMPLOYEE ROSTER & VALIDATION LINK TESTS');
  console.log('====================================================\n');

  let testCompany = null;
  let testActiveUser = null;
  let testInactiveUser = null;
  let testMismatchUser = null;
  let testLoan = null;
  let createdLoansList = [];

  const results = [];

  const logTestResult = (caseName, passed, details) => {
    results.push({ caseName, status: passed ? '✅ PASS' : '❌ FAIL', details });
    console.log(`[${passed ? 'PASS' : 'FAIL'}] ${caseName} - ${details}`);
  };

  try {
    // ----------------------------------------------------
    // SETUP MOCK DATA IN DATABASE
    // ----------------------------------------------------
    console.log('🔧 Setting up test database records...');
    
    // 1. Create Test Company with Employee Number Roster
    testCompany = await prisma.company.upsert({
      where: { name: 'TestCorp' },
      update: {
        approxTotalEmployees: 3,
        employeeNumbers: ['EMP001', 'EMP002', 'EMP003'],
        status: 'Active',
      },
      create: {
        name: 'TestCorp',
        approxTotalEmployees: 3,
        employeeNumbers: ['EMP001', 'EMP002', 'EMP003'],
        status: 'Active',
      }
    });

    // 2. Create Company without Roster
    await prisma.company.upsert({
      where: { name: 'NoRosterCorp' },
      update: {
        approxTotalEmployees: 0,
        employeeNumbers: null,
        status: 'Active',
      },
      create: {
        name: 'NoRosterCorp',
        approxTotalEmployees: 0,
        employeeNumbers: null,
        status: 'Active',
      }
    });

    // 3. Create Active test user
    const dummyPassword = await bcrypt.hash('password123', 10);
    testActiveUser = await prisma.user.upsert({
      where: { email: 'test_active@testcorp.com' },
      update: {
        name: 'John Doe',
        company: 'TestCorp',
        status: 'Active',
        role: 'employee',
      },
      create: {
        email: 'test_active@testcorp.com',
        password: dummyPassword,
        name: 'John Doe',
        company: 'TestCorp',
        status: 'Active',
        role: 'employee',
      }
    });

    // 4. Create Inactive test user
    testInactiveUser = await prisma.user.upsert({
      where: { email: 'test_inactive@testcorp.com' },
      update: {
        name: 'Jane Smith',
        company: 'TestCorp',
        status: 'Inactive',
        role: 'employee',
      },
      create: {
        email: 'test_inactive@testcorp.com',
        password: dummyPassword,
        name: 'Jane Smith',
        company: 'TestCorp',
        status: 'Inactive',
        role: 'employee',
      }
    });

    // 5. Create Company Mismatch test user
    testMismatchUser = await prisma.user.upsert({
      where: { email: 'test_mismatch@othercorp.com' },
      update: {
        name: 'Bob Jones',
        company: 'OtherCorp',
        status: 'Active',
        role: 'employee',
      },
      create: {
        email: 'test_mismatch@othercorp.com',
        password: dummyPassword,
        name: 'Bob Jones',
        company: 'OtherCorp',
        status: 'Active',
        role: 'employee',
      }
    });

    console.log('✅ Mock data seeded successfully. Starting validation checks...\n');

    // ----------------------------------------------------
    // TEST 1: Real-time validation for verified employee number
    // ----------------------------------------------------
    {
      const req = {
        query: { employeeNumber: 'EMP001', company: 'TestCorp' },
        user: { id: testActiveUser.id, email: testActiveUser.email, company: 'TestCorp' }
      };
      const res = mockResponse();
      await employeeController.verifyEmployeeNumber(req, res);
      
      const isOk = res.jsonData && res.jsonData.verified === true && res.jsonData.message.includes('✅ Employee Found');
      logTestResult(
        'Real-time Verification: Valid Employee Number',
        isOk,
        `Result: verified=${res.jsonData?.verified}, message="${res.jsonData?.message}"`
      );
    }

    // ----------------------------------------------------
    // TEST 2: Real-time validation for invalid employee number
    // ----------------------------------------------------
    {
      const req = {
        query: { employeeNumber: 'EMP999', company: 'TestCorp' },
        user: { id: testActiveUser.id, email: testActiveUser.email, company: 'TestCorp' }
      };
      const res = mockResponse();
      await employeeController.verifyEmployeeNumber(req, res);
      
      const isOk = res.jsonData && res.jsonData.verified === false && res.jsonData.message.includes('❌ Employee Not Found');
      logTestResult(
        'Real-time Verification: Invalid Employee Number',
        isOk,
        `Result: verified=${res.jsonData?.verified}, message="${res.jsonData?.message}"`
      );
    }

    // ----------------------------------------------------
    // TEST 3: Real-time validation when roster is not uploaded
    // ----------------------------------------------------
    {
      const req = {
        query: { employeeNumber: 'EMP001', company: 'NoRosterCorp' },
        user: { id: testActiveUser.id, email: testActiveUser.email, company: 'NoRosterCorp' }
      };
      const res = mockResponse();
      await employeeController.verifyEmployeeNumber(req, res);
      
      const isOk = res.jsonData && res.jsonData.verified === false && res.jsonData.message.includes('❌ No active employee roster');
      logTestResult(
        'Real-time Verification: Roster Not Configured',
        isOk,
        `Result: verified=${res.jsonData?.verified}, message="${res.jsonData?.message}"`
      );
    }

    // ----------------------------------------------------
    // TEST 4: Backend validation: Invalid Employee Number block loan application
    // ----------------------------------------------------
    {
      const req = {
        user: { id: testActiveUser.id, email: testActiveUser.email, company: 'TestCorp' },
        body: {
          personalInfo: { name: 'John', surname: 'Doe', citizenship: 'South African', identityNumber: '9201015000081', dateOfBirth: '1992-01-01', maritalStatus: 'Single', cellphoneNumber: '0821112222', whatsappNumber: '0821112222', postalAddress: '123 Test St', ethnicGroup: 'Black', gender: 'Male', disability: 'No' },
          employmentInfo: { employerName: 'TestCorp', employerDivision: 'Engineering', employmentType: 'Permanent', dateEngaged: '2020-01-01', employeeNumber: 'EMP999', positionTitle: 'Engineer' },
          financialInfo: { salaryFrequency: 'Monthly', grossIncome: '10000', expenses: '5000', bankName: 'FNB', bankAccountNumber: '123456789' },
          loanRequest: { amount: 1200, term: '3 Months', loanReason: 'Medical' },
          agreement: { chk1: true, chk2: true, chk3: true, chk4: true, chk5: true, chk6: true }
        },
        files: {
          latestPayslip: [{ path: 'mock/payslip.pdf' }],
          signature: [{ path: 'mock/sig.png' }],
          idDocument: [{ path: 'mock/id.pdf' }],
          bankStatement: [{ path: 'mock/bank.pdf' }]
        }
      };
      const res = mockResponse();
      await loanController.apply(req, res);

      const blocked = res.statusCode === 400 && res.jsonData?.message?.includes('not verified/found');
      logTestResult(
        'Backend Loan Blocking: Invalid Employee Number Reject',
        blocked,
        `Result: status=${res.statusCode}, message="${res.jsonData?.message}"`
      );
    }

    // ----------------------------------------------------
    // TEST 5: Backend validation: Company Roster Not Uploaded block
    // ----------------------------------------------------
    {
      const req = {
        user: { id: testActiveUser.id, email: testActiveUser.email, company: 'NoRosterCorp' },
        body: {
          personalInfo: { name: 'John', surname: 'Doe', citizenship: 'South African', identityNumber: '9201015000081', dateOfBirth: '1992-01-01', maritalStatus: 'Single', cellphoneNumber: '0821112222', whatsappNumber: '0821112222', postalAddress: '123 Test St', ethnicGroup: 'Black', gender: 'Male', disability: 'No' },
          employmentInfo: { employerName: 'NoRosterCorp', employerDivision: 'Engineering', employmentType: 'Permanent', dateEngaged: '2020-01-01', employeeNumber: 'EMP001', positionTitle: 'Engineer' },
          financialInfo: { salaryFrequency: 'Monthly', grossIncome: '10000', expenses: '5000', bankName: 'FNB', bankAccountNumber: '123456789' },
          loanRequest: { amount: 1200, term: '3 Months', loanReason: 'Medical' },
          agreement: { chk1: true, chk2: true, chk3: true, chk4: true, chk5: true, chk6: true }
        },
        files: {
          latestPayslip: [{ path: 'mock/payslip.pdf' }],
          signature: [{ path: 'mock/sig.png' }],
          idDocument: [{ path: 'mock/id.pdf' }],
          bankStatement: [{ path: 'mock/bank.pdf' }]
        }
      };
      // Temporarily change user company for testing mismatch bypass
      await prisma.user.update({ where: { id: testActiveUser.id }, data: { company: 'NoRosterCorp' } });
      
      const res = mockResponse();
      await loanController.apply(req, res);

      // Restore user company
      await prisma.user.update({ where: { id: testActiveUser.id }, data: { company: 'TestCorp' } });

      const blocked = res.statusCode === 400 && res.jsonData?.message?.includes('No active employee roster found');
      logTestResult(
        'Backend Loan Blocking: No Roster Uploaded Reject',
        blocked,
        `Result: status=${res.statusCode}, message="${res.jsonData?.message}"`
      );
    }

    // ----------------------------------------------------
    // TEST 6: Backend validation: User status not active reject
    // ----------------------------------------------------
    {
      const req = {
        user: { id: testInactiveUser.id, email: testInactiveUser.email, company: 'TestCorp' },
        body: {
          personalInfo: { name: 'Jane', surname: 'Smith', citizenship: 'South African', identityNumber: '9301015000081', dateOfBirth: '1993-01-01', maritalStatus: 'Single', cellphoneNumber: '0821112222', whatsappNumber: '0821112222', postalAddress: '123 Test St', ethnicGroup: 'Black', gender: 'Female', disability: 'No' },
          employmentInfo: { employerName: 'TestCorp', employerDivision: 'Engineering', employmentType: 'Permanent', dateEngaged: '2020-01-01', employeeNumber: 'EMP002', positionTitle: 'Engineer' },
          financialInfo: { salaryFrequency: 'Monthly', grossIncome: '10000', expenses: '5000', bankName: 'FNB', bankAccountNumber: '123456789' },
          loanRequest: { amount: 1200, term: '3 Months', loanReason: 'Medical' },
          agreement: { chk1: true, chk2: true, chk3: true, chk4: true, chk5: true, chk6: true }
        },
        files: {
          latestPayslip: [{ path: 'mock/payslip.pdf' }],
          signature: [{ path: 'mock/sig.png' }],
          idDocument: [{ path: 'mock/id.pdf' }],
          bankStatement: [{ path: 'mock/bank.pdf' }]
        }
      };
      const res = mockResponse();
      await loanController.apply(req, res);

      const blocked = res.statusCode === 403 && res.jsonData?.message?.includes('Your user account is not active');
      logTestResult(
        'Backend Loan Blocking: Inactive Employee Reject',
        blocked,
        `Result: status=${res.statusCode}, message="${res.jsonData?.message}"`
      );
    }

    // ----------------------------------------------------
    // TEST 7: Backend validation: User company mismatch reject
    // ----------------------------------------------------
    {
      const req = {
        user: { id: testMismatchUser.id, email: testMismatchUser.email, company: 'OtherCorp' },
        body: {
          personalInfo: { name: 'Bob', surname: 'Jones', citizenship: 'South African', identityNumber: '9401015000081', dateOfBirth: '1994-01-01', maritalStatus: 'Single', cellphoneNumber: '0821112222', whatsappNumber: '0821112222', postalAddress: '123 Test St', ethnicGroup: 'Black', gender: 'Male', disability: 'No' },
          employmentInfo: { employerName: 'TestCorp', employerDivision: 'Engineering', employmentType: 'Permanent', dateEngaged: '2020-01-01', employeeNumber: 'EMP003', positionTitle: 'Engineer' },
          financialInfo: { salaryFrequency: 'Monthly', grossIncome: '10000', expenses: '5000', bankName: 'FNB', bankAccountNumber: '123456789' },
          loanRequest: { amount: 1200, term: '3 Months', loanReason: 'Medical' },
          agreement: { chk1: true, chk2: true, chk3: true, chk4: true, chk5: true, chk6: true }
        },
        files: {
          latestPayslip: [{ path: 'mock/payslip.pdf' }],
          signature: [{ path: 'mock/sig.png' }],
          idDocument: [{ path: 'mock/id.pdf' }],
          bankStatement: [{ path: 'mock/bank.pdf' }]
        }
      };
      const res = mockResponse();
      await loanController.apply(req, res);

      const blocked = res.statusCode === 400 && res.jsonData?.message?.includes('Company mismatch');
      logTestResult(
        'Backend Loan Blocking: Company Mismatch Reject',
        blocked,
        `Result: status=${res.statusCode}, message="${res.jsonData?.message}"`
      );
    }

    // ----------------------------------------------------
    // TEST 8: Backend validation & Creation: Valid Roster Employee Success
    // ----------------------------------------------------
    {
      const req = {
        user: { id: testActiveUser.id, email: testActiveUser.email, company: 'TestCorp' },
        body: {
          personalInfo: { name: 'John', surname: 'Doe', citizenship: 'South African', identityNumber: '9201015000081', dateOfBirth: '1992-01-01', maritalStatus: 'Single', cellphoneNumber: '0821112222', whatsappNumber: '0821112222', postalAddress: '123 Test St', ethnicGroup: 'Black', gender: 'Male', disability: 'No' },
          employmentInfo: { employerName: 'TestCorp', employerDivision: 'Engineering', employmentType: 'Permanent', dateEngaged: '2020-01-01', employeeNumber: 'EMP001', positionTitle: 'Senior Engineer' },
          financialInfo: { salaryFrequency: 'Monthly', grossIncome: '10000', expenses: '5000', bankName: 'FNB', bankAccountNumber: '123456789' },
          loanRequest: { amount: 1200, term: '3 Months', loanReason: 'Medical', reference: 'LMS-TEST-VALIDATION' },
          agreement: { chk1: true, chk2: true, chk3: true, chk4: true, chk5: true, chk6: true }
        },
        files: {
          latestPayslip: [{ path: 'mock/payslip.pdf' }],
          signature: [{ path: 'mock/sig.png' }],
          idDocument: [{ path: 'mock/id.pdf' }],
          bankStatement: [{ path: 'mock/bank.pdf' }]
        }
      };
      const res = mockResponse();
      await loanController.apply(req, res);

      const success = res.statusCode === 201 && res.jsonData?.loanId !== undefined;
      if (success) {
        testLoan = await prisma.loan.findUnique({ where: { id: res.jsonData.loanId } });
        createdLoansList.push(res.jsonData.loanId);
      }
      logTestResult(
        'Backend Loan Creation: Valid Roster Match Success',
        success,
        `Result: status=${res.statusCode}, loanId=${res.jsonData?.loanId || 'N/A'}`
      );
    }

    // ----------------------------------------------------
    // TEST 9: Auto Employee Lookup functionality
    // ----------------------------------------------------
    if (testLoan) {
      const req = {
        query: { employeeNumber: 'EMP001', company: 'TestCorp' },
        user: { id: testActiveUser.id, email: testActiveUser.email, company: 'TestCorp' }
      };
      const res = mockResponse();
      await employeeController.verifyEmployeeNumber(req, res);

      const hasLookup = res.jsonData && res.jsonData.verified === true && res.jsonData.lookupData !== null;
      const lookupMatch = hasLookup &&
                          res.jsonData.lookupData.employeeName === 'John Doe' &&
                          res.jsonData.lookupData.department === 'Engineering' &&
                          res.jsonData.lookupData.position === 'Senior Engineer';
      
      logTestResult(
        'Auto Employee Lookup: Retrieve Profile Details',
        lookupMatch,
        `Result: employeeName="${res.jsonData?.lookupData?.employeeName}", department="${res.jsonData?.lookupData?.department}", position="${res.jsonData?.lookupData?.position}"`
      );
    } else {
      logTestResult(
        'Auto Employee Lookup: Retrieve Profile Details',
        false,
        'Skipped due to test loan creation failure'
      );
    }

  } catch (err) {
    console.error('❌ Unexpected testing error:', err);
  } finally {
    // Clean up
    console.log('\n🧹 Cleaning up test database records...');
    
    for (const loanId of createdLoansList) {
      await prisma.loan.deleteMany({ where: { id: loanId } });
    }
    if (testActiveUser) {
      await prisma.user.delete({ where: { id: testActiveUser.id } });
    }
    if (testInactiveUser) {
      await prisma.user.delete({ where: { id: testInactiveUser.id } });
    }
    if (testMismatchUser) {
      await prisma.user.delete({ where: { id: testMismatchUser.id } });
    }
    if (testCompany) {
      await prisma.company.delete({ where: { name: 'TestCorp' } });
    }
    await prisma.company.deleteMany({ where: { name: 'NoRosterCorp' } });

    console.log('🏁 Cleanup completed.');
    console.log('\n====================================================');
    console.log('📊 TEST EXECUTION SUMMARY');
    console.log('====================================================');
    console.table(results);
    console.log('====================================================');

    await prisma.$disconnect();
  }
}

runTests();
