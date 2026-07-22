import { Separator } from "./ui/separator";
import { Button } from "./ui/button";
import { authClient } from "@/lib/auth-client";

export default function Header({ title }: { title: string }) {
  const session = authClient.useSession();

  return (
    <div className="flex flex-col m-6 h-full justify-center items-center print:hidden">
      <h1 className="text-center text-6xl font-heading mb-4">
        Buttercup Bakery
      </h1>
      <img src="flower.png" />
      <div className="flex flex-row items-center justify-center w-[25vw] text-center">
        <Separator className="bg-black" />
        <h2 className="uppercase text-4xl font-extralight font-sans text-nowrap p-6">
          {title}
        </h2>
        <Separator className="bg-black" />
      </div>
      <div className="mt-4 flex items-center gap-4">
        {session.data?.user?.email ? (
          <span className="text-sm">{session.data.user.email}</span>
        ) : null}
        <Button variant="outline" size="sm" onClick={() => authClient.signOut()}>
          Sign out
        </Button>
      </div>
    </div>
  );
}
