import { IconTarget, IconClipboardList, IconChartBar, IconBook, IconList } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function BottomNav({ activeTab, setActiveTab }: BottomNavProps) {
  const navigate = useNavigate();
  const tabs = [
    { id: 'toady', label: 'Dashboard', icon: IconTarget },
    { id: 'tasks', label: 'Tasks', icon: IconClipboardList },
    { id: 'report', label: 'Progress', icon: IconChartBar },
    { id: 'diary', label: 'Diary', icon: IconBook },
  ];

  const handleManageListsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.location.pathname !== '/tasks') {
      navigate('/tasks');
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('open-manage-lists'));
      }, 150);
    } else {
      window.dispatchEvent(new CustomEvent('open-manage-lists'));
    }
  };

  return (
    <div className="bottom-nav">
      <div className="content-wrapper" style={{ justifyContent: 'space-around', width: '100%' }}>
        {tabs.map((tab) => {
          const IconComponent = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <div key={tab.id} className="nav-group">
              <div
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <IconComponent />
                <span>{tab.label}</span>
              </div>
              
              {/* Nested Manage Lists - Only for Tasks on PC/SideNav */}
              {tab.id === 'tasks' && (
                <div className={`nav-nested-container ${isActive ? 'visible' : ''}`}>
                  <div
                    className="nav-item nested"
                    onClick={handleManageListsClick}
                  >
                    <IconList size={18} />
                    <span>Manage Lists</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

