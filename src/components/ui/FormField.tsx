import React from 'react';

interface FormFieldProps {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}

export function FormField({ label, htmlFor, children, className = '' }: FormFieldProps) {
  return (
    <div className={`form-field ${className}`.trim()}>
      {label && <label htmlFor={htmlFor}>{label}</label>}
      {children}
    </div>
  );
}

export default FormField;
