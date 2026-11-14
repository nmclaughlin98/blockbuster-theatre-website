import { useState } from 'react';
import { getCognitoAccessToken } from '../../../auth/cognitoAuth';
import { MOVIES_API_URL } from '../../../config';

async function downloadTicket(booking) {
  if (!booking.bookingId) throw new Error('A booking ID is required to download a ticket.');
  
  const accessToken = await getCognitoAccessToken();
  if (!accessToken) {
    throw new Error('You must be logged in to download a ticket.');
  }

  const response = await fetch(
    `${MOVIES_API_URL}/bookings/${booking.bookingId}/ticket`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to download ticket: ${response.status} ${errorText}`);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${booking.bookingRef.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 100) || 'ticket'}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function TicketDownloadButton({
  booking, className, errorClassName, download,
}) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  async function handleDownload() {
    if (downloading || !booking.bookingRef || !booking.bookingId) return;
    setDownloading(true);
    setError('');
    try {
      const downloadFn = download || downloadTicket;
      await downloadFn(booking);
    } catch (downloadError) {
      console.error('Unable to download ticket.', downloadError);
      setError('Could not download your ticket. Please try again.');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <>
      <button className={className} type="button" disabled={downloading || !booking.bookingRef || !booking.bookingId} onClick={handleDownload}>
        {downloading ? 'Downloading...' : 'Download ticket'}
      </button>
      {error && <p className={errorClassName} role="alert">{error}</p>}
    </>
  );
}
