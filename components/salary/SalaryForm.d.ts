export interface SalaryFormProps {
  data: {
    basicSalary: number;
    overtimeHours: number;
    deductions: number;
    allowances: number;
    month: string;
  };
  onSave: (data: SalaryFormProps['data']) => void;
  onMonthChange: (month: string) => void;
}

export function SalaryForm(props: SalaryFormProps): JSX.Element; 