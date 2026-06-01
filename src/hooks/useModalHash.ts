import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * Hook to manage modal open state using the URL hash.
 * This ensures that pressing the browser/system Back button
 * closes the modal instead of navigating back to the previous page.
 */
export function useModalHash(hash: string) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(location.hash === `#${hash}`);

  useEffect(() => {
    const isHashPresent = location.hash === `#${hash}`;
    if (isOpen !== isHashPresent) {
      setIsOpen(isHashPresent);
    }
  }, [location.hash, hash]);

  const openModal = () => {
    if (location.hash !== `#${hash}`) {
      navigate(`${location.pathname}${location.search}#${hash}`);
    }
  };

  const closeModal = () => {
    if (location.hash === `#${hash}`) {
      navigate(-1);
    }
  };

  return {
    isOpen,
    openModal,
    closeModal
  };
}
