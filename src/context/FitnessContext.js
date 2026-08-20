import { createContext, useContext } from 'react'
import { useFitnessData } from '../hooks/useFitnessData'

const FitnessContext = createContext(null)

export function FitnessProvider({ toggleHabit, todayHabits, children }) {
  const fitness = useFitnessData(toggleHabit, todayHabits)
  return <FitnessContext.Provider value={fitness}>{children}</FitnessContext.Provider>
}

export function useFitness() {
  const ctx = useContext(FitnessContext)
  if (!ctx) throw new Error('useFitness must be used within FitnessProvider')
  return ctx
}
