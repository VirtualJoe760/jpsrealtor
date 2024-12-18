import React from 'react'
import VariableHero from '../components/VariableHero'
import AboutBento from '../components/AboutBento'

const page = () => {
  return (
    <div>
        <VariableHero 
        backgroundImage={`/joey/about.png`}
        heroContext=" "
        description=""
        alignment='center'
        />
        <AboutBento />
    </div>
  )
}

export default page