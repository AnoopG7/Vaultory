import { RouterProvider } from 'react-router-dom'
import router from './router'
import { useSession } from '@/hooks'

function App() {
  useSession()
  return <RouterProvider router={router} />
}

export default App
