import LoginForm from "./login-form";

// Don't prerender — middleware uses session cookies, and the form needs
// runtime env vars for the Supabase browser client.
export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight">DevNest</h1>
          <p className="mt-2 text-sm text-muted-foreground">Admin & employee portal</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
