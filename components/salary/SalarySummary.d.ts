import { SalaryCalculation } from '../../lib/calculations/salary';

export interface SalarySummaryProps {
  calculation: SalaryCalculation;
}

export function SalarySummary(props: SalarySummaryProps): JSX.Element; 