import React from 'react';
import { Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { SalaryCalculation, Employee } from '../types';

// Create styles
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#fff',
    padding: 30,
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
    borderBottomWidth: 1,
    borderBottomColor: '#eaeaea',
    paddingVertical: 8,
  },
  label: {
    fontSize: 12,
  },
  value: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    marginTop: 10,
    borderTopWidth: 2,
    borderTopColor: '#112246',
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  totalValue: {
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
    fontSize: 10,
    color: 'grey',
  },
});

type SalaryPDFProps = {
  salary: SalaryCalculation;
  employee: Employee;
  month: string;
};

const SalaryPDF = ({ salary, employee, month }: SalaryPDFProps) => {
  const monthDate = new Date(month + '-01');
  const formattedMonth = monthDate.toLocaleDateString('en-US', { 
    month: 'long', 
    year: 'numeric'
  });

  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.title}>Salary Slip</Text>
        <Text style={styles.subtitle}>{formattedMonth}</Text>
      </View>

      <View style={styles.section}>
        <Text style={{ fontSize: 16, marginBottom: 10, fontWeight: 'bold' }}>
          Employee Information
        </Text>
        <View style={styles.row}>
          <Text style={styles.label}>Name</Text>
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
        <Text style={{ fontSize: 16, marginBottom: 10, fontWeight: 'bold' }}>
          Salary Components
        </Text>
        <View style={styles.row}>
          <Text style={styles.label}>Basic Salary (A)</Text>
          <Text style={styles.value}>{salary.basicSalary.toFixed(2)} EGP</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Cost of Living (B)</Text>
          <Text style={styles.value}>{salary.costOfLiving.toFixed(2)} EGP</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Shift Allowance (C)</Text>
          <Text style={styles.value}>{salary.shiftAllowance.toFixed(2)} EGP</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Overtime Hours</Text>
          <Text style={styles.value}>{salary.overtimeHours} hours</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Overtime Pay (D)</Text>
          <Text style={styles.value}>{salary.overtimePay.toFixed(2)} EGP</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>USD to EGP Exchange Rate</Text>
          <Text style={styles.value}>{salary.exchangeRate.toFixed(2)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Variable Pay (E)</Text>
          <Text style={styles.value}>{salary.variablePay.toFixed(2)} EGP</Text>
        </View>
        
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total Salary</Text>
          <Text style={styles.totalValue}>{salary.totalSalary.toFixed(2)} EGP</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text>Generated on {new Date().toLocaleDateString()}</Text>
      </View>
    </Page>
  );
};

export default SalaryPDF; 