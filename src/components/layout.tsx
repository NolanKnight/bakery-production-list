import { ReactNode } from "react";
import Header from "./header";
import NavBar from "./navBar";
import UserRole from "@/../shared/userRole";

export default function Layout({
  children,
  userRole,
}: {
  children: ReactNode | undefined;
  userRole: UserRole;
}) {
  return (
    <div className="w-full h-full min-h-screen bg-blue-200 print:bg-white flex flex-col items-center justify-center">
      <Header title={`${userRole.name} Portal`} />
      <NavBar userRole={userRole} />
      {children ?? <div className="w-full h-full flex place-items-center text-center">
        <h4 className="shimmer w-full">Loading...</h4>
      </div>}
    </div>
  );
}
