export function getPosterUrl(posterUrl, size) {
    if (!posterUrl || !posterUrl.includes('image.tmdb.org') || !/\/t\/p\/[^/]+\//.test(posterUrl)) {
        return undefined;
    }
    return posterUrl.replace(/\/t\/p\/[^/]+\//, `/t/p/${size}/`);
}

export function getPosterSrcSet(posterUrl, isSlowConnection) {
    if (!getPosterUrl(posterUrl, 'w185')) return undefined;

    const widths = isSlowConnection ? [185, 342] : [185, 342, 500, 780, 1280];
    return widths
        .map((width) => `${getPosterUrl(posterUrl, `w${width}`)} ${width}w`)
        .join(', ');
}

export function getPosterSrc(posterUrl, isSlowConnection) {
    return (isSlowConnection && getPosterUrl(posterUrl, 'w342')) || posterUrl;
}
