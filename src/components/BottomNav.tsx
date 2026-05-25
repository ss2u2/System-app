import { IconTarget, IconClipboardList, IconChartBar, IconBook } from '@tabler/icons-react';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function BottomNav({ activeTab, setActiveTab }: BottomNavProps) {
  const tabs = [
    { id: 'toady', label: 'Dashboard', icon: IconTarget },
    { id: 'tasks', label: 'Tasks', icon: IconClipboardList },
    { id: 'report', label: 'Progress', icon: IconChartBar },
    { id: 'journal', label: 'Journal', icon: IconBook },
  ];

  return (
    <div className="bottom-nav">
      <div className="content-wrapper" style={{ justifyContent: 'space-around', width: '100%' }}>
        {tabs.map((tab) => {
          const IconComponent = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <div
              key={tab.id}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <IconComponent />
              <span>{tab.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
