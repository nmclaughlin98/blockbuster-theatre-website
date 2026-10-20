import { useState } from 'react';
import { Layout, asset } from '../shared';

const faqs = [
  {
    question: 'How do I book tickets at Blockbuster Theatre?',
    answer: <>Reserve tickets online through the interactive <a href="./bookNow.html">booking page</a>, call our box office on <strong>028 7147 2869</strong>, or visit the venue ticket kiosk.</>,
  },
  {
    question: 'What are the opening hours of Blockbuster Theatre?',
    answer: <><strong>Monday–Thursday:</strong> 9:00 AM–11:00 PM<br /><strong>Friday–Saturday:</strong> 9:00 AM–2:00 AM (late-night screenings)<br /><strong>Sunday:</strong> 11:00 AM–11:00 PM</>,
  },
  {
    question: 'How many screens does Blockbuster Theatre have?',
    answer: 'Blockbuster features eight auditoriums with Dolby Atmos sound, high-frame-rate 3D capability, and luxury tiered seating.',
  },
  {
    question: 'What payment methods are accepted?',
    answer: 'Online we accept Visa, MasterCard, Maestro, Apple Pay, and Google Pay. At the box office and concession stands, we accept contactless payments, cash, and Blockbuster gift vouchers.',
  },
  {
    question: 'Are the screens fully wheelchair accessible?',
    answer: 'Yes. All eight screens have step-free access, dedicated wheelchair and companion seats, accessible restrooms, and hearing loop systems.',
  },
];

function CinemaHero() {
  return (
    <section className="movie-hero-backdrop">
      <img
        className="still"
        src={asset('assets/images/stills/theatre.jpg')}
        alt="Blockbuster Theatre auditorium"
      />
      <div className="movie-hero-content">
        <h1>Experience Cinema In Full Glory</h1>
        <div className="movie-meta-bar">
          <span className="rating-badge">8 SCREENS</span>
          <span className="about-section-badge">Dolby Atmos 3D Audio</span>
          <span className="about-section-badge">4K IMAX Laser</span>
          <span className="about-section-badge">100% Accessible</span>
        </div>
      </div>
    </section>
  );
}

function FaqItem({ question, children }) {
  const [open, setOpen] = useState(false);
  const panelId = `faq-${question.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

  return (
    <>
      <button
        className={`accordion ${open ? 'active' : ''}`}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        <span>{question}</span>
        <svg className="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      <div
        className={`panel ${open ? 'open' : ''}`}
        id={panelId}
        aria-hidden={!open}
        inert={!open}
        style={{ maxHeight: open ? '400px' : '0px' }}
      >
        <p>{children}</p>
      </div>
    </>
  );
}

function ContactCard() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event) {
    event.preventDefault();
    setSubmitted(true);
    event.currentTarget.reset();
  }

  return (
    <div className="contact-card">
      <h2>Contact Box Office</h2>
      <p className="muted contact-intro">
        Have questions about group bookings, accessibility, or private screenings? Drop us a note!
      </p>
      <form id="contact-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="contact-name">Your Name</label>
          <input type="text" name="name" id="contact-name" placeholder="Alex Smith" autoComplete="name" required />
        </div>
        <div className="form-group">
          <label htmlFor="contact-email">Email Address</label>
          <input type="email" name="email" id="contact-email" placeholder="alex@example.com" autoComplete="email" required />
        </div>
        <div className="form-group">
          <label htmlFor="contact-telephone">Telephone (Optional)</label>
          <input type="tel" name="telephone" id="contact-telephone" placeholder="028 7147 2869" autoComplete="tel" />
        </div>
        <div className="form-group">
          <label htmlFor="contact-message">Message</label>
          <textarea name="message" id="contact-message" rows="4" placeholder="How can we help?" required />
        </div>
        <button type="submit" className="button contact-submit">
          Send Message <span className="material-symbols-outlined" aria-hidden="true">send</span>
        </button>
        {submitted && (
          <p className="form-notice" role="status">
            This contact form is not connected to a message service. Please call the box office on 028 7147 2869.
          </p>
        )}
      </form>
    </div>
  );
}

function BoxOfficeLocation() {
  return (
    <div className="box-office-location">
      <h3 className="h3-with-icon">
        <span className="material-symbols-outlined" aria-hidden="true">location_on</span>
        Box Office Location
      </h3>
      <p>
        Blockbuster Theatre Complex<br />
        Cinema Way, Strand Road<br />
        Direct Telephone: <strong>028 7147 2869</strong>
      </p>
    </div>
  );
}

export function About() {
  return (
    <Layout current="about">
      <CinemaHero />
      <section className="about-content">
        <div className="about-grid-layout">
          <div>
            <div className="section-header about-section-heading"><h2>About Blockbuster Theatre</h2></div>
            <p className="about-description">
              Blockbuster Theatre is a premium, fully accessible modern independent cinema dedicated to delivering
              unforgettable big-screen experiences. Every screen features state-of-the-art Dolby Atmos surround sound,
              pristine 4K laser projection, luxury recliner seating, and dedicated wheelchair viewing boxes with full
              telecoil hearing loops installed.
            </p>
            <div className="section-header about-section-heading"><h2>Frequently Asked Questions</h2></div>
            {faqs.map(({ question, answer }) => (
              <FaqItem key={question} question={question}>{answer}</FaqItem>
            ))}
          </div>
          <div>
            <ContactCard />
            <BoxOfficeLocation />
          </div>
        </div>
      </section>
    </Layout>
  );
}
