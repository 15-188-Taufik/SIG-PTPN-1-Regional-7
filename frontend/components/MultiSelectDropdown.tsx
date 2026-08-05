'use client';

import { useState, useRef, useEffect } from 'react';

interface MultiSelectDropdownProps {
  label: string;
  options: string[];
  selectedValues: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
}

export default function MultiSelectDropdown({
  label,
  options,
  selectedValues,
  onChange,
  placeholder = 'Pilih Opsi',
}: MultiSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleOption = (val: string) => {
    if (selectedValues.includes(val)) {
      onChange(selectedValues.filter((v) => v !== val));
    } else {
      onChange([...selectedValues, val]);
    }
  };

  const handleClearAll = () => {
    onChange([]);
  };

  const displayLabel = () => {
    if (selectedValues.length === 0) return placeholder;
    if (selectedValues.length === options.length) return 'Semua Kebun';
    if (selectedValues.length > 2) return `${selectedValues.length} Kebun Terpilih`;
    return selectedValues.join(', ');
  };

  return (
    <div ref={containerRef} style={styles.container}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          ...styles.button,
          border: isOpen ? '1px solid #0f62fe' : '1px solid #8d8d8d',
          background: selectedValues.length > 0 ? '#ffffff' : '#f4f4f4',
        }}
      >
        <span style={styles.buttonText}>{displayLabel()}</span>
        <span style={styles.arrow}>{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div style={styles.dropdown}>
          <div style={styles.header}>
            <span style={styles.headerTitle}>Filter {label}</span>
            {selectedValues.length > 0 && (
              <button type="button" onClick={handleClearAll} style={styles.clearBtn}>
                Clear
              </button>
            )}
          </div>
          <div style={styles.list}>
            {options.map((option) => {
              const isChecked = selectedValues.includes(option);
              return (
                <label key={option} style={styles.item}>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleToggleOption(option)}
                    style={styles.checkbox}
                  />
                  <span
                    style={{
                      ...styles.itemLabel,
                      fontWeight: isChecked ? '600' : '400',
                      color: isChecked ? '#161616' : '#525252',
                    }}
                  >
                    {option}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
    width: '100%',
  },
  button: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    padding: '5px 8px',
    fontSize: '12px',
    borderRadius: '2px',
    cursor: 'pointer',
    textAlign: 'left',
    outline: 'none',
    transition: 'all 0.15s ease',
  },
  buttonText: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    marginRight: '6px',
    color: '#161616',
  },
  arrow: {
    fontSize: '8px',
    color: '#525252',
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: '4px',
    background: '#ffffff',
    border: '1px solid #e0e0e0',
    borderRadius: '2px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    zIndex: 999,
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '220px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '6px 8px',
    borderBottom: '1px solid #e0e0e0',
    background: '#f4f4f4',
  },
  headerTitle: {
    fontSize: '10px',
    fontWeight: '700',
    textTransform: 'uppercase',
    color: '#525252',
  },
  clearBtn: {
    background: 'none',
    border: 'none',
    color: '#0f62fe',
    fontSize: '10px',
    fontWeight: '600',
    cursor: 'pointer',
    padding: 0,
  },
  list: {
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    padding: '4px 0',
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    padding: '6px 8px',
    cursor: 'pointer',
    transition: 'background 0.1s ease',
    userSelect: 'none',
  },
  checkbox: {
    marginRight: '8px',
    cursor: 'pointer',
  },
  itemLabel: {
    fontSize: '12px',
  },
};
