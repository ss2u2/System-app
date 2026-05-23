import React from 'react';

interface AppContainerProps {
  children: React.ReactNode;
}

export default function AppContainer({ children }: AppContainerProps) {
  return <div className="app-container">{children}</div>;
}
