import { useState } from 'react';

async function downloadTicket(booking) {
  const { downloadTicketPdf } = await import('./ticketPdf.jsx');
  await downloadTicketPdf(booking);
}

export function TicketDownloadButton({
  booking, className, errorClassName, download = downloadTicket,
}) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  async function handleDownload() {
    if (downloading || !booking.bookingRef) return;
    setDownloading(true);
    setError('');
    try {
      await download(booking);
    } catch (downloadError) {
      console.error('Unable to download ticket.', downloadError);
      setError('Could not download your ticket. Please try again.');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <>
      <button className={className} type="button" disabled={downloading || !booking.bookingRef} onClick={handleDownload}>
        {downloading ? 'Downloading...' : 'Download ticket'}
      </button>
      {error && <p className={errorClassName} role="alert">{error}</p>}
    </>
  );
}
