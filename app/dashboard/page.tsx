"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Dashboard() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("");
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.push("/login");
      return;
    }

    setUserEmail(session.user.email || "");
    setLoading(false);
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const uploadResume = async () => {
    if (!file) {
      alert("Please select a file");
      return;
    }

    const fileName = `${Date.now()}-${file.name}`;

    const { data, error } = await supabase.storage
      .from("resumes")
      .upload(fileName, file);

    if (error) {
      alert(error.message);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: insertedResume, error: dbError } = await supabase
      .from("resumes")
      .insert([
        {
          user_id: user?.id,
          file_name: file.name,
          file_path: data.path,
        },
      ])
      .select()
      .single();

    if (dbError) {
      console.log("DB Error:", dbError);
      alert(dbError.message);
      return;
    }

    console.log("Inserted Row:", insertedResume);

    await fetch("/api/extract-resume", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        resumeId: insertedResume.id,
      }),
    });

    alert("Resume uploaded successfully!");
  };

    if (loading) {
      return (
        <main className="flex min-h-screen items-center justify-center">
          <h1>Loading...</h1>
        </main>
      );
    }

    return (
      <main className="min-h-screen p-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              Welcome to Resume Builder 🚀
            </h1>

            <p className="mt-2 text-gray-600">
              {userEmail}
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600"
          >
            Logout
          </button>
        </div>

        <div className="mt-4">
          <label
            htmlFor="resume-upload"
            className="inline-block cursor-pointer rounded-lg bg-blue-500 px-4 py-2 font-medium text-white hover:bg-blue-600"
          >
            Choose Resume
          </label>

          <input
            id="resume-upload"
            type="file"
            accept=".pdf,.doc,.docx"
            className="hidden"
            onChange={(e) =>
              setFile(e.target.files?.[0] || null)
            }
          />

          {file && (
            <p className="mt-2 text-sm text-gray-600">
              Selected: {file.name}
            </p>
          )}

          <button
            onClick={uploadResume}
            className="mt-4 block rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
          >
            Upload Resume
          </button>
        </div>
      </main >
    );
}
