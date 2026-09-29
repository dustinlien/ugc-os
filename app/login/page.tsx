import { LoginForm } from "@/app/login/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const initialError =
    params.error === "oauth"
      ? "Google sign-in failed. Check that the Google provider is enabled, then try again."
      : null;

  return <LoginForm initialError={initialError} />;
}
