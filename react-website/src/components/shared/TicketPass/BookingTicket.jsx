import { TicketPass } from './TicketPass';

export function BookingTicket({ booking, showQRCode = true, headerAction, className }) {
  return (
    <TicketPass
      movieTitle={booking.movieTitle}
      date={booking.date}
      time={booking.time}
      screen={booking.screen}
      seats={booking.seats}
      bookingRef={booking.bookingRef}
      guestName={booking.guestName}
      ticketCount={booking.ticketCount}
      total={booking.totalAmount !== undefined && booking.currency !== undefined
        ? new Intl.NumberFormat('en-GB', { style: 'currency', currency: booking.currency }).format(booking.totalAmount)
        : undefined}
      isShowBookingConfirmedIndicator={false}
      showQRCode={showQRCode}
      headerAction={headerAction}
      className={className}
    />
  );
}
