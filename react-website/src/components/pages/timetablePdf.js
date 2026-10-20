const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const COLORS = {
  red: [179, 30, 53],
  dark: [24, 26, 36],
  gold: [251, 191, 36],
  muted: [107, 114, 128],
  border: [231, 200, 205],
  alternate: [253, 238, 240],
  white: [255, 255, 255],
};

function getMovieTitle(movie) {
  return typeof movie.title === 'string' && movie.title.trim() ? movie.title.trim() : 'Untitled movie';
}

function getMovieGenre(movie) {
  if (Array.isArray(movie.genres) && movie.genres.length) return movie.genres.join(' / ');
  return movie.genre || 'General';
}

function getShowtimes(movie, day) {
  const slots = movie.showtimes?.[day];
  return Array.isArray(slots) ? slots : [];
}

function addPageHeader(pdf, weekCommencing, layout) {
  const { margin, pageWidth } = layout;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(18);
  pdf.setTextColor(...COLORS.dark);
  pdf.text('BLOCKBUSTER THEATRE', margin, 34);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(...COLORS.red);
  pdf.text('WEEKLY MOVIE TIMETABLE', margin, 50);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(...COLORS.muted);
  pdf.text(`Week commencing ${weekCommencing}`, pageWidth - margin, 42, { align: 'right' });

  pdf.setDrawColor(...COLORS.gold);
  pdf.setLineWidth(2);
  pdf.line(margin, 62, pageWidth - margin, 62);
}

function addPageFooter(pdf, layout, pageNumber, totalPages) {
  const { margin, pageWidth, pageHeight } = layout;
  pdf.setDrawColor(...COLORS.border);
  pdf.setLineWidth(0.6);
  pdf.line(margin, pageHeight - 29, pageWidth - margin, pageHeight - 29);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(...COLORS.muted);
  pdf.text('Blockbuster Theatre  |  Box Office: 028 7147 2869', margin, pageHeight - 16);
  pdf.text(`Page ${pageNumber} of ${totalPages}`, pageWidth - margin, pageHeight - 16, { align: 'right' });
}

function drawMovieTable(pdf, movie, y, layout) {
  const { margin, contentWidth, bottomLimit } = layout;
  const dayColumnWidth = 82;
  const minShowingColumnWidth = 86;
  const maxColumnsPerTable = Math.max(1, Math.floor((contentWidth - dayColumnWidth) / minShowingColumnWidth));
  const weekTimes = DAYS.map((day) => getShowtimes(movie, day));
  const showingCount = Math.max(1, ...weekTimes.map((times) => times.length));
  const title = getMovieTitle(movie);
  const genre = getMovieGenre(movie);
  const titleWidth = contentWidth - 20;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  const titleLines = pdf.splitTextToSize(title.toUpperCase(), titleWidth);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  const genreLines = pdf.splitTextToSize(genre, titleWidth);
  const titleBarHeight = Math.max(37, 24 + titleLines.length * 13 + genreLines.length * 9);
  const headerHeight = 22;
  const rowHeight = 18;
  const tableHeight = titleBarHeight + headerHeight + DAYS.length * rowHeight;
  const pageContentTop = 76;

  for (let columnStart = 0; columnStart < showingCount; columnStart += maxColumnsPerTable) {
    if (y + tableHeight > bottomLimit) {
      pdf.addPage();
      y = pageContentTop;
    }

    const columns = Math.min(maxColumnsPerTable, showingCount - columnStart);
    const showingColumnWidth = (contentWidth - dayColumnWidth) / columns;

    pdf.setFillColor(...COLORS.red);
    pdf.rect(margin, y, contentWidth, titleBarHeight, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.setTextColor(...COLORS.white);
    pdf.text(titleLines, margin + 10, y + 12, { lineHeightFactor: 1.05 });

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(255, 215, 220);
    pdf.text(genreLines, margin + 10, y + 16 + titleLines.length * 13, { lineHeightFactor: 1.05 });
    y += titleBarHeight;

    pdf.setFillColor(...COLORS.dark);
    pdf.rect(margin, y, contentWidth, headerHeight, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(...COLORS.white);
    pdf.text('DAY', margin + 9, y + 14);

    for (let column = 0; column < columns; column += 1) {
      const x = margin + dayColumnWidth + column * showingColumnWidth;
      pdf.text(`SHOWING ${columnStart + column + 1}`, x + showingColumnWidth / 2, y + 14, { align: 'center' });
    }
    y += headerHeight;

    DAYS.forEach((day, rowIndex) => {
      const rowY = y + rowIndex * rowHeight;
      pdf.setFillColor(...(rowIndex % 2 ? COLORS.alternate : COLORS.white));
      pdf.rect(margin, rowY, contentWidth, rowHeight, 'F');
      pdf.setDrawColor(...COLORS.border);
      pdf.setLineWidth(0.4);
      pdf.rect(margin, rowY, contentWidth, rowHeight);

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.setTextColor(...COLORS.red);
      pdf.text(day.toUpperCase(), margin + 9, rowY + 12);

      for (let column = 0; column < columns; column += 1) {
        const x = margin + dayColumnWidth + column * showingColumnWidth;
        pdf.setDrawColor(...COLORS.border);
        pdf.line(x, rowY, x, rowY + rowHeight);

        const slot = weekTimes[rowIndex][columnStart + column];
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        pdf.setTextColor(...(slot ? COLORS.dark : COLORS.muted));
        pdf.text(slot ? `${slot.time} — Screen ${slot.screen}` : '-', x + showingColumnWidth / 2, rowY + 12, { align: 'center' });
      }
    });

    y += DAYS.length * rowHeight + 16;
  }

  return y;
}

export async function downloadTimetablePdf(movies, weekCommencing) {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4', compress: true });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 36;
  const layout = {
    margin,
    contentWidth: pageWidth - margin * 2,
    pageWidth,
    pageHeight,
    bottomLimit: pageHeight - 44,
  };
  const sortedMovies = movies
    .filter((movie) => DAYS.some((day) => getShowtimes(movie, day).length))
    .sort((a, b) => getMovieTitle(a).localeCompare(getMovieTitle(b), undefined, { sensitivity: 'base' }));

  addPageHeader(pdf, weekCommencing, layout);

  let y = 76;
  if (!sortedMovies.length) {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(11);
    pdf.setTextColor(...COLORS.muted);
    pdf.text('No timetable entries available.', margin, y + 14);
  } else {
    sortedMovies.forEach((movie) => {
      y = drawMovieTable(pdf, movie, y, layout);
    });
  }

  const totalPages = pdf.internal.getNumberOfPages();
  for (let page = 1; page <= totalPages; page += 1) {
    pdf.setPage(page);
    if (page > 1) addPageHeader(pdf, weekCommencing, layout);
    addPageFooter(pdf, layout, page, totalPages);
  }

  pdf.save(`blockbuster-timetable-week-commencing-${weekCommencing.replaceAll('/', '-')}.pdf`);
}
