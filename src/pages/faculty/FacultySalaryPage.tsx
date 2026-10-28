import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  FileText, Download, Calendar, ShieldCheck,
  CheckCircle2, AlertCircle, Building2, Lock,
  Receipt, ArrowDownLeft, ArrowUpRight, X, Printer,
  Eye, ToggleLeft, ToggleRight, Sparkles, AlertTriangle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';

export interface PayrollRecord {
  payroll_id: string;
  faculty_id: string;
  employee_id: string;
  pay_period: string; // e.g. "October 2026"
  basic_salary: number;
  hra: number;
  academic_allowance: number;
  other_allowances: number;
  provident_fund: number;
  professional_tax: number;
  other_deductions: number;
  // Dynamically calculated properties:
  total_allowances: number;
  gross_salary: number;
  total_deductions: number;
  net_salary: number;
  payment_date: string;
  payment_status: 'Paid' | 'Processing' | 'Pending';
  payment_method: string;
  payslip_reference?: string;
  is_demo?: boolean;
}

/**
 * Robust Dynamic Payroll Calculations
 * Gross Salary = Basic Salary + Total Allowances
 * Total Deductions = Sum of all applicable deductions
 * Net Salary = Gross Salary - Total Deductions
 */
export function calculatePayrollTotals(entry: {
  basic_salary: number;
  hra?: number;
  academic_allowance?: number;
  other_allowances?: number;
  provident_fund?: number;
  professional_tax?: number;
  other_deductions?: number;
  allowances?: number;
  deductions?: number;
}) {
  const basic = Number(entry.basic_salary) || 0;
  const hra = Number(entry.hra) || 0;
  const academic = Number(entry.academic_allowance) || 0;
  const otherAllow = Number(entry.other_allowances) || (entry.hra === undefined && entry.academic_allowance === undefined ? Number(entry.allowances || 0) : 0);
  const totalAllowances = hra + academic + otherAllow;
  const grossSalary = basic + totalAllowances;

  const pf = Number(entry.provident_fund) || 0;
  const profTax = Number(entry.professional_tax) || 0;
  const otherDed = Number(entry.other_deductions) || (entry.provident_fund === undefined && entry.professional_tax === undefined ? Number(entry.deductions || 0) : 0);
  const totalDeductions = pf + profTax + otherDed;
  const netSalary = grossSalary - totalDeductions;

  return {
    basic_salary: basic,
    hra,
    academic_allowance: academic,
    other_allowances: otherAllow,
    total_allowances: totalAllowances,
    gross_salary: grossSalary,
    provident_fund: pf,
    professional_tax: profTax,
    other_deductions: otherDed,
    total_deductions: totalDeductions,
    net_salary: netSalary,
  };
}

/**
 * Currency Formatter for Indian Rupees
 */
export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Illustrative Safe Demonstration Data
 * Standardized example:
 * Basic: ₹45,000 | HRA: ₹8,000 | Academic: ₹5,000 | Other: ₹2,000 -> Gross: ₹60,000
 * PF: ₹5,400 | Prof Tax: ₹200 | Other Ded: ₹400 -> Deductions: ₹6,000
 * Net: ₹54,000
 */
function getDemoPayrollRecords(facultyId: string): PayrollRecord[] {
  const demoMonths = [
    { period: 'October 2026', date: '2026-10-31', status: 'Paid' as const },
    { period: 'September 2026', date: '2026-09-30', status: 'Paid' as const },
    { period: 'August 2026', date: '2026-08-31', status: 'Paid' as const },
  ];

  return demoMonths.map((m, idx) => {
    const raw = {
      basic_salary: 45000,
      hra: 8000,
      academic_allowance: 5000,
      other_allowances: 2000,
      provident_fund: 5400,
      professional_tax: 200,
      other_deductions: 400,
    };
    const totals = calculatePayrollTotals(raw);

    return {
      payroll_id: `demo-pay-${idx + 1}`,
      faculty_id: facultyId,
      employee_id: `FAC-${facultyId.slice(0, 4).toUpperCase()}-2026`,
      pay_period: m.period,
      ...totals,
      payment_date: m.date,
      payment_status: m.status,
      payment_method: 'Direct Bank Deposit (NEFT/RTGS)',
      payslip_reference: `PSLIP-2026-${String(10 - idx).padStart(2, '0')}`,
      is_demo: true,
    };
  });
}

export default function FacultySalaryPage() {
  const { faculty } = useAuth();
  const [selectedPayslip, setSelectedPayslip] = useState<PayrollRecord | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Query actual records strictly scoped to this authenticated faculty member
  const { data: realPayrollRecords = [], isLoading, refetch } = useQuery<PayrollRecord[]>({
    queryKey: ['faculty-actual-payroll', faculty?.faculty_id],
    queryFn: async () => {
      if (!faculty?.faculty_id) return [];

      try {
        const { data, error } = await supabase
          .from('faculty_payroll')
          .select('*')
          .eq('faculty_id', faculty.faculty_id)
          .order('payment_date', { ascending: false });

        if (!error && data && data.length > 0) {
          return data.map((d: any) => {
            const totals = calculatePayrollTotals({
              basic_salary: d.basic_salary,
              hra: d.hra,
              academic_allowance: d.academic_allowance,
              other_allowances: d.other_allowances,
              provident_fund: d.provident_fund,
              professional_tax: d.professional_tax,
              other_deductions: d.other_deductions,
              allowances: d.allowances,
              deductions: d.deductions,
            });

            return {
              payroll_id: d.payroll_id,
              faculty_id: d.faculty_id,
              employee_id: d.employee_id || `FAC-${faculty.faculty_id.slice(0, 4).toUpperCase()}`,
              pay_period: d.pay_period,
              ...totals,
              payment_date: d.payment_date,
              payment_status: d.payment_status || 'Paid',
              payment_method: d.payment_method || 'Direct Bank Deposit',
              payslip_reference: d.payslip_reference,
              is_demo: false,
            };
          });
        }
      } catch {
        // Table may not yet be initialized in database
      }

      return [];
    },
    enabled: !!faculty?.faculty_id,
  });

  // Decide active records based on Demonstration Mode toggle
  const activeRecords: PayrollRecord[] = isDemoMode
    ? getDemoPayrollRecords(faculty?.faculty_id || 'faculty-demo-id')
    : realPayrollRecords;

  const latestRecord: PayrollRecord | undefined = activeRecords[0];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Receipt className="w-7 h-7 text-indigo-600" />
              Faculty Salary & Payroll
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Official Academic Portal
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Institutional compensation, approved academic allowances, statutory deductions, and verified payslips.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Demonstration Mode Switch */}
          <button
            onClick={() => setIsDemoMode((prev) => !prev)}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
              isDemoMode
                ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
            title="Toggle demonstrative sample payroll figures"
          >
            {isDemoMode ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
            <span>Project Demo Mode: {isDemoMode ? 'ON' : 'OFF'}</span>
          </button>

          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Lock size={12} className="text-emerald-600" />
            Confidential
          </span>
        </div>
      </div>

      {/* Prominent Demo Mode Notice Banner */}
      {isDemoMode && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 shadow-xs">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-bold text-amber-900 text-sm">
              Demonstration data only — not an official salary statement.
            </p>
            <p className="text-amber-800 mt-0.5 leading-relaxed">
              This is an illustrative project demonstration with safe sample amounts (Basic: ₹45,000, Allowances: ₹15,000, Deductions: ₹6,000, Net Salary: ₹54,000). These values do not represent an official university pay scale or actual employee compensation.
            </p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="py-24 text-center">
          <div className="w-9 h-9 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-medium text-slate-500">Retrieving institutional payroll statements...</p>
        </div>
      ) : activeRecords.length === 0 ? (
        /* Clean Official Empty State without truncated Faculty ID */
        <Card className="p-10 border-slate-200 text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 mx-auto shadow-xs">
            <Receipt size={32} />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="text-base font-bold text-slate-900">
              No payroll statements available for this account.
            </h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Institutional salary disbursements are managed directly by the University Finance Office. Once the payroll ledger for the current pay period is published by an authorized Finance Administrator, your itemized payslips will appear here automatically.
            </p>
          </div>

          <div className="pt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsDemoMode(true)}
              className="text-xs border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100"
            >
              <Sparkles size={14} className="mr-1 text-amber-600" />
              Enable Project Demo Mode to Preview UI
            </Button>
          </div>
        </Card>
      ) : (
        <>
          {/* Four Core Summary Cards: Gross Salary, Total Allowances, Total Deductions, Net Salary */}
          {latestRecord && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 1. Gross Salary */}
              <Card className="p-5 border-slate-200 bg-white shadow-xs">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Gross Salary</span>
                <h3 className="text-2xl font-black text-slate-900 mt-1 font-mono">
                  {formatINR(latestRecord.gross_salary)}
                </h3>
                <p className="text-[11px] text-slate-500 font-medium mt-1">
                  Basic + All Allowances
                </p>
              </Card>

              {/* 2. Total Allowances */}
              <Card className="p-5 border-slate-200 bg-white shadow-xs">
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Total Allowances</span>
                <h3 className="text-2xl font-black text-emerald-600 mt-1 font-mono">
                  {formatINR(latestRecord.total_allowances)}
                </h3>
                <p className="text-[11px] text-emerald-700 font-medium mt-1">
                  HRA, Academic & Benefits
                </p>
              </Card>

              {/* 3. Total Deductions */}
              <Card className="p-5 border-slate-200 bg-white shadow-xs">
                <span className="text-xs font-bold text-rose-700 uppercase tracking-wider">Total Deductions</span>
                <h3 className="text-2xl font-black text-rose-600 mt-1 font-mono">
                  {formatINR(latestRecord.total_deductions)}
                </h3>
                <p className="text-[11px] text-rose-600 font-medium mt-1">
                  PF, Tax & Statutory
                </p>
              </Card>

              {/* 4. Net Salary */}
              <Card className="p-5 border-indigo-200 bg-indigo-50/50 shadow-xs">
                <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Net Salary</span>
                <h3 className="text-2xl font-black text-indigo-700 mt-1 font-mono">
                  {formatINR(latestRecord.net_salary)}
                </h3>
                <p className="text-[11px] text-indigo-600 font-medium mt-1">
                  Take-Home Disbursed Amount
                </p>
              </Card>
            </div>
          )}

          {/* Detailed Monthly Earnings and Deductions Breakdown */}
          {latestRecord && (
            <Card className="p-6 border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Monthly Salary Breakdown ({latestRecord.pay_period})
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Itemized computation validating Gross Salary = Basic + Allowances, and Net Salary = Gross − Deductions.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                    Status: {latestRecord.payment_status}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Earnings Column */}
                <div className="p-4 bg-emerald-50/40 rounded-2xl border border-emerald-100 space-y-3 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-emerald-200 font-bold text-emerald-900">
                    <span className="text-sm">EARNINGS & ALLOWANCES</span>
                    <span>AMOUNT</span>
                  </div>

                  <div className="flex justify-between items-center text-slate-700">
                    <span>Basic Salary</span>
                    <span className="font-mono font-semibold text-slate-900">{formatINR(latestRecord.basic_salary)}</span>
                  </div>

                  <div className="flex justify-between items-center text-slate-700">
                    <span>House Rent Allowance (HRA)</span>
                    <span className="font-mono font-semibold text-slate-900">{formatINR(latestRecord.hra)}</span>
                  </div>

                  <div className="flex justify-between items-center text-slate-700">
                    <span>Academic Allowance</span>
                    <span className="font-mono font-semibold text-slate-900">{formatINR(latestRecord.academic_allowance)}</span>
                  </div>

                  <div className="flex justify-between items-center text-slate-700">
                    <span>Other Allowances</span>
                    <span className="font-mono font-semibold text-slate-900">{formatINR(latestRecord.other_allowances)}</span>
                  </div>

                  <div className="pt-2 border-t border-emerald-200 flex justify-between items-center text-emerald-800 font-medium">
                    <span>Subtotal Allowances</span>
                    <span className="font-mono">{formatINR(latestRecord.total_allowances)}</span>
                  </div>

                  <div className="pt-2 border-t border-emerald-300 flex justify-between items-center font-bold text-emerald-950 text-sm">
                    <span>Gross Salary</span>
                    <span className="font-mono">{formatINR(latestRecord.gross_salary)}</span>
                  </div>
                </div>

                {/* Deductions Column */}
                <div className="p-4 bg-rose-50/40 rounded-2xl border border-rose-100 space-y-3 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-rose-200 font-bold text-rose-900">
                    <span className="text-sm">STATUTORY DEDUCTIONS</span>
                    <span>AMOUNT</span>
                  </div>

                  <div className="flex justify-between items-center text-slate-700">
                    <span>Provident Fund (PF)</span>
                    <span className="font-mono font-semibold text-slate-900">{formatINR(latestRecord.provident_fund)}</span>
                  </div>

                  <div className="flex justify-between items-center text-slate-700">
                    <span>Professional Tax</span>
                    <span className="font-mono font-semibold text-slate-900">{formatINR(latestRecord.professional_tax)}</span>
                  </div>

                  <div className="flex justify-between items-center text-slate-700">
                    <span>Other Deductions (Insurance/Cess)</span>
                    <span className="font-mono font-semibold text-slate-900">{formatINR(latestRecord.other_deductions)}</span>
                  </div>

                  <div className="pt-6 border-t border-rose-200 flex justify-between items-center text-rose-800 font-medium">
                    <span>Subtotal Deductions</span>
                    <span className="font-mono">{formatINR(latestRecord.total_deductions)}</span>
                  </div>

                  <div className="pt-2 border-t border-rose-300 flex justify-between items-center font-bold text-rose-950 text-sm">
                    <span>Total Deductions</span>
                    <span className="font-mono">{formatINR(latestRecord.total_deductions)}</span>
                  </div>
                </div>
              </div>

              {/* Net Disbursed Highlight */}
              <div className="mt-4 p-4 rounded-xl bg-slate-900 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs uppercase font-bold text-indigo-400">Net Take-Home Salary</span>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Gross Salary ({formatINR(latestRecord.gross_salary)}) − Total Deductions ({formatINR(latestRecord.total_deductions)})
                  </p>
                </div>
                <div className="text-2xl font-black font-mono text-emerald-400">
                  {formatINR(latestRecord.net_salary)}
                </div>
              </div>
            </Card>
          )}

          {/* Payroll History Table */}
          <Card className="border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Payroll History
                </h3>
                <p className="text-[11px] text-slate-500">
                  Statement records for Faculty Member: {faculty?.full_name} ({latestRecord?.employee_id || 'FAC-EMP-01'})
                </p>
              </div>
              {isDemoMode && (
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800">
                  Demo Dataset Active
                </span>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-white text-[11px] text-slate-500 uppercase font-semibold border-b border-slate-200">
                    <th className="py-3.5 px-4 font-semibold">Month</th>
                    <th className="py-3.5 px-4 font-semibold">Gross Salary</th>
                    <th className="py-3.5 px-4 font-semibold">Deductions</th>
                    <th className="py-3.5 px-4 font-semibold">Net Salary</th>
                    <th className="py-3.5 px-4 font-semibold">Status</th>
                    <th className="py-3.5 px-4 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeRecords.map((p) => (
                    <tr key={p.payroll_id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900 block">{p.pay_period}</span>
                        <span className="text-[10px] text-slate-400">{p.payment_date}</span>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-800">
                        {formatINR(p.gross_salary)}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-medium text-rose-600">
                        -{formatINR(p.total_deductions)}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-indigo-700">
                        {formatINR(p.net_salary)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          {p.payment_status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setSelectedPayslip(p)}
                          className="text-xs text-indigo-600 hover:text-indigo-800"
                        >
                          <Eye size={12} className="mr-1" />
                          View Payslip
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {/* Official Payslip Modal */}
      {selectedPayslip && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-scale-in flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
                  <Receipt size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    Official Salary Payslip Statement
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {selectedPayslip.pay_period} · UniVerse University Payroll
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPayslip(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4 text-xs">
              {selectedPayslip.is_demo && (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 font-medium text-center">
                  Demonstration data only — not an official salary statement.
                </div>
              )}

              {/* Employee & Institution Details */}
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Faculty Member</span>
                  <span className="font-bold text-slate-900">{faculty?.full_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Employee ID</span>
                  <span className="font-mono font-bold text-slate-900">{selectedPayslip.employee_id}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Department</span>
                  <span className="font-semibold text-slate-800">{faculty?.department}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Designation</span>
                  <span className="font-semibold text-slate-800">{faculty?.designation}</span>
                </div>
              </div>

              {/* Earnings & Deductions Breakdown */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 p-3 bg-emerald-50/40 rounded-xl border border-emerald-100">
                  <h4 className="font-bold text-[11px] text-emerald-900 uppercase">Earnings</h4>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Basic Salary:</span>
                    <span className="font-mono font-semibold">{formatINR(selectedPayslip.basic_salary)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">HRA:</span>
                    <span className="font-mono font-semibold">{formatINR(selectedPayslip.hra)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Academic Allowance:</span>
                    <span className="font-mono font-semibold">{formatINR(selectedPayslip.academic_allowance)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Other Allowances:</span>
                    <span className="font-mono font-semibold">{formatINR(selectedPayslip.other_allowances)}</span>
                  </div>
                  <div className="pt-2 border-t border-emerald-200 flex justify-between font-bold text-emerald-900">
                    <span>Gross Salary:</span>
                    <span className="font-mono">{formatINR(selectedPayslip.gross_salary)}</span>
                  </div>
                </div>

                <div className="space-y-2 p-3 bg-rose-50/40 rounded-xl border border-rose-100">
                  <h4 className="font-bold text-[11px] text-rose-900 uppercase">Deductions</h4>
                  <div className="flex justify-between">
                    <span className="text-slate-600">PF:</span>
                    <span className="font-mono font-semibold">{formatINR(selectedPayslip.provident_fund)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Prof. Tax:</span>
                    <span className="font-mono font-semibold">{formatINR(selectedPayslip.professional_tax)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Other Deductions:</span>
                    <span className="font-mono font-semibold">{formatINR(selectedPayslip.other_deductions)}</span>
                  </div>
                  <div className="pt-6 border-t border-rose-200 flex justify-between font-bold text-rose-900">
                    <span>Total Deductions:</span>
                    <span className="font-mono">{formatINR(selectedPayslip.total_deductions)}</span>
                  </div>
                </div>
              </div>

              {/* Net Pay Box */}
              <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-indigo-700 uppercase">Net Disbursed Salary</span>
                  <p className="text-xs text-slate-500">Disbursed via {selectedPayslip.payment_method}</p>
                </div>
                <div className="text-xl font-black text-indigo-700 font-mono">
                  {formatINR(selectedPayslip.net_salary)}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
              <Button size="sm" variant="secondary" onClick={handlePrint}>
                <Printer size={13} className="mr-1" />
                Print Statement
              </Button>
              <Button size="sm" onClick={() => setSelectedPayslip(null)} className="bg-indigo-600 text-white">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
