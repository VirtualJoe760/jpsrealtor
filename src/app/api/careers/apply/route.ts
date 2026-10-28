// POST /api/careers/apply — multipart application to an open role on /join.
//
// Signed-in only (the Join page asks visitors to create an account first).
// Saves the application with its files to `job_applications` and emails the
// admin with the résumé / cover letter attached. Roles and the five screening
// questions per role live in src/config/careers.ts.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";
import JobApplication from "@/models/JobApplication";
import { sendJobApplicationNotification } from "@/lib/email-resend";
import {
  findRole,
  RESUME_MAX_BYTES,
  COVER_FILE_MAX_BYTES,
  ANSWER_MAX_CHARS,
  ACCEPTED_DOC_TYPES,
} from "@/config/careers";

export const dynamic = "force-dynamic";

const str = (v: FormDataEntryValue | null, max: number) =>
  typeof v === "string" ? v.trim().slice(0, max) : "";

async function readDoc(file: File, max: number, label: string) {
  const ext = file.name.toLowerCase().split(".").pop() || "";
  // Browsers sometimes send .doc/.docx as application/octet-stream; trust the
  // extension then, but never accept anything that isn't a PDF or Word file.
  const typeOk = ACCEPTED_DOC_TYPES.includes(file.type) || ["pdf", "doc", "docx"].includes(ext);
  if (!typeOk) throw new Error(`${label} must be a PDF or Word document`);
  if (file.size > max) throw new Error(`${label} must be under ${Math.round(max / 1024 / 1024)} MB`);
  const data = Buffer.from(await file.arrayBuffer());
  if (ext === "pdf" && data.subarray(0, 4).toString() !== "%PDF") throw new Error(`${label} is not a valid PDF`);
  return {
    filename: file.name.replace(/[^\w.\- ]/g, "_").slice(0, 120),
    contentType: file.type || "application/octet-stream",
    size: file.size,
    data,
  };
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "Please sign in to apply" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Upload was too large or malformed" }, { status: 400 });
  }

  const role = findRole(str(form.get("role"), 80));
  if (!role) return NextResponse.json({ error: "Unknown role" }, { status: 400 });

  const name = str(form.get("name"), 120);
  const phone = str(form.get("phone"), 40);
  const linkedin = str(form.get("linkedin"), 300);
  const coverLetterText = str(form.get("coverLetterText"), 10_000);
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const answers = role.questions.map((q) => ({
    questionId: q.id,
    question: q.prompt,
    answer: str(form.get(`q_${q.id}`), ANSWER_MAX_CHARS),
  }));
  if (answers.some((a) => !a.answer)) {
    return NextResponse.json({ error: "Please answer all five questions" }, { status: 400 });
  }

  const resumeFile = form.get("resume");
  const coverFile = form.get("coverLetterFile");
  if (!(resumeFile instanceof File) || resumeFile.size === 0) {
    return NextResponse.json({ error: "Please attach your résumé" }, { status: 400 });
  }
  const hasCoverFile = coverFile instanceof File && coverFile.size > 0;
  if (!coverLetterText && !hasCoverFile) {
    return NextResponse.json({ error: "Please write or attach a cover letter" }, { status: 400 });
  }

  let resume, coverLetter;
  try {
    resume = await readDoc(resumeFile, RESUME_MAX_BYTES, "Résumé");
    coverLetter = hasCoverFile ? await readDoc(coverFile as File, COVER_FILE_MAX_BYTES, "Cover letter") : undefined;
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }

  await dbConnect();
  try {
    await JobApplication.create({
      userId: session.user.id,
      roleSlug: role.slug,
      roleTitle: role.title,
      name,
      email: session.user.email,
      phone,
      linkedin,
      answers,
      coverLetterText,
      resume,
      coverLetterFile: coverLetter,
    });
  } catch (err: any) {
    if (err?.code === 11000) {
      return NextResponse.json({ error: "You've already applied for this role — we have your application." }, { status: 409 });
    }
    console.error("[careers] save failed:", err);
    return NextResponse.json({ error: "Could not save your application" }, { status: 500 });
  }

  await sendJobApplicationNotification({
    roleTitle: role.title,
    name,
    email: session.user.email,
    phone,
    linkedin,
    answers,
    coverLetterText,
    attachments: [
      { filename: resume.filename, content: resume.data },
      ...(coverLetter ? [{ filename: coverLetter.filename, content: coverLetter.data }] : []),
    ],
  });

  return NextResponse.json({ ok: true, role: role.title });
}
