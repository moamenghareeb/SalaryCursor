import React from 'react';
import { Page, Text, View, StyleSheet, Document } from '@react-pdf/renderer';
import { Employee } from '../types';

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
  monthTable: {
    marginTop: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#112246',
    borderBottomStyle: 'solid',
    paddingBottom: 5,
    marginBottom: 10,
  },
  tableHeaderCell: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#112246',
    flex: 1,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    borderBottomStyle: 'solid',
  },
  tableCell: {
    fontSize: 11,
    flex: 1,
  },
  tableCellRight: {
    fontSize: 11,
    flex: 1,
    textAlign: 'right',
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
  summaryBox: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 5,
    marginTop: 15,
    marginBottom: 15,
  },
  chartCaption: {
    fontSize: 10,
    textAlign: 'center',
    color: '#666',
    marginTop: 5,
  },
});

interface MonthlyBreakdown {
  month: number;
  name: string;
  total: number;
}

type YearlySalaryPDFProps = {
  employee: Employee;
  year: number;
  totalSalary: number;
  averageSalary: number;
  monthlyBreakdown: MonthlyBreakdown[];
};

const YearlySalaryPDF: React.FC<YearlySalaryPDFProps> = ({ 
  employee, 
  year, 
  totalSalary, 
  averageSalary, 
  monthlyBreakdown 
}) => {
  // Format currency with comma separators and 2 decimal places
  const formatCurrency = (amount: number) => amount.toLocaleString('en-US', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });

  // Sort the monthly breakdown by month
  const sortedMonthlyBreakdown = [...monthlyBreakdown].sort((a, b) => a.month - b.month);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Yearly Salary Report</Text>
          <Text style={styles.subtitle}>{year}</Text>
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

        <View style={styles.summaryBox}>
          <View style={styles.row}>
            <Text style={styles.total}>Total Annual Salary (EGP)</Text>
            <Text style={styles.total}>EGP {formatCurrency(totalSalary)}</Text>
          </View>
          
          <View style={styles.row}>
            <Text style={styles.label}>Average Monthly Salary (EGP)</Text>
            <Text style={styles.value}>EGP {formatCurrency(averageSalary)}</Text>
          </View>
          
          <View style={styles.row}>
            <Text style={styles.label}>Number of Months with Salary</Text>
            <Text style={styles.value}>{sortedMonthlyBreakdown.length}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.label, { marginBottom: 10, fontWeight: 'bold' }]}>Monthly Breakdown</Text>
          
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Month</Text>
            <Text style={[styles.tableHeaderCell, { textAlign: 'right' }]}>Amount (EGP)</Text>
          </View>
          
          {sortedMonthlyBreakdown.length > 0 ? (
            sortedMonthlyBreakdown.map((item) => (
              <View style={styles.tableRow} key={item.month}>
                <Text style={[styles.tableCell, { flex: 2 }]}>{item.name}</Text>
                <Text style={styles.tableCellRight}>EGP {formatCurrency(item.total)}</Text>
              </View>
            ))
          ) : (
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 3, textAlign: 'center', color: '#999' }]}>
                No salary data available for {year}
              </Text>
            </View>
          )}
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
          <Text style={{ fontSize: 8, marginTop: 5, color: '#999' }}>
            SalaryCursor - All rights reserved © {new Date().getFullYear()}
          </Text>
        </View>
      </Page>
    </Document>
  );
};

export default YearlySalaryPDF; 