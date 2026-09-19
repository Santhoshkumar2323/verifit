"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  getApiErrorMessage,
  getCredentialDocumentUrl,
  getMyCredentials,
  getMyProfessionalProfile,
  registerProfessional,
  uploadCredential,
  type ApiCredential,
} from "../../../lib/api";

const MAX_CREDENTIAL_SIZE = 15 * 1024 * 1024;

const ALLOWED_CREDENTIAL_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];

interface ProfessionalProfile {
  id: string;
  user_id?: string;
  name?: string;
  avatar_url?: string | null;
  specialization: string;
  bio: string;
  experience_years: number;
  verified?: boolean;
  verification_status: string;
  credentials?: ApiCredential[];
}

interface CredentialForm {
  credential_name: string;
  credential_type: string;
  issuer: string;
  credential_number: string;
}

export default function ProfessionalRegisterPage() {
  const router = useRouter();

  const [professional, setProfessional] =
    useState<ProfessionalProfile | null>(null);

  const [credentials, setCredentials] = useState<ApiCredential[]>([]);

  const [specialization, setSpecialization] = useState("");
  const [bio, setBio] = useState("");
  const [experienceYears, setExperienceYears] = useState("");

  const [credentialForm, setCredentialForm] = useState<CredentialForm>({
    credential_name: "",
    credential_type: "",
    issuer: "",
    credential_number: "",
  });

  const [credentialFile, setCredentialFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [uploadingCredential, setUploadingCredential] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    void loadProfessionalData();
  }, []);

  const loadProfessionalData = async () => {
    setLoading(true);
    setError(null);

    try {
      const profile = await getMyProfessionalProfile();

      setProfessional(profile as ProfessionalProfile);

      const credentialData = await getMyCredentials();
      setCredentials(credentialData);
    } catch (err) {
      const message = getApiErrorMessage(err);

      if (
        message.toLowerCase().includes("not found") ||
        message.toLowerCase().includes("professional profile")
      ) {
        setProfessional(null);
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCredentialChange = (
    field: keyof CredentialForm,
    value: string,
  ) => {
    setCredentialForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleCredentialFileChange = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];

    if (!file) {
      setCredentialFile(null);
      return;
    }

    setError(null);
    setSuccess(null);

    if (!ALLOWED_CREDENTIAL_TYPES.includes(file.type)) {
      setCredentialFile(null);
      event.target.value = "";

      setError("Credential must be a PDF, JPEG, PNG, or WebP file.");
      return;
    }

    if (file.size > MAX_CREDENTIAL_SIZE) {
      setCredentialFile(null);
      event.target.value = "";

      setError("Credential document must be 15 MB or smaller.");
      return;
    }

    setCredentialFile(file);
  };

  const handleRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError(null);
    setSuccess(null);

    const trimmedSpecialization = specialization.trim();
    const trimmedBio = bio.trim();

    if (!trimmedSpecialization) {
      setError("Specialization is required.");
      return;
    }

    if (!trimmedBio) {
      setError("Bio is required.");
      return;
    }

    const parsedExperience = Number(experienceYears);

    if (
      experienceYears.trim() !== "" &&
      (!Number.isFinite(parsedExperience) || parsedExperience < 0)
    ) {
      setError("Experience years must be a valid non-negative number.");
      return;
    }

    setRegistering(true);

    try {
      const createdProfessional = await registerProfessional({
        specialization: trimmedSpecialization,
        bio: trimmedBio,
        experience_years:
          experienceYears.trim() === "" ? 0 : parsedExperience,
      });

      setProfessional(createdProfessional as ProfessionalProfile);

      setSuccess(
        "Professional profile created. You can now submit your credentials.",
      );
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setRegistering(false);
    }
  };

  const handleCredentialSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!professional) {
      setError("Create your professional profile first.");
      return;
    }

    setError(null);
    setSuccess(null);

    const credentialName = credentialForm.credential_name.trim();
    const credentialType = credentialForm.credential_type.trim();
    const issuer = credentialForm.issuer.trim();
    const credentialNumber = credentialForm.credential_number.trim();

    if (!credentialName) {
      setError("Credential name is required.");
      return;
    }

    if (!credentialType) {
      setError("Credential type is required.");
      return;
    }

    if (!issuer) {
      setError("Issuer is required.");
      return;
    }

    if (!credentialFile) {
      setError("Please select the credential document.");
      return;
    }

    setUploadingCredential(true);

    try {
      await uploadCredential({
        credential_name: credentialName,
        credential_type: credentialType || undefined,
        issuer: issuer || undefined,
        credential_number: credentialNumber || undefined,
        document: credentialFile,
      });

      setCredentialForm({
        credential_name: "",
        credential_type: "",
        issuer: "",
        credential_number: "",
      });

      setCredentialFile(null);

      const fileInput = document.getElementById(
        "credential-document",
      ) as HTMLInputElement | null;

      if (fileInput) {
        fileInput.value = "";
      }

      const updatedCredentials = await getMyCredentials();
      setCredentials(updatedCredentials);

      setSuccess("Credential submitted successfully.");
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setUploadingCredential(false);
    }
  };

  const handleViewCredential = async (credentialId: string) => {
    setError(null);

    try {
      const result = await getCredentialDocumentUrl(credentialId);

      window.open(result.url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F6F8F7] px-6 py-10">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-2xl border border-[#DDE5E1] bg-white p-8">
            <p className="text-sm text-[#66736F]">
              Loading professional profile...
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F6F8F7] px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-[#227A50]">
            Professional verification
          </p>

          <h1 className="mt-2 text-3xl font-bold text-[#182321]">
            Become a VeriFit professional
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#66736F]">
            Create your professional profile and submit credentials for
            verification. Verification is reviewed separately from account
            authentication.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-[#E8C7C7] bg-[#FFF5F5] px-4 py-3 text-sm text-[#C94B4B]"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            className="mb-6 rounded-xl border border-[#C9E5D5] bg-[#E7F4ED] px-4 py-3 text-sm text-[#185C3B]"
          >
            {success}
          </div>
        )}

        {!professional ? (
          <section className="rounded-2xl border border-[#DDE5E1] bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-[#182321]">
              Professional profile
            </h2>

            <p className="mt-1 text-sm text-[#66736F]">
              Enter the information that will appear on your professional
              profile.
            </p>

            <form onSubmit={handleRegister} className="mt-6 space-y-5">
              <div>
                <label
                  htmlFor="specialization"
                  className="mb-1.5 block text-sm font-medium text-[#182321]"
                >
                  Specialization
                </label>

                <input
                  id="specialization"
                  type="text"
                  value={specialization}
                  onChange={(event) =>
                    setSpecialization(event.target.value)
                  }
                  placeholder="e.g. Clinical Nutrition"
                  disabled={registering}
                  className="w-full rounded-xl border border-[#DDE5E1] px-4 py-3 text-sm outline-none focus:border-[#227A50] focus:ring-2 focus:ring-[#227A50]/10 disabled:bg-[#F6F8F7]"
                />
              </div>

              <div>
                <label
                  htmlFor="experience-years"
                  className="mb-1.5 block text-sm font-medium text-[#182321]"
                >
                  Experience years
                </label>

                <input
                  id="experience-years"
                  type="number"
                  min="0"
                  step="0.5"
                  value={experienceYears}
                  onChange={(event) =>
                    setExperienceYears(event.target.value)
                  }
                  placeholder="e.g. 5"
                  disabled={registering}
                  className="w-full rounded-xl border border-[#DDE5E1] px-4 py-3 text-sm outline-none focus:border-[#227A50] focus:ring-2 focus:ring-[#227A50]/10 disabled:bg-[#F6F8F7]"
                />
              </div>

              <div>
                <label
                  htmlFor="professional-bio"
                  className="mb-1.5 block text-sm font-medium text-[#182321]"
                >
                  Professional bio
                </label>

                <textarea
                  id="professional-bio"
                  rows={5}
                  value={bio}
                  onChange={(event) => setBio(event.target.value)}
                  placeholder="Describe your professional background..."
                  disabled={registering}
                  className="w-full resize-none rounded-xl border border-[#DDE5E1] px-4 py-3 text-sm outline-none focus:border-[#227A50] focus:ring-2 focus:ring-[#227A50]/10 disabled:bg-[#F6F8F7]"
                />
              </div>

              <button
                type="submit"
                disabled={registering}
                className="rounded-xl bg-[#227A50] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#185C3B] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {registering
                  ? "Creating profile..."
                  : "Create professional profile"}
              </button>
            </form>
          </section>
        ) : (
          <div className="space-y-6">
            <section className="rounded-2xl border border-[#DDE5E1] bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-[#66736F]">Specialization</p>

                  <h2 className="mt-1 text-xl font-semibold text-[#182321]">
                    {professional.specialization}
                  </h2>

                  <p className="mt-2 text-sm text-[#66736F]">
                    {professional.experience_years} years of experience
                  </p>
                </div>

                <span
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                    professional.verification_status === "VERIFIED"
                      ? "bg-[#E7F4ED] text-[#185C3B]"
                      : "bg-[#FBF4DC] text-[#806516]"
                  }`}
                >
                  {professional.verification_status}
                </span>
              </div>

              <p className="mt-5 text-sm leading-6 text-[#66736F]">
                {professional.bio}
              </p>
            </section>

            <section className="rounded-2xl border border-[#DDE5E1] bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-[#182321]">
                Submit a credential
              </h2>

              <p className="mt-1 text-sm text-[#66736F]">
                Upload a certificate or other professional credential for
                administrator review.
              </p>

              <form
                onSubmit={handleCredentialSubmit}
                className="mt-6 space-y-5"
              >
                <div>
                  <label
                    htmlFor="credential-name"
                    className="mb-1.5 block text-sm font-medium text-[#182321]"
                  >
                    Credential name
                  </label>

                  <input
                    id="credential-name"
                    type="text"
                    value={credentialForm.credential_name}
                    onChange={(event) =>
                      handleCredentialChange(
                        "credential_name",
                        event.target.value,
                      )
                    }
                    placeholder="e.g. Registered Dietitian"
                    disabled={uploadingCredential}
                    className="w-full rounded-xl border border-[#DDE5E1] px-4 py-3 text-sm outline-none focus:border-[#227A50] focus:ring-2 focus:ring-[#227A50]/10 disabled:bg-[#F6F8F7]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="credential-type"
                    className="mb-1.5 block text-sm font-medium text-[#182321]"
                  >
                    Credential type
                  </label>

                  <input
                    id="credential-type"
                    type="text"
                    value={credentialForm.credential_type}
                    onChange={(event) =>
                      handleCredentialChange(
                        "credential_type",
                        event.target.value,
                      )
                    }
                    placeholder="e.g. Certification"
                    disabled={uploadingCredential}
                    className="w-full rounded-xl border border-[#DDE5E1] px-4 py-3 text-sm outline-none focus:border-[#227A50] focus:ring-2 focus:ring-[#227A50]/10 disabled:bg-[#F6F8F7]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="credential-issuer"
                    className="mb-1.5 block text-sm font-medium text-[#182321]"
                  >
                    Issuer
                  </label>

                  <input
                    id="credential-issuer"
                    type="text"
                    value={credentialForm.issuer}
                    onChange={(event) =>
                      handleCredentialChange(
                        "issuer",
                        event.target.value,
                      )
                    }
                    placeholder="e.g. Professional Association"
                    disabled={uploadingCredential}
                    className="w-full rounded-xl border border-[#DDE5E1] px-4 py-3 text-sm outline-none focus:border-[#227A50] focus:ring-2 focus:ring-[#227A50]/10 disabled:bg-[#F6F8F7]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="credential-number"
                    className="mb-1.5 block text-sm font-medium text-[#182321]"
                  >
                    Credential number
                    <span className="ml-1 font-normal text-[#66736F]">
                      (optional)
                    </span>
                  </label>

                  <input
                    id="credential-number"
                    type="text"
                    value={credentialForm.credential_number}
                    onChange={(event) =>
                      handleCredentialChange(
                        "credential_number",
                        event.target.value,
                      )
                    }
                    placeholder="Credential or registration number"
                    disabled={uploadingCredential}
                    className="w-full rounded-xl border border-[#DDE5E1] px-4 py-3 text-sm outline-none focus:border-[#227A50] focus:ring-2 focus:ring-[#227A50]/10 disabled:bg-[#F6F8F7]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="credential-document"
                    className="mb-1.5 block text-sm font-medium text-[#182321]"
                  >
                    Credential document
                  </label>

                  <input
                    id="credential-document"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                    onChange={handleCredentialFileChange}
                    disabled={uploadingCredential}
                    className="block w-full cursor-pointer rounded-xl border border-[#DDE5E1] bg-white text-sm text-[#66736F] file:mr-4 file:border-0 file:bg-[#E7F4ED] file:px-4 file:py-3 file:font-medium file:text-[#227A50] hover:file:bg-[#DCEFE5] disabled:cursor-not-allowed disabled:opacity-60"
                  />

                  <p className="mt-1.5 text-xs text-[#66736F]">
                    PDF, JPEG, PNG, or WebP · Maximum 15 MB
                  </p>

                  {credentialFile && (
                    <div className="mt-3 rounded-xl border border-[#DDE5E1] bg-[#F6F8F7] px-4 py-3">
                      <p className="truncate text-sm font-medium text-[#182321]">
                        {credentialFile.name}
                      </p>

                      <p className="mt-1 text-xs text-[#66736F]">
                        {(credentialFile.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={uploadingCredential}
                  className="rounded-xl bg-[#227A50] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#185C3B] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {uploadingCredential
                    ? "Uploading credential..."
                    : "Submit credential"}
                </button>
              </form>
            </section>

            <section className="rounded-2xl border border-[#DDE5E1] bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-[#182321]">
                    Submitted credentials
                  </h2>

                  <p className="mt-1 text-sm text-[#66736F]">
                    Documents submitted for verification.
                  </p>
                </div>

                <span className="rounded-full bg-[#F6F8F7] px-3 py-1 text-xs font-semibold text-[#66736F]">
                  {credentials.length}
                </span>
              </div>

              {credentials.length === 0 ? (
                <div className="mt-6 rounded-xl border border-dashed border-[#DDE5E1] px-5 py-8 text-center">
                  <p className="text-sm text-[#66736F]">
                    No credentials submitted yet.
                  </p>
                </div>
              ) : (
                <div className="mt-6 space-y-3">
                  {credentials.map((credential) => (
                    <div
                      key={credential.id}
                      className="rounded-xl border border-[#DDE5E1] p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <h3 className="font-semibold text-[#182321]">
                            {credential.credential_name}
                          </h3>

                          <p className="mt-1 text-sm text-[#66736F]">
                            {credential.credential_type} ·{" "}
                            {credential.issuer}
                          </p>

                          {credential.credential_number && (
                            <p className="mt-1 text-xs text-[#66736F]">
                              No. {credential.credential_number}
                            </p>
                          )}
                        </div>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            credential.status === "VERIFIED"
                              ? "bg-[#E7F4ED] text-[#185C3B]"
                              : credential.status === "REJECTED"
                                ? "bg-[#FFF5F5] text-[#C94B4B]"
                                : "bg-[#FBF4DC] text-[#806516]"
                          }`}
                        >
                          {credential.status}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          handleViewCredential(credential.id)
                        }
                        className="mt-4 text-sm font-medium text-[#227A50] hover:text-[#185C3B]"
                      >
                        View submitted document →
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => router.push("/professional")}
                className="rounded-xl border border-[#DDE5E1] px-5 py-3 text-sm font-semibold text-[#182321] transition hover:border-[#227A50] hover:text-[#227A50]"
              >
                View professionals
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}