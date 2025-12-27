import { useNavigate } from 'react-router-dom';
import styles from '../App.module.css';

interface SubMenuItem {
  path: string;
  label: string;
}

interface NavDropdownProps {
  link: {
    path: string;
    label: string;
    icon: string;
    submenu?: SubMenuItem[];
  };
  isActive: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

export function NavDropdown({
  link,
  isActive,
  isOpen,
  onToggle,
  onMouseEnter,
  onMouseLeave,
}: NavDropdownProps) {
  const navigate = useNavigate();

  const handleSubItemClick = (path: string) => {
    navigate(path);
    onToggle();
  };

  return (
    <div className={styles.dropdownContainer}>
      <button
        className={`${styles.navButton} ${isActive ? styles.active : ''}`}
        onClick={onToggle}
        onMouseEnter={onMouseEnter}
      >
        <span className={styles.navIcon}>{link.icon}</span>
        {link.label}
        <span className={styles.dropdownArrow}>▼</span>
      </button>

      {isOpen && (
        <div className={styles.dropdown} onMouseLeave={onMouseLeave}>
          {link.submenu?.map((subItem) => (
            <button
              key={subItem.path}
              className={styles.dropdownItem}
              onClick={() => handleSubItemClick(subItem.path)}
            >
              {subItem.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
