import { useState } from 'react';
import styles from './UserAvatar.module.css';

const sizes = {
  nav: styles.nav,
  mobile: styles.mobile,
  profile: styles.profile,
};

function getInitials(name = '') {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '?';
  if (words.length === 1) return Array.from(words[0]).slice(0, 2).join('').toLocaleUpperCase();
  return words.slice(0, 2).map((word) => Array.from(word)[0].toLocaleUpperCase()).join('');
}

export function UserAvatar({ name = '', imageUrl, size = 'nav', className = '' }) {
  const [failedImageUrl, setFailedImageUrl] = useState(null);
  const classes = [styles.avatar, sizes[size] || sizes.nav, className].filter(Boolean).join(' ');

  // TODO: Pass Cognito's picture attribute or an S3 image URL when profile images are supported.
  if (imageUrl && imageUrl !== failedImageUrl) {
    return (
      <img
        className={classes}
        src={imageUrl}
        alt={name ? `${name} profile` : 'User profile'}
        onError={() => setFailedImageUrl(imageUrl)}
      />
    );
  }

  return (
    <span className={classes} role="img" aria-label={`${name || 'User'} initials`}>
      {getInitials(name)}
    </span>
  );
}
