"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    checkSession();
  }, []);

  async function checkSession() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session) {
      router.push("/dashboard");
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6">
      <h1 className="text-5xl font-bold">
        Resume Builder 🚀
      </h1>

      <p className="max-w-md text-center text-gray-600">
        Build ATS-friendly resumes and optimize them for specific job descriptions.
      </p>

      <div className="flex gap-4">
        <Button onClick={() => router.push("/signup")}>
          Get Started
        </Button>

        <Button
          variant="outline"
          onClick={() => router.push("/login")}
        >
          Login
        </Button>
      </div>
    </main>
  );
}