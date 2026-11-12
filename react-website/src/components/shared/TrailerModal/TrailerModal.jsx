import { useEffect } from 'react';
import styles from './TrailerModal.module.css';

function withAutoplay(url) {
  if (/[?&]autoplay=1(?:&|$)/.test(url)) return url;
  const hashIndex = url.indexOf('#');
  const urlWithoutHash = hashIndex === -1 ? url : url.slice(0, hashIndex);
  const hash = hashIndex === -1 ? '' : url.slice(hashIndex);
  return `${urlWithoutHash}${urlWithoutHash.includes('?') ? '&' : '?'}autoplay=1${hash}`;
}

export function TrailerModal({ url, onClose, title = 'Movie trailer' }) {
  useEffect(() => {
    if (!url) return undefined;

    function closeOnEscape(event) {
      if (event.key === 'Escape') onClose();
    }

    document.body.classList.add('noScroll');
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.classList.remove('noScroll');
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [url, onClose]);

  return (
    <div
      className={`${styles.backdrop} ${url ? styles.open : ''}`}
      aria-hidden={!url}
      inert={!url}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className={styles.dialog} role="dialog" aria-modal="true" aria-label={title}>
        <button
          type="button"
          className={styles.closeButton}
          aria-label="Close trailer"
          onClick={onClose}
        >
          &times;
        </button>
        <iframe
          className={styles.iframe}
          src={url ? withAutoplay(url) : null}
          title={title}
          referrerPolicy="strict-origin-when-cross-origin"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    </div>
  );
}
