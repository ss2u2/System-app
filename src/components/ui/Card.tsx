import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: boolean;
  hoverable?: boolean;
  className?: string;
  onClick?: () => void;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ children, padding = true, hoverable = false, className = '', onClick, ...props }, ref) => {
    let classes = ['ui-card'];
    if (padding) classes.push('ui-card-padded');
    if (hoverable) classes.push('ui-card-hoverable');
    if (onClick) classes.push('ui-card-clickable');
    if (className) classes.push(className);

    return (
      <div
        ref={ref}
        className={classes.join(' ')}
        onClick={onClick}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
export default Card;
