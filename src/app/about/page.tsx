import React from 'react'
import VariableHero from '../components/VariableHero'

const page = () => {
  return (
    <div>
        <VariableHero 
        backgroundImage={`/city-images/coachella-valley.jpg`}
        heroContext="Joseph Sardella"
        description="The man"
        alignment='center'
        />
    </div>
  )
}

export default page