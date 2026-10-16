import About from '../sections/About.jsx'
import Contact from '../sections/Contact.jsx'
import Faq from '../sections/Faq.jsx'
import Hero from '../sections/Hero.jsx'
import Pricing from '../sections/Pricing.jsx'
import Process from '../sections/Process.jsx'
import Promise from '../sections/Promise.jsx'
import Services from '../sections/Services.jsx'

export default function HomePage() {
  return (
    <>
      <Hero />
      <Services />
      <Promise />
      <Process />
      <Pricing />
      <About />
      <Faq />
      <Contact />
    </>
  )
}
