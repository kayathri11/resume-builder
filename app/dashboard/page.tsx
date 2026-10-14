"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Dashboard() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [resumes, setResumes] = useState<any[]>([]);
  const [selectedResume, setSelectedResume] = useState<any>(null);

  useEffect(() => {
    checkUser();
  }, []);

  async function loadResumes() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data, error } = await supabase
      .from("resumes")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setResumes(data);
    }
  }

  async function checkUser() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.push("/login");
      return;
    }

    setUserEmail(session.user.email || "");

    await loadResumes();

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

    await fetch("/api/extract-resume", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        resumeId: insertedResume.id,
      }),
    });

    await loadResumes();

    setFile(null);

    alert("Resume uploaded successfully!");
  };

  const deleteResume = async (resume: any) => {
    const confirmDelete = window.confirm(
      `Delete ${resume.file_name}?`
    );

    if (!confirmDelete) return;

    const { error: storageError } = await supabase.storage
      .from("resumes")
      .remove([resume.file_path]);

    if (storageError) {
      alert(storageError.message);
      return;
    }

    const { error: dbError } = await supabase
      .from("resumes")
      .delete()
      .eq("id", resume.id);

    if (dbError) {
      alert(dbError.message);
      return;
    }

    if (selectedResume?.id === resume.id) {
      setSelectedResume(null);
    }

    await loadResumes();

    alert("Resume deleted successfully!");
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

      <div className="mt-8 rounded-lg border p-6">
        <h2 className="mb-4 text-xl font-semibold">
          Upload Resume
        </h2>

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

      <div className="mt-10">
        <h2 className="mb-4 text-2xl font-bold">
          My Resumes
        </h2>

        {resumes.length === 0 ? (
          <p>No resumes uploaded yet.</p>
        ) : (
          resumes.map((resume) => (
            <div
              key={resume.id}
              className="mb-4 rounded-lg border p-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">
                    {resume.file_name}
                  </p>

                  <p className="text-sm text-gray-500">
                    {new Date(
                      resume.created_at
                    ).toLocaleString()}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedResume(resume)}
                    className="rounded bg-blue-500 px-3 py-1 text-white hover:bg-blue-600"
                  >
                    View Resume Text
                  </button>

                  <button
                    onClick={() => deleteResume(resume)}
                    className="rounded bg-red-500 px-3 py-1 text-white hover:bg-red-600"
                  >
                    Delete Resume
                  </button>
                </div>
              </div>
            </div>
          ))
        )}

        {selectedResume && (
          <div className="mt-6 rounded-lg border p-4">
            <h3 className="mb-2 text-lg font-bold">
              {selectedResume.file_name}
            </h3>

            <pre className="max-h-[500px] overflow-y-auto whitespace-pre-wrap rounded bg-gray-100 p-4 text-sm">
              {selectedResume.raw_text ||
                "No extracted text found."}
            </pre>
          </div>
        )}
      </div>
    </main>
  );
}