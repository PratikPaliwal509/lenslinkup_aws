import { redirect } from 'next/navigation'

// Root redirect — middleware handles auth-based routing
export default function Home() {
  redirect('/login')
}
