'use client';

import styles from './LoadingSkeleton.module.css';

interface LoadingSkeletonProps {
  type?: 'card' | 'text' | 'avatar' | 'button' | 'input';
  count?: number;
  width?: string;
  height?: string;
}

export function LoadingCard() {
  return (
    <div className={styles.skeletonCard}>
      <div className={styles.skeletonHeader}></div>
      <div className={styles.skeletonBody}>
        <div className={styles.skeletonText} style={{ width: '80%' }}></div>
        <div className={styles.skeletonText} style={{ width: '60%' }}></div>
        <div className={styles.skeletonText} style={{ width: '70%' }}></div>
      </div>
    </div>
  );
}

export function LoadingText({ width = '100%', count = 3 }: { width?: string; count?: number }) {
  return (
    <div className={styles.skeletonContainer}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={styles.skeletonText} style={{ width, marginBottom: '12px' }}></div>
      ))}
    </div>
  );
}

export function LoadingAvatar({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeMap = { sm: '40px', md: '80px', lg: '120px' };
  return (
    <div
      className={styles.skeletonAvatar}
      style={{
        width: sizeMap[size],
        height: sizeMap[size],
      }}
    ></div>
  );
}

export function LoadingButton({ width = '100px' }: { width?: string }) {
  return (
    <div className={styles.skeletonButton} style={{ width }}></div>
  );
}

export function LoadingInput() {
  return <div className={styles.skeletonInput}></div>;
}

export default function LoadingSkeleton({
  type = 'card',
  count = 1,
  width = '100%',
  height = '24px',
}: LoadingSkeletonProps) {
  if (type === 'card') {
    return (
      <>
        {Array.from({ length: count }).map((_, i) => (
          <LoadingCard key={i} />
        ))}
      </>
    );
  }

  if (type === 'text') {
    return <LoadingText width={width} count={count} />;
  }

  if (type === 'avatar') {
    return <LoadingAvatar />;
  }

  if (type === 'button') {
    return <LoadingButton width={width} />;
  }

  if (type === 'input') {
    return <LoadingInput />;
  }

  return null;
}
