import About from '../sections/About.jsx'
import Contact from '../sections/Contact.jsx'
import Facts from '../sections/Facts.jsx'
import Faq from '../sections/Faq.jsx'
import Hero from '../sections/Hero.jsx'
import LockExplainer from '../sections/LockExplainer.jsx'
import Pricing from '../sections/Pricing.jsx'
import Process from '../sections/Process.jsx'
import Promise from '../sections/Promise.jsx'
import Services from '../sections/Services.jsx'
import Shop from '../sections/Shop.jsx'
import Testimonials from '../sections/Testimonials.jsx'

export default function HomePage() {
  return (
    <>
      <Hero />
      <Facts />
      <Services />
      <LockExplainer />
      <Promise />
      <Process />
      <Testimonials />
      <Pricing />
      <About />
      <Shop />
      <Faq />
      <Contact />
    </>
  )
}
