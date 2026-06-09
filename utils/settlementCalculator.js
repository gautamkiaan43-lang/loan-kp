const { LOAN_MATRIX } = require('./repaymentMatrix');
const prisma = require('../config/db');

/**
 * Clamps the amount to the valid loan range (400 to 8000) and rounds to the nearest 400 increment.
 */
const getClosestMatrixAmount = (amount) => {
  const num = parseFloat(amount) || 400;
  const clamped = Math.max(400, Math.min(8000, num));
  return Math.round(clamped / 400) * 400;
};

/**
 * Resolves interest, service fee, initiation fee, and total repayment from the LOAN_MATRIX.
 */
const getLoanMatrixValues = (amount, term) => {
  const principal = getClosestMatrixAmount(amount);
  const termStr = String(term || 6);
  
  const amtMatrix = LOAN_MATRIX[String(principal)] || LOAN_MATRIX["4000"];
  const values = amtMatrix[termStr] || amtMatrix["6"] || Object.values(amtMatrix)[0];
  
  return {
    principal,
    interest: values.interest || 0,
    serviceFee: values.serviceFee || 0,
    initFee: values.initFee || 0,
    totalRepayment: values.totalRepayment || (principal + (values.interest || 0) + (values.serviceFee || 0) + (values.initFee || 0)),
    monthly: values.monthly || 0
  };
};

/**
 * Helper to determine the period of an installment for corporate payroll matching.
 */
const getInstallmentPeriod = (dueDate, frequency) => {
  const date = new Date(dueDate);
  const y = date.getFullYear();
  if (frequency === 'Weekly' || frequency === 'Fortnightly') {
    const oneJan = new Date(y, 0, 1);
    const numberOfDays = Math.floor((date - oneJan) / (24 * 60 * 60 * 1000));
    const weekNumber = Math.ceil((date.getDay() + 1 + numberOfDays) / 7);
    return `${y}-W${String(weekNumber).padStart(2, '0')}`;
  } else {
    // Monthly
    const m = String(date.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }
};

/**
 * Calculates the current outstanding balance for a loan.
 * Sum of all unpaid installment balances: Σ (Installment Amount - Amount Paid)
 */
const calculateOutstandingBalance = (loan) => {
  if (!loan) return 0;
  
  const hasInstallments = loan.installment && loan.installment.length > 0;
  if (hasInstallments) {
    const total = loan.installment.reduce((sum, inst) => sum + Math.max(0, inst.amount - (inst.paidAmount || 0)), 0);
    return Math.round(total * 100) / 100;
  }
  
  // Default to matrix total repayment if no installments generated yet
  let term = 6;
  if (loan.metadata) {
    try {
      const meta = typeof loan.metadata === 'string' ? JSON.parse(loan.metadata) : loan.metadata;
      if (meta.loanRequest && meta.loanRequest.term) {
        term = parseInt(meta.loanRequest.term) || 6;
      }
    } catch (e) {
      // ignore
    }
  }
  
  const matrixValues = getLoanMatrixValues(loan.amount, term);
  return matrixValues.totalRepayment;
};

/**
 * Calculates unearned interest and service fees.
 * An allocation becomes earned once its due date has passed.
 */
const calculateUnearnedCharges = (loan, now = new Date()) => {
  if (!loan) return { unearnedInterest: 0, unearnedServiceFees: 0 };

  let unearnedInterest = 0;
  let unearnedServiceFees = 0;

  // 1. Calculate Unearned Interest
  if (loan.interest_allocations && loan.interest_allocations.length > 0) {
    unearnedInterest = loan.interest_allocations
      .filter(alloc => new Date(alloc.dueDate) > now && alloc.status !== 'WRITTEN_OFF')
      .reduce((sum, alloc) => sum + alloc.amount, 0);
  } else {
    // Fallback if not loaded
    let term = 6;
    if (loan.metadata) {
      try {
        const meta = typeof loan.metadata === 'string' ? JSON.parse(loan.metadata) : loan.metadata;
        if (meta.loanRequest && meta.loanRequest.term) {
          term = parseInt(meta.loanRequest.term) || 6;
        }
      } catch (e) {}
    }
    const totalInstallmentsCount = loan.installment && loan.installment.length > 0
      ? loan.installment.length
      : term;
    const matrixValues = getLoanMatrixValues(loan.amount, totalInstallmentsCount);
    const interestPerInst = matrixValues.interest / totalInstallmentsCount;
    if (loan.installment && loan.installment.length > 0) {
      const futureInstallments = loan.installment.filter(i => new Date(i.dueDate) > now && i.status === 'PENDING');
      unearnedInterest = futureInstallments.length * interestPerInst;
    } else {
      unearnedInterest = matrixValues.interest;
    }
  }

  // 2. Calculate Unearned Service Fees
  if (loan.service_fee_allocations && loan.service_fee_allocations.length > 0) {
    unearnedServiceFees = loan.service_fee_allocations
      .filter(alloc => new Date(alloc.dueDate) > now && alloc.status !== 'WRITTEN_OFF')
      .reduce((sum, alloc) => sum + alloc.amount, 0);
  } else {
    // Fallback if not loaded
    let term = 6;
    if (loan.metadata) {
      try {
        const meta = typeof loan.metadata === 'string' ? JSON.parse(loan.metadata) : loan.metadata;
        if (meta.loanRequest && meta.loanRequest.term) {
          term = parseInt(meta.loanRequest.term) || 6;
        }
      } catch (e) {}
    }
    const totalInstallmentsCount = loan.installment && loan.installment.length > 0
      ? loan.installment.length
      : term;
    const matrixValues = getLoanMatrixValues(loan.amount, totalInstallmentsCount);
    const serviceFeePerInst = matrixValues.serviceFee / totalInstallmentsCount;
    if (loan.installment && loan.installment.length > 0) {
      const futureInstallments = loan.installment.filter(i => new Date(i.dueDate) > now && i.status === 'PENDING');
      unearnedServiceFees = futureInstallments.length * serviceFeePerInst;
    } else {
      unearnedServiceFees = matrixValues.serviceFee;
    }
  }

  return {
    unearnedInterest: Math.round(unearnedInterest * 100) / 100,
    unearnedServiceFees: Math.round(unearnedServiceFees * 100) / 100
  };
};

/**
 * Calculates the early settlement amount.
 * Formula: Settlement Amount = Outstanding Balance - Settlement Saving - Pipeline Deduction
 */
const calculateSettlementAmount = (loan, now = new Date(), pipelineDeduction = 0) => {
  if (!loan) return 0;
  
  const outstandingBalance = calculateOutstandingBalance(loan);
  const { unearnedInterest, unearnedServiceFees } = calculateUnearnedCharges(loan, now);
  const settlementSaving = unearnedInterest + unearnedServiceFees;

  const settlement = Math.max(0, outstandingBalance - settlementSaving - pipelineDeduction);
  return Math.round(settlement * 100) / 100;
};

/**
 * Full detailed calculation including asynchronous pipeline checks.
 */
const calculateEarlySettlement = async (loan, includePipeline = false, now = new Date()) => {
  if (!loan) return null;

  const outstandingBalance = calculateOutstandingBalance(loan);
  const { unearnedInterest, unearnedServiceFees } = calculateUnearnedCharges(loan, now);
  const settlementSaving = unearnedInterest + unearnedServiceFees;

  let pipelineDeduction = 0;

  if (includePipeline && loan.installment && loan.installment.length > 0) {
    const pending = loan.installment
      .filter(i => i.status === 'PENDING')
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

    if (pending.length > 0) {
      const currentInst = pending[0];
      
      let frequency = 'Monthly';
      if (loan.metadata) {
        try {
          const meta = typeof loan.metadata === 'string' ? JSON.parse(loan.metadata) : loan.metadata;
          frequency = meta.financialInfo?.salaryFrequency || 'Monthly';
        } catch (e) {}
      }

      const period = getInstallmentPeriod(currentInst.dueDate, frequency);

      // Check if a deduction schedule has been submitted
      const schedule = await prisma.deductionschedule.findFirst({
        where: {
          company: loan.company,
          period: period
        }
      });

      if (schedule) {
        pipelineDeduction = currentInst.amount;
      }
    }
  }

  const settlementAmount = Math.max(0, outstandingBalance - settlementSaving - pipelineDeduction);

  return {
    outstandingBalance: Math.round(outstandingBalance * 100) / 100,
    unearnedInterest: Math.round(unearnedInterest * 100) / 100,
    unearnedServiceFees: Math.round(unearnedServiceFees * 100) / 100,
    pipelineDeduction: Math.round(pipelineDeduction * 100) / 100,
    settlementSaving: Math.round(settlementSaving * 100) / 100,
    settlementAmount: Math.round(settlementAmount * 100) / 100
  };
};

module.exports = {
  getClosestMatrixAmount,
  getLoanMatrixValues,
  getInstallmentPeriod,
  calculateOutstandingBalance,
  calculateUnearnedCharges,
  calculateSettlementAmount,
  calculateEarlySettlement
};

