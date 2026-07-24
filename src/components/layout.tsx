import { ReactNode } from "react";
import Header from "./header";
import NavBar from "./navBar";
import UserRole from "@/../shared/userRole";

export default function Layout({
  children,
  userRole,
}: {
  children: ReactNode;
  userRole: UserRole;
}) {
  console.log(children);
  return (
    <div className="w-full h-full min-h-screen bg-blue-200 print:bg-white flex flex-col items-center justify-center">
      <Header title={`${userRole.name} Portal`} />
      <NavBar userRole={userRole} />
      {children}
    </div>
  );
}
