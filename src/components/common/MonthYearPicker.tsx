import { useState } from 'react';
import styles from './MonthYearPicker.module.css';

interface MonthYearPickerProps {
  value: { year: number; month: number } | null;
  onSelect: (year: number, month: number) => void;
}

const MONTH_LABELS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

export default function MonthYearPicker({ value, onSelect }: MonthYearPickerProps) {
  const [displayYear, setDisplayYear] = useState(value?.year ?? new Date().getFullYear());

  return (
    <div className={styles.picker}>
      <div className={styles.yearNav}>
        <button type="button" onClick={() => setDisplayYear(y => y - 1)}>‹</button>
        <span>{displayYear}년</span>
        <button type="button" onClick={() => setDisplayYear(y => y + 1)}>›</button>
      </div>
      <div className={styles.monthGrid}>
        {MONTH_LABELS.map((label, i) => {
          const month = i + 1;
          const selected = value?.year === displayYear && value?.month === month;
          return (
            <button
              key={month}
              type="button"
              className={`${styles.monthBtn} ${selected ? styles.monthBtnSelected : ''}`}
              onClick={() => onSelect(displayYear, month)}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
