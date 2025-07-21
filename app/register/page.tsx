import Header from "@/components/landing/Header";
import SignupHero from "@/components/register/SignupHero";
import SignupOptions from "@/components/register/SignupOptions";
import Link from "next/link";


export default function Signup() {
  return (
    <>
      <Header />
      <SignupHero />
      <SignupOptions />
      <div className="text-center mb-16 text-gray-600">
        <p>
          Already have an account?{" "}
          <Link href="/login" className="font-medium hover:underline text-gray-600 hover:text-blue-500">
            Sign in instead
          </Link>
        </p>
      </div>
    </>
  )
}
