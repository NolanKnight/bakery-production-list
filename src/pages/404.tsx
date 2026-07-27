import { useState } from 'react';

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { InputGroup, InputGroupInput, InputGroupAddon } from '@/components/ui/input-group';
import { SearchIcon } from 'lucide-react';
import { Link } from '../../shared/links';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function PageNotFoundPage ({ links }: { links: Link[] }) {
  const [query, setQuery] = useState("");
  const [showResults, setShowResults] = useState(false);

  const filteredLinks = links.filter((link) => 
    link.name.toLowerCase().includes(query.toLowerCase())
  );

  //focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-6 text-center flex place-items-center">
      <Card className="overflow-visible mb-14">
        <CardHeader>
          <h1 className="font-bold"><mark className="p-1 bg-destructive/10 text-destructive">404</mark> - Not Found</h1>
        </CardHeader>
        <CardContent className="space-y-6 text-center flex place-items-center flex-col">
          <p className="max-w-3xs">The page you're looking for doesn't exist. Try searching for what you need below.</p>
          <div className="relative mb-6">
            <InputGroup>
              <InputGroupInput className="w-64" placeholder="Search..." value={query} onChange={(e) => setQuery(e.target.value)} onFocus={() => setShowResults(true)} onBlur={() => setShowResults(false)} />
              <InputGroupAddon>
                <SearchIcon />
              </InputGroupAddon>
              <Card className={`w-full p-0 absolute top-full h-fit max-h-32 overflow-y-auto scrollbar-gutter-both flex ${showResults ? "z-10" : "-z-10"}`}>
                <CardContent className="grid grid-cols-1 gap-1 place-items-start">
                  {filteredLinks.map((link) => (
                    <a href={link.path} key={link.path} className={cn("text-left", buttonVariants({ variant: "link" }))}>{link.name}</a>
                  ))}
                </CardContent>
              </Card>
            </InputGroup>
          </div>
          <a href="/" className={buttonVariants({ variant: "link" })}>Go to Dashboard</a>
        </CardContent>
      </Card>
    </div>
  )
}