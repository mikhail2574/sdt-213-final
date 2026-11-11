import { Outlet } from 'react-router-dom'
import Brand from '../components/Brand'

/** Single centered column for sign-in, registration and password pages. */
export default function AuthLayout() {
  return (
    <div className="flex min-h-screen flex-col px-6 py-8 sm:px-10">
      <Brand />
      <main className="mx-auto my-auto w-full max-w-sm py-12">
        <Outlet />
      </main>
    </div>
  )
}
