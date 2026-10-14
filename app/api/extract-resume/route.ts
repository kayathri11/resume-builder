import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import PDFParser from "pdf2json";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { data: resume, error: resumeError } = await supabase
      .from("resumes")
      .select("*")
      .eq("id", body.resumeId)
      .single();

    if (resumeError || !resume) {
      return NextResponse.json(
        { error: "Resume not found" },
        { status: 404 }
      );
    }

    const { data: fileData, error: fileError } =
      await supabase.storage
        .from("resumes")
        .download(resume.file_path);

    if (fileError || !fileData) {
      return NextResponse.json(
        { error: "Could not download file" },
        { status: 400 }
      );
    }

    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const extractedText = await new Promise<string>(
      (resolve, reject) => {
        const pdfParser = new PDFParser();

        pdfParser.on(
          "pdfParser_dataError",
          (errData: any) => {
            reject(errData);
          }
        );

        pdfParser.on(
          "pdfParser_dataReady",
          (pdfData: any) => {
            try {
              let text = "";

              pdfData.Pages.forEach((page: any) => {
                page.Texts.forEach((textItem: any) => {
                  textItem.R.forEach((run: any) => {
                    text += decodeURIComponent(run.T) + " ";
                  });
                });

                text += "\n";
              });

              resolve(text);
            } catch (err) {
              reject(err);
            }
          }
        );

        pdfParser.parseBuffer(buffer);
      }
    );

    const { error: updateError } = await supabase
      .from("resumes")
      .update({
        raw_text: extractedText,
      })
      .eq("id", body.resumeId);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    console.log(
      "PDF extracted successfully:",
      resume.file_name
    );

    console.log(
      extractedText.substring(0, 300)
    );

    return NextResponse.json({
      success: true,
      textLength: extractedText.length,
    });
  } catch (error) {
    console.error(
      "EXTRACTION ERROR:",
      error
    );

    return NextResponse.json(
      {
        error: "Extraction failed",
      },
      {
        status: 500,
      }
    );
  }
}