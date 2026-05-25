import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, variant = 'secondary', size = 'md', fullWidth = false, className = '', style, ...props }, ref) => {
    // Basic structural class names mapped to standard CSS definitions
    let baseClass = 'ui-button';
    let variantClass = `ui-button-${variant}`;
    let sizeClass = `ui-button-${size}`;
    let widthClass = fullWidth ? 'ui-button-fullwidth' : '';

    return (
      <button
        ref={ref}
        className={`${baseClass} ${variantClass} ${sizeClass} ${widthClass} ${className}`.trim()}
        style={style}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
export default Button;
