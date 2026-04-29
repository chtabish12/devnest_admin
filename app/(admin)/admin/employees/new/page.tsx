import NewEmployeeForm from "./new-employee-form";

export default function NewEmployeePage() {
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Add employee</h1>
        <p className="text-sm text-muted-foreground">
          Provision a new account. The employee logs in with the email and temporary password
          you set here, and can change their password from Supabase any time.
        </p>
      </div>
      <NewEmployeeForm />
    </div>
  );
}
