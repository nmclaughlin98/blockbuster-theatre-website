import { useEffect, useState } from 'react';

const labels = ['Days', 'Hours', 'Mins', 'Secs'];

export function Countdown({ movie, className = '' }) {
    const target = movie.countdownTarget || movie.releaseDate;
    const [diff, setDiff] = useState(NaN);
    const countdownClassName = ['countdown-timer', className].filter(Boolean).join(' ');

    useEffect(() => {
        if (!target) return undefined;
        const update = () => setDiff(new Date(target).getTime() - Date.now());
        update();
        const timer = setInterval(update, 1000);
        return () => clearInterval(timer);
    }, [target]);

    if (Number.isNaN(diff)) return <div className={`${countdownClassName} is-unavailable`}>Release date coming soon</div>;
    if (diff <= 0) return <div className={`${countdownClassName} is-live`}>Now showing</div>;

    const values = [
        Math.floor(diff / 86400000),
        Math.floor(diff / 3600000) % 24,
        Math.floor(diff / 60000) % 60,
        Math.floor(diff / 1000) % 60,
    ];

    return (
        <div className={countdownClassName}>
            { values.map((value, index) => (
                <span className="countdown-unit" key={ labels[index] }>
          <span className="countdown-value">{ String(value).padStart(index ? 2 : 1, '0') }</span>
          <span className="countdown-label">{ labels[index] }</span>
        </span>
            )) }
        </div>
    );
}
