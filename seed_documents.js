const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("🌱 STARTING ENTERPRISE COMPLIANCE SEEDING...");

  // 1. Clean existing documents to avoid duplicates
  await prisma.document.deleteMany({});
  console.log("🧹 Cleaned existing documents.");

  // Get some loans to reference
  const loans = await prisma.loan.findMany({
    take: 5
  });

  let dummyLoanRef = "LN-DUMMY1";
  let dummyEmployee = "Dummy User";
  let dummyCompany = "TechFlow SA";

  if (loans.length > 0) {
    dummyLoanRef = loans[0].reference;
    dummyEmployee = loans[0].employeeName;
    dummyCompany = loans[0].company;
  }

  // 2. Seed realistic documents
  const seedDocs = [
    {
      fileName: `signed_loan_agreement_${dummyLoanRef}.pdf`,
      fileUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
      fileType: "application/pdf",
      category: "Contract",
      uploadedBy: "compliance@lenni.co.za",
      companyName: dummyCompany,
      employeeName: dummyEmployee,
      loanRef: dummyLoanRef,
      status: "Active"
    },
    {
      fileName: `certified_id_copy_${dummyEmployee.toLowerCase().replace(/\s+/g, '_')}.pdf`,
      fileUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
      fileType: "application/pdf",
      category: "ID Document",
      uploadedBy: "hr@techflow.co.za",
      companyName: dummyCompany,
      employeeName: dummyEmployee,
      loanRef: dummyLoanRef,
      status: "Active"
    },
    {
      fileName: `fnb_bank_statement_3m_${dummyEmployee.toLowerCase().replace(/\s+/g, '_')}.pdf`,
      fileUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
      fileType: "application/pdf",
      category: "Bank Statement",
      uploadedBy: dummyEmployee.toLowerCase().replace(/\s+/g, '.') + "@gmail.com",
      companyName: dummyCompany,
      employeeName: dummyEmployee,
      loanRef: dummyLoanRef,
      status: "Active"
    },
    {
      fileName: `salary_payslip_april_2026_${dummyEmployee.toLowerCase().replace(/\s+/g, '_')}.pdf`,
      fileUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
      fileType: "application/pdf",
      category: "Payslip",
      uploadedBy: "payroll@techflow.co.za",
      companyName: dummyCompany,
      employeeName: dummyEmployee,
      loanRef: dummyLoanRef,
      status: "Active"
    },
    {
      fileName: "service_level_agreement_lenni_techflow_2026.pdf",
      fileUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
      fileType: "application/pdf",
      category: "Contract",
      uploadedBy: "legal@lenni.co.za",
      companyName: "TechFlow SA",
      employeeName: "Corporate HR Team",
      loanRef: null,
      status: "Active"
    },
    {
      fileName: "specimen_signature_letter_techflow.pdf",
      fileUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
      fileType: "application/pdf",
      category: "Employment Verification",
      uploadedBy: "hr@techflow.co.za",
      companyName: "TechFlow SA",
      employeeName: "Authorized Signatory",
      loanRef: null,
      status: "Active"
    },
    {
      fileName: "lenni_standard_loan_tcs_v4.pdf",
      fileUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
      fileType: "application/pdf",
      category: "Other",
      uploadedBy: "system@lenni.co.za",
      companyName: "Lenni (Pty) Ltd",
      employeeName: "Standard Template",
      loanRef: null,
      status: "Active"
    },
    {
      fileName: "repayment_deductions_authority_form.pdf",
      fileUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
      fileType: "application/pdf",
      category: "Employment Verification",
      uploadedBy: "compliance@lenni.co.za",
      companyName: dummyCompany,
      employeeName: dummyEmployee,
      loanRef: dummyLoanRef,
      status: "Active"
    }
  ];

  for (const doc of seedDocs) {
    await prisma.document.create({ data: doc });
  }
  console.log(`✅ Seeded ${seedDocs.length} realistic compliance documents.`);

  // 3. Seed additional realistic forensic audit logs
  const now = new Date();
  const seedLogs = [
    {
      action: "LOAN_SUBMISSION",
      user: dummyEmployee.toLowerCase().replace(/\s+/g, '.') + "@gmail.com",
      note: `Submitted online loan application for R 5,000. Required attachments uploaded.`,
      entityId: dummyLoanRef,
      createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 5) // 5 days ago
    },
    {
      action: "HR_VERIFICATION",
      user: "hr@techflow.co.za",
      note: `Verified employment status, basic salary, and bank details for borrower ${dummyEmployee}. Confirmed specimen match.`,
      entityId: dummyLoanRef,
      createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 4) // 4 days ago
    },
    {
      action: "CREDIT_REVIEW",
      user: "credit@lenni.co.za",
      note: `Credit assessment approved. Affordability index 1.8. Risk score classified as LOW.`,
      entityId: dummyLoanRef,
      createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 3) // 3 days ago
    },
    {
      action: "LOAN_APPROVAL",
      user: "admin@lms.demo",
      note: `Loan final approval granted by Administrator. Disbursal queue scheduled.`,
      entityId: dummyLoanRef,
      createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 2) // 2 days ago
    },
    {
      action: "FINANCE_DISBURSE",
      user: "finance@lenni.co.za",
      note: `Loan disbursed successfully via Standard Bank Corporate EFT. Reference: EFT-92019482.`,
      entityId: dummyLoanRef,
      createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 1) // 1 day ago
    },
    {
      action: "RECOVERY_FORMAL_DEMAND",
      user: "recovery@lenni.co.za",
      note: `Sent automatic Formal Demand Letter via email and WhatsApp. 31 days overdue reached.`,
      entityId: dummyLoanRef,
      createdAt: new Date(now.getTime() - 1000 * 60 * 30) // 30 mins ago
    }
  ];

  for (const log of seedLogs) {
    await prisma.auditlog.create({ data: log });
  }
  console.log(`✅ Seeded ${seedLogs.length} additional forensic audit log trails.`);
  console.log("🎉 DATABASE COMPLIANCE TELEMETRY SYNC COMPLETE!");
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
