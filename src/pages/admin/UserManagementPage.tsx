import styles from './UserManagementPage.module.css';

export default function UserManagementPage() {
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>사용자 관리</h1>
      <div className={styles.placeholder}>
        <span className={styles.icon}>🚧</span>
        <p>사용자 관리 기능은 준비 중입니다.</p>
      </div>
    </div>
  );
}
