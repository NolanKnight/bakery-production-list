import { cn } from "@/lib/utils";
import { useLocation, Link } from "react-router-dom";
import UserRole from "@/../shared/userRole";
import { buttonVariants } from "./ui/button";

export default function NavBar({ userRole }: { userRole: UserRole }) {
  const location = useLocation();

  if (location.pathname.includes("/production/print")) {
    return null;
  }

  return (
    <div className="w-full bg-inherit p-4 sticky top-0 flex justify-center">
      <div className="w-fit p-2 border border-black">
        <div className="flex gap-4">
          {userRole.links.map((link) => {
            const active = location.pathname === link.path;

            return (
              <Link
                key={link.path}
                to={link.path}
                className={cn(
                  "transition p-1.5 text-sm font-medium",
                  active
                    ? buttonVariants()
                    : buttonVariants({ variant: "ghost" }),
                )}
              >
                {link.name}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
