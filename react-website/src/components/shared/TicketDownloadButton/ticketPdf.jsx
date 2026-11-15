import { createElement } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { BookingTicket } from '../TicketPass/BookingTicket';
import ticketStyles from '../TicketPass/TicketPass.module.css';

export async function downloadTicketPdf(booking) {
  if (!booking.bookingRef) throw new Error('A booking reference is required to download a ticket.');

  const host = document.createElement('div');
  Object.assign(host.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '270px',
    opacity: '0',
    pointerEvents: 'none',
    zIndex: '-1',
  });
  host.setAttribute('aria-hidden', 'true');
  const container = document.createElement('div');
  host.appendChild(container);
  document.body.appendChild(host);
  let root;
  try {
    root = createRoot(container);
    flushSync(() => root.render(createElement(BookingTicket, {
      booking,
      className: ticketStyles.pdfLayout,
    })));
    await document.fonts.ready;
    const scale = 2;
    const ticket = container.firstElementChild;
    const bounds = ticket.getBoundingClientRect();
    const width = Math.ceil(bounds.width);
    const height = Math.ceil(bounds.height);
    if (!width || !height) throw new Error('Could not render the ticket.');
    const canvas = await html2canvas(ticket, {
      backgroundColor: null,
      scale,
      width: width + scale,
      height: height + scale,
      logging: false,
      foreignObjectRendering: true,
      onclone: (clonedDocument, clonedContainer) => {
        clonedDocument.body.replaceChildren(clonedContainer);
        clonedDocument.body.style.margin = '0';
        clonedContainer.style.position = 'absolute';
        clonedContainer.style.top = '0';
        clonedContainer.style.left = '0';
        clonedContainer.style.width = `${bounds.width}px`;
      },
    });
    const ticketCanvas = document.createElement('canvas');
    ticketCanvas.width = width * scale;
    ticketCanvas.height = height * scale;
    const context = ticketCanvas.getContext('2d');
    if (!context) throw new Error('Could not render the ticket.');
    // html2canvas offsets foreign-object content by the scale in CSS pixels.
    context.drawImage(canvas, scale * scale, scale * scale, ticketCanvas.width, ticketCanvas.height, 0, 0, ticketCanvas.width, ticketCanvas.height);
    // 9:16 aspect ratio: 270 x 480 points (or scale by 2: 540 x 960)
    const pageWidth = 270;
    const pageHeight = 480;
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: [pageWidth, pageHeight], compress: true });
    // Scale to fit within page while maintaining aspect ratio, then position at top
    const fit = Math.min(pageWidth / ticketCanvas.width, pageHeight / ticketCanvas.height);
    const imageWidth = ticketCanvas.width * fit;
    const imageHeight = ticketCanvas.height * fit;
    pdf.addImage(ticketCanvas.toDataURL('image/png'), 'PNG', (pageWidth - imageWidth) / 2, 0, imageWidth, imageHeight);
    const filename = booking.bookingRef.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 100) || 'ticket';
    pdf.save(`${filename}.pdf`);
  } finally {
    root?.unmount();
    host.remove();
  }
}
