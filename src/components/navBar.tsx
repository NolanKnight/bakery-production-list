import UserRole from "@/../shared/userRole";
import { Navigation, isLink } from "../../shared/links";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "./ui/navigation-menu";

export default function NavBar({ userRole }: { userRole: UserRole }) {
  return (
    <div className="w-full bg-inherit z-10 p-4 sticky top-0 flex justify-center print:hidden">
      <NavigationMenu className="w-fit p-2 border border-black">
        <NavigationMenuList>
          {Navigation.map((item) => {
            if (isLink(item)) {
              if (!userRole.links.includes(item)) return;

              return (
                <NavigationMenuItem key={item.path}>
                  <NavigationMenuLink
                    href={item.path}
                    className={navigationMenuTriggerStyle()}
                  >
                    {item.name}
                  </NavigationMenuLink>
                </NavigationMenuItem>
              );
            }

            if (item.links.every((link) => !userRole.links.includes(link)))
              return;

            return (
              <NavigationMenuItem>
                <NavigationMenuTrigger>{item.name}</NavigationMenuTrigger>
                <NavigationMenuContent>
                  {item.links.map((link) => {
                    if (!userRole.links.includes(link)) return;

                    return (
                      <NavigationMenuLink
                        href={link.path}
                        className={navigationMenuTriggerStyle()}
                      >
                        {link.name}
                      </NavigationMenuLink>
                    );
                  })}
                </NavigationMenuContent>
              </NavigationMenuItem>
            );
          })}
        </NavigationMenuList>
      </NavigationMenu>
    </div>
  );
}
