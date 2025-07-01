import { useState } from 'react'
import './App.css'
import MediaManager from './components/MediaManager'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="App">
      <MediaManager />
    </div>
  )
}

export default App
