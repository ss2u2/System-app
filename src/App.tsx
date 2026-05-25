import { createBrowserRouter, createHashRouter, RouterProvider } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import AuthGuard from './components/AuthGuard';
import AuthenticatedLayout from './components/AuthenticatedLayout';
import AuthScreen from './components/AuthScreen';
import DashboardView from './screens/DashboardView';
import TasksView from './screens/TasksView';
import ProgressView from './screens/ProgressView';
import JournalView from './screens/JournalView';

// Detect Capacitor or Cordova native platform environment
const isNativePlatform = () => {
  // Check global Cap / Cordova indicators
  const win = window as any;
  return !!(win.Capacitor?.isNative || win.cordova || win.webkit?.messageHandlers?.cordova);
};

// Define application route configuration mapping
const routes = [
  {
    path: '/login',
    element: <AuthScreen />,
  },
  {
    path: '/',
    element: <AuthGuard />,
    children: [
      {
        element: <AuthenticatedLayout />,
        children: [
          {
            path: '',
            element: <DashboardView />,
          },
          {
            path: 'detail/:taskId',
            element: <DashboardView />,
          },
          {
            path: 'tasks',
            element: <TasksView />,
          },
          {
            path: 'tasks/detail/:taskId',
            element: <TasksView />,
          },
          {
            path: 'report',
            element: <ProgressView />,
          },
          {
            path: 'journal',
            element: <JournalView />,
          },
          {
            path: 'journal/:entryId',
            element: <JournalView />,
          },
        ],
      },
    ],
  },
];

// Initialize appropriate router dynamically
const router = isNativePlatform()
  ? createHashRouter(routes)
  : createBrowserRouter(routes);

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <RouterProvider router={router} />
      </ThemeProvider>
    </AuthProvider>
  );
}
