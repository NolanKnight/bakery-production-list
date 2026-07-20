import { ReactNode } from "react";
import Header from "./header";
import NavBar from "./navBar";
import UserRole from "@/../shared/userRole";
import { Toaster } from "./ui/sonner";

export default function Layout({
  children,
  userRole,
}: {
  children: ReactNode | undefined;
  userRole: UserRole;
}) {
  return (
    <div className="w-full h-full min-h-screen bg-blue-200 flex flex-col items-center justify-center">
      <Header title={`${userRole.name} Portal`} />
      <NavBar userRole={userRole} />
      {children ?? <h4 className="p-6 shimmer">Loading...</h4>}
      <Toaster position="top-center" />
    </div>
  );
}
