import Dashboard from "./dashboard";

export default function Page() {
  return (
    <>
      <div className="fincare-welcome" aria-hidden="true">
        <div className="fincare-welcome-content">
          <span className="fincare-logo">F</span>
          <p className="text-5xl font-bold tracking-tight sm:text-7xl">FinCare</p>
          <p className="mt-3 text-sm text-blue-100 sm:text-base">AI-powered insights for fairer cancer care</p>
          <div className="fincare-welcome-line" />
        </div>
      </div>
      <Dashboard />
    </>
  );
}
