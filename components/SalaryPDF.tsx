import React from 'react';
import { Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { SalaryCalculation, Employee } from '../types';

// Create styles
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#fff',
    padding: 30,
    fontFamily: 'Roboto'
  },
  header: {
    marginBottom: 20,
    padding: 10,
    borderBottom: 1,
    borderBottomColor: '#112246',
  },
  title: {
    fontSize: 24,
    textAlign: 'center',
    color: '#112246',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  section: {
    margin: 10,
    padding: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    borderBottomStyle: 'solid',
  },
  label: {
    fontSize: 12,
    color: '#666',
  },
  value: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  total: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#112246',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
    color: '#666',
    borderTop: 1,
    borderTopColor: '#eee',
    paddingTop: 10,
  },
});

type SalaryPDFProps = {
  salary: SalaryCalculation;
  employee: Employee;
  month: string;
  exchangeRate: number;
};

const SalaryPDF: React.FC<SalaryPDFProps> = ({ salary, employee, month, exchangeRate }) => {
  // Format currency with 2 decimal places
  const formatCurrency = (amount: number) => amount.toFixed(2);

  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.title}>Salary Statement</Text>
        <Text style={styles.subtitle}>
          {new Date(month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </Text>
      </View>

      <View style={styles.section}>
        <View style={styles.row}>
          <Text style={styles.label}>Employee Name</Text>
          <Text style={styles.value}>{employee.name}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Employee ID</Text>
          <Text style={styles.value}>{employee.employee_id}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Position</Text>
          <Text style={styles.value}>{employee.position}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.label, { marginBottom: 10 }]}>Salary Components (USD)</Text>
        
        <View style={styles.row}>
          <Text style={styles.label}>Basic Salary</Text>
          <Text style={styles.value}>${formatCurrency(salary.basicSalary)}</Text>
        </View>
        
        <View style={styles.row}>
          <Text style={styles.label}>Cost of Living</Text>
          <Text style={styles.value}>${formatCurrency(salary.costOfLiving)}</Text>
        </View>
        
        <View style={styles.row}>
          <Text style={styles.label}>Shift Allowance</Text>
          <Text style={styles.value}>${formatCurrency(salary.shiftAllowance)}</Text>
        </View>
        
        <View style={styles.row}>
          <Text style={styles.label}>Overtime Hours</Text>
          <Text style={styles.value}>{salary.overtimeHours}</Text>
        </View>
        
        <View style={styles.row}>
          <Text style={styles.label}>Overtime Pay</Text>
          <Text style={styles.value}>${formatCurrency(salary.overtimePay)}</Text>
        </View>
        
        <View style={styles.row}>
          <Text style={styles.label}>Variable Pay</Text>
          <Text style={styles.value}>${formatCurrency(salary.variablePay)}</Text>
        </View>
        
        <View style={styles.row}>
          <Text style={styles.label}>Deductions</Text>
          <Text style={styles.value}>-${formatCurrency(salary.deduction)}</Text>
        </View>
      </View>

      <View style={[styles.section, { marginTop: 20 }]}>
        <View style={styles.row}>
          <Text style={styles.total}>Total Salary (USD)</Text>
          <Text style={styles.total}>${formatCurrency(salary.totalSalary)}</Text>
        </View>
        
        <View style={styles.row}>
          <Text style={styles.total}>Exchange Rate</Text>
          <Text style={styles.total}>1 USD = {exchangeRate} EGP</Text>
        </View>
        
        <View style={styles.row}>
          <Text style={styles.total}>Total Salary (EGP)</Text>
          <Text style={styles.total}>EGP {formatCurrency(salary.totalSalary * exchangeRate)}</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={{ fontSize: 10 }}>
          Generated on {new Date().toLocaleDateString('en-US', { 
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </Text>
      </View>
    </Page>
  );
};

export default SalaryPDF; 